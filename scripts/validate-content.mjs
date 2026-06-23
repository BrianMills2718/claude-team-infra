/**
 * Content validator. Bundles the lesson + glossary modules with esbuild (already
 * present as a Vite dependency) and asserts structural invariants that the type
 * system can't fully enforce at the value level:
 *   - stages 0..16 all present, unique ids
 *   - quiz answer indices in range; classification correctBuckets exist
 *   - typed-graph edges reference existing node ids
 *   - every visualization has a non-empty textualSummary (a11y fallback)
 *
 * Run: node scripts/validate-content.mjs
 */
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const out = join(tmpdir(), `godel-content-${process.pid}.mjs`);

// Bundle a tiny stub that re-exports the two modules we want to inspect.
// (esbuild handles extensionless + .ts imports + `import type` for us.)
const stub = join(tmpdir(), `godel-stub-${process.pid}.ts`);
writeFileSync(
  stub,
  `export { LESSONS } from ${JSON.stringify(process.cwd() + "/src/content/lessons/index.ts")};
   export { GLOSSARY } from ${JSON.stringify(process.cwd() + "/src/content/glossary.ts")};
   export { NOTATION } from ${JSON.stringify(process.cwd() + "/src/content/notation.ts")};
   export { SKILL_GRAPH, ROOT_GOAL_ID } from ${JSON.stringify(process.cwd() + "/src/content/graph.ts")};
   export { ASSESSMENTS, ASSESSMENT_BY_ID, RUBRICS } from ${JSON.stringify(process.cwd() + "/src/content/assessments.ts")};
   export { CONCEPT_GRAPH, PREREQ_WHY, PREREQ_KIND, PREREQ_KINDS } from ${JSON.stringify(process.cwd() + "/src/content/concepts.ts")};`,
);
await build({
  entryPoints: [stub],
  bundle: true,
  format: "esm",
  outfile: out,
  logLevel: "error",
});

const { LESSONS, GLOSSARY, NOTATION, SKILL_GRAPH, ROOT_GOAL_ID, ASSESSMENT_BY_ID, RUBRICS, CONCEPT_GRAPH, PREREQ_WHY, PREREQ_KIND, PREREQ_KINDS } = await import(pathToFileURL(out).href);

const errors = [];
const ok = (cond, msg) => { if (!cond) errors.push(msg); };

// --- skill DAG invariants (ADR-0001) ---
{
  const lessonIds = new Set(LESSONS.map((l) => l.id));
  const nodeIds = new Set();
  for (const n of SKILL_GRAPH.nodes) {
    ok(!nodeIds.has(n.id), `graph: duplicate node id ${n.id}`);
    nodeIds.add(n.id);
    if (n.kind === "concept" || n.kind === "skill")
      ok(lessonIds.has(n.lessonId), `graph: node ${n.id} lessonId "${n.lessonId}" not a real stage`);
    if (n.kind === "achievement")
      ok(Array.isArray(n.assessmentIds) && n.assessmentIds.length > 0, `graph: achievement ${n.id} has no assessmentIds`);
  }
  // edges reference existing nodes
  for (const e of SKILL_GRAPH.edges) {
    ok(nodeIds.has(e.source), `graph: edge ${e.id} bad source ${e.source}`);
    ok(nodeIds.has(e.target), `graph: edge ${e.id} bad target ${e.target}`);
  }
  // acyclic (DFS over prerequisite_for)
  const adj = {};
  for (const id of nodeIds) adj[id] = [];
  for (const e of SKILL_GRAPH.edges) if (e.kind === "prerequisite_for") adj[e.source].push(e.target);
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = {};
  for (const id of nodeIds) color[id] = WHITE;
  let cycle = null;
  const visit = (u, path) => {
    color[u] = GREY;
    for (const v of adj[u]) {
      if (color[v] === GREY) { cycle = [...path, u, v].join(" → "); return; }
      if (color[v] === WHITE) { visit(v, [...path, u]); if (cycle) return; }
    }
    color[u] = BLACK;
  };
  for (const id of nodeIds) { if (color[id] === WHITE) visit(id, []); if (cycle) break; }
  ok(!cycle, `graph: prerequisite cycle: ${cycle}`);
  // every achievement reachable from a root (a node with no prereqs)
  const hasPrereq = new Set(SKILL_GRAPH.edges.filter((e) => e.kind === "prerequisite_for").map((e) => e.target));
  const roots = [...nodeIds].filter((id) => !hasPrereq.has(id));
  const reach = new Set(roots);
  const q = [...roots];
  while (q.length) { const u = q.shift(); for (const v of adj[u]) if (!reach.has(v)) { reach.add(v); q.push(v); } }
  for (const n of SKILL_GRAPH.nodes)
    if (n.kind === "achievement") ok(reach.has(n.id), `graph: achievement ${n.id} unreachable from roots`);
  ok(nodeIds.has(ROOT_GOAL_ID), `graph: ROOT_GOAL_ID ${ROOT_GOAL_ID} is not a node`);

  // assessments: each achievement's assessmentIds resolve; each task targets an
  // achievement node; remediation + rubric refs resolve.
  for (const n of SKILL_GRAPH.nodes) {
    if (n.kind !== "achievement") continue;
    for (const aid of n.assessmentIds ?? [])
      ok(!!ASSESSMENT_BY_ID[aid], `graph: achievement ${n.id} → unknown assessment ${aid}`);
  }
  for (const t of Object.values(ASSESSMENT_BY_ID)) {
    const target = SKILL_GRAPH.nodes.find((n) => n.id === t.nodeId);
    ok(target && target.kind === "achievement", `assessment ${t.id}: nodeId ${t.nodeId} is not an achievement node`);
    if (t.openEnded) ok(!!RUBRICS[t.openEnded.rubricId], `assessment ${t.id}: unknown rubric ${t.openEnded.rubricId}`);
    for (const m of t.fatalMisconceptions)
      for (const r of m.remediationNodeIds)
        ok(nodeIds.has(r), `assessment ${t.id}: misconception ${m.id} → unknown remediation node ${r}`);
  }
}

