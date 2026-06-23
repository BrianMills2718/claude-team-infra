/**
 * Single source of truth for what each layer and edge type *means* and how it
 * is styled. Every typed graph renders a legend from this so the learner can
 * always decode "this dashed orange arrow = encodes_as (coding layer)".
 *
 * Accessibility: each layer carries BOTH a color and a distinct line style /
 * shape hint, so the distinctions never rely on color alone.
 */
import type { EdgeType, Layer } from "../../types";

export const LAYER_META: Record<
  Layer,
  { label: string; color: string; blurb: string }
> = {
  "setup-onboarding": { label: "Setup & onboarding", color: "#2563eb", blurb: "Setup & onboarding" },
  "config-memory": { label: "Config & memory (CLAUDE.md, settings)", color: "#7c3aed", blurb: "Config & memory (CLAUDE.md, settings)" },
  "permissions-security-gov": { label: "Permissions, security & governance", color: "#dc2626", blurb: "Permissions, security & governance" },
  "skills-hooks-commands": { label: "Skills, hooks & commands", color: "#059669", blurb: "Skills, hooks & commands" },
  "subagents-agent-teams": { label: "Subagents & agent teams", color: "#d97706", blurb: "Subagents & agent teams" },
  "mcp": { label: "MCP (connecting tools)", color: "#0891b2", blurb: "MCP (connecting tools)" },
  "plugins-distribution": { label: "Plugins & distribution", color: "#db2777", blurb: "Plugins & distribution" },
  "automation-ci-integratio": { label: "Automation, CI & integrations", color: "#65a30d", blurb: "Automation, CI & integrations" },
  "optimal-use-context-cost": { label: "Optimal use, context & cost", color: "#9333ea", blurb: "Optimal use, context & cost" },
  "surfaces-mobility": { label: "Surfaces & mobility", color: "#0d9488", blurb: "Surfaces & mobility" },
  "monitoring-analytics-tro": { label: "Monitoring, analytics & troubleshooting", color: "#e11d48", blurb: "Monitoring, analytics & troubleshooting" },
  "enterprise-providers-gat": { label: "Enterprise providers & gateways", color: "#4f46e5", blurb: "Enterprise providers & gateways" },
};

/** Edge dash patterns give a non-color cue per relation family; `verbose` is the
 *  fuller gloss shown on hover (the short `label` is always drawn on the edge). */
export const EDGE_META: Record<EdgeType, { label: string; dash?: string; verbose: string }> = {
  formed_from: { label: "formed from", verbose: "the target is built from the source by a formation rule" },
  parsed_as: { label: "parsed as", verbose: "the source string is recognized by the grammar as the target category" },
  has_subexpression: { label: "has subexpression", verbose: "the source contains the target as a syntactic part" },
  binds_variable: { label: "binds variable", dash: "2 3", verbose: "the source quantifier binds the target variable occurrence" },
  premise_of: { label: "premise of", verbose: "the source is a premise of the target inference step" },
  concludes: { label: "concludes", verbose: "the target is the conclusion drawn by the source step" },
  derived_by: { label: "derived by", dash: "2 3", verbose: "the target is obtained from the source by an inference rule" },
  proves: { label: "proves", verbose: "syntactic derivability (⊢): the source theory proves the target sentence" },
  interpreted_as: { label: "interpreted as", dash: "6 4", verbose: "the symbol is given a meaning in the structure" },
  evaluates_to: { label: "evaluates to", dash: "6 4", verbose: "the term evaluates to this object under the interpretation" },
  satisfies: { label: "satisfies", dash: "6 4", verbose: "semantic truth (⊨): the structure makes the sentence true" },
  encodes_as: { label: "encodes as", dash: "1 4", verbose: "the syntactic object is coded by this Gödel number" },
  decodes_to: { label: "decodes to", dash: "1 4", verbose: "the number decodes back to this syntactic object" },
  represents: { label: "represents", dash: "1 4", verbose: "the arithmetic predicate represents this syntactic relation" },
  proves_about: { label: "proves about", dash: "8 3 2 3", verbose: "a metatheoretic claim proved about the object theory" },
  extends: { label: "extends", dash: "8 3 2 3", verbose: "the target theory extends the source theory" },
  relates: { label: "relates", verbose: "a generic relation shown on the layer-overview map" },
};
