"""Tests for the integrity-critical grading logic — no LLM calls.

The server-side pass recomputation is the security barrier: a fatal misconception
must fail the task regardless of score, low confidence must never auto-pass, and a
sub-threshold score must fail. These are deterministic and must never regress.
The endpoint is tested with the LLM call monkeypatched out.

Domain: team-AI-infra capstone (cap-setup). Fatal misconceptions include
advice-is-enforcement, codex-inherits, secret-in-repo, one-surface, one-drawer.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from godel_judge import app as app_module
from godel_judge.judge import UnknownTaskError, _postprocess
from godel_judge.models import GradeRequest, JudgeResult

# Minimal task fixture matching assessments.json's cap-setup structure.
TASK = {
    "passThreshold": 0.8,
    "fatalMisconceptions": [
        {"id": "advice-is-enforcement", "remediationNodeIds": ["c-gov"]},
        {"id": "codex-inherits", "remediationNodeIds": ["c-config", "c-caps"]},
        {"id": "secret-in-repo", "remediationNodeIds": ["c-config"]},
    ],
}


def make(score: float, *, conf: str = "high", misc: list[str] | None = None) -> JudgeResult:
    return JudgeResult(
        score=score, passed=True, confidence=conf, criterionScores=[],
        detectedMisconceptions=misc or [], missingConcepts=[],
        feedbackForLearner="x", suggestedRemediationNodeIds=[], followUpQuestion=None,
    )


def test_clean_high_score_passes():
    r = _postprocess(make(90), TASK)
    assert r.passed is True


def test_fatal_advice_is_enforcement_overrides_high_score():
    r = _postprocess(make(95, misc=["advice-is-enforcement"]), TASK)
    assert r.passed is False
    assert "c-gov" in r.suggestedRemediationNodeIds


def test_fatal_codex_inherits_overrides_high_score():
    r = _postprocess(make(95, misc=["codex-inherits"]), TASK)
    assert r.passed is False
    assert "c-config" in r.suggestedRemediationNodeIds
    assert "c-caps" in r.suggestedRemediationNodeIds


def test_fatal_secret_in_repo_overrides_high_score():
    r = _postprocess(make(95, misc=["secret-in-repo"]), TASK)
    assert r.passed is False
    assert "c-config" in r.suggestedRemediationNodeIds


def test_low_confidence_never_auto_passes():
    r = _postprocess(make(90, conf="low"), TASK)
    assert r.passed is False


def test_below_threshold_fails():
    r = _postprocess(make(79), TASK)
    assert r.passed is False


def test_model_passed_value_is_not_trusted():
    # Model claims passed=True with a fatal misconception; server must override.
    r = make(99, misc=["codex-inherits"])
    assert r.passed is True  # as the model returned it
    assert _postprocess(r, TASK).passed is False  # server recomputes


def test_multiple_fatal_misconceptions_all_route_remediation():
    r = _postprocess(make(99, misc=["advice-is-enforcement", "codex-inherits"]), TASK)
    assert r.passed is False
    assert "c-gov" in r.suggestedRemediationNodeIds
    assert "c-config" in r.suggestedRemediationNodeIds
    assert "c-caps" in r.suggestedRemediationNodeIds


def test_endpoint_grade_monkeypatched(monkeypatch):
    fixed = make(88)
    monkeypatch.setattr(app_module, "grade", lambda req, **kw: fixed)
    client = TestClient(app_module.app)
    res = client.post("/api/grade", json={"taskId": "cap-setup", "answer": "a long enough answer here"})
    assert res.status_code == 200
    assert res.json()["score"] == 88


def test_endpoint_unknown_task_404(monkeypatch):
    def boom(req: GradeRequest, **kw):
        raise UnknownTaskError(req.taskId)

    monkeypatch.setattr(app_module, "grade", boom)
    client = TestClient(app_module.app)
    res = client.post("/api/grade", json={"taskId": "nope", "answer": "x"})
    assert res.status_code == 404


def test_health():
    client = TestClient(app_module.app)
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
