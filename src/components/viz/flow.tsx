/**
 * Shared React Flow building blocks for every node-link graph (the typed-graph
 * viz and the skill-tree homepage).
 *
 * WHY this exists: React Flow's default node has a single fixed source handle
 * (bottom) and target handle (top). When an edge points "upward" (target above
 * source) the edge is forced to leave the bottom and loop around to the top,
 * producing stub lines that appear to dangle into nowhere. `HandleNode` exposes
 * a source+target handle on all four sides; `pickHandles` chooses the pair
 * facing the other node, so an edge always leaves and enters the natural side.
 *
 * `AnnotatedEdge` draws the edge and a short label that is ALWAYS present, with
 * the fuller relation gloss available on hover (title attribute).
 */
import { Fragment } from "react";
import {
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type NodeProps,
  type EdgeProps,
} from "reactflow";

const SIDES = [
  { key: "t", pos: Position.Top },
  { key: "r", pos: Position.Right },
  { key: "b", pos: Position.Bottom },
  { key: "l", pos: Position.Left },
] as const;

/** A node with hidden source+target handles on all four sides. Visual styling
 *  (border/background/size) is applied by React Flow to the node wrapper via the
 *  node's `style`; this component only renders the label and the handles. */
export function HandleNode({ data }: NodeProps<{ label: React.ReactNode }>) {
  return (
    <div className="flow-node">
      {SIDES.map((s) => (
        <Fragment key={s.key}>
          <Handle id={`s-${s.key}`} type="source" position={s.pos} isConnectable={false} className="flow-handle" />
          <Handle id={`t-${s.key}`} type="target" position={s.pos} isConnectable={false} className="flow-handle" />
        </Fragment>
      ))}
      {data.label}
    </div>
  );
}

/** Choose the source/target handle ids facing each other, from the two node
 *  positions (top-left corners are fine — only the dominant direction matters). */
export function pickHandles(
  s: { x: number; y: number },
  t: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "s-r", targetHandle: "t-l" }
      : { sourceHandle: "s-l", targetHandle: "t-r" };
  }
  return dy >= 0
    ? { sourceHandle: "s-b", targetHandle: "t-t" }
    : { sourceHandle: "s-t", targetHandle: "t-b" };
}

export interface AnnotatedEdgeData {
  /** Short label drawn on the edge (always present). */
  short: string;
  /** Fuller gloss shown on hover. */
  verbose?: string;
  /** Label text color (matches the edge's layer). */
  color?: string;
}

/** Bezier edge whose label is always shown and whose fuller meaning is on hover. */
export function AnnotatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps<AnnotatedEdgeData>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {data?.short && (
        <EdgeLabelRenderer>
          <div
            className="flow-edge-label"
            title={data.verbose ?? data.short}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: data.color,
            }}
          >
            {data.short}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const flowNodeTypes = { hnode: HandleNode };
export const flowEdgeTypes = { annot: AnnotatedEdge };
