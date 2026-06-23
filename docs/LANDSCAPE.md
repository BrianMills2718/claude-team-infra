# The landscape — positions & debates (as of June 2026)

Research pass behind this curriculum: official docs verification (two agents) + a
community/social sweep (HN threads + comments, Reddit-meta via DEV.to, practitioner
blogs, security research). This file records the **debates, positions, and
arguments** so the curriculum reflects the real argument space, not one vendor's
framing. Perishable — `as_of: 2026-06-23`.

## Where the documentation corrected the curriculum

Verified every load-bearing claim against `code.claude.com/docs`, `developers.openai.com/codex`,
`agents.md`, `agentskills.io`, and support/changelog pages. Three fixes landed:

1. **Seats (was wrong).** Claude Code is included on **every Team seat (Standard *and*
   Premium)** — Premium only buys more usage, it is **not** the gate for Claude Code.
   The "Premium/Code-seat required" idea applies only to *legacy* Enterprise plans.
   *(Fixed in `seats`, stage-5.)*
2. **Computer use / Dispatch (was overstated).** Docs say these are a **Pro/Max research
   preview** (announced Mar 2026, macOS **and** Windows). They do **not** document
   Team/Enterprise *exclusion* — so "not on Team" is an inference, not a fact. The
   curriculum now says "a Pro/Max preview, not part of the documented Team plan."
3. **Portable skills (mechanism was wrong).** Portability is **not** "via AGENTS.md."
   Skills are an **open format (SKILL.md, `agentskills.io`)** that both tools support,
   but each tool reads only its **own** directory — Claude `.claude/skills`, Codex
   `.agents/skills`. Portable = write once, commit/mirror into each tool's dir.
   *(Fixed in `portable-skill`, stage-3.)*

Confirmed as taught: CLI ≡ Desktop Code tab (same engine/config); headless is CLI-only;
Cowork is on paid plans incl. Team and shows its plan before acting; settings precedence
(managed > CLI > local > project > user); managed-settings keys all exist; `.claude/`
distributes per-repo; plugins bundle skills/agents/hooks/MCP (+LSP); marketplace =
`.claude-plugin/marketplace.json`, `/plugin marketplace add` → `/plugin install` →
`/plugin marketplace update`. One nuance to teach: the Desktop **Code tab** is *not* the
legacy Claude **desktop chat** app — the chat app's `claude_desktop_config.json` MCP
config is separate and does not appear in the Code tab.

## The live debates

### 1. AGENTS.md vs Skills — passive context vs model-invoked retrieval
The sharpest current debate. Vercel's eval (Next.js 16 APIs absent from training):
baseline **53%**, Skills default **53%** (the skill was *never invoked in 56% of cases*),
Skills + explicit instructions **79%**, a compressed **AGENTS.md docs-index 100%**.
- **Position A (Vercel):** for *knowledge/context*, a static always-loaded docs index beats
  model-invoked skills *today* — "results matter now; don't wait for skills to improve."
- **Position B (counter):** skills win for *vertical, explicitly-triggered action workflows*;
  the gap is a current model limitation (unreliable tool-triggering) that will close.
