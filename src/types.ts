/**
 * Core content contract for the concept-ladder site.
 *
 * WHY this shape: the whole pedagogical point is that the site separates five
 * relations that learners conflate — well-formedness, provability, truth-in-a-
 * structure, coding, and metatheory. That separation has to be *typed*, not
 * decorative, so node/edge/viz/quiz are all discriminated unions whose tags
 * carry the distinction. Content is plain data so a lesson can be authored or
 * corrected without touching a component.
 */

/** The five conceptual layers. Every typed-graph node/edge declares its layer
 *  so the renderer can visually keep them apart (style + legend, not color
 *  alone). This is the central anti-"category-error" mechanism. */
export type Layer = "setup-onboarding" | "config-memory" | "permissions-security-gov" | "skills-hooks-commands" | "subagents-agent-teams" | "mcp" | "plugins-distribution" | "automation-ci-integratio" | "optimal-use-context-cost" | "surfaces-mobility" | "monitoring-analytics-tro" | "enterprise-providers-gat";

/** Node kinds in the typed graph. A superset across all stages; a given graph
 *  uses only the kinds it needs. */
export type NodeType =
  | "RawString"
  | "Symbol"
  | "Term"
  | "Formula"
  | "Sentence"
  | "Axiom"
  | "InferenceRule"
  | "ProofStep"
  | "Theorem"
  | "Structure"
  | "DomainObject"
  | "Function"
  | "Relation"
  | "TruthValue"
  | "CodeNumber"
  | "ArithmeticPredicate"
  | "ObjectTheory"
  | "MetaTheory"
  | "MetaClaim"
  | "LayerBox"; // used by the four/five-level map

/** Edge kinds. The legend explains each; the renderer gives each a distinct
 *  line style so `formed_from` is never mistaken for `proves` or `satisfies`. */
export type EdgeType =
  | "formed_from"
  | "parsed_as"
  | "has_subexpression"
  | "binds_variable"
  | "premise_of"
  | "concludes"
  | "derived_by"
  | "proves"
  | "interpreted_as"
  | "evaluates_to"
  | "satisfies"
  | "encodes_as"
  | "decodes_to"
  | "represents"
  | "proves_about"
  | "extends"
  | "relates"; // generic layer-map relation

export interface GraphNode {
  id: string;
  /** Display label. May contain KaTeX delimited by $...$. */
  label: string;
  type: NodeType;
  layer: Layer;
  /** Optional longer text shown on hover / in the textual summary. */
  note?: string;
  /** Optional fixed position for hand-laid diagrams (layer map, loops). */
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** Short edge label; the *type* carries the meaning, the label is a hint. */
  label?: string;
  type: EdgeType;
  layer: Layer;
}

/** A visualization is a discriminated union: not everything is a node-link
 *  graph. Parse trees, comparison tables, and the coding encoder are their own
 *  kinds so we never force a tree or a table into React Flow. */
export type VisualizationSpec =
  | TypedGraphViz
  | ParseTreeViz
  | ParseExplorerViz
  | ComparisonTableViz
  | CodingEncoderViz
  | GodelLoopViz;

export interface VizBase {
  id: string;
  title: string;
  /** Required: a plain-text description that doubles as the accessibility
   *  fallback for screen readers and for when a graph can't render. */
  textualSummary: string;
}

export interface TypedGraphViz extends VizBase {
  kind: "typed-graph";
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Layers actually present, controls which legend rows show. */
  layers: Layer[];
}

/** Recursive parse-tree node. Rendered as nested SVG/HTML, not React Flow. */
export interface ParseNode {
  id: string;
  /** KaTeX-able label (the expression at this node). */
  label: string;
  /** Grammatical category of this node. */
  category: "sentence" | "formula" | "term" | "symbol" | "quantifier";
  /** Id of the formation rule that builds this node (parse-explorer only). */
  ruleId?: string;
  children?: ParseNode[];
}

export interface ParseTreeViz extends VizBase {
  kind: "parse-tree";
  root: ParseNode;
  /** Optional malformed string to show *failing* to parse, side by side. */
  malformedExample?: { input: string; reason: string };
}

/** The interactive parse / parse-failure explorer (ADR-0002, Phase 3). Shows the
 *  formation rules explicitly and lets the learner pick a string and watch it
 *  parse (rule-by-rule) or *fail*, citing the exact rule that can't apply — the
 *  "show the rules by which something is parsable" capability. The parse of each
 *  example is authored data (no live parser), matching the content-as-data
 *  philosophy and keeping the grammar honest. */
