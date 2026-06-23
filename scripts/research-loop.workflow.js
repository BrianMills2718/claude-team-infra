/**
 * The Research Loop, executable (docs/RESEARCH_LOOP.md). Agent-drivable on ANY domain:
 * Ground (multi-modal search) → Extract (candidates) → Verify (claim ledger) → Gap panel
 * → loop-until-dry. Returns candidate concepts, verified ledger entries, and the gap log,
 * for reconciliation into concepts.ts / claims.jsonl.
 *
 * Run:  Workflow({ scriptPath: "scripts/research-loop.workflow.js", args: { ... } })
 *   args = { domain, goalConcepts:[], audience, asOf:"YYYY-MM-DD",
 *            existingConcepts:[{id,term,stage}], K?:2, maxRounds?:3 }
 * Pass existingConcepts=[] for greenfield; pass the current inventory for AUDIT mode.
 */
export const meta = {
  name: "research-loop",
  description: "Grounded, convergent concept/claim discovery — multi-modal search → extract → verify → gap panel → loop-until-dry",
  phases: [
    { title: "Round 1" },
    { title: "Round 2" },
    { title: "Round 3" },
    { title: "Round 4" },
  ],
};

// ---- inter-phase schemas (the contracts) ----
const GROUND = {
  type: "object", additionalProperties: false,
  required: ["sources", "conceptMentions", "claimCandidates"],
  properties: {
    sources: { type: "array", items: { type: "object", additionalProperties: false, required: ["url", "type"],
      properties: { url: { type: "string" }, type: { type: "string", description: "authoritative|community|adversarial|academic" }, asOf: { type: "string" } } } },
    conceptMentions: { type: "array", description: "distinct concepts the sources treat as load-bearing for this domain",
      items: { type: "object", additionalProperties: false, required: ["term", "gloss"],
        properties: { term: { type: "string" }, gloss: { type: "string", description: "one-line definition from the sources" }, sourceUrls: { type: "array", items: { type: "string" } } } } },
    claimCandidates: { type: "array", description: "checkable assertions the sources make about the domain",
      items: { type: "object", additionalProperties: false, required: ["statement", "kind"],
        properties: { statement: { type: "string" }, kind: { type: "string", description: "fact|plan|perishable|contested" }, sourceUrls: { type: "array", items: { type: "string" } } } } },
  },
};
const CANDIDATES = {
  type: "object", additionalProperties: false, required: ["concepts", "claims"],
  properties: {
    concepts: { type: "array", items: { type: "object", additionalProperties: false, required: ["term", "gloss"],
      properties: { term: { type: "string" }, gloss: { type: "string" }, stageHint: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } } } } },
    claims: { type: "array", items: { type: "object", additionalProperties: false, required: ["statement", "kind"],
      properties: { statement: { type: "string" }, kind: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } } } } },
  },
};
const LEDGER = {
  type: "object", additionalProperties: false, required: ["statement", "kind", "verdict"],
  properties: {
    statement: { type: "string" }, kind: { type: "string", description: "fact|plan|perishable|contested" },
    verdict: { type: "string", description: "confirmed|wrong|contested|unverifiable" },
    correctStatement: { type: ["string", "null"], description: "the corrected statement when verdict=wrong" },
    positions: { type: "array", description: "when contested: >=2 named positions",
      items: { type: "object", additionalProperties: false, required: ["name", "claim"], properties: { name: { type: "string" }, claim: { type: "string" }, sourceUrls: { type: "array", items: { type: "string" } } } } },
    sources: { type: "array", items: { type: "string" } }, asOf: { type: "string" },
  },
};
const GAPS = {
  type: "object", additionalProperties: false, required: ["gaps"],
  properties: { gaps: { type: "array", items: { type: "object", additionalProperties: false, required: ["class", "description"],
    properties: { class: { type: "string" }, description: { type: "string" }, suggestedSearch: { type: "string" }, severity: { type: "string", description: "high|med|low" } } } } },
};

// ---- frame ----
// Robust to args arriving as an object OR a JSON string (defensive: a stringified
// args would make args?.domain undefined and silently run greenfield).
const IN = typeof args === "string" ? JSON.parse(args) : (args ?? {});
const domain = IN.domain ?? "the target domain";
const goalConcepts = IN.goalConcepts ?? [];
const audience = IN.audience ?? "practitioners making a decision";
const asOf = IN.asOf ?? "today";
const existing = IN.existingConcepts ?? [];
const K = IN.K ?? 2;
const maxRounds = Math.min(IN.maxRounds ?? 3, 4);
const A = { agentType: "general-purpose" }; // research agents need web tools
log(`frame: domain="${domain.slice(0, 70)}" · ${existing.length} existing concepts · goals=[${goalConcepts.join(",")}] · K=${K} maxRounds=${maxRounds}`);
if (existing.length === 0 && domain === "the target domain")
  log("WARNING: no domain/concepts received — args did not propagate; aborting would be better than researching a default.");

const MODALITIES = [
  { type: "authoritative", how: "official docs, specs, changelogs, primary vendor sources — for facts and perishable specs. Quote exact behavior/versions." },
  { type: "community", how: "Hacker News threads AND their comments, Reddit, practitioner blogs, X — for real practices, opinions, and live DEBATES with named positions." },
  { type: "adversarial", how: "security audits, attack research, post-mortems, critiques, failure reports — for the failure modes and risks the happy-path docs omit." },
  { type: "academic", how: "papers, benchmarks, published evals — for contested claims that have measured evidence." },
];
const GAP_CLASSES = [
  { class: "coverage", hunt: "concepts the sources treat as essential to the domain that are MISSING from the current concept set." },
  { class: "correctness", hunt: "claims in the ledger that are unverified, contradicted, or only weakly sourced — and any concept definition that looks factually off." },
  { class: "contestation", hunt: "live debates/disagreements argued by practitioners that the current concept set does not represent at all." },
  { class: "closure", hunt: "newly-surfaced concepts that USE a term not yet introduced — a definition that depends on something undefined." },
  { class: "perishability", hunt: "claims that are fast-moving and may already be stale relative to asOf — things that change monthly in this domain." },
  { class: "completeness", hunt: "what is structurally missing: a source modality not searched, a sub-area of the domain unexplored, an audience need unmet." },
];

