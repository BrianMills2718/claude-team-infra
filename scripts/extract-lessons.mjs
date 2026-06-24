/**
 * extract-lessons.mjs — convert lesson workflow output to build-course format.
 *
 * The workflow returns { stageContent: { [stageId]: Section[] } } where each
 * Section has heading, body, targetConceptsCovered, unverifiedClaims, sources.
 * build-course.mjs expects { [stageId]: { heading, body, sources? }[] } —
 * schema-only fields (targetConceptsCovered, unverifiedClaims) are stripped.
 *
 * Usage: node scripts/extract-lessons.mjs <workflow-output.json> <output.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("usage: extract-lessons.mjs <workflow-output.json> <output.json>");
  process.exit(2);
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const stageContent = raw.result?.stageContent ?? raw.stageContent ?? {};

const authored = {};
let totalSections = 0;
let withSources = 0;

for (const [stageId, sections] of Object.entries(stageContent)) {
  authored[stageId] = sections.map((s) => {
    const out = { heading: s.heading, body: s.body };
    if (s.sources && s.sources.length > 0) {
      out.sources = s.sources;
      withSources++;
    }
    totalSections++;
    return out;
  });
}

writeFileSync(outputPath, JSON.stringify(authored, null, 2));
console.log(
  `✓ extracted ${Object.keys(authored).length} stages, ${totalSections} sections ` +
  `(${withSources} with sources) → ${outputPath}`
);
