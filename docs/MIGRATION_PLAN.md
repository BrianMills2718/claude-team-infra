# Migration Plan — Linear ladder → Skill DAG + hybrid assessments

> **STATUS: COMPLETE & PARTLY SUPERSEDED (2026-06-20).** This ADR-0001 migration
> shipped (skill DAG homepage, hybrid assessments, live LLM judge). **§2's
> hand-authored concept→concept edge table is now historical:** those edges are
> **derived** from the concept graph (`src/content/concepts.ts`) per
> **ADR-0003**, with `graph.ts` holding only the overlay. The concept layer
> (ADR-0002), derivation (ADR-0003), and the generalized methodology (ADR-0004 /
> `METHODOLOGY.md`) are the current source of truth. Kept as a historical record
> of the original plan; do not author graph edges from §2.

Companion to **ADR-0001**. This is the executable plan: concrete contracts, the
actual graph, file layout, and per-phase acceptance. An agent should be able to
run this without further decisions.

## 0. What is preserved (no rewrite)

| Existing asset | Role after migration |
|---|---|
| `src/content/lessons/stageN.ts` (17, reviewed) | Content attached to concept nodes (unchanged) |
| `src/components/viz/*` (TypedGraph/React Flow, parse-tree, table, encoder, loop) | TypedGraph **is** the skill-tree renderer; others stay node content |
| `src/components/Quiz.tsx` (6 question types) | Deterministic half of hybrid grading |
| `src/content/notation.ts`, `glossary.ts`, chips, Markdown | Unchanged |
| `scripts/validate-content.mjs` | Extended with graph invariants (acyclic, reachable) |

## 1. Frontend data model (`src/types.ts` additions)

```ts
export type NodeKind = "concept" | "skill" | "achievement";
export type EdgeKind = "prerequisite_for" | "assesses" | "remediates";
// reserved (not authored in v1): meta_level_of | encodes_as | contrasts_with

export interface SkillNode {
  id: string;
  kind: NodeKind;
  title: string;
  shortDescription: string;
  branch: Branch;
  /** concept/skill nodes: the stage id whose content this node renders. */
  lessonId?: string;
  /** achievement nodes: the capstone(s) that earn this node. */
  assessmentIds?: string[];
  /** hand-laid position for the homepage DAG (else auto-layout by branch). */
  position?: { x: number; y: number };
}

export type Branch =
  | "foundations" | "syntax" | "proof-theory" | "peano-arithmetic"
  | "semantics" | "provability-vs-truth" | "theory-properties"
  | "metatheory" | "computability" | "godel-coding"
  | "provability-predicate" | "diagonalization" | "incompleteness";

export interface SkillEdge {
  id: string; source: string; target: string;
  kind: EdgeKind; label?: string;
}

export interface SkillGraph { nodes: SkillNode[]; edges: SkillEdge[]; }
```

Progress (extends `store/progress.ts`): a node is `passed` when its assessment
passes; `available` when all `prerequisite_for` parents are passed; else
`locked`. `currentGoalId` selects an achievement; the UI highlights its ancestor
sub-DAG and the recommended next available node.

## 2. The v1 graph (`src/content/graph.ts`) — author exactly this

**Concept nodes** (carry existing stage content):

