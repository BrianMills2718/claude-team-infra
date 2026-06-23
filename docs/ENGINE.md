# The kb→course engine

> "Do we not have an engine that automates this whole process from a knowledge base?"

We do now. This documents the pipeline that takes a **knowledge base** (a docs corpus) and
produces a **complete, gate-passing learning-site instance** — concept graph, derived skill
map, lessons, quizzes, compendium — automatically. It is the generalization of what was
previously hand-orchestrated (the godel stress-finding S6–S8: "godel-with-content-swapped",
not yet a reusable engine).

## Two kinds of stage

| | Stage | Script | In → Out |
|---|---|---|---|
| **LLM** (agent-run Workflow) | Ingest | `docs-sweep.workflow.js` | corpus URLs → per-page compendious extractions |
| **LLM** | Distill | `synthesize-compendium*.workflow.js` | extractions → themed compendium |
| **LLM** | **Synthesize graph (KEYSTONE)** | `synthesize-graph.workflow.js` | compendium → **course-spec** (concepts + justified acyclic prereq DAG + goal) |
| **LLM** | Author | `author-lessons.workflow.js`, `author-quizzes.workflow.js` | concepts+claims → deep lessons, rigorous quizzes |
| **LLM** | Verify | `research-loop.workflow.js` + `validate-claims.mjs` | claims → verified ledger |
| **det.** | **Emit concepts** | `emit-concepts.mjs` | course-spec → sound `concepts.ts` (+ acyclicity repair) |
| **det.** | **Emit graph** | `emit-graph.mjs` | course-spec → `graph.ts` (stage nodes + goal; backbone derived) |
| **det.** | **Assemble + gate** | `build-course.mjs` | course-spec (+ authored JSON) → a full instance, `npm run check` green |

The LLM stages emit **structured JSON** (schema-enforced); the deterministic stages turn that
JSON into a gate-passing instance. The agent runs the Workflows and feeds their JSON to
`build-course.mjs`. (Workflow scripts have no fs access, so the orchestrator injects inputs —
e.g. `compendium.json` into `synthesize-graph` — before running.)

## The keystone: extractions → a *gated* concept graph

The one judgment-heavy link. `synthesize-graph` (LLM) proposes concepts + a prerequisite DAG
with a `kind` and a `why` on every edge, constrained to *same-or-earlier-stage* prerequisites.
`emit-concepts.mjs` (deterministic) then makes it **provably sound**, with a logged audit trail:

- drop edges to non-concepts / self-loops
- drop edges whose prerequisite is at a *later* stage (cross-DAG coherence)
- **break cycles** by dropping the closing back-edge, repeat until acyclic
- `primitive ⇒ no prerequisites`
- every surviving edge carries a `why` + a valid `PREREQ_KIND`

…then re-validates and refuses to emit an unsound graph. The LLM is creative; the emitter is
the gate. (On the proving run below the LLM produced an already-sound DAG — **0 repairs**.)

## Proof (run 2026-06-23)

From the 150-page docs sweep → 12-section compendium → `synthesize-graph` produced a
**105-concept, 12-stage** course-spec with 147 justified edges (see
`docs/course-spec.example.json`). `build-course.mjs` assembled a full instance and it passed
the complete gate:

```
✓ content valid: 12 stages, 105 glossary terms, 105 concepts (acyclic deps, closed),
  13 graph nodes / 17 edges (acyclic), all consistent
✓ claim ledger valid · ✓ debates in sync · ✓ built   (exit 0)
```

`build-course.mjs` also regenerated the per-instance chrome the engine used to hard-code
(the validator stage range, `viz/legend.ts` layer palette, the `SkillTree` orientation branch)
— fixing S6/S8 so the engine is genuinely stage-count- and domain-agnostic.

## Run it

```bash
# 1. LLM stages (agent runs these Workflows; each emits JSON):
#    docs-sweep → synthesize-compendium → synthesize-graph  (inject compendium.json first)
#    [author-lessons, author-quizzes]   (optional: real content vs stubs)
# 2. deterministic assembly + gate:
node scripts/build-course.mjs <course-spec.json> <targetRepoDir> [lessons.json] [quizzes.json]
cd <targetRepoDir> && npm run check
```

## Status / next
- **Proven**: KB → compendium → course-spec → **gate-passing instance** (deterministic backbone).
- **Wired, not yet run on the fresh 105-concept graph**: the content stages (author-lessons,
  author-quizzes) and per-concept claim verification — the same Workflows already proven on the
  curated 7-stage site. Running them turns the stub lessons into real content + a backed ledger.
- **Belongs in godel** as the reusable engine; built here first, fold back when godel's active
  work lands (see `docs/FOLDBACK-godel-research-loop.md`).
