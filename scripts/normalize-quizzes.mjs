/**
 * normalize-quizzes.mjs — convert workflow quiz output to frontend-ready format.
 *
 * Workflow outputs: { type:"single"|"multi", prompt, options, correct:[int], explanation, ... }
 * Frontend expects: { id, type:"multiple-choice"|"multi-select", prompt, options, correct:int|[int], explanation }
 *
 * Also normalizes preQuiz questions (already in the right shape, just need validation).
 *
 * Usage: node scripts/normalize-quizzes.mjs <quizzes.json> <output.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: normalize-quizzes.mjs <quizzes.json> <output.json>");
  process.exit(2);
}

const raw = JSON.parse(readFileSync(input, "utf8"));

const normalized = {};
for (const [stageId, v] of Object.entries(raw)) {
  // Normalize main quiz questions
  const quiz = (Array.isArray(v) ? v : (v.quiz || [])).map((q, i) => {
    const id = q.id || `${stageId}-q${i + 1}`;
    const explanation = q.explanation || "";
    // single → multiple-choice, multi → multi-select
    if (q.type === "single" || q.type === "multiple-choice") {
      const correct = Array.isArray(q.correct) ? q.correct[0] : q.correct;
      return { id, type: "multiple-choice", prompt: q.prompt, options: q.options, correct, explanation };
    }
    if (q.type === "multi" || q.type === "multi-select") {
      const correct = Array.isArray(q.correct) ? q.correct : [q.correct];
      return { id, type: "multi-select", prompt: q.prompt, options: q.options, correct, explanation };
    }
    if (q.type === "true-false") {
      return { id, type: "true-false", prompt: q.prompt, correct: q.correct, explanation };
    }
    // fallback — pass through unknown types (open-ended, etc.)
    return { id, ...q };
  });

  // preQuiz and tasks are already in the right shape (just need id on tasks)
  const preQuiz = (v.preQuiz || []).map((q, i) => ({
    prompt: q.prompt,
    options: q.options,
    correct: Array.isArray(q.correct) ? q.correct[0] : q.correct,
    sectionIndices: q.sectionIndices || [],
    explanation: q.explanation || "",
  }));
  const tasks = (v.tasks || []).map((t, i) => ({
    id: t.id || `${stageId}-task-${i}`,
    afterSectionIdx: t.afterSectionIdx ?? 0,
    title: t.title,
    instructions: t.instructions,
    doneWhen: t.doneWhen,
  }));

  normalized[stageId] = { quiz, preQuiz, tasks };
}

writeFileSync(output, JSON.stringify(normalized, null, 2));

// Print summary
const totals = Object.values(normalized).reduce(
  (acc, v) => {
    acc.q += v.quiz.length;
    acc.pq += v.preQuiz.length;
    acc.t += v.tasks.length;
    return acc;
  },
  { q: 0, pq: 0, t: 0 },
);
console.log(`✓ normalized: ${totals.q} quiz Qs, ${totals.pq} pre-quiz Qs, ${totals.t} tasks`);
