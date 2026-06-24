/**
 * TaskCard — inline hands-on task checkpoint rendered after a section.
 *
 * Non-blocking soft advisory: the learner can mark the task done or skip it.
 * State persists via recordTask. A task that was skipped can be re-opened and
 * marked done; a completed task can be undone.
 */
import type { HandsOnTask } from "../types";
import { recordTask, useProgress } from "../store/progress";
import { RichText } from "./Math";

export function TaskCard({ lessonId, task }: { lessonId: string; task: HandsOnTask }) {
  const progress = useProgress(lessonId);
  const status = progress.taskStates?.[task.id] ?? null;

  return (
    <div
      className={`task-card ${status === "done" ? "task-done" : status === "skipped" ? "task-skipped" : ""}`}
    >
      <div className="task-card-header">
        <span className="task-label">Hands-on task</span>
        <strong className="task-title">{task.title}</strong>
      </div>
      <div className="task-instructions">
        <RichText text={task.instructions} />
      </div>
      <div className="task-done-when">
        <span className="task-done-when-label">Done when:</span> {task.doneWhen}
      </div>
      {status === "done" ? (
        <div className="task-status-row">
          <span className="task-complete-badge">Completed</span>
          <button
            className="task-undo"
            onClick={() => recordTask(lessonId, task.id, null)}
          >
            Undo
          </button>
        </div>
      ) : status === "skipped" ? (
        <div className="task-status-row">
          <span className="task-skipped-badge">Skipped</span>
          <button
            className="task-mark-done"
            onClick={() => recordTask(lessonId, task.id, "done")}
          >
            Mark done
          </button>
        </div>
      ) : (
        <div className="task-actions">
          <button
            className="task-btn-done"
            onClick={() => recordTask(lessonId, task.id, "done")}
          >
            I did it
          </button>
          <button
            className="task-btn-skip"
            onClick={() => recordTask(lessonId, task.id, "skipped")}
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
