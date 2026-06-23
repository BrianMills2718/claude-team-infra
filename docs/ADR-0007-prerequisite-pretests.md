# ADR-0007 — Prerequisite pretests (readiness diagnostics), assembled from the graph

- **Status:** Accepted. Phase 1 (mechanism + soft-diagnostic UI) being implemented;
  per-concept check coverage filled incrementally.
- **Date:** 2026-06-21
- **Builds on:** ADR-0002 (concept layer), ADR-0003 (derived map), ADR-0004 (assessment theory)
- **Owner:** Brian

## Context

A learner should be able to check, *on entering a page*, that they actually
understand that page's **prerequisites** before engaging with its new material —
a *readiness* diagnostic, distinct from the existing end-of-page "Check yourself"
quiz (which tests the page's *own* content). The concept graph already encodes
each page's prerequisites, so *which* concepts to test is derivable.

## Decision

1. **Per-concept checks, assembled into per-page pretests.** A concept carries a
   `microQuiz` (the field already exists). A page's pretest is **generated**: the
   assembled `microQuiz`es of the page's **out-of-page prerequisite concepts**
   (concepts its concepts depend on that are introduced on an *earlier* page).
   Author a concept's check **once**; it appears in every dependent page's pretest
   automatically. Single source of truth — not a per-page hand-authored artifact
   (which would be the duplicated-structure failure of METHODOLOGY §1).
2. **Which prerequisites:** the *direct* out-of-page prerequisites (not the full
   transitive closure — that would be too long). Within-page prerequisites are
   taught on the page, so they are not pre-tested. A page with **no** out-of-page
   prerequisites (the orientation page, the root atoms) gets **no pretest** — this
   is the "except the first page" case, derived rather than special-cased.
3. **Soft-diagnostic gating.** The pretest is shown on entry; a missed question
   surfaces a "review [concept]" link to the page that introduces it (the concept
   graph *is* the remediation map). It **never blocks navigation** — consistent
   with the project's existing soft-gating.
4. **Readiness banner even without questions.** Because the prerequisite *set* is
   derived for every page, a page always shows "before this, you should understand:
   [linked prerequisite concepts]"; where those concepts have a `microQuiz`, an
   optional inline self-check is offered. So thin pages still give the readiness
   signal; checks fill in over time.
5. **Front-half / back-half split:** pretest = prerequisite readiness (entry);
   "Check yourself" = this page's content (exit). Both reuse the Quiz engine.
6. **Staged build:** mechanism + UI first (works immediately with existing checks);
   then author `microQuiz`es for the **highest-fan-out** prerequisite concepts
   first (a check on `proof` or `formula` pays off across many pages) — exactly
   the content an agentic-coder loop (ADR-0005) would later generate.

## Consequences
- Makes the prerequisite structure **actionable** (readiness, not just
  navigation), strengthening the concept-graph-as-source-of-truth thesis.
- Reuses the existing `microQuiz` mechanism and the Quiz engine; remediation
  routing falls out of the graph for free.
- Pretest content is **derived**; editing prerequisites recomposes pretests.

## Uncertainties & concerns (explicit)
- **Coverage starts thin.** Most concepts have no `microQuiz` today, so most
  pretests begin as the readiness *banner* only; meaningful question coverage is
  real authoring work (most prerequisite concepts need a check).
- **A one-item check is a weak probe of "understanding."** Passing it ≠
  understanding (the same form-vs-truth caveat as the gates). It's a diagnostic
  nudge, not proof of mastery.
- **Soft gating means it can be ignored** — by design, but it limits the effect;
  whether learners engage is empirical (unmeasured — Tier-2 owed).
- **Direct vs transitive prerequisites** is a judgment call; direct keeps it short
  but may miss a deep dependency the learner is actually missing.
- **Pretest fatigue:** every page opening with a quiz can annoy. Mitigations:
  cap the number of questions, make it collapsible/skippable, and consider
  suppressing it once the prerequisite pages are already passed.
- **No efficacy evidence** that pretests improve learning here (Tier-2).
