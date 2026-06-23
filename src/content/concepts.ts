/**
 * Concept dependency DAG — "Decide & set up your team's shared AI infrastructure (Claude Code + Codex)."
 * SOURCE OF TRUTH (ADR-0002). The stage skill map (graph.ts), path, glossary all DERIVE; never
 * hand-edit derived output. Each concept lists only LOCAL prerequisites; acyclic; every prerequisite
 * has a PREREQ_WHY. Definitions are first-encounter readable (plain prose — no @c chips here, so no
 * closure debt). Examples use one fixed cast: a 6-person team that also does ops/docs, repos on
 * GitHub, mixed OS, using Claude Code + Codex.
 *
 * `introducedIn` stage = the group: stage-0 orientation · 1 surfaces · 2 config · 3 capabilities ·
 * 4 distribution · 5 governance · 6 decision.
 */
import type { Concept, ConceptGraph } from "../types";

const CONCEPTS: Concept[] = [
  // stage-0 — orientation
  { id: "claude-code", term: "Claude Code", layer: "orientation", primitive: true, introducedIn: "stage-0",
    short: "Anthropic's agentic coding tool — one underlying engine you drive from the terminal or a GUI.",
    example: "Your devs run it in the terminal and in the Desktop app; both are the same tool.",
    prerequisites: [], contrasts: ["codex"] },
  { id: "shared-config", term: "shared config", layer: "orientation", introducedIn: "stage-0",
    short: "The configuration (instructions, tools, hooks, skills, settings) that every Claude Code front-end reads the same way — what makes them one tool.",
    example: "A rule you write once applies whether a teammate is in the terminal or the Desktop GUI.",
    prerequisites: ["claude-code"], contrasts: [] },

  // stage-1 — surfaces (a parallel menu, not a ladder)
  { id: "cli", term: "the CLI", layer: "surfaces", introducedIn: "stage-1",
    short: "Claude Code in the terminal: scriptable and automatable.",
    example: "A teammate pipes a git diff into it for a quick review in their shell.",
    prerequisites: ["claude-code"], contrasts: ["desktop-code", "cowork", "codex"] },
  { id: "desktop-code", term: "the Desktop Code tab", layer: "surfaces", introducedIn: "stage-1",
    short: "Claude Code with a graphical interface: visual diff review, panes, and parallel sessions each in its own git worktree.",
    example: "A teammate runs three sessions side by side and reviews each diff visually.",
    prerequisites: ["claude-code"], contrasts: ["cli", "cowork"] },
  { id: "headless", term: "headless mode", layer: "surfaces", introducedIn: "stage-1",
    short: "Running non-interactively (one prompt in, output out) for scripts and CI — available only in the terminal.",
    example: "A nightly job runs it with no human watching; the Desktop GUI can't do this.",
    prerequisites: ["cli"], contrasts: [] },
  { id: "cowork", term: "Cowork", layer: "surfaces", introducedIn: "stage-1",
    short: "The same agentic capability applied to non-developer knowledge work: give it a goal and it works across your files and apps, showing its plan before acting.",
    example: "An ops teammate has it organize a folder and draft a report from the files.",
    prerequisites: ["claude-code"], contrasts: ["cli", "desktop-code"] },
  { id: "codex", term: "Codex", layer: "surfaces", primitive: true, introducedIn: "stage-1",
    short: "A second coding agent (from OpenAI) some of your devs use alongside Claude Code.",
    example: "Half the team prefers Codex for some tasks; the shared setup has to work for both.",
    prerequisites: [], contrasts: ["cli", "claude-code"] },

  // stage-2 — config (what lives in the repo)
  { id: "claude-md", term: "CLAUDE.md", layer: "config", introducedIn: "stage-2",
    short: "Always-loaded project instructions: conventions, how-to-build, and gotchas Claude reads every session.",
    example: "The repo's CLAUDE.md says how to run the tests and which patterns to follow.",
    prerequisites: ["shared-config"], contrasts: [] },
  { id: "agents-md", term: "AGENTS.md", layer: "config", introducedIn: "stage-2",
    short: "The Codex-facing instruction file — the mirror of CLAUDE.md so the same guidance reaches Codex.",
    example: "The repo carries both CLAUDE.md and AGENTS.md so Claude and Codex behave the same.",
    prerequisites: ["claude-md", "codex"], contrasts: [] },
  { id: "dot-claude", term: "the .claude directory", layer: "config", introducedIn: "stage-2",
    short: "The .claude/ folder where skills, sub-agents, hooks, and settings live as versioned code in the repo.",
    example: "Your repo commits .claude/ so every teammate gets the same setup via git.",
    prerequisites: ["claude-md"], contrasts: [] },
  { id: "settings", term: "settings.json", layer: "config", introducedIn: "stage-2",
    short: "Permissions, hooks, and environment config — committed for the team, with personal overrides kept local.",
    example: "Shared permission rules go in .claude/settings.json; a personal API profile stays in settings.local.json.",
    prerequisites: ["dot-claude"], contrasts: [] },

  // stage-3 — capabilities (what Claude can do)
  { id: "skill", term: "a skill", layer: "capabilities", introducedIn: "stage-3",
    short: "An on-demand capability whose description is its trigger — invoked when the description matches the task.",
    example: "A 'release-notes' skill the team shares, triggered when someone asks for a changelog.",
    prerequisites: ["dot-claude"], contrasts: ["portable-skill"] },
  { id: "progressive-disclosure", term: "progressive disclosure", layer: "capabilities", introducedIn: "stage-3",
    short: "Keeping a skill lean: a short body plus references loaded only when needed, so it doesn't waste context.",
    example: "The skill's long checklist lives in references/, not in the always-loaded body.",
    prerequisites: ["skill"], contrasts: [] },
  { id: "sub-agent", term: "a sub-agent", layer: "capabilities", introducedIn: "stage-3",
    short: "A bounded mission run in its own context with only the tools it needs, returning a summary rather than a transcript.",
    example: "A read-only 'security review' agent the team shares, scoped to Read and Grep.",
    prerequisites: ["dot-claude"], contrasts: [] },
  { id: "hook", term: "a hook", layer: "capabilities", introducedIn: "stage-3",
    short: "A command that runs on a lifecycle event and is enforced — it fires no matter what, unlike the advisory CLAUDE.md.",
    example: "A post-edit hook auto-formats every file the team edits.",
    prerequisites: ["settings"], contrasts: [] },
  { id: "mcp", term: "an MCP server", layer: "capabilities", introducedIn: "stage-3",
    short: "An external tool Claude can call (GitHub, a database) via the Model Context Protocol; shared in the repo with secrets kept out of the file.",
    example: "A shared GitHub MCP server in .mcp.json, its token referenced as an environment variable.",
    prerequisites: ["dot-claude"], contrasts: [] },
  { id: "portable-skill", term: "a portable skill", layer: "capabilities", introducedIn: "stage-3",
    short: "A skill authored once in a portable source and used in BOTH Claude and Codex, paired with AGENTS.md.",
    example: "The 'house-standards' skill lives in one source and is available to Claude and Codex alike.",
    prerequisites: ["skill", "agents-md"], contrasts: ["skill"] },

  // stage-4 — distribution (how a team shares it)
  { id: "plugin", term: "a plugin", layer: "distribution", introducedIn: "stage-4",
    short: "A versioned bundle of skills, sub-agents, hooks, and MCP servers — the unit you share.",
    example: "The team's 'frontend' plugin bundles a skill, a review agent, and a lint hook.",
    prerequisites: ["skill", "sub-agent", "hook", "mcp"], contrasts: [] },
  { id: "marketplace", term: "a plugin marketplace", layer: "distribution", introducedIn: "stage-4",
    short: "A catalog repo of plugins: the team adds it once, installs the plugins it needs, and gets updates by pushing to the repo.",
    example: "A private GitHub marketplace; everyone runs the add-marketplace command once.",
    prerequisites: ["plugin"], contrasts: [] },

  // stage-5 — governance (policy & plan)
  { id: "managed-settings", term: "managed settings", layer: "governance", introducedIn: "stage-5",
    short: "Organization policy that overrides local config, delivered by an admin from the console or a policy file.",
    example: "An admin policy that denies reading secret files, applied to everyone.",
    prerequisites: ["settings"], contrasts: [] },
  { id: "precedence", term: "settings precedence", layer: "governance", introducedIn: "stage-5",
    short: "The order settings resolve in: managed (org) wins, then CLI, then local, then project, then user.",
    example: "A teammate's personal rule can't loosen the org's managed deny rule.",
    prerequisites: ["managed-settings"], contrasts: [] },
  { id: "seats", term: "seats & plan gating", layer: "governance", introducedIn: "stage-5",
    short: "Per-seat plans decide access: a Premium seat includes Claude Code, and some autonomous features (computer use, Dispatch) are Pro/Max-only, not on Team.",
    example: "Your devs need Premium seats; the ops folks' Cowork computer-use isn't on the Team plan.",
    prerequisites: ["claude-code"], contrasts: [] },

  // stage-6 — decision (the goal)
  { id: "four-tier-model", term: "the four-tier model", layer: "decision", introducedIn: "stage-6",
    short: "Where each shared thing belongs: project config in the repo, cross-project tools in a marketplace, org policy in managed settings, and personal config local.",
    example: "A repo-specific rule → .claude/; a cross-repo skill → a plugin in the marketplace; a security rule → managed settings.",
    prerequisites: ["dot-claude", "marketplace", "managed-settings"], contrasts: [] },
  { id: "shared-library", term: "a shared library", layer: "decision", introducedIn: "stage-6",
    short: "One set of skills, agents, and tools the whole team uses — versioned, distributed, and working across both Claude and Codex.",
    example: "The team's marketplace + portable skills + repo config: one library, every teammate, both tools.",
    prerequisites: ["marketplace", "portable-skill", "four-tier-model"], contrasts: [] },
];