// Every @n{key}/@t{slug} reference must resolve — no undefined symbols (fail loud).
const notationKeys = new Set(Object.keys(NOTATION));
const glossarySlugs = new Set(GLOSSARY.map((g) => g.term.toLowerCase()));
const TOKEN_RE = /@n\{([^}]+)\}|@t\{([^}|]+)(?:\|[^}]+)?\}/g;
for (const l of LESSONS) {
  const strings = [
    l.summary, l.masteryCheckpoint, ...l.objectives,
    ...l.definitions.flatMap((d) => [d.short, d.expanded ?? "", d.example ?? ""]),
    ...l.sections.map((s) => s.body),
    ...l.confusions.flatMap((c) => [c.misconception, c.correction]),
    ...l.quiz.map((q) => q.prompt + " " + (q.explanation ?? "")),
  ];
  for (const s of strings) {
    for (const m of s.matchAll(TOKEN_RE)) {
      if (m[1]) ok(notationKeys.has(m[1]), `stage ${l.stage}: @n{${m[1]}} not in NOTATION`);
      if (m[2]) ok(glossarySlugs.has(m[2].toLowerCase()), `stage ${l.stage}: @t{${m[2]}} not in glossary`);
    }
  }
}

// Stage coverage + unique ids
const stages = LESSONS.map((l) => l.stage);
// S6: stage range derived would be better; was hardcoded to Gödel's 17 stages.
for (let s = 0; s <= Math.max(...stages); s++) ok(stages.includes(s), `missing stage ${s}`);
const ids = new Set();
for (const l of LESSONS) {
  ok(!ids.has(l.id), `duplicate lesson id ${l.id}`);
  ids.add(l.id);
  ok(l.quiz.length >= 3, `stage ${l.stage}: <3 quiz questions`);
  ok(l.visualizations.length >= 1, `stage ${l.stage}: no visualization`);
  ok(l.confusions.length >= 2, `stage ${l.stage}: <2 confusion boxes`);
  ok(!!l.masteryCheckpoint, `stage ${l.stage}: no mastery checkpoint`);

  // Visualizations
  for (const v of l.visualizations) {
    ok(!!v.textualSummary && v.textualSummary.length > 20, `stage ${l.stage} viz ${v.id}: weak/missing textualSummary`);
    if (v.kind === "typed-graph") {
      const nodeIds = new Set(v.nodes.map((n) => n.id));
      for (const e of v.edges) {
        ok(nodeIds.has(e.source), `stage ${l.stage} viz ${v.id}: edge ${e.id} bad source ${e.source}`);
        ok(nodeIds.has(e.target), `stage ${l.stage} viz ${v.id}: edge ${e.id} bad target ${e.target}`);
      }
    }
    if (v.kind === "comparison-table") {
      for (const row of v.rows)
        for (const c of Object.keys(row.cells))
          ok(v.columns.includes(c), `stage ${l.stage} viz ${v.id}: row cell column "${c}" not in columns`);
    }
  }

  // Quiz answer integrity
  for (const q of l.quiz) {
    if (q.type === "multiple-choice")
      ok(q.correct >= 0 && q.correct < q.options.length, `stage ${l.stage} ${q.id}: correct index OOR`);
    if (q.type === "multi-select") {
      ok(Array.isArray(q.correct) && q.correct.length > 0, `stage ${l.stage} ${q.id}: multi-select has no correct answers`);
      for (const i of q.correct) ok(i >= 0 && i < q.options.length, `stage ${l.stage} ${q.id}: multi index OOR`);
    }
    if (q.type === "classification") {
      for (const it of q.items)
        ok(q.buckets.includes(it.correctBucket), `stage ${l.stage} ${q.id}: bucket "${it.correctBucket}" missing`);
    }
    if (q.type === "matching") {
      const rids = new Set(q.right.map((r) => r.id));
      for (const l2 of q.left)
        ok(rids.has(q.pairs[l2.id]), `stage ${l.stage} ${q.id}: pair for ${l2.id} -> unknown right`);
    }
    if (q.type === "fill-in")
      ok(Array.isArray(q.accepted) && q.accepted.length > 0, `stage ${l.stage} ${q.id}: no accepted answers`);
    ok(!!q.explanation, `stage ${l.stage} ${q.id}: no explanation`);
  }
}

