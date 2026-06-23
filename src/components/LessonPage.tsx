/**
 * Renders one lesson, in the pedagogical order the spec mandates: objectives →
 * definitions → explanation → visualizations → common-confusion boxes → quiz →
 * mastery checkpoint, with prev/next navigation. Pure presentation over the
 * Lesson data object.
 */
import { useEffect } from "react";
import type { Lesson } from "../types";
import { LESSONS } from "../content/lessons";
import { RichText, RichLine } from "./Math";
import { VizRenderer } from "./viz/VizRenderer";
import { Quiz } from "./Quiz";
import { NotationPanel, ConceptPanel, PrereqPretest } from "./Definitions";
import { markVisited, useProgress } from "../store/progress";

export function LessonPage({ lesson }: { lesson: Lesson }) {
  const progress = useProgress(lesson.id);

  useEffect(() => {
    markVisited(lesson.id);
    document.getElementById("main")?.scrollTo({ top: 0 });
  }, [lesson.id]);

  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];

  return (
    <article className="lesson">
      <header className="lesson-head">
        <div className="lesson-stage-badge">Stage {lesson.stage}</div>
        <h2 className="lesson-title">{lesson.title}</h2>
        <p className="lesson-summary">
          <RichLine text={lesson.summary} />
        </p>
        {lesson.prerequisites.length > 0 && (
          <p className="lesson-prereq">
            Prerequisite:{" "}
            {lesson.prerequisites
              .map((id) => LESSONS.find((l) => l.id === id)?.title ?? id)
              .join(", ")}
          </p>
        )}
      </header>

      <PrereqPretest lesson={lesson} />
      <ConceptPanel lesson={lesson} />
      <NotationPanel lesson={lesson} />

      <section className="lesson-block">
        <h3>What you'll be able to do</h3>
        <ul className="objectives">
          {lesson.objectives.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ul>
      </section>

      <section className="lesson-block">
        <h3>Definitions</h3>
        <dl className="definitions">
          {lesson.definitions.map((d) => (
            <div className="def" key={d.term}>
              <dt>{d.term}</dt>
              <dd>
                <RichLine text={d.short} />
                {d.expanded && (
                  <span className="def-expanded">
                    {" "}
                    <RichLine text={d.expanded} />
                  </span>
                )}
                {d.example && (
                  <div className="def-example">
                    e.g. <RichLine text={d.example} />
                  </div>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {lesson.sections.map((s, i) => (
        <section className="lesson-block prose" key={i}>
          {s.heading && <h3>{s.heading}</h3>}
          <RichText text={s.body} />
        </section>
      ))}

      {lesson.visualizations.map((v) => (
        <section className="lesson-block" key={v.id}>
          <VizRenderer viz={v} />
        </section>
      ))}

      {lesson.confusions.length > 0 && (
        <section className="lesson-block">
          <h3>Common confusions</h3>
          <div className="confusions">
            {lesson.confusions.map((c, i) => (
              <div className="confusion" key={i}>
                <div className="confusion-wrong">
                  <span className="confusion-tag tag-wrong">myth</span>
                  <RichLine text={c.misconception} />
                </div>
                <div className="confusion-right">
                  <span className="confusion-tag tag-right">actually</span>
                  <RichLine text={c.correction} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="lesson-block">
        <h3>Check yourself</h3>
        <Quiz lessonId={lesson.id} questions={lesson.quiz} />
      </section>

      <section className={`mastery ${progress.mastered ? "is-mastered" : ""}`}>
        <span className="mastery-icon">{progress.mastered ? "✓" : "◎"}</span>
        <div>
          <strong>Mastery checkpoint</strong>
          <p>{lesson.masteryCheckpoint}</p>
          {progress.mastered ? (
            <p className="mastery-done">You aced this quiz. Ready for the next stage.</p>
          ) : (
            <p className="mastery-hint">
              Recommended before moving on — but navigation is never locked.
            </p>
          )}
        </div>
      </section>

      <nav className="lesson-nav" aria-label="Lesson navigation">
        {prev ? (
          <a className="lnav prev" href={`#/${prev.id}`}>
            ← Stage {prev.stage}: {prev.title}
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a className="lnav next" href={`#/${next.id}`}>
            Stage {next.stage}: {next.title} →
          </a>
        )}
      </nav>
    </article>
  );
}
