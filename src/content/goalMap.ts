import { nodeById } from "./graph";
const RULES = [{ match: /.*/i, goal: "a-goal" }];
export interface ResolvedGoal { goal: string; title: string }
export function resolveGoal(text: string): ResolvedGoal | null {
  const t = text.trim(); if (!t) return null;
  for (const r of RULES) if (r.match.test(t)) { const n = nodeById(r.goal); if (n) return { goal: r.goal, title: n.title }; }
  return null;
}
