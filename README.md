# Team AI Infra — Shared Claude Code + Codex Setup

**Live:** https://brianmills2718.github.io/claude-team-infra/ (deploys from the
`gh-pages` branch). The deployed site is fully usable — lessons, the skill tree,
the concept graph, deterministic quizzes, progress. The *open-ended* capstone
grading needs the LLM-judge backend (`backend/`), which Pages can't host, so on the
hosted site it degrades to self-assess.

A concept-graph course that takes you from "which Claude thing do I even open?"
to a **justified decision** about how to set up your team's shared AI
infrastructure across **Claude Code and Codex** — config, capabilities,
distribution, governance, and where each shared thing lives.

Seven stages: **orientation → surfaces → config → capabilities → distribution →
governance → decision**, ending in one capstone — lay out and justify your team's
shared setup.

## Architecture — concept graph as source of truth

This site is a clean instance of the godel concept-graph engine. A **concept
graph** (`src/content/concepts.ts`: 24 concepts, acyclic prerequisites each with a
stated justification + semantic kind, plus undirected `contrasts`) is the single
source of truth; the **skill map** (homepage DAG) is *derived* from it
(`derive.ts` → `graph.ts`). To change the curriculum, edit `concepts.ts`, not the
derived map.

Everything is gated by `npm run check` (tsc + `scripts/validate-content.mjs` +
build): the prerequisite graph must be acyclic, every edge justified, definitions
closed, groups coherent, every lesson at the craft floor (hook → analogy-first →
Therefore/But spine, ≥3 quiz, ≥1 visualization, ≥2 confusions, a mastery check).

## It was also a stress test

This curriculum was built to **stress-test** whether the concept-graph methodology
(proven on conceptual domains like Gödel) survives a **decision / best-practices**
domain. The verdict and the findings are in [`STRESS_TEST.md`](./STRESS_TEST.md):
the content model travels; the repo-as-reusable-engine does not yet (the engine
still hard-codes the stage count, framing copy, and drags the first domain's
fixtures). The methodology held; the packaging needs a content/skeleton split.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # tsc + content validator + build (the gate)
npm run screenshots  # headless visual pass (run a preview/dev server first)
```