const conceptList = existing.length
  ? existing.map((c) => `${c.term} (${c.id}, ${c.stage})`).join("; ")
  : "(none — greenfield)";

const key = (g) => `${g.class}::${(g.description || "").slice(0, 80).toLowerCase()}`;

// ---- the loop ----
const seen = new Set();
const allGaps = [];
const ledger = [];
const allConcepts = [];
let focus = []; // fresh gaps to target the next round's search
let dry = 0;
let round = 0;

while (dry < K && round < maxRounds) {
  round++;
  const phase = `Round ${round}`;
  const focusNote = focus.length
    ? `\n\nThis is a TARGETED round. Focus your search on closing these specific gaps found last round:\n${focus.map((g) => `- [${g.class}] ${g.description}` + (g.suggestedSearch ? ` (try: ${g.suggestedSearch})` : "")).join("\n")}`
    : "";

  // 1. Ground — one agent per modality, in parallel
  const grounds = (await parallel(MODALITIES.map((m) => () =>
    agent(
      `You are researching the domain: "${domain}" for an audience of ${audience}, as of ${asOf}.\n` +
      `Goal concept(s) the curriculum builds toward: ${goalConcepts.join(", ") || "(unspecified)"}.\n` +
      `Search the ${m.type.toUpperCase()} angle: ${m.how}\n` +
      `Use WebSearch and WebFetch. Prefer primary sources. Return concept mentions (load-bearing ideas with a one-line gloss) and claim candidates (checkable assertions, tagged fact|plan|perishable|contested), each with source URLs.${focusNote}`,
      { ...A, schema: GROUND, label: `ground:${m.type}`, phase },
    ),
  ))).filter(Boolean);

  // 2. Extract — consolidate into deduped candidates
  const groundBlob = JSON.stringify(grounds).slice(0, 60000);
  const cand = await agent(
    `Consolidate this multi-source research for the domain "${domain}" into a deduplicated candidate set.\n` +
    `Merge concept mentions that are the same idea (one canonical term + best gloss + all sourceUrls). ` +
    `Merge duplicate claims. Keep each claim's kind (fact|plan|perishable|contested).\n\nRESEARCH:\n${groundBlob}`,
    { schema: CANDIDATES, label: "extract", phase },
  );
  if (cand?.concepts) allConcepts.push(...cand.concepts);

  // 3. Verify — each candidate claim adversarially checked against authority (pipeline)
  const claims = (cand?.claims ?? []).slice(0, 24);
  const verified = (await parallel(claims.map((cl) => () =>
    agent(
      `Verify this claim about "${domain}" against AUTHORITATIVE sources (official docs/specs). ` +
      `Return a ledger entry: verdict confirmed|wrong|contested|unverifiable; if wrong, give correctStatement; ` +
      `if contested, give >=2 named positions with sources; always give sources and asOf (${asOf}).\n\nCLAIM (${cl.kind}): ${cl.statement}\nCited: ${(cl.sourceUrls || []).join(", ")}`,
      { ...A, schema: LEDGER, label: "verify", phase },
    ),
  ))).filter(Boolean);
  ledger.push(...verified);

  // 4. Gap panel — one finder per class, blind to each other, in parallel
  const candBlob = JSON.stringify({ concepts: (cand?.concepts || []).map((c) => c.term), claims: (cand?.claims || []).map((c) => c.statement) }).slice(0, 30000);
  const gapResults = (await parallel(GAP_CLASSES.map((g) => () =>
    agent(
      `You are the ${g.class.toUpperCase()} gap-finder for a concept curriculum on "${domain}" (as of ${asOf}).\n` +
      `Hunt ONLY this gap class: ${g.hunt}\n\n` +
      `CURRENT concept set (do not re-report these as gaps):\n${conceptList}\n\n` +
      `This round's freshly-extracted candidates:\n${candBlob}\n\n` +
      `Return only NEW, ACTIONABLE gaps not already covered by the current set. If genuinely none, return an empty list. ` +
      `Each gap: class="${g.class}", a specific description, a suggestedSearch, and severity.`,
      { ...A, schema: GAPS, label: `gap:${g.class}`, phase },
    ),
  ))).filter(Boolean).flatMap((r) => r.gaps || []);

  // 5. dedup vs SEEN (not vs resolved) → converge
  const fresh = gapResults.filter((g) => g.description && !seen.has(key(g)));
  fresh.forEach((g) => seen.add(key(g)));
  allGaps.push(...fresh);
  focus = fresh;
  if (fresh.length === 0) dry++; else dry = 0;
  log(`round ${round}: ${grounds.length} ground · ${claims.length} claims verified · ${fresh.length} fresh gaps · dry=${dry}/${K}`);
}

const wrong = ledger.filter((e) => e.verdict === "wrong");
const contested = ledger.filter((e) => e.verdict === "contested");
return {
  domain, rounds: round, done: dry >= K,
  doneReason: dry >= K ? `${K} consecutive dry gap-rounds` : `hit maxRounds=${maxRounds} before drying out`,
  newConceptCandidates: allConcepts,
  ledger,
  corrections: wrong,
  debates: contested,
  gaps: allGaps,
};
