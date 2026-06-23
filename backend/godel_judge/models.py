"""Pydantic contracts for the Gödel achievement judge.

The frontend sends only (taskId, answer) — the backend is rubric-authoritative
(reads backend/assessments.json, exported from the single source assessments.ts).
JudgeResult is the json_schema response_model: every field is required so the
model can't omit the misconception/feedback fields (CLAUDE.md: fatal-misconception
fields required). `passed` is recomputed server-side, never trusted from the LLM.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GradeRequest(BaseModel):
    """Boundary input from the frontend."""

    taskId: str = Field(description="Assessment task id, e.g. 'cap-distinguish'.")
    answer: str = Field(description="The learner's written explanation.")


class CriterionScore(BaseModel):
    criterionId: str = Field(description="The rubric criterion id this scores.")
    score: float = Field(description="Points awarded for this criterion (0..maxScore).")
    maxScore: float = Field(description="Maximum points for this criterion.")
    comment: str = Field(description="One concise sentence justifying the score.")


class JudgeResult(BaseModel):
    """Boundary output. Returned to the frontend and rendered as feedback."""

    score: float = Field(description="Overall score 0..100, the sum of criterion scores normalized.")
    passed: bool = Field(description="Recomputed server-side; the model's value is ignored.")
    confidence: Literal["low", "medium", "high"] = Field(
        description="How confident the grading is. Use 'low' if the answer is ambiguous or off-topic."
    )
    criterionScores: list[CriterionScore] = Field(description="One entry per rubric criterion.")
    detectedMisconceptions: list[str] = Field(
        description="Ids of misconceptions (from the provided list) the answer commits. Empty if none."
    )
    missingConcepts: list[str] = Field(
        description="Required concepts the answer fails to use correctly. Empty if none."
    )
    feedbackForLearner: str = Field(description="Concise, actionable feedback. Do not reveal the full rubric.")
    suggestedRemediationNodeIds: list[str] = Field(
        description="Node ids to revisit, derived from detected misconceptions. May be empty."
    )
    followUpQuestion: str | None = Field(
        default=None, description="A single targeted follow-up question when confidence is low; else null."
    )
