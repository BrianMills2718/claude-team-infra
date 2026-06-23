# Overnight build — make the reference architecture fully embody the methodology

> **STATUS (2026-06-21):**
> - ✅ **Phase 3 (correctness audit)** — multi-agent; 16 fixes; `docs/EDGE_REVIEW.md`.
> - ✅ **Phase 2 (goal-closure lens)** — core/enrichment in `derive.ts` + report +
>   concept-graph badge/toggle (45/60 core).
> - ✅ **Phase 4 (maintenance)** — `deploy.yml` bumped off the Node-20 runtime.
> - ⏸ **Phase 1 (typed relations + versioning)** — **deferred by design.** The
>   methodology already states these are "added per domain need," and the Gödel
>   instance has no current use for `soft-prerequisite`/`corequisite`/versioning.
>   The one piece with real value — a `foreshadow` forward-link (e.g.
>   `formation-rule` → `parse-tree`, which closure currently forbids as a chip) —
>   is teed up as a focused next task rather than built speculatively.
>
> - ✅ **Round-2 audit** (lessons/quizzes/glossary/notation/cross-layer/backend/code)
>   — 15 fixes; `docs/CONTENT_REVIEW.md`.
> - ✅ **ADR-0005 Phase 1 — typed prerequisite edges** (semantic-kind annotation:
>   `is-a` / `part-of` / `defined-via` / `operates-on` / `refines` / `assumes`,
>   rendered as the edge label + colour). *Done.*
> - 🔜 **ADR-0007 — prerequisite pretests** (soft-diagnostic readiness check per
>   page, assembled from prerequisite concepts' `microQuiz`es + a derived
>   "before this, understand: …" banner). *Implementing: mechanism + UI now; author
>   high-fan-out concept checks incrementally.*
> - 📐 **Specced, not built (ADR-0005 Ph.2 + ADR-0006):** the agentic-coder
>   propose→gate→revise loop, the artifact gate (structural assertions + puppeteer),
>   the in-domain evolving artifact + out-of-domain analogies, "Therefore & But"
>   ordering, and the **ladder-of-abstraction recipe** (ADR-0006 §6: control →
>   abstract-over → step-down for *dynamical* concepts; usable statically). The
>   strongest test is **authoring a second topic from scratch.**
> - 🚫 **Decided NOT a v1 requirement (ADR-0006 §6):** Victor-grade *interactivity*
>   per concept. It is a scoped enhancement for the ~4–6 parameterized/dynamical
>   concepts (we already ship 2: the coding encoder + the parse explorer), built
>   after the structure is validated — not a per-concept floor. The *technique* is
>   adopted now (even statically); the *production value* is deferred to avoid
>   ballooning v1.
>
> **Known content concerns (surfaced in review, not yet fixed):**
> - **`object-theory` naming collision** — readers expect a link to `object` (a
>   number), but `object-theory` means "object-*level* theory" (vs metatheory), an
>   unrelated notion. Rename (`object-level-theory`) or gloss. Both audits missed it.
> - **`syntactic` introduced at stage 8** — defensible (where ⊢-vs-⊨ is drawn) but
>   the *idea* "proof = symbol manipulation" lives in `proof` (stage 3); worth a
>   look at whether the named concept should come earlier.
>
> Prior overnight build (17 stages) and SPRINT (skill DAG + LLM judge) complete.

**Mission.** The methodology (`METHODOLOGY.md`, ADR-0004) now describes several
model features the reference implementation does not yet have. Close that gap so
the Gödel instance *is* a faithful, complete worked example of the method, add the
goal-closure lens, and run a correctness audit of the concept graph. Run
continuously through the ordered phases; commit (and push) after each.

## Standing decisions (do not re-litigate)
- **Concept graph is the source of truth**; the skill map is derived. Edit
  `concepts.ts`, never hand-author `graph.ts` prerequisite edges.
