"""FastAPI service for grading achievement explanations.

POST /api/grade {taskId, answer} → JudgeResult. The frontend degrades to
deterministic-only if this is unreachable, and never marks an achievement passed
without a real verdict.
"""
from __future__ import annotations

import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .judge import JUDGE_MODEL, UnknownTaskError, grade
from .models import GradeRequest, JudgeResult

app = FastAPI(title="Gödel Achievement Judge", version="0.1.0")

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
