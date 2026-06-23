/**
 * The concept graph itself (ADR-0003/0004), rendered with the shared React Flow
 * engine. Nodes are laid out by curriculum STAGE (x = stage column), with a
 * stage's concepts ordered top-to-bottom by dependency. Stage layout keeps
 * unrelated concepts apart (e.g. `decidable`, stage 11, sits far from `alphabet`,
 * stage 1) rather than colliding in a shared depth-0 column.
 *
 *   - solid arrow  P → C : C has prerequisite P (arrow runs prereq → dependent)
 *   - dashed line  A — B : A and B contrast (mutual; not a dependency)
 *   - double border       : the concept is in a dependency cycle — a modeling
 *                           error to fix (acyclic is enforced, so this is a
 *                           visual linter that should never light up)
 *
 * Hover any edge to read the relationship; click a concept to highlight + label
 * its dependencies (what it requires, what needs it) and inspect it.
 */
import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { CONCEPT_GRAPH, CONCEPT_BY_ID, conceptTopoOrder, prereqWhy, prereqKindOf, PREREQ_KINDS, type PrereqKind } from "../content/concepts";
import { conceptSCCs, goalClosure } from "../content/derive";

/** Color per prerequisite kind (ADR-0005), used for the edge + the legend. */
const KIND_COLOR: Record<PrereqKind, string> = {
  "is-a": "#2563eb",
  "part-of": "#7c3aed",
  "defined-via": "#0891b2",
  "operates-on": "#059669",
  "refines": "#d97706",
  "assumes": "#db2777",
};
import { LAYER_META } from "./viz/legend";
import { flowNodeTypes, flowEdgeTypes, pickHandles } from "./viz/flow";
import { RichLine } from "./Math";

const stageNum = (id: string): number => {
  const m = (CONCEPT_BY_ID[id]?.introducedIn ?? "").match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

/** Layout by curriculum stage: x = stage column, y = dependency order within the
 *  stage (global simplest-first rank). Grouping by stage keeps a stage's concepts
 *  together and unrelated ones apart. */
function layout(): Record<string, { x: number; y: number }> {
  const rank: Record<string, number> = {};
  conceptTopoOrder().forEach((id, i) => (rank[id] = i));
  const byStage: Record<number, string[]> = {};
  for (const c of CONCEPT_GRAPH.concepts) (byStage[stageNum(c.id)] ??= []).push(c.id);
  const pos: Record<string, { x: number; y: number }> = {};
  for (const k of Object.keys(byStage)) {
    const col = Number(k);
    byStage[col]
      .sort((a, b) => rank[a] - rank[b])
      .forEach((id, i) => {
        pos[id] = { x: col * 230 + 20, y: i * 80 + 20 };
      });
  }
  return pos;
}

const plain = (s: string) => s.replace(/@[cnt]\{([^}|]+)(?:\|[^}]+)?\}/g, "$1").replace(/\$/g, "");

