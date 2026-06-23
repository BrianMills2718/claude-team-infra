/**
 * Skill-DAG progress: which nodes the learner has passed, the current goal, and
 * the derived node state (passed / available / locked) + recommended next node.
 *
 * A node is `passed` when explicitly marked (a concept node when its lesson is
 * mastered; an achievement when its capstone passes). `available` when every
 * prerequisite is passed. Stable getSnapshot refs (the EMPTY-singleton lesson
 * from progress.ts) so React never infinite-loops.
 */
import { useSyncExternalStore } from "react";
import type { NodeState } from "../types";
import { ROOT_GOAL_ID, prereqsOf, ancestorsOf, nodeById } from "../content/graph";

interface SkillState {
  passed: string[];
  goalId: string;
}

const KEY = "godel-ladder:skill:v1";
const EMPTY_STATE: SkillState = Object.freeze({ passed: [], goalId: ROOT_GOAL_ID });

function load(): SkillState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { passed: [], goalId: ROOT_GOAL_ID };
    const p = JSON.parse(raw) as SkillState;
    return { passed: p.passed ?? [], goalId: p.goalId ?? ROOT_GOAL_ID };
  } catch {
    return { passed: [], goalId: ROOT_GOAL_ID };
  }
}

let state: SkillState = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage disabled — keep working in-memory */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSkillState(): SkillState {
  return state;
}

export function markNodePassed(nodeId: string) {
  if (state.passed.includes(nodeId)) return;
  state = { ...state, passed: [...state.passed, nodeId] };
  emit();
}

export function setGoal(goalId: string) {
  if (state.goalId === goalId) return;
  state = { ...state, goalId };
  emit();
}

export function resetSkillProgress() {
  state = { passed: [], goalId: ROOT_GOAL_ID };
  emit();
}

/** Derive a node's state from the passed set. `current` is layered on top by the
 *  UI for the single recommended-next node. */
export function nodeStateOf(nodeId: string, passed: Set<string>): NodeState {
  if (passed.has(nodeId)) return "passed";
  const reqs = prereqsOf(nodeId);
  return reqs.every((r) => passed.has(r)) ? "available" : "locked";
}

/** The recommended next node toward the goal: an available, not-yet-passed node
 *  inside the goal's prerequisite sub-DAG (or the goal itself). Concept nodes are
 *  preferred over achievements; ties broken by fewest remaining prerequisites. */
export function recommendedNext(goalId: string, passed: Set<string>): string | undefined {
  const inScope = new Set<string>([goalId, ...ancestorsOf(goalId)]);
  const candidates = [...inScope].filter(
    (id) => !passed.has(id) && nodeStateOf(id, passed) === "available",
  );
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => {
    const ka = nodeById(a)?.kind === "concept" ? 0 : 1;
    const kb = nodeById(b)?.kind === "concept" ? 0 : 1;
    if (ka !== kb) return ka - kb;
    return prereqsOf(a).length - prereqsOf(b).length;
  });
  return candidates[0];
}

/** Missing (unpassed) direct prerequisites of a locked node — for "why locked?". */
export function missingPrereqs(nodeId: string, passed: Set<string>): string[] {
  return prereqsOf(nodeId).filter((r) => !passed.has(r));
}

// --- React hooks (stable snapshots) ---

export function useSkillState(): SkillState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY_STATE);
}

/** Convenience: the passed set + goal + recommended-next, all derived. */
export function useSkillView() {
  const s = useSkillState();
  const passed = new Set(s.passed);
  const recommended = recommendedNext(s.goalId, passed);
  return { passed, goalId: s.goalId, recommended };
}
