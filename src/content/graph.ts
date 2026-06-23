/**
 * Skill map (DERIVED, ADR-0003). The stage→stage prerequisite backbone is NOT hand-authored:
 * it's lifted from concepts.ts (introducedIn + prerequisites) via deriveStageEdges(), then
 * transitively reduced. Edit prerequisites in concepts.ts, never here. Only the stage nodes
 * (titles/positions), achievement edges, and soft orientation links below are manual.
 */
import type { SkillGraph, SkillNode, SkillEdge } from "../types";
import { deriveStageEdges, transitiveReduction } from "./derive";

const concept = (
  id: string, branch: SkillNode["branch"], lessonId: string, title: string,
  shortDescription: string, position: { x: number; y: number },
): SkillNode => ({ id, kind: "concept", branch, lessonId, title, shortDescription, position });

const achievement = (
  id: string, branch: SkillNode["branch"], title: string, shortDescription: string,
  assessmentIds: string[], position: { x: number; y: number },
): SkillNode => ({ id, kind: "achievement", branch, title, shortDescription, assessmentIds, position });

const NODES: SkillNode[] = [
  concept("c-orient", "orientation", "stage-0", "Start Here: One Tool, Many Front-ends", "A 2-min orientation you can skip and return to.", { x: 260, y: -150 }),
  concept("c-surfaces", "surfaces", "stage-1", "The Surfaces", "CLI, Desktop, Cowork, Codex — a menu, not a ladder.", { x: 40, y: 70 }),
  concept("c-config", "config", "stage-2", "Config as Code (.claude / AGENTS.md)", "The shared setup that lives in the repo.", { x: 320, y: 70 }),
  concept("c-caps", "capabilities", "stage-3", "Capabilities", "Skills, sub-agents, hooks, MCP — and portability to Codex.", { x: 320, y: 290 }),
  concept("c-dist", "distribution", "stage-4", "Sharing It (Plugins & Marketplace)", "Bundle and distribute the library.", { x: 80, y: 500 }),
  concept("c-gov", "governance", "stage-5", "Governance & Plan", "Managed settings, precedence, seats.", { x: 560, y: 290 }),
  concept("c-decision", "decision", "stage-6", "Decide: Your Team's Shared Setup", "The four-tier model → one shared library.", { x: 320, y: 540 }),

  achievement("a-setup", "decision", "Set Up Your Team's Shared AI Infrastructure", "Justify and lay out a shared setup across Claude + Codex.", ["cap-setup"], { x: 320, y: 740 }),
];

// the stage prerequisite backbone — DERIVED from concepts.ts (do not hand-edit)
const STAGE_TO_NODE: Record<string, string> = {};
for (const n of NODES) if (n.lessonId) STAGE_TO_NODE[n.lessonId] = n.id;

const DERIVED_PREREQS: [string, string][] = deriveStageEdges()
  .map(([a, b]) => [STAGE_TO_NODE[a], STAGE_TO_NODE[b]] as [string, string])
  .filter(([a, b]) => !!a && !!b);

// no extra pedagogical sequencing needed for this map (derivation covers it)
const CONCEPT_PREREQS: [string, string][] = transitiveReduction(
  Array.from(new Map(DERIVED_PREREQS.map((e) => [`${e[0]}>${e[1]}`, e])).values()),
);

// achievements are not concepts → their prerequisites are hand-authored
const ACHIEVEMENT_PREREQS: [string, string][] = [
  ["c-decision", "a-setup"],
  ["c-dist", "a-setup"],
  ["c-gov", "a-setup"],
];

const PREREQS: [string, string][] = [...CONCEPT_PREREQS, ...ACHIEVEMENT_PREREQS];

// soft, non-gating orientation links (dashed; not in unlock/ancestry/cycle logic)
const ORIENTS: [string, string][] = [
  ["c-orient", "c-surfaces"],
  ["c-orient", "c-config"],
];

const EDGES: SkillEdge[] = [
  ...PREREQS.map(([source, target], i) => ({ id: `e${i}`, source, target, kind: "prerequisite_for" as const })),
  ...ORIENTS.map(([source, target], i) => ({ id: `o${i}`, source, target, kind: "orients" as const })),
];

export const SKILL_GRAPH: SkillGraph = { nodes: NODES, edges: EDGES };

export const ROOT_GOAL_ID = "a-setup";

export function nodeById(id: string): SkillNode | undefined {
  return SKILL_GRAPH.nodes.find((n) => n.id === id);
}
export function nodeForLesson(lessonId: string): SkillNode | undefined {
  return SKILL_GRAPH.nodes.find((n) => n.lessonId === lessonId);
}
export function achievements(): SkillNode[] {
  return SKILL_GRAPH.nodes.filter((n) => n.kind === "achievement");
}
export function prereqsOf(id: string): string[] {
  return SKILL_GRAPH.edges.filter((e) => e.kind === "prerequisite_for" && e.target === id).map((e) => e.source);
}
export function ancestorsOf(id: string): Set<string> {
  const out = new Set<string>();
  const walk = (n: string) => { for (const p of prereqsOf(n)) if (!out.has(p)) { out.add(p); walk(p); } };
  walk(id);
  return out;
}
