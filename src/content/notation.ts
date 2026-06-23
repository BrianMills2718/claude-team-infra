/**
 * Notation registry — every symbol the lessons use, each with a name, a plain
 * meaning, and a concrete example drawn from the FIXED RUNNING CAST (see
 * RUNNING_EXAMPLE.md). This is the single source for inline definition chips
 * (@n{key}) and the per-stage notation rollup, so no symbol is ever used
 * undefined.
 *
 * `glyph` is the KaTeX shown on the inline chip; `meaning`/`example` may contain
 * inline `$...$` math.
 */
export interface NotationEntry {
  /** KaTeX for the inline symbol, e.g. "\\vdash". */
  glyph: string;
  /** Short human name, e.g. "proves (syntactically)". */
  name: string;
  /** One-line plain meaning. */
  meaning: string;
  /** A concrete example using the running cast. */
  example: string;
}

export const NOTATION: Record<string, NotationEntry> = {
  T: {
    glyph: "T",
    name: "a formal theory",
    meaning: "A stand-in for a specific theory: a fixed set of axioms plus rules for deriving new statements from them. Our running theory is PA (see the PA symbol).",
    example: "$T = \\mathrm{PA}$ — the theory dissected at the Peano Arithmetic node.",
  },
  PA: {
    glyph: "\\mathrm{PA}",
    name: "Peano Arithmetic",
    meaning: "Our running theory: a standard set of axioms for the natural numbers, built from $0$ and the successor 'next number' operation $S$ (plus $+$, $\\times$, $=$). Dissected fully at the Peano Arithmetic node.",
    example: "$\\mathrm{PA}\\vdash 2+2=4$ — PA proves $2+2=4$.",
  },
  P: {
    glyph: "P",
    name: "an arbitrary sentence",
    meaning: "A placeholder for whatever sentence is under discussion.",
    example: "$P$ might be $2+2=4$, or the Gödel sentence $G_T$.",
  },
  M: {
    glyph: "M",
    name: "a structure / model",
    meaning: "A stand-in for an arbitrary structure: a domain of objects plus an interpretation of every symbol. The standard one for arithmetic is ℕ.",
    example: "$\\mathbb{N}$ is one particular $M$.",
  },
  N: {
    glyph: "\\mathbb{N}",
    name: "the standard natural numbers",
    meaning: "The intended structure for ordinary arithmetic: $\\langle\\{0,1,2,\\dots\\}, 0, S, +, \\times, =\\rangle$.",
    example: "$\\mathbb{N}\\models \\forall x(x+0=x)$.",
  },
  turnstile: {
    glyph: "\\vdash",
    name: "proves (syntactically)",
    meaning: "$T\\vdash P$ means there is a finite proof of $P$ from $T$'s axioms by its inference rules. A claim about symbol manipulation, not truth.",
    example: "$\\mathrm{PA}\\vdash 2+2=4$.",
  },
  nturnstile: {
    glyph: "\\nvdash",
    name: "does not prove",
    meaning: "$T\\nvdash P$ means no finite proof of $P$ exists in $T$.",
    example: "$\\mathrm{PA}\\nvdash 2+2=5$ (PA is consistent).",
  },
  models: {
    glyph: "\\models",
    name: "satisfies / is true in",
    meaning: "$M\\models P$ means the structure $M$ makes $P$ true (by the recursive satisfaction definition). A semantic claim.",
    example: "$\\mathbb{N}\\models 2+2=4$.",
  },
  nmodels: {
    glyph: "\\not\\models",
    name: "does not satisfy / is false in",
    meaning: "$M\\not\\models P$ means $P$ is false in the structure $M$.",
    example: "$\\mathbb{N}\\not\\models 2+2=5$.",
  },
  zero: {
    glyph: "0",
    name: "zero",
    meaning: "The constant symbol naming the number zero; the base of every numeral.",
    example: "$1 := S(0)$.",
  },
  succ: {
    glyph: "S",
    name: "successor",
    meaning: "The function symbol for 'the next number'. Numerals are stacks of $S$ over $0$.",
    example: "$2 = S(S(0))$.",
  },
  neg: {
    glyph: "\\neg",
    name: "not",
    meaning: "$\\neg P$ is true exactly when $P$ is not.",
    example: "$\\mathrm{PA}\\vdash\\neg(2+2=5)$.",
  },
  and: { glyph: "\\wedge", name: "and", meaning: "$P\\wedge Q$ is true when both $P$ and $Q$ are.", example: "$x=x \\wedge 0=0$." },
  or: { glyph: "\\vee", name: "or", meaning: "$P\\vee Q$ is true when at least one of $P$, $Q$ is.", example: "$x=0 \\vee \\neg(x=0)$." },
  implies: { glyph: "\\rightarrow", name: "if … then", meaning: "$P\\rightarrow Q$ is false only when $P$ holds and $Q$ fails.", example: "$S(x)=S(y)\\rightarrow x=y$." },
  iff: { glyph: "\\leftrightarrow", name: "if and only if", meaning: "$P\\leftrightarrow Q$ is true when $P$ and $Q$ have the same truth value.", example: "$G_T \\leftrightarrow \\neg\\mathrm{Prov}_T(\\ulcorner G_T\\urcorner)$." },
  equiv: { glyph: "\\equiv", name: "is (definitionally) the same as", meaning: "Used to abbreviate or unfold a definition.", example: "$2 \\equiv S(S(0))$." },
  forall: { glyph: "\\forall", name: "for every", meaning: "$\\forall x\\,P(x)$ is true when every object in the domain satisfies $P$.", example: "$\\forall x(x+0=x)$." },
  exists: { glyph: "\\exists", name: "there exists", meaning: "$\\exists x\\,P(x)$ is true when some object satisfies $P$.", example: "$\\exists p\\,\\mathrm{Proof}_T(p,q)$." },
  corner: {
    glyph: "\\ulcorner\\cdot\\urcorner",
    name: "Gödel number of",
    meaning: "$\\ulcorner P\\urcorner$ is the natural number that codes the syntactic object $P$ under the Gödel numbering.",
    example: "$\\ulcorner G_T\\urcorner$ is the code of the sentence $G_T$.",
  },
  ProofT: {
    glyph: "\\mathrm{Proof}_T(p,q)",
    name: "the proof predicate",
    meaning: "An arithmetic formula: '$p$ codes a valid $T$-proof of the formula coded by $q$'. Proof-checking is primitive recursive, hence representable in arithmetic.",
    example: "$\\mathrm{Proof}_T(p, \\ulcorner 2+2=4\\urcorner)$ holds for the code $p$ of an actual proof.",
  },
  ProvT: {
    glyph: "\\mathrm{Prov}_T(q)",
    name: "the provability predicate",
    meaning: "$\\exists p\\,\\mathrm{Proof}_T(p,q)$ — 'the formula coded by $q$ is provable in $T$'. An arithmetic representation of provability.",
    example: "$\\mathrm{Prov}_T(\\ulcorner 2+2=4\\urcorner)$ is true.",
  },
  ConT: {
    glyph: "\\mathrm{Con}(T)",
    name: "consistency statement",
    meaning: "$\\neg\\mathrm{Prov}_T(\\ulcorner 0=1\\urcorner)$ — the arithmetic sentence asserting that $T$ proves no contradiction.",
    example: "$\\mathrm{PA}\\nvdash\\mathrm{Con}(\\mathrm{PA})$ (Second Incompleteness Theorem).",
  },
  GT: {
    glyph: "G_T",
    name: "the Gödel sentence",
    meaning: "A sentence with $T\\vdash G_T\\leftrightarrow\\neg\\mathrm{Prov}_T(\\ulcorner G_T\\urcorner)$ — it 'says' it is unprovable in $T$.",
    example: "$\\mathrm{PA}\\nvdash G_{\\mathrm{PA}}$, yet $\\mathbb{N}\\models G_{\\mathrm{PA}}$ (true in the standard model, since $\\mathbb{N}\\models\\mathrm{PA}$).",
  },
};
