# The fixed running cast

The site uses one consistent cast of examples, reused as widely as each stage
allows, so the learner never has to re-anchor. A *single* sentence can't honestly
carry all 17 stages (the coding/incompleteness end is inherently about `G_T`), so
we fix a small cast instead of faking one example.

| Role | Example | Used in |
|---|---|---|
| **Theory** | `T = PA` (Peano Arithmetic) | every stage |
| **Structure** | `ℕ` (standard naturals) | 6–9, 15–16 |
| **Closed true sentence** (the main thread) | `2 + 2 = 4` | 0, 2, 3, 5, 7, 8 |
| **Open formula / universal axiom** | `∀x (x + 0 = x)` | 1, 2, 6, 7 |
| **False foil** | `2 + 2 = 5` | 0, 2, 5, 7, 8 |
| **Malformed foil** | `∀+=x))0` | 0, 1, 2 |
| **Self-reference payoff** | `G_T` (use `G_PA` when the theory is named PA) | 8, 14, 15 |
| **Consistency statement** | `Con(T)` = `¬Prov_T(⌜0=1⌝)` | 10, 16 |

## Notation discipline
- When a stage names the theory concretely as PA, use `G_PA` / `Con(PA)`, not the
  generic `G_T` — mixing them in one table is the exact notation drift the site
  warns against (fixed in Stage 0).
- Every symbol is defined where it is used via inline chips: `@n{key}` (a symbol,
  from `src/content/notation.ts`) and `@t{slug|label}` (a glossary term). The
  per-stage "Symbols & terms used here" rollup auto-lists them. The content
  validator fails if any `@n/@t` reference doesn't resolve.

## Symbol keys (notation.ts)
`T, PA, P, N` (ℕ), `turnstile` (⊢), `nturnstile` (⊬), `models` (⊨),
`nmodels` (⊭), `zero, succ` (S), `neg, and, or, implies, iff, equiv`,
`forall, exists`, `corner` (⌜·⌝), `ProofT, ProvT, ConT, GT`.
