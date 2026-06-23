/**
 * Glossary. Grows as stages are added; this slice covers the terms used in
 * Stages 0–1 plus the five core distinction-words so the drawer is useful from
 * the start. Definitions are written to be *precise but first-encounter
 * readable* — every term a learner meets in the slice is defined here.
 *
 * `related` entries are other glossary terms (matched case-insensitively).
 */
import type { GlossaryEntry } from "../types";

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "syntax",
    definition:
      "The rule-governed formation of symbols into strings, terms, formulas, and sentences. Syntax decides whether an expression is legal — not whether it is true or provable.",
    example: "$\\forall x(x+0=x)$ is syntactically legal; $\\forall{+}{=}x))0$ is not.",
    related: ["grammar", "well-formed formula", "formula"],
  },
  {
    term: "proof theory",
    definition:
      "The study of which formulas are derivable from a theory's axioms using its inference rules. A proof-theoretic fact is about symbol manipulation, written with $\\vdash$.",
    example: "$\\mathrm{PA} \\vdash 2+2=4$ means PA can derive $2+2=4$.",
    related: ["axiom", "inference rule", "proof", "theorem"],
  },
  {
    term: "semantics",
    definition:
      "The study of which formulas are true in a structure (model). A semantic fact is about interpretation, written with $\\models$.",
    example: "$\\mathbb{N} \\models 2+2=4$ means $2+2=4$ is true in the standard natural numbers.",
    related: ["structure", "interpretation", "satisfaction", "truth in a structure"],
  },
  {
    term: "metatheory",
    definition:
      "The external theory we use to reason ABOUT a formal theory — its syntax, proofs, and models. 'PA is consistent' and 'PA does not prove G' are metatheoretic claims.",
    example: "“There is no PA-proof of $G$” is a claim in the metatheory about PA.",
    related: ["object theory", "syntax", "proof theory"],
  },
  {
    term: "alphabet",
    definition:
      "The fixed stock of symbols a formal language is allowed to use.",
    example: "For arithmetic: $0, S, +, \\times, =, \\neg, \\wedge, \\vee, \\rightarrow, \\forall, \\exists, (, )$ and variables.",
    related: ["symbol", "string"],
  },
  {
    term: "symbol",
    definition:
      "An atomic mark of the language — the smallest unit, drawn from the alphabet.",
    example: "$S$, $+$, $($, and the variable $x$ are symbols.",
    related: ["alphabet", "string"],
  },
  {
    term: "string",
    definition:
      "Any finite sequence of symbols — legal or not. Being a string says nothing about being well-formed.",
    example: "Both $\\forall x(x+0=x)$ and the gibberish $\\forall{+}{=}x))0$ are strings.",
    related: ["symbol", "well-formed formula"],
  },
  {
    term: "term",
    definition:
      "A well-formed expression that denotes an object (here, a number). Terms are the 'noun phrases' of arithmetic; they are never true or false on their own.",
    example: "$0$, $S(0)$, and $x+S(0)$ are terms.",
    related: ["formula", "symbol"],
  },
  {
    term: "formula",
    definition:
      "A well-formed expression that becomes true or false once its symbols are interpreted and its free variables are assigned values.",
    example: "$x+0=x$ is a formula (with a free variable $x$).",
    related: ["term", "sentence", "free variable"],
  },
  {
    term: "sentence",
    definition:
      "A formula with no free variables — every variable is bound by a quantifier. A sentence has a definite truth value in a given structure.",
    example: "$\\forall x(x+0=x)$ is a sentence; $x+0=x$ is not.",
    related: ["formula", "free variable", "bound variable"],
  },
  {
    term: "free variable",
    definition:
      "A variable occurrence not governed by any quantifier. A formula with a free variable is not yet a sentence.",
    example: "In $x+0=x$, the variable $x$ is free.",
    related: ["bound variable", "sentence", "formula"],
  },
  {
    term: "bound variable",
    definition:
      "A variable occurrence governed by a quantifier $\\forall$ or $\\exists$.",
    example: "In $\\forall x(x+0=x)$, every $x$ is bound by $\\forall x$.",
    related: ["free variable", "sentence"],
  },
  {
    term: "grammar",
    definition:
      "The formal rule system that determines which strings are well-formed. It answers only 'is this legal?' — never 'is this true?' or 'is this provable?'.",
    example: "A rule: if $s$ and $t$ are terms, then $(s=t)$ is a formula.",
    related: ["syntax", "well-formed formula"],
  },
  {
    term: "well-formed formula",
    definition:
      "A string accepted by the grammar as a formula. 'Well-formed' is purely syntactic — a well-formed formula can be false (e.g. $2+2=5$).",
    example: "$2+2=5$ is well-formed but false.",
    related: ["grammar", "formula", "syntax"],
  },
  {
    term: "axiom",
    definition:
      "A starting formula a theory accepts without derivation.",
    example: "$\\forall x(x+0=x)$ is an axiom of PA's theory of addition.",
    related: ["inference rule", "proof", "theorem"],
  },
  {
    term: "inference rule",
    definition:
      "A permitted pattern for deriving a conclusion from premises.",
    example: "Modus ponens: from $A$ and $A\\to B$, infer $B$.",
    related: ["axiom", "proof"],
  },
  {
    term: "proof",
    definition:
      "A finite sequence or tree of formulas in which every line is an axiom or follows from earlier lines by an inference rule.",
    example: "A finite derivation ending in $2+2=4$.",
    related: ["theorem", "axiom", "inference rule"],
  },
  {
    term: "theorem",
    definition:
      "A sentence that has a proof from a theory. We write $T \\vdash P$ when $T$ proves $P$.",
    example: "$2+2=4$ is a theorem of PA.",
    related: ["proof", "proof theory"],
  },
  {
    term: "Peano Arithmetic",
    definition:
      "A formal first-order theory of the natural numbers, built from $0$, successor $S$, $+$, $\\times$, and $=$, with axioms including induction. Abbreviated PA.",
    example: "PA proves $2+2=4$ and every other true equation between numerals.",
    related: ["axiom", "object theory"],
  },
  {
    term: "structure",
    definition:
      "A domain of objects together with interpretations of the language's symbols (which object is $0$, which function is $+$, etc.). Also called a model when it satisfies a theory's axioms.",
    example: "$\\mathbb{N} = \\langle\\{0,1,2,\\dots\\}, 0, S, +, \\times, =\\rangle$.",
    related: ["interpretation", "satisfaction", "semantics"],
  },
  {
    term: "interpretation",
    definition:
      "The assignment of actual mathematical objects, functions, and relations to the formal symbols of the language.",
    example: "The symbol $+$ is interpreted as the ordinary addition function on $\\mathbb{N}$.",
    related: ["structure", "semantics"],
  },
  {
    term: "satisfaction",
    definition:
      "The formal relation '$M \\models P$': structure $M$ makes formula $P$ true, defined recursively over the shape of $P$.",
    example: "$\\mathbb{N} \\models \\forall x(x+0=x)$.",
    related: ["truth in a structure", "structure", "semantics"],
  },
  {
    term: "truth in a structure",
    definition:
      "Truth relative to a specific interpretation. There is no 'true' without a structure to be true in; 'true in $\\mathbb{N}$' is the usual intended meaning for arithmetic.",
    example: "$2+2=4$ is true in $\\mathbb{N}$; $2+2=5$ is false in $\\mathbb{N}$.",
    related: ["satisfaction", "semantics"],
  },
  {
    term: "object theory",
    definition:
      "The formal theory currently under study (e.g. PA). Its statements are about numbers, not about itself.",
    example: "Inside the object theory PA, $2+2=4$ is a statement about numbers.",
    related: ["metatheory", "Peano Arithmetic"],
  },
  {
    term: "generative grammar",
    definition: "A grammar read as rules that build legal expressions from smaller ones.",
    example: "If $s,t$ are terms then $(s=t)$ is a formula.",
    related: ["grammar", "recognition grammar"],
  },
  {
    term: "recognition grammar",
    definition: "A grammar read as a parser: a procedure deciding whether a given string is legal.",
    example: "Input $\\forall x(x=x)$ → parser → legal.",
    related: ["grammar", "generative grammar", "decidable"],
  },
  {
    term: "proof graph",
    definition: "A graph whose edges are inference steps, from axioms to conclusions. $T\\vdash P$ means $P$ is reachable.",
    related: ["proof", "proof tree", "proof DAG"],
  },
  {
    term: "proof tree",
    definition: "A tree-shaped proof; each use of a lemma carries its own copy.",
    related: ["proof graph", "proof DAG"],
  },
  {
    term: "proof DAG",
    definition: "A directed acyclic proof graph where a shared lemma is proved once and reused.",
    related: ["proof graph", "proof tree"],
  },
  {
    term: "proof checking",
    definition: "Verifying that a given finite proof is valid. Decidable.",
    related: ["proof search", "provability", "decidable"],
  },
  {
    term: "proof search",
    definition: "Trying to find a proof of a target sentence. May never halt if none exists.",
    related: ["proof checking", "provability"],
  },
  {
    term: "provability",
    definition: "The existence of some valid proof: $T\\vdash P$. An existential claim, independent of whether anyone finds the proof.",
    related: ["proof", "proof search", "recursively enumerable"],
  },
  {
    term: "numeral",
    definition: "The formal name of a natural number as iterated successor.",
    example: "$3 = S(S(S(0)))$.",
    related: ["Peano Arithmetic", "recursive definition"],
  },
  {
    term: "recursive definition",
    definition: "A definition with a base case and a step case.",
    example: "$x+0=x$ (base); $x+S(y)=S(x+y)$ (step).",
    related: ["Peano Arithmetic", "numeral"],
  },
  {
    term: "model",
    definition: "A structure that satisfies a chosen set of sentences (a theory's axioms).",
    example: "$\\mathbb{N}$ is a model of PA.",
    related: ["structure", "satisfaction"],
  },
  {
    term: "syntactic",
    definition: "About symbol manipulation — proofs and derivations. $\\vdash$ is syntactic.",
    related: ["semantic", "proof theory"],
  },
  {
    term: "semantic",
    definition: "About interpretation in a structure — truth. $\\models$ is semantic.",
    related: ["syntactic", "satisfaction"],
  },
  {
    term: "soundness",
    definition: "Everything provable is true in the intended structure: $T\\vdash P\\Rightarrow\\mathbb{N}\\models P$. 'No false theorems.' Implies consistency.",
    related: ["consistency", "completeness", "truth in a structure"],
  },
  {
    term: "completeness",
    definition: "Of a theory: every sentence is decided ($T\\vdash P$ or $T\\vdash\\neg P$). Distinct from Gödel's Completeness Theorem about first-order logic.",
    related: ["soundness", "consistency"],
  },
  {
    term: "consistency",
    definition: "$T$ proves no contradiction; equivalently $T\\nvdash 0=1$. Weaker than soundness.",
    related: ["soundness", "contradiction", "Con(T)"],
  },
  {
    term: "contradiction",
    definition: "A sentence together with its negation, or a canonical falsehood like $0=1$.",
    related: ["consistency"],
  },
  {
    term: "decidable",
    definition: "There is an algorithm that always halts with the correct yes/no answer.",
    example: "‘Is this string a well-formed formula?’",
    related: ["recursively enumerable", "undecidable"],
  },
  {
    term: "recursively enumerable",
    definition: "An algorithm can list all yes-instances, but may never halt on a no-instance. Abbreviated r.e.",
    example: "The theorems of PA are r.e.",
    related: ["decidable", "undecidable", "provability"],
  },
  {
    term: "undecidable",
    definition: "No algorithm always gives the correct yes/no answer in finite time. (Not 'merely expensive'.)",
    example: "Theoremhood for PA is undecidable.",
    related: ["decidable", "recursively enumerable"],
  },
  {
    term: "effectively axiomatized",
    definition: "The axioms can be mechanically recognized or listed. A hypothesis of Gödel's theorems.",
    related: ["computably axiomatized", "decidable"],
  },
  {
    term: "computably axiomatized",
    definition: "Same as effectively axiomatized: axioms are mechanically recognizable/listable.",
    related: ["effectively axiomatized"],
  },
  {
    term: "Gödel coding",
    definition: "Assigning natural numbers to symbols, formulas, and proofs, so syntactic facts become arithmetic facts.",
    example: "Code a sequence as $2^{a_1+1}3^{a_2+1}5^{a_3+1}\\cdots$.",
    related: ["code number", "arithmetization of syntax"],
  },
  {
    term: "code number",
    definition: "The natural number assigned to a syntactic object. Written $\\ulcorner P\\urcorner$ for the code of $P$.",
    related: ["Gödel coding", "Gödel sentence"],
  },
  {
    term: "arithmetization of syntax",
    definition: "Representing syntactic relations (well-formedness, proofhood) as arithmetic relations among code numbers.",
    related: ["Gödel coding", "Proof_T(p,q)"],
  },
  {
    term: "Proof_T(p,q)",
    definition: "Arithmetic predicate: $p$ codes a valid $T$-proof of the formula coded by $q$. Proof-checking is primitive recursive, hence representable.",
    related: ["Prov_T(q)", "Gödel coding", "representable"],
  },
  {
    term: "Prov_T(q)",
    definition: "The provability predicate: $\\exists p\\,\\mathrm{Proof}_T(p,q)$ — the formula coded by $q$ is provable in $T$.",
    related: ["Proof_T(p,q)", "provability"],
  },
  {
    term: "representable",
    definition: "A relation $R$ is representable in $T$ when some arithmetic formula $\\varphi$ lets $T$ *prove* $\\varphi(\\bar n)$ for tuples in $R$ and *prove* $\\neg\\varphi(\\bar n)$ for tuples not in $R$ — a provability ($\\vdash$) property, not mere truth in $\\mathbb{N}$. Decidable syntactic relations (e.g. proof-checking) are representable.",
    related: ["Proof_T(p,q)", "primitive recursive", "decidable"],
  },
  {
    term: "primitive recursive",
    definition: "A class of always-halting computable functions/relations. Proof-checking is primitive recursive, hence representable in PA.",
    related: ["representable", "decidable"],
  },
  {
    term: "diagonalization",
    definition: "A construction (the Fixed-Point Lemma) yielding a sentence provably equivalent to a claim about its own code.",
    related: ["Fixed-Point Lemma", "Gödel sentence"],
  },
  {
    term: "Fixed-Point Lemma",
    definition: "For any formula $\\psi(x)$ there is a sentence $G$ with $T\\vdash G\\leftrightarrow\\psi(\\ulcorner G\\urcorner)$. The rigorous engine behind Gödel's self-reference.",
    related: ["diagonalization", "Gödel sentence"],
  },
  {
    term: "Gödel sentence",
    definition: "A sentence $G_T$ with $T\\vdash G_T\\leftrightarrow\\neg\\mathrm{Prov}_T(\\ulcorner G_T\\urcorner)$ — it 'says' it is unprovable in $T$. Arithmetic, not the liar paradox.",
    related: ["Fixed-Point Lemma", "Prov_T(q)", "first incompleteness theorem"],
  },
  {
    term: "ω-consistency",
    definition: "A strengthening of consistency: $T$ never proves $\\exists x\\,\\varphi(x)$ while refuting every $\\varphi(0),\\varphi(1),\\dots$. Gödel's original second half assumed it.",
    related: ["consistency", "Rosser sentence", "first incompleteness theorem"],
  },
  {
    term: "Rosser sentence",
    definition: "A modified Gödel sentence (Rosser 1936) for which plain consistency — not ω-consistency — already gives unprovability of both it and its negation.",
    related: ["ω-consistency", "Gödel sentence"],
  },
  {
    term: "first incompleteness theorem",
    definition: "A consistent, computably axiomatized, sufficiently strong theory is incomplete: some $G_T$ is unprovable, yet true in $\\mathbb{N}$ (given soundness).",
    related: ["Gödel sentence", "second incompleteness theorem", "completeness"],
  },
  {
    term: "Con(T)",
    definition: "The arithmetic sentence asserting $T$'s consistency: $\\neg\\mathrm{Prov}_T(\\ulcorner 0=1\\urcorner)$.",
    related: ["consistency", "second incompleteness theorem"],
  },
  {
    term: "second incompleteness theorem",
    definition: "A consistent, computably axiomatized, sufficiently strong $T$ cannot prove its own consistency $\\mathrm{Con}(T)$.",
    related: ["Con(T)", "first incompleteness theorem"],
  },
];

/** Lower-cased term → entry, for the drawer's lookup and cross-links. */
export const GLOSSARY_INDEX: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.map((e) => [e.term.toLowerCase(), e]),
);
