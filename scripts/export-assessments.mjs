/**
 * Export the gradeable assessment data from assessments.ts → backend/assessments.json
 * so the Python judge backend is rubric-authoritative from the SAME single source
 * (the frontend never sends the rubric; it sends taskId + answer only).
 *
 *   node scripts/export-assessments.mjs
 */
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const out = join(tmpdir(), `godel-assess-${process.pid}.mjs`);
const stub = join(tmpdir(), `godel-assess-stub-${process.pid}.ts`);
writeFileSync(
  stub,
  `export { ASSESSMENTS, RUBRICS } from ${JSON.stringify(process.cwd() + "/src/content/assessments.ts")};`,
);
await build({ entryPoints: [stub], bundle: true, format: "esm", outfile: out, logLevel: "error" });
const { ASSESSMENTS, RUBRICS } = await import(pathToFileURL(out).href);

// Keep only what the judge needs to grade (and only llm-judged / hybrid tasks).
const tasks = {};
for (const t of ASSESSMENTS) {
  if (!t.openEnded) continue; // purely deterministic tasks aren't judged
  tasks[t.id] = {
    id: t.id,
    nodeId: t.nodeId,
    title: t.title,
    kind: t.kind,
    taskPrompt: t.prompt,
    openEndedPrompt: t.openEnded.prompt,
    rubric: RUBRICS[t.openEnded.rubricId],
    requiredConcepts: t.requiredConcepts,
    fatalMisconceptions: t.fatalMisconceptions.map((m) => ({
      id: m.id, description: m.description, remediationNodeIds: m.remediationNodeIds,
    })),
    passThreshold: t.passThreshold,
  };
}

mkdirSync(join(process.cwd(), "backend"), { recursive: true });
const dest = join(process.cwd(), "backend", "assessments.json");
writeFileSync(dest, JSON.stringify(tasks, null, 2));
console.log(`exported ${Object.keys(tasks).length} judged tasks → backend/assessments.json`);
