/**
 * The ordered lesson list (one per stage) and a lookup. The skill map is the
 * primary navigation; this linear order is one topological sort of it.
 */
import type { Lesson } from "../../types";
import { stage0, stage1, stage2, stage3, stage4, stage5, stage6 } from "./claude";

export const LESSONS: Lesson[] = [stage0, stage1, stage2, stage3, stage4, stage5, stage6];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
