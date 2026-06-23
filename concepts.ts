/**
 * Concept graph — "Decide & set up your team's shared AI infrastructure (Claude Code + Codex)."
 * SOURCE OF TRUTH. The skill map / path / glossary DERIVE from this; never hand-edit derived output.
 *
 * Each concept lists only its LOCAL prerequisites (concepts you must already understand to
 * understand this one). Acyclic. Every prerequisite has a PREREQ_WHY (kind + why). `contrasts`
 * are non-gating associations. Definitions are first-encounter readable and reference only
 * prerequisite-or-equal concepts (closure). Examples use one fixed cast: a 6-person team that also
 * does ops/docs, repos on GitHub, mixed OS (Win/Mac/Linux), using Claude Code + Codex.
 *
 * STRESS-TEST notes (see STRESS_TEST.md): this is a *decision* domain, so the surfaces (S2) are a
 * parallel menu modelled as siblings + contrasts, not a prereq chain; Codex (S4) is a sibling that
 * makes the "one tool" framing false, so `claude-code` is scoped to Claude explicitly.
 */
import type { Concept, PrereqWhy } from "./types";

export const CONCEPTS: Concept[] = [
  // ── orientation ──────────────────────────────────────────────────────────
  { id: "claude-code", term: "Claude Code", group: "orientation", primitive: true,
    definition: "Anthropic's agentic coding tool — one underlying engine you drive from the terminal or a GUI.",
    example: "Your devs run it in the terminal and in the Desktop app; both are the same tool.",
    prerequisites: [], contrasts: ["codex"] },

  { id: "shared-config", term: "shared config", group: "orientation",
    definition: "The configuration (instructions, tools, hooks, skills, settings) that every Claude Code front-end reads the same way — this is what makes them one tool.",
    example: "A rule you write once applies whether a teammate is in the terminal or the Desktop GUI.",
    prerequisites: ["claude-code"], contrasts: [] },

  // ── surfaces (a parallel menu, not a ladder — S2) ────────────────────────
  { id: "cli", term: "the CLI", group: "surfaces",
    definition: "Claude Code in the terminal: scriptable and automatable.",
    example: "A teammate pipes a git diff into it for a quick review in their shell.",
    prerequisites: ["claude-code"], contrasts: ["desktop-code"] },

  { id: "desktop-code", term: "the Desktop Code tab", group: "surfaces",
    definition: "Claude Code with a graphical interface: visual diff review, panes, and parallel sessions, each in its own git worktree.",
    example: "A teammate runs three sessions side by side and reviews each diff visually.",
    prerequisites: ["claude-code"], contrasts: ["cli"] },

  { id: "headless", term: "headless mode", group: "surfaces",
    definition: "Running non-interactively (one prompt in, output out) for scripts and CI — available only in the terminal.",
    example: "A nightly job runs it with no human watching; the Desktop GUI can't do this.",
    prerequisites: ["cli"], contrasts: [] },

  { id: "cowork", term: "Cowork", group: "surfaces",
    definition: "The same agentic capability applied to non-developer knowledge work: give it a goal and it works across your files and apps, showing its plan before acting.",
    example: "An ops teammate has it organize a folder and draft a report from the files.",
    prerequisites: ["claude-code"], contrasts: ["cli", "desktop-code"] },

  { id: "codex", term: "Codex", group: "surfaces", primitive: true,
    definition: "A second coding agent (from OpenAI) some of your devs use alongside Claude Code.",
    example: "Half the team prefers Codex for some tasks; the shared setup has to work for both.",
    prerequisites: [], contrasts: ["cli"] },

  // ── config (what lives in the repo) ──────────────────────────────────────
  { id: "claude-md", term: "CLAUDE.md", group: "config",
    definition: "Always-loaded project instructions: conventions, how-to-build, and gotchas Claude reads every session.",
    example: "The repo's CLAUDE.md says how to run the tests and which patterns to follow.",
    prerequisites: ["shared-config"], contrasts: [] },

  { id: "agents-md", term: "AGENTS.md", group: "config",
    definition: "The Codex-facing instruction file — the mirror of CLAUDE.md so the same guidance reaches Codex.",
    example: "The repo carries both CLAUDE.md and AGENTS.md so Claude and Codex behave the same.",
    prerequisites: ["claude-md", "codex"], contrasts: [] },

  { id: "dot-claude", term: "the .claude directory", group: "config",
    definition: "The .claude/ folder where skills, sub-agents, hooks, and settings live as versioned code in the repo.",
    example: "Your repo commits .claude/ so every teammate gets the same setup via git.",
    prerequisites: ["claude-md"], contrasts: [] },

  { id: "settings", term: "settings.json", group: "config",
    definition: "Permissions, hooks, and environment config — committed for the team, with personal overrides kept local.",
    example: "Shared permission rules go in .claude/settings.json; one teammate's API profile stays in settings.local.json.",
    prerequisites: ["dot-claude"], contrasts: [] },

  // ── capabilities (what Claude can do) ────────────────────────────────────
  { id: "skill", term: "a skill", group: "capabilities",
    definition: "An on-demand capability whose description is its trigger — invoked when the description matches the task.",
    example: "A 'release-notes' skill the team shares, triggered when someone asks for a changelog.",
    prerequisites: ["dot-claude"], contrasts: [] },

  { id: "progressive-disclosure", term: "progressive disclosure", group: "capabilities",
    definition: "Keeping a skill lean: a short body plus references loaded only when needed, so it doesn't waste context.",
    example: "The skill's long checklist lives in references/, not in the always-loaded body.",
    prerequisites: ["skill"], contrasts: [] },

  { id: "sub-agent", term: "a sub-agent", group: "capabilities",
    definition: "A bounded mission run in its own context with only the tools it needs, returning a summary rather than a transcript.",
    example: "A read-only 'security review' agent the team shares, scoped to Read and Grep.",
    prerequisites: ["dot-claude"], contrasts: [] },

  { id: "hook", term: "a hook", group: "capabilities",
    definition: "A command that runs on a lifecycle event and is enforced — it fires no matter what, unlike the advisory CLAUDE.md.",
    example: "A post-edit hook auto-formats every file the team edits.",
    prerequisites: ["settings"], contrasts: [] },

  { id: "mcp", term: "an MCP server", group: "capabilities",
    definition: "An external tool Claude can call (GitHub, a database) via the Model Context Protocol; shared in the repo with secrets kept out of the file.",
    example: "A shared GitHub MCP server in .mcp.json, its token referenced as ${ENV}.",
    prerequisites: ["dot-claude"], contrasts: [] },

  { id: "portable-skill", term: "a portable skill", group: "capabilities",
    definition: "A skill authored once in a portable source and used in BOTH Claude and Codex, paired with AGENTS.md.",
    example: "The 'house-standards' skill lives in one source and is available to Claude and Codex alike.",
    prerequisites: ["skill", "agents-md"], contrasts: ["skill"] },

  // ── distribution (how a team shares it) ──────────────────────────────────
  { id: "plugin", term: "a plugin", group: "distribution",
    definition: "A versioned bundle of skills, sub-agents, hooks, and MCP servers — the unit you share.",
    example: "The team's 'frontend' plugin bundles a skill, a review agent, and a lint hook.",
    prerequisites: ["skill", "sub-agent", "hook", "mcp"], contrasts: [] },

  { id: "marketplace", term: "a plugin marketplace", group: "distribution",
    definition: "A catalog repo of plugins: the team adds it once, installs the plugins it needs, and gets updates by pushing to the repo.",
    example: "A private GitHub marketplace; everyone runs `/plugin marketplace add` once.",
    prerequisites: ["plugin"], contrasts: [] },

  // ── governance (policy & plan) ───────────────────────────────────────────
  { id: "managed-settings", term: "managed settings", group: "governance",
    definition: "Organization policy that overrides local config, delivered by an admin from the console or a policy file.",
    example: "An admin policy that denies reading secret files, applied to everyone.",
    prerequisites: ["settings"], contrasts: [] },

  { id: "precedence", term: "settings precedence", group: "governance",
    definition: "The order settings resolve in: managed (org) wins, then CLI, then local, then project, then user.",
    example: "A teammate's personal rule can't loosen the org's managed deny rule.",
    prerequisites: ["managed-settings"], contrasts: [] },

  { id: "seats", term: "seats & plan gating", group: "governance",
    definition: "Per-seat plans decide access: a Premium seat includes Claude Code, and some autonomous features (computer use, Dispatch) are Pro/Max-only, not on Team.",
    example: "Your devs need Premium seats; the ops folks' Cowork computer-use isn't on the Team plan.",
    prerequisites: ["claude-code"], contrasts: [] },

  // ── decision (the goal) ──────────────────────────────────────────────────
  { id: "four-tier-model", term: "the four-tier model", group: "decision",
    definition: "Where each shared thing belongs: project config in the repo, cross-project tools in a marketplace, org policy in managed settings, and personal config local.",
    example: "A repo-specific rule → .claude/; a cross-repo skill → a plugin in the marketplace; a security rule → managed settings.",
    prerequisites: ["dot-claude", "marketplace", "managed-settings"], contrasts: [] },

  { id: "shared-library", term: "a shared library", group: "decision",
    definition: "One set of skills, agents, and tools the whole team uses — versioned, distributed, and working across both Claude and Codex.",
    example: "The team's marketplace + portable skills + repo config: one library, every teammate, both tools.",
    prerequisites: ["marketplace", "portable-skill", "four-tier-model"], contrasts: [] },
];