export interface FormationRuleSpec {
  /** short id cited by parse nodes / failures, e.g. "F∀". */
  id: string;
  category: "term" | "formula";
  /** the rule, KaTeX-able, e.g. "if $t$ is a term then $S(t)$ is a term". */
  text: string;
}

export interface ParseExample {
  /** the input string, KaTeX-able. */
  input: string;
  legal: boolean;
  /** legal inputs: the parse as nested rule applications (root = whole input). */
  tree?: ParseNode;
  /** illegal inputs: where and why parsing fails. */
  failure?: {
    /** the offending token/fragment, shown verbatim (plain text, not KaTeX). */
    at: string;
    /** the rule that was expected to apply but couldn't. */
    ruleTried: string;
    /** plain-language reason. */
    reason: string;
  };
}

export interface ParseExplorerViz extends VizBase {
  kind: "parse-explorer";
  rules: FormationRuleSpec[];
  examples: ParseExample[];
}

export interface ComparisonRow {
  /** Row label, e.g. the sentence under test. KaTeX-able. */
  label: string;
  cells: Record<string, ComparisonCell>;
}
export interface ComparisonCell {
  value: "yes" | "no" | "n/a";
  /** Tooltip / sub-label explaining the verdict. */
  note?: string;
}
export interface ComparisonTableViz extends VizBase {
  kind: "comparison-table";
  /** Column keys in order, e.g. ["Well-formed?", "Provable in PA?", "True in ℕ?"]. */
  columns: string[];
  rows: ComparisonRow[];
}

/** Interactive prime-power Gödel encoder: the learner edits a short sequence of
 *  exponents and sees 2^a·3^b·5^c·… , its product, and the decode back. */
export interface CodingEncoderViz extends VizBase {
  kind: "coding-encoder";
  /** Default exponent sequence, e.g. [4, 7, 9]. */
  defaultSequence: number[];
}

/** The Gödel-sentence self-reference cycle. Fixed four-node loop; the labels are
 *  parameterized but the structure (G_T → code → ¬Prov → G_T) is constant. */