// --- reference closure: no forward references (SPRINT CF2) ---
// A @t{term} reference is valid only if the term is introduced (defined in a
// lesson) at the referencing node itself or a transitive prerequisite — i.e. it
// has "already been explained". Orientation nodes preview deliberately and are
// exempt. @n{} notation chips are self-contained, so they're always available.
{
  const EXEMPT = new Set(["stage-0"]); // optional "Two Distinctions" orientation
  const PRIMITIVES = new Set(["symbol", "string", "alphabet"]); // genuinely prior
  const lessonNode = {};
  for (const n of SKILL_GRAPH.nodes) if (n.lessonId) lessonNode[n.lessonId] = n.id;
  const introducedAt = {};
  for (const l of LESSONS) {
    const nodeId = lessonNode[l.id];
    if (!nodeId) continue;
    for (const d of l.definitions) (introducedAt[d.term.toLowerCase()] ??= new Set()).add(nodeId);
  }
  const parents = {};
  for (const n of SKILL_GRAPH.nodes) parents[n.id] = [];
  for (const e of SKILL_GRAPH.edges) if (e.kind === "prerequisite_for") parents[e.target].push(e.source);
  const ancCache = {};
  const ancestors = (id) => {
    if (ancCache[id]) return ancCache[id];
    const seen = new Set(); const st = [...parents[id]];
    while (st.length) { const u = st.pop(); if (seen.has(u)) continue; seen.add(u); st.push(...parents[u]); }
    return (ancCache[id] = seen);
  };
  const TREF = /@t\{([^}|]+)(?:\|[^}]+)?\}/g;
  for (const l of LESSONS) {
    if (EXEMPT.has(l.id)) continue;
    const nodeId = lessonNode[l.id];
    if (!nodeId) continue;
    const anc = ancestors(nodeId);
    const strings = [
      l.summary, l.masteryCheckpoint, ...l.objectives,
      ...l.definitions.flatMap((d) => [d.short, d.expanded ?? "", d.example ?? ""]),
      ...l.sections.map((s) => s.body),
      ...l.confusions.flatMap((c) => [c.misconception, c.correction]),
      ...l.quiz.map((q) => q.prompt + " " + (q.explanation ?? "")),
    ];
    for (const s of strings) for (const m of s.matchAll(TREF)) {
      const term = m[1].toLowerCase();
      if (PRIMITIVES.has(term)) continue;
      const intro = introducedAt[term];
      const available = intro && [...intro].some((nid) => nid === nodeId || anc.has(nid));
      if (!available)
        ok(false, `forward-ref stage ${l.stage} (${nodeId}): @t{${m[1]}} — ${intro ? "introduced only at [" + [...intro].join(",") + "], not a prerequisite" : "not defined in any lesson"}`);
    }
  }
}

