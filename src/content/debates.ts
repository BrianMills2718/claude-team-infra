/**
 * Open debates — DERIVED from claims.jsonl (the contested entries) by
 * scripts/derive-debates.mjs. DO NOT EDIT BY HAND; edit the ledger and re-run.
 * Rendered by the #/debates view so learners see positions + arguments, not just consensus.
 */

export interface DebatePosition {
  name: string;
  claim: string;
  sources: string[];
}
export interface Debate {
  id: string;
  question: string;
  positions: DebatePosition[];
  sources: string[];
  conceptIds: string[];
}

export const DEBATES: Debate[] = [];
