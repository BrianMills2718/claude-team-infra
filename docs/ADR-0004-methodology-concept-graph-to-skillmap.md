# ADR-0004 — Methodology: modeling a topic as a concept graph and deriving its skill map

- **Status:** Accepted (process spec; topic-agnostic)
- **Date:** 2026-06-20
- **Generalizes:** [ADR-0002](./ADR-0002-concept-dependency-dag.md) (concept layer)
  and [ADR-0003](./ADR-0003-derive-skillmap-from-concept-graph.md) (derive the map)
- **Owner:** Brian

> **Purpose.** This ADR is *not* about Gödel. It states a **reusable methodology**
> for turning any body of knowledge into a learnable structure: model the topic as
> a **concept graph** (which may be cyclic), then **derive** a navigable, acyclic
> **skill map** from it. The Gödel ladder is the first instance; the same process
> should apply to other subjects. Where this doc says "the topic," substitute any
> subject (linear algebra, distributed systems, immunology, …).

## Why a methodology, not just a content file

Hand-authoring a curriculum encodes the dependency structure *implicitly* and
*twice* — once in the prose order, once in any navigation graph — so the two
drift and "is this term defined yet?" is a hope, not a guarantee. The methodology
makes the dependency structure the **single, explicit, checkable artifact** and
derives everything else from it.

## The objects

1. **Concept** — one idea, as a record: `id`, display term, a one-line
   definition, an example, optional self-check (micro-quiz), a **group** (the
   skill-map node it belongs to), and two relations:
   - **`prerequisites`** — directed "you must grasp X to grasp this." **Acyclic.**
     A cycle here is not a feature — it is a decomposition smell to resolve (see
     §Cycles).
   - **`contrasts`/`relates`** — undirected associations (a "see also" / "defined
     against each other"). Never gates or orders anything. This is where genuine
     *mutual* relationships live **without** faking a dependency.
2. **Concept graph** — all concepts + their `prerequisites` edges. The single
   source of truth for dependency.
3. **Skill map** — the derived, acyclic, navigable graph of *groups* of concepts.
   Plus a hand-authored **overlay** (assessments, layout, goals) that is not
   itself concept-derived.

## The process (apply to any topic)

### Step 1 — Enumerate concepts and their *prerequisites*, not their order

For each idea the topic uses, write the record and list the **other concepts you
must already understand to understand this one**. Do not impose a global order;
list local dependencies only. Mark genuine primitives (`primitive: true`) — ideas
with no prerequisite within the topic (they are available everywhere).

### Step 2 — Let the structure fight back (the gates)

Encode invariants as a build gate so the model cannot lie:

- **Definition closure.** Every concept a definition *names* (via a typed
  reference) must be a **prerequisite-or-same-cluster** concept — never a
  *downstream* one. This is "no forward reference" at term granularity, and it is
  the gate that catches "uses a word it hasn't earned." It is also what *forces*
  the modeler to confront cycles instead of hand-waving them.
- **Group coherence.** The grouping into skill-map nodes must respect the
  dependencies: the group-lifted graph must be **acyclic** (a cross-group cycle
  means a concept is mis-grouped).

Authoring against these gates is the method: every rejection is a content
decision surfaced (a missing primitive, a sloppy definition, a real cycle).

### Step 3 — Treat a cycle as a decomposition diagnostic, not a feature  {#cycles}

Cyclicity is **not** the goal — faithfully modeling *educational* dependency is.
And a prerequisite cycle would mean "you cannot understand A at all without
already fully understanding B, and vice versa" — yet learners *do* acquire such
pairs, which proves a non-circular grounding exists. So a cycle in
`prerequisites` is almost always a **modeling error**, and it resolves into one
of three forms. The acyclicity gate fires; you fix the model:

1. **Sloppy/mutual definitions** → name a **primitive**. (`symbol` "an atomic
   mark" vs `alphabet` "a set of symbols" — not "a symbol is a mark *from the
   alphabet*".)
2. **An inductive definition mistaken for a dependency cycle.** A recursive
   definition ("a *formula* can be `∀x P` where P is a formula") is **well-
   founded** — it bottoms out at a base case (atomic formulas). The recursion is
   *generative*, not a prerequisite: you grasp the concept from the base case +
   the building rules, with the recursive occurrence as a schematic placeholder.
   So `formula` depends on `atomic-formula`; the construct `quantifier` depends
   on `formula`. **Acyclic, and more accurate.**
3. **A contrast mislabeled as a dependency.** `⊢ vs ⊨`, `object vs metatheory`
   are understood *against* each other — that is **association, not
   prerequisite**. Put it in `contrasts`. Treating it as a dependency was the
   category error that manufactured the cycle.

Tooling: an **SCC linter** (Tarjan over `prerequisites`) reports any cycle so you
can apply (1)–(3). Because `prerequisites` is acyclic, every SCC is a singleton
and the condensation is trivial — SCC is a *guard*, not a derivation step. The
closure gate is then exactly "a definition may reference a prerequisite-or-equal,
never a downstream concept."

### Step 4 — Derive the skill map; audit it against any hand-authored map

- **Nodes** = concept groups. **Edges** = `prerequisites` *lifted* to the group
  level (group A → B iff some concept in B depends on some concept in A,
  cross-group only), de-duplicated. Acyclic by Steps 2–3.
- If a hand-authored map already exists, **diff at the reachability/closure
  level** (not raw edges — derivation legitimately adds transitive shortcuts).
  Two outputs, each actionable:
  - **Authored-but-unexplained edges** → either a *missing concept dependency*
    (add it) or a *pedagogical/overlay edge* (keep it in the overlay). Decide per
    edge; the diff makes the choice explicit.
  - **Derived-but-absent edges** → a structural fact the hand map missed (adopt
    it). On the Gödel instance this caught "Structures depends on Syntax," which
    the hand map had wrong.
- A coverage % ("the concept graph explains N% of the curated map") is a health
  metric for the model.

### Step 5 — Render and verify

- Render the concept graph (SCC clusters visible) and the per-group panels in
  dependency order (a topological/DFS order tolerant of cycles).
- Verify by build gate **and** a visual/automated sweep (no unresolved
  references, no broken rendering) before declaring done.

## Roles this assigns

- **Definitions** carry the content; **prerequisites** carry the structure;
  **groups** carry the navigation; the **overlay** carries assessment/aesthetics.
- The skill map is *output*, not input. Editing the curriculum = editing concepts.

## What transfers to a new topic

Everything except the concept records themselves: the `Concept` shape, the gates
(closure + group coherence), the SCC-condensation derivation, the diff/audit, the
renderers, and this process. Standing up a new subject = author its concepts and
their prerequisites; the skill map, ordering, and checks come for free.

## Limits / honesty

- The derived map is only as good as the prerequisite edges; **wrong edges teach
  a false structure** — the audit (Step 4) is the review hook.
- A detected prerequisite cycle is a signal to **decompose or reclassify**, never
  to embrace; the SCC linter exists to surface that debt.
- Some structure is genuinely pedagogical (motivation, examples) and not a
  dependency; that lives in the overlay by design, not forced into the graph.
- Genuinely *mutual* relationships (contrast pairs) are real — they belong in the
  separate `contrasts` relation, which carries association without implying order.
