# The Research Loop — grounded, convergent concept discovery

> Front-end methodology for the concept-graph engine. The engine's structural gates
> (closure, acyclicity, group-coherence, craft floor) prove a graph is *internally
> consistent*. They do **not** prove it is *complete* or *factually correct* — which
> is exactly how a build can be green while missing the whole debate axis and carrying
> three factual errors (the Claude-infra build, 2026-06-23). This loop is the missing
> front end: **research drives the concept set, and "done" is an observable signal,
> not a feeling.** Folds into godel's `METHODOLOGY.md` once that repo's active work lands.

## The inversion

The failure mode is **intuition-first**: invent the concepts, write the lessons, then
(maybe) research. Structure looks done before correctness is even tested. The loop
inverts it: **sources first → candidate concepts/claims → reconcile + verify →
hunt gaps → repeat until dry.** Concepts are *extracted from evidence with
provenance*, not asserted.

## The five phases

Each phase has a typed contract (the schema the next phase consumes). Schemas are the
plan: an agent in the harness is forced to emit exactly these shapes.

### 0. Frame
Inputs: `goalConcept(s)`, `audience`, the `decision` the artifact serves, `asOf` date,
and the **claim policy** — which assertion classes MUST be evidence-backed
(`fact` = checkable against authority; `plan` = a recommended action; `perishable` =
a fact with a short shelf life; `contested` = a live debate with named positions).

### 1. Ground — multi-modal search
Parallel retrieval from **distinct angles that each catch what the others miss**, so
coverage isn't hostage to one search lens:
- **authoritative** (official docs, specs, changelogs) → for `fact`/`perishable`
- **community/social** (HN + comments, Reddit, X, practitioner blogs) → for `plan`/`contested`
- **adversarial/security** (audits, attack research, post-mortems) → for failure modes
- **academic/benchmark** (papers, evals) → for contested claims with evidence

→ emits `GroundResult`: `{ sources:[{url,type,asOf}], conceptMentions:[{term,gloss,sourceUrls}], claimCandidates:[{statement,kind,sourceUrls}] }`.

### 2. Extract — candidates, not intuitions
Consolidate mentions into **candidate concepts** (dedup by term; each carries a draft
definition + provenance + a tentative stage/layer) and **candidate claims** (each a
statement + kind + sources). Nothing here is invented; everything traces to a source.

→ emits `CandidateSet`: `{ concepts:[{term,gloss,sourceUrls,stageHint}], claims:[{statement,kind,sourceUrls}] }`.

### 3. Reconcile + Verify
Two tracks:
- **Structure:** merge candidate concepts into the graph (dedup against existing,
  assign `prerequisites` + `PREREQ_WHY` + kind), run the engine's structural gates.
- **Correctness:** for every claim, an independent verifier checks it against
  *authoritative* sources and writes a **claim-ledger** entry. A `contested` claim is
  **not silently resolved** — it becomes a `contrasts`/debate axis in the content
  (positions named, not hidden). This is the fix for "the value lives on the
  non-gating axis" (stress-finding S1).

→ emits ledger entries (see `claims.jsonl` schema below).

### 4. Gap detection — a panel, not a glance
Independent gap-finders, **one gap class each** (diversity catches what redundancy
can't), run in parallel:
- **coverage** — concepts the sources treat as essential that the graph omits
- **correctness** — ledger entries that are `open`/`wrong`/unsourced
- **contestation** — debates argued in the wild with no representation in the content
- **closure** — terms used before they're defined (structural, but for *newly added* concepts)
- **perishability** — claims whose `asOf` is past the domain's refresh horizon
- **completeness critic** — "what modality wasn't searched, what claim is unverified, what source unread?"

→ emits `Gap[]`: `{ class, description, suggestedSearch, severity }`.

### 5. Iterate to done
Dedup fresh gaps against everything seen; route each fresh gap back into a **targeted
Ground round** (search the gap), re-extract, re-verify. Repeat.

## The "done" readout (the whole point)

Termination is **three observable conditions**, all true — not a number picked up front,
not a vibe:

1. **Dry:** `K` consecutive gap-rounds produce **no new actionable gaps** (default `K=2`).
2. **Clean ledger:** zero `open` or `wrong` entries; every entry has ≥1 source and an
   `asOf` within the domain's refresh horizon.
3. **Gates green:** the engine's structural gates pass (`npm run check`).

Dedup gaps against the **seen** set, not against *resolved* — otherwise a
rejected/duplicate gap reappears every round and the loop never converges (the classic
loop-until-dry trap).

## Artifacts this adds to the engine

| Artifact | What it is | Gate |
|---|---|---|
| `claims.jsonl` | the claim ledger — every load-bearing assertion with verdict, source, `asOf` | `scripts/validate-claims.mjs` |
| `RESEARCH_LOOP.md` | this spec | — |
| `*.workflow.js` | the executable harness that runs phases 1–5 to convergence | the loop's own done-readout |

### `claims.jsonl` entry schema
```json
{
  "id": "seats-team-included",
  "statement": "Claude Code is included on every Team seat (Standard and Premium).",
  "kind": "fact",
  "verdict": "confirmed",            // confirmed | wrong | contested | unverifiable | open
  "correctStatement": null,           // required when verdict=wrong
  "positions": [],                    // required when verdict=contested: [{name, claim, sourceUrls}]
  "sources": ["https://support.claude.com/en/articles/11845131"],
  "asOf": "2026-06-23",
  "conceptIds": ["seats"]             // which concepts this claim backs (traceability)
}
```

### The claim gate (`validate-claims.mjs`) fails on:
- any entry with `verdict` in {`open`, `wrong`} (wrong must be fixed in content first, then re-verified to `confirmed`),
- any `fact`/`perishable` entry with no `sources`,
- any `contested` entry with fewer than 2 `positions`,
- any entry whose `asOf` is older than the configured refresh horizon (perishability),
- any `conceptIds` that don't resolve to a real concept.

## Why this is scalable / repeatable / robust

- **Scalable:** phases 1 and 4 fan out across sources and gap-classes; the harness caps
  concurrency but accepts arbitrarily many sources/gaps. New domain = new `args`, same loop.
- **Repeatable:** the done-readout is a function of observable state (dry rounds + clean
  ledger + green gates), so two runs converge to the same stopping point, and a human who
  doesn't read code can audit "is it done?" from `claims.jsonl` + the gap log.
- **Robust:** correctness is *adversarially verified* per claim against authority, and
  completeness is *attacked* by a diverse gap panel rather than asserted. Contested claims
  are surfaced, not silently decided. Perishable facts carry an `asOf` and a horizon gate.

## How it ran on this artifact (the proof)
See `claims.jsonl` (seeded from the 2026-06-23 documentation + social verification pass)
and the harness run log. The first audit pass on the hand-built 24-concept graph found
the gaps the intuition-first build missed: 3 factual errors (seats, computer-use/Dispatch,
portable-skill mechanism) and 1 contestation gap (the AGENTS.md-vs-Skills / MCP-bloat /
marketplace-security debate axis), all now reconciled.
