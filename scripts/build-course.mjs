/**
 * build-course.mjs — the kb→course ENGINE's deterministic assembler.
 *
 * The pipeline has two kinds of stage:
 *   LLM stages (agent-run Workflows, emit structured JSON):
 *     docs-sweep → synthesize-compendium → synthesize-graph → [author-lessons, author-quizzes]
 *   Deterministic stages (this script): course-spec (+ authored JSON) → a COMPLETE, gated
 *     instance (concepts.ts, graph.ts, types Layer/Branch, lessons, assessments, goalMap,
 *     derive goal-closure, glossary[derived], debates[derived]).
 *
 * This file owns the second half: given a course-spec it writes every content file into a
 * target repo tree so `npm run check` passes. If authored lessons/quizzes JSON are present it
 * uses them; otherwise it writes valid stub lessons (the author stage fills them later).
 *
 *   node scripts/build-course.mjs <course-spec.json> <targetRepoDir> [authoredLessons.json] [authoredQuizzes.json]
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const [specPath, target, lessonsPath, quizzesPath] = process.argv.slice(2);
if (!specPath || !target) { console.error("usage: build-course.mjs <spec.json> <targetDir> [lessons.json] [quizzes.json]"); process.exit(2); }
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const C = join(target, "src", "content");
const here = process.cwd();
const q = (s) => JSON.stringify(String(s ?? ""));

// 1. concepts.ts + graph.ts (reuse the deterministic emitters)
execFileSync("node", [join(here, "scripts/emit-concepts.mjs"), specPath, join(C, "concepts.ts")], { stdio: "inherit" });
execFileSync("node", [join(here, "scripts/emit-graph.mjs"), specPath, join(C, "graph.ts")], { stdio: "inherit" });

// 2. types.ts — regenerate the Layer & Branch unions from the stage branches
const branches = [...new Set(spec.stages.map((s) => s.branch))];
const union = branches.map(q).join(" | ");
let types = readFileSync(join(target, "src", "types.ts"), "utf8");
types = types.replace(/export type Layer =[^;]*;/, `export type Layer = ${union};`);
types = types.replace(/export type Branch =\s*[^;]*;/, `export type Branch = ${union};`);
writeFileSync(join(target, "src", "types.ts"), types);

// 3. lessons — authored if provided, else valid stubs (one per stage)
const authored = lessonsPath && existsSync(lessonsPath) ? JSON.parse(readFileSync(lessonsPath, "utf8")) : {};
const quizzes = quizzesPath && existsSync(quizzesPath) ? JSON.parse(readFileSync(quizzesPath, "utf8")) : {};
// quizzes JSON can have preQuiz and tasks alongside the main quiz array
const getQuiz = (sid) => {
  const v = quizzes[sid];
  if (!v) return { quiz: [], preQuiz: [], tasks: [] };
  if (Array.isArray(v)) return { quiz: v, preQuiz: [], tasks: [] };
  return { quiz: v.quiz || [], preQuiz: v.preQuiz || [], tasks: v.tasks || [] };
};
const lessonObjs = spec.stages.map((s, i) => {
  const n = i;
  const concepts = spec.concepts.filter((c) => c.stage === s.id);
  const defs = concepts.slice(0, 6).map((c) => ({ term: c.term, short: c.short }));
  const sections = authored[s.id] || [{ heading: s.title, body: `This stage covers: ${concepts.map((c) => c.term).join(", ")}.` }];
  const { quiz, preQuiz, tasks } = getQuiz(s.id);
  const effectiveQuiz = quiz.length ? quiz : [
    { id: `${s.id}-q1`, type: "multiple-choice", prompt: `Which concept belongs to "${s.title}"?`, options: [concepts[0]?.term || "—", "An unrelated idea", "None"], correct: 0, explanation: "It is introduced in this stage." },
    { id: `${s.id}-q2`, type: "true-false", prompt: `"${s.title}" is part of setting up team infrastructure.`, correct: true, explanation: "Every stage contributes to the setup." },
  ];
  return { id: s.id, stage: n, title: s.title, prerequisites: i ? [`stage-${i - 1}`] : [], defs, sections, quiz: effectiveQuiz, preQuiz, tasks, concepts: concepts.map((c) => c.term) };
});
const lessonsTs = `import type { Lesson } from "../../types";
export const LESSONS: Lesson[] = ${JSON.stringify(lessonObjs.map((l) => ({
  id: l.id, stage: l.stage, title: l.title,
  summary: `${l.title}: ${l.concepts.slice(0, 3).join(", ")}.`,
  prerequisites: l.prerequisites,
  objectives: [`Understand the concepts in ${l.title}.`],
  definitions: l.defs,
  sections: l.sections,
  ...(l.preQuiz && l.preQuiz.length ? { preQuiz: l.preQuiz } : {}),
  ...(l.tasks && l.tasks.length ? { tasks: l.tasks } : {}),
  visualizations: [{ id: `${l.id}-v`, kind: "comparison-table", title: l.title, textualSummary: `Key concepts of ${l.title}: ${l.concepts.slice(0, 3).join(", ")}.`, columns: ["Concept", "In this stage"], rows: l.concepts.slice(0, 4).map((t) => ({ label: t, cells: { Concept: { value: "yes" }, "In this stage": { value: "yes" } } })) }],
  confusions: [{ misconception: `Skipping ${l.title}.`, correction: "Each stage is load-bearing for the setup." }, { misconception: "These concepts are interchangeable.", correction: "Each has a distinct role; see the definitions." }],
  quiz: l.quiz,
  masteryCheckpoint: `You can explain the concepts of ${l.title}.`,
})), null, 1)};
export function lessonById(id: string): Lesson | undefined { return LESSONS.find((l) => l.id === id); }
`;
mkdirSync(join(C, "lessons"), { recursive: true });
for (const f of readdirSync(join(C, "lessons"))) unlinkSync(join(C, "lessons", f));
writeFileSync(join(C, "lessons", "index.ts"), lessonsTs);

// 4. assessments.ts (one capstone for the goal achievement a-goal)
writeFileSync(join(C, "assessments.ts"), `import type { AssessmentTask, Rubric } from "../types";
export const RUBRICS: Record<string, Rubric> = { "rub-goal": { id: "rub-goal", criteria: [{ id: "correct", description: "Lays out and justifies the team setup.", maxScore: 100 }] } };
export const ASSESSMENTS: AssessmentTask[] = [{ id: "cap-goal", nodeId: "a-goal", kind: "hybrid", title: "Capstone", prompt: ${q("Lay out and justify your team's " + (spec.meta?.domain || "setup") + ".")}, deterministic: [{ id: "cap-q1", type: "true-false", prompt: "A justified team setup names where each shared thing lives.", correct: true, explanation: "Placement is the core decision." }], openEnded: { prompt: "Write and justify your setup.", rubricId: "rub-goal" }, requiredConcepts: ${JSON.stringify(spec.goals.slice(0, 5))}, fatalMisconceptions: [], passThreshold: 0.8 }];
export const ASSESSMENT_BY_ID: Record<string, AssessmentTask> = Object.fromEntries(ASSESSMENTS.map((a) => [a.id, a]));
`);

// 5. goalMap.ts
writeFileSync(join(C, "goalMap.ts"), `import { nodeById } from "./graph";
const RULES = [{ match: /.*/i, goal: "a-goal" }];
export interface ResolvedGoal { goal: string; title: string }
export function resolveGoal(text: string): ResolvedGoal | null {
  const t = text.trim(); if (!t) return null;
  for (const r of RULES) if (r.match.test(t)) { const n = nodeById(r.goal); if (n) return { goal: r.goal, title: n.title }; }
  return null;
}
`);

// 6. derive.ts — set GOAL_CONCEPTS to the spec goals
let derive = readFileSync(join(C, "derive.ts"), "utf8");
derive = derive.replace(/export const GOAL_CONCEPTS = \[[^\]]*\];/, `export const GOAL_CONCEPTS = ${JSON.stringify(spec.goals)};`);
writeFileSync(join(C, "derive.ts"), derive);

// 7. content placeholders (claude.ts override no-op; empty ledger/debates/compendium)
writeFileSync(join(C, "lessons", "claude.ts"), "export {};\n");
writeFileSync(join(C, "lesson-content.json"), "{}\n");
writeFileSync(join(C, "quiz-content.json"), "{}\n");
writeFileSync(join(C, "compendium.json"), "[]\n");
writeFileSync(join(target, "claims.jsonl"), "");
writeFileSync(join(C, "debates.ts"), `export interface DebatePosition { name: string; claim: string; sources: string[] }
export interface Debate { id: string; question: string; positions: DebatePosition[]; sources: string[]; conceptIds: string[] }
export const DEBATES: Debate[] = [];
`);

// 8b. regenerate viz/legend.ts LAYER_META from the branches (S8: was hardcoded to godel layers)
const PALETTE = ["#2563eb", "#7c3aed", "#dc2626", "#059669", "#d97706", "#0891b2", "#db2777", "#65a30d", "#9333ea", "#0d9488", "#e11d48", "#4f46e5", "#ca8a04", "#0ea5e9"];
const stageTitle = Object.fromEntries(spec.stages.map((s) => [s.branch, s.title]));
const layerMeta = branches.map((b, i) => `  ${q(b)}: { label: ${q(stageTitle[b] || b)}, color: ${q(PALETTE[i % PALETTE.length])}, blurb: ${q(stageTitle[b] || b)} },`).join("\n");
const legendPath = join(target, "src", "components", "viz", "legend.ts");
let legend = readFileSync(legendPath, "utf8");
legend = legend.replace(/export const LAYER_META: Record<\s*Layer,[\s\S]*?\n> = \{[\s\S]*?\n\};/, `export const LAYER_META: Record<\n  Layer,\n  { label: string; color: string; blurb: string }\n> = {\n${layerMeta}\n};`);
writeFileSync(legendPath, legend);

// 8c. SkillTree hardcodes the first branch for the always-in-scope orientation map
const stPath = join(target, "src", "components", "SkillTree.tsx");
let st = readFileSync(stPath, "utf8");
st = st.replace(/n\.branch === "[^"]*"/, `n.branch === ${q(spec.stages[0].branch)}`);
writeFileSync(stPath, st);

// 8. de-hardcode the validator's stage range (S6) so it covers however many stages exist
let vc = readFileSync(join(target, "scripts", "validate-content.mjs"), "utf8");
vc = vc.replace(/for \(let s = 0; s <= \d+; s\+\+\) ok\(stages\.includes\(s\)/, "for (let s = 0; s <= Math.max(...stages); s++) ok(stages.includes(s)");
writeFileSync(join(target, "scripts", "validate-content.mjs"), vc);

// 9. derive debates + glossary (sync derived files so npm run check passes)
execFileSync("node", [join(target, "scripts/derive-debates.mjs")], { stdio: "inherit", cwd: target });

console.log(`\n✓ assembled instance in ${target}: ${spec.concepts.length} concepts, ${spec.stages.length} stages, goal a-goal`);
