# godel — project instructions

Educational site teaching the prerequisites for Gödel's incompleteness theorems.
Core mission: **prevent category errors** — make `well-formed ≠ provable ≠ true ≠
metatheoretically known` visible. Not a generic "Gödel explainer."

## Architecture (current state)
The **concept graph is the source of truth** and everything else is derived
(ADR-0002 → ADR-0003 → ADR-0004; generalized in `METHODOLOGY.md`):
- **`src/content/concepts.ts`** — 60 concepts across the 17 stages. Each has a
  definition, example, optional micro-quiz, a `group` (`introducedIn` stage), an
  **acyclic** `prerequisites` list, optional `contrasts` (undirected), and a
  **mandatory** per-edge justification in `PREREQ_WHY` (`"concept>prereq"` → why).
- **`src/content/derive.ts`** — SCC linter + `deriveStageEdges` + `transitiveReduction`.
- **`src/content/graph.ts`** — the skill map: its concept→concept prerequisite
  edges are **derived** from the concept graph; only achievements, positions,
  goals, and 4 audited pedagogical-sequencing edges are hand-authored overlay.
- **Frontend** (static Vite/React/TS, KaTeX, React Flow): skill-tree homepage,
  `#/concepts` concept-graph view (stage layout, per-edge justifications on
  hover/inspect), per-stage concept panels with recursive `@c{}` drill-down chips,
  the interactive parse/parse-failure explorer, 6 quiz types.
- **Backend** (`backend/`, FastAPI + `llm_client`): the LLM judge is **live and
  validated** (prompt_eval frozen set); achievements graded deterministic + judged.
- To change curriculum structure, **edit `concepts.ts`, not `graph.ts`** — the
  map, ordering, glossary panels, and checks follow. ADR-0001/MIGRATION_PLAN are
  historical (the linear ladder = one topological order of the derived map).

## Content invariants (enforced)
- **No forward references (prerequisite closure).** Every concept a node uses must
  be introduced at that node or a transitive prerequisite — "has this already been
  explained?" is a build gate, not a hope. Enforced by the closure checker in
  `scripts/validate-content.mjs`: a `@t{term}` ref must resolve to a lesson that
  defines it at-or-before the node. `@n{}` notation chips are self-contained
  (carry their own definition). Unavoidable early refs (PA) use **spiral glosses**
  — a one-line working definition up front, deepened later — not a bare name-drop.
  Orientation nodes (stage-0) preview deliberately and are exempt.
- **Concept graph invariants (ADR-0002/0003/0004), all gated in the validator.**
  `prerequisites` is **acyclic** — a cycle is a *decomposition error*, not a
  feature (resolve by: name a primitive; recognize an inductive definition as
  well-founded; reclassify a contrast; or split into maturity versions). Every
  prerequisite edge **must** have a `PREREQ_WHY` justification (no unjustified
  edges, no orphans). Concept definitions are **closed** at term granularity
  (a `@c{}`/`@t{}` ref must be a prerequisite-or-equal). The **group-lifted**
  graph must be acyclic (no mis-grouping). `contrasts` must resolve and be
  symmetric. Cyclicity is a diagnostic; the SCC pass is a linter.
- **Two distinctions, not four levels.** The faithful frame is one precondition
  (well-formed) + two orthogonal axes: `⊢ vs ⊨` (provable vs true) and object vs
  metatheory. Proof is on the syntactic side; metatheory is a vantage, not a
  level. The DAG roots are the atoms (syntax, structures); the "Two Distinctions"
  node is an optional, non-gating map.
- **Beware recency over-indexing.** This project was spurred by the end of a long
  ChatGPT thread; generated specs over-fixate on whatever was salient late
  (the old "four levels", the 9 edge types, the elaborate judge schema). Pressure-
  test foundational framings against standard sources, not the chat's last turn.

## Non-negotiables
- **Math correctness is the product.** Apply `CONTENT_NOTES.md` (consistency vs
  soundness vs ω-consistency/Rosser; Fixed-Point Lemma; two senses of "complete";
  representability). A subtle content error is a critical bug here.
- **Fixed running cast** (`RUNNING_EXAMPLE.md`): `T=PA`, `ℕ`, `2+2=4`,
  `∀x(x+0=x)`, `2+2=5`, the malformed string, `G_T`/`Con(T)`. Use `G_PA` when the
  theory is named PA (no `G_T`/`PA` drift).
- **Every symbol defined at use** via `@n{key}` (notation.ts) / `@t{slug}`
  (glossary). The validator fails on unresolved `@refs`.
- **Verify by running it.** `npm run check` (tsc + content validator + build).
  The headless visual pass (`npm run screenshots`, puppeteer, `--disable-dev-shm-usage`
  for WSL) is mandatory before declaring UI done — it has already caught two
  page-freezing bugs that tsc/validator/review all missed.
- **Concept graph correctness.** `scripts/derive-report.mjs` is the SCC/cycle
  linter + derived-vs-authored map audit + goal-closure check. The concept graph
  passed a multi-agent Tier-1 correctness audit (2026-06-20); findings, fixes, and
  the full edge inventory are in `docs/EDGE_REVIEW.md` — update it when edges change.

## LLM judge (live — maintain to this contract)
Built and validated; keep these invariants when changing it. Uses the ecosystem:
`llm_client` (`task=`,`trace_id=`,`max_budget=`),
`json_schema` structured output (`JudgeResult`; fatal-misconception fields
required), prompts-as-data (YAML/Jinja, no f-strings), a typed `@boundary`,
FastAPI + API parity, and **validate with `prompt_eval` on a frozen case set
before it gates any achievement** (target false-pass ≤5%, false-fail ≤15%).
API key backend-only; treat learner input as untrusted (prompt injection).
