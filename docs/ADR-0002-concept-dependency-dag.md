# ADR-0002 — A first-class concept / definition-dependency DAG beneath the skill tree

- **Status:** Accepted — Phases 1–3 implemented (60 concepts across all 17 stages;
  recursive `@c{}` chips; per-stage dependency-ordered concept panel; interactive
  parse/parse-failure explorer). Remaining glossary-only terms are orientation
  layer-words (`syntax`, `proof theory`, `semantics`) and minor variants
  (`generative grammar`, `recognition grammar`, `proof checking`, `proof search`,
  `recursive definition`, `computably axiomatized`), kept in the glossary by choice.
- **Date:** 2026-06-20
- **Builds on:** [ADR-0001](./ADR-0001-skill-dag-pivot.md) (the stage-level skill DAG)
- **Owner:** Brian (learner + product owner)
- **Implementation note:** the concept DAG surfaced (and we then fixed) a missing
  skill-graph prerequisite `c-proof → c-pa`: Stage 5 *derives* 2+2=4 and the
  `peano-arithmetic`/`model` concepts depend on `formal-theory`/`axiom`.

## Context

ADR-0001 gave us a **stage-level** prerequisite DAG: 17 concept nodes + 13
achievement nodes, edges between *stages*. Field notes from working through the
live site show the remaining pain is one level *finer* than a stage:

1. **Terms are used before they are defined — and the build gate doesn't catch
   it.** `CLAUDE.md` promises "no forward references," but the closure checker
   (`scripts/validate-content.mjs`) only validates `@t{…}`/`@n{…}` *chip tokens*.
   The prose *inside* a glossary/definition entry is never scanned. So the
   `formula` definition — *"a **well-formed** expression that is true or false once
   **interpreted** and its **free variables** are assigned"* — name-drops three
   undefined terms and passes the gate. The learner hits "well-formed used but
   never defined," "what is an object?", and "what is `P`?" repeatedly.

2. **Definitions don't drill down.** `@t`/`@n` chips are clickable, but a chip's
   popover renders its meaning **math-only, no nested chips** (by design today).
   So you cannot click *axiom* → *rule* → *example* from inside a definition.
   "See the PA symbol" is a dead pointer, not a link.

3. **There is no concept-level dependency structure.** Within a stage,
   `definitions[]` is a flat, hand-ordered list. Nothing forces simplest-first
   ordering by conceptual dependency, so Stage 1 introduces `symbol` *after* the
   alphabet, uses `P` before defining it, etc. The learner's own diagnosis:
   *"more work needs to be done on the conceptual DAG to then abstract into the
   skill tree — each node in the skill tree should encapsulate a DAG of the
   concepts it teaches; a definition-dependency tree is part of building that."*

4. **Parse rules are asserted, not shown.** The parse-tree viz shows a malformed
   string + a one-line reason, but never the **formation rules**, so "why does
   this parse and that doesn't" is told, not demonstrated.

Points 1–3 are the same missing thing: a **concept** is not a first-class object
with its own prerequisites. Point 4 is a feature that rides on the same data
(formation rules *are* concept→concept edges).

## Decision

Introduce a **concept dependency DAG** as the fine-grained substrate beneath the
ADR-0001 stage DAG.

- A **`Concept`** is a first-class node: an id, a display term, a layer, a
  one-line definition, an optional expansion, a concrete example, an optional
  self-contained **micro-quiz**, and — crucially — **`prerequisites: conceptId[]`**
  (the other concepts you must already grasp). This is the definition-dependency
  edge set.
- Each concept declares **`introducedIn`**: the stage (skill node) that formally
  teaches it. This is the link between the two DAGs: **a stage node encapsulates
  the sub-DAG of concepts whose `introducedIn` is that stage.** The stage DAG
  becomes an *abstraction* (a quotient) of the concept DAG — exactly what the
  learner asked for.
- A new inline chip **`@c{concept-id}`** references a concept. Unlike `@t`/`@n`,
  concept chips **render recursively**: a concept's definition may itself contain
  `@c{}` chips, drillable to arbitrary depth (with a render-depth guard), each
  offering "show example" and (if present) "quiz me."

`@n{}` notation chips stay as-is — genuine self-contained primitives (symbols).
`@c{}` is for *ideas*, which have prerequisites. The glossary (`@t`) is
**subsumed over time**: each glossary entry migrates to a `Concept` with explicit
`prerequisites` replacing its unordered `related`. The two coexist during
migration; new and migrated content uses `@c{}`.

