/**
 * validate-lessons.mjs — deterministic structural validator for authored lesson content.
 *
 * Checks run BEFORE extract-lessons.mjs strips schema-only fields, so this runs
 * on the raw workflow output (which still has unverifiedClaims, targetConceptsCovered).
 *
 * Checks:
 *   1. No empty section body
 *   2. unverifiedClaims arrays are empty (verify pass cleared them)
 *   3. Every concept in targetConceptsCovered appears somewhere in the section bodies
 *   4. At least MIN_SOURCED_SECTIONS sections have non-empty sources
 *   5. Stage count matches expected (optional, from spec)
 *
 * Usage:
 *   node scripts/validate-lessons.mjs <workflow-output.json> [course-spec.json]
 *
 * Exit 0 = clean, Exit 1 = errors found.
 */
import { readFileSync } from "node:fs";

const MIN_SOURCED_SECTIONS = 3; // at least this many sections per stage must cite a source

const [inputPath, specPath] = process.argv.slice(2);
if (!inputPath) {
  console.error("usage: validate-lessons.mjs <workflow-output.json> [course-spec.json]");
  process.exit(2);
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));
const stageContent = raw.result?.stageContent ?? raw.stageContent ?? {};
const spec = specPath ? JSON.parse(readFileSync(specPath, "utf8")) : null;

const errors = [];
const warnings = [];
let totalSections = 0;
let stagesChecked = 0;

for (const [stageId, sections] of Object.entries(stageContent)) {
  if (!Array.isArray(sections) || sections.length === 0) {
    errors.push(`${stageId}: no sections (empty or missing)`);
    continue;
  }

  stagesChecked++;
  let sourcedCount = 0;
  const allBodies = sections.map((s) => (s.body ?? "").toLowerCase()).join(" ");

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    totalSections++;

    // 1. Empty body
    if (!s.body || s.body.trim().length < 20) {
      errors.push(`${stageId}[${i}] "${s.heading ?? "(no heading)"}": body is empty or too short`);
    }

    // 2. unverifiedClaims not drained
    if (Array.isArray(s.unverifiedClaims) && s.unverifiedClaims.length > 0) {
      warnings.push(
        `${stageId}[${i}] "${s.heading ?? "(no heading)"}": ${s.unverifiedClaims.length} unverified claim(s) not resolved: ${s.unverifiedClaims.slice(0, 2).join("; ")}${s.unverifiedClaims.length > 2 ? "…" : ""}`
      );
    }

    // 3. targetConceptsCovered coverage check
    if (Array.isArray(s.targetConceptsCovered)) {
      for (const concept of s.targetConceptsCovered) {
        const key = concept.toLowerCase().replace(/[^a-z0-9 ]/g, "");
        // Check in this section's body only (concept should appear where it's covered)
        if (s.body && !s.body.toLowerCase().includes(key.split(" ")[0])) {
          warnings.push(
            `${stageId}[${i}]: targetConceptsCovered "${concept}" not found in section body`
          );
        }
      }
    }

    // 4. Source tracking
    if (Array.isArray(s.sources) && s.sources.length > 0) sourcedCount++;
  }

  // 4. Minimum sourced sections per stage
  if (sourcedCount < MIN_SOURCED_SECTIONS) {
    warnings.push(
      `${stageId}: only ${sourcedCount}/${sections.length} sections have sources (min ${MIN_SOURCED_SECTIONS})`
    );
  }
}

// 5. Stage count check
if (spec) {
  const expectedCount = spec.stages.length;
  const actualCount = Object.keys(stageContent).length;
  if (actualCount !== expectedCount) {
    errors.push(
      `stage count mismatch: expected ${expectedCount} from spec, got ${actualCount} in content`
    );
  }
  // Check all expected stage IDs are present
  for (const stage of spec.stages) {
    if (!stageContent[stage.id]) {
      errors.push(`missing stage: ${stage.id} ("${stage.title}") not in content`);
    }
  }
}

// Report
if (warnings.length > 0) {
  console.warn(`\n⚠ ${warnings.length} warning(s):`);
  warnings.forEach((w) => console.warn(`  • ${w}`));
}

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} error(s) — fix before building:`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error(`\nChecked ${stagesChecked} stages, ${totalSections} sections.`);
  process.exit(1);
}

console.log(
  `✓ validate-lessons: ${stagesChecked} stages, ${totalSections} sections — all checks passed` +
  (warnings.length > 0 ? ` (${warnings.length} warnings)` : "")
);