| id | branch | lessonId | title |
|---|---|---|---|
| `c-four-levels` | foundations | stage-0 | The Four-Level Map |
| `c-syntax` | syntax | stage-1 (+stage-2 as skill) | Syntax: terms, formulas, sentences |
| `c-grammar` | syntax | stage-2 | Grammar & well-formedness |
| `c-proof` | proof-theory | stage-3 | Axioms, rules, proofs |
| `c-proof-graphs` | proof-theory | stage-4 | Proof graphs |
| `c-pa` | peano-arithmetic | stage-5 | Peano Arithmetic & 2+2=4 |
| `c-structures` | semantics | stage-6 | Structures & interpretation |
| `c-satisfaction` | semantics | stage-7 | Satisfaction (⊨) |
| `c-prov-vs-truth` | provability-vs-truth | stage-8 | Provability vs Truth |
| `c-theory-props` | theory-properties | stage-9 | Soundness/Completeness/Consistency |
| `c-metatheory` | metatheory | stage-10 | Object vs Metatheory |
| `c-computability` | computability | stage-11 | Computability |
| `c-coding` | godel-coding | stage-12 | Gödel coding |
| `c-prov-predicate` | provability-predicate | stage-13 | Proof_T / Prov_T |
| `c-diagonalization` | diagonalization | stage-14 | Diagonalization & G_T |
| `c-incompleteness-1` | incompleteness | stage-15 | First Incompleteness |
| `c-incompleteness-2` | incompleteness | stage-16 | Second Incompleteness |

**Achievement nodes** (capstones; show multi-parent convergence):

| id | prerequisite_for parents | capstone (assessment) |
|---|---|---|
| `a-classify` | c-syntax, c-grammar | classify ∀+=x))0 / S(S(0)) / x+0=x / ∀x(x+0=x) |
| `a-proof-graph` | c-proof, c-proof-graphs | read A,A→B,B→C graph; T⊢C as reachability |
| `a-prove-224` | c-pa, c-proof | complete 2+2=4 derivation + justify steps |
| `a-evaluate-N` | c-structures, c-satisfaction | why ℕ⊨2+2=4 but ℕ⊭2+2=5 |
| `a-distinguish` | c-prov-vs-truth, c-syntax, c-satisfaction, c-proof | **the big one:** classify 4 examples × {wf, provable, true, level} + explain ⊢≠⊨ |
| `a-sound-complete` | c-theory-props | distinguish soundness from completeness |
| `a-object-meta` | c-metatheory | classify 5 claims object/meta + why meta talks about T |
| `a-computability` | c-computability | why theoremhood r.e. but undecidable |
| `a-encode` | c-coding, c-computability | encode [4,7,9]; recover; why proof→number |
| `a-prov-predicate` | c-prov-predicate, c-coding | what Proof_T checks; why arithmetic |
| `a-godel-sentence` | c-diagonalization, c-prov-predicate, c-metatheory, c-syntax | explain G_T↔¬Prov_T(⌜G_T⌝); why not the liar |
| `a-first` | c-incompleteness-1, a-godel-sentence, c-theory-props | explain First (conditions, T⊬G_T, ℕ⊨G_T) |
| `a-second` | c-incompleteness-2, a-first | why T⊬Con(T); tower never closes |

**Concept→concept prerequisite edges** (the convergence; keep acyclic):
```
c-four-levels → c-syntax, c-structures, c-proof
c-syntax → c-grammar, c-pa, c-proof
c-grammar → c-prov-vs-truth
c-proof → c-proof-graphs, c-prov-vs-truth
c-structures → c-satisfaction
c-satisfaction → c-prov-vs-truth
c-pa → c-satisfaction
c-prov-vs-truth → c-theory-props
c-theory-props → c-incompleteness-1
c-metatheory → c-prov-predicate, c-incompleteness-1
c-computability → c-coding, c-prov-predicate
c-coding → c-prov-predicate
c-prov-predicate → c-diagonalization
c-diagonalization → c-incompleteness-1
c-incompleteness-1 → c-incompleteness-2
```
The "recommended path" = a topological sort of this DAG (≈ the current 0→16 order).

## 3. Assessment contracts (`src/content/assessments.ts` + backend)

```ts
export type AssessmentKind = "deterministic" | "llm-judged" | "hybrid";

export interface AssessmentTask {
  id: string; nodeId: string; kind: AssessmentKind;
  title: string; prompt: string;            // KaTeX/markdown
  deterministic?: QuizQuestion[];           // reuse existing engine
  rubricId?: string;                        // for llm-judged / hybrid
  requiredConcepts: string[];
  fatalMisconceptions: Misconception[];
  passThreshold: number;                    // default 0.8
}
export interface Misconception { id: string; description: string; remediationNodeIds: string[]; fatal?: boolean; }
export interface Rubric { id: string; criteria: { id: string; description: string; maxScore: number }[]; }
```

