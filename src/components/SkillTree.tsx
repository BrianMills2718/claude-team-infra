/**
 * The skill-tree homepage — the primary navigation (ADR-0001).
 *
 * Renders the prerequisite DAG with React Flow. Node appearance encodes state
 * (passed / available / locked / current-recommended); achievements are gold.
 * Picking a goal dims everything outside that goal's prerequisite sub-DAG and
 * pulses the recommended next node. Clicking an unlocked node opens it; clicking
 * a locked node explains what's missing.
 */
import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { SKILL_GRAPH, ancestorsOf, achievements, nodeById } from "../content/graph";
import { useSkillView, nodeStateOf, setGoal, missingPrereqs } from "../store/skillProgress";
import { resolveGoal } from "../content/goalMap";
import { RichLine } from "./Math";
import { flowNodeTypes, flowEdgeTypes, pickHandles } from "./viz/flow";

const POS: Record<string, { x: number; y: number }> = Object.fromEntries(
  SKILL_GRAPH.nodes.map((n) => [n.id, n.position ?? { x: 0, y: 0 }]),
);

const STATE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  passed: { bg: "#ecfdf5", border: "#10b981", color: "#065f46" },
  available: { bg: "#ffffff", border: "#2563eb", color: "#1e3a8a" },
  locked: { bg: "#f1f5f9", border: "#cbd5e1", color: "#94a3b8" },
};

export function SkillTree() {
  const { passed, goalId, recommended } = useSkillView();
  const [why, setWhy] = useState<{ id: string; missing: string[] } | null>(null);
  const [goalText, setGoalText] = useState("");
  const [goalMiss, setGoalMiss] = useState(false);

  function applyTypedGoal() {
    const r = resolveGoal(goalText);
    if (r) {
      setGoal(r.goal);
      setGoalMiss(false);
      setGoalText("");
    } else {
      setGoalMiss(true);
    }
  }

  const scope = useMemo(() => {
    const s = new Set<string>([goalId, ...ancestorsOf(goalId)]);
    // The orientation map is a global overview — always in scope (never dimmed).
    for (const n of SKILL_GRAPH.nodes) if (n.branch === "setup-onboarding") s.add(n.id);
    return s;
  }, [goalId]);

  const nodes: Node[] = useMemo(
    () =>
      SKILL_GRAPH.nodes.map((n) => {
        const state = n.id === recommended ? "current" : nodeStateOf(n.id, passed);
        const base = STATE_STYLE[state === "current" ? "available" : state];
        const inScope = scope.has(n.id);
        const isAchv = n.kind === "achievement";
        return {
          id: n.id,
          type: "hnode",
          position: n.position ?? { x: 0, y: 0 },
          data: {
            label: (
              <div className="st-node-inner">
                <span className="st-node-kind">{isAchv ? "◆ achievement" : n.branch}</span>
                <span className="st-node-title">{n.title}</span>
                <span className="st-node-desc">{n.shortDescription}</span>
                <span className="st-node-state">{state}</span>
              </div>
            ),
          },
          style: {
            background: isAchv && state !== "locked" ? "#fffbeb" : base.bg,
            border: `2px ${state === "locked" ? "dashed" : "solid"} ${isAchv && state !== "locked" ? "#d97706" : base.border}`,
            borderRadius: isAchv ? 14 : 8,
            boxShadow: n.id === recommended ? "0 0 0 4px rgba(217,119,6,.35)" : undefined,
            color: base.color,
            width: 186,
            padding: 8,
            fontSize: 12,
            opacity: inScope ? 1 : 0.25,
          },
        };
      }),
    [passed, recommended, scope],
  );

  const edges: Edge[] = useMemo(
    () =>
      SKILL_GRAPH.edges.map((e) => {
        const orients = e.kind === "orients";
        const visible = scope.has(e.source) && scope.has(e.target);
        return {
          id: e.id,
          type: "annot",
          source: e.source,
          target: e.target,
          ...pickHandles(POS[e.source], POS[e.target]),
          data: {
            short: orients ? "orients" : "prerequisite",
            verbose: orients
              ? "a soft, non-gating pointer from the overview map to a starting concept"
              : "the source node must be passed before the target unlocks",
            color: "#94a3b8",
          },
          markerEnd: orients
            ? { type: MarkerType.Arrow, color: "#cbd5e1" }
            : { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          style: {
            stroke: "#cbd5e1",
            strokeWidth: 1.5,
            strokeDasharray: orients ? "3 4" : undefined,
            opacity: visible ? (orients ? 0.5 : 0.9) : 0.12,
          },
        };
      }),
    [scope],
  );

  function onNodeClick(_: unknown, node: Node) {
    const state = nodeStateOf(node.id, passed);
    if (state === "locked") {
      setWhy({ id: node.id, missing: missingPrereqs(node.id, passed) });
      return;
    }
    window.location.hash = `#/node/${node.id}`;
  }

  return (
    <div className="skill-tree">
      <p className="st-intro">
        Choose a goal, then start with the highlighted <strong>available</strong> node. Each node you
        pass unlocks the next prerequisite. The map's job is to take you from <em>the surfaces</em> to a
        justified <em>shared setup across Claude Code and Codex</em> — one decision, in the right tiers.
      </p>
      <div className="st-toolbar">
        <div className="st-goal">
          <label htmlFor="goal">Goal:</label>
          <select id="goal" value={goalId} onChange={(e) => setGoal(e.target.value)}>
            {achievements().map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
        <div className="st-goal-text">
          <input
            placeholder="…or type what you want to understand"
            value={goalText}
            onChange={(e) => { setGoalText(e.target.value); setGoalMiss(false); }}
            onKeyDown={(e) => e.key === "Enter" && applyTypedGoal()}
            aria-label="Type a goal"
          />
          <button onClick={applyTypedGoal} disabled={!goalText.trim()}>Set</button>
          {goalMiss && <span className="st-goal-miss">couldn't map — try the dropdown</span>}
        </div>
        <div className="st-progress">{passed.size} / {SKILL_GRAPH.nodes.length} passed</div>
        <Legend />
      </div>

      <div className="st-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes}
          edgeTypes={flowEdgeTypes}
          onNodeClick={onNodeClick}
          fitView
          nodesDraggable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={22} color="#eef2f7" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {why && (
        <div className="st-why" role="dialog" aria-label="Why is this locked?">
          <button className="st-why-close" onClick={() => setWhy(null)} aria-label="Close">×</button>
          <strong><RichLine text={nodeById(why.id)?.title ?? why.id} /></strong> is locked.
          <p>Pass these prerequisites first:</p>
          <ul>
            {why.missing.map((m) => (
              <li key={m}>
                <a href={`#/node/${m}`} onClick={() => setWhy(null)}>{nodeById(m)?.title ?? m}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="st-legend" aria-hidden>
      <span><i className="sw" style={{ background: "#ecfdf5", borderColor: "#10b981" }} /> passed</span>
      <span><i className="sw" style={{ background: "#fff", borderColor: "#2563eb" }} /> available</span>
      <span><i className="sw" style={{ background: "#f1f5f9", borderColor: "#cbd5e1", borderStyle: "dashed" }} /> locked</span>
      <span><i className="sw" style={{ background: "#fffbeb", borderColor: "#d97706", borderRadius: 6 }} /> achievement</span>
      <span><i className="sw ring" /> recommended</span>
    </div>
  );
}
