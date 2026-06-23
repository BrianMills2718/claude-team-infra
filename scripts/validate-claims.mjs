/**
 * Claim-ledger gate (RESEARCH_LOOP.md, phase 3-5). The structural validator proves the
 * concept graph is internally consistent; this gate proves the load-bearing assertions
 * behind it are externally CORRECT and CURRENT. Fails the build on:
 *   - verdict open|wrong (wrong must be fixed in content, then re-verified to confirmed)
 *   - wrong without a correctStatement
 *   - fact/perishable with no sources
 *   - contested with < 2 positions
 *   - asOf older than the refresh horizon (perishability)
 *   - conceptIds that don't resolve to a real concept
 *
 * Run: node scripts/validate-claims.mjs   (REFRESH_DAYS=365 NOW=YYYY-MM-DD optional)
 */
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const REFRESH_DAYS = Number(process.env.REFRESH_DAYS ?? 365);
const NOW = process.env.NOW ? new Date(process.env.NOW) : new Date();

// --- load concept ids (bundle concepts.ts like the content validator does) ---
const out = join(tmpdir(), `cti-claims-${process.pid}.mjs`);
const stub = join(tmpdir(), `cti-claims-stub-${process.pid}.ts`);
writeFileSync(stub, `export { CONCEPT_GRAPH } from ${JSON.stringify(process.cwd() + "/src/content/concepts.ts")};`);
await build({ entryPoints: [stub], bundle: true, format: "esm", outfile: out, logLevel: "error" });
const { CONCEPT_GRAPH } = await import(pathToFileURL(out).href);
const conceptIds = new Set(CONCEPT_GRAPH.concepts.map((c) => c.id));
rmSync(out, { force: true });
rmSync(stub, { force: true });

// --- load ledger ---
const path = join(process.cwd(), "claims.jsonl");
const lines = readFileSync(path, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };
const ids = new Set();
const VERDICTS = new Set(["confirmed", "wrong", "contested", "unverifiable", "open"]);
const KINDS = new Set(["fact", "plan", "perishable", "contested"]);

let n = 0;
for (const line of lines) {
  let c;
  try { c = JSON.parse(line); } catch (e) { errors.push(`unparseable line: ${line.slice(0, 80)}…`); continue; }
  n++;
  const id = c.id ?? `(line ${n})`;
  ok(!!c.id, `${id}: missing id`);
  ok(!ids.has(c.id), `${id}: duplicate id`); ids.add(c.id);
  ok(typeof c.statement === "string" && c.statement.length > 0, `${id}: missing statement`);
  ok(KINDS.has(c.kind), `${id}: invalid/missing kind "${c.kind}"`);
  ok(VERDICTS.has(c.verdict), `${id}: invalid/missing verdict "${c.verdict}"`);

  // the core gate: nothing may ship open or wrong
  ok(c.verdict !== "open", `${id}: verdict is OPEN — verify it or drop it before shipping`);
  ok(c.verdict !== "wrong", `${id}: verdict is WRONG — fix the content, then re-verify to confirmed`);
  if (c.verdict === "wrong")
    ok(typeof c.correctStatement === "string" && c.correctStatement.length > 0, `${id}: wrong verdict needs a correctStatement`);

  // sourcing
  const sources = Array.isArray(c.sources) ? c.sources : [];
  if (c.kind === "fact" || c.kind === "perishable")
    ok(sources.length > 0, `${id}: ${c.kind} claim has no sources`);

  // contestation must name >= 2 positions
  if (c.kind === "contested" || c.verdict === "contested") {
    const pos = Array.isArray(c.positions) ? c.positions : [];
    ok(pos.length >= 2, `${id}: contested claim needs >= 2 named positions (has ${pos.length})`);
    for (const p of pos) ok(p && p.name && p.claim, `${id}: a position is missing name/claim`);
  }

  // perishability horizon
  if (c.asOf) {
    const age = (NOW - new Date(c.asOf)) / 86400000;
    ok(!Number.isNaN(age), `${id}: asOf "${c.asOf}" is not a date`);
    ok(age <= REFRESH_DAYS, `${id}: asOf ${c.asOf} is ${Math.round(age)}d old (> ${REFRESH_DAYS}d horizon) — re-verify`);
  } else {
    ok(false, `${id}: missing asOf`);
  }

  // traceability: conceptIds must resolve
  for (const cid of c.conceptIds ?? [])
    ok(conceptIds.has(cid), `${id}: conceptId "${cid}" is not a concept`);
}

if (errors.length) {
  console.error(`✗ claim ledger: ${errors.length} problem(s) across ${n} claims`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
const byKind = {};
for (const line of lines) { const k = JSON.parse(line).kind; byKind[k] = (byKind[k] ?? 0) + 1; }
console.log(`✓ claim ledger valid: ${n} claims (${Object.entries(byKind).map(([k, v]) => `${v} ${k}`).join(", ")}), all sourced/current, 0 open/wrong`);