/** Per-edge justification, keyed "concept>prerequisite": the kind (always-on edge label) + the why. */
export const PREREQ_WHY: Record<string, PrereqWhy> = {
  "shared-config>claude-code": { kind: "defined-via", why: "shared config is the thing that makes Claude Code's front-ends one tool." },
  "cli>claude-code": { kind: "is-a", why: "the CLI is one front-end of Claude Code." },
  "desktop-code>claude-code": { kind: "is-a", why: "the Desktop Code tab is the same Claude Code engine with a GUI." },
  "headless>cli": { kind: "operates-on", why: "headless is a way of running the CLI specifically." },
  "cowork>claude-code": { kind: "refines", why: "Cowork is the same agentic capability, simplified for non-dev knowledge work." },
  "claude-md>shared-config": { kind: "part-of", why: "CLAUDE.md is the instruction part of the shared config." },
  "agents-md>claude-md": { kind: "defined-via", why: "AGENTS.md is defined as the mirror of CLAUDE.md." },
  "agents-md>codex": { kind: "assumes", why: "AGENTS.md only matters because Codex reads it instead of CLAUDE.md." },
  "dot-claude>claude-md": { kind: "part-of", why: "CLAUDE.md is one file in the .claude directory." },
  "settings>dot-claude": { kind: "part-of", why: "settings.json lives inside .claude/." },
  "skill>dot-claude": { kind: "part-of", why: "skills live under .claude/skills." },
  "progressive-disclosure>skill": { kind: "operates-on", why: "progressive disclosure is a way of structuring a skill." },
  "sub-agent>dot-claude": { kind: "part-of", why: "sub-agents live under .claude/agents." },
  "hook>settings": { kind: "defined-via", why: "hooks are configured in settings." },
  "mcp>dot-claude": { kind: "part-of", why: "MCP servers are configured in the repo's .claude/.mcp.json." },
  "portable-skill>skill": { kind: "refines", why: "a portable skill is a skill made to work across tools." },
  "portable-skill>agents-md": { kind: "defined-via", why: "portability across Codex is achieved via the AGENTS.md pairing." },
  "plugin>skill": { kind: "part-of", why: "a plugin can bundle skills." },
  "plugin>sub-agent": { kind: "part-of", why: "a plugin can bundle sub-agents." },
  "plugin>hook": { kind: "part-of", why: "a plugin can bundle hooks." },
  "plugin>mcp": { kind: "part-of", why: "a plugin can bundle MCP servers." },
  "marketplace>plugin": { kind: "operates-on", why: "a marketplace is a catalog of plugins." },
  "managed-settings>settings": { kind: "refines", why: "managed settings are settings delivered and enforced by an admin." },
  "precedence>managed-settings": { kind: "defined-via", why: "precedence is the rule for how managed settings override the rest." },
  "seats>claude-code": { kind: "assumes", why: "seats gate who can use Claude Code and which features." },
  "four-tier-model>dot-claude": { kind: "part-of", why: "the repo .claude/ is one of the four tiers." },
  "four-tier-model>marketplace": { kind: "part-of", why: "the marketplace is one of the four tiers." },
  "four-tier-model>managed-settings": { kind: "part-of", why: "managed settings are one of the four tiers." },
  "shared-library>marketplace": { kind: "part-of", why: "the marketplace distributes the shared library." },
  "shared-library>portable-skill": { kind: "part-of", why: "portable skills make the library span Claude + Codex." },
  "shared-library>four-tier-model": { kind: "defined-via", why: "the shared library is organized by the four-tier model." },
};
