"""FastAPI service for grading Team AI Infra achievement explanations.

POST /api/grade {taskId, answer} → JudgeResult. The frontend degrades to
deterministic-only if this is unreachable, and never marks an achievement passed
without a real verdict.

POST /api/grade-question {questionId, prompt, rubric, passingCriteria, answer}
→ QuestionGradeResult. Lighter-weight LLM grading for individual lesson quiz
questions (no rubric criteria IDs, no misconception taxonomy, no remediation).
"""
from __future__ import annotations

import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .judge import JUDGE_MODEL, JUDGE_MAX_BUDGET, UnknownTaskError, grade
from .models import (
    CriterionResult,
    GradeQuestionRequest,
    GradeRequest,
    JudgeResult,
    QuestionGradeResult,
)

app = FastAPI(title="Team AI Infra Achievement Judge", version="0.1.0")

# The Vite dev server (5173) and the static preview (4173) are the only callers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": JUDGE_MODEL}


@app.post("/api/grade", response_model=JudgeResult)
def grade_endpoint(req: GradeRequest) -> JudgeResult:
    try:
        return grade(req, trace_id=f"judge-{uuid.uuid4().hex[:8]}")
    except UnknownTaskError as exc:
        raise HTTPException(status_code=404, detail=f"unknown task: {exc}") from exc
    except Exception as exc:  # fail loud: surface the grading error, don't fake a pass
        raise HTTPException(status_code=502, detail=f"judge error: {exc}") from exc


@app.post("/api/grade-question", response_model=QuestionGradeResult)
def grade_question_endpoint(req: GradeQuestionRequest) -> QuestionGradeResult:
    """Grade a single open-ended quiz question using the LLM judge.

    Simpler than the full achievement judge: no rubric criteria IDs, no fatal
    misconceptions, no remediation nodes. Just: does the answer cover the
    passing criteria?
    """
    from llm_client import call_llm_structured  # type: ignore[import]

    trace_id = f"qgrade-{uuid.uuid4().hex[:8]}"
    criteria_text = "\n".join(f"{i + 1}. {c}" for i, c in enumerate(req.passingCriteria))

    system_msg = (
        "You are a pedagogical grader for a technical learning site. "
        "Evaluate the learner's answer against the rubric and criteria provided. "
        "Be honest and encouraging. Identify which criteria the answer meets."
    )
    user_msg = (
        f"Question: {req.prompt}\n\n"
        f"Rubric (what a correct answer must demonstrate): {req.rubric}\n\n"
        f"Passing criteria:\n{criteria_text}\n\n"
        f"Learner's answer:\n{req.answer}\n\n"
        "Grade this answer. For each criterion, determine if the answer meets it. "
        "Provide a score (0-100) and concise feedback."
    )

    try:
        result, _ = call_llm_structured(
            model=JUDGE_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            response_model=QuestionGradeResult,
            task="lesson_question_grade",
            trace_id=trace_id,
            max_budget=JUDGE_MAX_BUDGET,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"question grade error: {exc}") from exc

    # Align criteriaResults with authored passingCriteria order and
    # overwrite criterion text to match exactly (the LLM may paraphrase).
    if len(result.criteriaResults) != len(req.passingCriteria):
        result.criteriaResults = [
            CriterionResult(criterion=c, met=False) for c in req.passingCriteria
        ]
    else:
        for i, cr in enumerate(result.criteriaResults):
            cr.criterion = req.passingCriteria[i]

    # Recompute passed and score server-side — never trust the model's values.
    met_count = sum(1 for cr in result.criteriaResults if cr.met)
    total = max(len(req.passingCriteria), 1)
    result.passed = (met_count / total) >= 0.8
    result.score = (met_count / total) * 100

    return result