export interface GodelLoopViz extends VizBase {
  kind: "godel-loop";
  /** The four stations of the loop, in cycle order. KaTeX-able labels. */
  stations: { label: string; sub?: string }[];
  /** The relation label printed on each arrow, in order. */
  arrows: string[];
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export type QuizQuestion =
  | MultipleChoiceQ
  | MultiSelectQ
  | TrueFalseQ
  | ClassificationQ
  | FillInQ
  | MatchingQ
  | OpenEndedQ;

interface QuizBase {
  id: string;
  prompt: string; // KaTeX-able
  /** Why the correct answer is correct — always shown after answering. */
  explanation: string;
}

export interface MultipleChoiceQ extends QuizBase {
  type: "multiple-choice";
  options: string[];
  /** Index into options. */
  correct: number;
  /** Optional per-wrong-option explanations, keyed by option index as string. */
  wrongExplanations?: Record<string, string>;
}

export interface MultiSelectQ extends QuizBase {
  type: "multi-select";
  options: string[];
  /** Indices that should be selected. */
  correct: number[];
}

export interface TrueFalseQ extends QuizBase {
  type: "true-false";
  correct: boolean;
}

/** Sort each item into exactly one bucket. Used for the well-formedness
 *  classifier and the four-level-map classification. */
export interface ClassificationQ extends QuizBase {
  type: "classification";
  buckets: string[];
  items: { id: string; label: string; correctBucket: string }[];
}

/** Fill in a missing step (e.g. a derivation line). The learner's text is
 *  normalized (whitespace collapsed, a few notational variants folded) and
 *  matched against `accepted`. Used for the 2+2=4 derivation. */
export interface FillInQ extends QuizBase {
  type: "fill-in";
  /** Context shown above the blank, KaTeX-able (e.g. the derivation so far). */
  before?: string;
  /** Context shown below the blank. */
  after?: string;
  /** Accepted answers (post-normalization, case-insensitive). */
  accepted: string[];
  /** Shown as the input's placeholder/hint. */
  placeholder?: string;
}

/** Match each left item (notation) to its right meaning. Used for the symbol
 *  glossary checks (e.g. ⊢, ⊨, ⌜P⌝, Con(T)). */
export interface MatchingQ extends QuizBase {
  type: "matching";
  /** Left column, e.g. notation. */
  left: { id: string; label: string }[];
  /** Right column, e.g. meanings. Shown shuffled in the UI via select boxes. */
  right: { id: string; label: string }[];
  /** Correct pairing: left id → right id. */
  pairs: Record<string, string>;
}

/**
 * Open-ended question graded by the LLM judge backend. The learner writes a
 * free-text response; the backend grades it against the rubric and returns a
 * verdict + feedback. Falls back to self-grading if the backend is unavailable.
 */
export interface OpenEndedQ extends QuizBase {
  type: "open-ended";
  /** What a correct answer must demonstrate — shown to the learner as a hint. */
  rubric: string;
  /** Target concepts the answer must address. */
  targetConcepts?: string[];
  /** 3-5 bullet points a passing answer will cover (shown AFTER submitting, not before). */
  passingCriteria: string[];
  /** Placeholder text for the textarea. */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

export interface Definition {
  term: string;
  short: string;
  expanded?: string;
  example?: string; // KaTeX-able
}

/** A prose block. `body` is markdown-lite: paragraphs split on blank lines,
 *  inline KaTeX via $...$, block KaTeX via $$...$$. */
export interface Section {
  heading?: string;
  body: string;
  /** Official doc URLs that back up specific claims in this section. */
  sources?: string[];
}

export interface Confusion {
  /** The wrong belief, stated plainly. */
  misconception: string;
  /** The correction. */
  correction: string;
}

/**
 * A diagnostic pre-quiz question. Shown BEFORE the lesson content; correct
 * answers collapse the sections they cover (the learner already knows that
 * material and can skip). Easier than main quiz questions — checks basic
 * familiarity, not mastery.
 */
export interface PreQuizQuestion {
  prompt: string;
  options: string[];
  /** Index of the single correct option. */
  correct: number;
  /** Indices of lesson.sections this question covers. Correct → those sections
   *  start collapsed. */
  sectionIndices: number[];
  /** Short explanation shown after answering. */
  explanation: string;
}

/**
 * A hands-on task checkpoint. Rendered inline after lesson.sections[afterSectionIdx].
 * Non-blocking (soft advisory): learner can mark done or skip.
 */
export interface HandsOnTask {
  id: string;
  /** Insert after this section index (0 = after first section). */
  afterSectionIdx: number;
  title: string;
  /** Markdown: step-by-step instructions for what to go do in Claude Code. */
  instructions: string;
  /** What the learner should have when they are done. */
  doneWhen: string;
}

export interface Lesson {
  id: string;
  stage: number;
  title: string;
  /** One-line "what this stage is about" for the sidebar/header. */
  summary: string;
  prerequisites: string[]; // lesson ids
  objectives: string[];
  definitions: Definition[];
  sections: Section[];
  /**
   * Diagnostic pre-quiz shown before lesson content. Correct answers collapse
   * matching sections by default so learners can skip what they know.
   */
  preQuiz?: PreQuizQuestion[];
  /**
   * Hands-on task checkpoints interleaved with sections (non-blocking).
   * Ordered by afterSectionIdx ascending.
   */
  tasks?: HandsOnTask[];
  visualizations: VisualizationSpec[];
  confusions: Confusion[];
  quiz: QuizQuestion[];
  /** The "you may proceed when you can…" statement. */
  masteryCheckpoint: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  example?: string;
  related: string[];
}

// ---------------------------------------------------------------------------
// Concept dependency DAG (ADR-0002) — the fine-grained substrate beneath the
// stage-level skill DAG. A `Concept` is a first-class node: each *idea* a lesson
// uses carries its own `prerequisites` (the other concepts you must already
// grasp), so "defined before use" is enforceable at term granularity, not just
// chip-token granularity. A stage node (ADR-0001) encapsulates the sub-DAG of
// concepts whose `introducedIn` is that stage; the stage DAG is thus a quotient
// of this one. Notation (@n{}) stays a self-contained primitive; @c{} refs an
// idea and renders recursively (a definition may contain further @c{} chips).
// ---------------------------------------------------------------------------

export interface Concept {
  /** kebab-case id; also the `@c{id}` chip key. */
  id: string;
  /** display label, e.g. "free variable". */
  term: string;
  layer: Layer;
  /** One-line definition. May contain `$math$`, `@n{}` notation, and `@c{}`
   *  concept refs. Every `@c{}` ref MUST be a transitive prerequisite of this
   *  concept (enforced by the validator) — that is the "defined before use"
   *  closure. */
  short: string;
  /** Optional deeper explanation; same reference rules as `short`. */
  expanded?: string;
  /** Concrete example, KaTeX-able (drawn from the fixed running cast). */
  example?: string;
  /** Concept ids that must be understood first — the definition-dependency
   *  edges. MAY form cycles (mutually-defining concepts); cycles are condensed
   *  to clusters when deriving the skill map (ADR-0003/0004). Empty for a genuine
   *  primitive (also set `primitive: true`). */
  prerequisites: string[];
  /** Undirected associations — concepts understood *against* each other (e.g.
   *  ⊢ contrasts ⊨). NOT a dependency: never gates, orders, or derives the skill
   *  map; used for "see also"/contrast cross-links. Expected to be symmetric. */
  contrasts?: string[];
  /** Stage/lesson id (ADR-0001) that formally introduces this concept. A
   *  prerequisite concept must be introduced at this stage or a prerequisite
   *  stage of it. */
  introducedIn: string;
  /** Optional self-contained check for just this concept. */
  microQuiz?: QuizQuestion[];
  /** A genuine primitive that needs no prior concept (e.g. symbol, object). */
  primitive?: boolean;
}

export interface ConceptGraph {
  concepts: Concept[];
}

// ---------------------------------------------------------------------------
// Skill DAG (ADR-0001) — the prerequisite graph that is the primary navigation.
// A "lesson" is content attached to a concept node; the linear ladder is one
// topological ordering of this graph.
// ---------------------------------------------------------------------------

export type NodeKind = "concept" | "skill" | "achievement";

/** v1 authors only these three. meta_level_of / encodes_as / contrasts_with are
 *  reserved in the type but deliberately not authored yet (ADR-0001). */
export type EdgeKind =
  | "prerequisite_for"
  | "orients" // soft, non-gating link (the orientation map → the starting atoms)
  | "assesses"
  | "remediates"
  | "meta_level_of"
  | "encodes_as"
  | "contrasts_with";

export type Branch = "setup-onboarding" | "config-memory" | "permissions-security-gov" | "skills-hooks-commands" | "subagents-agent-teams" | "mcp" | "plugins-distribution" | "automation-ci-integratio" | "optimal-use-context-cost" | "surfaces-mobility" | "monitoring-analytics-tro" | "enterprise-providers-gat";

export interface SkillNode {
  id: string;
  kind: NodeKind;
  title: string;
  shortDescription: string;
  branch: Branch;
  /** concept/skill nodes: the stage id whose content this node renders. */
  lessonId?: string;
  /** achievement nodes: the capstone task id(s) that earn this node. */
  assessmentIds?: string[];
  /** hand-laid position for the homepage DAG layout. */
  position?: { x: number; y: number };
}

export interface SkillEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
}

export interface SkillGraph {
  nodes: SkillNode[];
  edges: SkillEdge[];
}

/** Runtime state of a node for the learner, derived from progress + edges. */
export type NodeState = "locked" | "available" | "passed" | "current";

// ---------------------------------------------------------------------------
// Assessment (achievement = demonstrated capability)
// ---------------------------------------------------------------------------

export type AssessmentKind = "deterministic" | "llm-judged" | "hybrid";

export interface Misconception {
  id: string;
  description: string;
  /** nodes to revisit when this misconception is detected. */
  remediationNodeIds: string[];
  /** a fatal misconception fails the task regardless of other credit. */
  fatal?: boolean;
}

export interface RubricCriterion {
  id: string;
  description: string;
  maxScore: number;
}

export interface Rubric {
  id: string;
  criteria: RubricCriterion[];
}

export interface AssessmentTask {
  id: string;
  /** the achievement node this capstone earns. */
  nodeId: string;
  kind: AssessmentKind;
  title: string;
  /** capstone prompt (KaTeX/markdown + @n/@t chips). */
  prompt: string;
  /** deterministic component, graded by the existing Quiz engine. */
  deterministic?: QuizQuestion[];
  /** open-ended component: the learner writes an explanation graded by the LLM
   *  judge (Phase C). Stored locally until then. */
  openEnded?: {
    /** prompt for the written part. */
    prompt: string;
    rubricId: string;
  };
  requiredConcepts: string[];
  fatalMisconceptions: Misconception[];
  /** default 0.8. */
  passThreshold: number;
}

/** Structured result returned by the LLM judge backend (Phase C). */
export interface JudgeResult {
  score: number; // 0..100
  passed: boolean;
  confidence: "low" | "medium" | "high";
  criterionScores: {
    criterionId: string;
    score: number;
    maxScore: number;
    comment: string;
  }[];
  detectedMisconceptions: string[];
  missingConcepts: string[];
  feedbackForLearner: string;
  suggestedRemediationNodeIds: string[];
  followUpQuestion?: string | null;
}
