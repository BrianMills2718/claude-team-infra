# Stress test — running the concept-graph methodology on a *decision* domain

**What we're building:** a learning map for *"decide & set up your team's shared AI infrastructure
(Claude Code + Codex)."* **Second purpose (this file):** the domain is a **decision / best-practices**
one, not a *conceptual* one (Gödel, KG, category theory). The methodology + engine were proven on
conceptual domains. This register records where they **strain, break, or need an extension** — the
actual stress-test output. Append-only; each finding gets a disposition.

| # | Finding (issue with the system) | Severity | Disposition |
|---|---|---|---|
| S1 | **Terminal is a *decision*, not concept-mastery.** The methodology's goal/achievement is "understand concept X." Here the goal is "make & justify a setup decision." The concept graph can teach the *mechanisms*, but the payload is a **judgment over tradeoffs** — and tradeoffs are `contrasts`/relations, *not* prerequisites. So the highest-value content lives on the *non-gating* axis the engine treats as secondary. | high | **open** — likely needs a first-class **decision node** (inputs = concepts, output = a justified choice) or a "tradeoff" object. Logged for the engine. |
| S2 | **Surfaces are a parallel menu, not a prerequisite ladder.** CLI / Desktop-Code / VS Code / Cowork / Design / Codex are *alternatives*. The prerequisite relation among them is thin; the concept graph wants depth (a DAG of dependencies), the domain has **breadth** (parallel options, shallow deps). Risk: a forced/artificial prereq chain. | high | **open** — modelled them as siblings under one orientation concept + `contrasts`, not a chain. Tests whether the engine tolerates wide-shallow graphs. |
| S3 | **Caveats/constraints aren't concepts.** "Computer-use is Pro/Max-only," "Desktop reads `claude_desktop_config.json`, the CLI doesn't" — these are *constraints attached to a concept*, not concepts. The data model has no "constraint" object; they land in the definition/confusion, which works but understates load-bearing gotchas. | med | **accepted** — fold into `confusions` + lesson body for now; flag a possible `caveat` field. |
| S4 | **Cross-*tool* (Codex) breaks the single-engine framing.** The framework assumes one system; this domain spans Claude **and** Codex. `portable-skill` + `agents-md` bridge it, but it's a bolt-on, and "one engine, many front-ends" (S2's orientation concept) is *false* once Codex enters. | med | **open** — modelled Codex as a sibling surface + a portability concept; the orientation concept's framing is scoped to *Claude* explicitly. |
| S5 | **Perishability.** This domain moves monthly (Claude Code releases weekly); a Gödel concept graph is static. A research-grounded curriculum needs an `as_of` + refresh policy the engine doesn't model. | med | **open** — note an `as_of` date on the curriculum; ties to `learning_map`'s Ground stage. |

## Slice plan (vertical, gated, craft-bar)
- **Slice 1 (now):** the **concept graph** — `concepts.ts` (concepts + local prerequisites + `PREREQ_WHY` + groups), decomposed against the gates (closure / acyclicity / group-coherence), hand-verified; this file. *De-risks the riskiest unknown: does the concept-graph model even fit a decision domain?*
- **Slice 2:** plug into the godel framework → mechanical gate green (`npm run check`) → derive the map.
- **Slice 3:** attach lessons to the **craft bar** (hook → picture/analogy-first → Therefore/But spine → mechanical floor); the capstone = a *justified setup decision* (tests S1).
- **Slice 4:** deploy; adversarial read; triage this register.
