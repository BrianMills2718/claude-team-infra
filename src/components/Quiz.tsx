/**
 * Quiz engine. Soft-gating by design: it records the score and whether the
 * learner got everything right, but never blocks the next lesson. Every question
 * gives immediate feedback with an explanation of *why* — and, where authored,
 * why a tempting wrong answer is wrong (the misconceptions are the point).
 */
import { useMemo, useState } from "react";
import type { QuizQuestion } from "../types";
import { recordQuiz } from "../store/progress";
import { RichLine } from "./Math";

type AnswerState = { correct: boolean } | null;

export function Quiz({
  lessonId,
  questions,
}: {
  lessonId: string;
  questions: QuizQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  const answered = Object.values(answers).filter(Boolean).length;
  const correct = Object.values(answers).filter((a) => a?.correct).length;

  function report(qid: string, isCorrect: boolean) {
    const next = { ...answers, [qid]: { correct: isCorrect } };
    setAnswers(next);
    const done = Object.values(next).filter(Boolean).length;
    const right = Object.values(next).filter((a) => a?.correct).length;
    if (done === questions.length) {
      recordQuiz(lessonId, right / questions.length, right === questions.length);
    }
  }

  return (
    <div className="quiz">
      <div className="quiz-progress">
        {answered}/{questions.length} answered · {correct} correct
      </div>
      {questions.map((q, i) => (
        <QuestionCard key={q.id} index={i + 1} q={q} onResolved={report} />
      ))}
    </div>
  );
}

function QuestionCard({
  index,
  q,
  onResolved,
}: {
  index: number;
  q: QuizQuestion;
  onResolved: (qid: string, correct: boolean) => void;
}) {
  return (
    <div className="quiz-q">
      <div className="quiz-q-prompt">
        <span className="quiz-q-num">{index}</span>
        <span>
          <RichLine text={q.prompt} />
        </span>
      </div>
      {q.type === "multiple-choice" && <MultipleChoice q={q} onResolved={onResolved} />}
      {q.type === "multi-select" && <MultiSelect q={q} onResolved={onResolved} />}
      {q.type === "true-false" && <TrueFalse q={q} onResolved={onResolved} />}
      {q.type === "classification" && <Classification q={q} onResolved={onResolved} />}
      {q.type === "fill-in" && <FillIn q={q} onResolved={onResolved} />}
      {q.type === "matching" && <Matching q={q} onResolved={onResolved} />}
    </div>
  );
}

function Feedback({ correct, explanation }: { correct: boolean; explanation: string }) {
  return (
    <div className={`quiz-feedback ${correct ? "ok" : "bad"}`}>
      <strong>{correct ? "Correct." : "Not quite."}</strong>{" "}
      <RichLine text={explanation} />
    </div>
  );
}

function MultipleChoice({
  q,
  onResolved,
}: {
  q: Extract<QuizQuestion, { type: "multiple-choice" }>;
  onResolved: (id: string, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  const isCorrect = picked === q.correct;
  return (
    <>
      <ul className="quiz-options">
        {q.options.map((opt, i) => {
          const state = !done
            ? ""
            : i === q.correct
              ? "opt-correct"
              : i === picked
                ? "opt-wrong"
                : "";
          return (
            <li key={i}>
              <button
                className={`quiz-opt ${state}`}
                disabled={done}
                onClick={() => {
                  setPicked(i);
                  onResolved(q.id, i === q.correct);
                }}
              >
                <RichLine text={opt} />
              </button>
            </li>
          );
        })}
      </ul>
      {done && (
        <>
          <Feedback correct={isCorrect} explanation={q.explanation} />
          {!isCorrect && q.wrongExplanations?.[String(picked)] && (
            <div className="quiz-why-wrong">
              <RichLine text={q.wrongExplanations[String(picked)]} />
            </div>
          )}
        </>
      )}
    </>
  );
}

function MultiSelect({
  q,
  onResolved,
}: {
  q: Extract<QuizQuestion, { type: "multi-select" }>;
  onResolved: (id: string, correct: boolean) => void;
}) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const correctSet = useMemo(() => new Set(q.correct), [q.correct]);
  const isCorrect =
    submitted &&
    sel.size === correctSet.size &&
    [...sel].every((i) => correctSet.has(i));

  return (
    <>
      <ul className="quiz-options">
        {q.options.map((opt, i) => {
          const checked = sel.has(i);
          const state = !submitted
            ? ""
            : correctSet.has(i)
              ? "opt-correct"
              : checked
                ? "opt-wrong"
                : "";
          return (
            <li key={i}>
              <label className={`quiz-opt quiz-opt-check ${state}`}>
                <input
                  type="checkbox"
                  disabled={submitted}
                  checked={checked}
                  onChange={() =>
                    setSel((s) => {
                      const n = new Set(s);
                      n.has(i) ? n.delete(i) : n.add(i);
                      return n;
                    })
                  }
                />
                <RichLine text={opt} />
              </label>
            </li>
          );
        })}
      </ul>
      {!submitted ? (
        <button
          className="quiz-submit"
          onClick={() => {
            setSubmitted(true);
            const ok =
              sel.size === correctSet.size && [...sel].every((i) => correctSet.has(i));
            onResolved(q.id, ok);
          }}
        >
          Check answer
        </button>
      ) : (
        <Feedback correct={isCorrect} explanation={q.explanation} />
      )}
    </>
  );
}

function TrueFalse({
  q,
  onResolved,
}: {
  q: Extract<QuizQuestion, { type: "true-false" }>;
  onResolved: (id: string, correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const done = picked !== null;
  return (
    <>
      <div className="quiz-tf">
        {[true, false].map((v) => {
          const state =
            !done ? "" : v === q.correct ? "opt-correct" : v === picked ? "opt-wrong" : "";
          return (
            <button
              key={String(v)}
              className={`quiz-opt ${state}`}
              disabled={done}
              onClick={() => {
                setPicked(v);
                onResolved(q.id, v === q.correct);
              }}
            >
              {v ? "True" : "False"}
            </button>
          );
        })}
      </div>
      {done && <Feedback correct={picked === q.correct} explanation={q.explanation} />}
    </>
  );
}

/** Normalize a free-text math answer so trivial notation differences match:
 *  drop LaTeX sizing/spacing commands, collapse whitespace, fold multiplication
 *  glyphs, and strip braces. So `S\big(S(S(S(0))+0)\big)` matches `S(S(S(S(0))+0))`. */
function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    // strip LaTeX sizing/spacing commands (with their backslash) first
    .replace(/\\(left|right|bigg?|bigg?l|bigg?r|quad|qquad|,|;|:|!|\s)/g, "")
    .replace(/\\/g, "") // any remaining backslashes
    .replace(/\s+/g, "")
    .replace(/·|×|\*|\\cdot/g, "*")
    .replace(/[{}]/g, "");
}

function FillIn({
  q,
  onResolved,
}: {
  q: Extract<QuizQuestion, { type: "fill-in" }>;
  onResolved: (id: string, correct: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const accepted = useMemo(() => q.accepted.map(normalizeAnswer), [q.accepted]);
  const isCorrect = submitted && accepted.includes(normalizeAnswer(text));

  return (
    <div className="quiz-fillin">
      {q.before && (
        <div className="fillin-context">
          <RichLine text={q.before} />
        </div>
      )}
      <div className="fillin-row">
        <input
          className="fillin-input"
          placeholder={q.placeholder ?? "your answer"}
          value={text}
          disabled={submitted}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim() && !submitted) {
              setSubmitted(true);
              onResolved(q.id, accepted.includes(normalizeAnswer(text)));
            }
          }}
        />
        {!submitted && (
          <button
            className="quiz-submit"
            disabled={!text.trim()}
            onClick={() => {
              setSubmitted(true);
              onResolved(q.id, accepted.includes(normalizeAnswer(text)));
            }}
          >
            Check
          </button>
        )}
      </div>
      {q.after && (
        <div className="fillin-context">
          <RichLine text={q.after} />
        </div>
      )}
      {submitted && (
        <>
          <Feedback correct={isCorrect} explanation={q.explanation} />
          {!isCorrect && (
            <div className="fillin-answer">
              Accepted answer: <RichLine text={q.accepted[0]} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Matching({
  q,
  onResolved,
}: {
  q: Extract<QuizQuestion, { type: "matching" }>;
  onResolved: (id: string, correct: boolean) => void;
}) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const allChosen = q.left.every((l) => choice[l.id]);
  const allRight = q.left.every((l) => choice[l.id] === q.pairs[l.id]);

  return (
    <>
      <table className="quiz-matching">
        <tbody>
          {q.left.map((l) => {
            const picked = choice[l.id];
            const right = picked === q.pairs[l.id];
            return (
              <tr key={l.id} className={submitted ? (right ? "row-ok" : "row-bad") : ""}>
                <td className="qm-left">
                  <RichLine text={l.label} />
                </td>
                <td className="qm-arrow">→</td>
                <td>
                  <select
                    disabled={submitted}
                    value={picked ?? ""}
                    onChange={(e) => setChoice((c) => ({ ...c, [l.id]: e.target.value }))}
                  >
                    <option value="" disabled>
                      choose…
                    </option>
                    {q.right.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!submitted ? (
        <button
          className="quiz-submit"
          disabled={!allChosen}
          onClick={() => {
            setSubmitted(true);
            onResolved(q.id, q.left.every((l) => choice[l.id] === q.pairs[l.id]));
          }}
        >
          Check answer
        </button>
      ) : (
        <Feedback correct={allRight} explanation={q.explanation} />
      )}
    </>
  );
}

function Classification({
  q,
  onResolved,
}: {
  q: Extract<QuizQuestion, { type: "classification" }>;
  onResolved: (id: string, correct: boolean) => void;
}) {
  // Each item gets a <select> for its bucket — simple, keyboard-accessible, and
  // avoids drag-and-drop a11y pitfalls.
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const allChosen = q.items.every((it) => choice[it.id]);

  return (
    <>
      <table className="quiz-classify">
        <tbody>
          {q.items.map((it) => {
            const picked = choice[it.id];
            const right = picked === it.correctBucket;
            return (
              <tr key={it.id} className={submitted ? (right ? "row-ok" : "row-bad") : ""}>
                <td className="qc-item">
                  <RichLine text={it.label} />
                </td>
                <td>
                  <select
                    disabled={submitted}
                    value={picked ?? ""}
                    onChange={(e) =>
                      setChoice((c) => ({ ...c, [it.id]: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      choose…
                    </option>
                    {q.buckets.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  {submitted && !right && (
                    <span className="qc-answer">→ {it.correctBucket}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!submitted ? (
        <button
          className="quiz-submit"
          disabled={!allChosen}
          onClick={() => {
            setSubmitted(true);
            const ok = q.items.every((it) => choice[it.id] === it.correctBucket);
            onResolved(q.id, ok);
          }}
        >
          Check answer
        </button>
      ) : (
        <Feedback
          correct={q.items.every((it) => choice[it.id] === it.correctBucket)}
          explanation={q.explanation}
        />
      )}
    </>
  );
}
