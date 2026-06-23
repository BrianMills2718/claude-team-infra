/**
 * ADR-0003 Phase A proof: derive the skill-map prerequisite edges from the
 * concept graph and diff them against the hand-authored ones in graph.ts.
 *
 * Reports (a) any concept cycles (SCCs > 1), and (b) how well the derived edges
 * explain the curated skill map, compared at the REACHABILITY/closure level
 * (not raw edges, since derivation produces transitive shortcuts the curated
 * DAG omits).
 *
 *   node scripts/derive-report.mjs
 */
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const out = join(tmpdir(), `godel-derive-${process.pid}.mjs`);
const stub = join(tmpdir(), `godel-derive-stub-${process.pid}.ts`);
writeFileSync(
  stub,
  `export { SKILL_GRAPH } from ${JSON.stringify(process.cwd() + "/src/content/graph.ts")};
   export { CONCEPT_GRAPH } from ${JSON.stringify(process.cwd() + "/src/content/concepts.ts")};
   export { conceptCycles, deriveStageEdges, reachability, goalClosure, sinks, GOAL_CONCEPTS } from ${JSON.stringify(process.cwd() + "/src/content/derive.ts")};`,
);
await build({ entryPoints: [stub], bundle: true, format: "esm", outfile: out, logLevel: "error" });
const { SKILL_GRAPH, CONCEPT_GRAPH, conceptCycles, deriveStageEdges, reachability, goalClosure, sinks, GOAL_CONCEPTS } = await import(pathToFileURL(out).href);

// stage/lesson id -> skill node id; and which nodes are concepts
const stageToNode = {};
const isConcept = new Set();
for (const n of SKILL_GRAPH.nodes) {
  if (n.lessonId) stageToNode[n.lessonId] = n.id;
  if (n.kind === "concept") isConcept.add(n.id);
}

// derived edges (stage ids) -> node ids
const derived = deriveStageEdges()
  .map(([a, b]) => [stageToNode[a], stageToNode[b]])
  .filter(([a, b]) => a && b);

// authored concept->concept prerequisite edges (exclude achievements/orients)
const authored = SKILL_GRAPH.edges
  .filter((e) => e.kind === "prerequisite_for" && isConcept.has(e.source) && isConcept.has(e.target))
  .map((e) => [e.source, e.target]);

const derivedReach = reachability(derived);
const authoredReach = reachability(authored);
const implies = (reach, a, b) => a === b || (reach[a] && reach[a].has(b));

const cycles = conceptCycles();

// authored edges the concept graph does NOT explain (b not reachable from a)
const unexplained = authored.filter(([a, b]) => !implies(derivedReach, a, b));
// derived direct edges not implied by the authored closure (extra structure)
const extra = derived.filter(([a, b]) => !implies(authoredReach, a, b));

const name = (id) => (SKILL_GRAPH.nodes.find((n) => n.id === id)?.title ?? id);

console.log(`\n=== ADR-0003 derivation report ===`);
console.log(`concept cycles (SCCs > 1): ${cycles.length}`);
for (const c of cycles) console.log(`  • { ${c.join(", ")} }`);

console.log(`\nderived skill-map edges (node-level, deduped): ${derived.length}`);
console.log(`authored concept→concept prerequisite edges:    ${authored.length}`);

console.log(`\nauthored edges NOT explained by the concept graph: ${unexplained.length}`);
for (const [a, b] of unexplained) console.log(`  ✗ ${name(a)}  →  ${name(b)}   (${a} → ${b})`);

console.log(`\nderived edges beyond the curated map's closure (extra/new): ${extra.length}`);
for (const [a, b] of extra) console.log(`  + ${name(a)}  →  ${name(b)}   (${a} → ${b})`);

const coverage = authored.length ? Math.round((100 * (authored.length - unexplained.length)) / authored.length) : 100;
console.log(`\n→ the concept graph explains ${coverage}% of the curated skill-map edges.`);

// goal-closure lens: core (on a goal's path) vs enrichment (off it)
const allConcepts = CONCEPT_GRAPH.concepts.map((c) => c.id);
const core = goalClosure(GOAL_CONCEPTS);
const enrichment = allConcepts.filter((id) => !core.has(id));
const undeclaredTerminals = sinks().filter((id) => !GOAL_CONCEPTS.includes(id));
console.log(`\n=== goal-closure lens (goals: ${GOAL_CONCEPTS.join(", ")}) ===`);
console.log(`core (on a goal's path): ${core.size} / ${allConcepts.length}`);
console.log(`enrichment (off the path): ${enrichment.length}`);
console.log(`  ${enrichment.join(", ")}`);
console.log(`graph sinks that are not declared goals (enrichment leaves / candidate goals): ${undeclaredTerminals.length}`);
console.log(`  ${undeclaredTerminals.join(", ")}`);

rmSync(out, { force: true });
rmSync(stub, { force: true });
