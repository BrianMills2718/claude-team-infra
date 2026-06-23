# Active sprint — content foundations → LLM judge → rollout

> **STATUS: COMPLETE (2026-06-20).** CF1–CF4, C1–C4, D1–D2 all done. Skill DAG is
> the homepage; four-levels reframed to two distinctions; reference-closure
> checker green; LLM judge backend live + validated (0 false-pass) + frontend-
> wired with graceful degradation; typed/dropdown goal selection highlights the
> prerequisite sub-DAG. `npm run check` green; backend grading verified end-to-end.


**Mission:** Fix the content-foundation issues (forward references; over-indexed
four-level root), then complete the skill-DAG build (LLM judge backend + rollout +
personalized goals). Run continuously until done. Re-read this after any
compaction; track in the task list.

**Authorization:** Brian approved a continuous run including real LLM spend
(judge + prompt_eval validation). Proceed; don't pause between phases. Stop only
for irreversible+shared-state actions or a genuine un-pre-made architectural
decision (log + take the safer default otherwise).

## Pre-made decisions (do not re-litigate)
- **Four-level reframe → TWO AXES.** Replace the "four co-equal levels / mandatory
  root" with: well-formed (precondition) + Axis 1 `⊢ vs ⊨` (provable vs true) +
  Axis 2 object-vs-meta. Roots of the DAG become c-syntax / c-proof / c-structures.
  The four-level node is rebuilt as an OPTIONAL, non-gating "Two distinctions"
  orientation (or retired). The well-formed/provable/true comparison table moves
  onto the Provability-vs-Truth node where the confusion bites.
- **No forward references (prerequisite closure).** Every `@t{}`/`@n{}`/concept a
  node uses must be introduced at that node or a prerequisite. Mechanized by a
  reference-closure checker. Unavoidable early refs (PA) use spiral glosses: a
  one-line working definition up front, deepened later. Notation chips are
  self-contained (carry their own definition), so `@n{...}` refs are satisfied;
  `@t{...}` refs must resolve upstream or be glossed.
- LLM judge uses llm_client (task/trace_id/max_budget, json_schema, prompts-as-
  data, @boundary) + FastAPI; validated by prompt_eval on a frozen set before
  gating (target false-pass ≤5%, false-fail ≤15%). API key backend-only.

## Phases & acceptance
- **CF1 — Four-level reframe.** Rewrite stage-0 → "Two distinctions"; graph roots =
  syntax/proof/structures; four-levels non-gating; comparison table on stage-8.
  ✅ validator green; tree shows syntax/proof/structures unlocked at start.
- **CF2 — Reference-closure checker.** Extend validate-content.mjs: introduced-at
  map (from each stage's `definitions`), availability via prereq closure,
  PRIMITIVES allowlist, flag forward `@t` refs. ✅ checker runs and reports.
- **CF3 — Fix forward references.** Iterate until the closure checker passes:
  spiral-gloss PA and friends, make symbol refs chips, reorder/add defs. ✅
  closure checker green; the T/PA chip is self-contained.
- **CF4 — Record principles** in CLAUDE.md (no-forward-ref; two-axes; recency-
  over-index caution).
- **C1–C4 — LLM judge backend.** FastAPI + llm_client `/api/grade` → JudgeResult
  (json_schema, fatal override, confidence); prompt_eval frozen-set validation for
  a-distinguish (report rates, gate); frontend wiring + remediation + degrade.
- **D1–D2 — Rollout + goals.** Author rubrics + wire judge for remaining
  achievements (after C bar); static goal→achievement mapping + goal-picker.
- **Final** — `npm run check` + backend tests green; visual pass screenshots;
  update README/docs; commit.

## Verification each phase
`npm run check` (tsc + content/graph/closure validator + build). Visual pass via
`npm run screenshots` (puppeteer, --disable-dev-shm-usage) before declaring UI
done — it has already caught page-freezing bugs nothing else did. Backend: pytest
+ API parity + prompt_eval report.

## Hard-won lessons (don't regress)
- useSyncExternalStore getSnapshot MUST return stable refs (frozen singleton for
  empty) or React infinite-loops.
- Don't share a global regex across recursive calls (lastIndex corruption →
  synchronous infinite loop that freezes the page).
- Math correctness per CONTENT_NOTES (consistency vs soundness vs ω-consistency/
  Rosser; Fixed-Point Lemma; representability). Fixed running cast per RUNNING_EXAMPLE.
