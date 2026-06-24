/**
 * PreQuizGate — diagnostic questions shown BEFORE lesson content.
 *
 * Correct answers collapse the sections they cover so learners can skip
 * material they already know. The collapse is advisory and overridable with
 * "Expand all". Results are persisted via recordPreQuiz so the gate shows
 * the same outcome on re-visit.
 *
 * Also exports `collapsedByPreQuiz` — a pure helper used by LessonPage to
 * decide which section indices should start collapsed.
 */
import { useState } from "react";
import type { Lesson, PreQuizQuestion } from "../types";
import { recordPreQuiz, useProgress } from "../store/progress";

// ---------------------------------------------------------------------------
// Pure helper — used by LessonPage
// ---------------------------------------------------------------------------

export function collapsedByPreQuiz(lesson: Lesson, preQuizCorrect: number[]): Set<number> {
  if (!lesson.preQuiz) return new Set();
  const collapsed = new Set<number>();
  lesson.preQuiz.forEach((q, qi) => {
    if (preQuizCorrect.includes(qi)) {
      q.sectionIndices.forEach((si) => collapsed.add(si));
    }
  });
  return collapsed;
}

// ---------------------------------------------------------------------------
// Internal components
// ---------------------------------------------------------------------------

function PQQuestion({
  q,
  index,
  onAnswer,
  answered,
}: {
  q: PreQuizQuestion;
  index: number;
  onAnswer: (qi: number, chosen: number) => void;
  answered: number | null;
}) {
  const done = answered !== null;

  return (
    <div className="pq-question">
      <div className="pq-prompt">{q.prompt}</div>
      <ul className="pq-options">
        {q.options.map((opt, oi) => {
          let cls = "pq-opt";
          if (done) {
            if (oi === q.correct) cls += " pq-opt-correct";
            else if (oi === answered) cls += " pq-opt-wrong";
          }
          if (oi === answered) cls += " pq-opt-chosen";
          return (
            <li key={oi}>
              <button
                className={cls}
                disabled={done}
                onClick={() => onAnswer(index, oi)}
              >
                {done && oi === answered && (oi === q.correct ? "✓ " : "✗ ")}
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {done && (
        <div className={`pq-result ${answered === q.correct ? "pq-result-correct" : "pq-result-wrong"}`}>
          {q.explanation}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported gate component
// ---------------------------------------------------------------------------

export function PreQuizGate({ lesson }: { lesson: Lesson }) {
  if (!lesson.preQuiz || lesson.preQuiz.length === 0) return null;
  const questions: PreQuizQuestion[] = lesson.preQuiz;

  const progress = useProgress(lesson.id);
  const persistedCorrect = progress.preQuizCorrect ?? [];
  // preQuizCorrect is set to [] (even for 0 correct) on completion; undefined = not yet taken.
  const hasCompletedBefore = progress.preQuizCorrect !== undefined;

  // retaking resets to blank quiz regardless of prior completion
  const [retaking, setRetaking] = useState(false);

  // answers: question index → chosen option index (null = unanswered)
  const [answers, setAnswers] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(questions.map((_, i) => [i, null]))
  );
  const [localCorrect, setLocalCorrect] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState(false);
  const [recorded, setRecorded] = useState(false);

  // If already completed and not retaking, show the summary directly.
  if (hasCompletedBefore && !retaking) {
    const coveredCount = (() => {
      const s = new Set<number>();
      questions.forEach((q, qi) => {
        if (persistedCorrect.includes(qi)) q.sectionIndices.forEach((si) => s.add(si));
      });
      return s.size;
    })();
    return (
      <div className="pre-quiz pre-quiz-done">
        <div className="pq-header">
          <span className="pq-label">Pre-quiz complete</span>
          <button className="pq-skip" onClick={() => setRetaking(true)}>
            Retake
          </button>
        </div>
        <div className="pq-summary">
          You got {persistedCorrect.length}/{questions.length} correct —{" "}
          {coveredCount}/{lesson.sections.length} sections collapsed below.
        </div>
      </div>
    );
  }

  const allAnswered = questions.every((_, i) => answers[i] !== null);
  const correctIndices = Array.from(localCorrect);

  function handleAnswer(qi: number, chosen: number) {
    const isCorrect = chosen === questions[qi].correct;
    const nextAnswers = { ...answers, [qi]: chosen };
    const nextLocalCorrect = new Set(localCorrect);
    if (isCorrect) nextLocalCorrect.add(qi);

    setAnswers(nextAnswers);
    setLocalCorrect(nextLocalCorrect);

    const nowAllAnswered = questions.every((_, i) => nextAnswers[i] !== null);
    if (nowAllAnswered && !recorded) {
      recordPreQuiz(lesson.id, Array.from(nextLocalCorrect));
      setRecorded(true);
    }
  }

  const effectiveCorrect = Array.from(new Set([...persistedCorrect, ...correctIndices]));
  const effectiveCoveredCount = (() => {
    const s = new Set<number>();
    questions.forEach((q, qi) => {
      if (effectiveCorrect.includes(qi)) q.sectionIndices.forEach((si) => s.add(si));
    });
    return s.size;
  })();

  return (
    <div className="pre-quiz">
      <div className="pq-header">
        <span className="pq-label">Quick check — what do you already know?</span>
        {!allAnswered && !skipped && (
          <button className="pq-skip" onClick={() => setSkipped(true)}>
            Skip pre-quiz / start reading
          </button>
        )}
      </div>
      {!skipped &&
        questions.map((q, qi) => (
          <PQQuestion
            key={qi}
            q={q}
            index={qi}
            onAnswer={handleAnswer}
            answered={answers[qi] ?? null}
          />
        ))}
      {allAnswered && !skipped && (
        <div className="pq-summary">
          You already know {effectiveCoveredCount}/{lesson.sections.length} sections — they're
          collapsed below.
        </div>
      )}
    </div>
  );
}
