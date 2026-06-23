# The Concept Ladder — Gödel Prerequisites

**Live:** https://brianmills2718.github.io/godel-concept-ladder/ (auto-deploys from
`master` via GitHub Actions → Pages). The deployed site is fully usable — lessons,
the skill tree, deterministic quizzes, progress. The *open-ended* achievement
grading needs the LLM-judge backend (`backend/`), which Pages can't host, so on the
hosted site it degrades to self-assess; run the backend locally for AI grading.

An educational site that teaches the prerequisites for Gödel's incompleteness
theorems by keeping the key relations **strictly apart**. The pedagogical goal is
not "explain Gödel" — it is to prevent the category errors (well-formed =
provable = true) that ordinary explanations skip over.

**Architecture — concept graph as source of truth.** A **concept graph**
(`src/content/concepts.ts`: 60 concepts, acyclic prerequisites each with a stated
justification, plus undirected `contrasts`) is the single source of truth; the
**skill map** (homepage DAG) is *derived* from it (`derive.ts` → `graph.ts`). The
homepage is that derived prerequisite DAG — concept nodes (the reviewed lessons) +
13 **achievement** nodes earned by **performance assessment**, not by viewing
content. Deterministic checks grade exact answers; an **LLM judge** (`backend/`,
FastAPI + llm_client) grades open-ended explanations with fatal-misconception
overrides and remediation routing. `#/concepts` renders the concept graph itself
(stage layout, per-edge justifications). Pick a goal and the tree highlights its
prerequisite sub-DAG. The old linear ladder is one topological order of the derived
map. See `docs/ADR-0002…0004` and `METHODOLOGY.md`; ADR-0001/MIGRATION_PLAN are
historical. **To change structure, edit `concepts.ts`, not `graph.ts`.**

## Stack
- Vite + React + TypeScript
- KaTeX for math, React Flow for typed node-link graphs (DAGs only)
- Content is plain data (`src/content/`); progress in localStorage; optional
  FastAPI + `llm_client` judge backend (`backend/`) for open-ended grading

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static bundle in dist/ (relative paths, deploys anywhere)
npm run validate   # structural check of all lesson/quiz/graph content
npm run check      # typecheck + validate + build (full gate)
```

## Code map
- `src/types.ts` — the content contract (Concept, Lesson, typed graph/quiz unions)
- `src/content/concepts.ts` — **the source of truth**: 60 concepts + `PREREQ_WHY`
  (per-edge justifications) + topological-order/SCC helpers
- `src/content/derive.ts` — SCC linter, `deriveStageEdges`, `transitiveReduction`
- `src/content/graph.ts` — skill map: derived prerequisite edges + hand-authored
  overlay (achievements, positions, goals)
- `src/content/lessons/` — one file per stage; add to `lessons/index.ts`
- `src/content/glossary.ts` — 61 terms, every technical word used in a lesson
- `src/components/ConceptGraphView.tsx` — the `#/concepts` concept-graph view
- `src/components/viz/` — six renderers: typed-graph (React Flow), parse-tree,
  **parse-explorer** (formation rules + parse/fail), comparison-table,
  coding-encoder (prime-power BigInt), godel-loop
- `src/components/Quiz.tsx` — MC / multi-select / true-false / classification /
  fill-in / matching, with immediate feedback + why-wrong explanations
- `src/store/progress.ts` — localStorage, soft gating (never blocks navigation)
- `scripts/validate-content.mjs` — the build gate: stage coverage, quiz integrity,
  **concept acyclicity + definition closure + mandatory PREREQ_WHY + group
  coherence + contrasts symmetry**, graph edges, a11y summaries
- `scripts/derive-report.mjs` — SCC/cycle linter + derived-vs-authored map audit

## Status — complete
All **17 stages (0–16)** are authored, registered, and validated:

| | | |
|---|---|---|
| 0 Four-Level Map | 1 Symbols→Sentences | 2 Grammar |
| 3 Proofs | 4 Proof graphs | 5 PA & 2+2=4 |
| 6 Structures | 7 Satisfaction (⊨) | 8 ⊢ vs ⊨ |
| 9 Sound/Complete | 10 Object vs Meta | 11 Computability |
| 12 Gödel coding | 13 Proof_T/Prov_T | 14 Diagonalization |
| 15 First Incompleteness | 16 Second Incompleteness | |

`CONTENT_NOTES.md` records the math-correctness decisions (consistency vs
soundness vs ω-consistency/Rosser; Fixed-Point Lemma; the two senses of
"complete"; representability) applied across Stages 9–16. `RUNNING_EXAMPLE.md`
documents the fixed example cast and the inline-definition system.

### Security note (dev dependency)
`npm audit` flags an esbuild advisory (GHSA-67mh-4wv8-2f99) inherited via Vite.
It affects **only the local dev server** (`npm run dev`) — a malicious website
could read dev-server responses — and is **not present in the built static
output** (`dist/`), which ships no esbuild/Vite. The only patched path is a major
Vite upgrade (v8), a breaking change deferred for now. Mitigation: don't run the
dev server on an untrusted network; the production bundle is unaffected.

### Acceptance criteria (from the spec)
- [x] Separates well-formedness / provability / truth / metatheory / coding via
      typed nodes + typed edges with per-graph legends.
- [x] Shows 2+2=5 well-formed-but-false; 2+2=4 provable & true; G_T arithmetic
      not paradox; Proof_T an arithmetic predicate; metatheory ≠ a node in T.
- [x] Every stage has a quiz with why-correct + why-wrong feedback.
- [x] Typed, consistent graph notation + textual fallback (a11y).
- [x] No unexplained term — all are in the glossary (validated).
- [x] Sequential navigation + review (sidebar); soft mastery gating.
- [x] Math renders (KaTeX); clean, content-driven (add a lesson without touching
      components).
