# ADR-0005 — Typed prerequisite edges, LLM-in-the-loop generation, and the acyclic-substrate / spiral stance

- **Status:** Accepted (stance + Phase 1 implemented: typed edges); LLM-in-the-loop is the stated direction
- **Date:** 2026-06-21
- **Builds on:** ADR-0002 (concept layer), ADR-0003 (derive the map), ADR-0004 (methodology)
- **Owner:** Brian

## Context

Three conclusions crystallized in design discussion and want recording.

1. **"Prerequisite" is overloaded.** The per-edge justifications (`PREREQ_WHY`)
   are not all the same *kind* of dependency — "a variable *is a* symbol", "a
   string *is built from* symbols", "well-formed *means buildable by* the rules",
   "a quantifier *binds* a formula", "soundness *is the stronger* notion atop
   consistency", "*a hypothesis of* the theorem". In the concept-graph view this
   showed up as a real defect: contrast edges carry a visible label while
   prerequisite edges were bare (their justification was hover/click-only),
   because there was no concise thing to print on a prerequisite edge.

2. **A mechanical derivation guarantees correctness, not optimality.** SCC-condense
   + lift + transitive-reduce + topological-sort produces a *valid* curriculum (no
   forward references, a legal order), but a topological order is necessary, not
   sufficient — many valid orders exist and which one teaches well (pacing,
   motivation, where the payoff lands, when to revisit) is judgment, not algorithm.

3. **Cycles, reconsidered.** The prerequisite *relation* can be kept acyclic (any
   learnable concept has a non-circular grounding via decomposition / primitive /
   contrast-reclassification / maturity-versioning), and acyclicity is what makes
   it mechanically checkable. What is genuinely unavoidable is the *holism* of
   understanding — concepts co-constitute; understanding develops in a spiral.

## Decisions

### 1. Two orthogonal relation axes

- **Gating axis** — does the relation mean "understand first"? `prerequisite`
  (gates closure/acyclicity/derivation) vs `contrasts` / (future) `gloss` /
  `foreshadow` (non-gating).
- **Semantic-kind axis** — *what kind* of prerequisite, an **annotation** that
  does **not** change gating: a small controlled vocabulary
  `{ is-a, part-of, defined-via, operates-on, refines, assumes }`.
  - `is-a` — X is a kind/specialization of Y (`variable→symbol`, `theorem→sentence`).
  - `part-of` — X is composed of / contains Y (`string→symbol`, `formula→atomic-formula`).
  - `defined-via` — X's definition is stated through Y (`well-formed→formation-rule`, `Prov_T→Proof_T`).
  - `operates-on` — X is a construct/operation acting on Y (`quantifier→formula`).
  - `refines` — X is a stronger/sharper/later-maturity version of Y (`soundness→consistency`, `ω-consistency→consistency`). *This is where maturity-versioning lives.*
  - `assumes` — X takes Y as a hypothesis/ingredient (`first-incompleteness→consistency`, `godel-coding→formula`).
- **Rendering:** the *kind* is the always-on edge label (one word, styled per
  kind); the per-edge `why` stays on hover. This annotates every edge at a glance
  and exposes the *shape* of the dependency structure.
- **Discipline:** keep the vocabulary small and earned from real edges; allow a
  "primary flavor" rather than rigid typing (the `why` carries nuance). The kind
  is annotation; only the gating axis is a principled rule.

### 2. LLM-in-the-loop generation — "propose, then dispose"

The deterministic layer **defines the feasible set and enforces the hard
invariants**; the LLM **optimizes within it**. Every LLM output round-trips
through the gates.

| Deterministic (guarantees correctness) | LLM (optimizes quality, inside that envelope) |
|---|---|
| Closure (no concept before its prerequisites) | Which *valid* ordering teaches best |
| Acyclicity / valid topological orders | Grouping into units; pacing; cognitive load |
| Edge / justification / traceability invariants | Motivation, payoffs, and **spiral revisits** |
| "Is this a legal curriculum?" | Proposing decompositions / versionings / the edge *kind* |
| | Writing prose, examples, predicted misconceptions |

