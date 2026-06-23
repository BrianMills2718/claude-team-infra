/**
 * audit-content.workflow.js — content quality audit for a generated course instance.
 * This is a STRESS TEST of the kb→course engine: find factual errors, shallow content,
 * bad quiz distractors, and missing key concepts. Findings feed back into the engine
 * (author-lessons and author-quizzes workflow improvements).
 *
 * The orchestrator injects STAGE_INPUTS before running:
 *   const STAGE_INPUTS = <contents of /tmp/audit-stage-inputs.json>;
 *
 * Each element: { stageId, stageTitle, concepts, lessonSections, quizzes,
 *                 compendiumTheme, compendiumMarkdown }
 * compendiumMarkdown is the authoritative ground-truth source.
 */
export const meta = {
  name: "audit-content",
  description: "Quality audit of generated lessons + quizzes: factual accuracy, depth, quiz rigor",
  phases: [
    { title: "Per-stage audit" },
    { title: "Synthesis" },
  ],
};

// Orchestrator injects STAGE_INPUTS here:
const STAGE_INPUTS = [];

const AUDIT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["stageId", "overallQuality", "lessonIssues", "quizIssues", "missingConcepts", "keyFindings"],
  properties: {
    stageId: { type: "string" },
    overallQuality: { type: "string", description: "good | acceptable | needs-work" },
    lessonIssues: {
      type: "array",
      description: "factual errors, shallow content, misleading framing in lesson sections",
      items: {
        type: "object", additionalProperties: false,
        required: ["section", "severity", "type", "issue", "fix"],
        properties: {
          section: { type: "string", description: "the section heading" },
          severity: { type: "string", description: "high | med | low" },
          type: { type: "string", description: "factual-error | shallow | missing-concept | misleading | off-topic" },
          issue: { type: "string", description: "specific, concrete description of the problem" },
          fix: { type: "string", description: "concrete suggested fix" },
        },
      },
    },
    quizIssues: {
      type: "array",
      description: "wrong answers, bad distractors, trivial questions, non-scenario questions",
      items: {
        type: "object", additionalProperties: false,
        required: ["questionIdx", "severity", "type", "issue", "fix"],
        properties: {
          questionIdx: { type: "number" },
          severity: { type: "string", description: "high | med | low" },
          type: { type: "string", description: "wrong-answer | bad-distractor | not-scenario | trivial | ambiguous" },
          issue: { type: "string", description: "specific problem with the question or its answers" },
          fix: { type: "string", description: "concrete suggested fix" },
        },
      },
    },
    missingConcepts: {
      type: "array", items: { type: "string" },
      description: "key concepts from the compendium that the lesson never covers",
    },
    keyFindings: {
      type: "array", items: { type: "string" }, description: "the 2-3 most important findings for this stage",
    },
  },
};

const SYNTHESIS_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["overallAssessment", "highSeverityIssues", "systematicPatterns", "lessonEngineImprovements", "quizEngineImprovements"],
  properties: {
    overallAssessment: { type: "string", description: "2-3 sentence overall quality verdict" },
    highSeverityIssues: {
      type: "array", items: { type: "object", additionalProperties: false,
        required: ["stageId", "issue", "fix"],
        properties: { stageId: { type: "string" }, issue: { type: "string" }, fix: { type: "string" } } },
    },
    systematicPatterns: {
      type: "array", items: { type: "string" },
      description: "patterns that appear across multiple stages (not one-off issues)",
    },
    lessonEngineImprovements: {
      type: "array", items: { type: "string" },
      description: "specific changes to author-lessons.workflow.js prompt or schema to fix systematic lesson issues",
    },
    quizEngineImprovements: {
      type: "array", items: { type: "string" },
      description: "specific changes to author-quizzes.workflow.js prompt or schema to fix systematic quiz issues",
    },
  },
};

log(`auditing ${STAGE_INPUTS.length} stages`);

// Phase A — one auditor per stage (12 in parallel)
const perStage = (await parallel(STAGE_INPUTS.map((inp) => () =>
  agent(
    `You are auditing the quality of a generated Claude Code team-setup learning course.\n\n` +
    `AUTHORITATIVE SOURCE (the ground truth — distilled from official Claude Code docs):\n` +
    `Theme: ${inp.compendiumTheme}\n${inp.compendiumMarkdown}\n\n` +
    `--- STAGE TO AUDIT: ${inp.stageTitle} (${inp.stageId}) ---\n` +
    `Target concepts: ${inp.concepts.map((c) => `${c.term}: ${c.short}`).join(" | ")}\n\n` +
    `AUTHORED LESSONS:\n${JSON.stringify(inp.lessonSections)}\n\n` +
    `AUTHORED QUIZZES (${inp.quizzes.length} questions):\n${JSON.stringify(inp.quizzes)}\n\n` +
    `EVALUATE:\n` +
    `1. LESSON ACCURACY: Are the facts correct against the authoritative source? Flag any claim that contradicts the compendium.\n` +
    `2. LESSON DEPTH: Is each section substantive? Flag sections that are too thin (hand-waving, obvious filler, no specifics).\n` +
    `3. MISSING CONCEPTS: What key ideas from the compendium are completely absent from the lessons?\n` +
    `4. QUIZ SCENARIO QUALITY: Are questions scenario-based (a real-world situation, not "what does X mean")? Flag recognition questions.\n` +
    `5. DISTRACTOR QUALITY: Do wrong options encode REAL misconceptions (things people actually believe)? Flag obvious-wrong distractors.\n` +
    `6. CORRECT ANSWER: Is the marked correct answer actually correct? Flag any that are wrong or debatable.\n\n` +
    `Be specific and concrete — quote the actual text when flagging an issue. Only flag real problems, not style preferences.`,
    { schema: AUDIT_SCHEMA, label: `audit:${inp.stageId}`, phase: "Per-stage audit", effort: "high" },
  ),
))).filter(Boolean);

log(`per-stage audit complete: ${perStage.length} stages`);

// Phase B — synthesis: patterns + engine improvements
const synthesis = await agent(
  `You are synthesizing a content quality audit of a 12-stage generated learning course about Claude Code team setup.\n\n` +
  `Here are the per-stage audit results:\n${JSON.stringify(perStage, null, 1).slice(0, 60000)}\n\n` +
  `PRODUCE:\n` +
  `1. Overall quality verdict (2-3 sentences).\n` +
  `2. All HIGH severity issues (de-duplicate, specific fix per issue).\n` +
  `3. SYSTEMATIC PATTERNS — issues that appear across ≥3 stages (not one-offs). What is the engine doing wrong consistently?\n` +
  `4. LESSON ENGINE IMPROVEMENTS — specific changes to the author-lessons workflow prompt/schema that would fix the systematic patterns.\n` +
  `5. QUIZ ENGINE IMPROVEMENTS — specific changes to the author-quizzes workflow prompt/schema.\n\n` +
  `For engine improvements: be concrete (e.g. "add this requirement to the prompt", "add this field to the schema", "require N per section").\n` +
  `Focus on root causes, not symptoms.`,
  { schema: SYNTHESIS_SCHEMA, label: "synthesis", phase: "Synthesis", effort: "high" },
);

return { perStage, synthesis };
