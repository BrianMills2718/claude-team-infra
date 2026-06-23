# Fold-back proposal: add the Research Loop to godel's engine

Staged, **not applied** — the godel repo has active parallel work; apply this when that
lands. This packages what was built and proven in `claude-team-infra` for promotion into the
shared engine (`~/projects/godel/METHODOLOGY.md` + `scripts/`), so every concept-graph
instance gets grounded, convergent, correctness-gated construction — not just structural gates.

## Why
godel's gates prove a concept graph is *internally consistent* (closure, acyclicity, group
coherence, craft floor). They do not prove it is *complete* or *factually correct*. The
claude-team-infra build was green while carrying 3 factual errors and missing an entire debate
axis — caught only by a research pass done *after* the fact. The loop moves research to the
front and makes "done" an observable readout.

## What to add to the engine (verbatim sources live in this repo)

1. **`METHODOLOGY.md` — a new section "The Research Loop"** (front end of the construction
   procedure). Source: `docs/RESEARCH_LOOP.md` (copy in, adjusting the intro to be
   domain-neutral). Phases: Frame → Ground (multi-modal) → Extract (candidates, not
   intuitions) → Reconcile+Verify → Gap panel → loop-until-dry. Done = K dry rounds + clean
   ledger + green structural gates.

2. **The claim ledger as an engine artifact.** Source files to generalize:
   - `claims.jsonl` — the per-instance ledger (entry schema in RESEARCH_LOOP.md §artifacts).
   - `scripts/validate-claims.mjs` — the gate (open/wrong, unsourced fact, contested<2,
     stale `asOf`, unresolved conceptId) + concept-coverage report. Generic except it bundles
     `concepts.ts` for id resolution — already engine-agnostic.
   - Wire `node scripts/validate-claims.mjs` into the engine's `npm run check`.

3. **The executable harness.** Source: `scripts/research-loop.workflow.js` — already
   domain-general (takes `{domain, goalConcepts, audience, asOf, existingConcepts}`), greenfield
   or audit mode. Note the fix landed here: parse `args` defensively (it can arrive stringified).

4. **Derived debates view (optional).** Source: `scripts/derive-debates.mjs` + the `#/debates`
   view — renders `contested` ledger entries so learners see positions, not just consensus.
   Generic; lift if godel wants a debates surface.

## Migration notes
- The engine should also stop hard-coding the stage range, brand strings, and achievement
  count (claude-team-infra stress-findings S6/S8) — a per-instance config + deriving counts
  from the graph. Fixing those at fold-back time makes godel a true multi-instance engine
  rather than "one domain with content swapped" (S7).
- Keep `claims.jsonl` per-instance (it's domain content); only the gate + harness + methodology
  doc are shared engine code.

## Provenance
Built and validated in `claude-team-infra` (2026-06-23). The loop's first real run audited the
24→25-concept team-infra graph; the ledger holds 28 verified claims at 25/25 concept coverage.
