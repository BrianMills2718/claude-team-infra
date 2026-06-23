/**
 * Personalized goals (MVP). Map a free-text goal to an existing achievement node
 * via a static keyword ruleset; selecting it highlights that achievement's
 * prerequisite sub-DAG. This curriculum has one capstone (a-setup), so most setup
 * intents resolve to it.
 */
import { nodeById } from "./graph";

interface Rule {
  match: RegExp;
  goal: string;
}

// Order matters: more specific intents first. (Single goal for now.)
const RULES: Rule[] = [
  { match: /set ?up|shared|team|infrastructure|infra|claude code|codex|plugin|marketplace|managed|govern|skill|hook|mcp|desktop|cowork|cli|agents?\.md|claude\.md/i, goal: "a-setup" },
];

export interface ResolvedGoal {
  goal: string;
  title: string;
}

/** Map free-text to an achievement goal, or null if nothing matches. */
export function resolveGoal(text: string): ResolvedGoal | null {
  const t = text.trim();
  if (!t) return null;
  for (const r of RULES) {
    if (r.match.test(t)) {
      const node = nodeById(r.goal);
      if (node) return { goal: r.goal, title: node.title };
    }
  }
  return null;
}
