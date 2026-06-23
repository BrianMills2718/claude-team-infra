/**
 * Left navigation. The skill tree is the home; the sidebar offers a quick link
 * back to it, the current goal + progress, and the "recommended path" (the
 * concept nodes in topological/ladder order) with per-node state dots.
 */
import { LESSONS } from "../content/lessons";
import { nodeForLesson, nodeById } from "../content/graph";
import { useSkillView, nodeStateOf } from "../store/skillProgress";

type Route = { kind: "tree" } | { kind: "node"; id: string } | { kind: "concepts" };

export function Sidebar({ route, onOpenGlossary }: { route: Route; onOpenGlossary: () => void }) {
  const { passed, goalId, recommended } = useSkillView();
  const currentId = route.kind === "node" ? route.id : undefined;
  const goal = nodeById(goalId);

  return (
    <nav className="sidebar" aria-label="Navigation">
      <div className="sidebar-head">
        <h1 className="brand">The Concept Ladder</h1>
        <p className="brand-sub">A skill map for Gödel's incompleteness.</p>
      </div>

      <a href="#/tree" className={`tree-link ${route.kind === "tree" ? "active" : ""}`}>
        ⌂ Skill Tree
      </a>
      <a href="#/concepts" className={`tree-link ${route.kind === "concepts" ? "active" : ""}`}>
        ⟢ Concept Graph
      </a>

      <div className="sidebar-goal">
        <span className="sg-label">Goal</span>
        <span className="sg-title">{goal?.title ?? "—"}</span>
        <span className="sg-progress">{passed.size} / {LESSONS.length + 13} nodes passed</span>
      </div>

      <div className="nav-section">Recommended path</div>
      <ol className="nav-list">
        {LESSONS.map((l) => {
          const node = nodeForLesson(l.id);
          if (!node) return null;
          const state = node.id === recommended ? "current" : nodeStateOf(node.id, passed);
          return (
            <li key={node.id}>
              <a
                href={`#/node/${node.id}`}
                className={`nav-item ${node.id === currentId ? "active" : ""}`}
                aria-current={node.id === currentId ? "page" : undefined}
              >
                <span className={`nav-dot dot-${state}`} aria-hidden />
                <span className="nav-title">{node.title}</span>
                {state === "passed" && <span className="nav-check">✓</span>}
                {state === "current" && <span className="nav-rec">★</span>}
              </a>
            </li>
          );
        })}
      </ol>

      <div className="sidebar-foot">
        <button className="glossary-btn" onClick={onOpenGlossary}>📖 Glossary <kbd>g</kbd></button>
      </div>
    </nav>
  );
}
