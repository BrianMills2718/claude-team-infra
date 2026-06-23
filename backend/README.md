# Gödel achievement judge (backend)

FastAPI service that grades open-ended achievement explanations with an LLM, via
`llm_client` (json_schema structured output). The frontend sends `{taskId, answer}`;
the backend is rubric-authoritative (reads `assessments.json`, exported from the
single source `src/content/assessments.ts`).

`passed` is recomputed server-side: `score ≥ threshold AND no fatal misconception
AND confidence ≠ low`. Fatal misconceptions override score; low confidence never
auto-awards (asks a follow-up). This is the integrity barrier against fluent-but-
wrong answers and prompt injection.

## Setup
```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -e . && pip install -e ~/projects/llm_client
node ../scripts/export-assessments.mjs     # regenerate assessments.json
uvicorn godel_judge.app:app --port 8000     # serve
```
Config: `JUDGE_MODEL` (default `openrouter/openai/gpt-5-mini` — via `OPENROUTER_API_KEY`,
any model, real credits, no free-tier cap), `JUDGE_MAX_BUDGET` (0.08). The OpenRouter
route uses `llm_client`'s `instructor` fallback (already in deps).

## Validate before trusting it
`python -m eval.run` grades a frozen good/borderline/bad case set and reports
false-pass / false-fail rates (gate: false-pass ≤5%, false-fail ≤15%). The judge
must clear this bar before it gates any achievement.
