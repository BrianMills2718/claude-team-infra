# claude-team-infra — project instructions

A concept-graph course that takes a lead from "which Claude thing do I open?" to a
**justified decision** about setting up a team's shared AI coding infrastructure across
**Claude Code and OpenAI Codex**. Built as a clean instance of the godel concept-graph
engine — and as a **stress test** of that engine on a decision (vs conceptual) domain
(`STRESS_TEST.md`). Two purposes: teach the material, harden the methodology.

## Architecture — the concept graph is the source of truth
Everything derives from `src/content/concepts.ts` (ADR-0002→0004; `METHODOLOGY.md`):
- **`src/content/concepts.ts`** — 25 concepts across 7 stages (orientation · surfaces ·
  config · capabilities · distribution · governance · decision). Each has a definition,
  example, an **acyclic** `prerequisites` list, optional `contrasts`, an `introducedIn`
  stage, and a **mandatory** per-edge `PREREQ_WHY` + `PREREQ_KIND`.
- **`src/content/derive.ts`** — `deriveStageEdges` + `transitiveReduction` + goal closure.
- **`src/content/graph.ts`** — the skill map: concept→concept edges are **derived** from
  concepts.ts; only stage nodes, the `a-setup` achievement, and soft orientation links are
  hand-authored overlay.
- **`src/content/glossary.ts`** — **derived** from the concept graph (do not hand-author).
- **`src/content/lessons/claude.ts`** — the 7 stage lessons, to the craft bar.
- **`src/content/debates.ts`** — **derived** from `claims.jsonl` (contested entries) by
  `scripts/derive-debates.mjs`; rendered by the `#/debates` view. Do not hand-edit.
- To change curriculum structure, edit **`concepts.ts`**, never the derived output.

## The claim ledger (correctness, not just structure)
The structural gates prove the graph is internally consistent; they do **not** prove it is
factually correct. That is `claims.jsonl` + `scripts/validate-claims.mjs`: every load-bearing
assertion carries a verdict + sources + `asOf` + the concepts it backs. The gate fails on any
`open`/`wrong`/unsourced/stale claim, contested-with-<2-positions, or unresolved conceptId, and
reports concept coverage. This is the fix for "green but wrong." See `docs/RESEARCH_LOOP.md` for
the front-end methodology (Ground→Extract→Verify→Gap→loop-until-dry) and
`scripts/research-loop.workflow.js` for the executable harness.

## Non-negotiables
- **Factual correctness is the product.** A wrong claim about plans/seats/features is a
  critical bug. New facts go through the ledger (verify against authoritative docs), not
  intuition. Perishable domain — keep `asOf` current (the gate enforces a refresh horizon).
- **Verify by running it.** `npm run check` = tsc + content validator + claim gate +
  debates drift-check + build. The headless visual pass (`npm run screenshots`, puppeteer,
  `--disable-dev-shm-usage` for WSL) is mandatory before declaring UI done.
- **Two engines.** The course spans Claude Code **and** Codex; portability (the config
  mirror: AGENTS.md generated/symlinked from CLAUDE.md, skills mirrored into each tool's
  dir, with a drift check) is load-bearing, not a footnote.
- **Light-governance ≠ no governance.** The enforced floor must include marketplace trust
  (pin allowed marketplaces; installing a plugin runs its code) and secret denial.

## Content invariants (enforced by `scripts/validate-content.mjs`)
- `prerequisites` acyclic; every edge has a `PREREQ_WHY` + valid `PREREQ_KIND`; definitions
  closed; the group-lifted graph acyclic; `contrasts` symmetric; each lesson at the craft
  floor (≥3 quiz, ≥1 visualization, ≥2 confusions, a mastery checkpoint, quiz integrity).

## Backend (LLM judge)
`backend/` grades the `cap-setup` capstone (lay out & justify the team setup) against
`RUBRICS['rub-setup']` with fatal-misconception detection. Uses `llm_client`
(`task=`/`trace_id=`/`max_budget=`), `json_schema` structured output, prompts-as-data,
a typed `@boundary`, FastAPI + API parity; validate with `prompt_eval` on a frozen set
(false-pass ≤5%, false-fail ≤15%). API key backend-only; treat learner input as untrusted.

## Deploy
GitHub Pages from the `gh-pages` branch (Vite `base: "./"`). Live:
https://brianmills2718.github.io/claude-team-infra/
