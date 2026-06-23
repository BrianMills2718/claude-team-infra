/**
 * Typed-graph renderer (React Flow). Used ONLY for genuine node-link graphs
 * (the layer map, proof DAGs, the Gödel loop, metatheory) — parse trees and
 * tables have their own components.
 *
 * The contract this component enforces visually: a node's *layer* sets its
 * color + border, and an edge's *type* sets its line style + color. That is the
 * anti-category-error guarantee — `formed_from` can never look like `satisfies`.
 */
import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import type { TypedGraphViz } from "../../types";
import { EDGE_META, LAYER_META } from "./legend";
import { RichLine } from "../Math";
import { flowNodeTypes, flowEdgeTypes, pickHandles } from "./flow";

/** Deterministic layered layout when a node has no explicit position: group by
 *  layer into columns, stack within a column. Hand-laid diagrams override via
 *  node.position. */
function autoLayout(viz: TypedGraphViz): Record<string, { x: number; y: number }> {
  const cols: Record<string, number> = {};
  const order = viz.layers;
  const pos: Record<string, { x: number; y: number }> = {};
  viz.nodes.forEach((n) => {
    if (n.position) {
      pos[n.id] = n.position;
      return;
    }
    const col = Math.max(0, order.indexOf(n.layer));
    const row = (cols[n.layer] = (cols[n.layer] ?? 0) + 1);
    pos[n.id] = { x: 60 + col * 240, y: 40 + (row - 1) * 90 };
  });
  return pos;
}

export function TypedGraph({ viz }: { viz: TypedGraphViz }) {
  const positions = useMemo(() => autoLayout(viz), [viz]);

  const nodes: Node[] = useMemo(
    () =>
      viz.nodes.map((n) => {
        const meta = LAYER_META[n.layer];
        return {
          id: n.id,
          type: "hnode",
          position: positions[n.id],
          data: {
            label: (
              <div className="tg-node-inner" title={n.note}>
                <span className="tg-node-type">{n.type}</span>
                <span className="tg-node-label">
                  <RichLine text={n.label} />
                </span>
              </div>
            ),
          },
          style: {
            borderColor: meta.color,
            borderWidth: 2,
            borderStyle: "solid",
            borderRadius: 8,
            background: "#fff",
            padding: 6,
            fontSize: 12,
            width: 180,
          },
        };
      }),
    [viz, positions],
  );

  const edges: Edge[] = useMemo(
    () =>
      viz.edges.map((e) => {
        const meta = LAYER_META[e.layer];
        const em = EDGE_META[e.type];
        const handles = pickHandles(positions[e.source], positions[e.target]);
        return {
          id: e.id,
          type: "annot",
          source: e.source,
          target: e.target,
          ...handles,
          data: {
            short: e.label ?? em.label,
            verbose: e.label ? `${e.label} — ${em.verbose}` : em.verbose,
            color: meta.color,
          },
          style: {
            stroke: meta.color,
            strokeWidth: 2,
            strokeDasharray: em.dash,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: meta.color },
        };
      }),
    [viz, positions],
  );

  return (
    <div className="typed-graph">
      <div className="tg-canvas" role="img" aria-label={viz.textualSummary}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes}
          edgeTypes={flowEdgeTypes}
          fitView
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} color="#eef2f7" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <Legend layers={viz.layers} edgeTypes={[...new Set(viz.edges.map((e) => e.type))]} />
    </div>
  );
}

function Legend({
  layers,
  edgeTypes,
}: {
  layers: TypedGraphViz["layers"];
  edgeTypes: (keyof typeof EDGE_META)[];
}) {
  return (
    <div className="tg-legend">
      <div className="tg-legend-col">
        <h4>Layers (node color)</h4>
        <ul>
          {layers.map((l) => (
            <li key={l}>
              <span className="swatch" style={{ background: LAYER_META[l].color }} />
              <strong>{LAYER_META[l].label}</strong> — {LAYER_META[l].blurb}
            </li>
          ))}
        </ul>
      </div>
      <div className="tg-legend-col">
        <h4>Relations (edge style)</h4>
        <ul>
          {edgeTypes.map((t) => (
            <li key={t}>
              <svg width="34" height="10" aria-hidden>
                <line
                  x1="2"
                  y1="5"
                  x2="32"
                  y2="5"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeDasharray={EDGE_META[t].dash}
                />
              </svg>
              <code>{t}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
