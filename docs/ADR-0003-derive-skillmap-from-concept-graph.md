# ADR-0003 — The concept graph is the source of truth; the skill map is derived (and the concept graph may be cyclic)

- **Status:** Accepted & implemented (Phases A, C, D) — **amended 2026-06-20**
  (see Amendment below). The skill map's concept→concept prerequisite edges are
  now derived in `graph.ts` via `deriveStageEdges` + `transitiveReduction`;
  achievements/positions/goals remain a hand-authored overlay, alongside 4 audited
  pedagogical-sequencing edges.
- **Date:** 2026-06-20

> **Amendment (2026-06-20).** This ADR was originally written to *embrace* cycles
> in the concept dependency graph ("learn-together clusters," SCC condensation as
> a derivation step). That was an over-correction. **Cyclicity is not a goal; an
> accurate model of educational dependency is.** A prerequisite cycle is a
> *decomposition smell*, not a feature — it resolves into a missing primitive, an
> inductive definition mistaken for a dependency, or a contrast mislabeled as a
> dependency (see [ADR-0004](./ADR-0004-methodology-concept-graph-to-skillmap.md)
> §Cycles). Accordingly: **`prerequisites` is acyclic and gated as such**; SCC
> detection is retained only as a **linter**; the separate **`contrasts`**
> relation carries genuine mutual *association* without faking a dependency. The
> derivation (§2, §4) is unchanged — with acyclic deps, condensation is trivial.
- **Supersedes the layering of:** [ADR-0002](./ADR-0002-concept-dependency-dag.md)
  (which made the concept DAG a *secondary* layer beneath a hand-authored skill DAG)
- **Owner:** Brian (learner + product owner)

## Context

ADR-0002 introduced a concept dependency **DAG** as a layer *beneath* the
hand-authored stage-level skill DAG (ADR-0001): each concept declared
`introducedIn` a stage, and the skill DAG's edges were curated by hand.

Two problems surfaced in use:

1. **Forcing the concept relation to be acyclic misrepresents the concepts.**
   The acyclicity gate does not *discover* that concepts are acyclic — it forces
   a direction every time it hits a cycle, and we hit several genuine ones:
   - **Simultaneous recursion** — in first-order logic *terms* and *formulas*
     are defined by mutual induction, and a *formula* can be a *quantified
     formula* (`∀x P`), so `formula` and `quantifier` genuinely co-depend. We
     linearized this by fiat (`formula` ← atomic only; `quantifier` downstream).
   - **Contrast pairs** — `⊢ vs ⊨` (`syntactic`/`semantic`), `object theory vs
     metatheory`, `diagonalization vs Fixed-Point Lemma`. Understood *against*
     each other; we papered over the back-edges with plain-text mentions.

2. **The skill map was authored twice.** `graph.ts` hand-lists prerequisite
   edges between stages, while `concepts.ts` *also* encodes (finer) dependencies.
   These can drift; indeed the concept graph already caught one missing skill
   edge (`c-proof → c-pa`).

## Decision

**Invert the layering.** The **concept graph is the single source of truth** for
*what depends on what*. It **may contain cycles**. The **stage-level skill-map
DAG is derived from it**, never hand-authored.

### 1. The concept graph may be cyclic

Concept dependency edges may form cycles. A cycle means a set of concepts that
are *mutually defining* — you learn them together, not in sequence (e.g.
`term ↔ formula ↔ quantifier`). We stop pretending otherwise.

A second, explicitly **non-directional** relation `relates`/`contrasts_with`
(reserved already in ADR-0001's `EdgeKind`) captures associations that aren't
dependencies (e.g. `⊢` *contrasts* `⊨`). It never participates in derivation or
gating — it's for cross-links and the "see also" UI.

### 2. Deriving the DAG: SCC condensation + group-lift

The canonical way to turn a cyclic directed graph into a DAG is **strongly-
connected-component (SCC) condensation**: collapse each maximal cycle into one
node; the condensation is provably acyclic.

- **Concept clusters** = SCCs of the concept dependency graph. A singleton is an
  ordinary concept; a multi-member SCC is a "learn-together" cluster.
- **Skill-map nodes** = groups of concepts (the existing `introducedIn` / branch
  grouping is the abstraction function from concepts → skill node).
- **Skill-map edges** = concept dependencies *lifted* to the group level: group
  `G_p → G_c` whenever some concept in `G_c` depends on some concept in `G_p`
  (cross-group only), then de-duplicated. Because the underlying relation
  condenses to a DAG and the grouping respects it, the lifted graph is acyclic
  (any residual group cycle is a **validation error** — the grouping fights the
  dependencies and must be fixed).

### 3. The generalized closure gate

ADR-0002's "no forward reference in a definition" generalizes cleanly to a
cyclic graph: a definition may reference concepts in **its own SCC or an
ancestor SCC**, never a *descendant* SCC. Within a mutually-defining cluster,
cross-reference is expected and allowed; across the derived DAG, forward
references are still forbidden. (When every SCC is a singleton this is exactly
the old gate.)

### 4. What stays hand-authored (the overlay)

Not everything in the skill map is a concept. These remain a manual overlay on
the *derived* node set:
- **achievement nodes + their `assesses` edges** (assessments, not concepts);
- **layout positions** and **branch grouping**;
- **goal → achievement** mapping.

So: derived = the concept-prerequisite backbone between skill nodes; authored =
achievements, positions, goals.

## Migration (non-destructive first)

- **Phase A (this ADR — prove it):** build the derivation engine (`derive.ts`):
  Tarjan SCC over the concept graph, group-lift to skill-map edges. A report
  diffs derived edges against the current hand-authored `graph.ts` prerequisite
  edges (concept→concept only). Goal: show the concept graph *explains* the
  hand-authored map. **No destructive change.**
- **Phase B:** make the cycles real — restore the `term/formula/quantifier`
  mutual edges and the `contrasts_with` links; relax the closure gate to the
  SCC-based rule; the build stays green.
- **Phase C:** flip the source of truth — `graph.ts` prerequisite edges become
  *generated* from `derive.ts`; only the overlay (achievements/positions/goals)
  stays hand-written. Validator asserts the derived graph is acyclic and every
  achievement is still reachable.
- **Phase D:** render the concept graph itself (cyclic, SCC-clustered) with the
  existing React Flow engine — the visualization the learner expected.

## Consequences

**Positive**
- One source of truth; the skill map can't drift from the concepts.
- Cycles are represented honestly; "learn-together" clusters become first-class.
- The grouping is *checked* against dependencies, catching mis-placed concepts.

**Negative / risks**
- Derivation can produce edges the curated map intentionally omitted (transitive
  shortcuts) — handled by comparing reachability/closure, not raw edge sets.
- Some skill-map edges may *not* be explained by any concept dependency; those
  are either missing concept edges (fix the concepts) or genuinely pedagogical
  (keep as overlay) — Phase A's diff makes the choice explicit, per edge.
- SCC clusters could be larger than expected if dependencies are drawn too
  liberally; the cluster sizes are themselves a content signal to review.

## Acceptance (Phase A)

1. `derive.ts`: Tarjan SCC + group-lift; pure over `CONCEPT_GRAPH`.
2. A report lists multi-member SCCs (cycles) and diffs derived vs authored
   concept-prerequisite edges at the **closure** level (not raw edges).
3. `npm run check` stays green; no behavior change yet.