- **Acyclic prerequisites**; cycles are decomposition errors (resolve by primitive
  / inductive / contrast / **maturity version**). Every edge keeps a `PREREQ_WHY`.
- **Verify by running it:** `npm run check` + a headless visual sweep after any UI
  change. A failed gate is a content discovery, not an obstacle.
- Math correctness per `CONTENT_NOTES.md`; fixed cast per `RUNNING_EXAMPLE.md`.

## Phases (ordered; each ends green + committed)

### Phase 1 — Typed relations + concept versioning (model fidelity)
- Generalize relations to a typed set: keep `prerequisite` (gates, acyclic) and
  `contrasts` (symmetric, non-gating); **add** `soft-prerequisite`/`corequisite`
  (helpful/concurrent) and `gloss`/`foreshadow` (forward, motivational, never
  gate, must resolve and point to a not-yet-introduced concept).
- Validator: definition closure governs **requirement** relations only;
  `gloss`/`foreshadow` are exempt from closure but must resolve and be forward.
- **Concept versioning:** optional `level` (`informal`/`operational`/`formal`)
  with a version chain (a later version lists earlier ones as prerequisites);
  validator keeps version chains acyclic. Ship the *support* + one test fixture;
  apply to a real Gödel concept only if it genuinely clarifies (else leave unused).
- Render the new relation types distinctly in `#/concepts` (legend updated).
- **Gate:** `npm run check` green; visual sweep clean.

### Phase 2 — Goal-closure lens (core vs enrichment)
- Declare the official goal set (the achievement/terminal concepts). Compute each
  concept's membership in some goal's backward closure.
- Mark every concept **core** (in a goal's closure), **enrichment** (reachable but
  off the critical path), or **orphan** (in none — a warning).
- Add a non-failing **goal-closure report** (`scripts/derive-report.mjs` or a new
  one); fail only on true orphans. Surface a core/enrichment badge + filter in
  `#/concepts`.
- **Gate:** report runs; current 44/60 core split reproduced and explained; no
  unexplained orphans.

### Phase 3 — Correctness audit (Tier-1 structural validation)
- Adversarially review **all 60 definitions, 107 prerequisite edges + their
  `PREREQ_WHY`, and the contrasts** for mathematical and pedagogical correctness
  (apply `CONTENT_NOTES.md`). Fix what's wrong; log each change with a reason.
- Emit `docs/EDGE_REVIEW.md`: every edge + its justification + a verdict column
  (correct / arguable / wrong) for later human sign-off — the Tier-1 artifact.
- **Gate:** `npm run check` green after fixes; review doc generated.

### Phase 4 — Ordering heuristics + maintenance
- Implement the secondary ordering criteria (METHODOLOGY §5 Step 6) as a refinement
  over the topological order (minimize new-symbol density; alternate
  abstraction/examples; cap chains without a check). Keep it a pure function with a
  test; do not change content.
- Maintenance: bump `deploy.yml` actions off the deprecated Node-20 runner.
- **Gate:** `npm run check` green; deploy workflow still valid.

## Verification each phase
`npm run check` (tsc + content/graph/closure/concept validator + build); for any
UI change, `npm run dev` + `node scripts/screenshots.mjs` (puppeteer,
`--disable-dev-shm-usage`) and eyeball. `node scripts/derive-report.mjs` for the
graph audit. Backend untouched unless a phase says so.

## Hard-won lessons (don't regress)
- Clone a regex per call if it's reused recursively (shared `lastIndex` →
  page-freezing infinite loop).
- `useSyncExternalStore` getSnapshot must return stable refs.
- React Flow: route edges via geometry-picked handles (`viz/flow.tsx`) or upward
  edges dangle; hide default handles.
- Cyclicity is a *diagnostic*, never a feature — decompose/version/reclassify.

## Non-goals (this run)
- No per-learner model / knowledge-tracing / adaptive policy (methodology §11
  marks it out of scope).
- No new subject instance; no AI-generated graphs.
- No force-push to `master`; no rewrite of the existing LLM-judge contract.
