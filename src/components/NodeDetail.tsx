/**
 * Node detail (ADR-0001). Concept nodes render the existing reviewed lesson
 * content (LessonPage) with a node header + completion bridge. Achievement nodes
 * render their capstone: prompt, deterministic check (reused Quiz engine), and —
 * for open-ended parts — a written answer (graded by the LLM judge in Phase C;
 * self-attested for now). Passing an achievement marks the node passed.
 */
import { useEffect, useState } from "react";
import { nodeById } from "../content/graph";
import { lessonById } from "../content/lessons";
import { ASSESSMENT_BY_ID, RUBRICS } from "../content/assessments";
import type { SkillNode, AssessmentTask } from "../types";
import { LessonPage } from "./LessonPage";
import { Quiz } from "./Quiz";
import { RichLine, RichText } from "./Math";
import { useProgress } from "../store/progress";
import { markNodePassed, useSkillView } from "../store/skillProgress";
import { nodeById as graphNode } from "../content/graph";
import { gradeAnswer } from "../lib/judge";
import type { JudgeResult } from "../types";

export function NodeDetail({ nodeId }: { nodeId: string }) {
  const node = nodeById(nodeId);
  if (!node) {
    return (
      <div className="node-detail">
        <p>Unknown node. <a href="#/tree">← Back to the skill tree</a></p>
      </div>
    );
  }
  return node.kind === "achievement" ? (
    <AchievementView node={node} />
  ) : (
    <ConceptView node={node} />
  );
}

function NodeHeader({ node, kind }: { node: SkillNode; kind: string }) {
  return (
    <div className="nd-bar">
      <a className="nd-back" href="#/tree">← Skill tree</a>
      <span className="nd-branch">{node.branch}</span>
      <span className="nd-kind">{kind}</span>
    </div>
  );
}

function ConceptView({ node }: { node: SkillNode }) {
  const lesson = node.lessonId ? lessonById(node.lessonId) : undefined;
  const lp = useProgress(node.lessonId ?? "");
  const { passed } = useSkillView();
  const isPassed = passed.has(node.id);

  // Bridge: when the lesson's quiz is mastered, the concept node is passed.
  useEffect(() => {
    if (lp.mastered) markNodePassed(node.id);
  }, [lp.mastered, node.id]);

  if (!lesson) return <div className="node-detail"><NodeHeader node={node} kind="concept" /><p>Missing content.</p></div>;

  return (
    <div className="node-detail">
      <NodeHeader node={node} kind="concept" />
      <LessonPage lesson={lesson} />
      <div className="nd-complete">
        {isPassed ? (
          <span className="nd-passed">✓ Concept passed — it now unlocks its dependents on the tree.</span>
        ) : (
          <button className="nd-complete-btn" onClick={() => { markNodePassed(node.id); window.location.hash = "#/tree"; }}>
            Mark this concept complete →
          </button>
        )}
      </div>
    </div>
  );
}