export const CONCEPT_GRAPH: ConceptGraph = { concepts: CONCEPTS };

/** Per-edge justification, keyed "concept>prerequisite". */
export const PREREQ_WHY: Record<string, string> = {
  "shared-config>claude-code": "shared config is what makes Claude Code's front-ends one tool",
  "cli>claude-code": "the CLI is one front-end of Claude Code",
  "desktop-code>claude-code": "the Desktop Code tab is the same engine with a GUI",
  "headless>cli": "headless is a way of running the CLI specifically",
  "cowork>claude-code": "Cowork is the same agentic capability, simplified for non-dev work",
  "claude-md>shared-config": "CLAUDE.md is the instruction part of the shared config",
  "agents-md>claude-md": "AGENTS.md is defined as the mirror of CLAUDE.md",
  "agents-md>codex": "AGENTS.md only matters because Codex reads it instead of CLAUDE.md",
  "dot-claude>claude-md": "CLAUDE.md is one file in the .claude directory",
  "settings>dot-claude": "settings.json lives inside .claude/",
  "skill>dot-claude": "skills live under .claude/skills",
  "progressive-disclosure>skill": "progressive disclosure is a way of structuring a skill",
  "sub-agent>dot-claude": "sub-agents live under .claude/agents",
  "hook>settings": "hooks are configured in settings",
  "mcp>dot-claude": "MCP servers are configured in the repo's .claude config",
  "portable-skill>skill": "a portable skill is a skill made to work across tools",
  "portable-skill>agents-md": "portability across Codex is achieved via the AGENTS.md pairing",
  "plugin>skill": "a plugin can bundle skills",
  "plugin>sub-agent": "a plugin can bundle sub-agents",
  "plugin>hook": "a plugin can bundle hooks",
  "plugin>mcp": "a plugin can bundle MCP servers",
  "marketplace>plugin": "a marketplace is a catalog of plugins",
  "managed-settings>settings": "managed settings are settings delivered and enforced by an admin",
  "precedence>managed-settings": "precedence is the rule for how managed settings override the rest",
  "seats>claude-code": "seats gate who can use Claude Code and which features",
  "four-tier-model>dot-claude": "the repo .claude/ is one of the four tiers",
  "four-tier-model>marketplace": "the marketplace is one of the four tiers",
  "four-tier-model>managed-settings": "managed settings are one of the four tiers",
  "shared-library>marketplace": "the marketplace distributes the shared library",
  "shared-library>portable-skill": "portable skills make the library span Claude + Codex",
  "shared-library>four-tier-model": "the shared library is organized by the four-tier model",
};