export function ConceptGraphView() {
  const [sel, setSel] = useState<string | null>(null);
  const [coreOnly, setCoreOnly] = useState(false);
  const positions = useMemo(layout, []);
  const core = useMemo(() => goalClosure(), []);
  const clusterOf = useMemo(() => {
    const m: Record<string, number> = {};
    conceptSCCs().forEach((comp, i) => {
      if (comp.length > 1) comp.forEach((id) => (m[id] = i));
    });
    return m;
  }, []);

  const nodes: Node[] = useMemo(
    () =>
      CONCEPT_GRAPH.concepts.map((c) => {
        const meta = LAYER_META[c.layer];
        const inCluster = clusterOf[c.id] !== undefined;
        const enrichment = !core.has(c.id);
        return {
          id: c.id,
          type: "hnode",
          position: positions[c.id],
          data: {
            label: (
              <div className="cg-node-inner" title={plain(c.short)}>
                <span className="cg-node-term">{c.term}</span>
                {inCluster && <span className="cg-cluster">⟲ cluster</span>}
                {enrichment && <span className="cg-enrich">enrichment</span>}
              </div>
            ),
          },
          style: {
            borderColor: meta.color,
            borderWidth: inCluster ? 3 : 2,
            borderStyle: enrichment ? "dashed" : inCluster ? "double" : "solid",
            borderRadius: 8,
            background: "#fff",
            padding: 6,
            fontSize: 12,
            width: 152,
            opacity: coreOnly && enrichment ? 0.18 : 1,
          },
        };
      }),
    [positions, clusterOf, core, coreOnly],
  );

  const edges: Edge[] = useMemo(() => {
    const es: Edge[] = [];
    for (const c of CONCEPT_GRAPH.concepts) {
      for (const p of c.prerequisites) {
        if (!positions[p]) continue;
        const incident = sel === c.id || sel === p;
        const dimmed = sel !== null && !incident;
        const kind = prereqKindOf(c.id, p) ?? "is-a";
        const kcolor = KIND_COLOR[kind];
        es.push({
          id: `pq-${p}-${c.id}`,
          type: "annot",
          source: p,
          target: c.id,
          ...pickHandles(positions[p], positions[c.id]),
          data: {
            short: kind, // semantic kind is the always-on label (ADR-0005)
            verbose: `${c.term} ${kind} ${CONCEPT_BY_ID[p]?.term ?? p} — ${prereqWhy(c.id, p) ?? "(unannotated)"}`,
            color: kcolor,
          },
          style: { stroke: kcolor, strokeWidth: incident ? 2.75 : 1.5, opacity: dimmed ? 0.1 : 0.9 },
          markerEnd: { type: MarkerType.ArrowClosed, color: kcolor },
          zIndex: incident ? 10 : 0,
        });
      }
    }
    // contrast edges, one per unordered pair
    const seen = new Set<string>();
    for (const c of CONCEPT_GRAPH.concepts) {
      for (const x of c.contrasts ?? []) {
        const key = [c.id, x].sort().join("|");
        if (seen.has(key) || !positions[x]) continue;
        seen.add(key);
        const incident = sel === c.id || sel === x;
        const dimmed = sel !== null && !incident;
        es.push({
          id: `ct-${key}`,
          type: "annot",
          source: c.id,
          target: x,
          ...pickHandles(positions[c.id], positions[x]),
          data: {
            short: "contrasts",
            verbose: `${c.term} ↔ ${CONCEPT_BY_ID[x]?.term ?? x}: understood against each other (not a dependency)`,
            color: "#64748b",
          },
          style: { stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "4 4", opacity: dimmed ? 0.1 : 0.7 },
        });
      }
    }
    return es;
  }, [positions, sel]);

  const selected = sel ? CONCEPT_BY_ID[sel] : null;
  const neededBy = selected
    ? CONCEPT_GRAPH.concepts.filter((c) => c.prerequisites.includes(selected.id)).map((c) => c.term)
    : [];

  return (
    <div className="concept-graph-view">
      <header className="cgv-head">
        <h2>Concept graph</h2>
        <p>
          The source of truth (ADR-0003/0004/0005): every concept and what it depends on; the skill map
          is <em> derived</em> from this. Each prerequisite arrow runs prerequisite → dependent and is
          labelled + coloured by its <strong>kind</strong>; <strong>hover an edge</strong> for the full
          justification, <strong>click a concept</strong> to isolate its dependencies. Laid out by stage.
        </p>
        <ul className="cgv-legend cgv-kinds">
          {PREREQ_KINDS.map((k) => (
            <li key={k}>
              <span className="cgv-kind-swatch" style={{ background: KIND_COLOR[k] }} /> {k}
            </li>
          ))}
          <li><span className="cgv-key dashed" /> contrasts (mutual, not a dependency)</li>
          <li><span className="cgv-key cluster" /> in a dependency cycle (a modeling error — should not appear)</li>
          <li>
            <button
              type="button"
              className={`cgv-toggle ${coreOnly ? "is-on" : ""}`}
              onClick={() => setCoreOnly((v) => !v)}
              aria-pressed={coreOnly}
            >
              {coreOnly ? "showing core only" : "core only"}
            </button>
            <span className="cgv-enrich-key"> — dashed border = <em>enrichment</em> (off the path to the goals)</span>
          </li>
        </ul>
      </header>

      <div className="cgv-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes}
          edgeTypes={flowEdgeTypes}
          onNodeClick={(_, n) => setSel(n.id)}
          onPaneClick={() => setSel(null)}
          fitView
          nodesDraggable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#eef2f7" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {selected && (
        <aside className="cgv-inspect" role="dialog" aria-label={`Concept: ${selected.term}`}>
          <button className="cgv-close" onClick={() => setSel(null)} aria-label="Close">×</button>
          <div className="cgv-inspect-term">{selected.term}</div>
          <div className="cgv-inspect-role">
            {core.has(selected.id) ? "● core — on the path to a goal" : "○ enrichment — off the goal path"}
          </div>
          <div className="cgv-inspect-def"><RichLine text={selected.short} /></div>
          {selected.example && (
            <div className="cgv-inspect-eg">e.g. <RichLine text={selected.example} /></div>
          )}
          <div className="cgv-inspect-meta">
            requires:
            {selected.prerequisites.length ? (
              <ul className="cgv-req-list">
                {selected.prerequisites.map((p) => (
                  <li key={p}>
                    <strong>{CONCEPT_BY_ID[p]?.term ?? p}</strong>
                    {prereqWhy(selected.id, p) ? ` — ${prereqWhy(selected.id, p)}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              " — (primitive)"
            )}
          </div>
          <div className="cgv-inspect-meta">
            needed by: {neededBy.length ? neededBy.join(", ") : "—"}
          </div>
          {selected.contrasts?.length ? (
            <div className="cgv-inspect-meta">
              contrasts: {selected.contrasts.map((x) => CONCEPT_BY_ID[x]?.term ?? x).join(", ")}
            </div>
          ) : null}
        </aside>
      )}
    </div>
  );
}