// --- concept dependency DAG (ADR-0002) ---
// A `Concept` carries its own `prerequisites` (other concept ids). Assert:
//   - unique ids; prerequisites resolve; graph acyclic
//   - definition closure: every @c{X} in a concept's short/expanded is a
//     TRANSITIVE prerequisite of that concept ("defined before use" at term
//     granularity — the hole the chip-token checker missed)
//   - micro-quiz answer integrity
//   - introducedIn is a real stage; a prerequisite concept is introduced at the
//     same stage or a prerequisite stage (cross-DAG coherence)
{
  const CONCEPTS = CONCEPT_GRAPH.concepts;
  const conceptIds = new Set();
  for (const c of CONCEPTS) {
    ok(!conceptIds.has(c.id), `concept: duplicate id ${c.id}`);
    conceptIds.add(c.id);
  }
  for (const c of CONCEPTS)
    for (const p of c.prerequisites)
      ok(conceptIds.has(p), `concept ${c.id}: prerequisite "${p}" is not a concept`);
  // a primitive is an atom: it must have no prerequisites (ADR-0004 §5.1)
  for (const c of CONCEPTS)
    if (c.primitive)
      ok(c.prerequisites.length === 0, `concept ${c.id}: marked primitive but has prerequisites [${c.prerequisites.join(", ")}]`);

  const prereqAdj = {};
  for (const c of CONCEPTS) prereqAdj[c.id] = c.prerequisites.filter((p) => conceptIds.has(p));

  // `prerequisites` must be ACYCLIC (ADR-0004). A prerequisite cycle is not a
  // feature — it signals under-decomposition: a sloppy definition, an inductive
  // definition mistaken for a dependency, or a contrast mislabeled as a
  // dependency (use `contrasts` for that). The SCC linter (scripts/derive-report)
  // reports cycles; this gate fails the build on them.
  {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const color = {};
    for (const id of conceptIds) color[id] = WHITE;
    let cycle = null;
    const visit = (u, path) => {
      color[u] = GREY;
      for (const v of prereqAdj[u]) {
        if (color[v] === GREY) { cycle = [...path, u, v].join(" → "); return; }
        if (color[v] === WHITE) { visit(v, [...path, u]); if (cycle) return; }
      }
      color[u] = BLACK;
    };
    for (const id of conceptIds) { if (color[id] === WHITE) visit(id, []); if (cycle) break; }
    ok(!cycle, `concept: prerequisite cycle: ${cycle} — decompose/reclassify (cycles signal under-decomposition; use contrasts for mutual association)`);
  }

  // The GROUP-lifted graph (the derived skill map) must also be acyclic — even
  // with acyclic concepts, a grouping that interleaves dependencies (A needs B
  // and B needs A across groups) means a concept is mis-grouped.
  {
    const grp = {};
    for (const c of CONCEPTS) grp[c.id] = c.introducedIn;
    const groups = new Set(Object.values(grp));
    const gadj = {};
    for (const g of groups) gadj[g] = new Set();
    for (const c of CONCEPTS)
      for (const p of prereqAdj[c.id])
        if (grp[p] !== grp[c.id]) gadj[grp[p]].add(grp[c.id]);
    const WHITE = 0, GREY = 1, BLACK = 2;
    const color = {};
    for (const g of groups) color[g] = WHITE;
    let cyc = null;
    const visit = (u, path) => {
      color[u] = GREY;
      for (const v of gadj[u]) {
        if (color[v] === GREY) { cyc = [...path, u, v].join(" → "); return; }
        if (color[v] === WHITE) { visit(v, [...path, u]); if (cyc) return; }
      }
      color[u] = BLACK;
    };
    for (const g of groups) { if (color[g] === WHITE) visit(g, []); if (cyc) break; }
    ok(!cyc, `concept: derived skill-map (group) cycle: ${cyc} — a concept is mis-grouped`);
  }

  // transitive prerequisites of a concept
  const ancCache = {};
  const conceptAnc = (id) => {
    if (ancCache[id]) return ancCache[id];
    const seen = new Set(); const st = [...prereqAdj[id]];
    while (st.length) { const u = st.pop(); if (seen.has(u)) continue; seen.add(u); st.push(...(prereqAdj[u] ?? [])); }
    return (ancCache[id] = seen);
  };

  // definition closure: @c{X} refs must be transitive prerequisites; @n{} must
  // resolve in NOTATION (always-available primitives).
  const CREF = /@c\{([^}|]+)(?:\|[^}]+)?\}/g;
  const NREF = /@n\{([^}]+)\}/g;
  for (const c of CONCEPTS) {
    const text = `${c.short} ${c.expanded ?? ""} ${c.example ?? ""}`;
    const anc = conceptAnc(c.id);
    for (const m of text.matchAll(CREF)) {
      const ref = m[1];
      if (!conceptIds.has(ref)) { ok(false, `concept ${c.id}: @c{${ref}} is not a concept`); continue; }
      ok(anc.has(ref), `concept ${c.id}: @c{${ref}} used in its definition but not declared a (transitive) prerequisite`);
    }
    for (const m of text.matchAll(NREF))
      ok(notationKeys.has(m[1]), `concept ${c.id}: @n{${m[1]}} not in NOTATION`);
  }

  // micro-quiz integrity (same rules the per-stage quiz uses)
  for (const c of CONCEPTS) {
    for (const q of c.microQuiz ?? []) {
      ok(!!q.explanation, `concept ${c.id} microQuiz ${q.id}: no explanation`);
      if (q.type === "multiple-choice")
        ok(q.correct >= 0 && q.correct < q.options.length, `concept ${c.id} ${q.id}: correct index OOR`);
      if (q.type === "multi-select") {
        ok(Array.isArray(q.correct) && q.correct.length > 0, `concept ${c.id} ${q.id}: multi-select has no correct answers`);
        for (const i of q.correct) ok(i >= 0 && i < q.options.length, `concept ${c.id} ${q.id}: multi index OOR`);
      }
      if (q.type === "classification")
        for (const it of q.items)
          ok(q.buckets.includes(it.correctBucket), `concept ${c.id} ${q.id}: bucket "${it.correctBucket}" missing`);
      if (q.type === "fill-in")
        ok(Array.isArray(q.accepted) && q.accepted.length > 0, `concept ${c.id} ${q.id}: no accepted answers`);
      if (q.type === "matching") {
        const rids = new Set(q.right.map((r) => r.id));
        for (const l2 of q.left)
          ok(rids.has(q.pairs[l2.id]), `concept ${c.id} ${q.id}: pair for ${l2.id} -> unknown right`);
      }
    }
  }

  // every prerequisite edge must carry a justification (PREREQ_WHY) AND a valid
  // semantic kind (PREREQ_KIND); no orphans in either map.
  {
    const validKinds = new Set(PREREQ_KINDS);
    const usedKeys = new Set();
    for (const c of CONCEPTS)
      for (const p of c.prerequisites) {
        const key = `${c.id}>${p}`;
        usedKeys.add(key);
        ok(typeof PREREQ_WHY[key] === "string" && PREREQ_WHY[key].length > 0,
          `concept ${c.id}: prerequisite ${p} has no justification (add "${key}" to PREREQ_WHY)`);
        ok(validKinds.has(PREREQ_KIND[key]),
          `concept ${c.id}: prerequisite ${p} has no/invalid kind (add "${key}" to PREREQ_KIND, one of ${[...validKinds].join("/")})`);
      }
    for (const key of Object.keys(PREREQ_WHY))
      ok(usedKeys.has(key), `PREREQ_WHY: orphan key "${key}" — no such prerequisite edge`);
    for (const key of Object.keys(PREREQ_KIND))
      ok(usedKeys.has(key), `PREREQ_KIND: orphan key "${key}" — no such prerequisite edge`);
  }

  // contrasts: undirected associations — must resolve and be symmetric.
  for (const c of CONCEPTS)
    for (const x of c.contrasts ?? []) {
      if (!conceptIds.has(x)) { ok(false, `concept ${c.id}: contrasts "${x}" is not a concept`); continue; }
      const other = CONCEPTS.find((y) => y.id === x);
      ok((other?.contrasts ?? []).includes(c.id), `concept ${c.id}: contrasts ${x} not symmetric (add ${c.id} to ${x}.contrasts)`);
    }

  // cross-DAG coherence: introducedIn is a real stage; a prerequisite concept is
  // introduced at the same stage or a prerequisite stage (ADR-0001 skill DAG).
  const lessonNode = {};
  for (const n of SKILL_GRAPH.nodes) if (n.lessonId) lessonNode[n.lessonId] = n.id;
  const skillParents = {};
  for (const n of SKILL_GRAPH.nodes) skillParents[n.id] = [];
  for (const e of SKILL_GRAPH.edges) if (e.kind === "prerequisite_for") skillParents[e.target].push(e.source);
  const skillAncCache = {};
  const skillAnc = (id) => {
    if (skillAncCache[id]) return skillAncCache[id];
    const seen = new Set(); const st = [...(skillParents[id] ?? [])];
    while (st.length) { const u = st.pop(); if (seen.has(u)) continue; seen.add(u); st.push(...(skillParents[u] ?? [])); }
    return (skillAncCache[id] = seen);
  };
  const stageIds = new Set(LESSONS.map((l) => l.id));
  for (const c of CONCEPTS) {
    ok(stageIds.has(c.introducedIn), `concept ${c.id}: introducedIn "${c.introducedIn}" is not a stage`);
    const node = lessonNode[c.introducedIn];
    ok(!!node, `concept ${c.id}: introducedIn "${c.introducedIn}" has no skill-graph node`);
    if (!node) continue;
    const anc = skillAnc(node);
    for (const p of c.prerequisites) {
      const pc = CONCEPTS.find((x) => x.id === p);
      if (!pc) continue;
      if (pc.primitive) continue; // primitives (symbol, object) are available everywhere
      const pnode = lessonNode[pc.introducedIn];
      ok(!!pnode, `concept ${c.id}: prerequisite ${p} introducedIn "${pc.introducedIn}" has no skill-graph node`);
      if (!pnode) continue;
      ok(
        pnode === node || anc.has(pnode),
        `concept ${c.id} (${c.introducedIn}): prerequisite ${p} is introduced at ${pc.introducedIn}, which is neither the same stage nor a prerequisite stage`,
      );
    }
  }

  // any @c{} used in LESSON prose must resolve to a concept (forward-looking:
  // lessons may begin referencing concepts directly).
  for (const l of LESSONS) {
    const strings = [
      l.summary, l.masteryCheckpoint, ...l.objectives,
      ...l.definitions.flatMap((d) => [d.short, d.expanded ?? "", d.example ?? ""]),
      ...l.sections.map((s) => s.body),
      ...l.confusions.flatMap((cf) => [cf.misconception, cf.correction]),
      ...l.quiz.map((q) => q.prompt + " " + (q.explanation ?? "")),
    ];
    for (const s of strings)
      for (const m of s.matchAll(/@c\{([^}|]+)(?:\|[^}]+)?\}/g))
        ok(conceptIds.has(m[1]), `stage ${l.stage}: @c{${m[1]}} not a concept`);
  }
}

// Glossary uniqueness
const gterms = new Set();
for (const g of GLOSSARY) {
  ok(!gterms.has(g.term.toLowerCase()), `duplicate glossary term ${g.term}`);
  gterms.add(g.term.toLowerCase());
}

rmSync(out, { force: true });
rmSync(stub, { force: true });

if (errors.length) {
  console.error(`✗ content validation: ${errors.length} problem(s)`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`✓ content valid: ${LESSONS.length} stages, ${GLOSSARY.length} glossary terms, ${CONCEPT_GRAPH.concepts.length} concepts (acyclic deps, closed), ${Object.keys(NOTATION).length} symbols, ${SKILL_GRAPH.nodes.length} graph nodes / ${SKILL_GRAPH.edges.length} edges (acyclic), all consistent`);
