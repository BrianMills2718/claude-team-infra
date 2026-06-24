/**
 * validate-quizzes.mjs — deterministic post-generation quiz validator.
 *
 * Runs against the NORMALIZED quiz JSON (produced by normalize-quizzes.mjs)
 * alongside the generated lessons/index.ts to check section counts.
 *
 * Checks:
 *   - correct index in-bounds for options array
 *   - type is a known value
 *   - options has at least 2 entries
 *   - preQuiz sectionIndices are in-bounds for the lesson's section count
 *   - tasks afterSectionIdx is in-bounds
 *
 * Does NOT check content accuracy — that requires a human or LLM pass.
 *
 * Usage: node scripts/validate-quizzes.mjs <normalized-quizzes.json> <lessons-index.ts>
 * Exit 0 = clean. Exit 1 = errors.
 */
import { readFileSync } from "node:fs";

const [quizPath, lessonsPath] = process.argv.slice(2);
if (!quizPath || !lessonsPath) {
  console.error("usage: validate-quizzes.mjs <quizzes.json> <lessons/index.ts>");
  process.exit(2);
}

const quizzes = JSON.parse(readFileSync(quizPath, "utf8"));
const lessonsTs = readFileSync(lessonsPath, "utf8");

// Extract section counts from lessons/index.ts
const jsonStr = lessonsTs.slice(
  lessonsTs.indexOf("export const LESSONS: Lesson[] = ") + "export const LESSONS: Lesson[] = ".length,
  lessonsTs.lastIndexOf("];") + 1,
);
const lessons = JSON.parse(jsonStr);
const sectionCounts = Object.fromEntries(lessons.map((l) => [l.id, (l.sections || []).length]));

const VALID_TYPES = new Set(["multiple-choice", "multi-select", "true-false", "open-ended", "fill-in", "classification"]);
const errors = [];

for (const [stageId, v] of Object.entries(quizzes)) {
  const quiz = v.quiz || [];
  const preQuiz = v.preQuiz || [];
  const tasks = v.tasks || [];
  const nSections = sectionCounts[stageId] ?? 999;

  for (let i = 0; i < quiz.length; i++) {
    const q = quiz[i];
    const ref = `${stageId}/quiz[${i}] (${q.id ?? "?"})`;
    const opts = q.options || [];

    if (!VALID_TYPES.has(q.type)) errors.push(`[type] ${ref}: unknown type ${JSON.stringify(q.type)}`);
    if (opts.length < 2) errors.push(`[options] ${ref}: only ${opts.length} options`);

    if (q.type === "multiple-choice") {
      if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= opts.length) {
        errors.push(`[correct-bounds] ${ref}: correct=${q.correct} but ${opts.length} options`);
      }
    } else if (q.type === "multi-select") {
      if (!Array.isArray(q.correct)) {
        errors.push(`[correct-type] ${ref}: multi-select correct must be array`);
      } else {
        for (const c of q.correct) {
          if (c < 0 || c >= opts.length) errors.push(`[correct-bounds] ${ref}: index ${c} OOB (${opts.length} opts)`);
        }
      }
    }
  }

  for (let i = 0; i < preQuiz.length; i++) {
    const pq = preQuiz[i];
    const ref = `${stageId}/preQuiz[${i}]`;
    const opts = pq.options || [];

    if (typeof pq.correct !== "number" || pq.correct < 0 || pq.correct >= opts.length) {
      errors.push(`[correct-bounds] ${ref}: correct=${pq.correct} but ${opts.length} options`);
    }
    for (const idx of pq.sectionIndices || []) {
      if (idx < 0 || idx >= nSections) {
        errors.push(`[sectionIdx] ${ref}: idx=${idx} OOB (${nSections} sections in ${stageId})`);
      }
    }
  }

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const ref = `${stageId}/tasks[${i}]`;
    const after = t.afterSectionIdx ?? -1;
    if (after < 0 || after >= nSections) {
      errors.push(`[afterSectionIdx] ${ref}: idx=${after} OOB (${nSections} sections in ${stageId})`);
    }
  }
}

if (errors.length === 0) {
  const totalQ = Object.values(quizzes).reduce((n, v) => n + (v.quiz || []).length, 0);
  const totalPQ = Object.values(quizzes).reduce((n, v) => n + (v.preQuiz || []).length, 0);
  const totalT = Object.values(quizzes).reduce((n, v) => n + (v.tasks || []).length, 0);
  console.log(`✓ quiz validation passed: ${totalQ} quiz Qs, ${totalPQ} pre-quiz Qs, ${totalT} tasks — all bounds valid`);
  process.exit(0);
} else {
  console.error(`✗ quiz validation FAILED — ${errors.length} error(s):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