function AchievementView({ node }: { node: SkillNode }) {
  const taskId = node.assessmentIds?.[0];
  const task = taskId ? ASSESSMENT_BY_ID[taskId] : undefined;
  const { passed } = useSkillView();
  const isPassed = passed.has(node.id);

  if (!task) return <div className="node-detail"><NodeHeader node={node} kind="achievement" /><p>No assessment.</p></div>;

  return (
    <div className="node-detail">
      <NodeHeader node={node} kind="achievement" />
      <article className="achievement">
        <div className="lesson-stage-badge ach-badge">◆ Achievement</div>
        <h2 className="lesson-title">{node.title}</h2>
        <p className="lesson-summary">{node.shortDescription}</p>
        <div className="ach-meta">
          <span className="ach-fmt">{task.kind === "deterministic" ? "Auto-graded" : task.kind === "llm-judged" ? "Written explanation" : "Auto-graded + written explanation"}</span>
          <span className="ach-thresh">Pass: {Math.round(task.passThreshold * 100)}%, with no category-error misconception</span>
        </div>

        <section className="lesson-block">
          <h3>Task</h3>
          <RichText text={task.prompt} />
        </section>

        <Capstone task={task} nodeId={node.id} alreadyPassed={isPassed} />

        {task.fatalMisconceptions.length > 0 && (
          <section className="lesson-block">
            <h3>Misconceptions this task checks for</h3>
            <ul className="ach-fatal">
              {task.fatalMisconceptions.map((m) => <li key={m.id}><RichLine text={m.description} /></li>)}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}

function Capstone({ task, nodeId, alreadyPassed }: { task: AssessmentTask; nodeId: string; alreadyPassed: boolean }) {
  // Deterministic component mastery is recorded under the task id in the lesson
  // progress store (reusing the Quiz engine).
  const detProgress = useProgress(task.id);
  const detPassed = !task.deterministic || detProgress.mastered;
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [backendDown, setBackendDown] = useState(false);
  const [attested, setAttested] = useState(false);

  const rubric = task.openEnded ? RUBRICS[task.openEnded.rubricId] : undefined;

  async function submitForGrading() {
    setGrading(true);
    setResult(null);
    try {
      const r = await gradeAnswer(task.id, answer);
      setResult(r);
      setBackendDown(false);
      if (r.passed && detPassed) markNodePassed(nodeId); // earned
    } catch {
      setBackendDown(true); // degrade to self-attest
    } finally {
      setGrading(false);
    }
  }

  // Claim is available when: deterministic-only and det passed; or judge passed;
  // or (backend down) det passed + self-attested a substantive answer.
  const judgePassed = !!result?.passed;
  const fallbackOk = backendDown && answer.trim().length > 40 && attested;
  const canClaim =
    !alreadyPassed && detPassed && (!task.openEnded || judgePassed || fallbackOk);

  return (
    <>
      {task.deterministic && (
        <section className="lesson-block">
          <h3>Check</h3>
          <Quiz lessonId={task.id} questions={task.deterministic} />
        </section>
      )}

      {task.openEnded && (
        <section className="lesson-block">
          <h3>Explain</h3>
          <RichText text={task.openEnded.prompt} />
          <textarea
            className="ach-answer"
            placeholder="Write your explanation…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={7}
          />
          {rubric && (
            <details className="rollup ach-rubric">
              <summary className="rollup-summary">What a strong answer covers</summary>
              <ul className="rollup-body">
                {rubric.criteria.map((c) => <li key={c.id}>{c.description} <em>({c.maxScore})</em></li>)}
              </ul>
            </details>
          )}

          {!backendDown && (
            <button
              className="quiz-submit"
              disabled={grading || answer.trim().length < 40}
              onClick={submitForGrading}
            >
              {grading ? "Grading…" : result ? "Re-submit" : "Submit for grading"}
            </button>
          )}

          {result && <JudgeFeedback result={result} />}

          {backendDown && (
            <div className="ach-degraded">
              <p>The grading service isn't reachable, so this explanation can't be
                AI-graded right now. You can self-assess against the criteria above and
                proceed, or try again later when grading is available.</p>
              <label className="ach-attest">
                <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
                I've written a complete explanation and checked it against the criteria.
              </label>
            </div>
          )}
        </section>
      )}

      <div className="nd-complete">
        {alreadyPassed || (judgePassed && detPassed) ? (
          <span className="nd-passed">✓ Achievement earned.</span>
        ) : (
          <button
            className="nd-complete-btn"
            disabled={!canClaim}
            onClick={() => { markNodePassed(nodeId); window.location.hash = "#/tree"; }}
          >
            Claim achievement →
          </button>
        )}
        {!canClaim && !alreadyPassed && !(judgePassed && detPassed) && (
          <p className="ach-blocked">
            {task.deterministic && !detPassed ? "Pass the check above. " : ""}
            {task.openEnded && !judgePassed && !backendDown ? "Submit your explanation for grading." : ""}
            {task.openEnded && backendDown && !fallbackOk ? "Write your explanation and confirm." : ""}
          </p>
        )}
      </div>
    </>
  );
}

function JudgeFeedback({ result }: { result: JudgeResult }) {
  return (
    <div className={`judge-result ${result.passed ? "ok" : "bad"}`}>
      <div className="jr-head">
        <span className="jr-verdict">{result.passed ? "✓ Passed" : "Not yet"}</span>
        <span className="jr-score">{Math.round(result.score)}/100</span>
        <span className="jr-conf">confidence: {result.confidence}</span>
      </div>
      <p className="jr-feedback"><RichLine text={result.feedbackForLearner} /></p>
      {result.detectedMisconceptions.length > 0 && (
        <p className="jr-misc">Flagged: {result.detectedMisconceptions.join(", ")}</p>
      )}
      {result.suggestedRemediationNodeIds.length > 0 && (
        <p className="jr-remed">
          Revisit:{" "}
          {result.suggestedRemediationNodeIds.map((id, i) => (
            <span key={id}>
              {i > 0 && ", "}
              <a href={`#/node/${id}`}>{graphNode(id)?.title ?? id}</a>
            </span>
          ))}
        </p>
      )}
      {result.followUpQuestion && (
        <p className="jr-followup"><strong>Follow-up:</strong> <RichLine text={result.followUpQuestion} /></p>
      )}
    </div>
  );
}