### The two invariants that close the hole

The validator (`npm run check`) gains a concept pass that asserts:

1. **Acyclic** over `prerequisites`. This catches the `symbol ↔ alphabet`
   definitional cycle as a build error.
2. **Definition closure (the real fix).** Every `@c{X}` appearing in a concept's
   `short`/`expanded` text **must be a transitive prerequisite of that concept**.
   You cannot mention a concept in a definition unless you've declared you depend
   on it — so "defined before use" is enforced at *term* granularity, not just
   chip-token granularity. `@n{}` references stay always-available; genuine
   primitives are marked `primitive: true`.
3. **Cross-DAG coherence.** A prerequisite concept's `introducedIn` stage must be
   the same stage or a *prerequisite stage* (in the ADR-0001 skill DAG). This is
   what keeps the fine DAG and the stage DAG from contradicting each other.

### What the model forces (and why that's the point)

Encoding Stage 0–1 as concepts immediately surfaced latent content bugs:

- `symbol` and `alphabet` were mutually defined → broken by making `symbol` a
  primitive and `alphabet` depend on it.
- `term`/`formula` depended on an undefined "well-formed" → broken by introducing
  `formation-rule → well-formed → parse-tree` *before* `term`/`formula`. This is
  also the data that drives the "show the parse rules" feature (point 4): the
  formation rules are the `formation-rule` concept's content.
- The concept DAG flags a **missing stage edge**: the `peano-arithmetic` idea
  depends on `formal-theory` (taught at stage-3 / `c-proof`), but the skill DAG
  has no `c-proof → c-pa` prerequisite edge. Recorded as a follow-up; not fixed
  in this PoC (out of the Stage 0–2 scope).

## Scope of this change (phased)

- **Phase 1 (this ADR's PoC — data + gate only):** `Concept`/`ConceptGraph`
  types; `src/content/concepts.ts` populated with the Stage 0–2 atom concepts;
  validator concept pass (acyclic + definition-closure + cross-DAG coherence +
  micro-quiz integrity). No UI consumes the graph yet, so it's inert and safe;
  `npm run check` proves the model carries real content and the gate fires.
- **Phase 2 (UI):** recursive `@c{}` chip rendering (drill-down popover, "show
  example", "quiz me"); render a stage's encapsulated concept sub-DAG on the node
  detail page; derive the in-page definition order from a topological sort of the
  concept DAG instead of hand-ordering.
- **Phase 3 (migration):** convert the glossary (`@t`) to concepts; switch lesson
  prose to `@c{}`; extend the formation-rule concept into the interactive
  parse/parse-failure explorer (point 4).

## Consequences

**Positive**
- The "defined before use" guarantee becomes real, at the granularity where it
  was failing.
- Authoring a definition that references an idea forces you to declare the
  dependency, which forces simplest-first ordering — the DAG *is* the order.
- The stage DAG gains a principled derivation (quotient of the concept DAG)
  rather than hand-curated membership.

**Negative / costs**
- More authoring structure per term (prerequisites + introducedIn).
- A migration period where `@t` (glossary) and `@c` (concepts) coexist.
- Surfaced latent stage-edge gaps must be adjudicated (good, but it's work).

## Alternatives considered

- **Just scan glossary prose for bare known terms.** Catches *some* forward refs
  but has no dependency model, no ordering, no drill-down, no parse-rule data.
  Rejected: treats the symptom, not the missing structure.
- **Make every concept a node in the ADR-0001 skill graph.** Node explosion
  (~60+ nodes) and conflates "what the learner navigates" (stages) with "what a
  definition depends on" (concepts). Rejected: keep two DAGs with an explicit
  `introducedIn` link.

## Acceptance criteria (Phase 1)

1. `Concept`/`ConceptGraph` in `src/types.ts`; `CONCEPT_GRAPH` in
   `src/content/concepts.ts` covering the Stage 0–2 atoms.
2. Validator asserts: unique ids; prerequisites resolve; **acyclic**; every
   `@c{}` in a concept's definition is a **transitive prerequisite**; micro-quiz
   answer integrity; `introducedIn` is a real stage; prerequisite concepts are
   introduced at the same-or-prerequisite stage.
3. `npm run check` green.
