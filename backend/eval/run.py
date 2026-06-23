"""Validity gate for the judge: grade a frozen good/borderline/bad case set and
report false-pass / false-fail rates. The judge must clear the bar
(false-pass ≤ 5%, false-fail ≤ 15%) before it gates any achievement.

This is the lightweight in-repo gate; it can graduate into the shared prompt_eval
harness (frozen case sets + bootstrap CI) when we scale to many achievements.

    cd backend && python -m eval.run
"""
from __future__ import annotations

import json
import pathlib
import sys

from godel_judge.judge import grade
from godel_judge.models import GradeRequest

FALSE_PASS_MAX = 0.05
FALSE_FALSE_MAX = 0.15

_HERE = pathlib.Path(__file__).resolve().parent


def main() -> int:
    spec = json.loads((_HERE / "cases.json").read_text())
    task_id = spec["taskId"]
    cases = spec["cases"]

    false_pass = 0  # expected fail, judged pass (the dangerous one)
    false_fail = 0  # expected pass, judged fail
    n_pos = sum(1 for c in cases if c["expect_pass"])
    n_neg = len(cases) - n_pos

    errors = 0
    print(f"Validating judge on {len(cases)} frozen cases for {task_id}\n")
    for c in cases:
        try:
            r = grade(GradeRequest(taskId=task_id, answer=c["answer"]))
        except Exception as exc:  # quota/transient — record, don't crash the run
            errors += 1
            print(f"[ERR ] {c['id']:22s} {type(exc).__name__}: {str(exc)[:60]}")
            continue
        ok = r.passed == c["expect_pass"]
        if not ok and c["expect_pass"]:
            false_fail += 1
        if not ok and not c["expect_pass"]:
            false_pass += 1
        flag = "ok " if ok else "MISS"
        print(
            f"[{flag}] {c['id']:22s} expect={'PASS' if c['expect_pass'] else 'fail'} "
            f"got={'PASS' if r.passed else 'fail'} score={r.score:5.1f} conf={r.confidence:6s} "
            f"misc={r.detectedMisconceptions}"
        )
    if errors:
        print(f"\n⚠ {errors} case(s) errored (e.g. provider quota) — rerun when quota resets.")

    fp_rate = false_pass / n_neg if n_neg else 0.0
    ff_rate = false_fail / n_pos if n_pos else 0.0
    print(
        f"\nfalse-pass {false_pass}/{n_neg} = {fp_rate:.0%} (max {FALSE_PASS_MAX:.0%}); "
        f"false-fail {false_fail}/{n_pos} = {ff_rate:.0%} (max {FALSE_FALSE_MAX:.0%})"
    )
    graded = len(cases) - errors
    gated = graded > 0 and errors == 0 and fp_rate <= FALSE_PASS_MAX and ff_rate <= FALSE_FALSE_MAX
    if errors:
        print("GATE: INCONCLUSIVE — cases errored; cannot certify until all grade")
    else:
        print("GATE:", "PASS — judge may gate achievements" if gated else "FAIL — do not trust the judge yet")
    return 0 if gated else 1


if __name__ == "__main__":
    sys.exit(main())
