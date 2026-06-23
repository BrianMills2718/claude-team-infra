/**
 * The seven stage lessons, authored to the craft bar (docs/CRAFT_PATTERN.md): each opens with a
 * HOOK (a want/pain), leads with a PICTURE/ANALOGY then names the parts, and runs a THEREFORE/BUT
 * spine — not a listicle. Plain prose (no @t/@n chips → no closure debt). Each has ≥2 confusions,
 * ≥3 quiz, ≥1 visualization, a mastery checkpoint.
 */
import type { Lesson } from "../../types";

export const stage0: Lesson = {
  id: "stage-0", stage: 0, title: "Start Here: One Tool, Many Front-ends",
  summary:
    "You're about to set up Claude for your team and the names already blur together — Desktop, Code tab, CLI, Cowork, Codex. Before any of that: most of the confusion dissolves once you see that it's mostly one tool wearing different faces.",
  prerequisites: [],
  objectives: [
    "See why Desktop and the CLI are not rival products.",
    "Name what they share (config) and what they don't (Codex).",
  ],
  definitions: [
    { term: "Claude Code", short: "Anthropic's agentic coding tool — one engine you drive from a terminal or a GUI." },
    { term: "shared config", short: "The CLAUDE.md, MCP, hooks, skills, and settings every front-end reads the same way." },
  ],
  sections: [
    {
      heading: "One engine, many dashboards",
      body: "Picture a car engine with two dashboards bolted on — a stripped racing readout and a full touchscreen. Different controls, same engine underneath. Claude Code is like that: the terminal (the CLI) and the Desktop Code tab are two dashboards over one engine, reading the same configuration.",
    },
    {
      heading: "Therefore: configure once",
      body: "Because they share config, a rule you write once applies whether a teammate is in the terminal or the GUI. That is the whole game for a team: get the shared config right, and every surface behaves.",
    },
    {
      heading: "But: Codex is a different engine",
      body: "Your team also uses Codex (a second coding agent). It is not the same engine — so 'configure once' only spans Claude until you make things deliberately portable (we get there in stage 3). Hold that exception; it shapes the whole setup.",
    },
  ],
  visualizations: [
    {
      id: "v0", kind: "comparison-table", title: "Same engine?",
      textualSummary:
        "The CLI and Desktop Code tab share one Claude Code engine and config; Codex is a separate engine you bridge to deliberately.",
      columns: ["CLI", "Desktop Code", "Codex"],
      rows: [
        { label: "Same Claude Code engine", cells: { CLI: { value: "yes" }, "Desktop Code": { value: "yes" }, Codex: { value: "no" } } },
        { label: "Reads the shared config", cells: { CLI: { value: "yes" }, "Desktop Code": { value: "yes" }, Codex: { value: "n/a", note: "via a portable bridge" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "Desktop and the CLI are different products you must choose between.", correction: "They're front-ends over one engine sharing config; use either, switch any time." },
    { misconception: "Codex shares Claude's config automatically.", correction: "It doesn't — Codex is a separate engine; you bridge it deliberately (stage 3)." },
  ],
  quiz: [
    { id: "q0a", type: "multiple-choice", prompt: "What do the CLI and Desktop Code tab share?", options: ["Nothing", "One engine and the same config", "Only the logo", "A separate license"], correct: 1, explanation: "Same engine, same CLAUDE.md / MCP / skills / settings." },
    { id: "q0b", type: "true-false", prompt: "Codex automatically uses Claude's CLAUDE.md.", correct: false, explanation: "Codex is a separate engine; bridging is deliberate (AGENTS.md / portable skills)." },
    { id: "q0c", type: "multiple-choice", prompt: "For a team, the highest-leverage thing to get right is:", options: ["Which logo to use", "The shared config every surface reads", "The fastest laptop", "The Slack channel name"], correct: 1, explanation: "Shared config drives behaviour across every surface." },
  ],
  masteryCheckpoint: "You can explain why 'Desktop vs Claude Code' is the wrong framing, and why Codex is the exception.",
};

export const stage1: Lesson = {
  id: "stage-1", stage: 1, title: "The Surfaces",
  summary:
    "Your people will ask 'which one do I open?' — and the honest answer isn't one tool, it's a menu. Get the menu wrong and a dev fights a GUI to script something, or an ops teammate never discovers the surface built for them.",
  prerequisites: ["stage-0"],
  objectives: [
    "Match each surface to the work it fits.",
    "Spot the one thing the CLI does that the GUI can't, and vice-versa.",
  ],
  definitions: [
    { term: "the CLI", short: "Claude Code in the terminal: scriptable and automatable." },
    { term: "the Desktop Code tab", short: "Claude Code with a GUI: visual diffs, panes, parallel sessions." },
    { term: "headless mode", short: "Running non-interactively for scripts/CI — terminal-only." },
    { term: "Cowork", short: "The agentic capability for non-dev knowledge work; shows its plan before acting." },
    { term: "Codex", short: "A second coding agent used alongside Claude Code." },
  ],
  sections: [
    {
      heading: "A kitchen, not a single knife",
      body: "Think of one pantry (your shared config) feeding several stations: a prep station, a grill, a plating station. Same ingredients, different station for the job. The surfaces are stations: the CLI for fast scripted prep, the Desktop Code tab for plating (visual review, panes), Cowork for the non-cook who still needs a dish made.",
    },
    {
      heading: "Therefore: pick by task, not loyalty",
      body: "Devs live in the CLI for automation and reach for the Desktop GUI to review a diff visually — both off the same pantry. Non-dev folks use Cowork to get a finished deliverable from their files.",
    },
    {
      heading: "But: the stations aren't interchangeable",
      body: "Only the terminal runs headless (scripts/CI) — the GUI can't. And Cowork's most autonomous moves (driving your apps, sending a task from your phone) are plan-gated, which we settle in stage 5.",
    },
  ],
  visualizations: [
    {
      id: "v1", kind: "comparison-table", title: "Which surface for which work",
      textualSummary:
        "CLI for headless/automation; Desktop for visual review; Cowork for non-dev autonomous work; all over the shared config.",
      columns: ["CLI", "Desktop", "Cowork"],
      rows: [
        { label: "Headless / CI", cells: { CLI: { value: "yes" }, Desktop: { value: "no" }, Cowork: { value: "no" } } },
        { label: "Visual diff review", cells: { CLI: { value: "no" }, Desktop: { value: "yes" }, Cowork: { value: "n/a" } } },
        { label: "Non-dev knowledge work", cells: { CLI: { value: "no" }, Desktop: { value: "no" }, Cowork: { value: "yes" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "You should pick one surface and standardize on it.", correction: "They're a menu over one config; pick per task and combine." },
    { misconception: "The Desktop GUI can run headless jobs in CI.", correction: "Headless is terminal-only; the GUI is interactive." },
  ],
  quiz: [
    { id: "q1a", type: "multiple-choice", prompt: "A nightly CI job needs Claude with no human watching. Which surface?", options: ["Desktop Code tab", "Cowork", "The CLI (headless)", "Codex Chat"], correct: 2, explanation: "Headless is CLI-only." },
    { id: "q1b", type: "true-false", prompt: "Cowork is aimed at non-developer knowledge work.", correct: true, explanation: "It returns finished deliverables from your files/apps." },
    { id: "q1c", type: "multiple-choice", prompt: "Best reason to open the Desktop Code tab over the CLI:", options: ["It's a different engine", "Visual diff review and side-by-side panes", "It can script CI", "It hides your config"], correct: 1, explanation: "GUI strengths are visual review and parallel panes." },
  ],
  masteryCheckpoint: "You can route a given task to the right surface and name what each can't do.",
};

export const stage2: Lesson = {
  id: "stage-2", stage: 2, title: "Config as Code",
  summary:
    "Two teammates get different results from the same prompt, and nobody knows why. The fix isn't a better prompt — it's making the setup itself shared, versioned, and reviewed like code.",
  prerequisites: ["stage-1"],
  objectives: [
    "Name the files that make a setup shared.",
    "Keep Claude and Codex on the same page; keep secrets out.",
  ],
  definitions: [
    { term: "CLAUDE.md", short: "Always-loaded project instructions Claude reads every session." },
    { term: "AGENTS.md", short: "The Codex-facing mirror of CLAUDE.md." },
    { term: "the .claude directory", short: "Skills, agents, hooks, and settings kept as versioned code in the repo." },
    { term: "settings.json", short: "Permissions, hooks, env — committed for the team; personal bits stay local." },
  ],
  sections: [
    {
      heading: "A team handbook, committed with the code",
      body: "Imagine a handbook that ships inside the repo, so anyone who clones it gets the house rules automatically. That's the .claude directory and CLAUDE.md: instructions, skills, agents, hooks — versioned alongside the code, reviewed in PRs.",
    },
    {
      heading: "Therefore: commit it, review it",
      body: "Commit the .claude directory and CLAUDE.md, and a teammate's clone behaves like yours. A bad line hits everyone every session, so it earns code review — the same bar as source.",
    },
    {
      heading: "But: two engines, and no secrets",
      body: "Codex reads AGENTS.md, not CLAUDE.md — so carry both to keep the two engines aligned. And nothing secret goes in any of these files; reference secrets by environment variable, because the repo is shared.",
    },
  ],
  visualizations: [
    {
      id: "v2", kind: "comparison-table", title: "Commit, or keep local?",
      textualSummary:
        "Project CLAUDE.md/AGENTS.md/.claude are committed for the team; personal overrides stay local; secrets never go in any of them.",
      columns: ["Commit (team)", "Local only"],
      rows: [
        { label: "CLAUDE.md / AGENTS.md / .claude", cells: { "Commit (team)": { value: "yes" }, "Local only": { value: "no" } } },
        { label: "Personal settings.local.json", cells: { "Commit (team)": { value: "no" }, "Local only": { value: "yes" } } },
        { label: "Literal secrets", cells: { "Commit (team)": { value: "no" }, "Local only": { value: "no", note: "use env vars" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "Config should live in each person's home directory.", correction: "Commit it to the repo so it's shared and reviewable; home-dir config is per-person and drifts." },
    { misconception: "AGENTS.md is optional if you have CLAUDE.md.", correction: "Codex reads AGENTS.md, not CLAUDE.md; you need both to keep both engines aligned." },
  ],
  quiz: [
    { id: "q2a", type: "multiple-choice", prompt: "Where does shared project setup belong?", options: ["Each person's home .claude", "Committed .claude in the repo", "A private DM", "Nowhere"], correct: 1, explanation: "A committed .claude ships to everyone via git." },
    { id: "q2b", type: "true-false", prompt: "It's fine to put an API key in CLAUDE.md if the repo is private.", correct: false, explanation: "Never; reference secrets by env var or OAuth." },
    { id: "q2c", type: "multiple-choice", prompt: "Which file keeps Codex aligned with Claude?", options: ["AGENTS.md", "README.md", "package.json", "settings.local.json"], correct: 0, explanation: "AGENTS.md mirrors CLAUDE.md for Codex." },
  ],
  masteryCheckpoint: "You can place each piece of setup in the right file and keep both engines aligned without leaking secrets.",
};

export const stage3: Lesson = {
  id: "stage-3", stage: 3, title: "Capabilities",
  summary:
    "You catch yourself pasting the same multi-step instructions for the tenth time, or wishing a rule would just always run. That itch is the signal to reach for skills, agents, hooks, and MCP — the things that turn 'describe it again' into 'it's built in.'",
  prerequisites: ["stage-2"],
  objectives: [
    "Pick the right capability for a need (skill vs agent vs hook vs MCP).",
    "Make a skill portable to Codex.",
  ],
  definitions: [
    { term: "a skill", short: "An on-demand capability whose description triggers it." },
    { term: "progressive disclosure", short: "A lean skill body plus references loaded only when needed." },
    { term: "a sub-agent", short: "A bounded mission in its own context with least-privilege tools." },
    { term: "a hook", short: "A command that runs on a lifecycle event and is enforced." },
    { term: "an MCP server", short: "An external tool Claude can call, e.g. GitHub or a database." },
    { term: "a portable skill", short: "A skill authored once and used in both Claude and Codex." },
  ],
  sections: [
    {
      heading: "A workbench of tools",
      body: "Picture a workbench: some tools you reach for when a job needs them (skills), some are bolted-down jigs that act on every piece automatically (hooks), and there's a gateway to machines in the next room (MCP — GitHub, a database). A sub-agent is a junior you send off with one task and just the tools for it.",
    },
    {
      heading: "Therefore: match the tool to the need",
      body: "A repeatable procedure → a skill (kept lean by pushing detail to references). A bounded investigation → a sub-agent. A rule that must always fire → a hook. An external system → an MCP server.",
    },
    {
      heading: "But: a tool only you can reach isn't a team tool",
      body: "A skill sitting in your personal home .claude is invisible to teammates — and to Codex. Skills use an open format (SKILL.md) that both tools support, but each tool only looks in its OWN directory — Claude in .claude/skills, Codex in .agents/skills. So 'portable' means: write it once, then commit or mirror it into each tool's skills directory. (Sharing it widely is stage 4.)",
    },
  ],
  visualizations: [
    {
      id: "v3", kind: "comparison-table", title: "Which capability?",
      textualSummary:
        "Skill = a reachable procedure; hook = an enforced rule; MCP = an external tool; sub-agent = a bounded mission.",
      columns: ["Skill", "Hook", "MCP", "Sub-agent"],
      rows: [
        { label: "Enforced (always runs)", cells: { Skill: { value: "no" }, Hook: { value: "yes" }, MCP: { value: "n/a" }, "Sub-agent": { value: "no" } } },
        { label: "Reaches an external system", cells: { Skill: { value: "no" }, Hook: { value: "no" }, MCP: { value: "yes" }, "Sub-agent": { value: "no" } } },
        { label: "Own isolated context", cells: { Skill: { value: "no" }, Hook: { value: "no" }, MCP: { value: "no" }, "Sub-agent": { value: "yes" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "A hook is just advice Claude might follow.", correction: "Hooks are enforced — they run on their event regardless of what Claude decides." },
    { misconception: "A skill in your home .claude is available to the team.", correction: "It's siloed; commit it or ship it as a plugin, and make it portable for Codex." },
  ],
  quiz: [
    { id: "q3a", type: "multiple-choice", prompt: "You need linting to run on every edit, guaranteed. Use:", options: ["A skill", "A hook", "An MCP server", "A sub-agent"], correct: 1, explanation: "Hooks are enforced on lifecycle events." },
    { id: "q3b", type: "true-false", prompt: "A skill in your personal home .claude is automatically shared with teammates.", correct: false, explanation: "It's siloed; commit it or distribute it as a plugin." },
    { id: "q3c", type: "multiple-choice", prompt: "What makes a skill usable in both Claude and Codex?", options: ["Renaming it", "The open SKILL.md format, placed in each tool's skills dir", "Putting it in README", "Nothing — it just works"], correct: 1, explanation: "Both tools read the open SKILL.md format, but each looks only in its own dir — commit/mirror it into .claude/skills and .agents/skills." },
  ],
  masteryCheckpoint: "You can choose the right capability for a need and make a skill portable across Claude and Codex.",
};

export const stage4: Lesson = {
  id: "stage-4", stage: 4, title: "Sharing It: Plugins & Marketplace",
  summary:
    "Three people on the team have each rebuilt the same review skill, slightly differently. The waste isn't the building — it's that there's no shelf everyone pulls from. That shelf is a plugin marketplace.",
  prerequisites: ["stage-3"],
  objectives: [
    "Bundle capabilities into a shareable, versioned unit.",
    "Distribute and update a shared library across many repos.",
  ],
  definitions: [
    { term: "a plugin", short: "A versioned bundle of skills, sub-agents, hooks, and MCP servers." },
    { term: "a plugin marketplace", short: "A catalog repo of plugins: add once, install, get updates." },
  ],
  sections: [
    {
      heading: "An app store for your team",
      body: "Picture a private app store: a shelf of installable bundles, each versioned, each one click to add. A plugin is one app on the shelf — it can carry skills, agents, hooks, and MCP servers together. A marketplace is the shelf: a catalog repo your team adds once.",
    },
    {
      heading: "Therefore: build once, install everywhere",
      body: "Package the review skill + agent + lint hook as a plugin; publish it in your marketplace. Every repo runs the add command once, installs what it needs, and gets updates when you push a new version.",
    },
    {
      heading: "But: a shelf needs version hygiene",
      body: "Without versions, 'latest' drifts under people. Bump the plugin's version on each release (or let each git commit count as a version) so installs are predictable.",
    },
  ],
  visualizations: [
    {
      id: "v4", kind: "comparison-table", title: "Loose skills vs a marketplace",
      textualSummary:
        "A marketplace makes shared tooling versioned, discoverable, and auto-updating, instead of copied per-repo and drifting.",
      columns: ["Copied per repo", "Marketplace plugin"],
      rows: [
        { label: "Versioned & updatable", cells: { "Copied per repo": { value: "no" }, "Marketplace plugin": { value: "yes" } } },
        { label: "Discoverable to the team", cells: { "Copied per repo": { value: "no" }, "Marketplace plugin": { value: "yes" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "A plugin can only contain a skill.", correction: "It bundles skills, sub-agents, hooks, and MCP servers together." },
    { misconception: "Sharing means emailing a zip.", correction: "Use a marketplace repo: add once, install, and updates ship by pushing to the repo." },
    { misconception: "Installing a plugin is low-risk, like adding a bookmark.", correction: "One install activates its skills, hooks, and MCP servers as code under a single trust decision — vet the source and pin which marketplaces are allowed; audits have found malicious skills on open third-party marketplaces." },
  ],
  quiz: [
    { id: "q4a", type: "multiple-choice", prompt: "The cleanest way to share skills+agents+MCP across many repos:", options: ["Email a zip", "Each person copies them", "Plugins in a private marketplace", "Paste into every CLAUDE.md"], correct: 2, explanation: "Plugins bundle them; a marketplace distributes and updates them." },
    { id: "q4b", type: "true-false", prompt: "A plugin can bundle a skill, an agent, a hook, and an MCP server together.", correct: true, explanation: "That's exactly what a plugin is." },
    { id: "q4c", type: "multiple-choice", prompt: "How do teammates get an update to a shared plugin?", options: ["Reinstall the OS", "You push to the marketplace repo; they update", "Nothing updates", "Rebuild from scratch"], correct: 1, explanation: "Push to the repo; users refresh the marketplace." },
  ],
  masteryCheckpoint: "You can package capabilities as a plugin and distribute/update them through a marketplace.",
};

export const stage5: Lesson = {
  id: "stage-5", stage: 5, title: "Governance & Plan",
  summary:
    "Someone is one keystroke from committing a secret, and a polite note in CLAUDE.md won't stop them. Governance is how you turn the must-nots into things the system enforces — and how you avoid paying for features your plan doesn't include.",
  prerequisites: ["stage-2"],
  objectives: [
    "Enforce the non-negotiables without trusting goodwill.",
    "Know which seat unlocks what, and the Team-plan gap.",
  ],
  definitions: [
    { term: "managed settings", short: "Org policy that overrides local config, delivered by an admin." },
    { term: "settings precedence", short: "Managed (org) wins, then CLI, then local, then project, then user." },
    { term: "seats & plan gating", short: "Claude Code is on every Team seat (Premium just adds usage); computer use & Dispatch are a Pro/Max preview, not documented for Team." },
  ],
  sections: [
    {
      heading: "House rules vs. a locked door",
      body: "CLAUDE.md is a house rule — guidance people usually follow. Managed settings are a locked door: org policy that overrides local config and can't be opened from inside. Use the door for the things that must never happen (reading secrets, destructive commands), the house rule for everything else.",
    },
    {
      heading: "Therefore: enforce a thin floor",
      body: "Even a light-touch team enforces two or three non-negotiables via managed settings — deny secret reads, pin which plugin marketplaces can be added (installing a plugin runs its skills, hooks and MCP servers as code), ship a short security CLAUDE.md — and lets convention handle the rest. Precedence guarantees a personal setting can't loosen the org rule.",
    },
    {
      heading: "But: know what the plan actually includes",
      body: "Claude Code ships on every Team seat — both Standard and Premium; Premium just buys heavy users more usage, it is not the thing that unlocks Claude Code. The fully autonomous extras — computer use, phone Dispatch — are a Pro/Max research preview and aren't part of the documented Team plan, so don't promise them as a team default.",
    },
  ],
  visualizations: [
    {
      id: "v5", kind: "comparison-table", title: "Advisory vs enforced",
      textualSummary:
        "CLAUDE.md is advisory; managed settings are enforced and override local config; some features are plan-gated.",
      columns: ["CLAUDE.md", "Managed settings"],
      rows: [
        { label: "Enforced (can't be overridden)", cells: { "CLAUDE.md": { value: "no" }, "Managed settings": { value: "yes" } } },
        { label: "Set by an admin org-wide", cells: { "CLAUDE.md": { value: "n/a" }, "Managed settings": { value: "yes" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "A strongly-worded CLAUDE.md will stop risky actions.", correction: "It's advisory; enforce must-nots with managed settings, which override local config." },
    { misconception: "Devs need a Premium seat to get Claude Code, and computer use comes with Team.", correction: "Claude Code is on every Team seat (Premium only adds usage); computer use and Dispatch are a Pro/Max preview, not a documented Team feature." },
  ],
  quiz: [
    { id: "q5a", type: "multiple-choice", prompt: "To guarantee nobody can read secret files, use:", options: ["A note in CLAUDE.md", "Managed settings (deny rule)", "A Slack reminder", "Hope"], correct: 1, explanation: "Managed settings are enforced and override local config." },
    { id: "q5b", type: "true-false", prompt: "Computer use and Dispatch are included on the Team plan.", correct: false, explanation: "They're a Pro/Max research preview — not part of the documented Team plan. (Claude Code itself, by contrast, is on every Team seat.)" },
    { id: "q5c", type: "multiple-choice", prompt: "Which wins a conflict?", options: ["A user's personal setting", "The org's managed setting", "The newest file", "Whichever is longer"], correct: 1, explanation: "Managed (org) has highest precedence." },
  ],
  masteryCheckpoint: "You can enforce the non-negotiables with managed settings and explain the Team-plan feature gap.",
};

export const stage6: Lesson = {
  id: "stage-6", stage: 6, title: "Decide: Your Team's Shared Setup",
  summary:
    "You now know the parts — but the real question your team is waiting on is simpler and harder: where does each shared thing actually live, and what do we commit to? This is where you decide.",
  prerequisites: ["stage-4", "stage-5"],
  objectives: [
    "Place any shared thing in the right tier.",
    "Assemble it into one shared library across Claude + Codex, and justify the call.",
  ],
  definitions: [
    { term: "the four-tier model", short: "Project config in the repo; cross-project tools in a marketplace; org policy in managed settings; personal config local." },
    { term: "a shared library", short: "One set of skills/agents/tools the whole team uses, across Claude and Codex." },
  ],
  sections: [
    {
      heading: "A filing system with four drawers",
      body: "Every shared thing goes in one of four labelled drawers: project (the repo's .claude — rules specific to this codebase), cross-project (a marketplace plugin — tools many repos want), org policy (managed settings — the enforced non-negotiables), and personal (local — your own preferences). Ask one question of anything you're about to share: which drawer?",
    },
    {
      heading: "Therefore: one library, four drawers",
      body: "Run those drawers and you have a shared library: a marketplace of plugins for cross-project tools, repo .claude + AGENTS.md for project rules, a thin managed-settings layer for the must-nots — portable so it serves Claude and Codex. One library, every teammate, both tools.",
    },
    {
      heading: "But: state the call, lightly",
      body: "For your situation — a small team, mixed OS, light governance — the honest decision is convention-first: commit the .claude directory, stand up one marketplace, enforce only secrets-and-safety. Write that down (a short rationale) so it can be explained and revisited, not re-argued.",
    },
  ],
  visualizations: [
    {
      id: "v6", kind: "comparison-table", title: "Which drawer?",
      textualSummary:
        "Project rules → repo .claude; cross-project tools → marketplace; org policy → managed settings; personal → local.",
      columns: ["Project (repo)", "Marketplace", "Managed", "Personal"],
      rows: [
        { label: "A rule only this repo needs", cells: { "Project (repo)": { value: "yes" }, Marketplace: { value: "no" }, Managed: { value: "no" }, Personal: { value: "no" } } },
        { label: "A skill many repos want", cells: { "Project (repo)": { value: "no" }, Marketplace: { value: "yes" }, Managed: { value: "no" }, Personal: { value: "no" } } },
        { label: "A security must-not", cells: { "Project (repo)": { value: "no" }, Marketplace: { value: "no" }, Managed: { value: "yes" }, Personal: { value: "no" } } },
      ],
    },
  ],
  confusions: [
    { misconception: "All shared config should live in one place.", correction: "It's four tiers; match each thing to its drawer (project / marketplace / managed / personal)." },
    { misconception: "A decision doesn't need to be written down.", correction: "A short rationale lets you explain and revisit it instead of re-arguing each time." },
  ],
  quiz: [
    { id: "q6a", type: "multiple-choice", prompt: "A skill many repos want belongs in:", options: ["A personal home .claude", "A marketplace plugin", "Each repo's README", "Managed settings"], correct: 1, explanation: "Cross-project tools live in the marketplace." },
    { id: "q6b", type: "true-false", prompt: "A security must-not is best enforced via managed settings.", correct: true, explanation: "Managed settings are the enforced, org-wide tier." },
    { id: "q6c", type: "multiple-choice", prompt: "For a small, mixed-OS, light-governance team, a sensible default is:", options: ["Lock everything down", "Convention-first + a thin enforced floor", "No shared config at all", "One giant CLAUDE.md"], correct: 1, explanation: "Convention-first with a couple of enforced guardrails fits a small team." },
  ],
  masteryCheckpoint: "You can place any shared thing in the right tier and justify a team setup across Claude + Codex.",
};
