/** Gate the concept graph (methodology Step 2-4) before it goes into the framework.
 *  Checks: referential integrity · acyclicity · justification completeness · group coherence.
 *  Pure-node text parse of concepts.ts (no deps). Run: node verify.mjs */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./concepts.ts", import.meta.url), "utf8");
const [conceptsRegion, whyRegion = ""] = src.split("export const PREREQ_WHY");

// --- parse concepts ---
const concepts = {};
for (const block of conceptsRegion.split(/\{\s*id:/).slice(1)) {
  const id = block.match(/^\s*"([^"]+)"/)?.[1];
  if (!id) continue;
  const group = block.match(/group:\s*"([^"]+)"/)?.[1];
  const prereqs = (block.match(/prerequisites:\s*\[([^\]]*)\]/)?.[1] || "")
    .match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];
  const contrasts = (block.match(/contrasts:\s*\[([^\]]*)\]/)?.[1] || "")
    .match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) || [];
  concepts[id] = { id, group, prereqs, contrasts };
}
const ids = new Set(Object.keys(concepts));
const whyKeys = new Set([...whyRegion.matchAll(/"([^">]+>[^"]+)":/g)].map((m) => m[1]));

let fail = 0;
const bad = (m) => { console.error("  ✗", m); fail++; };

// 1. referential integrity
for (const c of Object.values(concepts)) {
  for (const p of c.prereqs) if (!ids.has(p)) bad(`${c.id}: prerequisite "${p}" is not a concept`);
  for (const k of c.contrasts) if (!ids.has(k)) bad(`${c.id}: contrast "${k}" is not a concept`);
}
for (const k of whyKeys) {
  const [a, b] = k.split(">");
  if (!ids.has(a) || !ids.has(b)) bad(`PREREQ_WHY "${k}" references a non-concept`);
}

// 2. acyclicity (DFS over prerequisites)
const WHITE = 0, GREY = 1, BLACK = 2, color = {};
let cycle = null;
const visit = (u, path) => {
  color[u] = GREY;
  for (const v of concepts[u].prereqs) {
    if (color[v] === GREY) { cycle = [...path, u, v].join(" → "); return; }
    if (!color[v]) { visit(v, [...path, u]); if (cycle) return; }
  }
  color[u] = BLACK;
};
for (const id of ids) if (!color[id]) { visit(id, []); if (cycle) break; }
if (cycle) bad(`cycle in prerequisites: ${cycle}`);

// 3. justification completeness (every edge ↔ exactly one PREREQ_WHY)
const edges = new Set();
for (const c of Object.values(concepts)) for (const p of c.prereqs) edges.add(`${c.id}>${p}`);
for (const e of edges) if (!whyKeys.has(e)) bad(`edge ${e} has no PREREQ_WHY`);
for (const k of whyKeys) if (!edges.has(k)) bad(`PREREQ_WHY "${k}" is not an actual edge (orphan)`);

// 4. group coherence (group-lifted prerequisite graph acyclic)
const gedges = {};
for (const c of Object.values(concepts)) for (const p of c.prereqs) {
  const gc = c.group, gp = concepts[p].group;
  if (gc && gp && gc !== gp) (gedges[gp] ??= new Set()).add(gc); // prereq-group → dependent-group
}
const groups = [...new Set(Object.values(concepts).map((c) => c.group))];
const gcolor = {}; let gcycle = null;
const gvisit = (u, path) => {
  gcolor[u] = GREY;
  for (const v of (gedges[u] || [])) {
    if (gcolor[v] === GREY) { gcycle = [...path, u, v].join(" → "); return; }
    if (!gcolor[v]) { gvisit(v, [...path, u]); if (gcycle) return; }
  }
  gcolor[u] = BLACK;
};
for (const g of groups) if (!gcolor[g]) { gvisit(g, []); if (gcycle) break; }
if (gcycle) bad(`group-level cycle (mis-grouping): ${gcycle}`);

// report
console.log(`concepts: ${ids.size} · edges: ${edges.size} · groups: ${groups.length} (${groups.join(", ")})`);
console.log(fail ? `\n✗ ${fail} gate failure(s)` : "\n✓ gates pass: referential integrity · acyclic · every edge justified · group-coherent");
process.exit(fail ? 1 : 0);