- **Curriculum stance:** skills are the right primitive for *procedures/actions*; for
  *always-true knowledge*, prefer CLAUDE.md/AGENTS.md context. Don't oversell skills as the
  answer to everything. (See also the meta-take: *"the file isn't the problem, your lack of
  evals is"* — measure, don't cargo-cult.)

### 2. Config-file proliferation — one standard vs per-tool files
CLAUDE.md vs AGENTS.md vs `.cursorrules` vs `.github/copilot-instructions.md`…
- **Pro-standard:** AGENTS.md is now a **Linux Foundation (Agentic AI Foundation) open
  standard**, ~60k projects, 20+ tools — "standards derive value from being simple and
  widely adopted." Reduces lock-in.
- **Skeptics:** agent docs ≠ human README (context efficiency, ALL-CAPS style that reads
  harsh to humans, negative-assertion bias); "the standard solves *discovery*, not
  *compliance*" — instructions still get dropped mid-conversation.
- **The workaround everyone uses:** `ln -s AGENTS.md CLAUDE.md` (or generate one from the
  other) — one source, both tools. Claude Code reads CLAUDE.md natively, **not** AGENTS.md,
  so a bridge is required.

### 3. MCP context bloat — the strongest operational consensus
- Loading ~81 MCP tools can eat **~143K tokens (72% of a 200K window) before the first
  message**; tool outputs compound it ("after 30 min, 40% of context gone").
- **Dominant best practice (sshh.io, Anthropic-aligned):** an MCP should be a **thin secure
  gateway with a few high-level tools**, not a bloated API. **Migrate stateless tools
  (Jira/GitHub/AWS) to plain CLIs; reserve MCP for stateful environments (Playwright).**
  *(This matches Brian's own CLI-first / MCP-only-for-justified-boundaries policy.)*
- **Counter:** don't restrict tools — use a compression middleware (e.g. "context mode"
  routing outputs through a sandbox) to claim ~98% reduction. Tooling vs discipline.

### 4. Custom subagents — useful isolation vs context gatekeeping
- **For (mainstream):** subagents give an isolated context window + least-privilege tools;
  use for large refactors, deep research, parallel work.
- **Against (sshh.io):** custom subagents *gatekeep context* (hide info from the main
  agent's holistic reasoning) and *force workflows*; prefer built-in `Task()` clones that
  keep full context and let the agent decide orchestration.
- **Curriculum stance:** teach subagents as *bounded missions*, and name the cost (context
  isolation is a trade, not a free win).

### 5. CLAUDE.md at scale — the unowned-config-rot anti-pattern
Strong, consistent practitioner consensus:
- **#1 anti-pattern: the over-stuffed CLAUDE.md.** Too long → the model ignores half;
  every line loads every session for every engineer. "In a shared repo, CLAUDE.md grows
  like any unowned config — everyone appends, nothing gets deleted."
- **Fixes:** keep it short (~<200 lines), **give it an owner**, **review it like code**;
  prefer **positive** over negative constraints; don't `@`-embed whole files.
- **Monorepo pattern: the Context Cascade** — root CLAUDE.md (global rules/pointers) +
  per-package CLAUDE.md (local stack/conventions); the model loads files along the path
  from cwd to root, so guidance sharpens near the code.
- **Org role emerging:** an **"agent manager"** (PM/eng hybrid) or at minimum a **DRI** who
  owns the Claude Code config.

### 6. Plugin/marketplace security — the governance counterweight
Directly relevant to a "light governance" choice: **a marketplace is a code-distribution
channel, and the trust unit is the whole plugin.**
- One `/plugin install` activates skills + slash commands + subagents + **shell hooks** +
  MCP servers + LSP + background processes + arbitrary executables — under **one** trust
  decision.
- **Snyk audit (Feb 2026)** of ~3,984 skills on a third-party marketplace: **36.8% had a
  vulnerability, 13.4% critical, 76 confirmed malicious payloads, 10.9% leaked secrets.**
- **PromptArmor:** "Hijacking Claude Code via Injected Marketplace Plugins" (real attack
  class); Pluto Security maps connector-composition attacks (untrusted input chaining
  low-risk connectors into RCE).
- **Enterprise levers (managed-only):** `strictKnownMarketplaces`, `blockedMarketplaces`,
  `strictPluginOnlyCustomization`, `allowedMcpServers`, and `allowManagedHooksOnly` /
  `allowManagedMcpServersOnly` / `allowManagedPermissionRulesOnly`.
- **Curriculum stance (now reflected):** even a light-touch team should **pin which
  marketplaces can be added** and **vet plugin sources** — installing a plugin is running
  its code. (Added to stage-4 and stage-5.)

### 7. Claude Code vs Codex — not either/or
From a DEV.to synthesis of 500+ Reddit developers + benchmarks:
- Claude Code: higher code quality (~67% blind-test win) but tighter usage limits; leads
  **SWE-bench**. Codex: slightly lower quality but cheaper (~4× fewer tokens), leads
  **Terminal-Bench**; historically weaker MCP support.
- **Consensus: the productive move is to run both** — "Codex for keystroke, Claude Code for
  commits"; Claude for architecture, Codex for DevOps. *(This is exactly why the curriculum
  is dual-engine and treats portability as load-bearing, not a bolt-on.)*

## How this changed the build
- 3 factual corrections (seats, computer-use/Dispatch, portable-skill mechanism).
- 2 grounded governance enrichments (plugin-trust confusion in stage-4; marketplace pinning
  in stage-5's enforced floor).
- Framing validated: dual-engine setup, CLI-first/thin-MCP, and "convention-first + a thin
  enforced floor" all match the community's hard-won positions — with the one caveat that
  the enforced floor must include **marketplace trust**, not just secrets.

## Sources
- Docs: https://code.claude.com/docs (settings, hooks, skills, plugins, plugin-marketplaces,
  sub-agents, headless, desktop-quickstart, memory) · https://developers.openai.com/codex
  (agents-md, skills, config-reference) · https://agents.md · https://agentskills.io
- Plans: https://support.claude.com/en/articles/11845131 ·
  https://claude.com/product/cowork · https://claude.com/blog/dispatch-and-computer-use
- Debates: https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals ·
  https://news.ycombinator.com/item?id=44957443 (AGENTS.md) ·
  https://blog.sshh.io/p/how-i-use-every-claude-code-feature ·
  https://mksg.lu/blog/context-mode · https://boristane.com/blog/how-i-use-claude-code/ ·
  https://generativeprogrammer.com/p/how-teams-scale-claude-code-across
- Security: https://pluto.security/blog/claude-extension-ecosystem-security-practitioner-guide/ ·
  https://www.promptarmor.com/resources/hijacking-claude-code-via-injected-marketplace-plugins ·
  https://www.mintmcp.com/blog/claude-code-security
- Codex vs Claude: https://dev.to/_46ea277e677b888e0cd13/claude-code-vs-codex-2026-what-500-reddit-developers-really-think-31pb
