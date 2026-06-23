/**
 * Derive src/content/debates.ts from the claim ledger (claims.jsonl). The "Open debates"
 * view renders the CONTESTED claims — positions + arguments + sources — so a learner sees
 * the argument space, not just the consensus. Single source of truth = the ledger; this
 * codegen keeps the view in sync.
 *
 *   node scripts/derive-debates.mjs           # write src/content/debates.ts
 *   node scripts/derive-debates.mjs --check    # fail if the file is stale (CI guard)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const claims = readFileSync(join(root, "claims.jsonl"), "utf8")
  .split("\n").map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));

const contested = claims.filter((c) => c.kind === "contested" || c.verdict === "contested");

const debates = contested.map((c) => ({
  id: c.id,
  question: c.statement,
  positions: (c.positions ?? []).map((p) => ({ name: p.name, claim: p.claim, sources: p.sourceUrls ?? [] })),
  sources: c.sources ?? [],
  conceptIds: c.conceptIds ?? [],
}));

const body = `/**
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

export const DEBATES: Debate[] = ${JSON.stringify(debates, null, 2)};
`;

const target = join(root, "src/content/debates.ts");

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(target, "utf8"); } catch { /* missing */ }
  if (current.trim() !== body.trim()) {
    console.error("✗ debates.ts is stale — run: node scripts/derive-debates.mjs");
    process.exit(1);
  }
  console.log(`✓ debates.ts in sync (${debates.length} debates)`);
} else {
  writeFileSync(target, body);
  console.log(`✓ wrote src/content/debates.ts (${debates.length} debates: ${debates.map((d) => d.id).join(", ")})`);
}
