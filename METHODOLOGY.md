# Constructing Optimal Educational Output for Any Topic: A Concept-Graph-First Methodology

*A methodology and theory paper. It specifies how to construct a learnable
treatment of an arbitrary topic — ordered lessons, a navigable skill map,
assessments, visualizations, and a glossary — by making the topic's **conceptual
dependency structure** an explicit, verifiable artifact and **deriving** the
curriculum from it. It is grounded in a working reference architecture (the
"Concept Ladder" for Gödel's incompleteness theorems) but is written to apply to
any subject. It is a construction theory, not an efficacy study: it argues for
**structural** optimality and is explicit (§9–§11) about what empirical validation
would still be owed.*

---

## Genre and reading contract

> **What "optimal" means here — and what it does not.** Throughout, *optimal
> educational output* is shorthand for **structurally optimal**: a treatment in
> which (1) no concept is used before the concepts it depends on are introduced,
> (2) the introduction order is *derived* from the dependency structure rather
> than guessed, (3) apparent circularities have been resolved by decomposition,
> (4) every term and claim is traceable to a defined concept, and (5) the whole
> thing is gated by automated checks. This is a **necessary, not sufficient**,
> condition for good learning. Prose quality, motivation, affect, and measured
> learning gains are separate axes; this paper does not claim to optimize them and
> §9 states the efficacy validation it would require. Where a strong claim is not
> earned, it is named as owed.
>
> Two clarifications a careful reader will demand. First, **"optimal" here is
> *stipulative*** — it names satisfaction of the structural constraints above, not
> maximization against a measured objective; a reader who prefers *well-structured*
> or *sound* may substitute it throughout without loss. Second, the automated
> checks verify the **form** of the structure (closure, acyclicity, coherence) —
> **not** the **correctness** of any individual prerequisite judgment. A graph can
> be perfectly well-formed and still encode the wrong dependencies; deciding
> whether an edge is *true* is expert work the gates support but cannot replace
> (§9). Throughout, read "verified" as "verified well-formed," never "verified
> correct."

> **Reference architecture.** Claims are grounded in a deployed system: a static
> site that teaches the prerequisites for Gödel's incompleteness theorems as a
> derived skill map over **60 concepts across 17 stages**. Its source of truth is
> a concept graph (`src/content/concepts.ts`); the skill map is computed from it
> (`src/content/derive.ts`, `src/content/graph.ts`); invariants are enforced by a
> build gate (`scripts/validate-content.mjs`). Design decisions are recorded in
> ADR-0002 (the concept layer), ADR-0003 (deriving the map), and ADR-0004 (the
> process). This paper generalizes that architecture; file references are
> illustrative, not requirements.

---

## Abstract

We propose a methodology for constructing the educational treatment of an
arbitrary topic by inverting the usual authoring order. Conventional curricula
encode their dependency structure *implicitly* — once in the prose order, once in
any navigation — so the two drift and "has this concept been introduced yet?" is a
hope rather than a guarantee. We instead make the **conceptual dependency graph**
the single explicit artifact: every idea is a node carrying a definition, an
example, an optional check, and a list of the concepts one must already understand
to understand it. From this graph the curriculum is *derived*: the introduction
order is a topological order of the graph; the navigable skill map is the graph
quotiented by a grouping; assessments target the misconceptions the structure
predicts. The methodology rests on seven principles, the sharpest being that the
dependency relation is **kept acyclic by construction** — an apparent cycle is
treated as a decomposition signal, not a feature, and resolves into one of four
forms (a missing primitive; an inductive definition mistaken for a dependency; a
contrast mislabeled as a dependency; or co-constitutive concepts split into
acyclic *maturity versions*). We give the data model, a topic-agnostic
construction procedure, a theory of how content is attached to the structure, an
assessment theory, and an honest two-tier account of validation. We are careful
about what the automated gates do and do not establish: they verify the structure
is **well-formed**, not that its prerequisite judgments are **correct** or that it
maximizes learning — both are owed empirical claims the methodology is designed to
*support*, not assert.

---

## 1. The problem: most educational material is structurally unsound

The dominant failure of explanatory material is not bad prose; it is **using
ideas before they are earned**. A definition leans on a term defined three
chapters later; an example presumes a distinction not yet drawn; an "intuitive"
ordering follows the author's associative memory rather than the learner's
dependency needs. This is the *curse of knowledge*: an expert cannot easily see
which prerequisites they are silently assuming.

Three structural defects follow:

1. **Implicit, duplicated dependency structure.** The order of prerequisites
   lives in the prose and (separately) in any table of contents or course graph.
   Nothing reconciles them; they drift.
2. **Hand-guessed ordering.** "What should come first" is decided by intuition,
   topic by topic, with no check that an introduction is preceded by everything it
   uses.
3. **Ungrounded, unverifiable claims.** A term's first use is not mechanically
   tied to its definition, so "is every word defined before use?" cannot be
   answered except by re-reading.

A method that fixes these must make the dependency structure **explicit,
singular, and checkable**, and must make the curriculum a *consequence* of that
structure rather than a parallel artifact.

## 2. Thesis and the definition of "optimal output"

**Thesis.** A treatment's conceptual dependency structure is a **necessary
substrate** for learnability. Making that structure explicit, typed, and
mechanically checked removes a definite class of authoring defects (§1) and
creates an auditable basis for sequencing, navigation, assessment, and empirical
evaluation. It does not, by itself, determine that learning occurs — prose,
motivation, pacing, and the *correctness* of the dependency judgments are separate
questions (§9–§11). The method's contribution is to make the substrate a single
explicit artifact and to **derive** ordering, navigation, and assessment from it.

A treatment is **structurally optimal** (the only sense this paper claims) when:

- **Dependency-faithful** — each concept's prerequisites are the concepts one
  genuinely must understand first, and nothing more.
- **Gap-free (no forward references)** — every term or claim a unit uses is
  introduced at that unit or a transitive prerequisite. Enforced, not hoped.
- **Derived-order** — the introduction sequence and the navigation graph are
  computed from the dependency structure, not authored in parallel.
- **Decomposed** — the dependency relation is acyclic; apparent cycles have been
  resolved by clarifying or splitting concepts.
- **Inspectable** — every rendered term, claim, and ordering traces to a concept
  record and its dependencies.
- **Verifiable** — the above are machine-checked on every change.
- **Misconception-targeted** — assessment is by demonstrated capability aimed at
  the confusions the structure predicts, not by content exposure.

These are necessary conditions. They do not guarantee a learner *will* learn well
(motivation, prose, pacing, and measured gains are out of scope; §9). They
guarantee the treatment is free of the structural defects of §1 — but only at the
level of **form**: a gate can confirm an edge set is acyclic and closed, not that
the edges encode the *right* dependencies. "Dependency-faithful" is therefore an
authoring *aspiration the gates support*, not a property they certify (§9 gives
the review and validation that would).

## 3. Design principles

1. **The dependency structure is the artifact.** Model it explicitly and
   separately from prose. The prose is attached *to* the structure, not the other
   way round.
2. **Dependencies are acyclic; a cycle is a decomposition signal.** A
   prerequisite cycle would mean "A cannot be understood *at all* without first
   *fully* understanding B, and vice versa." But learners acquire co-constitutive
   pairs (supply/demand, force/mass/acceleration) by holding **partial, revisable
   versions** of several ideas at once — which means the right model is not a cycle
   but **versioned concepts** at increasing maturity (`force-informal` →
   Newton's-law → `force-formal`), and those *are* acyclic. So an apparent cycle is
   a signal to decompose or version (§5, Step 3), not a feature to embrace. (This
   is a defended methodological *choice*, not a claim that every domain is natively
   acyclic; §11 marks its limits.)
3. **Separate dependency from association — and mention from requirement.** "You
   must understand X first," "X is illuminated by contrast with Y," and "X is named
   here only to motivate, with full treatment later" are different relations. Only
   the first is a directed, acyclic *prerequisite* that gates and orders. Contrasts
   and forward *glosses/foreshadows* never gate. Conflating *lexical mention* with
   *conceptual requirement* both manufactures false cycles and over-constrains
   authors (§4 relation types; §5 Step 3).
4. **Derive, do not author, the order and the map.** The introduction order is a
   topological order of the concept graph; the navigable skill map is the graph
   grouped and condensed. The curriculum is *output*; editing it means editing
   concepts.
5. **No forward references — as a build gate, on *requirement* references only.**
   Every concept a definition names *as a requirement* must be a
   prerequisite-or-equal of it. This makes "defined before use" a property the
   build enforces at term granularity. The gate governs **requirement** references,
   not every mention: a motivational mention is typed as a `gloss`/`foreshadow`
   that points *forward* without gating. The known hole is that the gate sees only
   *typed* references — bare prose can still smuggle a requirement (§10); the
   mitigation is to require requirement-bearing terms to be typed.
6. **Assess demonstrated capability; target predicted misconceptions.** A unit is
   passed by performing a task, not by viewing content. Tasks are built around the
   category errors the dependency structure predicts a learner will make.
7. **Inspectable and verifiable end to end.** Every output traces to evidence in
   the concept graph; invariants are machine-checked; UI claims are confirmed by
   running the artifact, not assumed.

## 4. The objects (data model)

- **Concept** — one idea, as a record:
  - `id`, display term;
  - a one-line **definition** and optional expansion (first-encounter readable);
  - a concrete **example** (drawn from a fixed running cast — §6);
  - an optional **micro-assessment** (a self-check for just this concept);
  - **`prerequisites`** — concept ids one must already understand. *Acyclic.*
  - **`contrasts`/`relates`** — undirected associations; never gate or order.
  - a **group** — the skill-map node this concept belongs to;
  - a **`primitive`** flag for ideas with no prerequisite within the topic.
- **Concept versioning (for co-constitutive domains).** A concept may carry a
  **maturity level** (`informal` / `operational` / `formal`); a later version
  lists earlier versions and the coordinating concept as prerequisites
  (`force-informal` → `newtons-second-law` → `force-formal`). This is how the
  method represents "concepts learned together as successive approximations"
  *without* a cycle. *Status:* a recommended extension; the reference
  implementation uses single-version concepts (its domain decomposes cleanly).
- **Relations have two orthogonal axes** (ADR-0005):
  - **Gating axis** — does it mean "understand first"? Gating **`prerequisite`**
    vs non-gating **`contrasts`** / (per domain need) `soft-prerequisite` /
    `corequisite` / `gloss` / `foreshadow`. Only `prerequisite` participates in
    closure, acyclicity, and derivation.
  - **Semantic-kind axis** — *what kind* of prerequisite, a small controlled
    vocabulary that **annotates** (it does not change gating):
    `{ is-a, part-of, defined-via, operates-on, refines, assumes }`. The kind is
    the always-on edge label (the `why` is the on-hover detail), so every edge is
    legible at a glance and the *shape* of the structure shows. `refines` is where
    maturity-versioning lives. *Status:* reference impl ships `prerequisite` +
    `contrasts` + the kind vocabulary; the other gating types are added per need.
  - **Discipline:** keep the kind vocabulary small and earned from real edges;
    allow a "primary flavor" (the `why` carries nuance). Only the gating axis is a
    principled rule — the kind is annotation.
- **Concept graph** — all concepts and their `prerequisites`. The single source of
  truth for **dependency**; the other relation types annotate it without changing
  the derived order.
- **Skill map** — the derived, acyclic, navigable graph of concept *groups*, plus
  a hand-authored **overlay**: assessments, layout positions, learning goals, and
  any deliberately pedagogical (non-dependency) sequencing edges.
- **Typed references** — inside definitions and prose, a concept is named by a
  typed reference (e.g. a chip) so closure (§5, Step 2) is checkable and the
  reference can render as a drill-down to the referenced concept.

*Reference architecture:* `Concept`/`ConceptGraph` types; concepts authored in
`concepts.ts`; the skill-map overlay (achievement nodes, positions, goals) in
`graph.ts`; the derivation in `derive.ts`.

## 5. The construction procedure (topic-agnostic)

### Step 1 — Enumerate concepts and *local* prerequisites, not order

For each idea the topic uses, write its record and list only the **concepts one
must already understand to understand this one**. Do not impose a global sequence;
list local dependencies. Mark genuine **primitives** (no in-topic prerequisite).

### Step 2 — Decompose against the gates

Encode the invariants as a build gate so the model cannot lie:

- **Definition closure.** Every concept a definition *names* must be a transitive
  prerequisite-or-equal — never a downstream concept. This catches "uses a word it
  hasn't earned" at term granularity.
- **Acyclicity.** `prerequisites` must contain no cycle.
- **Group coherence.** The grouping into skill-map nodes, lifted to the group
  level, must also be acyclic (a cross-group cycle means a concept is mis-grouped).

Authoring *is* the act of satisfying these gates. Every rejection is a content
decision surfaced: a missing primitive, a sloppy definition, a real cycle.

### Step 3 — Resolve apparent cycles by decomposition

When the acyclicity gate fires, the cycle resolves into one of three forms:

1. **Sloppy / mutual definitions → name a primitive.** *Reference case:* "a
   *symbol* is a mark from the *alphabet*" while "an *alphabet* is a set of
   *symbols*." Fixed by making `symbol` primitive ("an atomic mark") and
   `alphabet` depend on it.
2. **An inductive definition mistaken for a dependency cycle.** A recursive
   definition ("a *formula* can be `∀x P` where P is a formula") is *well-founded*
   — it bottoms out at a base case (atomic formulas). The recursion is generative,
   not a prerequisite: you grasp the concept from the base case plus the building
   rules, with the recursive occurrence as a schematic placeholder. *Reference
   case:* `formula` depends on `atomic-formula`; the construct `quantifier` then
   depends on `formula`. Acyclic, and more accurate.
3. **A contrast mislabeled as a dependency.** Pairs understood *against* each
   other (in the reference topic: provability `⊢` vs truth `⊨`; object theory vs
   metatheory) are *associations*, not prerequisites. Move them to `contrasts`.
4. **Co-constitutive concepts → split by maturity (versioning).** When concepts
   genuinely develop together (supply/demand; force/mass/acceleration; in
   programming, variable/assignment/state often need a runnable example before the
   formal distinction stabilizes), the cycle dissolves into an acyclic chain of
   *versions*: an informal form of each, a coordinating concept that depends on the
   informal forms, then refined formal forms that depend on the coordinator. This
   is the honest model of "successive approximations," and it preserves acyclicity
   rather than abandoning it.

A strongly-connected-component (SCC) linter over `prerequisites` reports cycles so
the author can apply (1)–(4). Because the relation is acyclic, every component is a
singleton — the SCC pass is a *guard*, not a derivation step.

**Acyclic substrate, spiral experience (ADR-0005).** Keeping the prerequisite
relation acyclic is not a claim that understanding is non-holistic — concepts
co-constitute, and real learning *spirals* (revisit and deepen). The resolution is
to separate two things: the **dependency substrate stays acyclic** (so it is
mechanically checkable), and the **mutuality is represented elsewhere** — in
`refines` / maturity-versioned concepts and in the *traversal* (a deliberate
revisit-and-deepen order), never as cyclic prerequisite edges. Designing that
spiral is a pedagogy decision (Step 6), not a graph property.

### Step 4 — Group, derive the map, and audit it

- **Skill-map nodes** = concept groups (the grouping is the abstraction function
  from concepts to navigable units).
- **Skill-map edges** = `prerequisites` *lifted* to the group level (group A → B
  iff some concept in B depends on some concept in A, cross-group only),
  de-duplicated and **transitively reduced** for a minimal, clean graph.
- **Audit against any prior hand-authored map** by comparing *reachability*, not
  raw edges (derivation legitimately adds transitive shortcuts). Two actionable
  outputs:
  - *Authored-but-unexplained edges* → either a missing concept dependency (add
    it) or a genuinely pedagogical edge (keep it, explicitly, in the overlay).
  - *Derived-but-absent edges* → a structural fact the hand map missed (adopt it).
  - A coverage percentage is a health metric for the model.
  *Reference outcome:* the concept graph explains ~79% of a hand-authored map's
  edges; the audit surfaced a missing prerequisite (proofs are needed before
  "derive 2+2=4") and a wrong root (the structures unit actually depends on
  syntactic atoms). Both were adopted. A separate goal-closure pass found 45 of
  60 concepts on the critical path to the terminal goal (the rest are deliberate
  enrichment).

### Step 5 — Attach content to the structure (§6)

Write each concept's definition (closure-checked), example (fixed running cast),
optional visualization (typed — §6), and the "common confusions" that name the
misconceptions the dependency structure predicts.

### Step 6 — Generate ordering and lessons from the graph

The recommended linear path is a **topological order** of the concept graph.
(Production builds *hard-fail* on a cycle, per Step 2, so a published order is
always over an acyclic graph; the traversal is written cycle-tolerant — a DFS
post-order that will not silently drop nodes — purely as a defensive belt for
debug/inspection views, never as license to ship a cyclic graph.)

A topological order is **necessary but not sufficient** — many valid orders exist
and some are pedagogically poor (overloaded, too abstract, unmotivated). Choosing
among them is a second optimization *after* prerequisite satisfaction. Sensible
secondary criteria (heuristics, not laws):

1. minimize the count of *new* symbols/terms introduced per unit;
2. alternate abstraction with worked examples (don't stack definitions);
3. prefer high-fan-out prerequisites earlier (they unblock the most);
4. cap chain length without an interleaved check or payoff;
5. place motivational payoffs at bounded intervals.

A "lesson" is the content attached to a group, presented in the chosen order. The
map shows the learner the choices a goal allows.

**This is where the LLM belongs — "propose, then dispose" (ADR-0005).** A
mechanical derivation guarantees *correctness* (a valid order), not *optimality*;
choosing among valid orders, grouping, pacing, the spiral revisits, and the prose
is judgment an algorithm cannot do well. So the division of labor is: the
**deterministic layer defines the feasible set and enforces the hard invariants**
(closure, acyclicity, traceability — the things you want *guaranteed*, not
LLM-judged); the **LLM optimizes within that envelope** (which valid ordering,
grouping, motivation, spiral, decompositions, the edge *kind*, the prose). Every
LLM output round-trips through the gates, so you get LLM-quality pedagogy with
mechanically-guaranteed correctness. The LLM must never adjudicate the hard
invariants ("looks acyclic" is not a guarantee) — only the soft optimization.

### Step 7 — Verify and iterate

Run the gate on every change (closure + acyclicity + group coherence + assessment
integrity). For anything rendered, confirm by **running the artifact** — not by
assuming. The **artifact gate** has two halves (ADR-0005): *hard structural
assertions* (the diagram's structure matches its stated claims — e.g. "claims a
reused lemma ⇒ some node has ≥2 out-edges"; no unresolved references; no raw
tokens) and a *slower visual/e2e pass* (puppeteer) for what structure can't catch.
Soft visual judgment alone misses "wrong"; pair it with hard checks. When the
proposer is an agentic coder (ADR-0005), it runs these in its own loop — but an
**independent** run certifies. Treat a failed gate as a content discovery.

## 6. Content-attachment theory

Structure is necessary but inert; content makes it teachable. Disciplines:

- **First-encounter-readable definitions.** Precise but legible on first contact;
  depth is added by the expansion and by drilling into referenced concepts, not by
  front-loading rigor. **Show then tell** (concrete before abstract).
- **PEA, distinguished by domain (ADR-0006).** *Pictures* (a visual of the real
  thing) and *Examples* (an instance from the concept's own domain) are
  **in-domain** — faithful, and they can *grow*. *Analogies* (a mapping to a
  familiar foreign domain) are **out-of-domain** — lossy and *local*.
- **One in-domain through-line, derived backward.** Prefer a single running
  example + its picture/artifact that **accretes sophistication** across the arc,
  derived backward from the *terminal* artifact (the one embodying the end goal) —
  the example track is a second backward derivation, aligned to the concept track
  by closure (the artifact at stage N uses only concepts available by N).
  **Honest fallback:** a *small consistent cast* where one object cannot span a
  stretch (the reference cast: `PA`, `ℕ`, `2+2=4`, `2+2=5`, a malformed foil,
  `G_PA`) — fix a small cast rather than fake a through-line.
- **Analogies are local, plural, bounded — fitted forward, not derived backward.**
  Choose the best analogy *per concept*, mark its **breakdown point**, retire it
  there; never stretch one across the arc (chess illuminates "formal system" and
  is structurally silent on truth and self-reference). The breakdown point is
  information — usually a "Therefore & But" handoff to the next concept.
- **Typed visualizations that keep distinctions apart.** A diagram's node/edge
  *types* carry the conceptual distinction (one relation can never be mistaken for
  another), with a legend and text fallback — the anti-"category-error" mechanism.
- **Ladder-of-abstraction recipe for *dynamical* concepts (ADR-0006 §6, after
  B. Victor).** Where a concept *has a parameter*, build its artifact by **control →
  abstract-over → step-down**: show a concrete case, show it generalized over the
  parameter (all values at once), then tie a point on the abstraction back to a
  concrete case. The insight is in the *transitions*. This is valuable even as a
  **static** figure; full interactivity is a *scoped enhancement* reserved for the
  few concepts that are parameterized systems with emergent behaviour (not the
  definitional majority), and is deliberately **not** a v1 requirement — it is
  expensive bespoke craft (soft-optimization layer, §8), built selectively and
  gated, never a per-concept floor. (Note: this "ladder of abstraction" — levels of
  *one* system — is orthogonal to the prerequisite DAG — relations *between*
  concepts; do not conflate.)
- **Confusions as predicted misconceptions.** The dependency structure predicts
  where learners conflate concepts (the contrast pairs, the category errors); each
  unit states those misconceptions and their corrections explicitly.

Unavoidable early mentions (a concept that must be named before its full
treatment) use a **spiral gloss** — a one-line working definition up front,
deepened at the concept's own node — and the orientation/overview unit is exempt
from closure by design.

## 7. Assessment theory

- **Front-half readiness, back-half capability.** Two assessments bracket a unit.
  A **prerequisite pretest** on *entry* (ADR-0007) checks the learner understands
  the unit's prerequisites before engaging — and it is **derived**: a page's
  pretest is the assembled per-concept checks (`microQuiz`) of its *out-of-page
  prerequisite* concepts, so a concept's check is authored once and reused in every
  dependent page. A page with no out-of-page prerequisites (the first page) gets
  none. It is **soft-diagnostic** (a miss links to "review [concept]" — the graph
  is the remediation map — and never blocks navigation). The end-of-unit check
  tests the unit's *own* content. (Caveat: a one-item check is a weak probe; it is
  a diagnostic nudge, not proof of mastery.)
- **Demonstrated capability, not exposure.** A unit is earned by performing a
  task. Use **deterministic checks** wherever the answer is exact (classification,
  fill-in, matching), and reserve an **LLM judge** for genuinely open-ended
  explanation.
- **The judge is necessary but not sufficient, and must be validated before it
  gates anything.** Treat it as an instrument: measure its false-pass and
  false-fail rates against a frozen, hand-graded case set before allowing it to
  award anything; keep a deterministic component the judge cannot override; treat
  learner input as untrusted.
- **Items map to concepts.** Each assessment item declares the concept(s) it
  tests and the misconception(s) it can detect (a lightweight item→concept matrix).
  This is what makes a result *diagnostic* rather than a single pass/fail scalar,
  and what lets remediation route precisely. (A full psychometric treatment —
  per-item difficulty calibration, false-positive/negative estimation — is a
  deliberate non-goal here; it is owed if assessments are used for stakes, §9.)
- **Fatal misconceptions override — above a confidence threshold.** Certain
  category errors (in the reference topic: "true just means provable," "malformed ⇒
  false," "the Gödel sentence is the liar paradox") fail a task regardless of other
  credit — but only when detected with confidence above a set bar, so a lucky
  phrasing or a noisy judge call does not hard-fail a competent learner. Below the
  bar, surface a follow-up rather than auto-failing.
- **Remediation routing.** A failed attempt maps detected misconceptions back to
  the responsible prerequisite concepts ("you are treating two relations as one →
  revisit these nodes"). The dependency graph *is* the remediation map.

## 8. Generation contract and inspectability

Every rendered artifact must be **traceable to the concept graph**: a term renders
as a reference to its concept; an ordering is justified by the topological order; a
skill-map edge is either derived or an explicitly labeled overlay edge. Nothing is
asserted that cannot be pointed back to a concept record. This makes the treatment
auditable by a third party and debuggable by its authors: a wrong claim is a wrong
concept, locatable, not a diffuse prose problem.

## 9. Validation (in two tiers, and what is owed)

The gates verify that a treatment is **well-formed** — closed, acyclic, coherent,
traceable — on every change. They do **not** verify that the prerequisite edges are
**correct**, nor that learners learn better. Both are owed, and at different tiers.

**Tier 1 — structural validity (validate the graph, not just its form).** Before
any learning study, the central artifact — the edge set — is author opinion in
typed form until reviewed. The cheap, high-value checks:

- **Independent expert edge review** — a domain expert rates each prerequisite as
  correct / wrong / arguable; report disagreement.
- **Independent re-authoring** — a second author builds the graph blind; compare
  edges and grouping. Convergence is evidence; divergence localizes contested
  structure.
- **Granularity review** — experts flag over-/under-decomposition.
- **Learner-error comparison** — do the misconceptions the structure *predicts*
  match the errors learners actually make?
- **Edge ablation** — does removing/adding a contested edge change anything a
  learner sees?

*On the reference architecture:* the "~79% of a hand-authored map explained" figure
is an **existence proof that the graph recovers most of one expert's structure —
nothing more.** It is consistent with shared author bias, retrofitting, or the
remaining 23% being pedagogically essential; the same author wrote both. It is not
independent validation, and Tier 1 is exactly what would make it one.

**Tier 2 — learning efficacy (empirical).** Only after Tier 1:

- **Endpoints.** Pre/post **learning gain**, **misconception elimination**,
  **transfer** (unseen items), **retention** (delayed re-test) — not one scalar.
- **Baselines.** The same content authored conventionally; a topic-matched
  resource; an ablation that removes the *derived ordering* (random / expert-guessed)
  to isolate the structure's contribution.
- **Controls.** Hold prose constant across conditions where possible, so the
  variable under test is the *structure*, not the writing.

The claim this paper supports is: *the construction is principled, well-formed,
and auditable*. The claims it does **not** make are *that the edges are correct*
(Tier 1) and *that it maximizes learning* (Tier 2) — both owed, and the
architecture is built to make both measurable.

## 10. Threats to validity and failure modes

| Threat | Symptom | Mitigation |
|---|---|---|
| **Form mistaken for truth** | A well-formed graph that encodes the *wrong* dependencies | Tier-1 structural validation (§9): independent expert edge review + re-authoring; the gates can't catch this |
| Wrong prerequisite edge | A unit unlocks before its real dependency | The §5 Step-4 audit; Tier-1 review; small high-confidence edits |
| Over-decomposition (atomization) | Dozens of trivial nodes; learner fatigue | Group coherence; "is this a distinct idea or a sentence?" review |
| Co-constitutive concepts forced into order | An honest cycle papered over, or a false "A before B" | Maturity versioning (§5 Step 3.4), not a fake prerequisite |
| Grouping that fights dependencies | Cross-group cycle | Group-coherence gate fails the build |
| Closure gives false security | "No forward refs" only checks *typed* references, not bare prose | Require requirement-bearing terms to be typed; lint prose for known terms |
| Mention treated as requirement | Authors over-constrained; spurious cycles | Type motivational mentions as `gloss`/`foreshadow`, which never gate (§4) |
| One-size order ignores the learner | Valid order that is inefficient for a given learner | Treat the graph as a substrate for adaptive sequencing (§11); secondary ordering criteria (§5 Step 6) |
| Judge false pass/fail | Confident nonsense earns a badge / correct-but-terse rejected | Validate judge on a frozen set first; deterministic component; confidence-thresholded fatal override; retry + "show why" |
| Recency over-indexing in authoring | The model fixates on whatever was salient when authored | Pressure-test framings against standard sources, not the last conversation |
| Structural ≠ pedagogical optimality | A well-formed graph that is still dull or unmotivated | Treat §6 content disciplines and §9 efficacy study as first-class, not optional |

## 11. What transfers to a new topic (and limits)

**Transfers:** everything except the concept records — the `Concept` shape, the
gates (closure, acyclicity, coherence), the SCC linter, the derivation
(group-lift + transitive reduction), the audit, the renderers, and this process.
**Standing up a new subject = author its concepts and their prerequisites; the
ordering, the navigable map, and the checks come for free.** The reference
instance (Gödel: 60 concepts, 17 derived stages) is one fill-in of this template.

**Scope — not literally "any topic."** The method fits topics representable as a
finite set of **teachable knowledge components plus typed relations among them** —
mathematics, formal logic, programming, grammar, much of science, technical
certification. It fits *less* naturally where productive confusion precedes formal
clarity or where there is no stable prerequisite structure: interpretive
humanities, clinical/ethical judgment, creative writing, psychomotor skill,
language immersion. It can still help there, but only after leaning on the
non-`prerequisite` relation types (§4) more than the dependency backbone. Read the
title's "any topic" as "any topic with a representable knowledge-component
structure."

**Limits (honesty):**
- **Form is not truth.** The gates certify the graph is well-formed; they cannot
  certify an edge is *correct*. Wrong edges teach a false structure — Tier-1
  validation (§9), not the gates, is the safeguard.
- **One graph is not one learner.** The graph encodes what the *curriculum* takes
  to depend on what; real learners differ in prior knowledge, misconceptions, and
  goals, so there is no single optimal order for everyone. The concept graph is
  best understood as the **substrate for adaptive sequencing** (graph + a learner
  model + a policy), not as a fixed path. Per-learner modeling is out of scope here.
- A detected cycle is a signal to **decompose, version, or reclassify**, never to
  embrace; deciding *how* is human judgment the tool only prompts.
- Some structure is genuinely pedagogical (motivation, examples, narrative) and
  not a dependency; it lives in the overlay and the non-gating relations by design.
- "Optimal" is **stipulative and structural**, not a maximization claim: it removes
  a definite class of defects (§1) and makes correctness and efficacy *measurable*
  (§9); it does not certify the result is the best possible way to learn the topic.

**Open questions / what is unsettled (the newest, least-tested parts):**
- **The generation loop is unbuilt.** The agentic-coder propose→gate→revise loop
  (ADR-0005) and the LLM-designed "Therefore & But" / spiral ordering are
  *specified, not implemented*. The honest test is authoring a *second* topic from
  scratch — not yet done; the reference instance was authored middle-out.
- **No single object is guaranteed to span a topic.** The "one evolving artifact
  derived backward" (ADR-0006) is a target with a mandatory fallback to a small
  cast; when one object stops working is a judgment call.
- **Analogies are unmodeled and unvalidated.** Their scope and breakpoints are
  empirical (need transfer testing — Tier-2, which we don't do); the reference
  instance models none.
- **No independent gate yet.** The propose/dispose split assumes a *non-agent* run
  certifies the agent's work; today that separation is discipline, not CI.
- **The artifact "structure-matches-claims" gate is aspirational** — we have
  ad-hoc sweeps, not general structural assertions.
- **The kind vocabulary and the resolution moves are earned from one topic** and
  may not transfer.

**Positioning.** This is not a new claim about the structure of learning, and it
overlaps deliberately with concept maps, learning-component decompositions, and
graph-based adaptive sequencing. The differentiator is narrow and engineering:
**the concept graph is a typed, build-checked *source of truth* from which the
ordering, navigation, glossary, and assessment hooks are generated** — a
curriculum *compiler* with enforced invariants, rather than a hand-drawn map kept
in sync by discipline.
