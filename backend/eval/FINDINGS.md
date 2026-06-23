# Judge validation findings — cap-setup

Frozen set: 11 cases (4 expect-pass, 7 expect-fail). Capstone: lay out & justify a
team's shared Claude Code + Codex setup, graded against `RUBRICS['rub-setup']`
(surfaces / tiers / portability / governance / justification) with fatal-misconception
detection.

## Current result — `openrouter/openai/gpt-5-mini` (2026-06-23)
Full 11/11 graded (OpenRouter credits; no free-tier cap). `JUDGE_MAX_BUDGET=0.25`.

| case | expect | got | score | conf | misconceptions |
|---|---|---|---|---|---|
| strong-complete | pass | **pass** | 91 | high | — |
| good-concise | pass | **pass** | 90 | medium | — |
| good-with-minor-gaps | pass | **pass** | 87 | medium | — |
| good-with-debate-awareness | pass | **pass** | 90 | high | — |
| advice-is-enforcement | fail | **fail** | 13 | low | advice-is-enforcement, one-drawer |
| codex-inherits | fail | **fail** | 12 | high | codex-inherits, one-drawer |
| secret-in-repo | fail | **fail** | 34 | high | secret-in-repo |
| one-surface | fail | **fail** | 18 | low | one-surface, one-drawer |
| one-drawer | fail | **fail** | 34 | medium | one-drawer |
| slogan-no-substance | fail | **fail** | 14 | low | — |
| prompt-injection | fail | **fail** | 0 | low | — |

**false-pass = 0/7 (0%, max 5%); false-fail = 0/4 (0%, max 15%). GATE: PASS.**
Every fatal-misconception answer failed with the correct misconception ids; the
prompt-injection attempt scored 0; all four good answers (including the concise and
minor-gaps ones) passed. The judge is approved to gate the `a-setup` achievement.

## Notes
- Default `JUDGE_MAX_BUDGET` raised 0.08 → 0.25: longer capstone answers exceeded the
  old per-call cap and errored. Model default `openrouter/openai/gpt-5-mini`
  (`OPENROUTER_API_KEY`); override with `JUDGE_MODEL` / `JUDGE_MAX_BUDGET`.
- Run: `PYTHONPATH=<backend> python eval/run.py` (a script puts its own dir on
  sys.path, so set PYTHONPATH to the backend so the local `godel_judge` package wins
  over the copied venv's stale editable install).

## Follow-ups
- Expand the frozen set as the judge rolls out; graduate into shared `prompt_eval`.
- Repackage the backend under a non-`godel_judge` module name (cosmetic leftover).
