/**
 * Progress persistence.
 *
 * WHY localStorage + a tiny pub/sub instead of a state library: progress is a
 * small, flat, per-lesson record; no backend exists (and none is wanted). A
 * 40-line store keeps the dependency surface minimal. Gating is *soft* — we
 * record quiz results and completion but never block navigation; the UI only
 * *recommends* mastery.
 */
import { useSyncExternalStore } from "react";

export interface LessonProgress {
  /** Best fraction of quiz questions answered correctly across attempts
   *  (monotonic — see recordQuiz, which takes the max). */
  quizScore: number;
  /** True once the learner has answered every quiz question correctly on any
   *  attempt (sticky — never un-sets). */
  mastered: boolean;
  /** True once the lesson page has been opened (for the sidebar dot). */
  visited: boolean;
}

type ProgressMap = Record<string, LessonProgress>;

const KEY = "godel-ladder:progress:v1";

/**
 * Shared default for an unvisited lesson. MUST be a stable singleton: it is
 * returned from the useSyncExternalStore getSnapshot, and returning a fresh
 * object each call makes React think the snapshot changed every render —
 * an infinite re-render loop ("getSnapshot should be cached"). Frozen so a
 * caller can't mutate the shared instance.
 */
const EMPTY: LessonProgress = Object.freeze({ quizScore: 0, mastered: false, visited: false });

function load(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

let state: ProgressMap = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled — keep working in-memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getProgress(lessonId: string): LessonProgress {
  return state[lessonId] ?? EMPTY;
}

export function markVisited(lessonId: string) {
  const cur = getProgress(lessonId);
  if (cur.visited) return;
  state = { ...state, [lessonId]: { ...cur, visited: true } };
  emit();
}

export function recordQuiz(lessonId: string, score: number, mastered: boolean) {
  const cur = getProgress(lessonId);
  state = {
    ...state,
    [lessonId]: {
      ...cur,
      quizScore: Math.max(cur.quizScore, score),
      mastered: cur.mastered || mastered,
    },
  };
  emit();
}

export function resetAllProgress() {
  state = {};
  emit();
}

/** React hook: re-renders the caller whenever any progress changes. */
export function useProgress(lessonId: string): LessonProgress {
  return useSyncExternalStore(subscribe, () => getProgress(lessonId));
}

/** Hook over the whole map (for the sidebar). */
export function useAllProgress(): ProgressMap {
  return useSyncExternalStore(subscribe, () => state);
}