**Backend grade contract** (`POST /api/grade`, the typed `@boundary`):

```ts
// request
{ taskId: string; nodeId: string; answer: string; rubricId: string }
// response = JudgeResult
{
  score: number;            // 0..100
  passed: boolean;
  confidence: "low"|"medium"|"high";
  criterionScores: { criterionId: string; score: number; maxScore: number; comment: string }[];
  detectedMisconceptions: string[];
  missingConcepts: string[];
  feedbackForLearner: string;
  suggestedRemediationNodeIds: string[];
  followUpQuestion?: string | null;
}
```
`passed` is computed server-side as `score ≥ threshold AND no fatal misconception
detected`. Low confidence ⇒ `passed=false` + `followUpQuestion`.

## 4. Backend (`backend/`, FastAPI + llm_client)

- `backend/pyproject.toml`, `.venv`, `pip install -e ~/projects/llm_client`.
- `app.py` — FastAPI; `POST /api/grade`; CORS for the Vite origin.
- Pydantic models mirror the contract; `JudgeResult` is the `json_schema`
  response model (fatal-misconception fields **required**).
- `llm_client` call: `task="godel_judge"`, `trace_id=<per-attempt>`,
  `max_budget=...`, `response_format=json_schema`. Default model per CLAUDE.md.
- Prompt is **data**: `backend/prompts/judge.yaml` (Jinja), `render_prompt(...)`.
- The `@boundary` decorator on the grade function; register schema.
- **Validation:** `backend/eval/` — a frozen case set (good/borderline/bad
  answers per achievement) scored with **`prompt_eval`**; report false-pass /
  false-fail. The judge gates achievements only after this passes a bar
  (target: false-pass ≤ 5%, false-fail ≤ 15% on the frozen set; tune).

## 5. Frontend shell changes

- New homepage `SkillTree` (React Flow): nodes colored by state
  (locked/available/passed/current), achievements gold, legend, pan/zoom,
  filter-by-branch, "why locked?" popover.
- `NodeDetail` panel: renders the node's lesson content (existing components) +
  its assessment. Deterministic tasks graded client-side; `llm-judged`/`hybrid`
  call `/api/grade` and render `JudgeResult` (feedback + remediation links).
- Goal picker: choose an achievement → highlight ancestor sub-DAG + recommended
  next available node. Static goal→achievement map for typed goals (Phase D).
- Routing: `#/node/<id>` (keep hash routing). The linear `#/stage-…` routes
  redirect to their node for back-compat.

## 6. Phases & acceptance

- **A (no backend):** types + `graph.ts` + graph validator (acyclic, every
  achievement reachable, every `lessonId` exists) + SkillTree homepage + NodeDetail
  reusing content + progress/unlock + goal highlight + deterministic achievement
  capstones. ✅ when ADR criteria 1–4 hold and `npm run check` is green.
- **B:** structured-hybrid capstones (classification graded locally + a
  justification field stored); richer rubrics & remediation map authored.
- **C:** FastAPI judge + `json_schema` + one achievement (`a-distinguish`) wired
  end-to-end + prompt_eval frozen-set validation report. ✅ when ADR criteria 5–6
  hold for that one achievement.
- **D:** roll the judge out to the remaining achievements (rubrics authored after
  C's reliability bar); static goal→achievement mapping for personalized goals.
  AI-generated trees remain deferred (data model already supports it).

## 7. Risks / explicit non-goals for v1
- No AI-generated trees (static mapping only).
- Only 3 edge kinds authored.
- Backend is stateless grading; no accounts/server-side progress (localStorage).
- Finer micro-node decomposition deferred.
