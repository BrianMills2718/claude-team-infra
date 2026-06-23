# ADR-0006 — Examples and explanatory devices: in-domain spine + out-of-domain analogies (PEA), two-track backward derivation

- **Status:** Accepted (stance / target). **Not implemented** — the reference
  instance currently has a fixed *cast*, not a single evolving artifact, and
  models no analogies.
- **Date:** 2026-06-21
- **Builds on:** ADR-0004 (methodology), ADR-0005 (LLM-in-the-loop)
- **Owner:** Brian
- **Source:** design discussion + N. Case, *"How To Explain Things Real Good"*
  (PEA = Pictures, Examples, Analogies; "show then tell"; "Therefore & But") +
  B. Victor, *"Up and Down the Ladder of Abstraction"* (interactive artifacts at
  every level; control a parameter → abstract over it → step back down).

## Context

Two questions sharpened the example/artifact side of the method: *what exactly are
Pictures vs Examples vs Analogies*, and *can a single example/artifact span a whole
topic*? The answer hinges on one distinction and predicts an asymmetry.

## Decisions

### 1. PEA, distinguished by **domain** (the line that matters)
- **Picture** — a visual of the *real thing itself* (the parse tree of the actual
  sentence; a square being rotated).
- **Example** — a concrete *instance from the concept's own domain* (`2+2=4` is an
  example of a provable sentence).
- **Analogy** — a mapping to a *different, familiar domain* (chess ↔ formal system).

Pictures and examples are **in-domain** (faithful — they *are* the thing or a real
case of it). Analogies are **out-of-domain** (lossy — a borrowed mapping). That
single difference governs how each can be reused and scoped.

### 2. One in-domain **through-line**, derived backward
The running *example* and its *picture/artifact* are the spine: a single object
that **accretes sophistication** across the arc (for Gödel, a sentence that goes
parse-tree → truth-in-ℕ → proof → code-number → self-reference). Derive it
**backward from the terminal artifact** (the one that embodies the end goal), the
same way the concept graph is derived backward from the goal concept. **Honest
fallback:** where one object cannot honestly span a stretch, use a *small,
consistent cast* — do not contrive a through-line. (`RUNNING_EXAMPLE.md` already
records that a single sentence cannot carry all 17 Gödel stages.)

### 3. Analogies are **local, plural, bounded — fitted forward, never derived backward**
Because an analogy maps to a foreign domain, it is faithful only on the features
that map and **silent or misleading elsewhere**; it has a *domain of validity*.
So: choose the best analogy *per concept*, mark its **breakdown point**, and
*retire* it there — never stretch one analogy across the arc (chess is brilliant
for "formal system = symbols + rules + start position" and structurally incapable
of reaching truth or the Gödel sentence; forcing it would be *wrong*, not merely
sub-optimal). **The breakdown point is information** — it is usually a "Therefore &
But" handoff to the next concept ("chess models a formal system, *but* chess has no
truth, *therefore* we need semantics"). Attach an analogy to its concept *lightly*
("maps X↔Y; breaks at Z") — no heavy taxonomy.

### 4. Two-track backward derivation, aligned by closure
- **Concept track:** goal concept → primitives (the concept graph).
- **Artifact/example track:** terminal artifact → its simplest seed.
- **Alignment:** the artifact-at-stage-N may use only concepts available by stage
  N (the *same closure gate* as prose), and should *exercise* that stage's new
  concept. This mechanically ties the two tracks.

### 5. Order is "show then tell" + "Therefore & But"
Concrete (picture/example) before abstract (definition); the sequence is a
problem→solution story, **not** a topological listicle (which is an "and-then"
list). This is the soft-optimization the LLM owns (ADR-0005), over the acyclic
substrate.