The LLM must **not** adjudicate the hard invariants (an LLM "this looks acyclic"
is not a guarantee). It adjudicates the soft optimization and assigns the edge
*kind* + writes the *why* (judgment a fixed algorithm shouldn't make).

**The proposer is an *agentic coder*, not raw completions.** At dev time the
"LLM" is an agent with tools (`llm_client`-based) that reads the repo, edits the
real source files, runs the gates (`npm run check`), runs puppeteer, reads the
errors, and iterates — i.e. it closes its own propose→gate→revise loop and emits
the actual artifact (source files), not JSON for a human to wire. Two rules keep
this honest: (a) the **gate is an independent authority** — a *non-agent* run of
the gates (CI) certifies; the agent's "it's green" is a claim, not proof; (b)
keep agents on **tight, gated tasks** (as the audit workflows do) or they
over-edit. Reproducibility means *re-deriving a valid artifact*, not bit-identical
replay (commit the files; version the prompts + gate definitions).

**Artifacts get their own gate.** Visual/interactive artifacts (typed graphs,
parse explorer, encoders) are verified by puppeteer-in-the-loop + e2e **and hard
structural assertions** — soft visual judgment alone misses "wrong." The structural
check asserts the artifact's *structure matches its stated claims* (the round-2
finding where a diagram claimed "a shared lemma reused — a DAG" but was a tree is
the cautionary example: a check "claims-reuse ⇒ a node has ≥2 out-edges" catches it
deterministically). Fast structural assertions + slower visual/e2e.

### 3. Acyclic substrate + spiral experience

The dependency **substrate stays acyclic** (checkable; the holism does not force
cyclic prerequisites). The **learning experience may spiral** — revisit and deepen
co-constitutive concepts — and that spiral is *designed by the LLM over the
acyclic substrate*, not derived by the algorithm. The mutuality is represented by
(a) `refines` / maturity-versioned concepts and (b) the traversal, never by cyclic
prerequisite edges.

## Consequences
- Every prerequisite edge gains a visible, meaningful annotation; the graph view
  shows relationship *kinds*, not just arrows.
- A principled seam for the LLM: it operates on the soft layer; gates guard the hard
  layer. Quality from the LLM, correctness from the mechanism.
- More authoring per edge (a `kind`), and a taxonomy that must be kept small and
  evidence-driven to avoid bikeshedding.

## Uncertainties & concerns (explicit)
- **"Independent gate" is not yet enforced as such.** Today `npm run check` is run
  by whoever (me/an agent) — there is no separate CI that certifies independently
  of the proposer. Until there is, the propose/dispose invariant rests on
  discipline, not architecture.
- **Agentic generation is nondeterministic, costly, and drifts.** Two audits
  already show LLMs produce confident-but-wrong content; the gates catch *form*,
  not *truth* (a wrong-but-well-formed definition passes). So the LLM-authored
  curriculum still needs human/expert review (ADR-0004 §9 Tier-1) and efficacy
  measurement (Tier-2) — neither is automated.
- **The artifact "structure-matches-claims" gate is aspirational.** We have
  ad-hoc sweeps (missing-chip / tex-error / raw-token counts), not general
  structural assertions; specifying "the diagram shows what it says" in the
  general case is itself hard.
- **Phase 2 is unbuilt.** The propose/dispose generation loop and the
  LLM-designed spiral traversal are specified, not implemented; the strongest test
  of whether this works is authoring a *second* topic, which we have not done.
- **The kind vocabulary is a judgment call** ("primary flavor"); some edges
  defensibly fit two kinds, and the 6-kind set is earned from one topic only — it
  may not transfer.

## Status / phasing
- **Phase 1 (this ADR):** add the `kind` to all prerequisite edges; validate it;
  render it as the edge label. *Implemented.*
- **Phase 2 (direction):** LLM-in-the-loop generation/ordering with the gates as
  guardrails (the propose/dispose loop), and LLM-designed spiral traversal.
  Specced here; not built.