export function prereqWhy(concept: string, prereq: string): string | undefined {
  return PREREQ_WHY[`${concept}>${prereq}`];
}

/** The semantic kind of each prerequisite edge (ADR-0004). Gated by the validator:
 *  every edge must declare exactly one of these, and there are no orphans. */
export const PREREQ_KINDS = ["is-a", "part-of", "defined-via", "operates-on", "refines", "assumes"] as const;
export type PrereqKind = (typeof PREREQ_KINDS)[number];

export const PREREQ_KIND: Record<string, PrereqKind> = {
  "shared-config>claude-code": "assumes",
  "cli>claude-code": "is-a",
  "desktop-code>claude-code": "is-a",
  "headless>cli": "refines",
  "cowork>claude-code": "is-a",
  "claude-md>shared-config": "part-of",
  "agents-md>claude-md": "refines",
  "agents-md>codex": "assumes",
  "dot-claude>claude-md": "part-of",
  "settings>dot-claude": "part-of",
  "skill>dot-claude": "part-of",
  "progressive-disclosure>skill": "refines",
  "sub-agent>dot-claude": "part-of",
  "hook>settings": "defined-via",
  "mcp>dot-claude": "defined-via",
  "portable-skill>skill": "is-a",
  "portable-skill>agents-md": "defined-via",
  "plugin>skill": "part-of",
  "plugin>sub-agent": "part-of",
  "plugin>hook": "part-of",
  "plugin>mcp": "part-of",
  "marketplace>plugin": "part-of",
  "managed-settings>settings": "is-a",
  "precedence>managed-settings": "operates-on",
  "seats>claude-code": "assumes",
  "four-tier-model>dot-claude": "part-of",
  "four-tier-model>marketplace": "part-of",
  "four-tier-model>managed-settings": "part-of",
  "shared-library>marketplace": "defined-via",
  "shared-library>portable-skill": "defined-via",
  "shared-library>four-tier-model": "defined-via",
};

