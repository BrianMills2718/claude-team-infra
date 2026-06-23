/**
 * KEYSTONE of the kb→course engine: turn the distilled compendium into a course-spec
 * (ordered stages + concepts + a JUSTIFIED, acyclic prerequisite DAG + the goal).
 * Phase A: per-theme, extract the canonical course-worthy concepts. Phase B: one global
 * pass authors the prerequisite edges (same-or-earlier-stage, acyclic, kind + why).
 * Output { meta, stages, concepts:[{id,term,stage,short,example,prerequisites:[{prereq,kind,why}]}], goals, primitives }
 * is consumed by scripts/emit-concepts.mjs (deterministic emit + acyclicity repair + gate).
 */
export const meta = {
  name: "synthesize-graph",
  description: "Compendium → course-spec: concepts + justified acyclic prerequisite DAG + goal",
  phases: [{ title: "Concepts" }, { title: "Edges" }],
};

// The orchestrator injects compendium.json here (workflow scripts have no fs access):
//   replace the next line with:  const COMPENDIUM = <contents of src/content/compendium.json>;
const COMPENDIUM = [];

const sections = COMPENDIUM; // [{theme, markdown}] in stage order
log(`synthesizing a concept graph from ${sections.length} compendium sections`);

const KINDS = ["is-a", "part-of", "defined-via", "operates-on", "refines", "assumes"];

const CONCEPTS_SCHEMA = {
  type: "object", additionalProperties: false, required: ["concepts"],
  properties: { concepts: { type: "array", description: "4-9 most important course-worthy concepts this section introduces",
    items: { type: "object", additionalProperties: false, required: ["id", "term", "short"],
      properties: {
        id: { type: "string", description: "kebab-case unique id, e.g. permission-rule" },
        term: { type: "string", description: "display term, e.g. a permission rule" },
        short: { type: "string", description: "one-line plain-prose definition (no @ chips)" },
        example: { type: "string", description: "one concrete example from the team-setup domain" },
      } } } },
};

const EDGES_SCHEMA = {
  type: "object", additionalProperties: false, required: ["goals", "primitives", "prereqs"],
  properties: {
    goals: { type: "array", items: { type: "string" }, description: "terminal concept id(s) the course builds toward" },
    primitives: { type: "array", items: { type: "string" }, description: "genuine primitive concept ids (no prerequisites)" },
    prereqs: { type: "array", items: { type: "object", additionalProperties: false, required: ["concept", "prereq", "kind", "why"],
      properties: {
        concept: { type: "string", description: "the dependent concept id" },
        prereq: { type: "string", description: "a concept id that must be understood first (same or EARLIER stage)" },
        kind: { type: "string", description: `one of: ${KINDS.join(", ")}` },
        why: { type: "string", description: "one-line justification for this prerequisite edge" },
      } } },
  },
};

const A = { agentType: "general-purpose", effort: "high" };
const slug = (s) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "stage";

// Phase A — concepts per theme (stage index = order in compendium)
const perTheme = await pipeline(
  sections,
  (sec, _orig, i) => agent(
    `From this reference section of a Claude Code + Codex team-setup course, extract the canonical, course-worthy CONCEPTS it introduces — the load-bearing ideas a learner must actually grasp (not trivia, not every flag). Merge near-duplicates. Aim for the 4-9 most important.\n\n` +
    `Each concept: a kebab-case id, a display term, a one-line plain-prose definition (NO special @ chip syntax), and one concrete example from team setup.\n\n` +
    `SECTION: ${sec.theme}\n\n${sec.markdown.slice(0, 16000)}`,
    { ...A, schema: CONCEPTS_SCHEMA, label: `concepts:${slug(sec.theme)}`, phase: "Concepts" },
  ).then((r) => ({ theme: sec.theme, stage: i, branch: slug(sec.theme), concepts: (r?.concepts || []) })),
);

// merge + de-dup ids globally (first occurrence wins its stage)
const byId = {};
const stages = [];
perTheme.forEach((t) => {
  stages.push({ id: `stage-${t.stage}`, branch: t.branch, title: t.theme });
  for (const c of t.concepts) {
    const id = slug(c.id || c.term);
    if (!id || byId[id]) continue;
    byId[id] = { id, term: c.term || id, stage: `stage-${t.stage}`, stageIdx: t.stage, short: c.short || c.term, example: c.example || "" };
  }
});
const concepts = Object.values(byId);
log(`extracted ${concepts.length} concepts across ${stages.length} stages`);

// Phase B — author the prerequisite DAG over the full list
const listing = concepts.map((c) => `${c.id} [stage ${c.stageIdx}] (${c.term}) — ${c.short}`).join("\n");
const edges = await agent(
  `Author the prerequisite DAG for this course. Below is the full ordered concept list (with stage index). For each concept, give its DIRECT prerequisites — the few concepts a learner must understand FIRST — as edges.\n\n` +
  `STRICT RULES:\n` +
  `- A prerequisite must be at the SAME stage or an EARLIER stage (lower stage index) than the dependent concept. NEVER a later stage.\n` +
  `- DIRECT prerequisites only (not transitive). Typically 1-3 per concept; some have none.\n` +
  `- The graph MUST be acyclic.\n` +
  `- Each edge: concept id, prereq id, a kind (${KINDS.join("|")}), and a one-line why.\n` +
  `- List genuine primitives (concepts with no prerequisites — usually the earliest, most atomic ideas).\n` +
  `- Pick the goal concept id(s): the terminal idea(s) the whole course builds toward.\n\n` +
  `CONCEPTS:\n${listing}`,
  { ...A, schema: EDGES_SCHEMA, label: "edges", phase: "Edges" },
);

// attach prereqs to concepts (validated/repaired downstream by emit-concepts.mjs)
const ids = new Set(concepts.map((c) => c.id));
const prereqMap = {};
for (const e of (edges?.prereqs || [])) {
  if (!ids.has(e.concept) || !ids.has(e.prereq) || e.concept === e.prereq) continue;
  (prereqMap[e.concept] ??= []).push({ prereq: e.prereq, kind: KINDS.includes(e.kind) ? e.kind : "assumes", why: e.why || "prerequisite" });
}
const outConcepts = concepts.map((c) => ({ ...c, prerequisites: prereqMap[c.id] || [] }));

return {
  meta: { name: "claude-team-infra", domain: "team Claude Code + Codex setup", asOf: "2026-06-23" },
  stages,
  goals: (edges?.goals || []).filter((g) => ids.has(g)),
  primitives: (edges?.primitives || []).filter((p) => ids.has(p)),
  concepts: outConcepts,
};
