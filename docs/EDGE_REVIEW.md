# Concept-graph correctness review (Tier-1 structural validation)

> **Date:** 2026-06-20. **Method:** multi-agent adversarial audit — 12 topic
> groups × 2 lenses (mathematical correctness; dependency faithfulness) = 24
> auditors, each finding re-checked by an independent skeptical verifier (58
> agents total). **Result:** 34 findings surfaced → **16 confirmed, 13 arguable**.
> This is the OVERNIGHT_PLAN Phase 3 artifact and the ADR-0004 §9 Tier-1 record:
> it documents what the audit found, what was changed, what was deliberately left,
> and lists every prerequisite edge + its justification for human sign-off.

## Fixes applied (confirmed findings + clear arguable improvements)

| # | Target | Change |
|---|---|---|
| 1 | `object` | Removed the bogus `symbol` prerequisite (a `primitive` must have none — now validator-enforced); the symbol/object relation is recast as a **symmetric `contrasts`** (mark vs. thing). |
| 2 | `bound-variable` ↔ `free-variable` | Added the missing symmetric `contrasts` (exact logical complements). |
| 3 | `proof-tree` ↔ `proof-dag` | Added the missing symmetric `contrasts` (each defined against the other). |
| 4 | `theorem` | Added `formal-theory` prerequisite — "a sentence provable **from a theory** T" was undeclared. |
| 5 | `satisfaction` | **Math fix:** reworded to be assignment-correct — an open formula is satisfied under a variable assignment; a `sentence` (added as prerequisite) gives plain truth in M. The old "makes the formula true" was undefined for open formulas. |
| 6 | `metatheory` | Example now uses `$G_{\mathrm{PA}}$`, not bare `$G$` (notation discipline). |
| 7 | `effectively-axiomatized` | **Math fix:** definition is now "axiom set is **recursively enumerable** (decidable for concrete systems like PA)", not "a decidable axiom set" — the standard hypothesis is r.e. (Craig's theorem). Added `recursively-enumerable` prerequisite. |
| 8 | `recursively-enumerable` | Dropped the `provability` prerequisite (it was an *example*, not a dependency); reworded to separate the enumerator and semi-decider characterizations. |
| 9 | `primitive-recursive` | Dropped the `proof` prerequisite (an example, not a dependency); demoted the `@c{proof}` chip to plain text. |
| 10 | `godel-coding` | Trimmed the definition to just the numbering; "syntactic *relations* become arithmetic" now belongs to `arithmetization`. |
| 11 | `representable` | **Math fix:** reworded to the proof-theoretic property (T ⊢ φ of the right tuples, T ⊢ ¬φ of the rest) — "holds of the right numbers" read as truth-in-ℕ, the exact ⊢/⊨ category error the site guards. |
| 12 | `proof-predicate` | Dropped the transitively-redundant direct `arithmetization` edge (reachable via `representable`). |
| 13 | `first-incompleteness` | **Math fix:** example no longer attributes *irrefutability* to plain consistency — "cannot prove (consistency suffices); cannot refute given soundness; ω-consistency / Rosser noted." Per CONTENT_NOTES §1. |
| 14 | `godel-sentence` | Example hedges ℕ ⊨ G_PA with "given ℕ ⊨ PA, i.e. soundness." Per CONTENT_NOTES §1. |
| 15 | `formation-rule` | Definition now covers base clauses ("$0$ is a term"), not only inductive steps. |
| 16 | `object-theory` | Replaced the bare "not about itself" with a coding-aware framing (arithmetic can encode claims about the theory — the Stage 12–14 payoff). |

**Validator hardening:** a concept flagged `primitive` must now have empty
`prerequisites` (the contradiction in finding #1 was previously uncaught).

## Deferred (arguable findings left as-is, with rationale)

- **`term` "names an object" with open-term example** — kept; a defensible
  syntax-layer category statement (terms are the number-denoting category).
- **`term` ↔ `atomic-formula` contrast** — not added; that is a *prerequisite*
  (build-on) relation, not a peer "defined-against" contrast; adding it would blur
  the prerequisite/contrast line the model deliberately separates.
- **`free-variable` quiz says "sentence"** — kept; informal, both stage-1.
- **`parser` → `well-formed` redundant** — kept; intentional convention (a direct
  edge mirrors the `@c{}` usage in the node's text; `transitiveReduction` cleans
  the display map).
- **`proof` → `axiom`/`inference-rule` bypassing `formal-theory`** — kept; a
  defensible decomposition; closure is satisfied (proof's text chips axiom/rule).
- **`numeral` ↔ `object` contrast** — not added; the use/mention point is already
  carried by numeral's example and the `object` node.
- **`soundness` → `consistency` justification** — kept; soundness is framed *by
  contrast with* consistency ("implies it but is strictly stronger"), a defensible
  comprehension dependency.
- **`representable` → `primitive-recursive`** — kept; CONTENT_NOTES §6 enshrines
  the prim-rec → representable chain; the `formula` dependency is transitive.
- **`omega-consistency` missing `numeral`** — kept; numeral is available from
  stage-5 and the instances φ(0), φ(1), … are written as plain math.

## Appendix — full prerequisite-edge inventory (for sign-off)

Every prerequisite edge and its justification. Use the **verdict** column to
record an independent reviewer's sign-off (✓ / ? / ✗).

| Concept | Requires | Justification | Verdict |
|---|---|---|---|
| `variable` — variable | `symbol` — symbol | a variable is a kind of symbol |  |
| `variable` — variable | `object` — object | a variable stands for an (unspecified) object |  |
| `alphabet` — alphabet | `symbol` — symbol | an alphabet is the fixed set of available symbols |  |
| `string` — string | `symbol` — symbol | a string is a finite sequence of symbols |  |
| `formation-rule` — formation rule | `symbol` — symbol | formation rules build legal expressions out of symbols |  |
| `well-formed` — well-formed | `string` — string | well-formedness is a property a string may or may not have |  |
| `well-formed` — well-formed | `formation-rule` — formation rule | well-formed means buildable by the formation rules |  |
| `parse-tree` — parse tree | `formation-rule` — formation rule | a parse tree records which formation rules built the expression |  |
| `parse-tree` — parse tree | `well-formed` — well-formed | only a well-formed expression has a parse tree |  |
| `term` — term | `well-formed` — well-formed | a term is a well-formed expression of a particular kind |  |
| `term` — term | `variable` — variable | variables are among the basic terms |  |
| `term` — term | `object` — object | a term denotes an object |  |
| `atomic-formula` — atomic formula | `term` — term | an atomic formula equates two terms |  |
| `formula` — formula | `atomic-formula` — atomic formula | atomic formulas are the base case of the formula definition |  |
| `formula` — formula | `well-formed` — well-formed | a formula is a well-formed expression that can be true or false |  |
| `quantifier` — quantifier | `formula` — formula | a quantifier binds a variable in a formula to make a formula |  |
| `quantifier` — quantifier | `variable` — variable | a quantifier binds a variable |  |
| `bound-variable` — bound variable | `variable` — variable | 'bound' is a status a variable occurrence can have |  |
| `bound-variable` — bound variable | `quantifier` — quantifier | a variable is bound when a quantifier governs it |  |
| `free-variable` — free variable | `variable` — variable | 'free' is a status a variable occurrence can have |  |
| `free-variable` — free variable | `quantifier` — quantifier | free = not bound by any quantifier — defined against quantification |  |
| `sentence` — sentence | `formula` — formula | a sentence is a formula of a special kind |  |
| `sentence` — sentence | `free-variable` — free variable | a sentence is a formula with no free variables |  |
| `grammar` — grammar | `formation-rule` — formation rule | a grammar is the set of formation rules |  |
| `grammar` — grammar | `well-formed` — well-formed | a grammar decides exactly which strings are well-formed |  |
| `parser` — parser | `grammar` — grammar | a parser applies the grammar to decide legality |  |
| `parser` — parser | `well-formed` — well-formed | a parser's job is to certify well-formedness |  |
| `axiom` — axiom | `sentence` — sentence | an axiom is a sentence taken as a starting assumption |  |
| `inference-rule` — inference rule | `formula` — formula | an inference rule derives a new formula from given ones |  |
| `formal-theory` — formal theory | `axiom` — axiom | a theory is a set of axioms (plus rules) |  |
| `formal-theory` — formal theory | `inference-rule` — inference rule | a theory's rules are its inference rules |  |
| `proof` — proof | `axiom` — axiom | a proof's lines are axioms or follow from earlier lines |  |
| `proof` — proof | `inference-rule` — inference rule | each proof step applies an inference rule |  |
| `theorem` — theorem | `proof` — proof | a theorem is a sentence that has a proof |  |
| `theorem` — theorem | `sentence` — sentence | a theorem is a sentence (a provable one) |  |
| `theorem` — theorem | `formal-theory` — formal theory | a theorem is a sentence provable from a fixed formal theory T |  |
| `provability` — provability | `proof` — proof | provability is the existence of a proof |  |
| `proof-graph` — proof graph | `proof` — proof | a proof graph draws a proof as a reachability graph |  |
| `proof-tree` — proof tree | `proof-graph` — proof graph | a proof tree is a tree-shaped proof graph |  |
| `proof-dag` — proof DAG | `proof-graph` — proof graph | a proof DAG is an acyclic proof graph with shared lemmas |  |
| `numeral` — numeral | `term` — term | a numeral is a term that names a number |  |
| `peano-arithmetic` — Peano Arithmetic | `formal-theory` — formal theory | PA is a particular formal theory |  |
| `peano-arithmetic` — Peano Arithmetic | `numeral` — numeral | PA's arithmetic is stated over numerals |  |
| `interpretation` — interpretation | `symbol` — symbol | an interpretation assigns a meaning to each symbol |  |
| `interpretation` — interpretation | `object` — object | an interpretation maps constants to objects |  |
| `structure` — structure | `interpretation` — interpretation | a structure carries an interpretation of the symbols |  |
| `structure` — structure | `object` — object | a structure has a domain of objects |  |
| `satisfaction` — satisfaction | `structure` — structure | satisfaction is truth in a structure |  |
| `satisfaction` — satisfaction | `formula` — formula | satisfaction evaluates a formula's truth |  |
| `satisfaction` — satisfaction | `sentence` — sentence | for a sentence the assignment is irrelevant — satisfaction reduces to plain truth in M |  |
| `truth-in-structure` — truth in a structure | `satisfaction` — satisfaction | truth-in-a-structure is the satisfaction relation |  |
| `model` — model | `structure` — structure | a model is a structure (one that satisfies the axioms) |  |
| `model` — model | `satisfaction` — satisfaction | 'model of T' means it satisfies T's axioms |  |
| `model` — model | `axiom` — axiom | a model is judged against a theory's axioms |  |
| `syntactic` — syntactic | `proof` — proof | the syntactic side is about proofs/derivations (⊢) |  |
| `semantic` — semantic | `satisfaction` — satisfaction | the semantic side is about satisfaction/truth (⊨) |  |
| `contradiction` — contradiction | `sentence` — sentence | a contradiction is a sentence together with its negation |  |
| `consistency` — consistency | `contradiction` — contradiction | consistent = proves no contradiction |  |
| `consistency` — consistency | `provability` — provability | consistency is stated in terms of what is provable |  |
| `consistency` — consistency | `syntactic` — syntactic | consistency is a purely syntactic property |  |
| `soundness` — soundness | `provability` — provability | soundness relates what is provable… |  |
| `soundness` — soundness | `truth-in-structure` — truth in a structure | …to what is true in the intended structure |  |
| `soundness` — soundness | `consistency` — consistency | soundness is the stronger notion built atop consistency |  |
| `soundness` — soundness | `syntactic` — syntactic | soundness bridges the syntactic side… |  |
| `soundness` — soundness | `semantic` — semantic | …to the semantic side |  |
| `completeness` — completeness | `provability` — provability | completeness is about what the theory can prove |  |
| `completeness` — completeness | `sentence` — sentence | completeness = every sentence is decided |  |
| `object-theory` — object theory | `formal-theory` — formal theory | the object theory is the formal theory under study |  |
| `metatheory` — metatheory | `object-theory` — object theory | metatheory is reasoning about the object theory |  |
| `metatheory` — metatheory | `sentence` — sentence | metatheoretic claims are about the object theory's sentences… |  |
| `metatheory` — metatheory | `proof` — proof | …and about its proofs |  |
| `recursively-enumerable` — recursively enumerable | `decidable` — decidable | r.e. is the weaker sibling of decidable |  |
| `undecidable` — undecidable | `decidable` — decidable | undecidable = not decidable |  |
| `primitive-recursive` — primitive recursive | `decidable` — decidable | primitive-recursive relations are decidable |  |
| `effectively-axiomatized` — effectively axiomatized | `axiom` — axiom | effectively axiomatized = its axioms are mechanically recognizable… |  |
| `effectively-axiomatized` — effectively axiomatized | `recursively-enumerable` — recursively enumerable | effectively axiomatized = the axiom set is mechanically listable (r.e.) |  |
| `effectively-axiomatized` — effectively axiomatized | `decidable` — decidable | …and for concrete systems like PA, axiomhood is in fact decidable |  |
| `godel-coding` — Gödel coding | `formula` — formula | coding assigns numbers to formulas… |  |
| `godel-coding` — Gödel coding | `proof` — proof | …and to proofs |  |
| `code-number` — code number | `godel-coding` — Gödel coding | a code number is the number the coding assigns |  |
| `arithmetization` — arithmetization of syntax | `godel-coding` — Gödel coding | arithmetization re-expresses syntax via the coding |  |
| `arithmetization` — arithmetization of syntax | `code-number` — code number | arithmetization works over code numbers |  |
| `representable` — representable | `primitive-recursive` — primitive recursive | primitive-recursive relations are representable |  |
| `representable` — representable | `arithmetization` — arithmetization of syntax | representability is the point of arithmetizing syntax |  |
| `proof-predicate` — Proof_T(p,q) | `representable` — representable | Proof_T works because proof-checking is representable |  |
| `prov-predicate` — Prov_T(q) | `proof-predicate` — Proof_T(p,q) | Prov_T is ∃p Proof_T(p,·) |  |
| `diagonalization` — diagonalization | `sentence` — sentence | diagonalization produces a self-referential sentence… |  |
| `diagonalization` — diagonalization | `code-number` — code number | …that refers to its own code number |  |
| `fixed-point-lemma` — Fixed-Point Lemma | `diagonalization` — diagonalization | the Fixed-Point Lemma is the rigorous form of diagonalization |  |
| `godel-sentence` — Gödel sentence | `fixed-point-lemma` — Fixed-Point Lemma | G_T is built by the Fixed-Point Lemma |  |
| `godel-sentence` — Gödel sentence | `prov-predicate` — Prov_T(q) | G_T is the fixed point of ¬Prov_T |  |
| `omega-consistency` — ω-consistency | `consistency` — consistency | ω-consistency strengthens consistency |  |
| `rosser-sentence` — Rosser sentence | `godel-sentence` — Gödel sentence | the Rosser sentence is a modified Gödel sentence |  |
| `rosser-sentence` — Rosser sentence | `consistency` — consistency | it needs only plain consistency… |  |
| `rosser-sentence` — Rosser sentence | `omega-consistency` — ω-consistency | …instead of ω-consistency |  |
| `first-incompleteness` — first incompleteness theorem | `godel-sentence` — Gödel sentence | the theorem is about the unprovability of G_T |  |
| `first-incompleteness` — first incompleteness theorem | `effectively-axiomatized` — effectively axiomatized | a hypothesis of the theorem |  |
| `first-incompleteness` — first incompleteness theorem | `consistency` — consistency | a hypothesis of the theorem |  |
| `first-incompleteness` — first incompleteness theorem | `soundness` — soundness | soundness gives 'true but unprovable' |  |
| `first-incompleteness` — first incompleteness theorem | `completeness` — completeness | the conclusion is that completeness fails |  |
| `first-incompleteness` — first incompleteness theorem | `metatheory` — metatheory | 'unprovable yet true' is a metatheoretic claim |  |
| `con-t` — Con(T) | `prov-predicate` — Prov_T(q) | Con(T) is written with Prov_T |  |
| `con-t` — Con(T) | `consistency` — consistency | Con(T) is the arithmetic statement of consistency |  |
| `second-incompleteness` — second incompleteness theorem | `first-incompleteness` — first incompleteness theorem | the second theorem builds on the first |  |
| `second-incompleteness` — second incompleteness theorem | `con-t` — Con(T) | it is about T's inability to prove Con(T) |  |
| `second-incompleteness` — second incompleteness theorem | `effectively-axiomatized` — effectively axiomatized | a hypothesis of the theorem |  |