export function prereqKindOf(concept: string, prereq: string): PrereqKind | undefined {
  return PREREQ_KIND[`${concept}>${prereq}`];
}

/** id → concept lookup. */
export const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
);

/** Concepts a given stage formally introduces (the sub-DAG it encapsulates). */
export function conceptsForStage(lessonId: string): Concept[] {
  return CONCEPTS.filter((c) => c.introducedIn === lessonId);
}

/** Concept ids in a dependency-respecting (simplest-first) order. DFS post-order
 *  over `prerequisites`, cycle-tolerant via a visited guard. */
export function conceptTopoOrder(): string[] {
  const visited = new Set<string>();
  const order: string[] = [];
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const p of CONCEPT_BY_ID[id]?.prerequisites ?? []) visit(p);
    order.push(id);
  };
  for (const c of CONCEPTS) visit(c.id);
  return order;
}

/** Out-of-page prerequisite concepts for a stage: the direct prerequisites of
 *  this stage's concepts that are introduced on an EARLIER page, in dependency
 *  order. Basis of the page's prerequisite pretest. */
export function prerequisiteConceptsForStage(lessonId: string): Concept[] {
  const own = new Set(conceptsForStage(lessonId).map((c) => c.id));
  const prereqIds = new Set<string>();
  for (const c of conceptsForStage(lessonId))
    for (const p of c.prerequisites) if (!own.has(p)) prereqIds.add(p);
  return conceptTopoOrder()
    .filter((id) => prereqIds.has(id))
    .map((id) => CONCEPT_BY_ID[id])
    .filter(Boolean);
}