### 6. The ladder-of-abstraction *technique* is adopted; Victor-grade *interactivity* is not a v1 requirement
Victor's essay is the high-water mark for the artifact layer: every concept is a
live artifact the reader manipulates, moving between levels of abstraction —
**control a parameter** (a slider over the system's independent variable),
**abstract over it** (a representation that shows the system for *all* values of
that variable at once), and **step back down** (point at the abstraction to see a
concrete instance). The insight lives in the *transitions* between levels, not in
any single view. We separate the **technique** from the **production value**:

- **Adopt the technique as a recipe, even statically.** For a concept that *has* a
  parameter, the move "show one concrete case → show the case generalized over the
  parameter → tie a point on the abstraction back to a concrete case" is valuable
  even rendered as a *static* figure (a labelled before/after, a small-multiples
  strip, a trajectory with one point highlighted). Interactivity sharpens it; it is
  not required to get most of the benefit. This is the recommended pattern for
  *dynamical* concepts and folds into Decision 5's "show then tell."
- **Interactivity is a scoped enhancement, not a universal mandate.** A
  fully-interactive, multi-representation, manipulable artifact is reserved for the
  handful of concepts that *are parameterized systems with emergent behaviour* —
  for the reference topic, roughly: Gödel coding (slide the exponents → watch the
  number; *already interactive*), the parse/parse-failure explorer (*already
  interactive*), proof-as-reachability, satisfaction (evaluate a formula in a
  structure), and the diagonalization/self-reference loop. That is ~4–6 of 60
  concepts.
- **Most concepts are definitional, and a static picture is the *correct* tool,
  not a shortfall.** "A symbol is an atomic mark," "an axiom is a starting
  assumption" have no parameter to slide and no emergent behaviour to explore.
  Forcing interactivity there is wasted craft. Coverage of the ladder technique is
  therefore *expected to be partial*, by design — `log`/note which concepts get it
  and why, so partial coverage reads as a decision, not an omission.
- **Do not conflate Victor's "ladder of abstraction" with this project's "skill
  ladder."** Victor's ladder = levels of aggregation *of one system* (concrete ↔
  abstract). This project's ladder/DAG = prerequisite dependencies *between distinct
  concepts*. Orthogonal axes; ADR-0001 already pivoted the word "ladder" away from a
  linear track. Keep the terms distinct to avoid self-confusion.
- **Cost discipline (the reason interactivity is scoped).** The deterministic
  substrate (concept graph, ordering, gates) stays cheap and *derived*; a
  Victor-grade interactive is expensive, *bespoke* craft that cannot be fully
  derived — it sits in the soft-optimization / agentic-builder layer (ADR-0005),
  built selectively and verified by the artifact gate (structural assertions +
  puppeteer/e2e). Making it a per-concept floor would balloon v1 with no
  corresponding correctness gain. Build the few exemplary interactives *after* the
  structure is validated; let the propose→gate→revise loop (ADR-0005 Ph.2) propose
  them where a concept is dynamical.

## Consequences
- A single evolving artifact is a stronger spine than a scattered cast; learners
  re-anchor on one growing picture.
- Analogies become *safe* (scoped + retired) instead of over-stretched.
- The artifact track gains a checkable invariant (closure against available
  concepts).
- The ladder-of-abstraction technique gives a concrete *recipe* for the
  picture/artifact of a dynamical concept (control → abstract-over → step-down),
  usable statically; interactivity becomes a deliberate, scoped upgrade rather than
  an unbounded ambition that could sink v1.

## Uncertainties & concerns (explicit)
- **Spanning artifact is an aspiration, not a guarantee.** Many topics have no
  single object that honestly spans the arc; the fallback-to-a-cast is mandatory,
  and deciding *when* one object stops working is a judgment call, not a rule.
- **Scope and breakpoints of analogies are empirical.** Which analogy lands and
  where it breaks is discovered by *testing for transfer* (ADR-0004 §9 Tier-2) —
  which we do **not** currently do. So this whole layer is **unvalidated**.
- **None of this is implemented.** The reference instance has a fixed *cast* and
  *per-stage* visualizations, not a single evolving artifact; analogies are not
  modeled at all; the artifact-track closure check does not exist. This ADR is a
  target, and may be wrong in ways only authoring a second topic will reveal.
- **Over-engineering risk.** A PEA/analogy taxonomy can sprawl; keep it minimal
  (attach an analogy + its breakpoint to a concept; resist a relation zoo).
- **"Backward from the terminal artifact" assumes you can name it up front.** For
  some topics the terminal artifact is itself unclear until you've explored — so
  in practice this is iterative (design a *candidate* terminal artifact, derive
  back, revise when the back-derivation exposes that it was wrong).
- **"~4–6 dynamical concepts" is an estimate, not a measured count.** Which
  concepts genuinely reward interactivity (vs a static figure) is a judgment we
  have not validated by transfer-testing; the list in Decision 6 is a starting
  hypothesis, and the boundary between "dynamical, give it a slider" and
  "definitional, give it a picture" will move as we author.
- **The ladder technique tempts scope creep — that is the very risk it is scoped
  against.** The discipline is "static recipe by default, interactivity only where
  the concept is a parameterized system." If we find ourselves building interactive
  widgets for definitional concepts, that is the failure mode to catch, not a sign
  the bar should rise.
- **Tension with the exposition frame (named, accepted).** Victor's method is for
  *exploring a system you don't yet understand*; Gödel is *settled*. We resolve this
  by using exploration **as pedagogy** (let the learner manipulate to build
  intuition before being told — "show then tell"), not as research. The unresolved
  edge: a settled-topic artifact can be *too* leading (the parameter range is
  curated), so it demonstrates rather than lets the learner genuinely discover —
  whether curated exploration delivers the same intuition as open exploration is
  unmeasured (a Tier-2 question, §9 / ADR-0004).
