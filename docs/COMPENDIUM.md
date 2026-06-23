# Claude Code team-setup compendium

> A distilled reference for setting up and optimally running Claude Code (+ Codex) on a team.
> Synthesized from a complete sweep of all 150 official Claude Code docs pages (149 relevant),
> deduplicated and organized by theme. See `docs/SWEEP-COVERAGE.md` for coverage. `as_of: 2026-06-23`.

## Contents

1. Setup & onboarding
2. Config & memory (CLAUDE.md, settings)
3. Permissions, security & governance
4. Skills, hooks & commands
5. Subagents & agent teams
6. MCP (connecting tools)
7. Plugins & distribution
8. Automation, CI & integrations
9. Optimal use, context & cost
10. Surfaces & mobility
11. Monitoring, analytics & troubleshooting
12. Enterprise providers & gateways

## Setup & onboarding

Reference for a lead provisioning and running Claude Code (+ Codex) across a team. Covers plan/provider selection, install + version control, authentication, managed policy/governance, per-repo onboarding artifacts, surfaces, and the advisor/goal features for optimal use.

### Plan & provider selection (decide first)

The free Claude.ai plan does **not** include Claude Code. Supported account types: **Pro, Max, Team, Enterprise, Claude Console** (pre-paid API credits), and cloud providers **Amazon Bedrock, Google Vertex AI, Microsoft Foundry**. Six org deployment paths exist: Claude for Teams/Enterprise (recommended), Anthropic Console, Bedrock, **Claude Platform on AWS** (AWS Marketplace billing), Vertex AI, Foundry.

**Recommendation for most orgs:** Claude for Teams/Enterprise over cloud-provider deployments — single subscription, centralized billing, includes Claude on web, no infrastructure setup. Choose cloud providers only when you need request-level routing by data sensitivity or existing provider commitments.

| Capability | Teams | Enterprise |
|---|---|---|
| Self-service, collaboration, admin/billing | ✓ | ✓ |
| Pricing | Premium $150/seat, PAYG available | Contact sales |
| SSO + domain capture | ✗ | ✓ |
| SCIM provisioning, role-based permissions | ✗ | ✓ |
| Compliance API access | ✗ | ✓ |
| **Managed policy settings** (org-wide config) | ✗ | ✓ |
| **Server-managed settings delivery** | ✓ (Teams+Ent only) | ✓ |
| Claude on web | ✓ | ✓ |

- SSO, SCIM, and seat assignment are configured at the **Claude account level** (admin console), not in Claude Code settings.
- Cloud-provider/Console paths do **not** include Claude on web (only Teams/Enterprise does).
- Prompt caching is enabled by default across all deployment options.
- On first Console login a `Claude Code` workspace is auto-created for centralized cost tracking.
- Auth by provider: Teams/Enterprise = Claude.ai SSO or email; Console = API key; Bedrock / Claude Platform on AWS = API key or AWS creds; Vertex = GCP creds; Foundry = API key or Microsoft Entra ID.
- On Team/Enterprise/API/cloud-provider plans, Anthropic does **not** train on your code or prompts. **Zero Data Retention (ZDR)** is available to qualified Enterprise accounts.

### Installation

```bash
curl -fsSL https://claude.ai/install.sh | bash   # native installer (auto-updates)
cd <your-repo> && claude
```

- Install takes ~2 min; no IDE extension required. **System requirements:** macOS 13.0+, Windows 10 1809+/Server 2019+, Ubuntu 20.04+, Debian 10+, Alpine 3.19+; 4 GB+ RAM; x64 or ARM64; internet required; supported countries only.
- npm global install requires **Node.js 18+**: `npm install -g @anthropic-ai/claude-code@latest`. **Do NOT** use `sudo npm install -g`. Avoid `npm update -g` (respects original semver range — may not move to newest).
- Native installer accepts a version/channel at install time (becomes default auto-update channel): `curl -fsSL https://claude.ai/install.sh | bash -s stable` or `| bash -s 2.1.89`.
- **Alpine/musl:** install `libgcc`, `libstdc++`, `ripgrep` via package manager, then set `USE_BUILTIN_RIPGREP=0` in settings.json `env`, or search/startup fails.
- **Native Windows:** install **Git for Windows** to get the Bash tool (Git Bash); without it Claude Code falls back to the more limited PowerShell tool. Set `CLAUDE_CODE_GIT_BASH_PATH` if Git Bash isn't auto-found; `CLAUDE_CODE_USE_POWERSHELL_TOOL=1/0` opts in/out.
- **Sandboxing** is supported on **WSL 2 only** — not native Windows, not WSL 1. Standardize on WSL 2 if you need sandboxed command execution.
- `claude doctor` is the first diagnostic for failed updates, non-writable npm global dirs, and install/config health.
- Config/state locations: user = `~/.claude/` and `~/.claude.json`; project = `.claude/` and `.mcp.json` (repo root). `CLAUDE_CONFIG_DIR` relocates these (and `.credentials.json` on Linux/Windows).
- Removing `~/.claude`, `~/.claude.json`, `.claude/`, `.mcp.json` deletes all settings, allowed tools, MCP configs, and session history. The VS Code/JetBrains/Desktop integrations recreate `~/.claude` if still installed — a clean uninstall removes those first.

### Version control across a fleet

Native (curl/irm) installs auto-update in the background. **Homebrew, WinGet, apt, dnf, apk do NOT auto-update** — teams mixing methods silently run stale, possibly insecure versions.

| Setting / var | Effect |
|---|---|
| `autoUpdatesChannel` | `"latest"` (default, immediate) or `"stable"` (~1 week behind, skips major-regression releases) |
| `minimumVersion` | Update floor — auto-update and `claude update` refuse below it; **does not gate startup** |
| `requiredMinimumVersion` / `requiredMaximumVersion` | **Managed** — refuse to start outside the range (true version gating) |
| `DISABLE_AUTOUPDATER=1` | Stops background update check only; `claude update`/`claude install` still work |
| `DISABLE_UPDATES` | Blocks **all** update paths including manual — use when self-distributing |
| `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE=1` | Auto-runs Homebrew/WinGet upgrade in background (apt/dnf/apk still manual — need elevation) |

- **Team consistency:** pin via managed settings `autoUpdatesChannel="stable"` + `minimumVersion` so user/project settings can't drift the fleet. To hard-gate a window use managed `requiredMinimumVersion`/`requiredMaximumVersion`. Enterprise can enforce a release channel org-wide via managed settings.
- Prefer `"stable"` for fleets needing predictability (lags ~1 week, skips regression releases).
- Homebrew has two casks (channel chosen by cask name, **not** `autoUpdatesChannel`): `claude-code` (stable, ~1 week behind) and `claude-code@latest` (latest). Manual upgrade: `brew upgrade claude-code` / `winget upgrade Anthropic.ClaudeCode`. Run `brew cleanup` to reclaim space.
- For package-manager fleets, set `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE=1` or fold `claude update` into your system-upgrade workflow.
- **Enterprise binary verification:** verify the signed `manifest.json` (SHA256 checksums; signatures from release 2.1.89 onward) against GPG fingerprint `31DD DE24 DDFA B679 F42D 7BD2 BAA9 29FF 1A7E CACE` (security@anthropic.com) before internal distribution.
- For reproducible builds (e.g. dev containers), pin `npm install -g @anthropic-ai/claude-code@X.Y.Z` + `DISABLE_AUTOUPDATER=1`.

### Authentication

**Precedence (highest → lowest):**
1. Cloud-provider creds when `CLAUDE_CODE_USE_BEDROCK` / `CLAUDE_CODE_USE_VERTEX` / `CLAUDE_CODE_USE_FOUNDRY` is set
2. `ANTHROPIC_AUTH_TOKEN` — sent as `Authorization: Bearer` (for LLM gateway/proxy)
3. `ANTHROPIC_API_KEY` — sent as `X-Api-Key` (direct Anthropic API)
4. `apiKeyHelper` script output
5. `CLAUDE_CODE_OAUTH_TOKEN`
6. Subscription OAuth from `/login` (default for Pro/Max/Team/Enterprise)

- Credentials store: Linux `~/.claude/.credentials.json` (mode `0600`); Windows `%USERPROFILE%\.claude\.credentials.json`; macOS encrypted Keychain. Managed only via `/login`/`/logout`. Custom endpoint: set `ANTHROPIC_BASE_URL`.
- **CI/scripts/headless:** `claude setup-token` walks OAuth, prints a **one-year** token (does not save it) → set `CLAUDE_CODE_OAUTH_TOKEN`. Requires Pro/Max/Team/Enterprise; inference-only; cannot establish Remote Control. Do **not** rely on interactive `/login`.
- **Rotating/short-lived creds (vault):** use `apiKeyHelper` (shell script returning a key) over a static `ANTHROPIC_API_KEY`. Called after 5 min or on HTTP 401 by default; tune with `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`. A helper >10s shows a warning and slows every session.
- **Gateway/proxy with bearer tokens:** use `ANTHROPIC_AUTH_TOKEN`. Use `ANTHROPIC_API_KEY` only for direct Anthropic API.
- **Console role scoping:** assign the **`Claude Code`** role (Settings → Members → Invite) so users create only Claude Code API keys; `Developer` lets them create any key.
- **Org-wide cloud auth:** distribute required env vars + credential-generation instructions to users (per `/en/settings`) rather than per-user manual login. Cloud auth needs no browser login — set env vars before running `claude`.
- **WSL2/SSH/container login:** if the browser can't reach the localhost callback, paste the login code at the `Paste code here if prompted` prompt.
- Login troubleshooting: `/logout` then `/login` to switch accounts; `claude update` if the enterprise auth option is missing; restart terminal after updating. `/status` confirms the active method. "You haven't been added to your organization yet" = seat lacks Claude Code access.

### Managed settings & governance (Enterprise)

**Precedence:** managed settings override all local (user + project) config. Claude Code checks four managed sources in priority order, applying the first non-empty config:

| Priority | Source | Path / location | Notes |
|---|---|---|---|
| 1 (highest) | Server-managed | Claude.ai admin console | Teams/Enterprise only; reaches devices at auth time, refreshes hourly; no endpoint infra |
| 2 | plist / registry | macOS `com.anthropic.claudecode` plist; Windows `HKLM\SOFTWARE\Policies\ClaudeCode` | Any provider; needs admin to write — tamper-resistant |
| 3 | File-based | macOS `/Library/Application Support/ClaudeCode/managed-settings.json`; Linux/WSL `/etc/claude-code/managed-settings.json`; Windows `C:\Program Files\ClaudeCode\managed-settings.json` | Any provider |
| 4 (lowest) | Windows user registry | `HKCU\SOFTWARE\Policies\ClaudeCode` | Windows only; **writable without elevation — not an enforcement boundary** |

- **Array settings merge** across all sources: developers can **extend** but **not remove** managed `permissions.allow`/`permissions.deny` entries — a managed deny can't be overridden locally.
- **WSL ignores Windows policy by default** (reads only `/etc/claude-code`). Set `wslInheritsWindowsSettings: true` in a Windows source to inherit.
- **Server-managed delivery requires Teams/Enterprise** — Bedrock/Vertex/Foundry/Console-only deployments must use file/OS (plist/registry) mechanisms.
- **Verify rollout:** run `/status`; the `Setting sources` line shows `Enterprise managed settings` + source: `(remote)`, `(plist)`, `(HKLM)`, `(HKCU)`, or `(file)`.

**Key managed settings:**

| Setting | Purpose |
|---|---|
| `permissions.allow` / `permissions.deny` | Allow / ask / deny specific tools and commands |
| `allowManagedPermissionRulesOnly` | Only managed permission rules apply |
| `permissions.disableBypassPermissionsMode` (`"disable"`) | Disables `--dangerously-skip-permissions` |
| `sandbox.enabled`, `sandbox.network.allowedDomains` | OS-level filesystem + network isolation with domain allowlists |
| `allowedMcpServers`, `deniedMcpServers`, `allowManagedMcpServersOnly`, `managed-mcp.json` | Restrict/fix which MCP servers users can add |
| `strictKnownMarketplaces`, `blockedMarketplaces` | Restrict plugin marketplace sources |
| `strictPluginOnlyCustomization` | Skills/agents/hooks/MCP only from plugins or managed settings (blocks user/project sources) |
| `allowManagedHooksOnly`, `allowedHttpHookUrls` | Restrict which hooks load / HTTP hook URLs |
| `disableAgentView` | Turns off `claude agents`, `--bg`, `/background`, on-demand supervisor |

- **Pair permissions with sandboxing:** denying `WebFetch` does NOT block network if Bash is allowed (`curl`/`wget` bypass it) — add `sandbox.network.allowedDomains` to close the gap at the OS layer.
- **Org-wide managed CLAUDE.md** is loaded in every session and cannot be excluded — deploy at the managed policy path (macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`). Security teams can set managed permissions that local config cannot override.
- **Cloud-provider model pinning:** `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_FABLE_MODEL` (Bedrock/Vertex/Foundry/Claude Platform on AWS). Without pinning, aliases resolve to a built-in default that can lag releases or be unavailable in your account.
- **Observability:** OpenTelemetry export (sessions/tools/tokens) on all providers. Analytics dashboard (per-user metrics, contribution tracking, leaderboard) and cost tracking (spend/rate limits, attribution) are **Anthropic-only** — dashboard at `claude.ai/analytics/claude-code`. Cloud spend via AWS Cost Explorer / GCP Billing / Azure Cost Management.

### Network: proxy & LLM gateway (combinable)

- **Corporate proxy:** `HTTPS_PROXY` / `HTTP_PROXY` route all outbound through an HTTP/HTTPS proxy (network policy).
- **LLM gateway:** centralized usage tracking/rate limiting/budgets/auth and request-level audit logging. Base-URL vars: `ANTHROPIC_BASE_URL`, `ANTHROPIC_BEDROCK_BASE_URL`, `ANTHROPIC_AWS_BASE_URL`, `ANTHROPIC_VERTEX_BASE_URL`, `ANTHROPIC_FOUNDRY_BASE_URL`. Combine proxy + gateway when you need both network enforcement and usage governance.
- **Provider setup env:**
  - Bedrock: `CLAUDE_CODE_USE_BEDROCK=1`, `AWS_REGION` (e.g. `us-east-1`); gateway adds `ANTHROPIC_BEDROCK_BASE_URL` + `CLAUDE_CODE_SKIP_BEDROCK_AUTH=1` if gateway handles AWS auth.
  - Vertex: `CLAUDE_CODE_USE_VERTEX=1`, `CLOUD_ML_REGION` (e.g. `us-east5`), `ANTHROPIC_VERTEX_PROJECT_ID`; gateway adds `ANTHROPIC_VERTEX_BASE_URL` + `CLAUDE_CODE_SKIP_VERTEX_AUTH=1`.
  - Foundry: `CLAUDE_CODE_USE_FOUNDRY=1`, `ANTHROPIC_FOUNDRY_RESOURCE`, `ANTHROPIC_FOUNDRY_API_KEY` (omit for Entra ID); gateway adds `ANTHROPIC_FOUNDRY_BASE_URL` + `CLAUDE_CODE_SKIP_FOUNDRY_AUTH=1`.
- Region vars are **not** interchangeable. Set vars in shell profile (`.bashrc`/`.zshrc`); run `/status` to confirm proxy/gateway took effect.

### Per-repo team setup (the canonical adoption fix)

These artifacts propagate across **all local surfaces** (CLI, VS Code, JetBrains, Desktop) because they share the same engine — team members can mix surfaces on one project without re-configuring.

- **`/init`** — run once per repo; reads the project and writes a `CLAUDE.md` (build commands, architecture, conventions) loaded automatically every future session. Add team conventions, test commands, and directories that should **NOT** be modified. **This is the canonical fix for "doesn't understand our conventions" and for hallucination from missing context.** Keep it **under two screens** — a cheat sheet, not full docs. Deploy at both repo level (check into source control) and org level (system dir).
- **`.mcp.json`** at the repo root (configured by one central team, checked in) — every user inherits the same MCP servers (ticket systems, error logs, GitHub/Jira/Linear). Install stdio-server binaries in the Dockerfile; add remote-server domains to the firewall allowlist.
- **Skills** — save reusable workflows as `.claude/skills/<name>/SKILL.md` → a `/name` slash command. Plain Markdown, so colleagues adopt by copying the file. Distribute repeatable procedures (`/review-pr`, `/deploy-staging`) as skills instead of re-explaining per session. Ask Claude to create a skill for any prompt you've typed more than once; browse `/plugin` first — it may already exist.
- **Hooks** — shell commands firing on events; enforce **deterministic** policy (auto-format after edits, lint before commit) instead of relying on the model. Configure a `Stop` hook for a desktop notification when long runs finish so you can step away.
- **`/team-onboarding`** — run in a heavily-used repo; scans your recent sessions, commands, and MCP servers and produces a paste-able setup guide a new teammate uses as their first message to replay your setup.

### Dev containers

Add to `.devcontainer/devcontainer.json` `features`: `"ghcr.io/anthropics/devcontainer-features/claude-code:1.0"`. In VS Code, the extension panel and `claude` in the integrated terminal both run **inside** the container and share `~/.claude`.

- The feature version tag (`:1.0`) pins the **install script, NOT** the Claude Code release — the feature installs latest + auto-updates. For pinned builds use `npm install -g @anthropic-ai/claude-code@X.Y.Z` in the Dockerfile + `DISABLE_AUTOUPDATER=1`.
- **Persist auth across rebuilds** (container home incl. `~/.claude` is discarded on rebuild → re-auth every time): mount a named volume — `"mounts": ["source=claude-code-config,target=/home/node/.claude,type=volume"]` (replace `/home/node` with remoteUser home). Use `source=claude-code-config-${devcontainerId}` to isolate state per repo. If mounted at a non-default path, set `CLAUDE_CONFIG_DIR`.
- **Codespaces:** `~/.claude` survives stop/start but is cleared on rebuild → still mount. Carry auth via a Codespaces secret holding `ANTHROPIC_API_KEY` or a `CLAUDE_CODE_OAUTH_TOKEN` (secrets become container env vars automatically).
- **Standardize env via `containerEnv`:** `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` (telemetry opt-out) and `DISABLE_AUTOUPDATER=1`.
- **MCP in containers:** project-scope `.mcp.json` at repo root (checked in); install stdio binaries in Dockerfile; allowlist remote domains.
- **Cloud-provider auth:** inject via `containerEnv` / Codespaces secrets / workload identity — do **not** mount host secrets (`~/.ssh`, cloud credential files). Prefer repo-scoped or short-lived tokens.
- **`--dangerously-skip-permissions`:** use only with trusted repos; ensure `remoteUser` is **non-root** (silently rejected as root → blocks unattended runs); pair with network egress restrictions. Prefer **auto mode** (classifier-reviewed actions) for fewer prompts without disabling safety. To block bypass entirely set `permissions.disableBypassPermissionsMode: "disable"` in managed settings.
- The reference container (CLI + egress firewall + persistent volumes + Zsh) is at `anthropics/claude-code/.devcontainer` — a working **example**, not a maintained base image. Its `init-firewall.sh` (NET_ADMIN/NET_RAW via runArgs) blocks all outbound except allowed domains; firewall and caps are optional. Editors without dev container support (e.g. plain Vim) are out of scope.

### Surfaces & where features live

Same engine across CLI, Desktop, VS Code, JetBrains, web, mobile, Slack, GitHub Actions/GitLab.

- **CLI is the most complete surface — scripting and the Agent SDK (headless) are CLI-only.** Standardize the team on CLI for any scripting, automation, or CI.
- **Provider × surface:** third-party providers work in CLI + VS Code. Enterprise Desktop supports Vertex AI + gateways; **Bedrock or Foundry require CLI or VS Code** (or the Cowork 3P preview).
- **Web/cloud** runs in Anthropic's managed cloud and **keeps running after you disconnect** — choose it for long-running tasks; choose CLI/IDE for steerable interactive work. `claude --teleport` pulls a web/iOS task into the terminal (requires a claude.ai subscription).
- **CI:** `claude -p "<prompt>"` (non-interactive, Unix-pipe composable, e.g. `git diff main --name-only | claude -p "review these..."`) for code review, issue triage, bulk file ops. GitHub Actions / GitLab CI/CD for governed automation; **Code Review** reviews every PR automatically.
- **Mobile** (iOS/Android) is a thin client into cloud sessions or a local session via **Remote Control** (`claude remote-control`); can dispatch to Desktop (Pro/Max).
- **Slack** responds to `@Claude` mentions, runs on Anthropic cloud, requires the Slack app + Claude Code on web enabled.
- **Channels** push external events (Telegram, Discord, CI failures) into a local CLI session via a channel plugin. **Routines** run on Anthropic infra (survive computer-off), trigger on API calls or GitHub events. **Computer use:** macOS only, Pro/Max.
- Claude-account-only features (NOT via Console keys or cloud-provider creds): Claude Code on web, Routines, Code Review, Remote Control, Chrome extension. Full docs index: `https://code.claude.com/docs/llms.txt`.

### Optimal everyday use

- **Model match:** Sonnet = default; Opus = large refactors / complex debugging / architecture / high-stakes; Haiku = quick questions / formatting / mechanical edits; **Fable 5** (opt-in via `/model fable`) = hardest, longest-running work. Switch mid-session with `/model`.
- **Plan mode** (Shift+Tab until `plan`): proposes exactly which files it will touch, changes nothing until approved — use for any multi-file or shared/production change; fastest way to calibrate trust.
- **Permission modes** (Shift+Tab cycles): `default` (asks before risky actions), `acceptEdits` (file edits + common fs commands flow, still checks other shell commands), `plan`. File reads inside the working dir don't prompt; edits, shell commands, and out-of-dir access do.
- **Context > prompting:** use `@file` / `@directory/` (e.g. `@src/components/`; `@` + Tab autocompletes) instead of pasting contents; paste error/log/stack-trace output directly. Let Claude explore first ("analyze the database schema") before changes.
- **Recover from a wrong result** by pasting the failing test/stack trace and asking it to fix that specific failure — don't rephrase the original request.
- **Keep edits surgical:** state scope ("only change X", "give me a diff").
- `/clear` resets history between unrelated tasks. `claude -c` continues the most recent conversation **in the current directory** (directory context matters); `claude -r` / `/resume` resumes a specific earlier one. `/rewind` (Esc twice) rolls back conversation + file changes (automatic checkpointing, no setup).
- **Onboarding juniors:** start with codebase Q&A and small fixes; have them run "Explain @file and where it is called from" before changing anything; ask Claude to make a plan, review/feedback, then allow more agentic runs.

### The advisor (second-opinion model)

Lets Claude consult a second, typically stronger model at key decision points (receives the full conversation; returns guidance Claude applies). Experimental; requires **v2.1.98+**; **Anthropic API only** (not Bedrock/Vertex/Foundry; via gateway only if it forwards requests intact).

- **Enable:** `/advisor` (saves default), `advisorModel` setting (`"opus"`/`"sonnet"`/`"fable"`/full ID like `claude-opus-4-8`), or `--advisor opus` flag (single session, takes precedence). `--advisor` errors if the main model is unsupported; `/advisor` saves an inactive selection that activates on a compatible main. Disable: `/advisor off` or env `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.
- **Pairing (advisor must be ≥ main):** Haiku 4.5 → Fable/Opus/Sonnet; Sonnet 4.6 → Fable/Opus/Sonnet; Opus 4.6+ → Fable or Opus **at-or-above** main's version; Fable 5 → Fable only. Fable 5 (main or advisor) needs v2.1.170+ and org access. Subagents inherit the advisor and re-check against their own model.
- **Recommended pairings:** faster main + stronger advisor (Sonnet + Opus) to escalate planning/completion checks cheaply; lowest cost = Haiku main + Opus advisor; high-stakes = Opus + Opus.
- **Cost:** each call sends the **full conversation** to the advisor at its rates (in addition to main usage; counts toward `/usage`/plan limits). The advisor's read is **not** cached and reprocesses the whole transcript each call — cost scales with length × call count. Enabling/disabling mid-session does **not** invalidate the main prompt cache.
- Claude decides when to call (before committing to an approach, on recurring errors, before declaring done). Request explicitly in-prompt ("consult the advisor before you continue") — no frequency setting. `Advising` line shows during a call (Ctrl+O to expand). Use the advisor when **Claude** should decide a second opinion is needed; use opusplan for plan-mode planning, subagents for delegated subtasks, `/model` to switch all turns.

### `/goal` (session-scoped completion condition)

Requires **v2.1.139+**. After each turn a small fast model (defaults to Haiku) checks the condition; if unmet Claude takes another turn instead of returning. Clears automatically when met. Implemented as a session-scoped prompt-based Stop hook.

- One goal per session (a new one replaces it); condition ≤ **4,000 chars**; starts a turn immediately. `◎ /goal active` shows elapsed time; `/goal` (no args) shows status (condition, duration, turns, token spend, last reason). `/goal clear` (aliases: `stop`/`off`/`reset`/`none`/`cancel`) or `/clear` removes it.
- **Write conditions Claude's own output can demonstrate** — the evaluator does NOT run commands or read files. Give it one measurable end state + a stated proof ("npm test exits 0", "git status is clean") + constraints that must not change ("no other test file is modified"). Bound length with "or stop after 20 turns".
- Works non-interactively: `claude -p "/goal CHANGELOG.md has an entry for every PR merged this week"` (Ctrl+C interrupts), in Desktop, and via Remote Control. Eval tokens bill on the small fast model (negligible).
- **Combine with auto mode** for unattended runs (auto mode removes per-tool prompts, `/goal` removes per-turn prompts). Compare: `/goal` starts next turn when prior finishes + stops on confirmation; `/loop` starts on a time interval; a Stop hook fires every turn + stops per your script/prompt. **For team-wide deterministic completion logic, prefer a Stop hook in the settings file over the session-only `/goal`.**

### Team rollout & adoption playbook

- Create a `#claude-code` channel; test the install command on one machine first; assign a named channel owner for the first 48 hours; have a **C-suite sponsor send/co-sign** the announcement (exec-sent launches consistently outperform admin-sent on first-week adoption); pick one concrete real first task, not a generic example.
- Build a **one-click install** for custom dev environments to drive org-wide adoption.
- After launch: recruit the 2-3 most active `#claude-code` posters as champions; drip tips-and-tricks 1-2/week to drive feature activation.
- Distribute durable patterns (custom skills, CLAUDE.md examples) on the team wiki; post ephemeral discoveries as a screenshot + 1-2 sentences in the engineering channel.
- **Champions must NOT improvise security/data-handling answers** — that policy is admin-configured; refer to the admin.

### Gotchas

- **Managed denies can't be removed locally** — array settings merge; developers extend only. Use this for real enforcement.
- **HKCU is not an enforcement boundary** (writable without admin). Use plist / HKLM / file-based or server-managed/MDM for real policy.
- **`managed-settings.json` via Dockerfile COPY is bypassable** — anyone with repo write access edits/removes the step. Use server-managed settings or MDM for unbypassable policy.
- **Server-managed settings need Teams/Enterprise** — Bedrock/Vertex/Foundry/Console-only get no server-managed delivery.
- **WSL ignores Windows policy by default** — set `wslInheritsWindowsSettings: true`.
- **Denying WebFetch ≠ blocking network** if Bash is allowed (curl/wget bypass). Permission rules and sandboxing are different layers.
- **`minimumVersion` does not gate startup** — only constrains updates. Use `requiredMinimumVersion`/`requiredMaximumVersion` for startup gating.
- **`DISABLE_AUTOUPDATER` doesn't block manual `claude update`/`install`** — use `DISABLE_UPDATES` to stop everything.
- **The feature tag `:1.0` pins the install script, not the CLI** — you still get latest + auto-update unless you pin in the Dockerfile and disable the autoupdater.
- **Container `~/.claude` (auth) is discarded on rebuild** without a volume mount — engineers re-auth every rebuild (Codespaces too, on rebuild).
- **`--dangerously-skip-permissions` is rejected as root**, and inside a container does NOT prevent a malicious project from exfiltrating container contents incl. `~/.claude` credentials. Trusted repos + non-root remoteUser + egress limits + monitoring only.
- **Browser OAuth callback can fail to reach the container/WSL** (port forwarding) — paste the code manually.
- **Auth precedence surprises:** an org `ANTHROPIC_API_KEY` in the environment takes precedence over an active subscription once approved → a disabled/expired key causes auth failures; fix with `unset ANTHROPIC_API_KEY`, confirm via `/status`. In `-p` (non-interactive) `ANTHROPIC_API_KEY` is **always** used when present (no approval prompt). **`--bare` does NOT read `CLAUDE_CODE_OAUTH_TOKEN`** — use `ANTHROPIC_API_KEY` or `apiKeyHelper`. `CLAUDE_CODE_OAUTH_TOKEN` is inference-only (no Remote Control).
- **Desktop and cloud sessions ignore `apiKeyHelper`/`ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` (OAuth only)** — these affect terminal CLI only. **Claude Code on the web always uses subscription credentials**, ignoring those vars even in the sandbox.
- **`CLAUDE_CODE_SKIP_*_AUTH` only when the gateway actually handles provider auth** — otherwise auth is wrongly skipped. Region vars (`AWS_REGION`/`CLOUD_ML_REGION`/etc.) are not interchangeable.
- **`CLAUDE_CONFIG_DIR` relocates `.credentials.json`** (Linux/Windows) — account for it when migrating/sharing config.
- A slow `apiKeyHelper` (>10s) silently degrades every session's startup.
- **Advisor fails open:** an equal-or-weaker advisor is silently NOT attached (only visible in `/advisor` output or a notification) — except `--advisor`, which errors on an unsupported main. Opus version gating is strict (4.7 main + 4.6 advisor rejected); Fable 5 main rejects Opus/Sonnet advisors.
- **`/goal` can loop forever** if the condition references state Claude never surfaces in the conversation (evaluator can't run tools) — `/goal clear` or Ctrl+C. On `--resume`/`--continue` the goal restores but turn counter/timer/token baseline reset (any "stop after N turns" effectively restarts). Silently gated by `disableAllHooks` (any level) or `allowManagedHooksOnly`, and unavailable without an accepted trust dialog (it tells you why). A weak small-fast model degrades completion judgment every turn.
- **Homebrew/WinGet/apt/dnf/apk don't auto-update** — mixed install methods drift to stale, insecure versions. Homebrew `claude-code` cask lags ~1 week behind `claude-code@latest`. Update notifications may precede availability — retry later. WinGet in-place upgrades can fail (locked running exe) → manual command shown. `npm update -g` may not move to newest — use `@latest`.
- **Native Windows without Git for Windows** falls back to PowerShell instead of Bash (behavior differs). Sandboxing unsupported on native Windows / WSL 1.
- **`claude --teleport` requires a claude.ai subscription.** Cloud-provider/Console deployments lose Claude.ai-only features (web, Routines, Code Review, Remote Control, Chrome extension) and Anthropic-only Analytics/cost tracking — plan supplementary Teams/Enterprise seats. **Advisor is silently unavailable on cloud providers.**
- **Removing `~/.claude` wipes MCP configs, allowed-tool permissions, and session history**; the IDE/Desktop integrations recreate it if installed — a clean uninstall removes those first.
- **macOS: use Ctrl+V (not Cmd+V)** to paste images.
- **Claude can be confidently wrong** — "a sharp junior, not an oracle." Always review diffs and verify critical-path changes. Hallucination is a context problem (fix with `@`-mentions, `/init`, real error output), not a model/prompt-rephrasing problem.
- **Fable 5 is not the default** (explicit `/model fable`); its cybersecurity/biology fallback to Opus is silent/automatic.
- Adoption/advocacy playbook pages are **DRAFT** and contain no governance config — rewrite in your org's voice, replace `[bracketed placeholders]`, and pull managed-policy/permissions detail from the linked Permissions/Security/Memory pages. Claude Code ships frequently — verify version-specific details against `/en/overview` before redistributing internally.


---

## Config & memory (CLAUDE.md, settings)

### TL;DR for team setup

Commit these to the repo for shared, source-controlled config:

```
CLAUDE.md            # team instructions (project root or .claude/CLAUDE.md)
.claude/settings.json   # permissions, env, model policy, hooks, statusLine, outputStyle
.mcp.json            # approved team MCP servers (repo ROOT, not under .claude/)
.claude/skills/      # skills/<name>/SKILL.md (folder, not flat .md)
.claude/agents/      # subagents
.claude/rules/       # modular / path-scoped instructions
.claude/workflows/   # dynamic /<name> workflow scripts
.claude/output-styles/  # team voice/format styles
.worktreeinclude     # repo root: gitignored files to copy into worktrees
```

Keep gitignored / personal: `.claude/settings.local.json`, `CLAUDE.local.md`, `~/.claude.json` (auth/OAuth/state — **never commit**).

For guaranteed org policy (cannot be overridden), deploy **managed settings** (see Governance). Use `CLAUDE.md` for "we do it this way" guidance; use **permissions/hooks** for security boundaries and anything that must never happen — CLAUDE.md is not enforcement.

---

### Memory files (CLAUDE.md, rules, imports)

#### Load order and discovery

CLAUDE.md load order, **broadest to most specific** (project loads AFTER user; on conflict the more specific wins):

| # | File | Path |
|---|------|------|
| 1 | Managed policy | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`; Linux/WSL `/etc/claude-code/CLAUDE.md`; Windows `C:\Program Files\ClaudeCode\CLAUDE.md` |
| 2 | User | `~/.claude/CLAUDE.md` |
| 3 | Project | `./CLAUDE.md` **or** `./.claude/CLAUDE.md` |
| 4 | Local (personal) | `./CLAUDE.local.md` (create manually, gitignore) |

- Project and global CLAUDE.md are **both loaded into context together** (NOT key-merged); project-level takes priority on conflict.
- Discovery **walks UP the directory tree** from cwd, loading every `CLAUDE.md` + `CLAUDE.local.md` found; all are concatenated (root-down, so the file closest to launch dir is read LAST; within a dir, `CLAUDE.local.md` is appended after `CLAUDE.md`).
- **Subdirectory (below cwd) CLAUDE.md files are NOT loaded at launch** — they load on demand only when Claude reads a file in that subdir (and only on Read, not Write/create).
- CLAUDE.md is loaded **in FULL regardless of length** (the 200-line/25KB cap applies only to auto-memory MEMORY.md).
- CLAUDE.md is delivered as a **user message after the system prompt** — no strict-compliance guarantee; vague/conflicting instructions get picked arbitrarily.

#### Authoring CLAUDE.md well

- Keep under **~200 lines**: longer files still load fully but **reduce adherence**. When approaching 200 lines, split into `.claude/rules/*.md`.
- Move task-specific content OUT of CLAUDE.md (it loads into EVERY session) into a skill or a **path-scoped rule** so it loads only when needed.
- List most-used commands (build, test, lint, format) so Claude knows them without being told.
- Write **concrete, verifiable** instructions ("Use 2-space indentation", "Run npm test before committing", "API handlers live in src/api/handlers/"), not vague directives.
- Use markdown headers + bullets to group rules; Claude scans structure like a reader.
- Keep global `~/.claude/CLAUDE.md` short and limited to cross-project prefs (response style, commit format) — it loads alongside every project's CLAUDE.md.
- **Add to CLAUDE.md when**: Claude repeats a mistake, review catches something it should know, you retype a correction from last session, or a new teammate would need the same context.
- **Block-level HTML comments** (`<!-- ... -->`) are stripped before injection (free human-only notes); comments inside code blocks are preserved, and all remain visible via the Read tool.
- Periodically review root + nested CLAUDE.md + `.claude/rules/` for outdated/contradictory instructions — conflicts make Claude choose arbitrarily.

#### Imports (`@path`)

- Syntax `@path/to/import`; relative paths resolve **relative to the file containing the import, NOT cwd**; absolute paths allowed; **max recursion depth 4 hops**.
- Imports **do NOT save context** — imported files fully expand into context at launch. Only **path-scoped rules** defer loading.
- Import parsing skips Markdown code spans/fenced blocks; wrap a path in backticks (`` `@README` ``) to mention it literally.
- First time a project hits external imports, an approval dialog appears; **declining permanently disables imports for that project** (dialog never reappears).
- Reuse `AGENTS.md` via `@AGENTS.md` at top of CLAUDE.md (Claude reads CLAUDE.md, not AGENTS.md). Symlink `ln -s AGENTS.md CLAUDE.md` also works but needs Admin/Developer Mode on Windows — prefer the import.
- `@~/.claude/my-project-instructions.md` shares personal instructions across git worktrees (gitignored CLAUDE.local.md exists only in the worktree where created).

#### Rules (`.claude/rules/*.md`)

- Rules **without** `paths:` frontmatter load at session start, same priority as `.claude/CLAUDE.md`. Rules **with** `paths:` globs load only when Claude reads a matching file.
- Glob patterns support brace expansion (`src/**/*.{ts,tsx}`); subdirectories auto-discovered recursively; **symlinks** resolved/loaded (circular detected).
- User-level rules `~/.claude/rules/*.md` apply to every project, load BEFORE project rules (so project rules have higher priority). Share company standards via symlinks into `.claude/rules/`.
- Rules are **guidance, not enforced**.

#### `/init`

- `/init` generates a starting CLAUDE.md (suggests improvements instead of overwriting if one exists); also reads `AGENTS.md`, `.cursorrules`, `.devin/rules/`, `.windsurfrules`.
- `CLAUDE_CODE_NEW_INIT=1` enables interactive multi-phase init (asks which artifacts, explores codebase via subagent, presents a reviewable proposal before writing).

#### Excludes & managed CLAUDE.md

- `claudeMdExcludes` (string[] globs, e.g. `**/node_modules/**/CLAUDE.md`): skip loading ancestor CLAUDE.md/rules; matched against absolute paths; arrays merge across all settings layers. **Cannot exclude managed policy CLAUDE.md.**
- In monorepos, use `claudeMdExcludes` in `.claude/settings.local.json` to skip other teams' ancestor CLAUDE.md files.
- Managed `claudeMd` key embeds org instructions inline (alternative to deploying a file); honored **only** in managed/policy settings; loads before user and project CLAUDE.md.
- `--add-dir` does NOT load CLAUDE.md from extra dirs unless `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` (then loads CLAUDE.md, `.claude/CLAUDE.md`, `.claude/rules/*.md`, CLAUDE.local.md; CLAUDE.local.md skipped if `local` excluded from `--setting-sources`).

#### Subagents and CLAUDE.md

- Built-in **Explore and Plan subagents skip CLAUDE.md** — restate critical instructions in the delegating prompt. Custom subagents load CLAUDE.md like the main conversation (put critical instructions in the agent file body = its system prompt).
- `--append-system-prompt` injects at system-prompt level but must be passed every invocation.

#### After `/compact`

- Project-root CLAUDE.md survives `/compact` (re-read from disk, re-injected). **Nested subdirectory CLAUDE.md and conversation-only instructions are NOT re-injected** — they reload only on the next file read in that subdir. Put instructions that must survive compaction in CLAUDE.md (not just conversation).

### Auto memory (MEMORY.md)

- Separate from CLAUDE.md: Claude **writes it itself**. `#  <text>` quick-add / "remember this" / "always use pnpm" goes to **AUTO MEMORY, not CLAUDE.md**. To edit CLAUDE.md, ask explicitly or use `/memory`.
- Storage: `~/.claude/projects/<project>/memory/` with `MEMORY.md` entrypoint + topic files. `<project>` derived from git repo, so **all worktrees/subdirs of one repo share one auto-memory dir**. **Machine-local — not synced** across machines or cloud.
- Only the first **200 lines OR 25KB** of MEMORY.md (whichever first) loads at session start; beyond that is silently not loaded. Topic files (e.g. `debugging.md`) load **on demand**, not at startup.
- On by default; requires **v2.1.59+**. Disable via `/memory` toggle, `autoMemoryEnabled:false`, or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (`0`=force on).
- `autoMemoryDirectory` overrides location (absolute or `~/`-prefixed); when set in project settings/settings.local.json, honored **only after accepting the workspace trust dialog**.
- Subagent persistent memory: `memory: project` → `.claude/agent-memory/<agent>/MEMORY.md` (committed, team-shared); `memory: local` → `.claude/agent-memory-local/`; `memory: user` → `~/.claude/agent-memory/`. First 200 lines / 25KB of MEMORY.md load into the subagent system prompt.
- `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` skips ALL CLAUDE.md memory files (user, project, auto-memory).

### Settings files & precedence

| Scope | File | Committed? |
|-------|------|-----------|
| Managed (org) | `managed-settings.json` (system dir) | admin-deployed |
| User (all projects) | `~/.claude/settings.json` | personal |
| Project (team) | `.claude/settings.json` | yes (source-controlled) |
| Local (this project) | `.claude/settings.local.json` | gitignored |

**Precedence, lowest → highest:** user `~/.claude/settings.json` < project `.claude/settings.json` < local `.claude/settings.local.json` < CLI flags (`--permission-mode`, `--settings`, `--model`) / env vars < **`managed-settings.json` (always wins, even over CLI flags)**.

- **Merge rule:** array settings (e.g. `permissions.allow`) **combine across all scopes**; scalar settings (e.g. `model`) take the **most-specific value** (most-local wins, silently). settings.json files ARE merged key-by-key (unlike CLAUDE.md, which is concatenated).
- `~/.claude` resolves to `%USERPROFILE%\.claude` on Windows.
- `settings.json` holds: `permissions`, `hooks`, `statusLine`, `model`, `env`, `outputStyle`.
- **`~/.claude.json` is NOT a settings file** — it holds app state, theme, OAuth session, per-project trust, personal MCP servers, UI toggles. Putting `permissions`/`hooks`/`env` there is **silently ignored** (they belong in `~/.claude/settings.json`). Never version-control it.
- Edits to settings.json take effect after a brief file-stability delay (no restart); env vars are read **at startup only** (restart `claude` to apply). If `/hooks` shows stale defs, run `/hooks` again.

### Permissions

- Syntax `Tool(pattern)`: `Bash(npm run test *)`, `Read(./secrets/**)`, `Read(~/.zshrc)`, `Bash(curl *)`. Wildcards: `*` = single component, `**` = recursive. Keys: `permissions.allow`, `permissions.deny`, `permissions.ask` (arrays).
- **Permission rules MERGE across scopes** (don't replace). Resolution precedence: **Managed deny > user/project deny > Managed ask > user/project ask > Managed allow > user/project allow. Deny always beats allow** across all scopes (reason about precedence, not file order).
- Bash patterns match the command **literally, not args**: `Bash(npm run *)` does NOT cover args — use `Bash(npm run test *)`.
- **Bash prefix deny rules are not a hard guarantee** — `Bash(rm *)` matches the literal string, NOT the executable, so it doesn't block `/bin/rm` or `find -delete`. For a real block use a **PreToolUse hook or the sandbox**.
- Write secret denies explicitly: `Read(./.env)`, `Read(./.env.*)`, `Read(./secrets/**)`, `Bash(curl *)`, `Bash(rm -rf *)`.
- `Shift+Tab` cycles permission modes: `default`, `acceptEdits`, `plan`, plus enabled `auto`/`bypassPermissions`.

### MCP servers

| Scope | File | Notes |
|-------|------|-------|
| Team / project | `.mcp.json` (**repo root**, committed) | tool schemas deferred, load on demand via tool search |
| User (all projects) | `~/.claude.json` (`mcpServers` key) | `claude mcp add --scope user` |
| Personal per-project | `~/.claude.json` (local scope) | not committed |
| Managed | `managed-mcp.json` (system dir) | org-controlled |

- `.mcp.json` **must be at repo root** — placing it under `.claude/` or in Claude Desktop format **never loads**. `settings.json` has **no `mcpServers` key** (servers added there never appear).
- **Use absolute paths** in `command`/`args` for local scripts — relative paths resolve against the **launch directory, not `.mcp.json`'s location** (a frequent cause of failed servers). PATH executables (`npx`/`uvx`) work as-is.
- **MCP secrets:** use `${ENV_VAR}` shell references (e.g. `${GITHUB_TOKEN}`), read when the server starts, so tokens never land in the file. Set env in **per-server `env` blocks inside `.mcp.json`** — `settings.json` `env` does NOT propagate to MCP child processes.
- Project `.mcp.json` servers need a **one-time approval**; a dismissed prompt leaves the server disabled (approve from `/mcp`). Project-scope approval keys (settings.json): `enabledMcpjsonServers` (string[] approve), `disallowedMcpjsonServers` (reject), `enableAllProjectMcpServers` (auto-approve all — handy for CI, **dangerous for untrusted/cloned repos**).
- Cloned `.mcp.json` servers require **workspace-trust acceptance** before loading.
- Debug: `/mcp` → Reconnect; if still zero tools, `claude --debug mcp` shows server stderr.

### Model configuration

#### Selection & precedence

- Precedence (highest → lowest): in-session `/model` > `--model` flag > `ANTHROPIC_MODEL` env > `model` settings field.
- As of v2.1.153, `/model` saves choice as the new-session default (writes `model` in user settings). In the picker: **Enter** = switch + save default; **`s`** = this session only. Project/managed settings still take precedence on next launch.
- `--model` and `ANTHROPIC_MODEL` apply only to the launched session — run different models in different terminals by launching each with its own `--model`.
- **Resumed sessions** (`--resume`/`--continue`/`/resume`) keep the model saved in the transcript regardless of current `model` setting (prevents cross-session surprises).
- Check current model via status line or `/status`; effort level shows next to the spinner ("with low effort").

#### Aliases & pinning

- Aliases: `default`, `best` (Fable 5 where available, else latest Opus), `fable`, `sonnet`, `opus`, `haiku`, `sonnet[1m]`, `opus[1m]`, **`opusplan`** (Opus in plan mode, then Sonnet for execution — built-in plan/execution cost optimization).
- **Aliases resolve to different versions per provider:** Anthropic API → opus=4.8, sonnet=4.6; Claude Platform on AWS → opus=4.7, sonnet=4.6; Bedrock/Vertex/Foundry → opus=4.6, sonnet=4.5. Pin with full IDs (`claude-opus-4-8`) or `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL`.
- Default by account: Max/Team Premium/Enterprise PAYG/Anthropic API → Opus 4.8; AWS → Opus 4.7; Pro/Team Standard/Enterprise seats → Sonnet 4.6; Bedrock/Vertex/Foundry → Sonnet 4.5.
- Version reqs: Fable 5 v2.1.170+ (unavailable under ZDR; never the default); Opus 4.8 v2.1.154+.
- `ANTHROPIC_DEFAULT_HAIKU_MODEL` sets the cheap background/title/summary model (**replaces deprecated `ANTHROPIC_SMALL_FAST_MODEL`**) — lowers cost on background work. `CLAUDE_CODE_SUBAGENT_MODEL` standardizes subagent/agent-team models org-wide (overrides per-invocation + frontmatter `model`; set `inherit` for normal resolution).
- `modelOverrides` maps exact Anthropic model IDs (with date suffix) → provider strings (Bedrock ARN / Vertex version / Foundry deployment); allowlist is evaluated against the Anthropic ID, not the override.
- Third-party pins: `ANTHROPIC_DEFAULT_<FAMILY>_MODEL_NAME`/`_DESCRIPTION`/`_SUPPORTED_CAPABILITIES` (comma list: `effort,xhigh_effort,max_effort,thinking,adaptive_thinking,interleaved_thinking`). **Set `_SUPPORTED_CAPABILITIES` when pinning provider IDs** so effort/thinking aren't silently disabled by failed pattern matching. `ANTHROPIC_CUSTOM_MODEL_OPTION` adds one custom picker entry (validation skipped).
- `[1m]` suffix enables extended context (`opus[1m]`, `claude-opus-4-8[1m]`); on Bedrock/Vertex/Foundry it's read **per env variable, not per model**.

#### Org model lockdown (combine all four)

To fully control which model users run:
1. `model` — initial selection (**bypassable** via the Default picker option).
2. `availableModels` (string[]) — allowlist (applies to `/model`, `--model`, `ANTHROPIC_MODEL`, alias-resolution env, `/fast`, subagent frontmatter + Agent tool model + `CLAUDE_CODE_SUBAGENT_MODEL`, `advisorModel`, fallback chain).
3. `enforceAvailableModels: true` (**v2.1.175+**, non-empty list) — makes **Default** obey the allowlist (empty array never engages). Without this, cost lockdown is incomplete.
4. `ANTHROPIC_DEFAULT_*_MODEL` env — pins what an allowed alias resolves to.

Set `availableModels` in **managed/policy** settings for a strict allowlist: managed **REPLACES** the merged user/project result (user/project can only widen lower-precedence lists; strict replacement requires **v2.1.175+**, earlier versions merge → allowlist leaks).

`fallbackModel` (string[] chain): `--fallback-model sonnet,haiku`; flag beats setting; `default` expands to default model; **capped at 3 entries** (extras silently ignored); switch lasts current turn only. Auth/billing/rate-limit/request-size/transport errors never trigger fallback.

#### Effort & thinking

- Effort levels: Fable 5/Opus 4.8/4.7 → `low,medium,high,xhigh,max`; Opus 4.6/Sonnet 4.6 → `low,medium,high,max`. Default `high` (xhigh on Opus 4.7). Unsupported level falls back to highest supported at-or-below.
- Set via `/effort` (or `auto`), `--effort` (session), `CLAUDE_CODE_EFFORT_LEVEL` (`low|medium|high|xhigh|max|auto`), `effortLevel` settings key (only low/medium/high/xhigh; not max/ultracode), or skill/subagent `effort` frontmatter. **Precedence: env var > configured level > model default.** low/medium/high/xhigh persist; `max` is session-only.
- **`CLAUDE_CODE_EFFORT_LEVEL` overrides everything** including frontmatter and `/effort` — can mask a project's intended effort if set in the shell.
- For cost: prefer **medium/low** over always-high; reserve max for demanding tasks (can overthink with diminishing returns — test before broad adoption).
- Keyword **`ultrathink`** anywhere in a prompt = deeper one-off reasoning (in-context instruction; API effort unchanged). "think", "think hard", "think more" are **NOT recognized** keywords.
- `ultracode` (in `/effort` menu or `"ultracode": true`) = a Claude Code setting (xhigh + dynamic workflow orchestration), session-only; not an effort level.
- Extended thinking: toggle Option+T (mac)/Alt+T; global default `alwaysThinkingEnabled` in `~/.claude/settings.json`; `MAX_THINKING_TOKENS=0` disables (no effect on Fable 5). `Ctrl+O` toggles verbose display; `showThinkingSummaries:true` for full summaries. **You are billed for all thinking tokens** even collapsed/redacted. On Opus 4.6/Sonnet 4.6 only, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` reverts to fixed `MAX_THINKING_TOKENS` budget.
- 1M context: Fable 5, Opus 4.6+, Sonnet 4.6. On Max/Team/Enterprise, Opus auto-upgrades to 1M. **Sonnet 1M is excluded from auto-upgrade and always consumes usage credits** (even on Max). 1M uses standard pricing beyond 200K. Disable with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`.

### Output styles

- Output styles **modify the system prompt** (append instructions); CLAUDE.md adds a user message after it; `--append-system-prompt` appends for one invocation. Use a style only when re-prompting for the same voice/format every turn — for project conventions/context use CLAUDE.md.
- Built-in: **Default** (standard SWE), **Proactive** (acts immediately, still shows permission prompts), **Explanatory** (adds "Insights"), **Learning** (Insights + `TODO(human)` markers). Explanatory/Learning produce **longer (more expensive) responses**.
- Custom styles = Markdown at User `~/.claude/output-styles`, Project `.claude/output-styles`, or Managed-policy `.claude/output-styles`. Filename = style name unless overridden by frontmatter `name`. Frontmatter: `name`, `description`, `keep-coding-instructions` (default false), `force-for-plugin` (default false).
- **By default custom styles DROP the built-in SWE instructions** — set `keep-coding-instructions: true` to keep coding behavior (scoping changes, comments, verification). Omit it for non-coding roles.
- **Team distribution:** commit `outputStyle` in a shared/project settings file; selecting via `/config` writes to **`.claude/settings.local.json`** (local, not propagated). Plugins ship styles in `output-styles/`; `force-for-plugin: true` overrides the user's `outputStyle` (first loaded wins among multiple).
- **Changes take effect only on next session** (`/clear` or new session) — system prompt is read once at start; also invalidates prompt caching for that segment.
- Project styles load from every `.claude/output-styles/` between cwd and repo root; on same-name collision the **closest-to-cwd wins** (v2.1.178+). The standalone `/output-style` command was removed in v2.1.91 — use `/config` or edit `outputStyle`.

### Hooks (config surface)

- Hooks go **under the `hooks` key in settings.json**, NOT a standalone file (only plugins load `hooks/hooks.json`). If a hook doesn't appear in `/hooks`, it isn't read.
- **Matcher is a single STRING** using `|` for multiple tools (`"Edit|Write"`). An **array value is a schema error** → settings error + `/doctor` flags it + the hook entry is dropped. Matching is **case-sensitive, capitalized** (`Bash`, `Edit`, `Write`, `Read`); `"bash"` never matches.
- Hook types: `exec` (local command), `http` (POST webhook), `sdk`. Lifecycle events include `ConfigChange`, `Before/AfterBash`, `Before/AfterRead`, `Before/AfterWrite`, `Before/AfterApiCall`, `SessionStart/SessionEnd`, plus `PreToolUse` (the way to **hard-block** an action), `Notification`, `InstructionsLoaded` (logs which instruction files loaded — for debugging lazy rules).
- HTTP hook security (managed): `allowedHttpHookUrls` (undefined=no restriction, empty=block all), `httpHookAllowedEnvVars` (env-var allowlist for interpolation; arrays merge). `disableAllHooks` disables all hooks **and the status line**.
- For anything that must run at a fixed lifecycle point or be hard-blocked, use a hook — **not CLAUDE.md** (which is not enforcement).

### Environment variables (key ones)

Set in the `env` block of settings.json (shareable via repo) rather than relying on each member's shell exports. Some env vars override their equivalent setting, some don't — **varies per-variable**.

- **Timeouts:** `API_TIMEOUT_MS` (default 600000=10min, max 2147483647 — **values above max fail immediately**), `BASH_DEFAULT_TIMEOUT_MS` (120000), `BASH_MAX_TIMEOUT_MS` (600000, caps model-set bash timeout), `BASH_MAX_OUTPUT_LENGTH` (saves full output to file when exceeded).
- **Context/compaction:** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` (1–100, can only **LOWER** the trigger; higher ignored), `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (lower → compact earlier; **does NOT affect status-line `used_percentage`**), `DISABLE_AUTO_COMPACT`.
- **Gateway/proxy:** `ANTHROPIC_BASE_URL` (routes requests, **does NOT change which model answers**; disables MCP tool search on non-first-party hosts → set `ENABLE_TOOL_SEARCH=true`), `CLAUDE_CODE_ATTRIBUTION_HEADER=0` (better prompt-cache hits on gateways), `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` (strips beta headers), `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` (populate picker from gateway `/v1/models`).
- **Auth/CI:** `ANTHROPIC_API_KEY` (**overrides Pro/Max/Team subscription** — surprise API billing; in interactive mode requires approval, in `-p` always used without prompt), `apiKeyHelper` + `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` (default 3600000) for rotating credentials, `CLAUDECODE=1` (set in spawned subprocesses — detect nested execution), `CLAUDE_CODE_CHILD_SESSION=1` (child sessions excluded from `--resume`/`--continue`/history unless `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1`).
- **Privacy/compliance:** `CLAUDE_CODE_SKIP_PROMPT_HISTORY` (skips transcripts + prompt history any mode), `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` (one switch = `DISABLE_AUTOUPDATER`+`DISABLE_FEEDBACK_COMMAND`+`DISABLE_ERROR_REPORTING`+`DISABLE_TELEMETRY`), `CLAUDE_CODE_DISABLE_1M_CONTEXT=1`, `CLAUDE_CODE_DISABLE_POLICY_SKILLS=1` (CI/containers), `DISABLE_TELEMETRY`/`DO_NOT_TRACK` (also disables surveys unless `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL=1`).
- **Caching:** `DISABLE_PROMPT_CACHING=1` (global, precedence over per-model), `DISABLE_PROMPT_CACHING_{HAIKU,SONNET,OPUS,FABLE}=1`.
- **Feature toggles:** `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS`, `CLAUDE_CODE_DISABLE_WORKFLOWS`, `CLAUDE_CODE_DISABLE_CRON=1` (stops already-scheduled tasks too), `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` (precedence over `includeGitInstructions`).
- **Debug:** `CLAUDE_CODE_DEBUG_LOGS_DIR` is a **FILE path** (default `~/.claude/debug/<session-id>.txt`) despite the name, and requires a separate debug-enable (`--debug`/`/debug`/`DEBUG`); `CLAUDE_CODE_DEBUG_LOG_LEVEL` (default `debug`).
- **Removed:** `CLAUDE_CODE_CONNECT_TIMEOUT_MS` is a no-op (v2.1.186+) — use `API_TIMEOUT_MS`.

### Governance (managed settings)

- **`managed-settings.json` overrides EVERYTHING** including CLI flags (`--permission-mode`, `--settings`); users cannot override. Partially applies even in `--safe-mode` and clean `CLAUDE_CONFIG_DIR` sessions (lives at a system path outside `~/.claude`).
- System dirs: macOS `/Library/Application Support/ClaudeCode/`; Linux/WSL `/etc/claude-code/`; Windows `C:\Program Files\ClaudeCode\` (**legacy `C:\ProgramData\ClaudeCode\` removed v2.1.75**). Files: `managed-settings.json` (base), `managed-mcp.json`, `managed-settings.d/` drop-in.
- **Drop-in directory** `managed-settings.d/`: merge order = `managed-settings.json` first, then `*.json` **alphabetically** (use numeric prefixes `10-telemetry.json`, `20-security.json`); hidden files ignored. Scalars override, arrays concatenate+dedupe, objects deep-merge.
- Delivery precedence: **server > MDM > file**. macOS MDM: `com.anthropic.claudecode` plist. Windows admin: `HKLM\SOFTWARE\Policies\ClaudeCode` (`Settings` = JSON); user-level (lowest): `HKCU\SOFTWARE\Policies\ClaudeCode`.
- **Managed-only keys:** `claudeMd`, `forceLoginMethod` (`claudeai`|`console`), `forceLoginOrgUUID`, `requiredMinimumVersion`/`requiredMaximumVersion`, `forceRemoteSettingsRefresh` (blocks startup until remote fetch; **CLI exits if fetch fails** = fail-closed), `allowManagedPermissionRulesOnly`, `allowManagedHooksOnly`, `policyHelper` (v2.1.136+), `parentSettingsBehavior` `merge`|`first-wins` (v2.1.133+).
- **MCP lockdown:** `allowedMcpServers` (undefined=no restriction, empty=lockdown), `deniedMcpServers` (**beats allowlist**), `allowManagedMcpServersOnly` + `allowedMcpServers`, `disableClaudeAiConnectors` (v2.1.182+; claude.ai connectors auto-fetch by default), `allowAllClaudeAiMcps`.
- **Plugin governance:** `blockedMarketplaces`, `strictKnownMarketplaces`, `pluginSuggestionMarketplaces`, `allowedChannelPlugins`, `pluginTrustMessage`.
- **Skill/workflow lockdown:** `disableBundledSkills`, `disableSkillShellExecution`, `disableWorkflows`.
- `remote-settings.json` under `~/.claude/` is a cached copy of server-managed settings, refreshed each launch (present only when org configures them).
- `cleanupPeriodDays` (default 30, min 1; `0` rejected) auto-deletes session files older than threshold at startup.
- Split governance: managed **settings** (permissions.deny, sandbox.enabled, env, forceLoginMethod) for technical ENFORCEMENT; managed **CLAUDE.md** for behavioral GUIDANCE.
- As of **v2.1.169+**, typos in `managed-settings.json` are stripped + warned (not blocking) — **EXCEPT security fields like `allowedMcpServers` fail closed** (malformed = empty list = full lockdown). Run `claude doctor` before fleet rollout.

### Worktrees & isolation

- `.worktreeinclude` (repo root, committed, `.gitignore` syntax): lists **gitignored** files (e.g. `.env`) to copy into new worktrees (`--worktree`, EnterWorktree tool, `isolation: worktree` subagents) so parallel/isolated sessions aren't missing local config. Only files that match AND are gitignored are copied. **Git-only** — a WorktreeCreate hook for another VCS silently ignores it.

### Diagnostics & debugging config

- **`/context` first** — shows everything in the context window by category (system prompt, memory files, skills, MCP tools, conversation); confirm CLAUDE.md/rules/skill descriptions actually loaded. Then drill into the per-category command.
- Per-category: `/memory` (which CLAUDE.md + rules loaded, toggles auto-memory), `/skills`, `/agents`, `/hooks`, `/mcp`, `/permissions` (resolved allow/deny), `/status` (active settings sources incl. whether managed is overriding).
- `/doctor` validates config (invalid keys, schema errors, install health); press **`f`** to send the report to Claude for fixes. `claude doctor` validates before fleet deploy.
- `/debug [issue]` enables debug logging + diagnoses. Live watches: `claude --debug hooks`, `claude --debug mcp`.
- **Two-step config bisect:** (1) `claude --safe-mode` (v2.1.169+) disables all customizations (CLAUDE.md, skills, plugins, hooks, MCP, custom commands/agents) but keeps auth/model/built-in tools/permissions — if the problem vanishes, a customization is the cause. (2) If it persists, run a clean session: `cd /tmp && CLAUDE_CONFIG_DIR=/tmp/claude-clean claude` (bypasses everything under `~/.claude`, launched from a dir with no `.claude`/`.mcp.json`/CLAUDE.md), then reintroduce files one at a time. **Managed settings still apply in both** (system path).

### Privacy & data retention

- Transcripts/history under `~/.claude` are **plaintext, unencrypted at rest** (OS file permissions only). Anything through a tool (file contents, command output, pasted text, a `.env` read) lands in `projects/<project>/<session>.jsonl`. Reduce exposure: lower `cleanupPeriodDays`, set `CLAUDE_CODE_SKIP_PROMPT_HISTORY`, add deny rules for credential files.
- Auto-cleaned on startup once older than `cleanupPeriodDays`: `projects/`, `file-history/`, `plans/`, `debug/`, `paste-cache/`, `image-cache/`, `session-env/`, `tasks/`, `shell-snapshots/`, `backups/`, `feedback-bundles/`. **Persist indefinitely:** `history.jsonl` (every prompt typed), `stats-cache.json`, `remote-settings.json`.
- `claude project purge <path>` (v2.1.124+) deletes per-project state; flags `--dry-run`, `--yes`, `--all` (purges every project; deletes `history.jsonl` outright, not filtered), `-i`. **Leaves `shell-snapshots/` and `backups/` alone** (not project-scoped).
- Non-interactive: `--no-session-persistence` with `-p`, or `persistSession: false` (Agent SDK).
- **Never delete** `~/.claude.json`, `~/.claude/settings.json`, `~/.claude/plugins/`.

### Gotchas

- **Two file types look alike but behave differently:** CLAUDE.md files are concatenated into context (not key-merged); settings.json files ARE merged key-by-key.
- **Scalar settings silently take the most-local value** — a project `model` can override your global default with no warning. Arrays (permissions.allow) combine.
- `.claude/settings.local.json` **silently overrides** project and user settings — easy to lock in test/personal config that beats the committed team config. Auto-gitignored only when **Claude** creates it; if you create it manually you must add it yourself (and a custom `core.excludesFile` won't get the auto-ignore — add to project `.gitignore` to share).
- **`model` setting is initial-selection-only, NOT enforcement** — a user opens `/model` → Default and resolves to their tier system default regardless. Need `enforceAvailableModels:true` + env pins.
- **`availableModels` alone does NOT lock the Default option** — only `enforceAvailableModels:true` (non-empty list, v2.1.175+) closes the gap; `availableModels:[]` never engages.
- **`availableModels` set in user/project merges; managed REPLACES** — but only on v2.1.175+ (earlier versions merge → allowlist leaks).
- When `opusplan` runs but `availableModels` excludes Opus, it **silently stays on Sonnet** in plan mode (no Opus reasoning); likewise Haiku won't upgrade to Sonnet if Sonnet excluded.
- `ANTHROPIC_BASE_URL` does **not** change which model answers — only where requests go.
- **Resumed sessions keep their saved model** regardless of current `model` setting.
- **`#` quick-add / "remember this" goes to AUTO MEMORY, not CLAUDE.md** — people expecting it in CLAUDE.md won't find it there.
- **Subdirectory (below-cwd) CLAUDE.md is absent at launch** and not re-injected after `/compact` — nested instructions can be silently missing until a file in that subdir is read.
- **After `/compact` only root CLAUDE.md is re-injected** — nested CLAUDE.md and conversation-only instructions can be lost.
- **`@path` imports do NOT save context** (they fully expand at launch) and resolve **relative to the importing file, not cwd**. Declining the import-approval dialog **permanently** disables imports for that project.
- **CLAUDE.md is loaded in full regardless of size** — a large file degrades adherence rather than being truncated. Only MEMORY.md is capped (200 lines / 25KB).
- **Auto memory is machine-local** — not synced across machines/cloud (but shared across worktrees of the same repo).
- **Managed policy CLAUDE.md cannot be excluded** by `claudeMdExcludes` or user settings; the inline `claudeMd` key only works in managed/policy settings (silently ignored elsewhere).
- **Built-in Explore/Plan subagents skip CLAUDE.md** — restate critical instructions in the delegating prompt.
- **`~/.claude.json`** holds OAuth tokens + per-project state — never commit. Config (permissions/hooks/env) added there is silently ignored; it belongs in `~/.claude/settings.json`.
- **MCP gotchas:** servers in `~/.claude.json` are personal-only (team servers must go in `.mcp.json`); `.mcp.json` under `.claude/` or in Desktop format never loads; relative paths resolve against launch dir; `settings.json` `env` doesn't reach MCP children; `settings.json` has no `mcpServers` key; a dismissed approval prompt leaves the server silently disabled.
- **Hook matcher as a JSON array, lowercase tool name, or a standalone hooks file all fail silently** or drop the entry. **Hook failures don't block the turn and aren't surfaced** — only logged, so a broken CI/governance hook can pass silently.
- **`Bash(rm *)` deny rules don't block `/bin/rm` or `find -delete`** — prefix rules match the literal string. Use a PreToolUse hook or sandbox.
- **Env vars read at startup only** — editing settings.json or exports doesn't affect the running session; restart `claude`.
- **`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` can only lower** the threshold; **`API_TIMEOUT_MS` above 2147483647 fails immediately** (not clamped).
- **`ANTHROPIC_API_KEY` silently overrides a subscription** → unexpected API billing.
- **`CLAUDE_CODE_EFFORT_LEVEL` shell env masks** a project's intended effort.
- **You're billed for all thinking tokens** even collapsed/redacted; thinking can't be disabled on Fable 5.
- **Sonnet 1M always consumes usage credits** (excluded from Opus auto-upgrade) even on Max.
- **Fable 5 first-turn fallback** triggers on workspace context alone (CLAUDE.md + git status) in security/biology repos — even before you send anything unusual; in non-interactive/SDK mode it **refuses (ends the turn) instead of switching**, breaking pipelines. Use `claude --safe-mode` to isolate.
- **Custom output styles silently drop SWE instructions** unless `keep-coding-instructions: true`; style changes only apply next session; `/config` selection writes to gitignored `settings.local.json` (not propagated); a `force-for-plugin: true` plugin overrides the user's `outputStyle` (first loaded wins).
- **`disableAllHooks: true` also disables the status line** — easy to miss when troubleshooting a blank bar.
- **`enableAllProjectMcpServers:true` auto-approves all `.mcp.json` servers** — dangerous for cloned/untrusted repos; cloned servers still need workspace-trust acceptance.
- **`forceRemoteSettingsRefresh:true` exits the CLI if the remote fetch fails** (fail-closed by design).
- **`deniedMcpServers` beats `allowedMcpServers`** — you can't force-allow a denied server.
- **Malformed security fields in `managed-settings.json` fail closed** (empty list = full lockdown) even though other typos are tolerated.
- **`NO_COLOR`/`FORCE_COLOR` in the `env` key** are passed to subprocesses but don't change Claude Code's own UI — set them in the shell before launch.
- **`--add-dir` doesn't load CLAUDE.md** from extra dirs unless `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`.
- **Auto memory requires v2.1.59+**; `autoMemoryDirectory` in project settings honored only after accepting workspace trust.
- **Skill must be a folder** `.claude/skills/name/SKILL.md` — a flat `name.md` won't appear in `/skills`; `disable-model-invocation: true` shows a "user-only" badge and Claude won't auto-trigger it.
- If a **skill and command share a name, the skill wins**; project workflow/output-style beats same-named global — collisions resolve by precedence, not error.


---

## Permissions, security & governance

### TL;DR for team leads

- **Managed settings are the only non-overridable control.** Deploy hard constraints (`permissions.deny`, `disableBypassPermissionsMode`, sandbox gates) via MDM/server-managed settings — they sit at the top of precedence and beat even CLI args.
- **Standardize on commercial accounts (Team/Enterprise/API).** Code/prompts are never used for training under commercial terms (unless you opt in). Never let devs use personal Free/Pro/Max accounts for company code.
- **Permission rules are enforced by Claude Code, not the model.** CLAUDE.md and prompts shape what Claude *tries*; only rules/modes/hooks grant or revoke access.
- **The classifier (auto mode) is a second gate, not a boundary.** For absolute bans use `permissions.deny`; for isolation use a sandbox/container/VM.
- **Distribute shared config via version control** (`.claude/settings.json`) and enforce org-wide policy via managed settings.

---

### Account model, terms & training

| Plan tier | Terms | Trained on your data? | Retention |
|---|---|---|---|
| Team / Enterprise / API / 3rd-party / Claude Gov | Commercial | No (unless opt-in, e.g. Development Partner Program) | 30 days |
| Free / Pro / Max (training ON) | Consumer | Yes | 5 years |
| Free / Pro / Max (training OFF) | Consumer | No | 30 days |

- Consumer data-training toggle: `claude.ai/settings/data-privacy-controls`.
- **Development Partner Program** = explicit org-admin opt-in for training; first-party Anthropic API only (not Bedrock/Vertex).
- **Authentication policy:** OAuth/Claude.ai login is for ordinary subscription use only. Products/services (incl. Agent SDK) **must** use API-key auth via Claude Console or a cloud provider. Routing requests through Free/Pro/Max OAuth credentials on behalf of others — or offering Claude.ai login in a third-party product — is prohibited and enforceable without notice.
- Keep automated/programmatic usage on Team/Enterprise/API, not Pro/Max (whose advertised limits assume ordinary individual use).
- Via Bedrock/Vertex, your existing commercial agreement covers Claude Code — no separate agreement needed unless mutually agreed.
- **BAA coverage requires BOTH a signed BAA AND ZDR activated per-org** — a BAA alone does not cover Claude Code.
- Encryption: TLS 1.2+ in transit; AES-256 at rest (Anthropic API disk; Bedrock AWS-managed/KMS CMK; Vertex Google-managed/CMEK; Foundry → Anthropic infra).
- Report vulnerabilities via HackerOne (no public disclosure). Compliance details at trust.anthropic.com.

---

### Settings precedence & scopes

**Precedence (highest first) — a `deny` at any level cannot be overridden by any other level:**

| Rank | Scope | File / source |
|---|---|---|
| 1 | **Managed** (cannot be overridden, incl. by CLI args) | MDM / OS policy / `managed-settings.json` / server-managed |
| 2 | Command-line arguments | `--settings`, flags |
| 3 | Local project (per-dev, gitignored) | `.claude/settings.local.json` |
| 4 | Shared project (checked in) | `.claude/settings.json` |
| 5 | User | `~/.claude/settings.json` |

- **Distribution pattern:** check `.claude/settings.json` into VCS for team-wide allow/deny lists and `enabledPlugins`; keep dev-specific overrides in gitignored `.claude/settings.local.json`; put hard constraints in managed settings.
- Rule evaluation order: **deny → ask → allow**, first match wins; specificity does *not* change order. A broad `deny` always beats a narrower `allow`; a matching `ask` prompts even with a more specific `allow`.
- Inspect rule sources with `/permissions`; confirm active managed source with `/status`.

**Managed-only keys** (ignored elsewhere): `allowManagedPermissionRulesOnly`, `allowManagedMcpServersOnly`, `allowManagedHooksOnly`, `strictPluginOnlyCustomization`, `allowAllClaudeAiMcps`, `allowedChannelPlugins`, `blockedMarketplaces`, `channelsEnabled`, `forceRemoteSettingsRefresh`, `pluginTrustMessage`, `sandbox.filesystem.allowManagedReadPathsOnly`, `sandbox.network.allowManagedDomainsOnly`, `strictKnownMarketplaces`, `wslInheritsWindowsSettings`.

**Lock down to central policy only:**
```json
{
  "allowManagedPermissionRulesOnly": true,
  "allowManagedMcpServersOnly": true,
  "allowManagedHooksOnly": true,
  "strictPluginOnlyCustomization": true
}
```
`strictPluginOnlyCustomization` also accepts an array, e.g. `["skills","hooks"]`.

---

### Permission modes

| Mode | Behavior |
|---|---|
| `default` | Read-only tools auto-run; writes/Bash prompt |
| `acceptEdits` | + file edits + filesystem Bash (`mkdir touch rm rmdir mv cp sed`) **within cwd/additionalDirectories**; other Bash & out-of-scope/protected writes still prompt |
| `plan` | Read-only exploration, no edits |
| `auto` | Everything via classifier safety checks (research preview) |
| `dontAsk` | Auto-**denies** anything that would prompt; only `permissions.allow` + read-only Bash run; `ask` rules are denied. Non-interactive — for CI |
| `bypassPermissions` | Skips all prompts except explicit `ask` rules (and `rm -rf /` / `rm -rf ~` circuit-breaker) |

```json
{"permissions": {"defaultMode": "acceptEdits"}}
```
- Launch override: `claude --permission-mode <mode>` (also works with `-p`). Shift+Tab cycles `default → acceptEdits → plan` (optional modes slot after; `dontAsk` never appears).
- In every mode except `bypassPermissions`, **protected-path writes are never auto-approved**, and `allow` rules do **not** pre-approve them (the protected-path check runs *before* allow evaluation). `deny`/`ask` rules apply in every mode including bypass; `allow` rules have no effect under bypass.
- **Protected dirs:** `.git`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, `.mvn`, `.claude` (except `.claude/worktrees`). **Protected files:** `.gitconfig`, shell rc (`.bashrc/.zshrc/.envrc`), package config (`.npmrc/.yarnrc/bunfig.toml`), `.pre-commit-config.yaml`, `.mcp.json`, `.claude.json`, `pyrightconfig.json`.
- `bypassPermissions` cannot be toggled mid-session — restart with `--permission-mode bypassPermissions`, `--dangerously-skip-permissions`, or `--allow-dangerously-skip-permissions` (the `--allow-` variant only adds it to the cycle). Refuses to start as **root/sudo** on Linux/macOS unless inside a recognized sandbox/dev container.
- Admin org locks (managed settings): `permissions.disableAutoMode: "disable"`, `permissions.disableBypassPermissionsMode: "disable"`. `disableBypassPermissionsMode` works from any scope (a user can self-lock).
- VS Code: `claudeCode.initialPermissionMode` (does **not** accept `auto` — use `defaultMode` for that); bypass needs the extension toggle. Remote Control start: `claude remote-control --permission-mode acceptEdits`.

---

### Permission rule syntax

- Form: `Tool` or `Tool(specifier)`. Examples: `Bash(npm run build)`, `Read(./.env)`, `WebFetch(domain:example.com)`.
- A bare-tool deny (`Bash`, equivalent to `Bash(*)`) removes the tool from context entirely; a scoped deny leaves it available but blocks matching calls.
- **Param-syntax** `Tool(param:value)` works on **deny/ask only**, on top-level scalar params (`Agent(model:opus)`, `Bash(run_in_background:true)`); one param per rule, `*` wildcard supported. **Canonicalized fields are NOT param-matchable** — `command`, `file_path`, `path`, `notebook_path`, `url`. `Bash(command:rm *)` is silently ignored with a warning → use `Bash(rm *)`.
- **Bash wildcards:** `*` matches anything incl. spaces. A **space before `*` enforces a word boundary** — `Bash(ls *)` matches `ls -la` not `lsof`; `Bash(ls*)` matches both. Trailing `:*` ≡ trailing ` *` (only at end).
- **Tool-name globs:** deny/ask accept `*` and `mcp__*`. **Allow** rules only accept globs after a literal `mcp__<server>__` prefix (e.g. `mcp__github__get_*`); unanchored allow globs (`*`, `B*`, `mcp__*`) are silently skipped with a warning.
- **Compound commands:** shell-operator aware (`&& || ; | |& &`, newlines); each subcommand must match independently. `Bash(safe *)` does not permit `safe && other`. Approving a compound with "don't ask again" saves up to **5** per-subcommand rules.
- **Process wrappers stripped** before matching: `timeout time nice nohup stdbuf`, bare `xargs`. **NOT stripped:** `direnv exec`, `devbox run`, `mise exec`, `npx`, `docker exec` — so `Bash(devbox run *)` allows arbitrary commands. Write specific rules per inner command (`Bash(devbox run npm test)`). `watch setsid ionice flock` and `find -exec/-delete` always prompt.
- **Read/Edit path anchors (gitignore spec):** `//path` = absolute from FS root; `~/path` = home; `/path` = **project-root-relative (NOT absolute)**; `path`/`./path` = cwd-relative. `WebFetch(domain:*.example.com)` matches subdomains but **not** `example.com` itself.
- Read/Edit deny rules also cover Bash file commands (`cat head tail sed`) but **not** arbitrary subprocesses (Python/Node reading files) — use the sandbox for OS-level enforcement.
- Symlinks: allow needs **both** path and target to match; deny blocks if **either** matches.
- MCP forms: `mcp__server` (all tools), `mcp__server__*`, `mcp__server__tool`. Subagents: `Agent(Name)` (deny or `--disallowedTools`). `Cd` rules govern `/cd` targets only.
- **Use canonical tool names** in rules and hook matchers (e.g. `TaskStop`, not transcript label "Stop Task") — mismatches silently fail to match; unknown-tool names emit a startup warning (names with `_`/`*` exempt).
- Working dirs: `--add-dir`, `/add-dir`, or `additionalDirectories` (persistent). `additionalDirectories` grants **file access only** — no skills/agents/hooks/CLAUDE.md loading. `/cd` (v2.1.169+) relocates the session and loads the new dir's CLAUDE.md.

**Robust URL/network filtering:** deny `curl`/`wget` and grant `WebFetch(domain:...)` allow rules — never try to constrain curl args with Bash patterns. `WebFetch` alone does not block network access while Bash is allowed.

**Approval durability:** Bash "don't ask again" persists permanently per project-dir+command; file-modification "don't ask again" lasts only until session end.

---

### Auto mode (classifier)

Routes tool calls through a classifier that blocks anything irreversible/destructive/outside your environment. A **per-action control, not an isolation boundary**. Permission `deny`/`ask` rules are evaluated **before** the classifier.

- **Requirements:** v2.1.83+; Opus 4.6+/Sonnet 4.6 (API) or Opus 4.7/4.8 (Bedrock/Vertex/Foundry). On Team/Enterprise an admin must enable it at `claude.ai/admin-settings/claude-code`. On Bedrock/Vertex/Foundry also set `CLAUDE_CODE_ENABLE_AUTO_MODE=1` (v2.1.158+).
- Set `defaultMode: "auto"` only in `~/.claude/settings.json` (user) or managed settings — **repo-level `auto` is ignored** (v2.1.142+, silently). Cloud also ignores checked-in `bypassPermissions`/`dontAsk`.
- Reads `autoMode` from: `~/.claude/settings.json`, `.claude/settings.local.json`, managed settings, and inline `--settings`/SDK JSON. **Does NOT read checked-in `.claude/settings.json`** — a repo cannot inject autoMode allow rules. Same CLAUDE.md content steers both Claude and the classifier (e.g. "never force push").

**Classifier precedence (4 tiers):** `hard_deny` (unconditional) → `soft_deny` (overridable by intent/allow) → `allow` (overrides soft_deny) → explicit *specific* user intent overrides remaining soft blocks ("force-push this branch" yes; "clean up the repo" no).

- Sections (`environment`, `allow`, `soft_deny`, `hard_deny`) are prose, evaluated independently and combined additively across scopes. Devs can extend but not remove managed entries.
- **`soft_deny` is not a hard boundary** — a dev `allow` can override an org `soft_deny`. For true enforcement use `permissions.deny`.
- **Always include `"$defaults"`** in any autoMode array — omitting it silently replaces the whole built-in list (dropping force-push/`curl|bash`/prod-deploy soft blocks or data-exfiltration/bypass hard blocks).
- `environment` is the main field most orgs set: list source-control orgs, trusted buckets, internal domains/services. Default classifier trusts only cwd + current repo remotes.
- CLI: `claude auto-mode defaults` (built-in rules as JSON), `claude auto-mode config` (effective config), `claude auto-mode critique` (AI review of custom rules). To rewrite a built-in rule, save `defaults` to a file, edit, paste in place of `$defaults`.
- Denials log in `/permissions` → "Recently denied" (press `r` to retry). React programmatically via the `PermissionDenied` hook.
- Blocks by default: `curl|bash`, external data sends, prod deploys/migrations, mass storage deletion, granting IAM/repo perms, force-push/push-to-main, destructive git (`reset --hard`, `checkout -- .`, `restore .`, `clean -fd`, `stash drop|clear`, off-session `commit --amend`), `terraform/pulumi/cdk destroy`.
- **Entering auto mode drops broad allow rules** (`Bash(*)`, `Bash(python*)`, package-run, Agent rules) — narrow rules like `Bash(npm test)` carry over; dropped rules restored on exit. Subagent frontmatter `permissionMode` is **ignored** under auto mode.
- Classifier sees user messages, tool calls, CLAUDE.md — tool **results are stripped** (a separate server probe scans them). Conversational boundaries ("don't deploy") are NOT stored as rules and can be lost to context compaction — **use a deny rule for persistent guarantees.**
- Fallback: pauses after 3 consecutive OR 20 total blocks (not configurable; allowed action resets the consecutive counter); headless `-p` aborts. Classifier adds latency + token cost on a server-configured model independent of `/model`.

---

### Sandboxing

Two distinct things: the **built-in Bash sandbox** (`/sandbox`) and the **sandbox runtime** (`@anthropic-ai/sandbox-runtime`, beta).

**Built-in Bash sandbox** — OS-level enforcement for **Bash and child processes only** (macOS Seatbelt; Linux/WSL2 bubblewrap). It does **not** isolate MCP servers, hooks, or built-in Read/Edit/WebFetch (those use permission rules). No native Windows (use WSL2; WSL1 unsupported).
- Enable per-project via `/sandbox` (writes `.claude/settings.local.json`) or all projects via `sandbox.enabled: true` in `~/.claude/settings.json`.
- Linux/WSL2 deps: `sudo apt-get install bubblewrap socat` (or `dnf`); optional seccomp via `npm install -g @anthropic-ai/sandbox-runtime`; restart after install. Ubuntu 24.04+/WSL2: if `sysctl kernel.apparmor_restrict_unprivileged_userns` returns 1, add an AppArmor profile for `/usr/bin/bwrap`.
- Default filesystem: write = cwd + subdirs + `$TMPDIR`; read = entire computer **except** denied dirs. **Default read still allows `~/.aws/credentials` and `~/.ssh/`** — add `sandbox.filesystem.denyRead` to block exfiltration.
- Filesystem keys: `allowWrite`, `denyWrite`, `denyRead`, `allowRead`. Path prefixes: `/` = absolute, `~/` = home, no-prefix = project-root (project settings) / `~/.claude` (user settings). **Differs from Read/Edit rules** (`//`=absolute, `/`=project-relative). Arrays MERGE across scopes.
- Network: nothing pre-allowed (first new domain prompts); `allowedDomains`/`deniedDomains`. **Proxy does NOT inspect TLS** — broad allows (`github.com`) enable exfiltration/domain-fronting; keep narrow, or use a TLS-terminating proxy via `sandbox.network.httpProxyPort`/`socksProxyPort`.
- **Failure-open by default:** if the sandbox can't start it warns and runs **unsandboxed** — set `sandbox.failIfUnavailable: true` for managed gates.
- `autoAllowBashIfSandboxed: true` (default): sandboxed Bash runs without prompting even with a bare `Bash` ask rule; content-scoped asks (`Bash(git push *)`) still prompt, deny rules still apply, `rm` of `/`/home still prompts.
- Escape hatch: `dangerouslyDisableSandbox` runs a command outside the sandbox via the regular flow; disable with `sandbox.allowUnsandboxedCommands: false` ("Strict mode") → all commands sandboxed or in `excludedCommands`.
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` strips Anthropic + cloud credentials from sandboxed subprocesses (they inherit parent env by default).
- `excludedCommands` (run unsandboxed): `docker *`; on macOS Go CLIs (`gh`, `gcloud`, `terraform`) that fail TLS under Seatbelt; jest `--no-watchman`; on WSL2 `cmd.exe`/`powershell.exe`/`/mnt/c/*`. **No managed lockdown — devs can always append**, so keep the managed list narrow.
- Nested: `enableWeakerNestedSandbox: true` only inside an already-isolated unprivileged container (weakens security, exposes `/proc`).

**Org-wide lockdown (managed settings):**
```json
{"sandbox": {"enabled": true, "failIfUnavailable": true, "allowUnsandboxedCommands": false,
  "filesystem": {"allowManagedReadPathsOnly": true}, "network": {"allowManagedDomainsOnly": true}}}
```
Managed precedence: boolean keys → managed value wins; array keys (`excludedCommands`, `allowRead`) → merged (devs can widen). The sandbox auto-denies writes to settings.json at every scope and the managed dir.

**Sandbox runtime** (`npx @anthropic-ai/sandbox-runtime claude`) — isolates **MCP servers and hooks** too, without Docker. Denies **all** writes and network by default; config in `~/.srt-settings.json` — must allow writes to the project dir + `~/.claude` + `~/.claude.json`, and network for `api.anthropic.com`/provider. Beta; format may change.

**Containers/VMs/dev containers** are conventions, **not enforcement** (Claude Code doesn't require them) — enforce installation via MDM/software allowlisting. Commit a `.devcontainer/` with default-deny iptables firewall, pinned version + allowlist, to standardize. Always run `--dangerously-skip-permissions` inside a full-process isolation boundary (container/VM/sandbox runtime) so file tools/MCP/hooks are also constrained — the Bash sandbox alone is insufficient for unattended runs. Blocked as root/sudo except inside a recognized sandbox.

**Choosing isolation:** dedicated VM or Claude Code on the web → untrusted repos; sandbox runtime → MCP/hook isolation without Docker; Bash sandbox → reduce prompts in everyday trusted work. Defense-in-depth: deny rules stop Claude attempting access; sandbox stops Bash children even if a prompt injection bypasses the model.

---

### Telemetry, feedback & local data

| Env var / setting | Effect |
|---|---|
| `DISABLE_TELEMETRY` | Opt out of operational metrics (no code/paths) |
| `DISABLE_ERROR_REPORTING` | Opt out of Sentry |
| `DISABLE_FEEDBACK_COMMAND=1` | Disable `/feedback` |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1` | Disable session quality surveys |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | One switch: telemetry + errors + feedback + surveys |
| `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL=1` | Keep survey ratings via your own OTel collector only |
| `feedbackSurveyRate` (0–1) | Tune survey frequency instead of disabling |
| `cleanupPeriodDays` | Local transcript cache lifetime |

- Set these in managed `settings.json` `env` block for org-wide effect. Surveys also auto-disable when `DO_NOT_TRACK` is set.
- On Bedrock/Vertex/Foundry/AWS, telemetry/errors/`/feedback` are **off by default** — but **session surveys and the WebFetch safety check still run**; still set `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`. (v2.1.126: with `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`, metrics default **ON** for those providers, opt out via `DISABLE_TELEMETRY`.)
- **Local transcripts sit in PLAINTEXT under `~/.claude/projects/` for 30 days** regardless of account/ZDR — treat as sensitive; tune `cleanupPeriodDays`.
- Retention: `/feedback` shares → 5 years; survey transcript-share → up to 6 months.
- Without Anthropic creds, `/feedback` writes a local archive to `~/.claude/feedback-bundles/` (key/token patterns redacted; nothing sent).
- Monitor usage org-wide via OpenTelemetry metrics for audit. Use `ConfigChange` hooks to audit/block settings changes mid-session. Audit-log events for settings changes available via compliance API / audit-log export (contact account team).

---

### Network configuration

- Set all network vars via the `env` block in `~/.claude/settings.json` (centralized, consistent for the team). `CLAUDE_CODE_CERT_STORE` has **no schema key** — must go in `env` or process env.
- Proxy: `HTTPS_PROXY` (recommended), `HTTP_PROXY` (fallback), `NO_PROXY` (space/comma list; `*` bypasses all). **SOCKS unsupported.** Basic auth embeds creds in the URL (leak risk in logs); for NTLM/Kerberos use an LLM Gateway. Avoid hardcoding proxy passwords.
- TLS: default `CLAUDE_CODE_CERT_STORE=bundled,system` trusts both the bundled Mozilla set and the OS store — so **Zscaler/CrowdStrike Falcon work with no config** once their root cert is in the OS trust store. Custom CA: `NODE_EXTRA_CA_CERTS=/path/ca.pem` (don't disable TLS verification). mTLS: `CLAUDE_CODE_CLIENT_CERT`, `CLAUDE_CODE_CLIENT_KEY`, optional `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE`.

**Allowlist:**
```
api.anthropic.com          # API
claude.ai                  # auth
platform.claude.com        # Console auth
downloads.claude.ai        # plugins + native installer/updater
storage.googleapis.com     # native installer/updater, versions < 2.1.116 only
raw.githubusercontent.com  # changelog/release notes/marketplace counts
bridge.claudeusercontent.com, *.claudeusercontent.com  # BROWSER only (Chrome bridge / artifacts), not CLI
```
- Drop the two download domains if self-distributing via npm. On Bedrock/Vertex/Foundry, model traffic goes to the provider, but still allow `api.anthropic.com` **or** set `skipWebFetchPreflight: true` (the WebFetch check runs on every provider).
- Disable telemetry via env vars first for a minimal allowlist.
- **GitHub Enterprise Cloud** IP restrictions: enable IP allow-list inheritance for installed GitHub Apps. **Self-hosted GHES** behind a firewall: allowlist Anthropic API IP ranges.

---

### WebFetch domain safety

- WebFetch sends only the **hostname** (not URL/path/contents) to `api.anthropic.com` against a blocklist; cached per host for 5 min. Runs on **every provider** and is **NOT** disabled by `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`.
- Blocking `api.anthropic.com` silently breaks all WebFetch until allowlisted or `skipWebFetchPreflight: true`. Disabling the preflight means WebFetch attempts **any** URL without the blocklist — pair with permission rules to restrict domains.
- WebFetch uses an isolated context window to avoid prompt injection into the main context.

---

### Server-managed & endpoint-managed settings

- **Server-managed** (Anthropic servers at auth time) → for orgs without MDM. **Endpoint-managed** (MDM / macOS managed prefs / Windows registry / `managed-settings.json`) → stronger, OS-protectable. Both occupy the **highest** tier.
- **Sources do NOT merge:** if server-managed delivers *any* key, endpoint-managed is ignored entirely; only if server delivers nothing does endpoint apply. Within the tier: server checked first.
- Requires Teams (v2.1.38+) or Enterprise (v2.1.30+) plan; network to `api.anthropic.com`. Only Primary Owner/Owner can manage server-managed settings; config is **uniform — no per-group/per-user**.
- All settings.json keys supported except OS-policy-only ones (`policyHelper`, `wslInheritsWindowsSettings` → must go through MDM/system file). `managed-mcp.json` (`allowedMcpServers`/`deniedMcpServers`) **cannot** ship via server-managed settings.
- Clients fetch at startup, poll **hourly**; updates apply without restart **except** advanced settings (OpenTelemetry) which need a full restart.
- Cache: `~/.claude/remote-settings.json` (salvaged payload only; invalid entries stripped, error surfaced, valid ones applied — v2.1.169+).
- `forceRemoteSettingsRefresh: true` blocks startup until a fresh fetch (closes the brief unenforced startup window); if fetch fails the CLI exits — **confirm `api.anthropic.com` connectivity first** or users can't start. `auth` subcommands exempt (v2.1.139+).
- Security approval dialog before applying shell-command settings, non-allowlisted env vars, and hooks; rejecting exits. **`-p` non-interactive SKIPS these dialogs** and applies shell/env/hook settings without approval.
- **Bypassed entirely by third-party providers**: `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_MANTLE`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`, or non-default `ANTHROPIC_BASE_URL`. It's a client-side control — admin/sudo users on unmanaged devices can evade it (prefer endpoint-managed for OS protection; use `ConfigChange` hooks to detect tampering).
- Verify: `/permissions`, `/status`, `claude --debug-file <path>` (search "Remote settings"); validate payloads with `claude doctor` on a test machine before org rollout.

**Central enforcement recipe:**
```json
{"permissions": {"deny": ["Bash(curl *)", "Read(./.env)", "Read(./secrets/**)"],
  "disableBypassPermissionsMode": "disable"},
 "allowManagedPermissionRulesOnly": true}
```

---

### Hooks & defense-in-depth

- **`PreToolUse` hook exiting code 2 blocks a call before rules are evaluated, overriding allow rules** — but hooks **cannot loosen** deny/ask rules (deny-first precedence preserved, incl. managed deny). Robust pattern: add `Bash` to allow, register a PreToolUse hook to reject specific dangerous commands (more reliable than allow/deny pattern lists).
- `PermissionRequest` hook for custom permission logic; `ConfigChange` to audit/block settings changes; `PermissionDenied` to react to auto-mode denials.

**security-guidance plugin** (`/plugin install security-guidance@claude-plugins-official`; all plans; CLI v2.1.144+, Python 3.8+, git repo):
- Three review layers: (1) per-edit deterministic pattern match (free, anywhere); (2) end-of-turn background model diff review (≤30 files/turn, ≤3x in a row); (3) commit/push agentic review (only on `git commit`/`git push` **Claude runs via its Bash tool** — capped 20/rolling hour).
- Enable team-wide via checked-in `.claude/settings.json` `"enabledPlugins": {"security-guidance@claude-plugins-official": true}` or managed settings (admin-only disable). **User-scoped plugins don't propagate to teammates or Claude Code on the web.**
- Custom config: model guidance in `.claude/claude-security-guidance.md` (combined cap **8 KB**); per-edit rules in `.claude/security-patterns.json` (prefer JSON — YAML silently no-ops without PyYAML; max **50 rules**, reminders capped **1 KB**, glob paths prefixed `**/`). Disable layers via `ENABLE_PATTERN_RULES=0`, `ENABLE_STOP_REVIEW=0`, `ENABLE_COMMIT_REVIEW=0`, `ENABLE_CODE_SECURITY_REVIEW=0`, or `SECURITY_GUIDANCE_DISABLE=1`. Model override: `SECURITY_REVIEW_MODEL`, `SG_AGENTIC_MODEL` (default Opus 4.7). Diagnostics: `~/.claude/security/log.txt`.
- **Advisory only — never blocks writes/commits.** For hard enforcement use a PreToolUse hook or CI gate. Stack: plugin → `/security-review` → PR Code Review (Team/Enterprise) → CI scanners.

**Other operational guidance:** Don't pipe untrusted content directly to Claude; review suggested commands/critical-file changes before approval. MCP servers in the Anthropic Directory are **not** security-audited — trust is the user's. On Windows, **don't enable WebDAV or grant `\\*` paths** (bypasses the permission system). Start Claude from a project subdirectory (home-dir trust is session-only). Credentials stored in macOS Keychain / file-permission-protected on Win/Linux.

---

### Zero Data Retention (ZDR)

- Enterprise-only, **not in the standard plan**, **per-organization**, enabled by the Anthropic account team after eligibility review — **cannot self-enable** in admin settings; engage sales early.
- Under ZDR: prompts/responses processed in real time, not stored after the response (except legal/abuse). Also grants per-user cost controls, Analytics dashboard, server-managed settings, audit logs. All ZDR actions audit-logged.
- **Covers only** Claude Code inference on Anthropic's direct platform. **Does NOT cover:** Bedrock/Vertex/Foundry (their own retention), MCP/third-party integrations, claude.ai chat, Cowork, Claude Code Analytics metadata, seat/user-management data.
- **Backend-disabled under ZDR** (error if used): Claude Code on the Web, Desktop cloud sessions, Artifacts, `/feedback`. Analytics shows usage only (no contribution metrics).
- **Fable 5 unavailable** under ZDR (requires retention); the `best` alias resolves to **Opus** instead — pin models via `/model` for reproducibility.
- Policy-violation-flagged sessions may be retained **up to 2 years** even under ZDR.
- Existing ZDR-via-PAYG-API-key users can transition to Enterprise while keeping ZDR (via account team).

---

### Cloud / remote execution

- **Claude Code on the web:** isolated Anthropic-managed VM per session; clones repo from GitHub; GitHub auth via secure proxy (creds never enter sandbox, scoped token); network limited by default (configurable to disabled or domain allowlist); git push restricted to the current working branch; all ops audit-logged; auto-terminated after session. Accesses only the repo where you started the session.
- **Remote Control:** runs the Claude Code process **locally — no VM/sandbox**; file access and execution are unrestricted by cloud controls; uses multiple short-lived, narrowly-scoped credentials. On Team/Enterprise, admins enable/disable Remote Control + web sessions org-wide at `claude.ai/admin-settings/claude-code`; Remote Control also disablable per-device via `disableRemoteControl` (web sessions have no per-device key).

---

### Gotchas

- **`permissions.allow` does NOT override protected-path protection** — the check runs before allow evaluation; `Edit(.claude/**)` won't let Claude edit its own config (use the in-session "allow Claude to edit its own settings" prompt).
- **Deny always wins over a narrower allow** — deny rules can't carry allowlist exceptions.
- **`defaultMode: "auto"` in repo settings is silently ignored** (v2.1.142+) — session starts in `default` with no error. Cloud silently ignores checked-in `bypassPermissions`/`dontAsk`.
- **Checked-in `.claude/settings.json` is invisible to the auto-mode classifier** — repos can't inject autoMode allow rules.
- **Omitting `"$defaults"` silently wipes the whole built-in list** for that autoMode section.
- **`soft_deny` is overridable by a dev `allow`** — not a hard boundary; use `permissions.deny`.
- **Auto mode drops broad allow rules** (`Bash(*)`, `Bash(python*)`, Agent rules) on entry; subagent `permissionMode` is ignored.
- **Conversational boundaries in auto mode are not stored as rules** and can be lost to context compaction.
- **`bypassPermissions` still writes to `.git`/`.claude`/config dirs without prompting** (v2.1.126+) — only use in isolated containers/VMs. Refuses to run as root/sudo outside a sandbox.
- **Bash sandbox is a false sense of security** — constrains only Bash; MCP servers and hooks run unconstrained on the host. Insufficient for unattended runs.
- **Sandbox fails OPEN by default** — runs unsandboxed if it can't start unless `failIfUnavailable: true`.
- **Default sandbox read policy exposes `~/.aws/credentials` and `~/.ssh/`** — add `denyRead`.
- **`excludedCommands` can't be locked by managed settings** — devs always widen the unsandboxed surface.
- **Sandbox proxy doesn't inspect TLS** — broad `allowedDomains` (`github.com`) enable exfiltration/domain-fronting.
- **Sandbox path syntax (`/`=absolute) differs from Read/Edit rules (`//`=absolute)** — easy to misconfigure.
- **`.` resolves to project root only in project settings**; in `~/.claude/settings.json` it resolves to `~/.claude`, leaving project files uncovered.
- **`/path` in Read/Edit rules is project-root-relative, not absolute** — use `//path` for true absolute paths.
- **Read/Edit deny rules don't block subprocess file access** (Python/Node scripts) — only built-in tools and recognized Bash file commands. Use the sandbox.
- **`Bash(command:rm *)` and other canonicalized-param rules are silently ignored** (startup warning) — use `Bash(rm *)`.
- **`Bash(devbox run *)`/`npx`/`docker exec` effectively allow arbitrary commands** — these wrappers aren't stripped; write per-inner-command rules.
- **Unanchored allow globs (`*`, `B*`, `mcp__*`) auto-approve nothing** (silently skipped) — only `mcp__<server>__` prefixed globs work in allow.
- **A bare `Bash`/`Bash(*)` ask rule is skipped for sandboxed commands** in auto-allow mode; **file-modifying Bash runs without prompting** there even outside accept-edits mode.
- **`additionalDirectories` grants file access only** — no skills/agents/hooks/CLAUDE.md loading.
- **`WebFetch(domain:*.example.com)` doesn't match `example.com`**; WebFetch permission doesn't stop Bash `curl`/`wget`.
- **`cd` + `git` in one compound command always prompts**, even read-only.
- **Transcript labels ≠ canonical tool names** — rules using "Stop Task" silently fail; use `TaskStop`.
- **`-p` non-interactive bypasses trust verification AND the security-approval dialog** — automation loses both safeguards.
- **Home-directory trust never persists** — start from a subdirectory.
- **Claude can READ files outside the working directory** even though it can't write there — the boundary is write-only.
- **Accept Edits silently auto-approves `rm`/`mv`/`cp` within the working directory.**
- **Server-managed and endpoint-managed don't merge** — any server key disables endpoint entirely; falling back is delayed by cached settings.
- **Third-party providers bypass server-managed settings entirely.**
- **The transcript-share survey follow-up uploads source code/file contents as-is** (only key/token patterns redacted) — a real exfiltration surface; suppressed only by ZDR, org policy, or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`.
- **`/feedback` can include other sessions from the last 24h/7d and create a GitHub issue in a public repo.**
- **A BAA alone doesn't cover Claude Code** — ZDR must also be active per-org. **ZDR isn't in the standard Enterprise plan** and doesn't auto-apply to new orgs under the same account.
- **Commits from your own shell or the `!` shell escape bypass commit review entirely** — only Claude's Bash-tool commits are reviewed.
- **YAML security-pattern files silently no-op without PyYAML** (never installed) — use `.json`; check `~/.claude/security/log.txt`.
- **None of the security-guidance layers block writes/commits** — advisory only; guidance telling the reviewer to ignore a class doesn't suppress findings (extensions are additive). Limits truncate silently (8 KB / 50 rules / 1 KB).
- **MCP servers in the Anthropic Directory are not security-audited.**
- **Windows WebDAV / `\\*` paths bypass the permission system.**
- **Remote Control runs locally with no sandbox** — unlike cloud execution.


---

## Skills, hooks & commands

Reference for team setup and optimal day-to-day operation of Claude Code (commands, hooks, skills). Covers configuration precedence, sharing/governance, exact flags/paths/exit codes, and the pitfalls that silently break enforcement.

### Quick-start for a repo (first session)

Run these once when adopting a repo, then commit the shared config:

| Command | Purpose |
|---|---|
| `/init` | Generate a starter `CLAUDE.md`. Set env `CLAUDE_CODE_NEW_INIT=1` for an interactive flow that also walks through skills, hooks, and personal memory files. |
| `/memory` | Edit `CLAUDE.md` memory files; enable/disable and view auto-memory entries. |
| `/mcp` | Set up/manage MCP server connections + OAuth. |
| `/agents` | Manage subagent configurations. |
| `/permissions` (alias `/allowed-tools`) | Manage allow/ask/deny tool rules; manage working dirs; review recent auto-mode denials. |
| `/team-onboarding` | Generate a paste-ready onboarding guide from the past 30 days of sessions/commands/MCP usage (Pro/Max/Team/Enterprise also get a share link). |
| `/fewer-permission-prompts` (Skill) | Scan transcripts for common read-only Bash/MCP calls and write a prioritized allowlist into project `.claude/settings.json` (shared, committable). |

### Configuration scope & precedence (shared across hooks/skills/settings)

Settings resolve in this order; **later layers override earlier**:

```
user (~/.claude/settings.json)
  → project (.claude/settings.json)
    → local (.claude/settings.local.json)
      → managed policy settings   ← highest, admin-controlled
```

| Location | Scope | Shareable | Use for |
|---|---|---|---|
| `~/.claude/settings.json` | All your projects | No | Personal/all-project config |
| `.claude/settings.json` | Single project, committable | Yes | **Team-standard** hooks, permissions, skill overrides |
| `.claude/settings.local.json` | Single project, gitignored | No | Personal/experimental overrides |
| Managed policy settings | Org-wide, admin-controlled | Yes | Guardrails users cannot bypass |
| Plugin `hooks/hooks.json` | Active when plugin enabled | Yes | Cross-project distribution |
| Skill/agent frontmatter (`hooks:`) | Active while component active | Yes | Ephemeral, component-scoped hooks |

**Team rule:** commit team-standard hooks/permissions to `.claude/settings.json`; keep personal/experimental ones in `~/.claude/settings.json` or gitignored `.claude/settings.local.json` so they don't impose on the team.

## Slash commands

A slash command is recognized **only at the start of a message**; trailing text is passed as arguments. Type `/` to list, `/`+letters to filter. In docs, `<arg>` is required, `[arg]` optional. **Availability is conditional** on platform/plan/environment — a documented command may not appear in every `/` menu (e.g. `/desktop` macOS/Windows subscription only; `/upgrade` Pro/Max only; `/privacy-settings` Pro/Max only; Bedrock/Vertex wizards only with their env var set).

### Context & session management

- `/context [all]` — visualize context usage as a colored grid with optimization suggestions (context-heavy tools, memory bloat, capacity warnings). `all` expands the per-item breakdown.
- `/compact [instructions]` — summarize the conversation to free context **while continuing the same conversation**; optional focus instructions.
- `/clear [name]` (aliases `/reset`, `/new`) — start a fresh conversation with empty context (keeps project memory; previous kept in `/resume`). Use for a **new task**.
- `/btw <question>` — ask a side question without adding it to conversation history.
- `/rewind` (aliases `/checkpoint`, `/undo`) — rewind conversation and/or code to a checkpoint.
- `/resume`, `/goal [condition|clear]` (persistent goal across turns), `/plan [description]` (enter plan mode directly).

### Model, effort, cost

- `/model [model]` — switch model and **save as default** for new sessions; no arg opens picker, press `s` to switch for the current session only.
- `/effort [level|auto]` — levels `low`,`medium`,`high`,`xhigh`,`max`,`ultracode`; `max`/`ultracode` are **session-only** (don't persist). `ultracode` = xhigh reasoning + automatic workflow orchestration. `auto` resets to model default. Takes effect immediately.
- `/usage` (aliases `/cost`, `/stats`) — session cost, plan limits, activity; Pro/Max/Team/Enterprise add a breakdown by skill, subagent, plugin, MCP server.
- `/config [key=value ...]` (alias `/settings`) — open Settings or (v2.1.181+) set directly, e.g. `/config thinking=false`; (v2.1.182+) shorthand keys e.g. `/config theme=dark`, `/config model=sonnet`. Works in `-p` and Remote Control. `/config --help` lists every key.

### Review & quality

- `/code-review [low|medium|high|xhigh|max|ultra] [--fix] [--comment] [target]` — review current diff for correctness bugs + cleanups. `--fix` applies to working tree; `--comment` posts inline GitHub PR comments; `ultra` runs a deep cloud multi-agent review.
- `/review [PR]` — same engine, **read-only**, on a GitHub PR.
- `/security-review` — analyze pending branch changes for security vulnerabilities.
- `/simplify [target]` (v2.1.154+) — four review agents in parallel (reuse, simplification, efficiency, abstraction) applying fixes **without** hunting correctness bugs; earlier versions = `/code-review --fix`.
- `/diff` — review diff (chain `/diff` → `/code-review` → `/security-review` before shipping).
- Recommended ship chain: `/diff` → `/code-review` (or `/code-review ultra`) → `/security-review`.

### Large changes & parallelism

- `/batch <instruction>` (Skill, requires git repo) — decompose a large change into 5–30 independent units, spawning one **background subagent per unit in an isolated git worktree**; each implements, tests, and opens a PR.
- `/fork <directive>` (v2.1.161+) — spawn a forked background subagent inheriting the full conversation; result returns when finished. Before v2.1.161, `/fork` aliases `/branch`.
- `/branch [name]` — switch into a copy of the conversation.

### Working directories

- `/add-dir <path>` — add a working directory for file access. **Does NOT load that dir's `.claude/` config**, EXCEPT `.claude/skills/` (which IS loaded). Commands/output-styles from added dirs are not loaded.
- `/cd <path>` (v2.1.169+) — move session to a new dir; prompt cache preserved (new `CLAUDE.md` appended as a message instead of rebuilding the system prompt); session relocated to the new dir's project storage. Restrict via `Cd` permission rules. Earlier versions: `Unknown command: /cd`.

### Plugins, skills, hooks management

- `/plugin [list|install|enable|disable]` — manage plugins.
- `/reload-plugins [--force]` — reload active plugins without restart; if the reload would change loaded MCP tools and invalidate the prompt cache it **warns and skips unless `--force`**.
- `/reload-skills` (v2.1.152+) — re-scan skill/command directories so on-disk changes apply without restart.
- `/skills` — list skills; `t` sort by token count, `Space` hide a skill from Claude or `/` menu, `Enter` to save (writes `skillOverrides`).
- `/hooks` — read-only browser of configured hooks by event with source (User/Project/Local/Plugin/Session/Built-in) and details. To add/modify hooks, edit settings JSON or ask Claude.
- `/mcp [reconnect <server> | enable | disable [<server>|all]]` — manage MCP connections/OAuth. MCP prompts appear as commands: `/mcp__<server>__<prompt>`.

### Diagnostics & insights

- `/doctor` — diagnose installation/settings (`f` to have Claude fix); shows how many skill descriptions are shortened/dropped.
- `/debug [description]` — enable debug logging mid-session (only captures from the point run; full-session debug requires launching `claude --debug`).
- `/insights` — report on sessions (project areas, interaction patterns, friction points).
- Removed: `/pr-comments` (v2.1.91 — ask Claude directly), `/vim` (v2.1.92 — use `/config` → Editor mode).

## Hooks

Hooks run deterministic logic at lifecycle events. Configured in a single `hooks` object in a settings file; each **event name is a key** (events are siblings, not separate `hooks` objects). An entry has a `matcher` and a `hooks` array; each item has `type` (default `command`) and a handler. Reference reflects hooks **v2.1.139+** (`terminalSequence` added v2.1.141+), 30+ events.

### Handler types

| `type` | Behavior |
|---|---|
| `command` | Shell script, JSON on stdin. **Shell form** (no `args`) supports pipes/`&&`/globs; **exec form** (`"args": []`) spawns directly with no shell tokenization (avoids quoting/profile-sourcing problems). |
| `http` | POST same JSON to `url`; block via 2xx body with `hookSpecificOutput` (HTTP status alone can't block). Header `$VAR`/`${VAR}` interpolation works **only** for vars in `allowedEnvVars`. |
| `mcp_tool` | Call a tool on a connected MCP server. |
| `prompt` | Single-turn yes/no LLM eval (Haiku by default). Use when hook input alone suffices. |
| `agent` | Experimental multi-turn subagent with tool access (up to 50 tool-use turns). Use only when verification must inspect actual files (e.g. run tests before a Stop). |

`async:true` = fire-and-forget side effects. `asyncRewake:true` = runs in background and wakes Claude on exit 2 (stderr/stdout shown as a system reminder on the next model request) — for background monitors that report back.

### Events (30+)

`SessionStart, Setup, UserPromptSubmit, UserPromptExpansion, PreToolUse, PermissionRequest, PermissionDenied, PostToolUse, PostToolUseFailure, PostToolBatch, Notification, MessageDisplay, SubagentStart, SubagentStop, TaskCreated, TaskCompleted, Stop, StopFailure, TeammateIdle, InstructionsLoaded, ConfigChange, CwdChanged, FileChanged, WorktreeCreate, WorktreeRemove, PreCompact, PostCompact, Elicitation, ElicitationResult, SessionEnd`. **Event names are case-sensitive** (`PreToolUse`, not `preToolUse`).

Notable events:
- `ConfigChange` — fires on config-file change; matcher by source (`user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`). Block with exit 2 or `{"decision":"block"}` — useful for compliance audit logging.
- `InstructionsLoaded` — fires when `CLAUDE.md` or `.claude/rules/*.md` loads; matchers `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`.
- `FileChanged` — matcher values split into **literal filenames, not regex**.

### Matchers

- Tool-name events (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`) match the tool name. MCP tools are `mcp__<server>__<tool>` — match e.g. `mcp__github__.*` or cross-server `mcp__.*__write.*`.
- Syntax: `"*"`/`""`/omitted = all; value with only letters/digits/`_`/`|` = exact or pipe-separated list (`Bash`, `Edit|Write`); **any other char makes it a JS regex** (`^Notebook`, `mcp__memory__.*`).
- **Matchers are case-sensitive** (mismatched case silently never fires).
- `SessionStart` matches `startup`/`resume`/`clear`/`compact`; `PreCompact`/`PostCompact` match `manual`/`auto`. `UserPromptSubmit`, `PostToolBatch`, `Stop`, `CwdChanged` and several others have **no matcher** and always fire.

### The `if` filter (tool events only, v2.1.85+)

Filters by tool name AND arguments using permission-rule syntax (`Bash(git *)`, `Edit(*.ts)`); only spawns the hook process on match (reduces overhead). Checks subcommands inside `$()`/backticks, strips `FOO=bar` assignments. **Fails open** — runs the hook anyway on unparseable commands, so it is best-effort, NOT a security control. Ignored entirely before v2.1.85. Adding `if` to a **non-tool event prevents the hook from running at all**.

### Exit codes (command/agent hooks)

| Exit | Meaning |
|---|---|
| `0` | Success. stdout JSON parsed for decisions. **Plain (non-JSON) stdout added as context ONLY for `SessionStart`/`UserPromptSubmit`/`UserPromptExpansion`**; ignored elsewhere. |
| `2` | **Block.** stdout/JSON ignored; stderr fed back to Claude as feedback. |
| any other (incl. `1`) | **Non-blocking** — execution continues; first stderr line shown in transcript, full stderr to debug log. |

**Use exit 2 to block; exit 1 does NOT block** (the most common policy-enforcement mistake). **Never mix exit 2 with JSON** — Claude Code ignores the JSON when you exit 2.

Where exit 2 actually blocks: `PreToolUse, PermissionRequest, UserPromptSubmit, UserPromptExpansion, Stop, SubagentStop, TeammateIdle, TaskCreated, TaskCompleted, ConfigChange, PreCompact, WorktreeCreate`. Exit 2 is **non-blocking** (stderr shown only) on `PostToolUse, PostToolUseFailure, PermissionDenied, StopFailure, SessionStart, Setup, Notification, SessionEnd` — the action already happened.

### Structured JSON output (exit 0)

Control fields: `continue` (false stops Claude), `stopReason`, `suppressOutput`, `systemMessage`, `terminalSequence`, `decision`, `reason`, and `hookSpecificOutput` (`hookEventName`, `additionalContext`, `permissionDecision`, `updatedInput`, `updatedToolOutput`, `sessionTitle`, `watchPaths`, `reloadSkills`, `action`, `content`).
- `PreToolUse` deny: `hookSpecificOutput.permissionDecision:"deny"` + `permissionDecisionReason`.
- `PermissionRequest` auto-approve + rewrite args: `decision.behavior:"allow"` + `updatedInput`.
- `PostToolUse` rewrite results: `updatedToolOutput`; inject `additionalContext` (cannot undo — tool already ran).

### Permission decisions & enforcement

`PreToolUse` `permissionDecision` values: `allow` (skip interactive prompt, but deny/ask rules incl. managed deny lists still apply), `deny` (cancel + reason to Claude), `ask` (show prompt), `defer` (only `-p` mode, preserves call for Agent SDK resume).

**Key enforcement facts:**
- **PreToolUse exit 0 does NOT approve** the call — normal permission flow still runs. Only JSON `permissionDecision:"allow"` skips the prompt.
- **PreToolUse fires BEFORE any permission-mode check.** A `deny` blocks the tool **even in `bypassPermissions` mode or with `--dangerously-skip-permissions`** — this is the only way to enforce policy users cannot bypass.
- **Hooks tighten but never loosen.** A hook `allow` cannot override deny rules from any scope (incl. managed).
- Multiple matching hooks run **in parallel to completion**, then merge; identical commands auto-deduplicated. For permission decisions, **most restrictive wins: deny > defer > ask > allow**. `additionalContext` kept from every hook.
- A `deny` from one hook does NOT stop sibling hooks executing (their side effects still happen).
- **`PermissionRequest` hooks do NOT fire in `-p` non-interactive mode** — use `PreToolUse` for automated permission logic there.

### Stdin input & env

Every hook gets stdin JSON with `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name` (+ event-specific data: `PreToolUse` adds `tool_name`/`tool_input`; `UserPromptSubmit` adds `prompt`; `SessionStart` adds `source`). Tool events add `effort.level`; subagent context adds `agent_id`/`agent_type`.

Env vars: `CLAUDE_PROJECT_DIR` (all), `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA` (plugin hooks), `CLAUDE_ENV_FILE` (`SessionStart`/`Setup`/`CwdChanged`/`FileChanged` — **append `export` lines to persist env** for subsequent Bash; run as a preamble before each Bash command, works with direnv), `CLAUDE_EFFORT` (tool-context: low/medium/high/xhigh/max), `CLAUDE_CODE_REMOTE` (`"true"` in web).

Path placeholders in `command`/`args`: `${CLAUDE_PROJECT_DIR}` (project root), `${CLAUDE_PLUGIN_ROOT}` (plugin dir, **changes on update**), `${CLAUDE_PLUGIN_DATA}` (persistent, **survives updates** — use for state).

### Timeouts

Defaults: `command`/`http`/`mcp_tool` = 600s (lowered to **30s for `UserPromptSubmit`**, **10s for `MessageDisplay`**); `prompt` = 30s; `agent` = 60s. Override per-hook with `timeout` (seconds).

### Frontmatter-scoped & plugin hooks

Hooks can live in skill/agent frontmatter under a `hooks:` key, scoped to the component lifecycle; `once:true` (frontmatter only) runs once per session then removes the hook. **For subagents, `Stop` hooks auto-convert to `SubagentStop`** (a plain `Stop` hook won't fire inside a subagent). Plugins ship hooks in `hooks/hooks.json`, active when enabled.

### Org governance

- `allowManagedHooksOnly` — blocks user/project/plugin hooks; hooks from plugins listed in `enabledPlugins` bypass this (force-enable vetted plugin hooks).
- Managed-policy hooks cannot be disabled by user/project settings; only managed-level `disableAllHooks:true` disables them.
- `disableAllHooks:true` respects precedence — managed-level can't be overridden by user/project.
- `terminalSequence` only allows OSC `0,1,2,9,99,777,BEL`; CSI, OSC 8 hyperlinks, OSC 52 clipboard, OSC 1337 are blocked.

### Stop-hook loop protection

Claude overrides a `Stop` hook after it blocks **8 times in a row** without progress. Scripts should parse `stop_hook_active` and exit 0 when true. Raise cap via env `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`. `Stop` fires whenever Claude finishes responding (not only at task completion); doesn't fire on user interrupts; API errors fire `StopFailure` instead.

### Recommended hook patterns

- **Auto-format on edit:** `PostToolUse` matcher `Edit|Write`, extract `.tool_input.file_path` via `jq`, run formatter (e.g. `prettier --write`).
- **Re-inject context after compaction:** `SessionStart` hook with `compact` matcher writing to stdout (for every-session context prefer `CLAUDE.md`).
- **Persist env:** `SessionStart` hook appending `export` lines to `$CLAUDE_ENV_FILE`.
- **Audit:** `ConfigChange` hook appending to an audit log, and/or a `PostToolUse` Bash hook or once-per-turn `Stop` hook scanning `git status --porcelain` (file changes via Bash are missed by edit-tool-only matchers).
- **Team guardrails:** `PreToolUse` deny (exit 2 or `permissionDecision:"deny"`) on dangerous commands / protected-file edits in **managed policy settings**.
- **Narrow auto-approve:** keep `PermissionRequest` auto-approve matchers tight (e.g. `ExitPlanMode`); `.*`/empty auto-approves everything incl. file writes and shell.
- **Centralized audit:** `http` hook to a shared service, token via `allowedEnvVars` (don't hardcode secrets).
- **Scope to argument shape:** use `if` (e.g. `Bash(git *)`) to avoid spawning on every Bash call.
- **Diagnostics to stderr**, keep stdout clean for JSON; use exec form (`"args": []`) to avoid shell/profile issues. Hook scripts must be `chmod +x` on macOS/Linux.

## Skills

Skills are model- or user-invocable instruction packets (`SKILL.md`). Bundled skills (`/code-review`, `/batch`, `/debug`, `/loop`, `/claude-api`, `/run`, `/verify`, etc.) are prompt-based, available every session unless `disableBundledSkills` is set. A few built-ins (`/init`, `/review`, `/security-review`) are also exposed via the Skill tool; `/compact` and most others are not.

### File locations, applicability & precedence

| Level | Path | Applies to |
|---|---|---|
| Enterprise | Managed settings | All org users |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project (committable) |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled |

**Precedence for same-named skills:** enterprise > personal > project; any level overrides a bundled skill of the same name. Plugin skills use `plugin-name:skill-name` namespace and can't conflict. A skill and a `.claude/commands/` command with the same name both create `/name`, but **the skill takes precedence**.

- **Project skills load from `.claude/skills/` in the starting dir AND every parent up to repo root.** Nested `.claude/skills/` below the working dir load on demand when Claude reads/edits files there (monorepo); on name clash they are directory-qualified (e.g. `apps/web:deploy`, invoked `/apps/web:deploy`; `/deploy` runs the project-root variant).
- **Command name comes from the DIRECTORY name** (`.claude/skills/deploy-staging/` → `/deploy-staging`), not frontmatter `name` (which only sets the display label), **except** a plugin-root `SKILL.md` where `name` (fallback: plugin dir name) sets the command.
- `--add-dir`/`/add-dir`: `.claude/skills/` in an added dir **IS** loaded. `permissions.additionalDirectories` grants file access only and does **NOT** load skills.

### Distribution by scope

Commit `.claude/skills/` for project skills; bundle a `skills/` directory in a plugin for cross-project; deploy org-wide via managed settings. Adding `.claude-plugin/plugin.json` to a skill folder loads it as a plugin `<name>@skills-dir` that can bundle agents/hooks/MCP servers (requires accepting the workspace trust dialog in a project's `.claude/skills/`).

### Frontmatter fields (all optional; only `description` recommended)

`name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`.

- **`description` + `when_to_use`** combined truncated at **1,536 chars** in the listing — put the key use case first; write keywords users naturally say. Cap configurable via `maxSkillDescriptionChars`.
- **`disable-model-invocation:true`** — only the user invokes; description **removed from context entirely** (Claude can't auto-match it) AND blocks preloading into subagents. Use for side-effecting workflows (`/commit`, `/deploy`, `/send-slack-message`).
- **`user-invocable:false`** — only Claude invokes; hidden from `/` menu; **description still always in context**. Controls menu visibility only, **NOT** Skill-tool access — to block programmatic invocation use `disable-model-invocation:true`. Use for background knowledge that isn't a meaningful user action.
- **`allowed-tools`** — grants listed tools without per-use approval while active; does **NOT** restrict others (all tools remain callable, permission settings still govern). Space/comma string or YAML list; supports patterns (`Bash(git add *)`). For project skills, takes effect **only after accepting the workspace trust dialog**.
- **`disallowed-tools`** — removes tools from Claude's pool while active; clears on the user's next message.
- **`context:fork`** — run in a forked subagent; `agent` selects the type (`Explore`, `Plan`, `general-purpose`, or custom from `.claude/agents/`; default `general-purpose`). `Explore`/`Plan` skip `CLAUDE.md` and git status (use `agent: Explore` for cheap read-only forks). Only useful for skills with an explicit task.
- **`paths`** — glob patterns (comma-string or YAML list) limiting automatic activation to matching files (same format as path-specific memory rules).

### Substitutions in skill bodies

`$ARGUMENTS` (all), `$ARGUMENTS[N]`/`$N` (0-based positional), `$name` (declared in `arguments`), `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}` (dir containing `SKILL.md` — **use for bundled script paths** so they resolve regardless of cwd). If `$ARGUMENTS` is absent but args are passed, Claude appends `ARGUMENTS: <value>`. `!`command`` shell injection fires only when `!` is at line start or after whitespace (`KEY=!`cmd`` is literal); output is inserted as plain text and not re-scanned.

### Authoring for cost & triggering

- Keep the **`SKILL.md` body concise, under 500 lines** — once invoked it stays in context across turns, so every line is recurring token cost. State *what to do*, not how/why.
- Move large reference docs/API specs/examples into **separate supporting files** referenced from `SKILL.md` so they load only when needed.
- **Claude does NOT re-read `SKILL.md` on later turns** — one-time/step language can be ignored. After compaction only the **first 5,000 tokens per skill** survive (re-attached after the summary, sharing a **combined 25,000-token budget** filled most-recently-invoked first; older skills can be dropped entirely).

### Listing budget & overrides

- Skill **description listing budget = 1% of context window** (raise via `skillListingBudgetFraction`, e.g. `0.02`, or `SLASH_COMMAND_TOOL_CHAR_BUDGET` env for a fixed char count). `/doctor` shows how many descriptions are shortened/dropped.
- **`skillOverrides`** (`settings.json` / `.claude/settings.local.json`) values: `on` (name+description, in menu), `name-only` (name only, in menu), `user-invocable-only` (hidden from Claude, in menu), `off` (hidden everywhere). Absent = `on`. `/skills` writes it (Space cycles, Enter saves). **Plugin skills NOT affected.** Free budget by setting low-priority skills to `name-only`.
- **Permission rules:** deny the `Skill` tool to disable all skills; `Skill(name)` exact, `Skill(name *)` prefix-with-args; allow/deny specific skills in `/permissions`.

### Governance & live changes

- **`disableSkillShellExecution:true`** — disables `!`command`` injection for user/project/plugin/added-dir skills (replaced with `[shell command execution disabled by policy]`); **bundled and managed skills unaffected**. Most useful in managed settings where users can't override.
- **`disableBundledSkills`** — disables bundled skills. Set both in managed settings to govern teams.
- **Live change detection:** adding/editing/removing a `SKILL.md` under already-watched dirs applies within the session. Creating a **NEW top-level skills dir** that didn't exist at session start requires restart. Covers `SKILL.md` text only — plugin hooks/`.mcp.json`/agents/output-styles need `/reload-plugins`.

### Skill workflow helpers

- `/run-skill-generator` — run once per project (and when build/launch changes) to record a reusable launch recipe at `.claude/skills/run-<name>/` so `/run`, `/verify`, and other agents stop rediscovering it.
- Evaluate skills with a **baseline comparison**: run realistic prompts in fresh sessions with the skill enabled vs disabled (via `skillOverrides off`), checking both that it triggers AND that output is correct (these are separate — triggering only proves Claude found it). The `skill-creator` plugin automates the loop (`evals.json`, `grading.json`, `benchmark.json`).
- If a skill stops influencing behavior mid-session, the content is usually still present — strengthen the description/instructions, use hooks for deterministic enforcement, or re-invoke it (especially after compaction).

### Gotchas

**Commands**
- `/add-dir` does NOT load the added dir's `.claude/` config (config isn't discovered from added dirs); its `CLAUDE.md` is not loaded unless `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`. (Its `.claude/skills/` IS the one exception.)
- Switching `/model` mid-conversation with prior output re-reads full history **without cached context** (costs tokens); the picker confirms first.
- `/reload-plugins` silently skips when the change would alter loaded MCP tools / invalidate the prompt cache — pass `--force`.
- Effort `max`/`ultracode` are session-only, never persist.
- Version-gated commands error on older versions (`/cd` needs v2.1.169+ → `Unknown command: /cd`; also `/run`, `/verify`, `/simplify`, `/fork`). Availability also varies by platform/plan/env.
- `/debug` only captures from when it's run; full-session debug needs `claude --debug`.

**Hooks**
- **exit 1 does NOT block** — only exit 2 blocks. Mixing exit 2 with JSON silently fails (JSON ignored).
- **`if` filter and the command itself are not security boundaries** — `if` fails open on unparseable commands; enforce hard allow/deny via the permission system (`PreToolUse` deny).
- **Hook `allow` cannot override deny rules** from any scope (incl. managed); hooks only tighten.
- **PreToolUse exit 0 does NOT approve** — normal permission flow still runs.
- Event names and matchers are **case-sensitive** — wrong case silently never fires.
- **Edit-tool-only matchers miss files changed via Bash** — add a Bash matcher or a `Stop`-hook tree scan for full coverage.
- For **subagents, `Stop` auto-converts to `SubagentStop`** — a plain `Stop` hook won't fire as expected.
- **`PermissionRequest` hooks don't fire in `-p` mode** — use `PreToolUse`.
- **Parallel hooks returning `updatedInput` race** — last to finish wins non-deterministically; never have two hooks rewrite the same tool's input.
- A `deny` from one hook does NOT suppress sibling side effects (the log still gets written).
- A shell profile (`~/.bashrc`/`~/.zshrc`/`BASH_ENV`) that prints unconditional output **prepends garbage to stdout, breaking JSON** — guard echoes with `if [[ $- == *i* ]]`, or use exec form.
- `${CLAUDE_PLUGIN_ROOT}` changes on every update — use `${CLAUDE_PLUGIN_DATA}` for persistent state.
- HTTP env interpolation silently fails unless the var is in `allowedEnvVars`.
- `disableAllHooks:true` in user/project does NOT stop managed-settings hooks (set it at managed level too). Managed deny still beats everything.
- Adding `if` to a non-tool event prevents the hook from running entirely; `if` is ignored before v2.1.85.
- `FileChanged` matcher is literal filenames, not regex.
- If `/hooks` shows nothing after editing settings: the file watcher may have missed it (restart), or invalid JSON (no trailing commas/comments), or wrong file location.
- macOS `osascript` notifications fail silently without Script Editor notification permission.
- Hook scripts must be `chmod +x` or they won't run.

**Skills**
- Command name = **directory name**, not frontmatter `name` (renaming `name` won't change what you type; plugin-root `SKILL.md` excepted).
- **`disable-model-invocation:true` removes the description from context** (Claude can't match it) and blocks subagent preloading — not a soft preference.
- **`user-invocable:false` only hides from the `/` menu**, NOT Skill-tool access.
- **Malformed frontmatter YAML loads the body with EMPTY metadata** — `/skill-name` still works but Claude has no description to auto-match (use `--debug` to see the parse error).
- Many skills can **silently shorten/drop descriptions** (1% budget), stripping the keywords Claude needs to match — a likely cause of non-triggering. Check `/doctor`.
- **`permissions.additionalDirectories` does NOT load skills** — only `--add-dir`/`/add-dir` does.
- Creating a **brand-new top-level skills dir mid-session** isn't watched until restart.
- **Seeing a skill trigger only proves Claude found it**, not that output is correct — measure invocation accuracy and output quality separately.
- A checked-in project skill's `allowed-tools` can grant itself **broad tool access** — review project skills before accepting the workspace trust dialog.
- **`context:fork` with a guidelines-only (no explicit task) skill** gives the subagent no actionable prompt and returns nothing useful.


---

## Subagents & agent teams

Claude Code offers four ways to run work in more than one context. Choose by **who coordinates** and **whether workers must talk to each other**:

| Approach | Coordinator | Worker isolation | Reports to | Workers talk to each other? |
|----------|-------------|------------------|------------|------------------------------|
| **Subagents** | Claude, in one conversation | Fresh isolated context | The spawning conversation (summary only) | No |
| **Agent teams** | Claude supervising a group (a fixed "lead") | Shared task list, **no** worktree isolation | Shared task list + direct messages | Yes (1:1 messages) |
| **Agent view** (`claude agents`) | You | Git worktree per session | Only to you | No |
| **Dynamic workflows** | A script | Varies | The workflow run | Per design |

Quick selection rules:
- **Subagent** — a side task that would flood the main conversation with search results, logs, or file contents you won't reference again; it runs in its own context and returns only a summary.
- **Fork** — a side task that needs your *full* conversation context rather than a fresh start (or to try several approaches in parallel from one starting point).
- **Agent teams** — genuinely parallelizable work where Claude should coordinate peers (research, parallel review, independent modules, cross-layer changes).
- **Agent view** — several independent tasks you hand off and check on at a glance (a bug fix, a PR review, a flaky-test investigation as three rows), stepping in only when one needs you.
- **Dynamic workflows** — a job that outgrows manual coordination or needs cross-verification: codebase-wide audits, large migrations (e.g. 500 files), cross-checked research, multi-angle planning.
- **Main conversation (no delegation)** — iterative back-and-forth, significant context shared across phases, a quick targeted change, or when latency matters.
- To involve a non-Claude tool (e.g. Codex) in any approach, expose it to Claude as an **MCP server**.

`/tasks` lists what's running in the *current* session (check/attach/stop). `/workflows` lists dynamic-workflow runs, the phase each is in, and how many agents finished. A background bash command runs a shell command without blocking but does **not** spawn an agent.

---

## Subagents

Subagents are Markdown files with YAML frontmatter; the body becomes the subagent's **system prompt**. Only `name` and `description` are required. Each subagent starts with **fresh isolated context** — it does NOT see conversation history, prior skills, or files already read. Its initial context = own system prompt + env details + delegation task + CLAUDE.md/memory hierarchy + git-status snapshot + preloaded skills (Explore/Plan omit CLAUDE.md and git).

### Definition scopes & precedence

Highest to lowest priority; on name collision the higher wins:

| Priority | Scope | Location |
|----------|-------|----------|
| 1 | Managed settings (org-wide) | `.claude/agents/` in managed settings dir |
| 2 | `--agents` CLI flag (session-only, not saved to disk) | inline JSON |
| 3 | Project | `.claude/agents/` |
| 4 | User (all projects) | `~/.claude/agents/` |
| 5 | Plugin | plugin `agents/` directory |

- **Project discovery** walks up from cwd: every `.claude/agents/` between cwd and repo root is scanned. When nested dirs define the same `name`, the definition **closest to cwd wins** (v2.1.178+). Dirs added with `--add-dir` are also scanned (their `.claude/agents/` loads alongside project subagents).
- `.claude/agents/` and `~/.claude/agents/` are scanned **recursively**; subfolders do NOT affect identity — **identity is the `name` frontmatter only**.
- **Plugin** subfolders DO scope the identifier: `agents/review/security.md` in plugin `my-plugin` → `my-plugin:review:security`.
- **Check project subagents into version control** (`.claude/agents/`) so the team shares and improves them — the recommended way to distribute codebase-specific subagents. For **org-wide standard subagents**, deploy via managed settings so they take precedence.
- Files on disk load **at session start** (restart required to apply edits — no hot reload). Subagents created/edited via the **`/agents`** interface take effect immediately.

### Frontmatter fields

- **`description`** — Claude routes by this. Write detailed descriptions; include phrases like "use proactively" to encourage auto-delegation. Design **focused single-task** subagents; overlap causes mis-delegation.
- **`tools`** — allowlist (inherits all if omitted). **`disallowedTools`** — denylist. If both set, `disallowedTools` applies first, then `tools` resolves against the remainder; a tool in both is removed. Limit each subagent to the minimum tools needed (e.g. reviewers get `disallowedTools: Write, Edit` to inherit everything except writes). MCP patterns accepted: `mcp__<server>` / `mcp__<server>__*` grant/remove a server's tools; `mcp__*` in `disallowedTools` removes all MCP tools.
- **`model`** — `sonnet` | `opus` | `haiku` | `fable` | full model ID (e.g. `claude-opus-4-8`) | `inherit` (default). Route cheap/verbose work to `model: haiku`; reserve `sonnet`/`opus` for analysis quality. **Resolution order:** (1) `CLAUDE_CODE_SUBAGENT_MODEL` env var, (2) per-invocation `model` param, (3) frontmatter, (4) main conversation's model.
- **`permissionMode`** — `default` | `acceptEdits` | `auto` | `dontAsk` | `bypassPermissions` | `plan`. If parent is `bypassPermissions` or `acceptEdits`, that takes precedence and overrides the subagent; if parent is `auto`, the subagent inherits `auto` and its `permissionMode` is ignored.
- **`mcpServers`** — a string referencing an already-configured server (shares the parent connection) OR an inline definition (connected at start, disconnected at finish). **Define inline to keep the server's tool descriptions out of the main conversation context** — only the subagent pays the cost.
- **`skills`** — preloads FULL skill content (not just description) at startup. Subagents can still invoke unlisted skills via the `Skill` tool unless `Skill` is removed. Cannot preload skills with `disable-model-invocation: true`.
- **`memory`** — `user` (`~/.claude/agent-memory/<name>/`), `project` (`.claude/agent-memory/<name>/`, version-controlled — **recommended default**), or `local` (`.claude/agent-memory-local/<name>/`, not VC'd). When enabled, the first 200 lines or 25KB of MEMORY.md (whichever first) is injected and Read/Write/Edit are auto-enabled. Add explicit body instructions to consult/update MEMORY.md before and after tasks to accumulate institutional knowledge.
- **`hooks`** — run only while that subagent is active; frontmatter `Stop` auto-converts to `SubagentStop` at runtime. (settings.json supports `SubagentStart`/`SubagentStop` events with matcher = agent type name for main-session lifecycle hooks.)
- **`isolation: worktree`** — runs the subagent in a temporary git worktree branched (by default) from the **default branch**, not parent HEAD; auto-cleaned if no changes made.

The `--agents` JSON flag accepts: `description`, `prompt` (= system prompt), `tools`, `disallowedTools`, `model`, `permissionMode`, `mcpServers`, `hooks`, `maxTurns`, `skills`, `initialPrompt`, `memory`, `effort`, `background`, `isolation`, `color`.

### Built-in subagents

- **Explore** — Haiku, read-only, file/code search.
- **Plan** — inherits model, read-only, plan-mode research.
- **general-purpose** — inherits model, all tools.
- Helpers: **statusline-setup** (Sonnet), **claude-code-guide** (Haiku).
- **Explore and Plan SKIP CLAUDE.md and git status** to stay fast/cheap (every other built-in and custom subagent loads both); there is **no** field or setting to change this. Restate critical rules (e.g. "ignore vendor/") in the delegation prompt when delegating to them.
- Explore/Plan are **one-shot**, return no agent ID, and **cannot be resumed** — use general-purpose or a custom subagent to continue work.
- Block a built-in via `permissions.deny: ["Agent(Explore)"]` (format `Agent(subagent-name)`) or CLI `--disallowedTools "Agent(Explore)"`. Deny the `Agent` tool itself to block all delegation. In non-interactive mode / Agent SDK, set `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` to remove all built-ins.

### Invoking, resuming, nesting

- **`/agents`** opens a panel: **Running** tab (live subagents) + **Library** tab (create/edit). Separate from `claude agents`.
- Mention `@"name (agent)"` to **guarantee** a specific subagent runs; use natural-language naming to let Claude decide.
- Claude resumes a subagent via the `SendMessage` tool with its agent ID/name; a stopped subagent receiving `SendMessage` auto-resumes in the background.
- **Nesting** (v2.1.172+): subagents can spawn nested subagents (same scopes). Depth limit **fixed at 5** (not configurable); a depth-5 subagent gets no `Agent` tool. A fork cannot spawn a fork.
- `Agent` was renamed from `Task` in v2.1.63; `Task(...)` still works as an alias. In a `--agent` main thread, `Agent(worker, researcher)` in `tools` allowlists which subagent types it may spawn; bare `Agent` = spawn any; omitting `Agent` = spawn none (the parenthesized list is ignored inside a non-main subagent).
- `--agent <name>` runs the **whole session** as that subagent — its system prompt fully replaces the default Claude Code system prompt (like `--system-prompt`); CLAUDE.md/project memory still load. Set `agent` in `.claude/settings.json` for a per-project default; the CLI flag overrides it.
- Tools never available to subagents even if listed: `AskUserQuestion`, `EnterPlanMode`, `ScheduleWakeup`, `WaitForMcpServers`, `ExitPlanMode` (unless `permissionMode: plan`).
- Background subagent permission prompts (v2.1.186+) surface in the main session naming the subagent (approve, or Esc denies that one tool call without stopping it). Before v2.1.186, background subagents auto-denied any prompting tool call.
- **Forks:** `/fork <directive>` inherits the entire conversation (system prompt, tools, model, message history) instead of starting fresh; tool calls stay isolated and only the final result returns. Cheaper than a fresh subagent — the first request **reuses the parent's prompt cache** (named subagents use a separate cache). Requires v2.1.117+; enabled by default from v2.1.161 (earlier needs `CLAUDE_CODE_FORK_SUBAGENT=1`). A fork cannot spawn another fork.
- **`/btw`** answers a quick question with full conversation context but no tool access, and the answer is discarded — cheaper than spawning a subagent.

### Hooks & conditional gating

Use **`PreToolUse` hooks** (exit code 2 to block) for tool gating finer than the `tools` field allows — e.g. allow read-only SQL while blocking INSERT/UPDATE/DELETE. MCP restrictions (`--strict-mcp-config`, `--bare`, enterprise managed MCP, `allowedMcpServers`/`deniedMcpServers`) cover servers in subagent frontmatter as of v2.1.153.

### Storage & context

- Transcripts: `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` — persist independently of the main conversation (unaffected by main compaction); cleaned per `cleanupPeriodDays` (default 30 days).
- Subagents **auto-compact** using the same logic as the main conversation; `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` applies. `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` disables all background tasks.

---

## Agent teams (experimental)

A **lead** Claude supervises a group of teammates that share a task list and message each other directly.

### Enabling & display mode

- **Disabled by default.** Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS="1"` (in `settings.json` `env` block or shell). Without it, no team forms, no team dirs are written, and Claude silently won't spawn teammates.
- **`teammateMode`** in `~/.claude/settings.json`: `"in-process"` (default — any terminal, no setup), `"auto"`, `"tmux"`, `"iterm2"` (v2.1.186+). Per-session override: `claude --teammate-mode auto`.
  - `"auto"` enables split panes only inside tmux or iTerm2, else falls back to in-process. `"tmux"` forces split-pane (auto-detects tmux vs iTerm2). `"iterm2"` requires the `it2` CLI.
  - **Split-pane requires tmux or iTerm2 + `it2` CLI**; NOT supported in VS Code integrated terminal, Windows Terminal, or Ghostty. iTerm2 needs Python API enabled (Settings → General → Magic → Enable Python API).
  - Before v2.1.179 the default was `"auto"`; upgraded sessions now stay single-terminal unless mode is set explicitly.

### State & config files

- Team config: `~/.claude/teams/{team-name}/config.json` (removed when session ends). Task list: `~/.claude/tasks/{team-name}/` (persists locally, never uploaded; retention per `cleanupPeriodDays`). **`team-name` = `"session-"` + first 8 chars of session ID.**
- **Do NOT hand-edit or pre-author `config.json`** — it holds runtime state (session IDs, tmux pane IDs) and is overwritten on next state update. There is **NO project-level team config** (`.claude/teams/teams.json` is an ordinary file, not config).
- As of v2.1.178 spawning needs no setup step and cleanup is automatic on exit. `TeamCreate`/`TeamDelete` tools no longer exist; the Agent tool's `team_name` input is accepted-but-ignored, and `team_name` in hook payloads is deprecated/session-derived.

### Teammate context, permissions, model

- Teammates load the **same project context** as a regular session (CLAUDE.md, MCP servers, skills) plus the spawn prompt; **the lead's conversation history does NOT carry over** — put all task-specific detail in the spawn prompt (files, scope, tech context, required output format like severity ratings).
- Teammates can use **subagent definitions** from any scope by name (honoring that definition's `tools` allowlist and `model`); the body is **appended** to the teammate's system prompt. **`skills` and `mcpServers` frontmatter are ignored** when a definition runs as a teammate (only `tools` and `model` carry over) — teammates load skills/MCP from project and user settings instead. `SendMessage` and task-management tools are always available regardless of `tools`.
- Teammates start with the **lead's permission settings**; teammate permission requests **bubble up to the lead** — pre-approve common operations before spawning. Per-teammate modes can be changed after spawning but not set per-teammate at spawn time.
- Teammates **don't inherit the lead's `/model`**. Set "Default teammate model" in `/config` (choose "Default (leader's model)" to follow the lead), or specify per-spawn (e.g. "Use Sonnet for each teammate"). The lead assigns teammate names at spawn — tell it what to name each for predictable references.

### Tasks, plan gating, quality hooks

- Task states: **pending, in progress, completed**. Tasks can depend on others; a pending task with unresolved dependencies can't be claimed until they complete. Claiming uses **file locking** to prevent races.
- **Plan approval:** ask the lead to "Require plan approval before they make any changes" — teammate works read-only in plan mode until the lead approves (the lead approves autonomously; influence via prompt criteria, e.g. "only approve plans that include test coverage").
- **Quality-gate hooks (all use exit code 2 to block-and-feedback):** `TeammateIdle` (runs before a teammate goes idle; keeps it working), `TaskCreated` (prevents creation), `TaskCompleted` (prevents premature completion).

### In-process panel controls

Up/down arrows select a teammate; **Enter** opens its transcript to message it; **Escape** interrupts its current turn; **x** stops a selected teammate; **Ctrl+T** toggles the task list. As of v2.1.181 an idle teammate's row **hides after 30 seconds** and reappears on its next turn — it stays running and addressable while hidden (message it by name to bring it back). There is **no broadcast** — one message per recipient.

### Team setup best practices

- **Start with 3-5 teammates;** scale up only when work genuinely parallelizes — three focused teammates often beat five scattered ones.
- **Size ~5-6 tasks per teammate** (15 independent tasks → 3 teammates). Each task = a self-contained unit with a clear deliverable (a function, a test file, a review) — too small wastes coordination overhead, too large risks long unchecked work.
- **No worktree isolation** — assign each teammate a **distinct, non-overlapping file set**; two teammates editing the same file cause overwrites. Use a `CLAUDE.md` in the working directory for shared project guidance (every teammate reads it normally).
- **Parallel code review:** give each teammate a distinct non-overlapping lens (security / performance / test coverage) so coverage doesn't collapse to one issue type.
- **Unclear bugs:** spawn adversarial investigators told to disprove each other's hypotheses (scientific-debate structure) to beat anchoring on the first plausible cause.
- Define reusable roles (security-reviewer, test-runner) as **subagent definitions** and reference them by name instead of hand-authoring team config.
- **Monitor and steer actively** — redirect failing approaches, synthesize findings as they arrive. If the lead starts doing work itself, instruct it: "Wait for your teammates to complete their tasks before proceeding."
- **Beginners** should start with non-code tasks (PR review, library research, bug investigation) to see parallel value before parallel implementation.
- **Use teams only for parallelizable work.** For sequential tasks, same-file edits, or heavy dependencies, use a single session or subagents — teams cost significantly more tokens (linear in active teammates) and are wasteful for routine work.

### Limits

Exactly **one team per session**; **no nested teams** (teammates can't spawn teammates); the **lead is fixed** and leadership cannot transfer; **shutdown is slow** (a teammate finishes its current request/tool call first). Each teammate is a separate Claude instance with its own context window. (See `/en/costs#agent-team-token-costs`.)

---

## Agent view (`claude agents`, research preview)

One screen showing **all background sessions grouped by state**, plus which need input. Requires **v2.1.139+** (`claude --version`). Background sessions run **locally** under a **per-user supervisor (daemon)** process separate from the terminal; they survive closing the terminal and survive sleep, but **stop on machine shutdown** (shown as `failed`; recoverable by attach/peek/reply, which restarts from where it left off). Each background session uses your **subscription quota independently** — 10 parallel agents burn quota ~10x faster, so cap parallel dispatch deliberately.

### Navigation & lifecycle

- `claude agents` is the primary entry point: dispatch tasks; press **Enter / →** to attach for the full conversation; press **←** on an empty prompt to detach back to the table.
- **Each prompt typed in the input starts a NEW session** — typing again does not follow up the previous one. Use the peek panel or attach to reply to an existing session.
- Pin long-lived/latency-sensitive sessions with **`Ctrl+T`** so the supervisor doesn't stop the process after ~1 hour idle (a finished, unattached session is stopped after ~1 hour to free resources; restarts on attach/peek/reply). Under low memory the supervisor stops idle non-pinned sessions first, pinned only if that frees nothing.
- **Delete = `Ctrl+X` twice within 2 seconds** — this removes the Claude-created worktree **including uncommitted changes**; commit/push first. Prefer **`claude rm <id>`** (keeps a dirty worktree and prints its path) when unsure; a worktree you created yourself is always left in place.
- Older completed sessions collapse into a `… N more` row (failures and open-PR sessions stay visible). Pick up results at the **PR column** — merge when the PR number turns green.
- Pin/package a recurring multi-agent task as a **skill**, then dispatch it from the input by typing **`/skill`** instead of retyping the prompt.

### Dispatch input prefixes/mentions

- `<agent-name> <prompt>` or `@<agent-name>` — run a subagent as the main agent.
- `@<repo>` — run in a sibling repo. (When an `@name` matches both a subagent and a sibling repo, the **subagent wins**.)
- `/<command>` — dispatch a skill/command.
- `! <command>` — run a shell job.
- `#<number>` or PR URL — select an existing PR session.
- `/exit`, `/quit`, `/logout` run in agent view itself; all other commands dispatch as a new session's first prompt. Prompts under **4 characters** are rejected with a `Too short` hint.

### Worktree isolation

Before editing files, a background session moves into an isolated git worktree under `.claude/worktrees/`. **Skipped when:** the session is already inside a linked worktree; the working dir isn't a git repo and no `WorktreeCreate` hook is configured; or the write is outside the working directory. Disable for a repo with `worktree.bgIsolation: "none"` in `.claude/settings.json` (v2.1.143+). Clean up leftovers: `git worktree list` then `git worktree remove <path>`.

### Dispatch defaults & config propagation

Set defaults for the whole agent-view session and override per-session while attached (`claude --bg --model ...` or `/model`):

```
claude agents --permission-mode plan --model opus --effort high
```

Pass **shared config once at the agent-view level** — these flags propagate to **every** dispatched session (repeat each flag per value; **space-separated multi-value is NOT supported**):

```
claude agents --settings ./ci-settings.json --add-dir ../shared-lib --mcp-config ... --plugin-dir ...
```

Scope to one project when you have sessions across many repos (v2.1.141+):

```
claude agents --cwd <path>
```

Version gates: `--permission-mode`/`--model`/`--effort`/`--dangerously-skip-permissions` require v2.1.142; `--allow-dangerously-skip-permissions` v2.1.143; `--agent` (and honoring the `agent` setting) v2.1.157. Config flags `--settings`/`--add-dir`/`--plugin-dir`/`--mcp-config`/`--strict-mcp-config` require v2.1.142. `--agent`/`--cwd` default: `--agent` falls back to the `agent` setting, else the built-in catch-all `claude` agent.

### Shell / scripting interface

```
claude --bg "<prompt>"          # background immediately
  --agent <name>                # set main agent
  --name <display-name>         # set display name
  --exec '<cmd>'                # PTY-backed shell job (no model; output not written to disk; row+output auto-cleanup ~5 min after exit)

claude attach <id>              claude logs <id>
claude stop <id>                # alias: claude kill
claude respawn <id> | --all     # move sessions onto an updated binary
claude rm <id>                  # keeps dirty worktree
claude daemon status
claude daemon stop --any [--keep-workers]
claude agents --json [--all]    # JSON for scripting
```

Flags carried through when backgrounding with `/bg`: `--mcp-config`, `--strict-mcp-config`, `--settings`, `--add-dir`, `--plugin-dir`, `--fallback-model`, `--allow-dangerously-skip-permissions`, plus dirs added via `/add-dir`. Backgrounding from an interactive session starts a **fresh process** from the saved conversation — running subagents, monitors, and background commands do **NOT** transfer (Claude confirms if any are running).

### State paths & env

- Session short ID = directory name under `~/.claude/jobs/`. Each session has `CLAUDE_JOB_DIR` set to its job dir (writes to `~/.claude/jobs/<id>/tmp/` don't prompt for permission).
- `~/.claude/daemon.log`, `~/.claude/daemon/roster.json`, `~/.claude/jobs/<id>/state.json`.
- `CLAUDE_CONFIG_DIR` makes the supervisor use that dir instead of `~/.claude` and run as a separate instance with its own sessions.
- Row one-line summaries are generated by a **Haiku-class model**, refreshed at most once per 15s plus once per turn end (each refresh is a billed short request). On Bedrock/Vertex/Foundry/custom gateways, summaries fall back to the session's main model unless `ANTHROPIC_DEFAULT_HAIKU_MODEL` is set.

### Governance & recovery

- Disable fleet-wide via the `disableAgentView: true` setting (enforce through managed settings) or the `CLAUDE_CODE_DISABLE_AGENT_VIEW` env var.
- `bypassPermissions`/`auto` are **refused for unattended dispatch** until you've accepted that mode once interactively — carrying `--allow-dangerously-skip-permissions` through `/bg` does not bypass this one-time acceptance.
- Recover a stalled supervisor without losing work: `claude daemon stop --any --keep-workers`, then reopen agent view so a fresh supervisor reconnects.
- After an auto-update the running supervisor may differ from the `claude` you invoked; `claude daemon status` / `/doctor` warn and tell you to run `claude daemon stop --any` to pick up the new version. The supervisor watches the on-disk binary (local file watch, not network) and restarts into the new version; `claude respawn --all` moves all sessions onto it at once.

> **Note:** Routines run in **Anthropic's cloud on a schedule** — they are NOT a way to run agents in parallel on your machine.

---

### Gotchas

- **Agent teams are off by default & silent.** Without `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, Claude silently won't spawn teammates — no error.
- **No team worktree isolation** — unpartitioned teammates clobber each other's files; assign distinct file sets.
- **`--dangerously-skip-permissions` on the lead silently propagates to ALL teammates.**
- **Teammate definitions drop `skills`, `mcpServers`, and `permissionMode`** — only `tools` and `model` carry over; the body is appended to the system prompt.
- **No team session resumption.** `/resume` and `/rewind` do NOT restore in-process teammates; after resuming, the lead may message teammates that no longer exist — tell it to spawn new ones.
- **Task status can lag** — teammates sometimes fail to mark tasks completed, blocking dependents; update status manually or nudge the teammate.
- **The lead may quit early or do the work itself** instead of delegating — tell it to keep going / wait for teammates.
- **Editing `~/.claude/teams/{team}/config.json` is futile** — overwritten on next state update.
- **Idle teammate rows vanish after 30s** (hidden, not stopped) — message by name to bring back.
- **Split panes silently fall back to in-process** in VS Code integrated terminal, Windows Terminal, and Ghostty.
- **Orphaned tmux sessions** can persist after exit — clean up with `tmux ls` then `tmux kill-session -t <name>`.
- **No broadcast** — reaching all teammates needs one message per recipient.
- **`/agents` ≠ `claude agents`** — `/agents` manages subagents in the current session; `claude agents` opens agent view for background sessions.
- **A prompt beginning with a subagent name silently dispatches that subagent** — use explicit `@` or a different leading word.
- **`claude agents` rejects space-separated multi-value flags** (`--add-dir a b c`) — repeat the flag per value.
- **Each agent-view input starts a new session** — it does not follow up the previous one.
- **Deleting a session (`Ctrl+X` twice) destroys the worktree's uncommitted changes** — commit/push first; `claude rm` keeps it but you must clean up yourself.
- **Machine shutdown** kills background sessions (`failed`); **sleep does not** (preserved, reconnect on wake). Recover failed-after-shutdown by attach/peek/reply.
- **Background quota multiplies** — 10 parallel agents ~10x the quota burn; parallel sessions/subagents can hit rate limits faster.
- **If `claude agents` just prints a count + subagent list and exits,** agent view is unavailable (older versions, or Bedrock/Vertex/Foundry) — run `claude update`.
- **macOS background host is a separate process** needing its own Files-and-Folders / Full Disk Access grants for `~/Desktop`, `~/Documents`, `~/Downloads` (`Operation not permitted` otherwise); non-native installers may need the grant re-applied after updates.
- **Two subagent files in the same scope with the same `name`** → one silently discarded with no warning. Keep `name` unique across the whole tree, including subfolders.
- **Plugin subagents silently ignore `hooks`, `mcpServers`, `permissionMode`** — copy the file into `.claude/agents/` or `~/.claude/agents/` to use them.
- **Explore/Plan skip CLAUDE.md and git status** — project rules don't reach them; no setting to change it. Restate critical rules in the delegation prompt.
- **`permissionMode` is silently overridden** when the parent is in `bypassPermissions`/`acceptEdits` (takes precedence) or `auto` (ignored entirely).
- **`--strict-mcp-config` does NOT filter MCP servers passed inline via `--agents` or the SDK `agents` option** — a managed-policy gap for CLI/SDK-injected agents.
- **Editing a subagent file on disk does not hot-reload** — restart the session (only the `/agents` interface applies immediately).
- **Many parallel subagents each returning detailed results flood the main context** — the isolation benefit is lost on the return path; have them report only summaries (e.g. "report only failing tests with their error messages").
- **Git status given to subagents is a snapshot from the parent session start** — it can be stale.
- **Built-in Explore/Plan return no agent ID and can't be resumed** — use general-purpose or a custom subagent to continue.
- **`CLAUDE_CODE_FORK_SUBAGENT=1` makes ALL subagent spawns** (not just forks) background tasks, unexpectedly changing permission-prompt behavior. (`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` keeps spawns synchronous.)
- **Subagent `cd` does not persist between Bash calls** — multi-step shell workflows relying on a changed directory break; subagents start in the main cwd and don't affect it.
- **`bypassPermissions` is not fully safe** — it permits writes to `.git`, `.claude`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, etc.; explicit `ask` rules and root/home removals (`rm -rf /`) still prompt.
- **The nested-subagent depth limit of 5 is fixed and not configurable** — a depth-5 subagent silently loses the `Agent` tool.
- These pages are research-preview/experimental: UI, shortcuts, and behaviors may change (docs reference v2.1.140 screenshots, gates through v2.1.186).

---

## MCP (connecting tools)

MCP (Model Context Protocol) servers give Claude Code external tools. By default **anyone running Claude Code can connect any MCP server they choose** — Anthropic reviews directory connectors against listing criteria but does **not** security-audit or manage any MCP server. Server approval is the admin's responsibility.

### Team / project distribution (configuration-as-code)

The team default is **project scope**: `claude mcp add --scope project <name> ...` writes `.mcp.json` at the project root; commit it to version control so everyone who clones gets the same servers (with an approval prompt before first connect).

- **Hand-edit `.mcp.json` for team servers** (it's checked into the repo); it acts as config teammates approve on clone. Claude Code reads it **only at session start** — restart after editing.
- **Keep secrets out of VCS** via env var expansion: `${VAR}` and `${VAR:-default}`, expandable in `command`, `args`, `env`, `url`, and `headers`.
- **Bundle servers in plugins** for zero-touch consistency — everyone gets the same tools automatically when the plugin is enabled, no manual `claude mcp add`. Distribute via a managed plugin marketplace (browsable from `/plugin`).
- Since there is **no built-in MCP registry**, share an approved catalog as a plugin marketplace or an internal wiki listing exact `claude mcp add` commands.
- Use `--scope user` for personal servers wanted in every project (e.g. a docs-search server); `local` (default) for project-specific experiments.

### Scopes

```
local    (default) ~/.claude.json under projects.<project-path>.mcpServers   private, current project only
project  .mcp.json at project root                                            shared via VCS, current project
user     ~/.claude.json under top-level mcpServers                            private, all your projects
```

- Scope flag: `--scope local|project|user`. (Older versions: `local` was `project`; `user` was `global`.)
- **Scope is fixed at add time.** To change it: `claude mcp remove <name> --scope <old>` then re-add with the new `--scope`.
- MCP "local scope" (`~/.claude.json`) is **not** the same as general local settings (`.claude/settings.local.json`).

#### Precedence (highest first — definitions do NOT merge)

| Rank | Source | Match by |
|------|--------|----------|
| 1 | Local | name |
| 2 | Project | name |
| 3 | User | name |
| 4 | Plugin-provided servers | endpoint (URL/command) |
| 5 | claude.ai connectors | endpoint (URL/command) |

When a server is defined in multiple places, **only the entire entry from the highest-precedence source is used** — fields are never merged.

### Adding & managing servers

```bash
claude mcp add --transport http <name> <url>          # remote HTTP (recommended for remote)
claude mcp add --transport sse  <name> <url>          # SSE — DEPRECATED, use HTTP
claude mcp add [options] <name> -- <command> [args]   # local stdio (default transport)
claude mcp add --transport http <name> <url> --header "Authorization: Bearer <token>"  # static token
claude mcp add-json <name> '<json>'                   # JSON form; needed for WebSocket (type "ws")
claude mcp add-from-claude-desktop                    # import (macOS / WSL only)
```

- `--` separates Claude's options (`--transport`, `--env`, `--scope`) from the launch command; everything after `--` is passed untouched. **Required for stdio** or Claude parses the server's flags (e.g. `--port`) as its own.
- `--env KEY=value` (repeatable) passes server env vars. **Don't put the server name directly after `--env`** — it's read as another `KEY=value` and rejected; place another option between them.
- WebSocket: add only via `.mcp.json` or `add-json` with `type:"ws"`; `--transport` does **not** accept `ws`. WebSocket auth is header-only (no OAuth).
- In JSON config, `type` accepts `"streamable-http"` as an alias for `"http"`.

```bash
claude mcp list                     # status of all servers
claude mcp get <name>               # scope + full config (reveals launch command for stdio)
claude mcp remove <name>            # if in multiple scopes, reports "exists in multiple scopes" → pass --scope
claude mcp reset-project-choices    # reset project-scoped approvals (e.g. after a rejection)
claude mcp serve                    # run Claude Code itself as a stdio MCP server (exposes View/Edit/LS...)
```

Inside a session, `/mcp` checks/manages/reconnects/authenticates servers. Statuses from `claude mcp list`: `✓ Connected`, `! Connected · tools fetch failed`, `! Needs authentication`, `✗ Failed to connect`, `✗ Connection error`, `⏸ Pending approval` (project-scoped, not yet approved; `✗ Rejected` if declined).

The `Added` confirmation only means the entry was **saved**, not that the server starts/connects — always verify with `claude mcp list`.

#### `.mcp.json` format

```json
{ "mcpServers": {
    "name-stdio": { "type": "stdio", "command": "...", "args": [], "env": {} },
    "name-http":  { "type": "http", "url": "...", "headers": {} }
} }
```

Same format for `managed-mcp.json` and project `.mcp.json`. Config files Claude Code **actually reads** are only `~/.claude.json` and `<project>/.mcp.json`. It does **not** read `~/.claude/config/mcp.json`, `~/.claude/mcp.json`, or `%APPDATA%\Claude\mcp.json`. On Windows `~/.claude.json` → `%USERPROFILE%\.claude.json`; if `CLAUDE_CONFIG_DIR` is set, `.claude.json` is read from that directory.

### Authentication

- **OAuth 2.0** for HTTP servers; Claude Code marks a server as needing auth on **401 or 403**. Authenticate via `/mcp` panel, or CLI (v2.1.186+):
  ```bash
  claude mcp login <name>            # add --no-browser over SSH (connect with ssh -t)
  claude mcp logout <name>
  ```
- **Static token:** `--header "Authorization: Bearer <token>"`. If `headers.Authorization` is set but rejected, Claude reports a **failed connection** rather than falling back to OAuth — the token must be valid or remove the header.
- **Pre-configured OAuth** (HTTP/SSE only, not stdio): `--client-id <id>`, `--client-secret` (masked prompt, or `MCP_CLIENT_SECRET` env for CI), `--callback-port <port>` (fixes callback to `http://localhost:PORT/callback`). Secret stored in system keychain/credentials file, not config.
- **Scope pinning:** `oauth.scopes` (space-separated string) in `.mcp.json` pins requested scopes and **overrides** discovered scopes and `authServerMetadataUrl` — the supported way to restrict to a security-approved subset; widen only when a tool returns `403 insufficient_scope`. `oauth.authServerMetadataUrl` (v2.1.64+, must be https) overrides OAuth discovery.
- **`headersHelper`** (in `.mcp.json`): runs a shell command at connection time to generate auth headers — for non-OAuth auth (Kerberos, short-lived tokens, internal SSO). Must write a JSON object of string key-values to stdout; 10-second timeout; overrides static headers with the same name; runs fresh each connect (no caching). At project/local scope it runs only after accepting the workspace-trust dialog. Provides env vars `CLAUDE_CODE_MCP_SERVER_NAME`, `CLAUDE_CODE_MCP_SERVER_URL`.

### Tool Search & context budget

Tool Search is **enabled by default**: tool definitions are deferred (only tool **names + server instructions** load at session start) and discovered on demand via a search tool. **No per-server tool cap** — the limit is the context-window budget. Adding more servers under default deferral has minimal context impact.

| `ENABLE_TOOL_SEARCH` | Behavior |
|----------------------|----------|
| (unset) | all deferred; falls back to upfront on Vertex AI or non-first-party `ANTHROPIC_BASE_URL` |
| `true` | all deferred even on Vertex/proxies (sends beta header) |
| `auto` | load upfront if tools fit within 10% of context window, else defer |
| `auto:N` | custom percentage |
| `false` | all loaded upfront |

- Requires a model supporting `tool_reference` blocks. **Haiku does not support it**; on Vertex AI supported only for Sonnet 4.5+/Opus 4.5+.
- `alwaysLoad: true` on a server config (v2.1.121+, all server types) loads all its tools upfront regardless of `ENABLE_TOOL_SEARCH`. Reserve it for tools needed every turn. Per-tool: `_meta "anthropic/alwaysLoad": true`.
- Disable the search tool via permissions: `{"permissions":{"deny":["ToolSearch"]}}`. Without tool search, Claude uses `WaitForMcpServers` to wait on background-connecting servers; with it, the wait happens inside `ToolSearch`.
- **Remove unused servers** (`claude mcp remove <name>`) — every connected server consumes context each session.
- **Server authors:** write concise instructions and tool descriptions (each **truncated at 2KB**), critical details first, so Tool Search can find your tools.

### Output, timeouts & reconnection

- **Output:** warning when any tool output exceeds **10,000 tokens**; default max **25,000 tokens**, raised via `MAX_MCP_OUTPUT_TOKENS`. Authors can set `_meta["anthropic/maxResultSizeChars"]` per tool (hard ceiling **500,000 chars**) for **text** content only; image-returning tools stay capped by `MAX_MCP_OUTPUT_TOKENS`. For servers you don't control that exceed the warning, raise `MAX_MCP_OUTPUT_TOKENS` or ask the author to paginate / add the annotation.
- **Startup timeout:** default **30s**; override with `MCP_TIMEOUT` (ms), e.g. `MCP_TIMEOUT=60000 claude`. Bump it for first-run slow stdio servers (npx downloading packages) rather than assuming failure.
- **Per-server tool-execution timeout:** `timeout` field (ms) in the server's `.mcp.json` entry overrides `MCP_TOOL_TIMEOUT`; values < 1000 are ignored (fall through to `MCP_TOOL_TIMEOUT`, default ~28h). HTTP/SSE first-byte fetch has a 60-second minimum budget.
- **Reconnection:** HTTP/SSE auto-reconnect mid-session with exponential backoff (up to 5 attempts, 1s doubling, then marked failed; retry from `/mcp`). **Stdio servers do NOT auto-reconnect.** v2.1.121+: initial connection retried up to 3 times on transient errors (5xx, connection refused, timeout); **auth and not-found errors are never retried**.

### Resources, prompts, plugins, special envs

- **Resources** via `@` mentions: `@server:protocol://resource/path` (e.g. `@github:issue://123`); multiple per prompt, fetched as attachments.
- **Prompts as slash commands:** `/mcp__servername__promptname`, args space-separated (e.g. `/mcp__github__pr_review 456`); spaces in names → underscores.
- **Plugin-bundled servers:** in `.mcp.json` at plugin root or inline in `plugin.json` under `mcpServers`; auto-start when the plugin is enabled; can use `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${CLAUDE_PROJECT_DIR}` (substituted directly, no default needed). `/reload-plugins` to connect/disconnect mid-session. Tool name form: `mcp__plugin_<plugin-name>_<server-name>__<tool-name>`.
- **`CLAUDE_PROJECT_DIR`:** set in the spawned stdio server's env to the project root. In project/user-scoped `.mcp.json` reference it as `${CLAUDE_PROJECT_DIR:-.}` (it lives in the server's env, not Claude Code's, so it needs a default); plugin configs substitute it directly.
- **Scaffold a server:** `/plugin install mcp-server-dev@claude-plugins-official` then `/mcp-server-dev:build-mcp-server` (run `/plugin marketplace add anthropics/claude-plugins-official` first if needed).

### claude.ai connectors

Servers added at `claude.ai/customize/connectors` (Team/Enterprise: **only admins** can add) auto-load in the CLI — **but only when active auth is the Claude.ai subscription.** They silently do **not** load when `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, Bedrock, or Vertex is active (even after `/login`). Run `/status` to check active auth.

- Disable all: `disableClaudeAiConnectors: true` in any settings scope (any-source-true: a `true` anywhere wins; a project `false` cannot re-enable a user/policy `true`), or `ENABLE_CLAUDEAI_MCP_SERVERS=false` (current shell). Opt a repo out by committing `disableClaudeAiConnectors:true` in project settings.
- Block individual connectors by name/URL via `deniedMcpServers` (e.g. `serverName "claude.ai Slack"`).
- Servers passed via `--mcp-config` are unaffected. `disableClaudeAiConnectors` does **not** apply to Claude Code on the web (connectors arrive there as `--mcp-config`); web reads `.mcp.json` from the repository.

## Enterprise governance (managed MCP)

Choose the restriction pattern by the control needed:

| Goal | Mechanism |
|------|-----------|
| Disable MCP entirely | `managed-mcp.json` with empty map `{"mcpServers": {}}` |
| Fixed deployment | `managed-mcp.json` defining the exact server set |
| Approved catalog | `allowedMcpServers` + `allowManagedMcpServersOnly: true` |
| Plugin-only | `strictPluginOnlyCustomization` with `mcp` in the list |
| Soft allowlist | `allowedMcpServers` (without the "only" flag) |
| Denylist-only | `deniedMcpServers` |

Manage org-wide MCP access via **managed settings/policy** (`/en/managed-mcp`), not per-user config.

### `managed-mcp.json`

Deploys a fixed server set with **exclusive control**: Claude Code loads **only** servers that file defines; users cannot add, modify, or use any other server — **including plugin-provided servers**.

```
macOS    /Library/Application Support/ClaudeCode/managed-mcp.json
Linux    /etc/claude-code/managed-mcp.json   (also WSL)
Windows  C:\Program Files\ClaudeCode\managed-mcp.json
```

- **Cannot be delivered via server-managed settings** — it must reach a system path via MDM/admin-privileged process (Jamf/config profile on macOS; Group Policy/Intune on Windows; fleet management on Linux). Misplacing it = silently not read.
- Same format as a project `.mcp.json`; entries support `type` (`http`/`stdio`), `url`, `command`, `args`, `env`.
- Empty map → users see no servers in `/mcp` and `claude mcp add` fails with the enterprise-policy error.
- Deploying it **suppresses both** claude.ai connectors (including admin-configured org ones) **and** plugin-provided servers. `allowAllClaudeAiMcps: true` (v2.1.149+) restores claude.ai connectors only — **never** plugin servers; older clients ignore the flag.
- Allow/deny lists still apply to managed servers; a user's own `deniedMcpServers` merges in, so users can always block a managed server for themselves.

Validate on a managed machine:
```bash
claude mcp list                                              # shows only the managed servers
claude mcp add --transport http test https://example.com/mcp # expected: "Cannot add MCP server: enterprise MCP
                                                             # configuration is active and has exclusive control..."
```
(URL need not be real — policy rejects before contacting.)

### Allowlists / denylists

Entries are objects with a single key: `serverUrl` (remote; exact or `*` wildcards), `serverCommand` (exact command+args **array** for stdio), or `serverName` (user-assigned label, exact match, no wildcards).

**Evaluation order:** (1) merge allow/deny from all sources — denylist **always** merges from all sources; allowlist merges from all sources **unless** `allowManagedMcpServersOnly: true` keeps only the managed allowlist; (2) check denylist — **any match blocks, nothing overrides**; (3) check allowlist.

- `allowedMcpServers` **unset** = all allowed; **`[]`** = nothing allowed; populated = only matching. `deniedMcpServers` unset/`[]` = nothing blocked; populated = matching blocked.
- **Enforce identity by `serverUrl`/`serverCommand`, never `serverName`** — names are user-assigned labels (a user can call any server `github`). A `serverName` allowlist entry counts **only** when the allowlist has no `serverUrl`/`serverCommand` entry of the same transport.
- `serverUrl` wildcards: `*` anywhere including scheme; hostname matching case-insensitive, ignores trailing FQDN dot; paths case-sensitive; a pattern with no path matches any path.
- `serverCommand` matches **exactly**: every argument, in order — a missing `-y` or extra `--flag` fails (`["npx","-y","server"]` ≠ `["npx","server"]`).
- `serverName` validation differs by list: **allowlist** limited to `[A-Za-z0-9_-]`; **denylist** (v2.1.182+) accepts any non-empty string (can block claude.ai connectors by display name).
- `allowManagedMcpServersOnly: true` (with `allowedMcpServers`, in a managed source) makes the allowlist authoritative so users can't broaden it via their own settings. It is **distinct from** `allowManagedPermissionRulesOnly` (which locks permission rules only).

### Admin-only flags

`allowManagedMcpServersOnly`, `allowAllClaudeAiMcps` are read **only** from admin-controlled tiers (server-managed settings, MDM plist / HKLM registry, system `managed-settings.json`). In user/project settings they are **silently ignored**.

### Monitoring usage

Enable OpenTelemetry export with `OTEL_LOG_TOOL_DETAILS=1` to include MCP server/tool names in tool events; aggregate in your collector to see which servers your org actually uses **before** tightening policy.

## Security & diagnostics

- **Never store API keys/credentials in `env` blocks** of `managed-mcp.json` — any user on the machine can read it. Use `${VAR}` expansion from each user's environment, per-user OAuth/headers, or `headersHelper`.
- **Verify and trust each server before connecting** — servers that fetch external content expose you to **prompt-injection** risk.
- Diagnose by transport: **HTTP** — `curl -I <url>` (404/405 = up; 401/403 = needs auth; no response = network; PowerShell: use `curl.exe`, not the `Invoke-WebRequest` alias). **stdio** — run the configured command directly to surface the real error. `/mcp` shows parse warnings; `claude mcp get <name>` reveals a garbled launch command.

### Gotchas

- **`[]` locks everyone out.** `allowedMcpServers` unset (all allowed) vs `[]` (nothing allowed) behave very differently.
- **`serverName` is not a security control** — trivially spoofed. A `serverName` allowlist entry never matches if any `serverUrl`/`serverCommand` entry of the same transport exists.
- **Denylists always win** — they merge from every source (including user settings) and override allowlists even under `allowManagedMcpServersOnly`; users can always block managed servers for themselves.
- **`managed-mcp.json` silently suppresses plugin servers AND org connectors**; `allowAllClaudeAiMcps` restores connectors only, never plugin servers (and needs v2.1.149+).
- **Policy-blocked servers vanish silently** from `/mcp` and `claude mcp list` with no reason given — proactively tell affected users which servers are blocked.
- **`managed-mcp.json` cannot come from server-managed settings** — wrong path = silently not read.
- **Scopes don't merge** — a server defined in multiple scopes uses only the highest-precedence entire entry.
- **MCP "local scope" lives in `~/.claude.json`**, not `.claude/settings.local.json`.
- **Wrong config path fails silently** — only `~/.claude.json` and `<project>/.mcp.json` are read; `~/.claude/mcp.json`, `%APPDATA%\Claude\mcp.json` are ignored.
- **`.mcp.json` changes don't apply mid-session** — read only at startup; restart.
- **Malformed `.mcp.json` entries are silently skipped** — run `/mcp` to see the parse warning naming the offending field. A missing required env var with no default fails parsing of the **entire** config.
- **Omitting `--` before a stdio command** garbles it; **placing the server name right after `--env`** rejects it as a bad pair.
- **Project-scoped servers are NOT auto-trusted** — they need approval; a prior rejection persists until `claude mcp reset-project-choices`.
- **Local-scoped servers are tied to the exact repo root** where you ran `claude mcp add` — invisible from another directory; use `--scope user` to avoid this.
- **A server can connect yet expose no tools** if a required env var (e.g. API key) is missing — pass via `--env KEY=value` or the `env` field.
- **`Added` ≠ connected** — always verify with `claude mcp list`. Adding a duplicate name at the same scope errors `Server already exists`.
- **claude.ai connectors silently don't load** under API-key/Bedrock/Vertex/`apiKeyHelper` auth even after `/login` — check `/status`.
- **A rejected `headers.Authorization` reports failure, not OAuth fallback.**
- **Stdio servers never auto-reconnect**; auth and not-found startup errors are never retried.
- **Tool descriptions / server instructions over 2KB are silently truncated.**
- **Tool Search unsupported on Haiku and pre-Sonnet-4.5/Opus-4.5 Vertex AI**; `ENABLE_TOOL_SEARCH=true` there makes requests fail; it also auto-disables behind a non-first-party `ANTHROPIC_BASE_URL` proxy.
- **The server name `workspace` is reserved** — skipped at load time with a warning.
- **`alwaysLoad:true` blocks session startup** until that server connects (capped at 5s), unlike normal non-blocking MCP startup.
- **`maxResultSizeChars` raises the limit only for text content** — image-returning tools stay capped by `MAX_MCP_OUTPUT_TOKENS`.
- **`${CLAUDE_PROJECT_DIR}` in project/user-scoped `.mcp.json` needs a default** (`${CLAUDE_PROJECT_DIR:-.}`) — only plugin configs substitute it directly.
- **`disableClaudeAiConnectors` is any-source-true** (a project `false` can't re-enable a user/policy `true`) and does **not** apply to Claude Code on the web.
- **Claude Desktop import is macOS/WSL only**; duplicate names get a numeric suffix (e.g. `server_1`).


---

## Plugins & distribution

A plugin is a self-contained directory bundling skills, agents, hooks, MCP servers, LSP servers, background monitors, themes, output-styles, and/or `bin/` executables. A **marketplace** is a catalog of plugins. Using a marketplace is two steps: (1) **add** it (registers the catalog, installs nothing), then (2) **install** individual plugins from it. The most important team decisions are how plugins are distributed (your own Git marketplace), how they're scoped (project scope, checked into VCS), how they're governed (managed settings), and how their always-on token cost is budgeted.

### Team distribution & scopes (start here)

**Recommended flow:** start with a standalone `.claude/` config for fast iteration, convert to a plugin when ready to share, then distribute via a private Git-based marketplace at **project scope** so everyone who clones the repo gets it.

```bash
# Add the org marketplace at project scope (lands in .claude/settings.json, not user scope)
claude plugin marketplace add your-org/claude-plugins --scope project
# Install at project scope → writes enabledPlugins to .claude/settings.json (checked into VCS)
claude plugin install formatter@your-org --scope project
```

Commit both `extraKnownMarketplaces` and `enabledPlugins` to the project `.claude/settings.json`. Collaborators are then **auto-prompted to install** the org marketplace/plugins when they trust the repo folder — no manual `marketplace add` per person.

| Scope | Where it's written | Who gets it |
|-------|-------------------|-------------|
| **User** (default) | `~/.claude/settings.json` | Yourself, all projects |
| **Project** | `.claude/settings.json` | All repo collaborators (shared via VCS) |
| **Local** | `.claude/settings.local.json` (gitignored) | Yourself, this repo only |
| **Managed** | managed settings (`managed-settings.json`) | Installed by admins; **read-only**, users cannot modify/remove |

`--scope <user|project|local>` targets a scope on any `claude plugin install/enable/disable/prune/marketplace add` command. Enabled state is written to `enabledPlugins` (maps `plugin@marketplace` → boolean) in the scope's settings file.

**`extraKnownMarketplaces`** (in project `.claude/settings.json` or managed settings) is an object keyed by marketplace name with a `source` (e.g. type `github`, repo `your-org/claude-plugins`). Per-entry `"autoUpdate": true` forces org-marketplace auto-update without each user toggling. Marketplace registration state is stored **once per user** in `~/.claude/plugins/known_marketplaces.json` (not per-project); worktrees share it.

### Managing plugins & marketplaces

```bash
/plugin                                  # 4-tab UI: Discover · Installed · Marketplaces · Errors (Tab / Shift+Tab to cycle)
/plugin install <name>@<marketplace>     # installs to USER scope by default; skills become /<plugin>:<skill>
/plugin list [--enabled|--disabled]      # alias: ls
/plugin enable|disable <name>@<marketplace>
/plugin uninstall <name>@<marketplace>
/reload-plugins                          # apply install/enable/disable mid-session without restart
```

**Marketplace subcommands** (`/plugin market` and `rm` shortcuts exist):

```bash
/plugin marketplace add <source>         # source: owner/repo · git URL (incl .git) · local path · remote marketplace.json URL
/plugin marketplace list
/plugin marketplace update [name]        # refresh from sources (all if name omitted)
/plugin marketplace remove <name>        # name from marketplace.json, NOT the add source
```

Pin a ref when adding: `owner/repo@ref` (GitHub shorthand) or `<git-url>#ref` (git URL), e.g. `/plugin marketplace add https://gitlab.com/company/plugins.git#v1.0.0`. Add `--sparse <paths...>` to limit checkout for monorepos.

`/reload-plugins` reloads plugins, skills, agents, hooks, plugin MCP servers, and LSP servers and reports counts. It has a token cost on the next request; a plugin with **non-deferred** MCP servers invalidates the prompt cache and forces a full re-read. v2.1.163+ shows a warning and **refuses unless you pass `--force`**.

**CLI (scriptable) equivalents:** `claude plugin install|enable|disable|uninstall|list|prune|tag|validate|init|details`, `claude plugin marketplace add|list|remove|update`. Use `claude plugin list --json` (read each plugin's `errors` field) for CI/health checks rather than parsing human output; `--available` (requires `--json`) includes marketplace plugins.

### Official & community marketplaces

| Marketplace | Add | Install ref | Notes |
|-------------|-----|-------------|-------|
| `claude-plugins-official` | auto-registered on first **interactive** launch | `<name>@claude-plugins-official` | Curated by Anthropic. In non-interactive scripts add explicitly: `claude plugin marketplace add anthropics/claude-plugins-official` |
| `claude-community` | `/plugin marketplace add anthropics/claude-plugins-community` | `<name>@claude-community` | Public submissions after automated review; each pinned to a commit SHA |
| `claude-code-plugins` (demo) | `/plugin marketplace add anthropics/claude-code` | — | Not auto-added |

Browse the official catalog via the `/plugin` Discover tab or claude.com/plugins. **In-app submission forms go to the *community* marketplace, not the official one** — you cannot self-submit to the official catalog (it's curated at Anthropic's discretion). Community approval needs a Team/Enterprise org with directory-management access; individuals use the Console form at platform.claude.com/plugins/submit. Approved community plugins are SHA-pinned and the catalog **syncs nightly**, so approval→availability has a delay.

If a plugin is "not found in any marketplace," the marketplace is missing/outdated: `/plugin marketplace update claude-plugins-official` (or `add anthropics/claude-plugins-official` if never added).

### Authoring a plugin

**Layout** — `.claude-plugin/plugin.json` is the manifest (optional; if omitted, components auto-discover and the plugin name derives from the directory name). **All component dirs go at the plugin ROOT, never inside `.claude-plugin/`** (only `plugin.json` lives there):

```
my-plugin/
├── .claude-plugin/plugin.json   # ONLY plugin.json here
├── skills/<name>/SKILL.md        # preferred (use over legacy flat commands/)
├── commands/                     # flat .md, legacy
├── agents/                       # .md
├── output-styles/  themes/
├── hooks/hooks.json              # same format as .claude/settings.json hooks
├── monitors/monitors.json        # background monitors
├── .mcp.json   .lsp.json         # MCP / LSP servers
├── bin/                          # executables added to Bash PATH while enabled
└── settings.json                 # default plugin settings (only 'agent' & 'subagentStatusLine' honored)
```

**Manifest (`plugin.json`)** fields: `name` (required, kebab-case, no spaces — this is the **namespace** for all components, e.g. `plugin-dev:agent-creator`), `description`, `version` (optional), `author`, `homepage`, `repository`, `license`, `displayName` (v2.1.143+, UI-only, may have spaces, **not** used for namespacing), `dependencies`, `userConfig`. `$schema` is editor-tooling only (ignored at load).

- **Single-skill plugin:** put `SKILL.md` at the plugin root with no `skills/` dir (v2.1.142+). **Set frontmatter `name`** or the invocation name falls back to the install-dir version string (changes every update).
- Add a `description` to every SKILL.md frontmatter so Claude can model-invoke it; set `disable-model-invocation: true` for explicit-only skills.
- **Ship instructions as a skill, not a `CLAUDE.md` at plugin root** — a plugin-root CLAUDE.md is NOT loaded as context. Plugins contribute context only via skills/agents/hooks.
- Use `skills/<name>/SKILL.md` (not legacy flat `commands/`) for anything that might grow beyond one skill.
- **Converting standalone `.claude/` → plugin:** `mkdir .claude-plugin/`, add `plugin.json`, copy `commands/`/`agents/`/`skills/` to plugin root, move hooks into `hooks/hooks.json`. Then **delete the original `.claude/` files** — leftovers cause duplicate skills and shadow plugin agents (project/user `.claude/agents/` override same-named plugin agents).

**Component specifics:**
- Hook types: `command` (shell), `http` (POST event JSON to URL), `mcp_tool`, `prompt` (LLM eval with `$ARGUMENTS`), `agent` (agentic verifier). Hook commands receive input as JSON on stdin (`jq .tool_input.file_path`). Hook event names are **case-sensitive** (`PostToolUse`, not `postToolUse`); non-executable scripts silently don't fire (`chmod +x`).
- Plugin **agents** support frontmatter `name, description, model, effort, maxTurns, tools, disallowedTools, skills, memory, background, isolation` (only valid value `worktree`). For security, `hooks`, `mcpServers`, and `permissionMode` are **NOT supported** in plugin-shipped agents (silently ignored).
- Monitors (v2.1.105+): `monitors/monitors.json` array; each `command` runs while active and every stdout line is delivered to Claude as a notification. Run only in interactive sessions, unsandboxed at hooks trust level.
- LSP: `.lsp.json` (command, args, `extensionToLanguage`); users must install the language-server binary. Pre-built LSP plugins exist for TypeScript/Python/Rust. Plugin `settings.json` honors only `agent` (activates a custom agent as the main thread) and `subagentStatusLine`; it takes priority over `settings` in `plugin.json`.

**Environment variables** (substituted in skill/agent content, hook/monitor commands, MCP/LSP configs, and exported to subprocesses):

| Var | Meaning |
|-----|---------|
| `${CLAUDE_PLUGIN_ROOT}` | Absolute install dir — **CHANGES on every update**; reference bundled scripts/binaries via this, never absolute paths |
| `${CLAUDE_PLUGIN_DATA}` | Persistent state dir surviving updates (`~/.claude/plugins/data/{id}/`) — install deps (node_modules, venvs) and any persistent state here |
| `${CLAUDE_PROJECT_DIR}` | Project root |

**`userConfig`** prompts the user at enable time (types: string/number/boolean/directory/file). Substituted as `${user_config.KEY}` and exported as `CLAUDE_PLUGIN_OPTION_<KEY>`. **`sensitive: true`** masks input and stores in the system keychain (or `~/.claude/.credentials.json`) instead of settings.json — keychain has a **~2KB total budget** shared with OAuth tokens, so keep secrets small. Non-sensitive values go to `pluginConfigs[<plugin-id>].options` in settings.json.

### Marketplace definition (`marketplace.json`)

A marketplace is a `.claude-plugin/marketplace.json` at the repo root. Required: `name` (kebab-case, public-facing, no spaces), `owner` (`{name, email?}`), `plugins` (array). Each plugin entry needs `name` (kebab-case) and `source`.

**Plugin source types:**
- Relative path string — must start with `./`, resolved relative to marketplace root (not `.claude-plugin/`).
- `github` — `{repo: "owner/repo", ref?, sha?}`
- `url` — git URL `{url, ref?, sha?}`
- `git-subdir` — `{url, path (required), ref?, sha?}`; sparse partial clone for monorepos.
- `npm` — `{package, version?, registry?}`

When both `ref` and `sha` are set, **`sha` is the effective pin** — install survives deletion of the named branch/tag upstream as long as the commit is reachable. (Marketplace source itself supports `ref` but **not** `sha`; plugin sources support both.)

Optional marketplace-level fields: `$schema` (ignored at load), `description`, `version`, `metadata.pluginRoot` (base dir prepended to relative sources), `allowCrossMarketplaceDependenciesOn`, plus per-entry `defaultEnabled`, `displayName`, `relevance`, `strict`.

- **`strict`** (default true): true → `plugin.json` is authority, marketplace entry supplements/merges. false → marketplace entry is the entire definition and any `plugin.json` declaring components **fails to load** (lets a marketplace operator curate without a plugin.json).
- **`defaultEnabled: false`** (v2.1.154+): ship installed-but-disabled, so plugins that add cost or connect to external services install **opt-in**. Marketplace entry's value takes precedence over plugin.json's. Precedence: user's `enabledPlugins` > dependency requirement > `defaultEnabled`.

**Validate before sharing** (same check the community review pipeline runs):
```bash
claude plugin validate .            # at marketplace dir → checks marketplace.json (schema, dup names, '..' traversal, version mismatches)
claude plugin validate ./plugin     # at plugin dir → checks plugin.json + skill/agent/command/hook frontmatter + hooks.json
claude plugin validate ./plugin --strict   # CI: treats warnings (unknown top-level fields) as errors
```
Unrecognized top-level fields are **warnings** (plugin still loads); wrong-type fields are errors.

**Reserved/blocked names:** `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `claude-plugins-community`, `claude-community`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `anthropic-agent-skills`, `knowledge-work-plugins`, `life-sciences`, `claude-for-legal`, `claude-for-financial-services`, `financial-services-plugins`, plus impersonating names (e.g. `official-claude-plugins`). Each user can register **one marketplace per name** — adding a second with the same name replaces it; host multiple plugins by listing them all in one marketplace.json. Names that aren't strict kebab-case load locally but are **rejected by Claude.ai marketplace sync**.

### Versioning & updates

**Version resolution precedence:** (1) `version` in `plugin.json` → (2) `version` in marketplace entry → (3) git commit SHA (github/url/git-subdir/relative git sources) → (4) `unknown` (npm or non-git local). **`plugin.json` silently wins over the marketplace entry** — never set `version` in both (a stale manifest masks your intended release).

- **Set `version`** for stable/team plugins so consumers update only on intentional bumps — but then you **must bump it** for every change (pushing commits alone does nothing; `/plugin update` reports "already at the latest version").
- **Omit `version`** for internal plugins under active development → commit-SHA versioning, every commit is a new version (constant "updates" but always fresh).

**Auto-update defaults:** official Anthropic marketplaces auto-update; third-party and local-dev marketplaces have auto-update **disabled** by default (enable per-entry via `extraKnownMarketplaces.autoUpdate: true` or `--scope`/managed settings). `DISABLE_AUTOUPDATER=1` disables all auto-updates (Claude Code + plugins); pair with `FORCE_AUTOUPDATE_PLUGINS=1` to keep plugin auto-updates while centrally managing the Claude Code version.

**Private-repo auth for startup auto-update:** export `GITHUB_TOKEN`/`GH_TOKEN`, `GITLAB_TOKEN`/`GL_TOKEN`, or `BITBUCKET_TOKEN`. Background auto-update at startup does **NOT** use git credential helpers or ssh-agent (would block startup), so env tokens are mandatory for private-marketplace auto-update. Manual install/update does use existing credential helpers.

**Git tuning:** default git timeout 120s — raise `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` (ms) for large repos/slow networks. On a failed `git pull`, Claude wipes and re-clones by default; set `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` for offline/airgapped to keep the stale cache.

**Release channels:** two marketplaces pointing to different refs/SHAs of the same repo (e.g. `stable` and `latest`), each assigned to a user group via managed `extraKnownMarketplaces`. **Each channel must resolve to a distinct version string** or Claude treats them as identical and skips the update.

**Cache:** installed plugins are **copied** to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` (not used in-place). Each version is a separate dir; old versions are marked orphaned and removed **~7 days** after update/uninstall (grace for concurrent sessions); Glob/Grep skip orphaned dirs. Fix for skills not appearing: `rm -rf ~/.claude/plugins/cache`, restart, reinstall.

### Dependencies (v2.1.110+ for constraints)

Declared in the `dependencies` array of `plugin.json`: bare name strings or `{name (required), version?, marketplace?}`. Without a constraint, a dependency tracks **latest** and an upstream release can change it under you. `version` accepts any Node semver range (`^2.0`, `~2.1.0`, `>=1.4`, `=2.1.0`, hyphen); the **highest tagged** satisfying version is fetched. **Pre-release tags are excluded** unless the range opts in (`^2.0.0-0`).

**Tagging is mandatory for resolution.** Each release must be git-tagged `{plugin-name}--v{version}` matching that commit's `plugin.json` version:
```bash
claude plugin tag --push --dry-run   # preview; validates plugin.json & marketplace entry agree on version, clean tree, no existing tag
claude plugin tag --push             # or: git tag secrets-vault--v2.1.0 (if manifest & entry stay in sync)
```
Without a matching tag dependents get `no-matching-tag` and are **disabled**.

**Resolution & cascade (v2.1.143+):** enabling a plugin enables its transitive dependencies at the same scope (force-writing `true` even over a dependency's `defaultEnabled: false`); disabling is blocked while another enabled plugin needs it (error gives a chained `disable A && disable B` command in correct order). Pre-2.1.143 acts only on the named plugin and surfaces `dependency-unsatisfied`. When multiple plugins constrain the same dependency, ranges are **intersected** to the highest version satisfying all; auto-update fetches the highest tag satisfying every range (not marketplace latest).

**Cross-marketplace deps are DENIED by default.** The **root** marketplace (hosting the plugin being installed) must list the target in `allowCrossMarketplaceDependenciesOn`; trust does **not** chain through intermediate marketplaces. Otherwise install fails with `cross-marketplace` (users can pre-install the dependency manually to satisfy the constraint without editing the allowlist).

**Error types** (disable the plugin; surface in `claude plugin list`, `/plugin`, `/doctor`; read `errors` via `--json`):

| Error | Cause / fix |
|-------|-------------|
| `dependency-unsatisfied` | Dep not installed or disabled (prints the install command) |
| `dependency-version-unsatisfied` | Installed version outside range → `claude plugin install <dep>@<marketplace>`. Also the npm case: constraint is checked at load but does **not** pick the fetched version (tag resolution is git-only) |
| `range-conflict` | Incompatible ranges (e.g. `~2.1` vs `~3.0`) — second install fails, existing left unchanged |
| `no-matching-tag` | No `{name}--v*` tag satisfies the range |

If no tag satisfies all ranges, auto-update is **silently skipped** (only visible in `/doctor` and the Errors tab, naming the constraining plugin).

**Pruning orphans:**
```bash
claude plugin prune              # v2.1.121+ (alias autoremove); removes ONLY auto-installed deps no longer needed; never directly-installed plugins
claude plugin prune --dry-run    # preview;  --scope project|local;  -y required in non-TTY (else lists & exits without removing)
claude plugin uninstall <plugin> --prune   # uninstall then sweep now-orphaned auto-deps (--keep-data preserves data dir; -y for non-TTY)
```

### Relevance suggestions (v2.1.152+; opt-in via managed settings)

A marketplace plugin entry can carry a `relevance` object `{topic?, signals}`; **at least one signal is required** to be suggestible. **No relevance produces suggestions until an admin allowlists the marketplace** in `pluginSuggestionMarketplaces` (managed-settings.json) — **including the official Anthropic marketplace** (the sole exception: one built-in suggestion).

For any non-official marketplace you must **also** register its source via `extraKnownMarketplaces` or `strictKnownMarketplaces` in the same managed settings — the allowlisted name is ignored otherwise, and if the registered marketplace came from a *different* source than declared, suggestions are suppressed (anti name-squatting). `claude-plugins-official` is exempt from source-declaration.

**Signals** (matched locally; no network, nothing reported to Anthropic):

| Signal | Matches | Notes / limits |
|--------|---------|----------------|
| `cwd` | globs vs working dir | **Only signal that fires at session start** (before first turn). Absolute + repo-relative, fwd-slash normalized, case-insensitive; `infra`/`infra/`/`infra/**` are identical. Max 10 patterns × 256 chars |
| `cli` | command names run | First token after env-assignments/`sudo` per shell invocation; **compound commands record only the leading token** (`cd infra && terraform plan` → `cd`). Exact match. Max 10 × 64 |
| `hosts` | hostnames in URLs in Bash commands | Bare lowercase host (no scheme/port/path — validator rejects those). Max 20 × 128 |
| `filesRead` | globs vs files read | Includes files Claude wrote/edited and auto-loaded CLAUDE.md. Fwd-slash normalized, case-insensitive. Max 10 × 256 |
| `manifestDeps` | `{file: regex, pattern: regex}` vs package manifests | `file` matched vs (usually absolute) path, **NOT separator-normalized** (Windows uses `\`), must be end-anchored, use `[/\\]` (double backslashes in JSON), e.g. `[/\\]package\.json$`. `file` case-insensitive, `pattern` case-sensitive. Manifests >512 KB skipped. RegExp source ≤256 chars, max 10 |

Only `cwd` matches at session start; the rest need session history (so they appear only in the spinner tip and Discover tab). **Three surfaces:** spinner tip ("Working with `<topic>`? Install the `<plugin>` plugin"), session-start one-liner (`plugin suggestion: <name>@<marketplace> · /plugin`, cwd-match only, v2.1.153+), and the Discover-tab pin "suggested for this directory" (v2.1.154+, independent of tip settings). `topic` defaults to the plugin name with each hyphen segment capitalized (max 64). Set `spinnerTipsEnabled: false` to disable tips org-wide/per-project (also kills the one built-in suggestion). Suggestions are heavily rate-limited (≤ once per 3 sessions across tip+session-start; session-start caps at 2 total shows; never repeats after install), so absence ≠ misconfiguration. Validate with `claude plugin validate ./my-marketplace` (rejects non-object `relevance`, surfaces unknown fields as warnings).

### Install hints (CLIs nudging Claude Code)

A CLI emits an install hint by writing a self-closing tag on **its own line** to stdout or stderr (stderr recommended to stay out of pipelines):
```
<claude-code-hint v="1" type="plugin" value="name@marketplace" />
```
Required attrs: `v` (only `1`), `type` (only `plugin`), `value` (`name@marketplace`). Hint lines are always stripped from output before reaching the model (never counted as tokens), even if unrecognized. A mid-line tag is ignored. **Hints fire only for plugins in an Anthropic-controlled official marketplace (e.g. `claude-plugins-official`)** — hints to other marketplaces (and to the community marketplace, where in-app submissions route) are silently dropped. Claude never auto-installs: the user confirms (Yes → user scope). Prompt frequency is bounded — **once per plugin ever** (recorded regardless of answer), at most once per session across all CLIs on the machine; unanswered for **30s → dismissed as No**.

### Detecting Claude Code from a script/hook

- `CLAUDECODE=1` is set for every Bash/PowerShell tool command and hook command — **but also** in tmux sessions, stdio MCP subprocesses, and IDE-extension integrated terminals, so a human at the keyboard may see it set. Don't treat it as "no human present."
- `CLAUDE_CODE_CHILD_SESSION=1` (v2.1.172+) is set only in subprocesses Claude Code itself spawns (tool calls, hook commands, status-line commands) — prefer it to avoid false positives. Caveat: a long-lived process (e.g. a tmux server) started inside a session captures it, so later shells from that process still see it.

### Org governance (managed settings — cannot be overridden by user/project)

- **`strictKnownMarketplaces`** in `managed-settings.json` restricts which marketplaces users may add: undefined = no restriction, `[]` = total lockdown, list of sources = allowlist with **exact matching**. Entry types: `github` (repo + optional ref/path), `url` (exact full URL), `hostPattern` (regex on host — **recommended** for GHES/self-hosted; use over literal URLs), `pathPattern` (regex on filesystem path; `".*"` = any). Matching is **exact and unnormalized** — trailing slash, `.git` suffix, and `ssh://` vs `https://` are distinct.
- **It restricts adding but does not register** — pair with `extraKnownMarketplaces` (allowlist alone registers nothing). Enforcement runs before any network/FS op, on add and on install/update/refresh/auto-update; pre-existing non-matching marketplaces are refused. Same applies to `blockedMarketplaces`.
- Block `@skills-dir` plugins fleet-wide via `strictKnownMarketplaces` or `{"source":"skills-dir"}` in `blockedMarketplaces` — when blocked, `plugin init` fails before writing.
- Managed-scope plugins are read-only/update-only; users cannot modify or remove them.

### Local dev, `--plugin-dir`, and skills-dir plugins

```bash
claude --plugin-dir ./my-plugin          # load for the session without installing (repeatable; accepts .zip on v2.1.128+)
claude --plugin-url https://.../x.zip     # fetch+load a zipped plugin for that session only (repeatable / space-separated)
/reload-plugins                           # pick up edits; verify skills via /plugin:skill, agents via /agents, plus hook firing
claude plugin init my-tool                # scaffold at ~/.claude/skills/my-tool/ → auto-loads next session as my-tool@skills-dir
                                          # flags: --description --author --author-email --with <skills|agents|hooks|mcp|lsp|output-style|channel> -f; alias: new
claude plugin details <name>              # component inventory + Always-on (every session) & On-invoke token cost
```
`claude plugin details` is the way to **budget context** — Always-on tokens are added to every session by the listing text regardless of firing (computed via count_tokens for the active model). Review the **'Will install' inventory** (v2.1.145+), **'Context cost'** estimate (v2.1.143+), and **'Last updated'** (v2.1.144+) in the `/plugin` detail pane before installing.

**`--plugin-dir` precedence:** a local plugin overrides an installed same-named plugin for that session — **except** plugins that managed settings force-enable/force-disable, which `--plugin-dir` cannot override.

**Skills-directory plugins** (`<name>@skills-dir`): any folder under a skills dir containing `.claude-plugin/plugin.json` loads next session with no marketplace/install, discovered **in-place** (not copied). `~/.claude/skills/` = personal (every project); `<cwd>/.claude/skills/` = project scope, loads only after the workspace trust dialog. **Project-scope @skills-dir plugins load only from `.claude/skills/` of the launch directory and do NOT walk up to repo root** — launch from repo root or `/reload-plugins` after `cd`. Project-scope plugins are more restricted: MCP servers go through per-server approval, LSP servers start only after workspace trust, and **background monitors do not load at all** (personal-scope has none of these restrictions).

### Gotchas

- **Removing a marketplace from its last scope uninstalls every plugin installed from it.** Use `marketplace update` to refresh without losing plugins.
- **Security:** plugins run arbitrary code with your user privileges. Anthropic does not verify bundled MCP servers/files even on the community marketplace (it only passes automated screening).
- **No file references outside the plugin dir** — `../shared-utils` breaks post-install because external files aren't copied to the cache. All component paths must be relative and start with `./`. Share within a marketplace via **symlinks**: within-plugin-dir = preserved as relative symlink; elsewhere-in-same-marketplace = dereferenced (copied); **outside-marketplace = SKIPPED** for security. For `--plugin-dir`/local installs only symlinks within the plugin's own dir survive.
- **`${CLAUDE_PLUGIN_ROOT}` changes every update** and the old dir is cleaned ~7 days later — never write persistent state there; use `${CLAUDE_PLUGIN_DATA}`.
- **Components inside `.claude-plugin/` are silently ignored** — only `plugin.json` belongs there; misplacement loads the plugin but skills/agents/hooks go missing.
- **Setting `version` in `plugin.json` pins it** — pushing commits without bumping does nothing for existing users (same version = cached copy kept). Omitting `version` means every commit is a "new version," causing constant updates.
- **`version` in `plugin.json` silently overrides the marketplace entry** — a stale manifest masks your intended release version.
- **Project/user `.claude/agents/` override same-named plugin agents** — leftover originals after migration shadow the plugin version.
- **Plugin `settings.json` honors only `agent` and `subagentStatusLine`** — other keys are silently ignored.
- **Plugin-shipped agents cannot use `hooks`, `mcpServers`, or `permissionMode` frontmatter** (silently unsupported, for security).
- **A plugin-root `CLAUDE.md` is not loaded as context** — ship instructions as a skill.
- **Relative-path plugin sources only resolve when the marketplace was added via git.** Adding via a direct URL to marketplace.json downloads only that file, so `./plugins/...` sources fail with "path not found" — use github/npm/git-url sources for URL-distributed marketplaces.
- **URL-based marketplaces have limitations vs Git-based ones** and can produce "path not found" for relative-path plugins — prefer Git-based for team distribution.
- **`strictKnownMarketplaces` is exact and unnormalized** — trailing slash, `.git`, and ssh-vs-https differ; a literal-URL allowlist can silently reject valid clones. Use `hostPattern`.
- **Release channels resolving to the same version string are treated as identical** and the update is skipped — each channel must resolve to a distinct version/SHA.
- **Even the official marketplace produces no relevance suggestions until allowlisted** in `pluginSuggestionMarketplaces`; for non-official marketplaces, allowlisting the name without declaring its source is ignored.
- **`manifestDeps` paths are NOT separator-normalized** (unlike `cwd`/`filesRead`) — a forward-slash-only `file` regex silently fails on Windows; a start-anchored pattern never matches an absolute path.
- **`cli` only captures the leading token** per shell invocation — commands after `&&`, in pipes, or as args are never recorded; declare the literal leading command or use a different signal.
- **`filesRead`/`manifestDeps` match all recorded session file state** — including files Claude wrote/edited and auto-loaded CLAUDE.md, not just files the user opened. Manifests >512 KB are silently skipped.
- **Install hints only fire for the official marketplace**; in-app submissions route to the community marketplace, which the hint protocol ignores.
- **Install prompts auto-dismiss as No after 30s** and a plugin is prompted **once ever** (per plugin) and at most once per session across all CLIs — so a missing prompt isn't a misconfiguration.
- **Cross-marketplace dependencies are default-denied** and trust does not chain through intermediates — only the root marketplace's `allowCrossMarketplaceDependenciesOn` is consulted.
- **Enabling a plugin force-writes `true` for its dependencies** even if a dependency declares `defaultEnabled: false`.
- **For npm-sourced plugins the version constraint does not pick the fetched version** (tag resolution is git-only); a mismatch disables the plugin with `dependency-version-unsatisfied`.
- **`range-conflict`:** incompatible ranges (`~2.1` vs `~3.0`) fail the second install; existing plugin/dependency left unchanged.
- **Pre-release tags are excluded** unless the range opts in with a suffix like `^2.0.0-0`.
- **Enable fails (not warns) if a dependency is `false` at a higher-precedence scope** than your target — enable it at that scope or pass `--scope`.
- **`claude plugin prune` only removes auto-installed deps** (never your direct installs) and in non-TTY exits without removing unless `-y` is passed.
- **`CLAUDECODE` leaks** into tmux, stdio MCP subprocesses, and IDE terminals; **`CLAUDE_CODE_CHILD_SESSION` is captured** by long-lived processes started inside a session — both can appear set where a human is present.
- **`/reload-plugins` with non-deferred MCP servers invalidates the prompt cache** (extra cost); v2.1.163+ refuses without `--force`.
- **Mid-session plugin updates:** hooks/monitors/MCP/LSP keep using the OLD version path until `/reload-plugins` — and **monitors require a full session restart**. Disabling a plugin mid-session does **not** stop already-running monitors (they stop at session end).
- **Project-scope plugin monitors don't load at all**; their MCP/LSP servers require trust/approval gates.
- **LSP/monitor plugins depend on external binaries** (gopls, rust-analyzer, pyright) installed per machine — the plugin doesn't bundle them; missing binaries fail silently-ish ("Executable not found in $PATH" in the `/plugin` Errors tab). On memory pressure, `/plugin disable <name>` the heavy LSP and fall back to built-in search.
- **Hook event names are case-sensitive** (`PostToolUse`); non-executable hook scripts silently fail (`chmod +x`).
- **`.zip` for `--plugin-dir` requires v2.1.128+**; `defaultEnabled` requires v2.1.154+; dependency constraints v2.1.110+; dependency cascade v2.1.143+; `prune` v2.1.121+; monitors v2.1.105+.
- **In non-interactive scripts before the first interactive launch, `claude-plugins-official` is NOT auto-registered** — add it explicitly.
- **Community-marketplace approval isn't immediate** — the catalog syncs nightly.
- **Keychain (sensitive `userConfig` + OAuth) has a ~2KB total budget** — keep secrets small.
- **Non-kebab-case plugin names** load in Claude Code but are rejected by Claude.ai marketplace sync.
- **`$schema` in marketplace.json is editor-tooling only** — ignored at load.


---

## Automation, CI & integrations

### CI/CD, code review & headless

This section covers running Claude Code unattended and in pipelines: the managed **Code Review** GitHub service, **GitHub Actions** / **GitHub Enterprise Server (GHES)** / **GitLab CI/CD** integrations, **headless (`-p`) CLI** flags for scripting, scheduled/background automation, and the **Chrome** browser integration.

---

## Headless / scripted CLI (the foundation for all automation)

`claude -p "<query>"` (alias `--print`) runs one query via the Agent SDK and exits — this is non-interactive/headless mode. Many flags are **print-mode only** and silently no-op in interactive mode.

### Auth for CI

| Command | Purpose |
|---|---|
| `claude setup-token` | Mint a long-lived OAuth token for CI/scripts, printed to terminal, never saved. **Requires a Claude subscription.** |
| `claude auth login --console` | Sign in with Anthropic Console for **API-usage billing** instead of subscription billing. Other flags: `--email` (pre-fill), `--sso` (force SSO). |
| `claude auth status` | Outputs JSON (`--text` for human-readable). Exit `0` if logged in, `1` if not. |

Never embed interactive auth in CI — use `setup-token` (subscription billing) or `auth login --console` (Console API billing).

### Output & cost/loop control (print-mode only)

```
--output-format text|json|stream-json     # force machine-parseable output
--input-format text|stream-json
--max-turns N                             # cap agentic turns; errors when reached; no limit by default
--max-budget-usd N                        # cap dollar spend before stopping
--json-schema '<schema>'                  # return validated JSON matching a JSON Schema
--no-session-persistence                  # don't save/resume the session
```

Bound runaway cost/loops in pipelines with `--max-turns` + `--max-budget-usd`; force `--output-format json` (or `stream-json` for streaming). `CLAUDE_CODE_SKIP_PROMPT_HISTORY` env var disables session persistence in **any** mode.

### Scripted-start speedups

```
--bare        # skip discovery of hooks/skills/plugins/MCP/auto-memory/CLAUDE.md.
              # Retains Bash, file read, file edit. Sets CLAUDE_CODE_SIMPLE.
--safe-mode   # (v2.1.169+) disable all customizations for troubleshooting;
              # auth/model/built-in tools/permissions stay normal. Sets CLAUDE_CODE_SAFE_MODE.
```

For shared **multi-user** scripted workloads, add `--exclude-dynamic-system-prompt-sections` with `-p` so per-machine sections (cwd, env, memory paths, git-repo flag) move into the first user message — this preserves **prompt-cache reuse** across users/machines. (Only applies with the default system prompt.)

When config looks broken, start with `--safe-mode` to confirm whether a customization is the cause — note **managed policy still applies**, so it isolates *user/project* customizations specifically.

### Tool & MCP scoping (get these exactly right)

| Flag | Effect |
|---|---|
| `--allowedTools` / `--allowed-tools` | Auto-approves matching tools without prompting (permission-rule syntax, e.g. `Bash(git log *)`). Does **NOT** restrict which tools are *available*. |
| `--disallowedTools` / `--disallowed-tools` | **Bare name** (`Edit`, `*`, `mcp__*`) removes the tool from context entirely; **scoped rule** (`Bash(rm *)`) leaves the tool available but denies matching calls. |
| `--tools` | Restricts available **built-in** tools: `""` disables all, `"default"` enables all, or `"Bash,Edit,Read"`. Does **NOT** affect MCP tools. |
| `--mcp-config <files/json>` | Load MCP servers from JSON files/strings (space-separated). |
| `--strict-mcp-config` | Use **only** servers from `--mcp-config`, ignoring all other (user-level) MCP config. |

To deny **all MCP**: `--disallowedTools "mcp__*"`, or `--strict-mcp-config` **without** `--mcp-config` (no servers load). Pin a team's MCP set with `--mcp-config <file>` + `--strict-mcp-config`.

```
claude mcp login <name> / logout <name>   # run/clear a server's OAuth flow (HTTP/SSE/connector). v2.1.186+.
                                          # --no-browser prints the auth URL for SSH.
```

### Permission modes

```
--permission-mode default|acceptEdits|plan|auto|dontAsk|bypassPermissions   # overrides defaultMode
--dangerously-skip-permissions            # == --permission-mode bypassPermissions
--allow-dangerously-skip-permissions      # adds bypassPermissions to the Shift+Tab cycle WITHOUT starting in it
--permission-prompt-tool <mcp-tool>       # MCP tool that handles permission prompts non-interactively
```

`--enable-auto-mode` was **removed in v2.1.111** — use `--permission-mode auto`.

### Settings, system prompt & directories

| Flag | Effect |
|---|---|
| `--settings <file-or-json>` | Override only the keys you set for the session; omitted keys keep file values (**not** a full replacement). |
| `--setting-sources user,project,local` | Comma-separated list of which setting sources to load. |
| `--add-dir <dir>` | Adds read/edit working dirs, but most `.claude/` config is **NOT** discovered from them — persist via `permissions.additionalDirectories`. |
| `--append-system-prompt` / `--append-system-prompt-file` | Layer extra rules while **preserving** default tool guidance + safety instructions. Combine with either replace flag. |
| `--system-prompt` / `--system-prompt-file` | **Full replace** — drops ALL default tool guidance and safety instructions; you own safety. Mutually exclusive with each other. Use only for non-coding pipeline agents. |

Persist team conventions in `CLAUDE.md` and shareable personas in **output styles** rather than per-invocation system-prompt flags.

### Model selection

```
--model sonnet|opus|haiku|fable|<full>    # overrides `model` setting and ANTHROPIC_MODEL env var
--fallback-model a,b,c                    # comma-separated chain when primary overloaded; overrides fallbackModel
--effort low|medium|high|xhigh|max        # overrides effortLevel; does not persist; availability per-model
```

### Sessions, worktrees, background agents

```
claude -c / --continue                    # load most recent conversation in cwd (incl. /add-dir sessions)
claude -r "<session>" / --resume          # resume by ID/name or show picker
--fork-session                            # with resume/continue: new session ID instead of reusing
--session-id <UUID> | --name/-n <name>    # require valid UUID / set resumable display name
--worktree / -w <name|#PR|PR-URL>         # isolated git worktree at <repo>/.claude/worktrees/<name>
--bg [--exec <cmd>] [--agent <name>]      # start background agent, return immediately
--agents '<json>'                         # define custom subagents (subagent frontmatter fields + `prompt`)
```

Manage background jobs: `claude attach/logs/respawn/rm/stop`, `claude agents` (`--json`, `--cwd`, `--all`), `claude daemon status/stop`.

```
--plugin-dir <path>   --plugin-url <url>  # load a plugin (dir/.zip/URL) for the session only; repeat per plugin
--debug "api,hooks"|"!statsig,!file"      # debug with category filters
--debug-file <path>                       # takes precedence over CLAUDE_CODE_DEBUG_LOGS_DIR
claude project purge [path]               # delete all local state; flags --dry-run, -y/--yes, -i, --all
```

Version-gated: `claude mcp login/logout` (v2.1.186+), `--safe-mode` (v2.1.169+), `--advisor` (v2.1.98+).

---

## Managed Code Review (GitHub App service)

A research-preview service (**Team/Enterprise plans only**) that posts inline PR review comments. An admin enables it **once** for the org at `claude.ai/admin-settings/claude-code` (needs Claude-org admin + permission to install GitHub Apps). Setup installs the Claude GitHub App requesting **Contents R/W, Issues R/W, Pull requests R/W** (Code Review itself only uses Contents read + PRs write; broader perms support GitHub Actions).

### Review Behavior (per-repo dropdown)

| Mode | Behavior | Use for |
|---|---|---|
| `Once after PR creation` | One review on PR open | — |
| `After every push` | Auto-resolves threads when issues are fixed; **most reviews, highest cost** | Evolving PRs you want auto-managed |
| `Manual` | Runs only on `@claude review` / `@claude review once` comments | **High-traffic repos** — opt in specific ready PRs |

Choose by cost/traffic tradeoff. Use `@claude review once` for long-running PRs with frequent pushes or one-off second opinions, to avoid subscribing the PR to per-push cost.

- `@claude review` — starts a review **and subscribes** the PR to push-triggered reviews (accrues cost on every later push).
- `@claude review once` — single review, no subscription.
- Manual triggers must be a **top-level PR comment** (not inline on a diff line), command **at the start** of the comment, `once` on the same line for one-shot. Requires **owner/member/collaborator** access; PR must be open.
- Manual triggers run on **draft** PRs; automatic triggers do **not**.

### Findings & gating

Severity markers: 🔴 **Important** (fix before merge), 🟡 **Nit** (minor, non-blocking), 🟣 **Pre-existing** (already in codebase, not introduced by PR).

Code Review **never approves or blocks** — the `Claude Code Review` check always completes **neutral**, so it can't gate via branch protection. **Build your own gate** by parsing the machine-readable last line of the check run:

```
gh api repos/OWNER/REPO/check-runs/CHECK_RUN_ID \
  --jq '.output.text | split("bughunter-severity: ")[1] | split(" -->")[0] | fromjson'
# -> {"normal":2,"nit":1,"pre_existing":0}   ("normal" = count of Important findings)
```

By default reviews focus on **correctness** (production-breaking bugs), not formatting or test coverage.

### Cost & billing

- ~**$15–25 per review**, scaling with PR size/complexity/verification; ~20 min average; queued if one is already running on the PR.
- Billed via **usage credits, separately** — does **NOT** count against included plan usage; appears on the **Anthropic bill even if the org uses Bedrock/Vertex** elsewhere.
- Set a monthly spend cap at `claude.ai/admin-settings/usage` (service "Claude Code Review"); when hit, reviews are skipped with a PR comment until next billing period or an admin raises it.
- Usage dashboard: `claude.ai/analytics/code-review` (PRs reviewed, weekly cost, auto-resolved count, per-repo). Cost figures are **estimates**, not invoice-accurate.

### REVIEW.md (control review behavior)

A **repo-root `REVIEW.md`** is injected **verbatim into every review agent's system prompt as highest-priority instructions**, overriding default guidance. It lands more reliably than rules buried in a long CLAUDE.md. Keep it **short** (length dilutes the rules that matter); put general project context in CLAUDE.md, review-behavior changes in REVIEW.md. Effective patterns:

- **Redefine 🔴 Important** for the repo type — docs/config/prototype want a narrower definition than production code.
- **Cap nit volume** — e.g. "report at most five nits, mention the rest as a count."
- **Skip rules** for generated code, lockfiles, vendored deps, machine-authored branches, and anything CI already enforces (lint, spellcheck). For partial-scrutiny paths set a higher bar: "in `scripts/`, only report if near-certain and severe."
- **Verification bar** — "behavior claims need a `file:line` citation, not an inference from naming" (cuts false positives).
- **Re-review convergence** — "after the first review, suppress new nits and post Important only" (stops one-line fixes triggering style-only loops).

CLAUDE.md is also read as project context (**at every directory level**; subdir rules apply only to files under that path); newly introduced violations are flagged nit-level, **bidirectionally** (a PR that makes a CLAUDE.md statement outdated gets flagged to update docs).

### Local `/code-review` command (no GitHub App)

Reviews a diff in any session. Default scope: branch commits ahead of upstream + uncommitted working-tree changes.

```
/code-review [target] [effort] [--comment] [--fix]
```

- **target**: file path, PR number, branch name, or ref range (`main...my-feature` reviews the committed diff that PR would contain, regardless of upstream config).
- `--comment` posts findings as inline PR comments; `--fix` applies findings to the working tree.
- **effort**: lower → fewer high-confidence findings; high→max → broader coverage, may include uncertain findings; no arg → session's current effort.
- `/code-review ultra --fix` runs the deeper **cloud ultrareview** (scope: current branch vs repo default branch + uncommitted + staged) then applies fixes.

Run `/code-review --fix`/`--comment` before opening a PR to catch issues without spending on a managed review.

### Feedback

Click 👍/👎 on findings — counts are collected **post-merge** to tune the reviewer (they do **not** trigger re-review). Replying to an inline comment does nothing.

---

## GitHub Actions integration

Action: `anthropics/claude-code-action@v1` (v1.0 GA, built on the Claude Agent SDK, runs on GitHub-hosted runners). Quick setup: run `/install-github-app` in the Claude Code terminal (needs repo admin; **direct Claude API only**, not Bedrock/Vertex). The Claude GitHub app (`github.com/apps/claude`) needs **Contents R/W, Issues R/W, Pull requests R/W**.

- Workflow file → `.github/workflows/`; template at `examples/claude.yml`.
- API key → GitHub repo secret **`ANTHROPIC_API_KEY`**, referenced `anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}`. **Never hardcode keys.**
- Default trigger phrase **`@claude`** (must be `@claude`, **not** `/claude`); override via `trigger_phrase`.
- v1 **auto-detects** interactive mode (responds to `@claude` mentions) vs automation mode (runs immediately with a `prompt`); the beta `mode:` input is removed.

### v1 inputs

```
prompt              # optional; plain text OR a skill name
claude_args         # CLI passthrough (any Claude Code CLI args)
plugin_marketplaces # newline-separated Git URLs
plugins             # newline-separated plugin names
anthropic_api_key   # required for direct API
github_token
trigger_phrase
use_bedrock / use_vertex
```

`claude_args` examples: `--max-turns` (**default 10**), `--model` (e.g. `claude-sonnet-4-6`), `--mcp-config /path/to/config.json`, `--allowedTools` (comma-separated; `--allowed-tools` also works), `--disallowedTools`, `--append-system-prompt`, `--debug`.

### Beta → v1 migration (old workflows break otherwise)

Change `@beta`→`@v1`, **delete `mode:`**, and move inputs into `claude_args`:

| Beta input | v1 |
|---|---|
| `direct_prompt` | `prompt` |
| `custom_instructions` | `claude_args: --append-system-prompt` |
| `max_turns` | `claude_args: --max-turns` |
| `model` | `claude_args: --model` |
| `allowed_tools` | `claude_args: --allowedTools` |
| `disallowed_tools` | `claude_args: --disallowedTools` |
| `claude_env` | `settings` JSON format |
| `override_prompt` | `prompt` with GitHub variables |

### Required workflow `permissions`

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write   # required for OIDC with Bedrock/Vertex
```

Gate the job with `if: contains(github.event.comment.body, '@claude')` across `issue_comment`, `pull_request_review_comment`, and `issues` events so it doesn't run on every event.

### Skills in Actions

- **Repo skill** (`.claude/skills/`): run `actions/checkout` **before** the action step, pass `/skill-name` as `prompt`.
- **Plugin skill**: install via `plugin_marketplaces` + `plugins`, pass namespaced `/plugin-name:skill-name`. Example: `plugin_marketplaces: "https://github.com/anthropics/claude-code.git"`, `plugins: "code-review@claude-code-plugins"`, prompt `/code-review:code-review ...`.

### Enterprise auth (Bedrock/Vertex — no `/install-github-app`)

Prefer a **custom GitHub App + OIDC/Workload Identity Federation** over static credentials; use a dedicated, repository-scoped service account/role with minimum permissions. `anthropic_api_key` is required **only** for direct API; for Bedrock/Vertex you supply `github_token` + cloud credentials.

- **Bedrock** (OIDC, no static keys): provider URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`, secret `AWS_ROLE_TO_ASSUME`, input `use_bedrock: "true"`. **Model IDs need a region prefix**, e.g. `us.anthropic.claude-sonnet-4-6`.
- **Vertex** (WIF): secrets `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` (needs only `Vertex AI User` role); input `use_vertex: "true"`; env `ANTHROPIC_VERTEX_PROJECT_ID`, `CLOUD_ML_REGION`, `VERTEX_REGION_CLAUDE_4_5_SONNET`.
- **Custom App auth**: `actions/create-github-app-token@v2` with secrets `APP_ID` + `APP_PRIVATE_KEY` (.pem contents); pass `github_token: ${{ steps.app-token.outputs.token }}`.

### Cost & behavior control

- Cap iterations with `--max-turns` in `claude_args`; set workflow-level `timeout` to avoid runaway jobs; use GitHub **concurrency** controls to limit parallel runs.
- Use specific `@claude` commands (not vague ones) to reduce API calls/tokens; use **issue templates** for better context.
- Per-workflow tuning → `prompt` input; project-wide standards → `CLAUDE.md`.
- GitHub Actions **minutes** + Claude **API tokens** are billed separately (tokens scale with prompt/response length, complexity, codebase size). Limit `permissions` to the minimum; review suggestions before merging.

---

## GitHub Enterprise Server (GHES)

GHES support is **Team/Enterprise only**. An admin connects the GHES instance **once**; afterward developers use GHES repos with **no per-repo/per-developer config**. Sessions run on **Anthropic infrastructure (cloud)** — the repo is cloned remotely and changes pushed back to a branch (not local).

**Supported on GHES:** Claude Code on the web, Code Review, Claude Security (Enterprise public beta, `claude.ai/security`), Teleport sessions, Plugin marketplaces, Contribution metrics, GitHub Actions (manual workflow setup).

### Admin setup

At `claude.ai/admin-settings/claude-code` (needs Claude-org admin + permission to create GitHub Apps on the GHES instance). Start by installing the GitHub App on a **subset of repos**, add more later. Guided setup generates a GitHub App manifest and redirects to GHES to create the app in one click; if the redirect is blocked by network policy, use **"Add manually"**. Manual entry: hostname, OAuth client ID + secret, GitHub App ID, client ID, client secret, webhook secret, private key. For self-signed/private CA, paste the CA cert into the optional field when entering the hostname.

GitHub App permissions (set by manifest): **Contents R/W, Pull requests R/W, Issues R/W, Checks R/W, Actions (read), Repository hooks R/W, Metadata (read)**. App events: `pull_request`, `issue_comment`, `pull_request_review_comment`, `pull_request_review`, `check_run`. Contribution metrics are delivered via webhooks (needs Repository hooks R/W).

### Developer usage

- Hostname is **auto-detected** from the git remote — no developer config. Start a session: `claude --remote "<task>"`.
- **Teleport** a web session into the local terminal: `claude --teleport` (verifies you're in a checkout of the same GHES repo before fetching the branch + loading history).
- **GitHub MCP server does NOT work on GHES** — pre-authenticate `gh` per developer: `gh auth login --hostname <ghes-host>`, then Claude drives `gh` commands.
- `/install-github-app` is **github.com-only** — for GHES adapt `examples/claude.yml` manually for Actions.

### Plugin marketplaces on GHES

- `owner/repo` shorthand **always resolves to github.com** — for GHES use the **full git URL**: `/plugin marketplace add git@github.example.com:platform/claude-plugins.git` (HTTPS also works).
- Distribute org-wide via `extraKnownMarketplaces` in managed settings: `{"source":{"source":"git","url":"git@github.example.com:..."}}` (appears without manual developer `add`).
- Lock sources with `strictKnownMarketplaces` using a single `hostPattern` entry instead of enumerating repos: `{"source":"hostPattern","hostPattern":"^github\\.example\\.com$"}`.

### Networking

The GHES instance must be reachable from Anthropic infrastructure (to clone + post comments). **Allowlist the Anthropic API IP addresses on the GHES firewall up front** to avoid web-session/code-review clone timeouts.

---

## GitLab CI/CD

**Beta, maintained by GitLab** (not Anthropic); support via GitLab issue tracker `gitlab.com/gitlab-org/gitlab/-/issues/573776`. Built on the Claude Code CLI + Agent SDK.

Setup: add a **masked** CI/CD variable `ANTHROPIC_API_KEY` (Settings → CI/CD → Variables) and a `claude` job in `.gitlab-ci.yml`. Install the CLI in-job (example image `node:24-alpine3.21`):

```
curl -fsSL https://claude.ai/install.sh | bash
claude -p "<prompt>" --permission-mode acceptEdits \
  --allowedTools "Bash Read Edit Write mcp__gitlab" --debug
```

Trigger/context passed via **`AI_FLOW_*`** variables: `AI_FLOW_INPUT` (the prompt, read by `claude -p`), `AI_FLOW_CONTEXT`, `AI_FLOW_EVENT`.

- Trigger mention is literally **`@claude`** (not `/claude`).
- There is **no built-in comment listener** — Claude doesn't auto-respond. Wire a trigger yourself: a manual run, a `merge_request_event` rule, or a **project webhook for "Comments (notes)"** plus a listener that calls the pipeline trigger API with `AI_FLOW_INPUT`/`AI_FLOW_CONTEXT` when a comment contains `@claude`.
- **Enterprise (Bedrock/Vertex):** use the **"Manual setup (recommended for production)"** path (not quick setup). Prefer provider-specific OIDC/WIF (Bedrock IAM role, Vertex WIF) over long-lived static keys; never commit keys/cloud creds — use masked (and protected) CI/CD variables. Restrict the cloud trust policy to your specific GitLab project + protected refs; attach least-privilege perms (Bedrock invoke APIs / Vertex roles) to a dedicated service account.

---

## Self-hosted vs managed

For self-hosted CI instead of the managed Code Review service, use the **GitHub Actions**, **GitLab CI/CD**, or **GHES** integrations above.

---

## Scheduled & background automation (Desktop tasks, Cloud routines, /loop)

Three scheduling mechanisms:

| Mechanism | Runs on | Machine-off OK | Min interval | Permissions | File access |
|---|---|---|---|---|---|
| **Cloud routines** | Anthropic infra | Yes | **1 hour** | No prompts (autonomous) | Fresh clone, no local files |
| **Desktop scheduled tasks** | Your machine | No | **1 minute** | Configurable per task | Local |
| **`/loop`** | Your machine (session-scoped) | No | **1 minute** | Session | Session |

**For team unattended automation that must run reliably, prefer Cloud routines** — Desktop tasks silently skip when the machine sleeps or the app is closed. Use Cloud routines when a task must trigger on **API calls or GitHub events**, or run while the computer is off.

### Desktop scheduled tasks

- Run only while the Desktop app is **open AND the computer is awake**; sleeping through a scheduled time **skips** the run (closing the laptop lid sleeps it even with the app open). Enable **"Keep computer awake"** (Settings → Desktop app → General) for must-run tasks.
- Each task's prompt: `~/.claude/scheduled-tasks/<task-name>/SKILL.md` (or under `CLAUDE_CONFIG_DIR`), YAML frontmatter (name, description) + prompt body; changes take effect next run. **Schedule, folder, model, enabled state are NOT in SKILL.md** — change via the Edit form or by asking Claude. Task Name → lowercase kebab-case folder name, must be unique.
- Schedule presets: Manual (Run now only), Hourly, Daily (default 9:00 AM local), Weekdays, Weekly. Other intervals (every 15 min, monthly, one-time future) — set by asking Claude in plain language.
- **Permissions:** allow rules from `~/.claude/settings.json` apply to task sessions (plus per-task mode). After creating, run **"Run now"** once and approve each prompt with **"always allow"** so future runs don't stall; approvals are reviewable/revocable on the task detail page's "Always allowed" panel. In **Ask mode**, hitting an un-permissioned tool **stalls indefinitely** until you approve in the sidebar.
- **Worktree toggle:** gives each run its own isolated Git worktree. By default tasks run against the working directory's **current state including uncommitted changes** — enable the toggle for tasks that edit code.
- A running task can modify its own schedule/prompt via the `update_scheduled_task` MCP tool.
- Desktop checks the schedule every minute; each task gets a small **deterministic delay** (few minutes, same offset each run) to stagger API traffic. **Add timing guardrails in the prompt** since catch-up runs can fire far off-time (e.g. "Only review today's commits; if after 5pm, just post a summary of what was missed").
- **Missed-run catch-up:** on app start/wake, Desktop starts exactly **ONE** catch-up run for the most recently missed time in the last 7 days; older missed runs are discarded (a daily task that missed six days runs once).
- A folder must be set/trusted before a task can be saved. Deleting a task archives its sessions; "Also delete files on disk" additionally removes the SKILL.md + data.
- MCP: Desktop tasks use config files + connectors; Cloud routines configure connectors per task; `/loop` inherits MCP from the session.

---

## Chrome browser integration

Enabled per-session with `claude --chrome` or `/chrome` inside a session. `/chrome` checks connection status, manages permissions, reconnects the extension, and (if multiple browsers connected) prompts to pick one; select **"Enabled by default"** to avoid passing `--chrome` each time.

- **Requirements:** Claude in Chrome extension **v1.0.36+**, Claude Code **v2.0.73+**, a **direct Anthropic plan** (Pro/Max/Team/Enterprise).
- **NOT available** via Bedrock/Vertex/Foundry (need a separate claude.ai account). Works only with **Google Chrome and Microsoft Edge** — **not Brave, Arc, other Chromium browsers, or WSL**.
- Claude shares the **browser's existing login state** — it can access any site you're signed into without API connectors (meaningful blast-radius concern for shared/sensitive accounts). On login pages/CAPTCHAs it pauses for manual handling. Browser actions run in a **visible** Chrome window; Claude opens new tabs.
- Tools are exposed as an MCP server named **`claude-in-chrome`** (`/mcp` → select it for the full list).
- **Site-level permissions live ONLY in the Chrome extension settings**, not in `settings.json` — they are **not** managed by Claude Code's permission/managed-policy system.
- First enablement installs a native messaging host config `com.anthropic.claude_code_browser_extension.json`, read by Chrome at startup; **restart Chrome** if the extension isn't detected.

**Context/cost:** always-on browser tools consume context. Don't enable Chrome by default if context budget matters — pass `--chrome` only when needed. When reading console logs, tell Claude **specific patterns/error types** to look for rather than dumping all output.

---

### Gotchas

- **Code Review never blocks merges** — the check always completes **neutral**; you must build your own gating (parse the `bughunter-severity:` JSON). GitHub's **"Re-run" button does NOT retrigger** it, and failed/timed-out reviews don't auto-retry — re-trigger with `@claude review once` or a new push.
- **`@claude review` silently subscribes** the PR to per-push reviews (cost on every push) — use `@claude review once` to avoid it.
- **Acting on a finding requires fixing code + pushing** (or `@claude review once`) — replying to an inline finding comment does nothing; 👍/👎 don't trigger re-review.
- **REVIEW.md is pasted verbatim** — `@import` syntax is **NOT** expanded and referenced files are **NOT** pulled in; inline all rules.
- Manual trigger commands **fail** if posted inline on a diff line, not at the start of the comment, or by someone without owner/member/collaborator access.
- Code Review is **unavailable with Zero Data Retention**, is **Team/Enterprise only**, and **bills to Anthropic even on Bedrock/Vertex** orgs.
- If issues show in the check run but **no inline comments appear** (e.g. you pushed mid-review), findings may live only in the check run Details table, Files-changed annotations, or an "Additional findings" section of the review body.
- **`/code-review` was renamed from `/simplify`** at v2.1.147; from **v2.1.154 `/simplify` is cleanup-only** (no bug-hunting) — scripts relying on `/simplify` for bugs must switch to `/code-review --fix`. Reuse/efficiency cleanups in local `/code-review` need **v2.1.151+**.
- **Trigger must be exactly `@claude`** (or your configured `trigger_phrase`) — `/claude` does **NOT** work (true for Actions, GHES, and GitLab).
- **CI may not run on Claude's commits** unless you use the GitHub App (or a custom app) — commits by the default Actions user don't trigger downstream workflows.
- **`id-token: write` is required for OIDC** (Bedrock/Vertex) — omitting it breaks cloud-provider auth.
- **Bedrock model IDs require a region prefix** (`us.anthropic.claude-sonnet-4-6`), unlike direct-API IDs.
- **You must `actions/checkout` before the action step** for repo-local skills in `.claude/skills/` to be available.
- **v1.0 breaks `@beta` workflows** — must change `@beta`→`@v1`, delete `mode:`, rename `direct_prompt`→`prompt`, and move `max_turns`/`model`/`custom_instructions`/`allowed_tools` into `claude_args`.
- **`/install-github-app` is direct-API + github.com only** — Bedrock/Vertex and GHES need full manual OIDC/admin setup.
- **GitHub MCP server silently fails on GHES** — fall back to the `gh` CLI.
- **Plugin marketplace `owner/repo` shorthand always resolves to github.com** — using it for a GHES repo fetches the wrong/no marketplace; full git URL is mandatory. A `/plugin marketplace add` **policy error** on a GHES URL means `strictKnownMarketplaces` is blocking it — admin must add a `hostPattern`.
- **GHES web-session clone failures** usually mean: admin setup incomplete, the GitHub App isn't installed on that repo, or the registered hostname doesn't match the git remote. **Timeouts** typically mean the GHES instance is unreachable from Anthropic infra (firewall not allowlisting Anthropic IPs).
- **GitLab has no built-in comment listener** — `@claude` mention flow depends on an **external webhook/listener you supply** (the doc's `/bin/gitlab-mcp-server` + `AI_FLOW_*` assume that scaffolding). If the job can't comment/open MRs, `CI_JOB_TOKEN` may lack permissions (use a PAT with `api` scope) and/or `mcp__gitlab` is missing from `--allowedTools`.
- **Headless flag confusion:** `--allowedTools` only auto-approves — it does **NOT** restrict the available set (use `--tools`). `--disallowedTools` bare-name removes from context, scoped rule only denies calls. `--tools` does **NOT** affect MCP tools. `--add-dir` grants file read/edit but does **NOT** discover `.claude/` config (use `permissions.additionalDirectories`).
- **Many flags are print-mode (`-p`) only** (`--max-turns`, `--max-budget-usd`, `--json-schema`, `--no-session-persistence`, `--init`, `--maintenance`) — no effect interactively. `claude --help` does **NOT** list every flag.
- **`--safe-mode` still applies managed-settings policy** (policy hooks, status line, file-suggestion); it differs from `--bare` by keeping auth/model/tools/permissions normal.
- **`--system-prompt`/`--system-prompt-file` drop ALL default tool guidance + safety instructions** — you own them. `--exclude-dynamic-system-prompt-sections` is **ignored** when those flags are set.
- **`--settings` overrides only the keys you set** — omitted keys keep file values (not a full replacement).
- **`--enable-auto-mode` was removed in v2.1.111** — use `--permission-mode auto`.
- **Resuming by session ID searches only the current project dir + its git worktrees**; the picker/name search also includes `/add-dir` sessions — an ID may not resolve from a different directory.
- Several CLI commands are **version-gated** (`claude mcp login/logout` v2.1.186+, `--safe-mode` v2.1.169+, `--advisor` v2.1.98+).
- **Chrome:** always-on browser tools silently increase context usage; it operates with your **live browser login** (blast radius); **not supported on WSL/Brave/Arc** or via Bedrock/Vertex/Foundry. A **blocking JS modal silently freezes** automation until a human dismisses it; an **idle service worker silently drops** the connection (recover via `/chrome` → "Reconnect extension"). Site permissions live **only** in the extension, not `settings.json`. On Windows, named-pipe **EADDRINUSE** conflicts occur when another process uses the same pipe — close other Chrome-using sessions and restart.
- **Desktop tasks silently skip** when the computer sleeps; default runs act on **dirty working-tree state** without the worktree toggle; a 9am task can fire at an unexpected time via catch-up + the deterministic startup offset; **only ONE catch-up run** fires for the most recent missed time (older missed runs discarded); an **Ask-mode task stalls indefinitely** on an un-permissioned tool; editing SKILL.md only changes prompt/name/description — schedule/folder/model/enabled need the Edit form or asking Claude.

### Chat, scheduling & CLI

This section covers running Claude Code unattended and at scale for a team: the four automation surfaces (Routines/cloud, Desktop scheduled tasks, in-session `/loop`/cron, and Slack), the headless `-p` CLI for CI/scripts, and the tool/permission model that governs what any of them can do.

### Choosing the right automation surface

For team automation that must run **unattended and reliably**, use **Routines (cloud)**, **GitHub Actions schedule triggers**, or **Desktop scheduled tasks** — NOT `/loop`, which only fires while a session is open and idle.

| Surface | Infra | Min interval | Needs open session? | Local file access | Permissions |
|---|---|---|---|---|---|
| **Cloud Routines** | Anthropic cloud (laptop can be closed) | 1 hour | No | No (fresh clone each run) | No prompts; all included connector tools usable |
| **Desktop scheduled task** | Local machine (must stay on) | 1 minute | No (machine on) | Yes | Configurable per-task |
| **`/loop` + in-session cron** | Local | 1 minute | Yes (must be running + idle) | Yes | Inherits session permissions + MCP servers |
| **GitHub Actions** | CI runner | — | No | per-job | per-job |

Use **Routines/Desktop tasks** (not `/loop`) when a recurring task must outlive the **7-day expiry** of in-session tasks.

---

## Cloud Routines

A **routine** is a saved Claude Code config (prompt + one or more repos + connectors) that runs autonomously on Anthropic-managed cloud infrastructure. Available on **Pro, Max, Team, Enterprise** plans with **Claude Code on the web enabled**.

### Governance & ownership (team-critical)

- **Routines are per-individual-account and NOT shared with teammates** — there is no team-shared routine despite Team/Enterprise gating. They count against **your** account's daily run allowance.
- **All routine actions appear as YOU** — commits/PRs carry your GitHub user; Slack/Linear/connector actions use your linked accounts. No service-identity separation.
- **Admin kill switch:** Team/Enterprise admins control availability org-wide via the **Routines toggle** at `claude.ai/admin-settings/claude-code`. When disabled, existing routines stop and members cannot create new ones. Server-side; cannot be overridden locally. Treat this as the governance lever.

### Creating & managing

Create/manage at `claude.ai/code/routines`, in the **Desktop app** (`Routines > New routine > Remote`; *Local* instead creates a Desktop scheduled task), or via CLI `/schedule`. All three surfaces write to the same cloud account and sync immediately.

```
/schedule           # creates SCHEDULED routines only
/schedule list
/schedule update    # set custom cron after picking closest preset
/schedule run
```

Adding **API or GitHub triggers requires editing the routine on the web** — CLI `/schedule` cannot.

### Triggers (combinable on one routine)

**1. Scheduled** — recurring or one-off future time. Presets: hourly, daily, weekdays, weekly. Times entered local, converted to UTC. Min interval **1 hour** (more-frequent expressions rejected); set custom cron via closest preset + `/schedule update`. One-off runs auto-disable after firing (UI marks "Ran"); they do NOT count against the daily run cap but DO draw down subscription usage.

**2. API** — `POST https://api.anthropic.com/v1/claude_code/routines/{trig_id}/fire`

- Headers: `Authorization: Bearer <token>`, `anthropic-beta: experimental-cc-routine-2026-04-01`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`.
- Returns `claude_code_session_id` and session URL. Available to claude.ai users only (not the Claude Platform API surface).
- Optional `text` body field is passed alongside the saved prompt but is **freeform and NOT parsed** — JSON arrives as a literal string. For run-specific context (alert body, failing log) put it in `text` but don't rely on structure.
- **Token:** scoped to triggering that one routine; **shown ONCE on generation, unretrievable**. Rotate/revoke via Regenerate/Revoke in the same modal; CLI cannot create or revoke tokens. Store it immediately in your alerting tool's secret store.
- Research preview behind the dated beta header; the two most recent previous beta versions keep working for migration.

**3. GitHub** — requires installing the **Claude GitHub App** on the repo (which also enables webhook delivery).

- **`/web-setup` grants clone access but does NOT install the app or enable webhooks** — GitHub triggers silently won't fire without the app.
- Supported events: **Pull request** (opened/closed/assigned/labeled/synchronized/etc.) and **Release** (created/published/edited/deleted); pick a specific action or all in the category.
- PR filter fields: Author, Title, Body, Base branch, Head branch, Labels, Is draft, Is merged. Operators: equals, contains, starts with, is one of, is not one of, **matches regex**. **ALL conditions must match.**
- **`matches regex` is anchored to the ENTIRE field** — use `.*hotfix.*` to match anywhere, or `contains` for literal substrings.
- Each matching event starts its **own independent session** (no reuse) — rapid PR updates fan out into many sessions and consume usage. During research preview, per-routine/per-account **hourly caps** drop excess events silently until the window resets.

### Repos, branches, connectors

- Each repo is cloned at the start of every run from its default branch. Claude creates `claude/`-prefixed branches. **Keep the `claude/`-prefix push restriction on by default**; enable **Allow unrestricted branch pushes** per-repo only when genuinely required.
- **Connectors are claude.ai account integrations.** All currently-connected connectors are **added by default** — remove unneeded ones to minimize the tool surface (included connectors can be used, **including destructive writes, with no per-run approval**).
- **Locally-added MCP servers (`claude mcp add`) do NOT appear as routine connectors** — they live on your machine. To use one cloud-side: add it as a connector at `claude.ai/customize/connectors`, or commit it in `.mcp.json` so it ships with the cloned repo.
- Connector traffic routes through Anthropic's servers, so connector hosts need NOT be in Allowed domains.

### Environment & network access

- **Default environment = Trusted network access:** a default allowlist (package registries, cloud provider APIs, container registries, common dev domains) is reachable; other hosts fail with **403** and header `x-deny-reason: host_not_allowed`.
- For internal/private services, pre-edit the environment **before running**: `Network access > Custom`, add domains to Allowed domains (optionally include the default package-manager list), or choose **Full** for unrestricted. New policy applies from the next run.
- Environment setup-script results are cached (the script does not re-run every session).

### Scope & cost

- **Scope each routine tightly** — only the repos, environment access, and connectors it actually needs. Make the prompt **fully self-contained** about task and success criteria, since runs are autonomous with no human in the loop.
- Routines draw down subscription usage like interactive sessions, **plus a per-account daily cap on runs started**. At the cap, runs are rejected unless usage credits are enabled (Settings > Billing), which continues on metered overage.

---

## In-session scheduling: `/loop` and cron tools

Requires Claude Code **v2.1.72+** (`claude --version`). Scheduled tasks (`/loop` and cron) are **session-scoped**: they live in the current conversation and stop when you start a new one.

### `/loop` (a bundled skill)

```
/loop 5m <prompt>          # fixed interval
/loop <prompt>             # self-paced — Claude picks interval each iteration
/loop                      # runs built-in maintenance prompt (or loop.md)
/loop 20m /review-pr 1234  # re-run a saved skill/command each iteration
```

- **Interval units:** `s` `m` `h` `d`. Seconds round up to the nearest minute (cron = 1-min granularity). Non-clean intervals (7m, 90m) round to the nearest valid cron step and Claude reports what it picked.
- **Self-paced `/loop`** (no interval) picks a delay **between 1 minute and 1 hour** after each iteration based on observed activity, printing the chosen delay and reason. **Prefer it for polling PRs/builds** — waits longer when quiet, shorter when active, saving tokens. It may use the **Monitor** tool to stream a background script's output instead of re-polling (more token-efficient).
- **Stop a waiting `/loop` with `Esc`** (clears the pending wakeup). Tasks scheduled by **asking Claude directly are NOT affected by `Esc`** — delete them explicitly.

### loop.md (team-shared default prompt)

`loop.md` replaces the built-in maintenance prompt for bare `/loop`. Lookup precedence:

| Precedence | Path | Scope |
|---|---|---|
| 1 (wins) | `.claude/loop.md` | Project — shared team default (e.g. keep a release branch green) |
| 2 | `~/.claude/loop.md` | User |

- Ignored when you supply a prompt on the command line. **Keep it under 25,000 bytes** or it is truncated. Edits take effect on the next iteration.

### Cron tools & natural-language scheduling

- `CronCreate` (5-field cron expr + prompt + recurs/once), `CronList` (IDs, schedules, prompts), `CronDelete` (cancel by ID). Each task has an **8-character ID**. A session holds up to **50 scheduled tasks**.
- One-time reminders: natural language ("remind me at 3pm to push the release branch") schedules a single-fire self-deleting task.
- **Cron syntax:** standard 5-field (minute hour day-of-month month day-of-week). Supports `*`, single values, steps `*/15`, ranges `1-5`, lists `1,15,30`. Day-of-week `0`/`7` = Sunday, `6` = Saturday. **Extended syntax (`L`, `W`, `?`, `MON`/`JAN` aliases) is NOT supported.**
- **vixie-cron OR semantics:** when both day-of-month and day-of-week are set, fires if **EITHER** matches.
- All cron times are **local timezone, not UTC** (`0 9 * * *` = 9am local).
- Scheduler checks every second; prompts fire **between turns, not mid-response**; if Claude is busy the prompt waits until the current turn ends.
- **Disable scheduling fleet-wide / in CI:** `CLAUDE_CODE_DISABLE_CRON=1` (cron tools and `/loop` become unavailable; already-scheduled tasks stop firing).

### Jitter & expiry

- **Jitter:** recurring tasks fire up to **30 min** after scheduled time (or up to half the interval for sub-hourly); one-shots at top/bottom of hour fire up to **90s early**. Offset is deterministic from task ID. **Avoid jitter by picking a minute that isn't `:00` or `:30`** (e.g. `3 9 * * *`).
- **Recurring tasks expire 7 days after creation** (fire one final time, then self-delete). Self-paced `/loops` also end 7 days after start. Use Routines/Desktop tasks for anything that must outlive this.

### Resume behavior

- `claude --resume` / `claude --continue` restores **unexpired** tasks: recurring tasks created within the last 7 days, and one-shots whose fire time hasn't passed. **Background Bash and Monitor tasks are NEVER restored on resume.**
- **Starting a fresh conversation silently clears ALL session-scoped scheduled tasks.**
- **No catch-up:** if scheduled time passes while Claude is busy, the task fires once when idle (not once per missed interval), and **never fires if the terminal/session is closed.**

---

## Headless CLI (`-p` / `--print`) for CI & scripts

`-p` (alias `--print`) runs Claude Code non-interactively. All CLI options work with it, e.g. `claude -p "..." --allowedTools "Read,Edit,Bash"`. This headless CLI is the Agent SDK via the CLI; Python/TypeScript SDK packages add structured outputs, tool-approval callbacks, and native message objects. Exact flags vary by `@anthropic-ai/claude-code` version — run `claude --help`.

### `--bare` (use for all CI/scripts)

`--bare` skips auto-discovery of hooks, skills, plugins, MCP servers, auto memory, and CLAUDE.md — only explicitly-passed flags take effect, **guaranteeing the same result on every machine**. Without it, `claude -p` **silently inherits local context** (a teammate's hook in `~/.claude`, a project `.mcp.json` MCP server), making results non-reproducible. Recommended for scripted/SDK calls and **will become the default for `-p`** in a future release.

In bare mode Claude has only **Bash, file read, file edit**. Pass other context via flags:

```
--append-system-prompt / --append-system-prompt-file   # add to default system prompt
--system-prompt                                          # fully replace it
--settings <file-or-json>
--mcp-config <file-or-json>
--agents <json>
--plugin-dir <path> / --plugin-url <url>
```

- **Bare mode skips OAuth and keychain** — auth must come from `ANTHROPIC_API_KEY` or an `apiKeyHelper` in the JSON passed to `--settings`, or the call fails. Bedrock/Vertex/Foundry use their usual provider credentials.

### Input/output

- Pipe data in rather than granting Bash read permission: `git diff main | claude -p ...` — smaller permission surface, no prompting.
- **Piped stdin capped at 10MB** (v2.1.128+); exceeding it exits non-zero with a clear error (not truncated). For larger inputs, write to a file and reference its path in the prompt.
- `--output-format`: `text` (default), `json`, `stream-json`.
  - `json` payload includes `total_cost_usd` + per-model cost breakdown (track spend per invocation here, not the dashboard), plus result, session ID, metadata.
  - `json` + `--json-schema '<JSON Schema>'` returns schema-conforming output in `structured_output`.
  - `stream-json` (newline-delimited JSON) needs `--verbose` and `--include-partial-messages` for real-time token streaming; each line is a JSON event.
- Parse with `jq`: `.result` (text), `.structured_output` (schema), `.session_id` (capture for `--resume`).

### Stream events (CI signals)

- `system/init` is the first stream event (model, tools, MCP servers, loaded `plugins`, `plugin_errors`) — **inspect `plugin_errors` to fail CI when a required plugin didn't load**. (`plugin_install` events precede it if `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` is set.)
- `system/api_retry` is emitted on retryable API failures (attempt, max_retries, retry_delay_ms, error_status, category, uuid, session_id).

### Sessions, skills, config in `-p`

- `--continue` resumes the most recent conversation; `--resume <session_id>` a specific one. **Session lookup is scoped to the current project directory + its git worktrees** — run `--continue`/`--resume` from the same directory.
- User-invoked skills/custom commands work by including `/skill-name` in the prompt string. **Interactive built-ins like `/login` do NOT work** in `-p`.
- From v2.1.181, change a setting in-prompt: `/config key=value` (e.g. `/config thinking=false`).

### Permissions in CI

- `--permission-mode dontAsk` denies anything not in `permissions.allow` or the read-only command set — good for locked-down CI.
- `--permission-mode acceptEdits` auto-approves file writes and basic fs commands (`mkdir`/`touch`/`mv`/`cp`) but **NOT arbitrary shell or network** (those still abort without an explicit allow rule). In CI examples, MR review/branch protection is the only human gate, so approval rules must be enforced.
- Scope `--allowedTools` tightly with prefix rules, e.g. `Bash(git diff *)` — **mind the space before `*`** (`Bash(git diff*)` also matches `git diff-index`).

### Background tasks under `-p`

- A background Bash task is terminated ~5s after Claude returns its final result (grace period) — long-running watch/dev processes won't survive a `-p` run.
- **Background subagents/workflows are exempt** from the 5s grace; `claude -p` waits for them, capped at **10 minutes** by default (v2.1.182+). Adjust with `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`, or `0` for no limit.

### GitLab CI / multi-provider notes

- Three providers: **Claude API** (`ANTHROPIC_API_KEY`), **Amazon Bedrock** (OIDC IAM role, no static keys), **Google Vertex AI** (Workload Identity Federation, no service-account keys). `ANTHROPIC_API_KEY` is **NOT used** for Bedrock/Vertex.
- Bedrock needs `AWS_ROLE_TO_ASSUME` + `AWS_REGION`; creds via `aws sts assume-role-with-web-identity` using the GitLab OIDC token (`CI_JOB_JWT_V2`/`CI_JOB_JWT_FILE`), default session 3600s. Bedrock model IDs carry region prefixes (e.g. `us.anthropic.claude-sonnet-4-6`).
- Vertex needs `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `CLOUD_ML_REGION` (e.g. `us-east5`); auth via `gcloud auth login --cred-file` with an external_account config.
- For GitLab API ops (comments, MRs): job uses `CI_JOB_TOKEN` by default, or a Project Access Token with `api` scope as masked `GITLAB_ACCESS_TOKEN`. The `mcp__gitlab` tool must be in `--allowedTools`; optional GitLab MCP server via `/bin/gitlab-mcp-server || true`.
- Common inputs: `prompt`/`prompt_file`, `max_turns`, `timeout_minutes`/job timeout. Claude reads root `CLAUDE.md` during CI runs.
- **Two billing dimensions stack:** runner compute minutes AND Anthropic/Bedrock/Vertex token costs — both scale with codebase size/task complexity.

### CI/CD best practices

- Keep root `CLAUDE.md` focused/concise (coding standards, review criteria) to cut token cost. Write specific issue/MR descriptions and `@claude` commands to reduce turns.
- Set `max_turns` and `timeout_minutes`; limit job concurrency; cache npm/package installs; limit job permissions and network egress; review Claude MRs like any contributor.
- Use different prompts per job type (review/implement/refactor) via `prompt`/`prompt_file`. Pick regional provider endpoints for latency/data-sovereignty.

---

## Claude Code in Slack

Requires **Pro/Max/Team/Enterprise** with Claude Code access (premium or Chat + Claude Code seats). Prerequisites: Claude Code on the web enabled, a GitHub account connected with **at least one authenticated repository**, and the Slack account linked to the Claude account.

### Setup & access control

- A Slack **workspace admin installs the Claude app** from the Slack App Marketplace (**app id `A08SF47R6P4`**); users then connect their Claude account via the App Home tab.
- Claude is **NOT auto-added to channels** — run `/invite @Claude` in each channel; Claude only responds to `@mentions` in channels it's been added to.
- **Channel invites + channel access ARE the team's de facto access-control layer** on top of workspace install. Removing the app from a workspace immediately revokes access for all users. For Enterprise Grid, org admins control which workspaces have access.

### Routing Mode (Claude App Home)

- **Code only** — all `@mentions` route to Claude Code (use for teams using Slack exclusively for dev tasks).
- **Code + Chat** — routes intelligently between Claude Code and Claude Chat (single `@Claude` entry point across writing/analysis/coding). **Retry as Code** converts a chat-routed message to a Claude Code session (and the reverse is available in-thread).

### Usage patterns

- **Use Slack threads** when discussing a bug/feature so Claude gathers full conversation context before starting — reply in-thread, not fresh channel messages. (Thread mention = all thread messages; direct channel mention = recent channel messages.)
- Write **specific requests:** file names, function names, error messages; state the repo if not obvious; define what "done" means (tests? docs? PR?).
- **Include the repository name** (or use **Change Repo**) to avoid wrong-repo auto-selection.
- Use Slack to kick off **async tasks where context already lives in the discussion** and teammates need visibility; use the web directly for file uploads, real-time interaction, and longer/complex work.
- Completion action buttons: View Session, Create PR, Retry as Code, Change Repo.

### Team constraints

- **Repo access is strictly per-user** — only personally-connected repos at `claude.ai/code`; a teammate's connected repo is not usable by others. **Provision repo connections per user during onboarding.**
- Sessions run under the **invoking user's** Claude account and consume **their** plan rate limits (not a team pool) — heavy Slack use can exhaust one user's limits.
- On **Enterprise/Team plans, Slack-initiated sessions are automatically org-visible** (not private).
- **GitHub-only** (no other Git hosts). **One PR per session** (multi-PR work needs multiple sessions). **No DM support** — channels only.
- Users **without Claude Code on the web access silently get only chat responses**, not coding sessions.

---

## Tools & permission model (governs every surface)

### Disabling / scoping tools (team kill switch)

- **Disable a tool ecosystem-wide** by adding its **exact name** to the permissions `deny` array — the canonical kill switch referenced by CLI flags, subagent frontmatter, skills, and hooks.
- Permission rule format: `ToolName(specifier)`, shared across `permissions.allow`/`deny`, `--allowedTools`/`--disallowedTools`, Agent SDK `allowedTools`/`disallowedTools`, subagent `tools`/`disallowedTools` frontmatter, skill `allowed-tools` frontmatter, and hook `if` conditions. **`disallowedTools`/`deny` wins** when a tool is in both allow and deny.
- Hook `matcher` fields use **bare tool names**, NOT the parenthesized format. Tools like `ExitPlanMode`/`ShareOnboardingGuide` accept only the bare name.

**Specifier groupings (one rule covers several tools):**

| Rule | Also applies to |
|---|---|
| `Bash(npm run *)` | Bash **and Monitor** |
| `Read(~/secrets/**)` | Read, Grep, Glob, LSP |
| `Edit(/src/**)` | Edit, Write, NotebookEdit |
| `WebFetch(domain:example.com)` | WebFetch |
| `WebSearch` | whole tool (no specifier — allow/deny only) |

- **Use a single `Edit(path)` rule** instead of separate Read+Edit — `Edit(...)` also grants read access to the same path.

### Tools requiring permission

`Artifact, Bash, Edit, ExitPlanMode, Monitor, NotebookEdit, PowerShell, ShareOnboardingGuide, Skill, WebFetch, WebSearch, Workflow, Write`.

**No permission required:** `Agent, AskUserQuestion, CronCreate, CronDelete, CronList, EnterPlanMode, EnterWorktree, ExitWorktree, Glob, Grep, ListMcpResourcesTool, LSP, PushNotification, Read, ReadMcpResourceTool, RemoteTrigger, ScheduleWakeup, SendMessage, Task* (Create/Get/List/Stop/Update), TaskOutput, TodoWrite, ToolSearch, WaitForMcpServers`.

### Subagents

- Restrict blast radius by narrowing the subagent's `tools` frontmatter (leave Bash off) or using deny rules, rather than relying on prompts.
- Resolution: neither set → inherits all parent tools; `tools` only → only listed; `disallowedTools` only → all parent except listed; **both set → `disallowedTools` wins** (a tool in both is removed).
- Launching a subagent does **not** prompt; its own tool calls are checked as it runs. **Cap with `maxTurns`** in the subagent definition.
- v2.1.186+: background subagents surface permission prompts in the main session (naming which asks; `Esc` denies that one call). **Before v2.1.186 they auto-denied prompting calls and continued** — work could fail quietly.

### Bash environment & cwd

- **Env vars do NOT persist across commands** (`export` doesn't carry). Aliases/functions/options from `~/.zshrc`/`~/.bashrc`/`~/.profile` ARE sourced at session start and applied to every command.
- For deterministic env: set `CLAUDE_ENV_FILE` to a shell script before launch (or populate via a SessionStart hook); activate virtualenv/conda before launching Claude Code.
- `cd` carries cwd to later Bash commands only while inside the project dir or an `--add-dir`/`/add-dir`/`additionalDirectories` directory; `cd` outside silently resets to project dir ("Shell cwd was reset"). **Subagents never inherit cwd changes.** `CLAUDE_CODE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` disables carry-over entirely.
- **Timeout:** 2 min default, up to 10 min per command via the timeout param; override with `BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS`.
- **Output length:** 30,000 chars default; overflow spills to a file in the session dir (path + preview given to Claude — have Claude search it rather than dumping into context). Raise with `BASH_MAX_OUTPUT_LENGTH` up to a hard ceiling of **150,000**.
- Long-running processes (dev servers, watch builds): `run_in_background:true` and manage via `/tasks` rather than blocking the session.

### File tools

- **Edit** requires: read-before-edit (file read in conversation and unchanged on disk), exact `old_string` match, uniqueness (else longer context or `replace_all:true`). Exact string replacement, no regex/fuzzy. Viewing via Bash satisfies read-before-edit **only** for `cat`/`head`/`tail`/`sed -n 'X,Yp'`/`grep`/`egrep`/`fgrep` on a single file with no pipes/redirects.
- **Write** to an existing path requires it was read at least once in the conversation; no append/merge (use Edit for partial changes).
- **Read** returns line-numbered contents; pass **absolute paths**. Over-token whole-file reads return a PARTIAL first page with offset/limit guidance; explicit offset/limit still over limit → error. PDFs over 10 pages read in ranges (`pages`, up to 20/call). Cannot read directories.
- **Glob:** sorted by mtime, **capped at 100 files** (truncation flagged); **does NOT respect `.gitignore` by default** (set `CLAUDE_CODE_GLOB_NO_IGNORE=false` to make it respect it for the team).
- **Grep:** ripgrep regex (not POSIX) — metacharacters need escaping (e.g. `interface\{\}`); default mode `files_with_matches` (also `content`, `count`); **respects `.gitignore`** unless a path is passed directly.
- **OS-level enforcement:** Read/Edit deny rules cover only recognized Bash file commands — a Python/Node script that opens files bypasses them. Enable the **sandbox** for OS-level file-access enforcement across all processes.

### Web tools

- **WebFetch** converts HTML→Markdown and runs the prompt against content via a small fast model (Claude gets that answer, not the raw page — **lossy by design**, not configurable). HTTP→HTTPS upgrade; large pages truncated; responses cached 15 min; **cross-host redirects returned as text, not followed** (do a second WebFetch with the redirect URL). First touch of a new domain prompts in default/acceptEdits modes (except a preapproved doc-domain set); pre-approve with `WebFetch(domain:example.com)`; `auto`/`bypassPermissions` skip the prompt; explicit deny/ask/allow overrides the preapproved set. Sandbox network rules are separate — an allowed domain still needs an explicit sandbox rule for sandboxed processes.
- **WebSearch:** Anthropic's backend (not configurable), titles+URLs only, up to 8 backend searches/call. Scope with `allowed_domains` **or** `blocked_domains` — **cannot combine both in one call**. No specifier (bare `WebSearch` allow/deny only). Available on Claude API + Microsoft Foundry, and Vertex with Claude 4 models; **Bedrock does NOT expose server-side web search.**

### Task / Cron / misc tools

- **`TodoWrite` is disabled by default** as of v2.1.142 in favor of `TaskCreate`/`TaskGet`/`TaskList`/`TaskUpdate` — prefer Task* tools. Re-enable with `CLAUDE_CODE_ENABLE_TASKS=0`. `TaskOutput` is deprecated — prefer `Read` on the task's output file path.
- `ToolSearch` loads deferred tools when tool search is enabled; `WaitForMcpServers` (v2.1.142+) only appears when tool search is disabled.
- Custom tools come from connecting an MCP server; reusable prompt workflows are **skills** (run through the existing Skill tool, no new tool entry).
- **Artifact** requires Team/Enterprise + `/login`. **LSP** is inactive until a code-intelligence plugin is installed for the language.
- Verify the loaded tool set by asking Claude "What tools do you have access to?"; for exact MCP tool names run `/mcp`.

### PowerShell (Windows)

- Enable via `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`. Auto-enables on Windows without Git Bash; progressive rollout with Git Bash (set `0` to opt out). Linux/macOS/WSL: opt-in, needs PowerShell 7+ (`pwsh` on PATH).
- Spawns with `-ExecutionPolicy Bypass` at **process scope only** — does **not** override Group Policy MachinePolicy/UserPolicy (enterprise lockdowns still apply). `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY=1` respects the machine's effective policy.
- Shell selection: `defaultShell:powershell` routes interactive `!` commands through PowerShell (needs tool enabled); `shell:powershell` on a command hook runs that hook in PowerShell (works regardless of env var); `shell:powershell` in skill frontmatter runs ``!`command` `` blocks in PowerShell (needs tool enabled).

### Enterprise (Bedrock/Vertex/Foundry) unavailable tools

When designing team workflows on these providers, account for unavailable tools:
- **`Monitor`** — also unavailable when `DISABLE_TELEMETRY` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set; requires v2.1.98+.
- **`PushNotification`, `RemoteTrigger` (Routines), `ScheduleWakeup`** — run through Anthropic-hosted infra, not accessible on Bedrock/Vertex/Foundry. RemoteTrigger/Routines also require Pro/Max/Team/Enterprise.
- **Server-side `WebSearch`** — not on Bedrock.
- On these providers: no-interval `/loop` prompts force a fixed **10-min** schedule, bare `/loop` prints usage, and `loop.md` is ignored.

---

### Gotchas

- **Green run status ≠ success.** It only means the session started/exited without an *infra* error. Open the run transcript to confirm the task actually completed — blocked network requests, missing connector tools, and task failures surface only there.
- **`/schedule` disappears as "Unknown command"** if: authenticated with a Console API key or Bedrock/Vertex/Foundry (`ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN`/`apiKeyHelper` take precedence over claude.ai login and must be removed); `DISABLE_TELEMETRY`/`DO_NOT_TRACK`/`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`/`DISABLE_GROWTHBOOK` is set; you're inside a web session; or the CLI is older than v2.1.81 (`claude update`).
- **Routines run as YOU with no permission prompts and a fresh clone** — any included connector tool (including destructive writes) can fire automatically, and there's no access to local working-tree files.
- **`/web-setup` does NOT install the Claude GitHub App** or enable webhook delivery — GitHub triggers silently won't fire.
- **The `/fire` `text` payload is never parsed** — JSON arrives as a literal string.
- **`matches regex` is anchored to the whole field** — bare `hotfix` matches only an exact `hotfix`; use `.*hotfix.*` or `contains`.
- **GitHub webhook events over the hourly cap are silently dropped**; each event spawns a fresh independent session, so rapid PR updates fan out and burn usage.
- **No `--bare` → silent inherited context** — a teammate's `~/.claude` hook or a project `.mcp.json` server runs, making results non-reproducible.
- **`Bash(git diff*)` without a space before `*`** also matches `git diff-index` — broader than intended.
- **Piped stdin over 10MB** (v2.1.128+) aborts non-zero, not silently truncated.
- **Background Bash dies ~5s after a `-p` run's final result**; background subagents instead block the run up to a 10-min cap (v2.1.182+).
- In bare mode, **OAuth/keychain are skipped** — without `ANTHROPIC_API_KEY` or an `apiKeyHelper` in `--settings`, the call fails to authenticate.
- **`/login` and other interactive built-ins don't work in `-p`**; only user-invoked skills/custom commands and `/config key=value` do.
- **Starting a fresh conversation silently clears all session-scoped scheduled tasks**; only `--resume`/`--continue` restores unexpired ones (and never Background Bash/Monitor tasks).
- **No catch-up for missed fires** — fires once when idle, never if the session is closed. **Recurring tasks die after 7 days** (one last fire, then self-delete) — a "permanent" loop has a hard expiry.
- **Jitter:** a `:00` job can fire anywhere up to `:30`; **cron times are local timezone, not UTC** — surprising for distributed teams.
- **`Esc` only stops a waiting `/loop`** — tasks created by asking Claude directly survive Esc and must be deleted via `CronDelete`/natural language.
- **Routines are per-individual-account, NOT team-shared**, despite Team/Enterprise gating.
- **Locally-added MCP servers don't appear as routine connectors** — commit `.mcp.json` or add an account connector.
- **Slack: no DMs, GitHub-only, one PR per session, per-user repo access** (a teammate's connected repo isn't usable by others), sessions consume the **individual's** rate limits, and on Enterprise/Team are auto org-visible. Users without web access silently get only chat replies.
- **Claude follows directions from OTHER messages in the gathered Slack context** — a malicious/careless in-thread message can steer it (prompt-injection surface); use only in trusted conversations.
- **Read/Edit deny rules only cover recognized Bash file commands** — a Python/Node script opening files bypasses them; only the sandbox enforces at OS level. Also, the read-before-edit command set and the deny-rule command set **differ** (`egrep`/`fgrep` satisfy read-before-edit but aren't checked against Read deny rules).
- **`export` doesn't persist between Bash commands** — only aliases/functions sourced at session start carry.
- **Glob surfaces gitignored/secret files by default** (opposite of Grep) unless `CLAUDE_CODE_GLOB_NO_IGNORE=false`; Glob caps at 100 files and Read line/token limits return **partial views silently** — narrow patterns / use offset+limit.
- **Grep uses ripgrep regex, not POSIX** — escape `{}` etc.
- **WebFetch is lossy** (a negative answer may just mean the extraction prompt didn't ask — re-fetch sharper or use curl); cross-host redirects aren't auto-followed; an allowed WebFetch domain still needs an explicit **sandbox** network rule for sandboxed processes.
- **WebSearch can't combine `allowed_domains` and `blocked_domains`** in one call.
- **`ANTHROPIC_API_KEY` is ignored on Bedrock/Vertex** — auth errors there stem from OIDC/WIF/role-impersonation/region/model-availability, not the API key. **Two billing dimensions stack** (runner minutes + token costs).
- **`acceptEdits` auto-approves edits + `mkdir`/`touch`/`mv`/`cp` but NOT arbitrary shell/network** — those still abort without an explicit allow rule.
- **`cd` outside the project/additional dirs silently resets cwd** to the project directory; **subagents never inherit cwd changes**.
- **PowerShell process-scope `-ExecutionPolicy Bypass` does not override Group Policy**; profiles aren't loaded in preview and Windows sandboxing is unsupported.
- **Before v2.1.186, background subagents silently auto-denied prompting tool calls** and continued — work could fail quietly on older versions.


---

## Optimal use, context & cost

Claude Code loads `CLAUDE.md`, auto memory, skill descriptions, and MCP tool names *before your first prompt*, so context is already substantially filled at session start. Performance degrades as the window fills — context is the fundamental constraint, and cost follows from it. The team levers below are ordered by impact: shared project config first, then context hygiene, then cost controls.

## Team setup (shared, committed config)

### CLAUDE.md — the shared instruction file
Read at the start of every conversation; full content loads into context every request (even for unrelated work), so keep it lean.

| Location | Scope |
|---|---|
| `~/.claude/CLAUDE.md` | All sessions (global, per-user) |
| `./CLAUDE.md` (project root) | Project — **check into git to share with the team** |
| `./CLAUDE.local.md` | Personal — **must be added to `.gitignore` manually** |
| Parent directories | Pulled in automatically (monorepos) |
| Child directories | Pulled in on demand when Claude reads a file there |

- Put the project `CLAUDE.md` in the **repo root** so the whole team inherits the same instructions automatically. Treat it like code: review in PRs, prune, and test that behavior actually shifts.
- **Keep it under 200 lines.** For each line ask "would removing this cause Claude to make mistakes?" — cut if not. A bloated file loads its full token cost everywhere *and* causes Claude to ignore real instructions (important rules lost in noise).
- **Include:** non-guessable bash commands, non-default code style, test instructions, repo etiquette, project architecture, env quirks, non-obvious gotchas. **Exclude:** anything inferable from code, standard conventions, detailed API docs (link instead), frequently-changing info.
- Add emphasis (`IMPORTANT`, `YOU MUST`) to improve adherence. If Claude ignores a rule, the file is probably too long; if it asks questions the file answers, the phrasing is ambiguous.
- Supports imports via `@path/to/import` (e.g. `@README.md`, `@~/.claude/my-project-instructions.md`).
- `/init` bootstraps a starter `CLAUDE.md` by analyzing build systems, test frameworks, and code patterns.
- **Split by directory in monorepos:** root holds repo-wide rules (standards, commit conventions, layout); per-package files hold area-specific stack conventions, each maintained by its directory owner. Move sometimes-relevant domain knowledge into **skills** so it loads on demand.
- Add a **Compact Instructions** / `# Compact instructions` section to control what survives compaction (e.g. "always preserve the full list of modified files and any test commands").
- Revisit after major model releases — delete instructions that worked around now-fixed limitations.

### Skills, hooks, subagents, plugins
- **Skills** live in `.claude/skills/<name>/SKILL.md` (YAML frontmatter: `name`, `description`). Invoked automatically when relevant, or as `/skill-name`. `$ARGUMENTS` receives invocation args. Put the **most important instructions near the top** — post-compaction re-injection truncates to a 5,000-token/skill cap by keeping the start of the file. Keep descriptions short and lead with words a request would contain ("writing or modifying tests in packages/api/") — descriptions are truncated when many skills are discovered.
- Set `disable-model-invocation: true` on skills with **side effects** (commit, deploy, send messages) so they cost **zero context** until invoked with `/name`. Use `skillOverrides` in settings to do the same for third-party skills you didn't author. Plugin skills are invoked namespaced: `/plugin-name:skill`.
- Place skills shared across directories in repo-root `.claude/skills/` (load from any start dir); package skills needing independent versioning as **plugins**.
- **Hooks** (`.claude/settings.json`, browse with `/hooks`) run deterministically at lifecycle events (PreToolUse, PostToolUse, SessionStart, prompt submission, permission requests, compaction). Use hooks — not CLAUDE.md — for anything that **must** happen every time: CLAUDE.md is advisory, hooks are enforcement. A PreToolUse hook can block editing `.env` or reject `rm -rf /`; "never edit .env" in CLAUDE.md is only a request. A Stop hook can review the transcript and propose CLAUDE.md updates; a SessionStart hook can recommend the right plugin per launch directory.
- **Subagents** (`.claude/agents/<name>.md`; frontmatter `name`, `description`, `tools`, `model`, `skills`) run in their own context window and return only a summary.
- **Plugins** bundle skills, hooks, subagents, and MCP servers into one installable unit (browse `/plugin`). Package a setup as a plugin once a **second repository** needs it. Enable repo-wide via the `enabledPlugins` / `enabledPlugins` project setting rather than per-developer installs.

### Build the setup incrementally (by trigger)
A convention Claude gets wrong twice → **CLAUDE.md**. A repeated prompt → **user-invocable skill**. A pasted multi-step playbook (3rd time) → **skill**. Data Claude can't see → **MCP server**. Many file reads to locate a symbol → **code-intelligence plugin**. A repo needing the same setup → **package as a plugin**. Treat a recurring review comment as a config edit, not a one-off chat correction.

### Feature precedence (NOT uniform — memorize the differences)

| Feature | Precedence / behavior |
|---|---|
| Skills | managed > user > project |
| Subagents | managed > CLI flag > project > user > plugin |
| MCP servers | local > project > user |
| CLAUDE.md | **Additive** — all levels contribute; conflicts resolved by Claude's judgment (more-specific *tends* to win, not guaranteed) |
| Hooks | **Merge** — all matching hooks fire regardless of source |

Features are defined at four levels: user-wide, per-project, plugins, managed policies. **Managed (admin/enterprise) is the highest tier** and overrides user/project.

### Path-scoped config and worktree gotchas
- `.claude/rules/` files with `paths:` frontmatter load only when Claude reads a matching file (saves context vs. always-loaded CLAUDE.md).
- `.claude/settings.json` does **NOT** inherit from parent directories (unlike CLAUDE.md) — it loads only from the starting directory. **Worktree sessions load settings from the worktree root**, so deny rules/hooks needed in worktrees must also live in the repo-root `.claude/settings.json` (a second copy).
- `claudeMdExcludes` skips specific CLAUDE.md/rules by glob; patterns match **absolute** paths, so start relative-style patterns with `**/`. Static list, merges across scopes. **Managed-policy CLAUDE.md cannot be excluded.**
- Add `Read` deny rules under `permissions.deny` for checked-in generated/vendored code `.gitignore` doesn't cover (e.g. `"Read(./**/dist/**)"`, `"Read(./vendor/**)"`). They cover built-in file tools and recognized Bash file commands, but do **not** filter denied paths from recursive-search output or block arbitrary subprocesses. Managed deny rules can't be overridden by user/project.
- `permissions.additionalDirectories` grants file read/write but **never** loads that dir's CLAUDE.md/rules/skills. `--add-dir` / `/add-dir` loads skills, and loads CLAUDE.md/rules only if `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`.

## Where you launch matters
Launch location determines file access, which CLAUDE.md files load, and which settings apply.
- **From repo root:** access to every file; root CLAUDE.md loaded, subdir files on demand. But Claude can accumulate skills from every subdirectory it touches (into the hundreds), and many-skill truncation can strip the keywords it needs to pick the right one.
- **From a package/subdirectory:** access to that subtree only; that directory's CLAUDE.md + every ancestor's load, sibling packages excluded automatically. Use this when work is scoped there.

## Context management

### What loads at startup (before first prompt)
System prompt (~4.2K tokens), auto memory `MEMORY.md` (first **200 lines or 25KB**, whichever first), environment info, MCP **tool names** (schemas deferred), skill descriptions, global + project CLAUDE.md. Git branch/status/recent commits load as a separate block at the very **end** of the system prompt. Default context window is **200,000 tokens**.

### Context cost by feature

| Feature | Cost |
|---|---|
| CLAUDE.md | Full content every request |
| Skills | Descriptions every request; full content only when used (`disable-model-invocation: true` → zero) |
| MCP | Tool names at start; full JSON schemas deferred until a tool is used |
| Hooks | Zero unless they return output |
| Subagents | Isolated from main session |

File reads **dominate** context. Tool/command outputs shown as one-line terminal summaries still consume their **full** token count in context.

### MCP context control
Tool schemas are deferred by default (tool search ON) — only names cost context until a tool is used.
- `ENABLE_TOOL_SEARCH=auto` loads schemas upfront **only when they fit within 10% of the window**; `=false` loads ALL schemas upfront.
- `/mcp` shows per-server token cost + connection status — **disconnect servers you're not using**. **Prefer CLI tools (`gh`, `aws`, `gcloud`, `sentry-cli`) over MCP** — they add no per-tool listing to context (and `gh` avoids unauthenticated GitHub API rate limits). Pair MCP with a skill: MCP gives connection/auth, the skill documents schema and query patterns.

### Subagents for context isolation
Delegate research, large file reads, broad searches, and verbose operations (tests, log/doc processing) to a subagent — file contents stay in **its** window; only a small summary returns. Subagents get their own context (own shorter system prompt, own CLAUDE.md copy, same MCP/skills) but do **NOT** inherit conversation history, auto memory, or already-invoked skills — pass needed context explicitly in the prompt. Skills in a subagent's `skills:` field are **fully preloaded** at launch. `context: fork` runs a skill in isolated context. A custom agent with `memory:` loads its own separate `MEMORY.md`.

### In-session context commands

| Command | Effect |
|---|---|
| `/context` | Live breakdown by category + optimization suggestions — run periodically before auto-compaction fires |
| `/memory` | Shows which CLAUDE.md and auto-memory files loaded |
| `/clear` | Resets context entirely (saved/resumable); use between unrelated tasks |
| `/compact [instructions]` | Replaces history with a (optionally focused) summary, e.g. `/compact focus on the API changes` |
| `/btw <question>` | Answers a side question in a dismissible overlay — never enters history, doesn't grow context |

Run `/clear` between unrelated tasks (the "kitchen sink session" fills context with irrelevant info). After two failed corrections on the same issue, `/clear` and restart with a better prompt. Use **Summarize from here / up to here** (in the rewind menu) to compress a verbose stretch in-session without a full `/compact`, keeping files on disk unchanged.

### What survives compaction
Auto-compaction clears older tool outputs first, then summarizes. **Survives** (re-injected from disk): system prompt, output style, project-root CLAUDE.md, unscoped rules, auto memory, invoked skill bodies (capped 5,000 tokens/skill, 25,000 total, oldest dropped first, truncated keeping the START). **LOST** until a matching file is re-read: `paths:`-frontmatter rules, nested subdirectory CLAUDE.md. **Skill descriptions are NOT re-injected** — only skills you actually invoked persist. Summary keeps user intent, key concepts, files modified with snippets, errors/fixes, pending tasks; **discards** verbatim tool outputs and intermediate reasoning. **Put persistent rules in CLAUDE.md, not conversation history** — early instructions can silently vanish post-compaction.

### Large / long context
For very long sessions, prefer a **[1m]-context model variant** (Fable 5, Opus 4.6+, Sonnet 4.6) over repeated compaction. Install a **code-intelligence (LSP) plugin** (`/plugin install typescript-lsp@claude-plugins-official`; TypeScript/Python/Go/Rust, etc.) so symbol lookups replace broad file reads — often net-reducing context. Requires the language server binary on each machine. Use `worktree.sparsePaths` to check out only needed directories (include `.claude` explicitly, pair with `symlinkDirectories: ["node_modules"]`). For cross-package changes, give Claude the whole change in one session and **have it write the plan to a markdown file** so it survives compaction.

## Cost management

### Visibility
- `/usage` — Session block token usage; attributes recent usage to skills/subagents/plugins/MCP servers as percentages; `d`/`w` toggles 24h vs 7d. **The dollar figure is a LOCAL estimate** and may differ from the bill; reflects only this machine's local history. Authoritative billing: Claude Console Usage page (`platform.claude.com/usage`).
- Benchmark: avg enterprise cost ~**$13/developer/active day**, $150–250/dev/month; under $30/active day for 90% of users.
- `/usage-credits` (Pro/Max) sets a monthly usage-credit spend limit (needs billing access).

### Org / team controls
- First auth auto-creates a **"Claude Code" workspace** for centralized cost tracking (no API keys creatable for it). Its traffic counts against the org's overall API rate limits — **set a workspace rate limit** on its Limits page so it can't starve production workloads. Set workspace spend limits too.
- Size rate limits with **total TPM = users × per-user TPM** (e.g. 200 × 20k = 4M TPM). Per-user recommendations shrink with team size: 1–5 users 200k–300k TPM / 5–7 RPM; 100–500 users 15k–20k TPM; 500+ users 10k–15k TPM (applied at org level).
- On **Bedrock/Vertex/Foundry, Claude Code sends NO cost metrics** — deploy **LiteLLM** as a gateway for spend-by-key (unaffiliated, unaudited).
- Run a small pilot group to establish a per-developer baseline before wider rollout.
- Use the **OpenTelemetry exporter** for per-user/per-session cache read/creation tokens across the team (set `OTEL_LOG_TOOL_DETAILS=1` to record skill names and find unused skills).

### Model and effort
- Default to **Sonnet** for coding; reserve **Opus** for complex architecture/multi-step reasoning; **Haiku** for simple subagents (`model: haiku` in subagent config). Switch with `/model` or `claude --model <name>`.
- **Extended thinking is ON by default** and bills as output tokens (tens of thousands/request) — easy to overspend on simple tasks. Lower with `/effort`, disable in `/config`, or `MAX_THINKING_TOKENS=8000`. Adaptive-reasoning models ignore `MAX_THINKING_TOKENS` (use effort levels); thinking can't be disabled at all on Fable 5.
- Background token usage (summarization for `--resume`, `/usage` checks) is typically under **$0.04/session** even when idle.

### Agent teams (experimental)
Disabled by default (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Use **~7x** the tokens of a standard session in plan mode; each teammate is a separate Claude instance consuming tokens until it exits. Switch from parallel **subagents** to a team only when subagents hit context limits or must communicate — otherwise subagents are cheaper. For teams: use Sonnet, keep teams small, keep spawn prompts focused, shut teammates down when done.

## Prompt caching (cost lever)
Automatic; API caches by **exact-prefix match** — any change anywhere in the prefix recomputes everything after it. `cache_read_input_tokens` bill at ~10% of standard input; `cache_creation_input_tokens` at the write rate. Monitor via a statusline script reading `current_usage`: a high read-to-creation ratio is good; persistently high creation means something in your prefix keeps changing.

**Request layers (most-stable first):** (1) System prompt (instructions, tool defs, output style) — a change invalidates everything; (2) Project context (CLAUDE.md, auto memory, unscoped rules); (3) Conversation. **Model and effort level are part of the cache key** (not the text) — each has its own cache; switching either mid-session recomputes the whole request.

**Invalidates cache (one slow/expensive turn):** switching models (`/model`), changing effort (`/effort`), enabling fast mode, connecting/disconnecting an MCP server *when tools loaded into prefix*, denying an **entire** tool (bare `Bash`, `WebFetch`, `Bash(*)`, `"*"`), `/compact`, upgrading Claude Code. `opusplan` makes each plan-mode toggle a model switch (Opus↔Sonnet) → cache invalidation.

**Cache-safe (append/no-op):** editing repo files, editing CLAUDE.md (no-op — doesn't apply until reload anyway), changing output style (no-op), changing permission mode (except opusplan toggle), invoking skills/commands, `/recap`, `/rewind`, spawning a subagent. **Scoped deny rules** (`Bash(rm *)`) and all allow/ask rules leave the prefix intact.

**Prefer `/rewind` over `/compact`** to abandon a wrong path — rewind truncates back to an already-cached prefix; compact builds a new one. Run `/compact` at a **natural break between tasks**, not mid-task, so you control when the cache rebuild lands. **Pick model + effort at the top of a session and don't change them mid-task.**

**TTL:** API offers 5-min and 1-hour TTLs; each hit resets the timer. Subscriptions request the **1-hour TTL automatically at no extra cost** (drops to 5-min when over plan limit on credits). On API key/Bedrock/Vertex/Foundry default is 5-min; opt into 1-hour with `ENABLE_PROMPT_CACHING_1H=1`, force 5-min with `FORCE_PROMPT_CACHING_5M=1` (overrides the former in managed settings). Disable per-model with `DISABLE_PROMPT_CACHING[_HAIKU|_SONNET|_OPUS|_FABLE]=1`. Put these in the **env block of managed settings** for org-wide policy.

**Cache scope:** effectively one machine + directory (system prompt embeds working dir, platform, shell, OS, branch, recent commits). Worktrees of the same repo miss each other's cache. Subagents get their own cache (no hits on first call, always 5-min TTL even on subscription); a fork reads the parent's cache exactly. Set `DISABLE_AUTOUPDATER=1` to control when an upgrade's rebuild happens — **avoid resuming a long session right after an upgrade** (reprocesses entire history uncached — your most expensive request). Deferred MCP tools (default) don't disturb cache; tools in the prefix (Haiku, Vertex AI, custom gateway, `alwaysLoad` servers) do invalidate on change. As of v2.1.163, `/reload-plugins` refuses a reload that forces a full re-read unless `--force`.

## Workflows and verification

### Four-phase workflow for non-trivial work
**Explore** (plan mode, read-only) → **Plan** (detailed plan; `Ctrl+G` to edit in your editor) → **Implement** → **Commit/PR**. Skip plan mode for small clear-scope tasks (typo, rename) — if you could describe the diff in one sentence, skip the plan. Use plan mode (`claude --permission-mode plan` or **Shift+Tab**) for anything you want to review before it touches disk. Use **Writer/Reviewer**: a fresh-context reviewer subagent isn't biased toward code it just wrote.

### Verification — the #1 lever
Give Claude a check it can run (test suite, build exit code, linter, fixture diff, screenshot) so it closes the loop itself. Have it **show evidence** (test output, command + return, screenshot) rather than asserting success — faster to review and works unattended. **Escalate the gate to match autonomy:** in-prompt "run the check and iterate" → `/goal <condition>` (re-checked after every turn until it holds) → Stop hook (deterministic gate) → verification subagent (independent second opinion). Add an **adversarial review step before declaring done** (review the diff in a fresh subagent against the plan), but tell the reviewer to flag only gaps affecting **correctness or stated requirements** to avoid over-engineering.

### Prompting
Be specific — name the exact file/function ("fix the bug in `auth.ts`") so Claude reads fewer files and consumes less context. Scope the file/scenario/testing prefs, point to source (git history), reference existing patterns by file, describe symptom + likely location + what "fixed" looks like. For scheduled/autonomous tasks, be explicit about success and what to do with results (the task can't ask clarifying questions). For larger features, have Claude interview you (AskUserQuestion), write a self-contained `SPEC.md` (named files/interfaces, out-of-scope, end-to-end verification), then start a fresh session to implement.

### Steering and checkpoints
**Esc** stops Claude mid-action (cancels the running tool, context preserved); typing a correction + Enter steers without stopping a running tool. Every prompt creates a **checkpoint**. Open the rewind menu with `/rewind` or **Esc+Esc when input is empty**. Actions: Restore code and conversation / Restore conversation / Restore code / Summarize from here / Summarize up to here. **Checkpoints are session-level local undo only** — keep using Git for permanent history. They track **only Claude's file-editing-tool changes**, NOT bash-driven changes (`rm`/`mv`/`cp`, builds, generators), external/concurrent edits, or remote side effects (DB writes, API calls, deployments). Auto-deleted after 30 days. To try a different approach without destroying the session, **fork** (`claude --continue --fork-session` or `/branch`).

### Permission modes (Shift+Tab cycles)
Default (asks before edits/commands) → Auto-accept edits (runs filesystem commands without asking) → Plan (explores/proposes, no source edits — but normal prompts still apply) → Auto (background safety classifier, research preview). Pre-allow trusted commands in `.claude/settings.json` (e.g. `npm test`, `git status`) via `/permissions` to avoid repeated prompts. Non-interactive: `claude -p "prompt"` with `--output-format text|json|stream-json` (stream needs `--verbose`) and `--allowedTools` to scope permissions. Auto mode aborts non-interactive (`-p`) runs if the classifier repeatedly blocks (no user fallback). OS-level sandboxing via `/sandbox`.

### Sessions, scheduling, parallelism
- Resume: `claude --continue` (most recent in current dir), `claude --resume`/`<name>`/`<session-id>`, `/resume`, `claude --from-pr <number>`. Name sessions: `claude -n <name>`, `/rename`, picker `Ctrl+R`.
- Transcripts: JSONL at `~/.claude/projects/<project>/<session-id>.jsonl`. Relocate with `CLAUDE_CONFIG_DIR`; retention via `cleanupPeriodDays` (default 30); suppress writes with `CLAUDE_CODE_SKIP_PROMPT_HISTORY` or `--no-session-persistence`; `/export` for long-term reference.
- **Git worktrees** (`claude --worktree <name>`) run concurrent sessions on separate checkouts/branches without colliding edits or cross-contaminating context.
- For large migrations, **fan out**: list all files, loop `claude -p` per file with scoped `--allowedTools`; test on 2–3 files and refine the prompt before running at scale.
- **Scheduler choice:** Routines (Anthropic infra, runs when your machine is off; `claude.ai/code/routines`) · Desktop scheduled tasks (local file/uncommitted access) · GitHub Actions (repo-event-driven) · `/loop` (quick polling within an open session, stops on new conversation).

### Fast mode (Opus only)
High-speed config (up to 2.5x faster, higher cost/token) for Opus 4.8/4.7/4.6 — same quality, prioritizes speed. CLI only (not VS Code), v2.1.36+. Toggle: `/fast`+Tab or `"fastMode": true`. Pricing/MTok: Opus 4.8 = **$10/$50**, Opus 4.7/4.6 = **$30/$150** (flat across 1M context).
- **Enable at the START of a session** — the first enable charges full uncached fast-mode input price for the *entire context so far*, which grows the deeper you are (charged once per conversation; `/clear`/`/compact` reset it).
- Use for interactive/latency-sensitive work; use **standard mode** for long autonomous tasks, batch/CI, cost-sensitive workloads. Combine with a lower effort level for max speed on simple tasks.
- Drawn from **usage credits only**, billed at fast-mode rate from the first token, **does NOT count against subscription/plan-included usage**. Requires usage credits turned on.
- **Not on Bedrock/Vertex/Foundry/AWS** — Anthropic Console API or subscription only.
- **Team/Enterprise: disabled by default** — admin must enable it AND turn on org usage credits, and the fast-mode Opus model must be in the `availableModels` allowlist or `/fast` is refused. Set `"fastModePerSessionOptIn": true` in managed settings so each session starts OFF (cost control with concurrent sessions). Hard-disable org/machine-wide: `CLAUDE_CODE_DISABLE_FAST_MODE=1`.

### Cloud workflows (research preview)
- **ultraplan** — hands a planning task to a Claude-on-the-web plan-mode session (terminal stays free; inline comments/reactions in browser). Needs v2.1.91+, a web account + GitHub repo. Launch: `/ultraplan <prompt>`, the keyword `ultraplan`, or "refine with Ultraplan" at the local-plan approval. On approval, choose **Start new session** for a clean context seeded only by the plan (prints a `claude --resume` to recover the prior session), **Implement here**, or **Cancel** (saves plan to a file). Watch for `◇ ultraplan needs your input`.
- **ultrareview** — `/code-review ultra` (deprecated alias `/ultrareview`); reviews current branch vs default (incl. uncommitted/staged) or `/code-review ultra <PR-number>` (clones from host; use for repos too large to bundle). Independently reproduces/verifies every finding (real bugs, not style). Requires **Claude.ai auth** (not API-key-only). Pro/Max get **3 free runs each** (consumed even if stopped/failed); Team/Enterprise get **zero** (every run bills usage credits, ~$5–20). CI: `claude ultrareview --json` for raw `bugs.json`, exit **0 success / 1 failure** (130 = Ctrl-C, which does NOT stop the remote run); progress/URL go to stderr so stdout stays parseable. For inline PR comments without a CLI step, use the **Code Review GitHub integration**.
- **Dynamic workflows / ultracode** — a JS script Claude writes to orchestrate subagents in the background (v2.1.154+). Use for codebase-wide bug sweeps, 500-file migrations, cross-checked research, multi-angle planning — when a task needs more agents than one conversation can coordinate or you want a rerunnable script. Trigger: keyword `ultracode` (was `workflow` before v2.1.160), or `/effort ultracode` (xhigh + auto-orchestration, session-only). **Gauge cost on a small slice first**; watch per-agent tokens in `/workflows`. **Add needed shell/web/MCP tools to the allowlist before a long run** (non-allowlisted calls still prompt mid-run). Workflow subagents always run in **acceptEdits mode** (auto-approve edits) regardless of session mode. Check `/model` before a large run — every agent uses the session model unless the script routes a stage elsewhere. Save reusable workflows to `.claude/workflows/` (repo, shared) or `~/.claude/workflows/` (personal); run as `/<name>`, pass per-run input via `args`. Limits: 16 concurrent agents, 1,000 total/run, no mid-run user input. `/deep-research <question>` is a bundled workflow. `/code-review` for fast local feedback; `/code-review ultra` before merging substantial changes.

### Other tools
`/init` (CLAUDE.md), `/agents` (subagents), `/doctor` (install issues), `/powerup` (interactive lessons). Reference files with `@file` (full content) / `@dir` (listing only) / `@server:resource` (MCP). Paste images with **ctrl+v** (NOT cmd+v, even on Mac). Pipe data: `cat error.log | claude`. Three execution environments: Local (default), Cloud (Anthropic VMs), Remote Control (code runs locally, controlled from browser).

## Gotchas

**CLAUDE.md & instructions**
- A bloated/over-long CLAUDE.md makes Claude **ignore** instructions (lost in noise) and loads its full token cost into every unrelated session — move specialized content to skills.
- CLAUDE.md conflicts are resolved by Claude's **judgment**, not a hard rule — "more specific wins" is a tendency, not a guarantee. CLAUDE.md is additive (no override); hooks merge (all fire) — precedence is **not uniform** across features.
- **`CLAUDE.local.md` must be manually `.gitignore`d** or it ships to the team.
- Editing project-root/user CLAUDE.md (or output style) **mid-session silently has no effect** — the session-start version persists until `/clear`, `/compact`, or restart.
- Managed-policy CLAUDE.md **cannot** be excluded by `claudeMdExcludes`.
- Built-in **Explore and Plan agents OMIT project CLAUDE.md and git status** — your conventions won't apply there (the general-purpose subagent does load CLAUDE.md).

**Context & compaction**
- LLM performance degrades as the window fills — Claude may "forget" earlier instructions. Detailed early-conversation instructions can **silently disappear after compaction**; relying on them instead of CLAUDE.md is a failure mode.
- **Skill descriptions are NOT re-injected after `/compact`** — only invoked skills survive. `paths:`-frontmatter rules and nested subdirectory CLAUDE.md are **lost** until a matching file is re-read. Invoked skill bodies are truncated to 5,000 tokens/skill, 25,000 total (oldest dropped first, keeping the file's start).
- A single oversized file/tool output can trigger a **thrashing error** that halts auto-compaction (stops after a few attempts rather than recovering).
- Tool/command outputs shown as terse terminal one-liners still consume their **full** token count.
- `additionalDirectories` setting grants file access but loads **no** CLAUDE.md/rules/skills; `--add-dir` loads skills but CLAUDE.md/rules only with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`.
- Too many skills/extensions add noise that makes skills **mis-trigger** and Claude lose track of conventions — overlapping/vague descriptions cause wrong-skill loads. Starting from repo root can accumulate hundreds of skills and truncate the keywords needed to pick the right one.
- `.claude/settings.json` does **not** inherit from parents (unlike CLAUDE.md); worktrees load from the worktree root — duplicate needed deny rules/hooks into the repo-root file. `sparsePaths` lists **directories only**; root-level dirs (including `.claude`) aren't auto-included — omitting `.claude` silently drops root settings/rules/skills.
- `claudeMdExcludes` globs match **absolute** paths — a relative-looking pattern without leading `**/` won't match deeper files.
- Read deny rules don't filter denied paths from recursive-search output and don't block arbitrary subprocesses opening files.

**Subagents, hooks, teams**
- Subagents do NOT inherit conversation history, auto memory, or invoked skills — they start cold (aside from CLAUDE.md/MCP/listed skills); pass context explicitly. By default they can't spawn further subagents (recursion prevented).
- **Stop hooks are overridden after 8 consecutive blocks** — not an unbreakable gate.
- Hook plain stdout on exit 0 is **invisible** to Claude (debug log only); only `hookSpecificOutput.additionalContext` JSON reaches context (untruncated). PostToolUse exit code 2 surfaces stderr as an error but **can't block** (tool already ran).
- A reviewer subagent told to find gaps will usually report some even when work is sound — chasing every finding leads to over-engineering.
- Agent teams: experimental, disabled by default, **~7x tokens**, each teammate consuming until it exits.
- Auto mode is a research preview; aborts non-interactive runs if the classifier repeatedly blocks.

**Checkpoints & sessions**
- Checkpoints track **only Claude's file-tool edits** — NOT bash changes (`rm`/`mv`/`cp`/builds), external/concurrent-session edits (unless same files), or remote side effects. Auto-deleted after 30 days — not durable recovery. **Double-Esc opens the rewind menu only when input is empty** (otherwise it clears the input). "Restore code and conversation" reverts files on disk — choose "Restore conversation" if you only meant the chat.
- Sessions do NOT carry prior conversation history — only CLAUDE.md and auto memory persist. **Auto memory loads only the first 200 lines / 25KB** of MEMORY.md.
- `claude --continue` with no prior session in the current dir prints "No conversation found to continue" and **exits** (doesn't start fresh). Session-ID lookup works only from the originating project dir/worktrees. Headless (`claude -p`) and Agent SDK sessions are **invisible in the picker** (resume by ID). `/resume <name>` errors on ambiguity (use `claude --resume <name>` for a pre-filled picker). Desktop/web/VS Code keep **separate** session histories from the CLI.
- Resuming the same session in two terminals **without forking interleaves** both transcripts into one. Permissions approved "for this session" do **NOT** carry to a branch/fork.
- Claude reads files fresh per tool call — external/other-app edits are seen only on the **next read**, and only if the same file is touched.
- `/loop` tasks stop when you start a new conversation.

**Cost & billing**
- `/usage` dollar figure is a **local estimate** (may differ from the bill) and reflects only the current machine — use Claude Console for authoritative billing. For Max/Pro, the Session block dollar cost isn't billing-relevant (included in subscription).
- **Bedrock/Vertex/Foundry send no cost metrics** — zero visibility without an external gateway (LiteLLM, unaffiliated/unaudited).
- The auto-created "Claude Code" workspace counts against the org's overall API rate limits and can **starve production** unless you set a workspace rate limit.
- **Extended thinking is ON by default**, billing as output tokens (tens of thousands/request) — easy to overspend on simple tasks. `MAX_THINKING_TOKENS` is ignored by adaptive-reasoning models and thinking can't be disabled on Fable 5.

**Fast mode**
- Tokens bill at the fast rate **from the first token** and draw from usage credits even with plan-included usage remaining — they don't count against the subscription.
- `/fast` to disable leaves you **on Opus** (doesn't revert to a previous cheaper model) — use `/model` to switch back.
- Team/Enterprise: disabled by default (org-disabled message until an admin enables). Not on Bedrock/Vertex/Foundry/AWS or in VS Code. An `availableModels` allowlist excluding the fast-mode Opus model silently blocks `/fast`. **Opus 4.6 fast mode is deprecated** (~30 days after 4.8 launch, silently falls back to standard). Default fast-mode model differs by CLI version (4.8 on v2.1.154+, 4.7 on v2.1.142–.153) → cost-per-token differs across team members on different versions.

**Caching**
- Switching models/effort, enabling fast mode, denying an **entire** tool, `/compact`, MCP tools loading into the prefix, and upgrading Claude Code each cost one slow turn. `opusplan` makes every plan toggle a model switch → cache invalidation. Resuming a long session after an upgrade reprocesses the whole history uncached (your most expensive request). Worktrees of the same repo miss each other's cache. Subagents always use 5-min TTL even on a subscription. On Bedrock, caching support/min-prefix/1-hour-TTL vary by model/region (zero cache tokens = unsupported). Fast-mode toggles invalidated the cache before v2.1.86.

**Cloud workflows**
- ultraplan/ultrareview/ultracode are **unavailable on Bedrock/Vertex/Foundry**; ultrareview also unavailable for Zero-Data-Retention orgs and needs Claude.ai auth. Stopping ultraplan via `/tasks` saves **nothing** to the terminal. ultrareview consumes a free run even if stopped/failed; stopping returns no partial findings; Ctrl-C doesn't stop the remote run (keeps billing). The keyword `ultraplan` anywhere in a prompt triggers it; ultraplan disconnects an active Remote Control session.
- Under ultracode a single request can **silently spawn several workflows in a row** (understand → change → verify), multiplying tokens/latency — drop to `/effort high` for routine work. Workflow subagents auto-approve edits regardless of session mode; in `claude -p`/Agent SDK there's no interactive confirmation, so a misconfigured allowlist runs unattended. Workflow resume works only within the same session. **Monorepo precedence:** project workflows beat same-named personal ones; the `.claude/workflows/` closest to the working directory wins (v2.1.178+).

---

## Surfaces & mobility

Claude Code runs across many surfaces (CLI, Desktop, VS Code, JetBrains, web, mobile/web Remote Control) plus mobility features (channels, deep links, computer use, voice, worktrees). For a team, the load-bearing decisions are: **auth standardization**, **what config travels to which surface**, and **what admins must gate centrally**. Those come first below.

### Surface map (what runs where)

| Surface | Where it executes | Key constraint |
|---|---|---|
| **CLI** | Local machine | Superset of features; required for `claude mcp add`, `--resume`, `!` bash, tab completion, full skill set |
| **Desktop** | Local / Remote (cloud) / SSH | macOS + Windows only (**not Linux**); interactive only (no `--print`/Agent SDK) |
| **VS Code extension** | Local (or remote host for Remote Dev) | Bundled CLI is private to the panel — does NOT add `claude` to PATH |
| **JetBrains plugin** | IDE integrated terminal | Runs `claude` in integrated terminal; does NOT bundle CLI |
| **Claude Code on the web** | Anthropic-managed cloud VM | Repo cloned; no local config; GitHub-centric |
| **Remote Control** | Local machine, viewed from claude.ai/code or mobile | Session executes locally; web/mobile is just a window |

CLI and Desktop run the **same engine** and share config (CLAUDE.md, MCP, hooks, skills, settings); they can run simultaneously on the same project, so a config change affects both at once. Each maintains separate session history.

### Auth standardization (do this first for teams)

- **Standardize on claude.ai OAuth via `/login`** (or `claude auth login`). This is required for **Remote Control** and `--teleport`.
- `ANTHROPIC_API_KEY` set in the environment **silently blocks Remote Control** — it must be unset. Tokens from `claude setup-token` / `CLAUDE_CODE_OAUTH_TOKEN` are **inference-only** and cannot establish Remote Control or teleport sessions.
- **Third-party providers (Bedrock / Vertex / Foundry) and raw API keys** disable a wide set of features: channels, computer use, voice dictation, `--teleport`, `/web-setup`, `/desktop` migration, and Remote Control. If a team standardizes on a governed provider, **do not document these as available**.
- For Bedrock/Vertex/Foundry in IDEs: set `claudeCode.disableLoginPrompt` (VS Code) and put provider config in `~/.claude/settings.json` so it is shared with the CLI.
- Works with any paid subscription (Pro, Max, Team, Enterprise) or a Console account; no API key needed for IDE extensions.

### Team config: shared vs per-developer

Govern team-wide behavior through `~/.claude/settings.json` (allowed commands, env vars, hooks, MCP servers) — it is **shared between the CLI and the VS Code/JetBrains extensions**. Reserve extension-native settings (VS Code Extensions → Claude Code) for per-developer UI preferences only.

```jsonc
// settings.json — add for team-wide autocomplete + validation
"$schema": "https://json.schemastore.org/claude-code-settings.json"
```

- Distribute team **plugins** via project scope (`Install for this project`) so they ship through the repo and also work in the CLI; add a shared **marketplace** (GitHub repo/URL/path) under the Marketplaces tab. Plugin/marketplace config is shared extension↔CLI. Restart to apply plugin changes.
- VS Code plugin install scopes: `Install for you` (user, all projects), `Install for this project` (project, shared with collaborators), `Install locally` (this repo, only you).
- Capture repeatable team procedures (review checklists, deploy steps) as custom skills/slash commands.

### Managed (admin-governed) settings — central gating

Put these in **managed settings files** (server-managed) so users cannot override them. Managed settings override project and user settings.

| Key | Effect |
|---|---|
| `channelsEnabled` | Master switch for channels (must be `true` to deliver) |
| `allowedChannelPlugins` | JSON array of `{marketplace, plugin}`; **replaces** the Anthropic allowlist entirely |
| `disableDeepLinkRegistration` | Enforce disabling the `claude-cli://` handler org-wide |
| `disableRemoteControl` | Block Remote Control per-device (independent of org toggle) |
| `permissions.disableBypassPermissionsMode` = `"disable"` | Block bypass mode |
| `disableAutoMode` = `"disable"` | Block Auto mode (also accepted under `permissions`) |
| `autoMode` | Auto-mode classifier config |
| `sshConfigs` | Distribute SSH connections (Desktop dropdown; users can't edit/delete managed ones) |
| `sshHostAllowlist` | Restrict Desktop SSH to matching hostnames (`*`, `*.example.com`, exact) |
| `managedMcpServers` | Push MCP configs to all users (3P Desktop deployments only; optional `toolPolicy`) |

Admin console (`claude.ai/admin-settings/claude-code`, Team/Enterprise) toggles: **Code in the desktop**, **Code in the web** (Quick web setup), **Remote Control**, **Disable Bypass permissions**.

**Distribution gotchas:** admin-console *remotely pushed* managed settings reach **CLI and IDE only — NOT Desktop**. For Desktop, deploy the managed file to disk via **MDM** (macOS `com.anthropic.claudefordesktop`/Jamf/Kandji; Windows registry `SOFTWARE\Policies\Claude`). `autoMode` classifier rules are deliberately **not read from checked-in `.claude/settings.json`** (so a cloned repo can't inject trust rules). `sshHostAllowlist` is honored **only by Desktop** — CLI, IDE, and Bash-tool `ssh` ignore it, and it does not restrict egress.

### Permission modes

| Mode | Settings key | Notes |
|---|---|---|
| Ask permissions | `default` | Approve before every edit (recommended for new users) |
| Auto accept edits | `acceptEdits` | Auto-accepts file edits |
| Plan mode | `plan` | Maps approach without touching files |
| Auto | `auto` | Research preview; Opus 4.6+/Sonnet 4.6 on Anthropic API |
| Bypass permissions | `bypassPermissions` | = CLI `--dangerously-skip-permissions`; still honors explicit `ask` rules |

- `dontAsk` mode is **CLI-only** (not in Desktop).
- Trust progression: start in Ask → graduate to Auto accept edits / Auto. Use **Plan mode** before large refactors/migrations.
- **Bypass only in sandboxed containers/VMs**; admins should disable org-wide. It is NOT a total bypass (explicit `ask` rules still fire).
- VS Code: `claudeCode.initialPermissionMode` (default `default`) — set to `plan`/`default` (not `acceptEdits`/`bypassPermissions`) for untrusted/shared code. `allowDangerouslySkipPermissions` (default `false`) adds Bypass to the selector — sandbox-only.

### Claude Code on the web (cloud sessions)

Research preview at `claude.ai/code` on Anthropic-managed Ubuntu 24.04 VMs (fresh, isolated per session, repo cloned, **setup scripts run as root**). Pro/Max/Team, and Enterprise with premium or Chat+Claude Code seats.

**Config travels via the repo only.** User `~/.claude` config is **invisible** to cloud.

```
Carries over (in repo clone):  CLAUDE.md, .claude/settings.json hooks,
  .mcp.json (project MCP), .claude/rules|skills|agents|commands,
  plugins declared in repo .claude/settings.json, skills enabled on claude.ai
Does NOT carry over:  ~/.claude/CLAUDE.md, user skills/agents/commands,
  user-only enabledPlugins, `claude mcp add` servers, API tokens, AWS SSO
```

- Use `CLAUDE.md` (`/memory`) for persistent standing instructions; cloud sessions don't inherit local config.
- **GitHub auth, two methods:** (1) GitHub App authorized in web onboarding (required for Auto-fix PR webhooks); (2) run `/web-setup` *inside the CLI* (v2.1.80+, claude.ai auth) to sync the local `gh` token to your Claude account and create a default env. **App install is NOT an access control** — a session can reach any repo the connected GitHub account sees; restrict via GitHub **team/repo membership**. Disable `/web-setup` org-wide via the **Quick web setup** toggle.

**Environments** (created/edited only from the web UI) control network access + a setup script per environment.

- Network levels: `None` (no outbound), `Trusted` (default; npm/PyPI/RubyGems/crates.io/GitHub/cloud SDKs), `Full` (any domain), `Custom` (one domain/line, `*.` wildcard, optional default-registry checkbox). Use **Custom + minimal allowlist** for internal/private hosts. Even at `None`, Claude can still reach the Anthropic API (data may exit). All egress passes a security proxy — **Bun package fetching is a known breakage**.
- **GitHub proxy** restricts `git push` to the current working branch only; token never enters the container — prefer this over embedding secrets.
- **Env vars:** `.env` format, **do NOT quote values** (quotes are stored literally). Visible to anyone who can edit the environment — **no secrets store exists**.

**Setup scripts** (Bash, root, run only when no cached env exists; ~5-minute cache-build budget):
- Non-zero exit **fails session start** — append `|| true` to non-critical commands.
- Parallelize installs with `&` + final `wait`; move large downloads (Docker images, model weights) into a background `SessionStart` hook; add `set -x` to debug.
- Re-runs **only** on script change, allowed-hosts change, or ~7-day cache expiry — **resuming never re-runs them**.
- `SessionStart` hooks (repo `.claude/settings.json`) run in **both local and cloud**, on every session/resume, with no caching benefit (added latency). Gate cloud-only work on `CLAUDE_CODE_REMOTE=true`; persist env vars via `$CLAUDE_ENV_FILE`. Pre-installed: Python 3.x, Node 20-22 (nvm), Ruby, PHP 8.4, OpenJDK 21, Go, Rust, Docker, PostgreSQL 16, Redis 7 (both **not running by default** — `service postgresql start`). **`gh` is NOT pre-installed** (`apt install -y gh` + `GH_TOKEN`). Run `check-tools` for exact versions.

**Cloud workflow patterns:**
- `claude --remote "<task>"` creates a NEW cloud session (clones current branch — push first). Each is independent → run in parallel, monitor with `/tasks`; **they share account rate limits**.
- **Plan-locally-execute-remotely:** `claude --permission-mode plan` to design, commit/push the plan, then `claude --remote "Execute the plan in docs/..."`.
- **Teleport (one-way, CLI→cloud pull):** `claude --teleport [<session-id>]`, `/teleport`/`/tp`, `t` in `/tasks`, or "Open in CLI". Requires clean git tree, same non-fork repo, branch pushed to remote, claude.ai auth. You **cannot** push terminal→web from CLI (only Desktop's "Continue in").
- **Bundle (no GitHub):** `claude --remote` from a non-GitHub repo uploads it (history + uncommitted tracked changes). Needs ≥1 commit, **<100MB**; untracked files excluded (`git add` first); **bundled sessions can't push back** unless GitHub auth is configured.
- Set the default `--remote` environment with `/remote-env`. Use distinct, specific prompts (name the file/function, paste error output).
- Resource ceilings: **4 vCPU / 16GB RAM / 30GB disk** — can silently kill large builds/memory-heavy tests.
- Context: `/compact` (accepts focus, e.g. `/compact keep the test output`) and `/context` work; **`/clear` does not** — start a new session. `/model`, `/config` pickers unavailable. Compact earlier via `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70`. Agent teams off by default (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).
- **Traceability:** v2.1.179+ adds `Claude-Session: <url>` git trailer + session URL in PR bodies; `attribution.sessionUrl=false` (v2.1.182+) omits both. ID in `CLAUDE_CODE_REMOTE_SESSION_ID` (transcript link: swap `cse_`→`session_`).
- **Auto-fix PRs** (needs GitHub App on that repo): toggle via CI status bar, `/autofix-pr`, mobile, or PR URL. Can't handle merge conflicts (no base-advance webhook — ask Claude to rebase). **Replies post under your GitHub account** → can trigger `issue_comment` automation (Atlantis/Terraform/Actions) running privileged ops — audit before enabling.
- **Blockers:** Org IP allowlisting breaks all cloud sessions + Code Review + Routines (traffic originates from Anthropic infra) — get Anthropic-hosted services exempted. **ZDR orgs cannot use cloud sessions or `/web-setup` at all.** Self-hosted GitHub Enterprise Server supported (Team/Enterprise).
- Prefill via `claude.ai/code` query params: `prompt`/`q`, `prompt_url`, `repositories`/`repo` (comma-sep slugs), `environment`. Good for issue-tracker buttons.

### Desktop

- Three environments: **Local**, **Remote** (cloud, continues if app closed — use for long refactors/migrations/test suites), **SSH** (auto-installs Claude Code on remote on first connect).
- Each git-repo session gets its own **Git worktree** in `<project-root>/.claude/worktrees/` (location/branch-prefix configurable). Isolate concurrent work into separate parallel sessions, not one multiplexed session. Use side chats (`/btw`, Cmd/Ctrl+`;`) for tangential questions without polluting main context.
- Add context up front: `@filename`, attached images/PDFs, drag-and-drop. Interrupt mid-run (type + Enter to steer, or stop to halt). Review diffs and comment on specific lines — Claude reads comments and revises. **Verbose** transcript view to debug an action; **Summary** view to scan many parallel sessions.
- Edit permission rules / hooks / skills by **editing settings files directly** — `/permissions`, `/config`, `/agents`, `/doctor` reply "isn't available in this environment".
- **Preview/dev servers:** `.claude/launch.json` (JSONC) — `port` (default 3000), `autoPort` (`true`=free port via `PORT`; `false`=fail on conflict, use for **OAuth callbacks/CORS allowlists**; unset=ask once). `autoVerify` on by default (screenshots after each edit). **Do not put secrets in `env`** (the file is committed) — use the local environment editor.
- **Env var pitfalls:** Dock/Finder launch (macOS) only inherits PATH + fixed Claude vars from shell profile — other exported vars dropped. Windows doesn't read PowerShell profiles. `env` in `~/.claude/settings.json` reaches Claude sessions but **NOT dev servers** — use the local environment editor for dev-server vars.
- Standalone CLI does **not** read `claude_desktop_config.json` — import with `claude mcp add-from-claude-desktop`. Migrate a CLI session into Desktop with `/desktop` (macOS/Windows, subscription auth; not API key/Bedrock/Vertex/Foundry).

### VS Code extension

- VS Code 1.98.0+. **Install the standalone CLI alongside** for CLI-only features (full skill/command set, `claude mcp add`, `claude --resume`, `!` bash, tab completion, `claude` on PATH).
- MCP: **extension cannot add servers** (`claude mcp add` in the integrated terminal — config shared with the panel); manage existing via `/mcp` (enable/disable, OAuth). Example: `claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer YOUR_GITHUB_PAT"`.
- A hidden built-in **`ide` MCP server** (bound to 127.0.0.1, random port, 0600 token) auto-connects and exposes only `mcp__ide__getDiagnostics` (read) and `mcp__ide__executeCode` (Python in active Jupyter kernel). **PreToolUse allowlist hooks must account for these** (the server is hidden from `/mcp`). `mcp__ide__executeCode` always shows a separate in-VS-Code Quick Pick confirmation — an allowlist entry only lets Claude *propose* the cell.
- While the IDE MCP is connected, the CLI sends current selection + active file path with every prompt. **Add a `Read` deny rule** for sensitive paths (e.g. `.env`) — it blocks both selected-text and open-file context, not just file reads.
- Key settings: `respectGitIgnore` (true), `usePythonEnvironment` (true), `autosave` (true), `disableLoginPrompt` (for 3P providers), `claudeProcessWrapper`/`claudeCode...` for custom binary, `useTerminal` (false), `preferredLocation` (panel/sidebar). Enable Restricted Mode + manual edit approval for untrusted workspaces (auto-edit can modify `settings.json`/`tasks.json` that VS Code auto-executes).
- `@terminal:name` references terminal output; `@file#start-end` references lines. URI handler `vscode://anthropic.claude-code/open` accepts `prompt` (pre-filled, not sent) + `session`. Continue an extension conversation in CLI via `claude --resume`. Browser automation: `@browser` (Claude in Chrome v1.0.36+).

### JetBrains plugin

- Runs `claude` in the IDE integrated terminal; **CLI and plugin must both be installed**. Settings → Tools → Claude Code [Beta]; **Claude command** field sets the launch path (e.g. `claude`, `/usr/local/bin/claude`, `npx @anthropic-ai/claude-code`). WSL: `wsl -d Ubuntu -- bash -lic "claude"`.
- **Start Claude from the IDE project root** (integrated terminal) — features only activate there, else "No available IDEs detected". `/ide` connects an external-terminal session.
- **Remote Development:** install the plugin on the **remote host** (Settings → Plugin (Host)), not the local client. Diagnostics auto-shared; current selection/active tab auto-shared (use `Read` deny rules to block sensitive files). `/config` → diff tool `auto` (IDE) or `terminal`. Insert refs `@src/auth.ts#L1-99` via Cmd+Option+K / Alt+Ctrl+K.
- **Prefer manual edit approval** over auto-edit (auto-edit can modify IDE config files the IDE auto-executes, bypassing bash prompts). If ESC doesn't interrupt: uncheck Settings → Tools → Terminal → "Move focus to the editor with Escape".

### Remote Control (local session, mobile/web window)

The session runs **locally** — nothing moves to the cloud (contrast Claude Code on the web). Requires v2.1.51+ (VS Code 2.1.79+, mobile push 2.1.110+), claude.ai OAuth, and a workspace-trust acceptance (`claude` run once in the dir).

- **Team default OFF** on Team/Enterprise — admin enables the org-wide toggle at `claude.ai/admin-settings/claude-code`. Per-device block via `disableRemoteControl` (managed settings).
- Three invocations: server mode `claude remote-control` (multi-session); interactive `claude --remote-control`/`--rc` (also controllable remotely); `/remote-control`/`/rc` inside a session (VS Code uses these). `--remote-control` is **unrelated** to `--remote` (which creates cloud sessions).
- **Server-mode flags:** `--spawn <same-dir|worktree|session>` (default `same-dir` lets sessions conflict on the same files — use `worktree`, or press `w` to toggle); `--sandbox`/`--no-sandbox` (**off by default** — pass `--sandbox` for shared/CI machines); `--capacity <N>` (default 32, incompatible with `--spawn=session`); `--name`, `--remote-control-session-name-prefix`, `--verbose` (last three flags unavailable with the `/remote-control` command).
- Connection is **outbound HTTPS:443 only**, never opens inbound ports; short-lived single-purpose credentials.
- Enable for all sessions: `/config` → "Enable Remote Control for all sessions" (each interactive process then registers its own session — can proliferate).
- **Mobile push:** `/config` → "Push when Claude decides" / "Push when actions required". Skipped while you're focused on the terminal; `CLAUDE_CLIENT_PRESENCE_FILE` (v2.1.181+) extends suppression while a marker file exists (pair with a screen-lock listener so pushes fire only when away).
- Mobile/web commands: `/compact`, `/clear`, `/context`, `/usage`, `/exit`, `/recap`, `/reload-plugins`, `/mcp` (v2.1.166+; `reconnect` with no name reconnects all), `/config` (v2.1.181+, `key=value`). **`/plugin` and `/resume` are local-only** (interactive pickers).
- Debug: `claude doctor` (shows failed eligibility check) + `--verbose`; after a plan change, `claude auth logout` then `login`.

### Channels (push external events into a running session)

MCP server (installed as a plugin, stdio subprocess on the same machine) that pushes webhooks/alerts/chat into a live session via `notifications/claude/channel`; can be two-way. Research preview, **v2.1.80+** (permission relay v2.1.81+). claude.ai or Console API key only (**not** Bedrock/Vertex/Foundry).

- Enable per-session: `claude --channels plugin:<name>@<marketplace>` (space-separated for multiple). **Being in `.mcp.json` is not enough** — the server must also be named in `--channels`.
- Two managed switches: `channelsEnabled` (master) + `allowedChannelPlugins` (restricts registration; replaces the Anthropic allowlist when set). To **fully block** including the dev flag, leave `channelsEnabled` **unset** (an empty array does NOT block `--dangerously-load-development-channels`).
- **Security is mandatory:** gate inbound messages against a **sender allowlist** before calling `mcp.notification()` — an ungated channel is a prompt-injection vector. Gate on **sender identity** (`message.from.id`), never room/chat id. Bind the local HTTP listener to **127.0.0.1**. Only declare the `claude/channel/permission` capability on channels that authenticate the sender (any allowlisted sender can approve/deny tool use). After pairing, lock down with `/<channel>:access policy allowlist`.
- **Permission relay** covers Bash/Write/Edit approvals only (project-trust and MCP-consent dialogs never relay). Include the five-letter `request_id` (alphabet a-z minus `l`) verbatim in the outbound prompt and parse replies case-insensitively. For unattended use, run in `-p` mode (auto-disables terminal-input tools so the session never stalls) inside a background/persistent process. Use separate sessions for independent event streams.
- Plugins are Bun scripts (need Bun). Tokens in `~/.claude/channels/<name>/.env`. Run `/reload-plugins` after install. User-level registration (`~/.claude.json`) needs an **absolute** command path; project `.mcp.json` may use relative. Validate the flow with the **fakechat** demo (`http://localhost:8787`). iMessage needs **Full Disk Access** for the terminal. Debug trace: `~/.claude/debug/<session-id>.txt`; status via `/mcp`.

### Computer use

macOS-only research preview, **Pro/Max only** (not Team/Enterprise), v2.1.85+, claude.ai auth, interactive only (**not `-p`**). Built-in MCP server `computer-use`, off by default — enable once per project via `/mcp`.

- **Tool precedence (broadest/slowest last):** dedicated MCP server > Bash > Claude in Chrome > computer use. Reserve it for native/Electron apps, simulators, GUI-only tools.
- Grant **Accessibility + Screen Recording** (restart Claude Code after granting Screen Recording). Per-session, per-app approval; control tiers fixed by category: browsers/trading = view-only, terminals/IDEs = click-only, else full. Sentinel warnings flag high-reach apps ("Equivalent to shell access", "Can read or write any file", "Can change system settings") but **do not block**.
- **Machine-wide lock** — only one session controls the machine; finish/exit before starting another. Runs on the **real desktop** (weaker trust boundary than sandboxed Bash; on-screen prompt injection is a real risk). The terminal stays visible (excluded from screenshots) — watch it and abort with **Esc / Ctrl+C** (Esc is consumed so injection can't dismiss dialogs). Screenshots auto-downscale (no size setting; if text is unreadable, enlarge in-app — resolution changes don't help). CLI has no denied-apps list (Desktop does).

### Deep links (`claude-cli://`)

v2.1.91+. Opens a new terminal window with pre-filled cwd + prompt; **prompt is filled but NOT sent** until Enter (nothing reaches the model on its own). Handler auto-registers on first interactive session (macOS/Linux/Windows, user-level).

- Only path: `claude-cli://open`. `q` = URL-encoded prompt (`encodeURIComponent`, `%0A` newline, **≤5,000 chars**). `cwd` = absolute path (network/UNC rejected). `repo` = `owner/name` → resolves to a clone where `claude` has run at least once (else opens home dir). **`cwd` wins over `repo`** (even a typo'd nonexistent cwd does not fall back).
- **Team use:** prefer `repo=owner/name` (each person's clone path differs) over `cwd` (only for standardized devcontainer/VM paths). Store long runbook prompts as a repo `/skill` and have `q` just name the skill. Embed links in runbooks, alerts, dashboards, onboarding wikis.
- Enforce-disable org-wide: `disableDeepLinkRegistration` in managed settings (`"disable"` in user settings.json otherwise).
- **GitHub Markdown strips `claude-cli://`** in READMEs/issues/PRs/wikis (renders as plain text) — put links in a **code block**. Prompts >1,000 chars push instructions off-screen (warning banner says scroll/review — a prompt-injection consideration for untrusted links). VS Code registers a separate `vscode://anthropic.claude-code/open` handler.

### Worktrees (parallel isolated sessions)

`claude --worktree <name>` (`-w`) creates `.claude/worktrees/<name>/` on branch `worktree-<name>` and starts there (omit name → auto-generated). Branches from `origin/HEAD` by default. Run one session per worktree in separate terminals to build a feature + fix a bug concurrently without collisions. The Desktop app creates a worktree per session automatically.

- `worktree.baseRef`: `"fresh"` (default, from `origin/HEAD` — **excludes unpushed local commits**) or `"head"` (local HEAD, carries unpushed work — set this when isolating subagents on in-progress work). Arbitrary refs rejected.
- `claude --worktree "#1234"` (or a PR URL) fetches `pull/<n>/head` into `.claude/worktrees/pr-<n>`.
- **`.worktreeinclude`** (project root, `.gitignore` syntax) copies gitignored config (`.env`, secrets) into new worktrees — **only files that are both matched AND gitignored** are copied. Add `.claude/worktrees/` to `.gitignore`. **Re-initialize the dev env** per worktree (deps/venv/setup don't carry over).
- Subagents: `isolation: worktree` in frontmatter (same baseRef). `EnterWorktree` tool creates/switches mid-session.
- **Cleanup:** clean worktrees (no uncommitted/untracked/new commits) auto-remove on exit (**named sessions prompt instead**). `--worktree` worktrees are **never** swept by `cleanupPeriodDays` (only subagent/background ones are). `claude -p --worktree` skips the trust check and is never auto-cleaned — remove with `git worktree remove`. First interactive `--worktree` in a dir needs prior `claude` trust acceptance. Removing a worktree with changes **discards them**; running agents `git worktree lock` it (force: `git worktree remove --force`).
- `WorktreeCreate`/`WorktreeRemove` hooks fully replace git logic (non-git VCS) — but a `WorktreeCreate` hook **disables `.worktreeinclude`**, so copy config inside the hook. For specific branches/locations outside the repo, use `git worktree add` manually.

### Voice dictation

v2.1.69+ (tap mode 2.1.116+). **claude.ai auth only** (not API key/Bedrock/Vertex/Foundry); **fully disabled for HIPAA orgs**. Audio streams to Anthropic for transcription — does not consume tokens or count toward `/usage`. Needs local mic — **unavailable in web, SSH, and VS Code Remote** (SSH/Dev Containers/Codespaces).

- Enable: `/voice` (toggle), `/voice hold` (default), `/voice tap`, `/voice off`. Persist: `{"voice": {"enabled": true, "mode": "tap"}}`. `autoSubmit` sends on release (hold) / at ≥3 words (tap); tap auto-stops after 15s silence or 2min.
- Rebind `voice:pushToTalk` (Chat context, default `Space`) in `~/.claude/keybindings.json` — **don't bind a bare letter in hold mode** (it types during warmup; key-repeat needed). Use a modifier combo (e.g. `meta+k`) to skip warmup, or tap mode. Language follows the `language` setting. **WSL2:** needs WSLg + `sudo apt install sox libsox-fmt-pulse` (plain `sox` uses the ALSA backend, which can't record). Linux falls back to `arecord`/`rec`.

### Usage & context monitoring

- `/usage` (v2.1.174+) opens Account & usage and flags behaviors ≥10% of recent usage (cache misses, long context, subagent-heavy/parallel sessions) with per-skill/subagent/plugin/MCP attribution. **Figures are local-machine-only** — under-reports team/multi-device usage. **Plan usage is shared across all surfaces**; context usage is per-session.
- Use `/compact` proactively before auto-summarization; watch the context ring.

### Gotchas

- **Auth silently excludes features:** `ANTHROPIC_API_KEY` in env blocks Remote Control; `setup-token`/`CLAUDE_CODE_OAUTH_TOKEN` are inference-only; Bedrock/Vertex/Foundry disable channels, computer use, voice, teleport, `/web-setup`, `/desktop`, Remote Control.
- **Channels fail silently:** if `channelsEnabled` is off the MCP server still connects and tools work, but messages never arrive (only a startup warning). A successful `curl` does NOT mean Claude got the event — events drop silently if not loaded as a channel or blocked by policy. Off-allowlist plugins don't error loudly. `meta` keys with hyphens/non-identifier chars are silently dropped. Claude's channel reply text is not shown in the terminal (only the tool call + "sent"). A wrong/expired `request_id` verdict is dropped while the dialog stays open. Stale process holding the port → `curl: connection refused` (`lsof -i :<port>`).
- **Cloud config invisibility:** user `~/.claude` config never reaches cloud — only repo-committed config does. `/clear`, `/model`, `/config` pickers, `@mention`, the `+` button, terminal pane, and file editing are absent in cloud (ask Claude to edit files). Cloud has only Accept edits/Plan/Auto (no Ask/Bypass). Closing the browser tab does NOT stop a cloud session.
- **Setup-script traps:** non-zero exit fails session start; resuming never re-runs the script (config changes inside it may not take effect); `SessionStart` hooks also run locally and add latency every session; heavy scripts silently blow the ~5-min budget → generic container error. `.env` values must not be quoted.
- **Cloud blockers:** org IP allowlisting breaks all cloud sessions + Code Review + Routines; ZDR orgs are fully blocked; resource ceilings (4 vCPU/16GB/30GB) silently kill large jobs; cloud sessions share rate limits; `git push` restricted to the working branch; `--teleport` is one-way (CLI→cloud pull only); bundled sessions can't push back; Max/Pro **Public** sharing has repo-access verification OFF by default (may expose private code/credentials).
- **Auto-fix:** can't handle merge conflicts; PR replies post under your GitHub account and can trigger privileged `issue_comment` automation.
- **Computer use:** Team/Enterprise can't use it at all; not scriptable (`-p` unavailable); runs on the real desktop (prompt-injection risk); macOS may keep re-prompting for Screen Recording until you fully quit/restart; approving a terminal/Finder/System Settings app grants shell/file/system access (warned, not blocked); only one session holds the machine lock.
- **Deep links:** `cwd` silently overrides `repo` (even when cwd doesn't exist); `repo` only resolves to clones where `claude` has run; GitHub strips the scheme; handler registration needs a prior interactive session; `repo` doesn't change the checked-out branch.
- **Managed-settings distribution:** remotely-pushed managed settings don't reach Desktop (need MDM/on-disk); `sshHostAllowlist` is Desktop-only and doesn't restrict Bash `ssh` or egress; `autoMode` rules ignore checked-in `.claude/settings.json`.
- **Desktop:** not on Linux; Windows local sessions silently require Git installed; Dock/Finder launch drops most env vars; `env` in settings.json doesn't reach dev servers; preview detection uses the selected cwd folder (subfolders with own dev servers won't auto-detect); terminal-dialog slash commands unavailable; `MAX_THINKING_TOKENS=0` is ignored on adaptive-reasoning models (Opus 4.7+, no fixed-budget mode).
- **IDE extensions:** installing does NOT add `claude` to PATH (bundled CLI is panel-private); extension can't add MCP servers (CLI-only); the hidden `ide` MCP server can be missed by PreToolUse allowlist hooks; IDE auto-shares selection/active-file context (leaks sensitive files without a `Read` deny rule); auto-edit can modify auto-executed IDE config files; the extension's command/skill subset differs from the CLI; `/usage` under-reports multi-device usage; if `ANTHROPIC_API_KEY` is set but the sign-in prompt still appears, launch via `code .` from a terminal so VS Code inherits the shell env; on macOS Tahoe+ the system Game Overlay steals Cmd+Esc.
- **JetBrains:** plugin doesn't ship the CLI ("Cannot launch Claude Code" if not on PATH — set full path); installing often needs a complete IDE restart (sometimes multiple); for Remote Dev install on the host not the client; features only activate from the integrated terminal at project root; WSL2 "No available IDEs detected" = NAT/firewall — add a firewall rule or use `networkingMode=mirrored`.
- **Remote Control:** the local process must stay running (closing terminal/VS Code ends it); ~10 min network unreachability times it out; an ultraplan session silently disconnects an active Remote Control session; outside server mode it's one session per process; the admin toggle can be permanently grayed out by a data-retention/compliance config (only Anthropic support can change it); default `--spawn=same-dir` lets remote sessions conflict; sandboxing is off by default.
- **Voice:** silently unavailable on API key/Bedrock/Vertex/Foundry and HIPAA orgs; bare-letter hold key breaks; hold fails if OS key-repeat is disabled; no audio on headless/remote shells (self-pauses after repeated failures); the "hold Space to speak" hint vanishes if a custom status line is configured.
- **Worktrees:** `--worktree` worktrees are never auto-swept; `claude -p --worktree` skips trust and never auto-cleans (orphans); first interactive `--worktree` needs prior trust acceptance; a `WorktreeCreate` hook silently disables `.worktreeinclude`; default `fresh` baseRef omits unpushed commits; removing a worktree with changes discards them; running agents lock their worktree.


---

## Monitoring, analytics & troubleshooting

This section covers the four interlocking surfaces a lead needs: the **analytics dashboards** (adoption/ROI), **OpenTelemetry export** (per-user cost, SIEM/audit), **error handling & resilience** (retries, capacity, auth), and **install/runtime troubleshooting**. Lead with the dashboards and OTel because they are what a team setup *adds* over single-user use.

---

## Analytics & ROI dashboards

### Where the dashboards live

| Dashboard | URL | Who can view |
|---|---|---|
| Team/Enterprise analytics | `claude.ai/analytics/claude-code` | Admins and Owners only |
| API/Console insights | `platform.claude.com/claude-code` | `UsageView` permission — Developer, Billing, Admin, Owner, Primary Owner |
| Analytics config / toggle | `claude.ai/admin-settings/claude-code` | Owner role only |
| GitHub app install | `github.com/apps/claude` | GitHub admin |

- **Console team insights**: Members (API-key users by key identifier; OAuth users by email), **Spend this month** (per-user), **Lines this month** (per-user).
- **Summary metrics**: PRs with CC, Lines of code with CC, PRs with Claude Code (%), Suggestion accept rate, Lines of code accepted.
- **Leaderboard** shows top 10 users; use **Export all users** for a complete per-user CSV (all users, not just top 10).

### Enabling contribution (GitHub) metrics

Sequence the setup in this exact order:

1. GitHub admin installs the Claude GitHub app at `github.com/apps/claude`.
2. A Claude **Owner** enables Claude Code analytics at `claude.ai/admin-settings/claude-code`.
3. Enable the **GitHub analytics** toggle.
4. Authenticate with GitHub and select orgs.

- Public beta; **Teams and Enterprise plans only**. Supports GitHub Cloud and GitHub Enterprise Server.
- Contribution data typically appears **within 24 hours** (sometimes "a few days" to process), with daily updates. An empty dashboard usually means the GitHub app isn't installed yet.
- Merged PRs with Claude-assisted lines are labeled **`claude-code-assisted`** in GitHub — query adoption programmatically by searching GitHub for that label rather than relying only on the dashboard.

### How attribution works (and what it excludes)

- **PR attribution window**: sessions from **21 days before to 2 days after** the PR merge date are matched. Source/destination branch is ignored.
- Code **rewritten >20%** by the developer is **not** credited to Claude Code.
- **Effective lines** = lines with >3 chars after normalization (trim whitespace, collapse spaces, standardize quotes, lowercase), excluding empty lines and bracket/punctuation-only lines.
- **Suggestion accept rate** = % of times users accept Edit, Write, and NotebookEdit tool usage.
- **Lines of code accepted** excludes rejected suggestions and does **not** track later deletions.
- **Auto-excluded files**: lock files (`package-lock.json`, `yarn.lock`, `Cargo.lock`), generated/minified/protobuf code, build dirs (`dist/`, `build/`, `node_modules/`, `target/`), test fixtures (snapshots, cassettes, mock data), and any line >1,000 chars.

### Using the data for a team

- Treat reported numbers as a **deliberate underestimate** — only high-confidence attributions count. Don't read low numbers as low usage.
- Measure ROI via **PRs-per-user over time** and PRs/lines shipped with vs without Claude Code, correlated with DORA metrics or sprint velocity.
- Use the **Leaderboard** to find power users for onboarding/technique-sharing; watch the **Adoption** chart for dips that signal friction.
- For **per-user token counts and cost estimates**, the dashboard does NOT surface them — configure OpenTelemetry export (below).

---

## OpenTelemetry: cost, usage & audit export

The dashboard gives adoption; **OTel gives per-user cost, token breakdowns, and a SIEM/audit stream.** Configure fleet-wide via the managed settings file `env` block (high precedence, not user-overridable; distribute via MDM).

### Enabling telemetry

```
CLAUDE_CODE_ENABLE_TELEMETRY=1
OTEL_METRICS_EXPORTER=otlp|prometheus|console|none
OTEL_LOGS_EXPORTER=otlp|console|none
OTEL_EXPORTER_OTLP_PROTOCOL=grpc|http/protobuf|http/json
OTEL_EXPORTER_OTLP_ENDPOINT=...
OTEL_EXPORTER_OTLP_HEADERS=...
```

Exporters are comma-separated for multiple. Use the official **`anthropics/claude-code-monitoring-guide`** repo for ready-made Docker Compose, Prometheus, and OTel Collector setups plus Linear-integrated productivity reports.

### Export intervals (defaults — only lower for debugging, then reset)

```
OTEL_METRIC_EXPORT_INTERVAL=60000   # 60s
OTEL_LOGS_EXPORT_INTERVAL=5000      # 5s
OTEL_TRACES_EXPORT_INTERVAL=5000    # 5s
```

Leaving 1s debug intervals in production floods the exporter.

### Exported metrics

`claude_code.session.count`, `.lines_of_code.count`, `.pull_request.count`, `.commit.count`, `.cost.usage` (USD), `.token.usage` (tokens), `.code_edit_tool.decision`, `.active_time.total` (s).
- Break tokens by **type** (input/output/cacheRead/cacheCreation) and **model**; attribute spend to skills/plugins/subagents via `skill.name`, `plugin.name`, `agent.name` on `cost.usage`/`token.usage`.
- `model` attribute is on `token.usage` and `cost.usage`; on `lines_of_code.count` only from **v2.1.172+**.
- **Cost metrics are approximations, not billing-grade** — reconcile with Claude Console / Bedrock / Vertex.
- Meter name `com.anthropic.claude_code`; resource attrs on all exports: `service.name=claude-code`, `service.version`, `os.type`, `os.version`, `host.arch`, `wsl.version` (WSL only).

### Multi-team cost attribution

Set `OTEL_RESOURCE_ATTRIBUTES` per group (managed settings or launch wrapper) so metrics can be sliced by custom dimensions:

```
OTEL_RESOURCE_ATTRIBUTES=department=engineering,team.id=platform,cost_center=eng-123
```

- These become queryable **labels on every metric datapoint and event** (as of the OTel datapoint-labels change) — segment dashboards/alerts by them.
- On **Bedrock/Vertex/Foundry/direct-API** there is **no Claude account identity** (only `user.id` and `session.id` populate) — inject `enduser.id=jdoe@example.com` yourself via `OTEL_RESOURCE_ATTRIBUTES`, or events can't map to real users.

### Cardinality & storage control

| Toggle | Default | Effect |
|---|---|---|
| `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` | true | false → custom attrs in OTLP resource block only, not per-datapoint labels |
| `OTEL_METRICS_INCLUDE_SESSION_ID` | true | drop `session.id` |
| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | true | drop account UUID |
| `OTEL_METRICS_INCLUDE_VERSION` | false | — |
| `OTEL_METRICS_INCLUDE_ENTRYPOINT` | false | — |

- `OTEL_METRICS_TEMPORALITY_PREFERENCE=delta` (default); set `cumulative` for Prometheus-style backends.
- Standard attributes: `organization.id`, `user.account_uuid`, `user.account_id`, `user.email` (OAuth only), `user.id` (anonymous, persisted in `~/.claude.json`), `session.id`, `terminal.type`. Custom keys never override standard ones on collision.

### Logs / SIEM / audit

- Enable the **OTLP logs exporter** and `OTEL_LOG_TOOL_DETAILS=1` to capture MCP server/tool names, Bash commands, and call arguments on `tool_result`, `tool_decision`, `mcp_server_connection` events. Point `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` at the SIEM OTLP receiver or a Collector.
- **Audit events**: `tool_decision`, `permission_mode_changed`, `hook_execution_complete`, `auth`, `mcp_server_connection`, `plugin_installed`/`plugin_loaded`, `tool_result`. Claude Code emits raw events only — anomaly detection/alerting is the SIEM's job.
- Use **`prompt.id`** to correlate all `api_request`/`tool_result` events from one user prompt (intentionally absent from metrics).
- Content flags (all default off, data goes only to your endpoint, never to Anthropic):

| Flag | Effect |
|---|---|
| `OTEL_LOG_USER_PROMPTS=1` | log prompt content (else length only) |
| `OTEL_LOG_TOOL_DETAILS=1` | log tool params/args; values >512 chars truncated, payload bounded ~4K |
| `OTEL_LOG_TOOL_CONTENT=1` | tool input/output in span events (needs tracing; 60KB cap) |
| `OTEL_LOG_RAW_API_BODIES=1` | full Messages API JSON (60KB inline) or `=file:<dir>` (untruncated to disk) — **includes full conversation history**; extended-thinking always redacted |

- Third-party plugin/skill names are redacted to `third-party`/`custom` unless `OTEL_LOG_TOOL_DETAILS=1`; `plugin_id_hash` counts distinct plugins without names (sent only to your exporter).

### Tracing (beta)

- Requires `CLAUDE_CODE_ENABLE_TELEMETRY=1` **AND** `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1` plus `OTEL_TRACES_EXPORTER`. Span tree: `claude_code.interaction > llm_request / hook / tool`.
- **Detailed hook spans** additionally need `ENABLE_BETA_TRACING_DETAILED=1` + `BETA_TRACING_ENDPOINT` (and org allowlisting for interactive CLI; Agent SDK / `-p` are not gated) — setting only `ENHANCED_TELEMETRY_BETA` won't emit hook spans.
- Bash/PowerShell subprocesses inherit a `TRACEPARENT` env var. Through a custom `ANTHROPIC_BASE_URL` proxy, propagation is off by default — set `CLAUDE_CODE_PROPAGATE_TRACEPARENT=1`.

### Auth for the exporter

- **mTLS**: http/protobuf|http/json → `CLAUDE_CODE_CLIENT_CERT`/`CLAUDE_CODE_CLIENT_KEY` (+passphrase) and `NODE_EXTRA_CA_CERTS`; grpc → `OTEL_EXPORTER_OTLP_CLIENT_KEY`/`CERTIFICATE` + `OTEL_EXPORTER_OTLP_CERTIFICATE`.
- **Dynamic/short-lived OTLP tokens** (http/protobuf or http/json only): set `otelHeadersHelper` in `settings.json` to a script printing JSON header key/values; refreshes ~every 29 min (tune with `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS`). The grpc exporter uses only the static `OTEL_EXPORTER_OTLP_HEADERS`.

### Querying telemetry for ops

- Detect **stalled vs recovered** sessions by grouping events on `session.id` and checking for an `api_request` after an `api_error`; `attempt > CLAUDE_CODE_MAX_RETRIES` on a transient error = retry exhaustion.
- `claude_code.api_error` fires **only after retries are exhausted** (terminal); intermediate retries are not separate events — count retries via the `attempt` attribute.
- Per-model commit/PR counts aren't directly available across model spans — approximate by joining commit/PR against token/cost metrics on `session.id` (one session can span multiple models).

---

## In-session cost & usage commands

- **`/usage`** (subsumes `/cost` and `/stats`; old names route to the right tab) — per-category breakdown attributing plan-limit consumption to **skills, subagents, plugins, MCP servers**; press `d`/`w` for day/week. Shows what drives limits (parallel sessions, subagents, cache misses, long context) as % of last 24h with per-item optimization tips. The lever for cost/limit governance.
- **`/cost`** — per-model and cache-hit breakdown (subscription users).
- **`/context`** — window breakdown (system prompt, tools, memory files, messages) + MCP tool token usage.
- **`claude plugin details <name>`** / `/plugin` Browse/Discover — review a plugin's component inventory and **projected per-session token cost** before installing.
- `/usage-credits` (renamed from `/extra-usage`; old name still works) — plan limits/credits.

---

## Errors, capacity & resilience

### Retries & timeouts

| Setting | Default | Notes |
|---|---|---|
| `CLAUDE_CODE_MAX_RETRIES` | 10 | **Capped at 15** (values above clamped); lower it in scripts for fast failure |
| `CLAUDE_CODE_RETRY_WATCHDOG` | unset | `=1` makes unattended/CI sessions retry 429/529 capacity errors **indefinitely** instead of failing — prefer this over raising MAX_RETRIES for long runs |
| `API_TIMEOUT_MS` | 600000 (10 min) | per-request timeout; raise for slow networks/proxies |

- Retries cover 5xx, 529 overloaded, request timeouts, transient 429 throttles, dropped connections (exponential backoff; spinner shows `Retrying in Ns · attempt x/y`). As of v2.1.185 a 20s stream stall shows `Waiting for API response · will retry…`.

### Capacity / overload (per-model)

- **529 Overloaded** / "Server is temporarily limiting requests" do **not** count against quota; capacity is **per model** — switch with **`/model`** to keep the team working during incidents.
- Reduce **429s** under heavy parallel load: lower `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY`, limit parallel subagents, or use a smaller model for high-volume scripted runs.
- A stray `ANTHROPIC_API_KEY` routing through a low-tier key also causes 429s — run `/status` to confirm the active credential.

### Fallback models

- `fallbackModel` accepts up to **3 models tried in order** on overload/unavailability; `--fallback-model` applies to **both interactive and non-interactive** runs and is respected by context compaction. On primary not-found, the session switches to the fallback for the rest of the session instead of failing every request.

### Auth precedence & failures

- **Precedence**: env vars (`ANTHROPIC_API_KEY`) and `apiKeyHelper` take precedence over `/login`; in `-p` mode an `ANTHROPIC_API_KEY` is **always used when present**. Running `/login` alone does NOT fix auth while a higher-precedence key source exists — unset/remove it first.
- A stale `ANTHROPIC_API_KEY` (e.g. from a previous employer, loaded by direnv/dotenv/IDE terminals) can yield `This organization has been disabled` despite an active subscription. Standardize: unset stray keys in shell profiles; use `/login` for subscription or a centrally distributed `apiKeyHelper` for automation; confirm with `/status`.
- For CI/automation: `apiKeyHelper` script in `settings.json` or `CLAUDE_CODE_OAUTH_TOKEN` in the worker env.
- Missing Console role → API Error 403. Admins assign the **'Claude Code' or 'Developer'** role (Console → Settings → Members) before onboarding.
- **Org-level settings cannot be overridden** locally: `Your organization has disabled Claude subscription access` (SDK/`-p` surfaces `oauth_org_not_allowed`) and `Routines are disabled by your organization's policy` (toggle at `claude.ai/admin-settings/claude-code`) are admin-only.

### Context-window errors

- **`Prompt is too long`** = window full. Recover with `/compact` (summarize) or `/clear`; `/context` shows the breakdown; `/mcp disable <name>` removes a server's tool definitions. **Auto-compact is on by default** (`DISABLE_AUTO_COMPACT` turns it off).
- **`Autocompact is thrashing`** = compaction succeeded but an oversized file/tool output immediately refilled context. Fix by **chunking file reads** (line-range/function), running **`/compact <focus>`** (e.g. `/compact keep only the plan and the diff`), moving large-file work to a **subagent** (separate context window), or `/clear` — not by retrying.
- `Conversation too long` during `/compact` = not enough free context for the summary; Esc-back to drop turns or `/clear`, don't rerun `/compact`.
- **Request body limit is 30 MB** (`Request too large`), separate from the context window — reference large files by path. PDF: max 100 pages / 32 MB. Image: 8000px longest edge single / 2000px when many.

### Recovering corrupted/blocked turns

- Tool-use/thinking-block mismatch (API Error 400) → `/rewind` or **Esc twice** to a checkpoint before the corrupted turn. (Versions before v2.1.156 can trigger mismatches `/rewind` cannot clear.)
- **Usage Policy refusals and tool-block mismatches persist across `--continue`/`--resume`** because the triggering content stays in the on-disk transcript — only `/rewind` or `/clear` (new session without `--continue`) recovers. Prefer `/rewind` or double-Esc + rephrase over correcting in-thread (wrong attempts anchor later answers).

### Provider-specific

- Bedrock/Vertex `max_tokens must be greater than thinking.budget_tokens` → lower `MAX_THINKING_TOKENS` or raise `CLAUDE_CODE_MAX_OUTPUT_TOKENS`.
- Vertex/Foundry have a 5-min idle timeout aborting stalled streams — opt out with `API_FORCE_IDLE_TIMEOUT=0`.
- Gateways stripping the `anthropic-beta` header cause `Extra inputs are not permitted` → forward the header or set `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`. Behind a gateway set `ANTHROPIC_BASE_URL`.

---

## Install & runtime troubleshooting

### Diagnostic commands

- **`/doctor`** (or `claude doctor` from the shell if it won't start) — checks installation, settings, MCP servers, context usage; flags oversized memory files and subagent definitions; checks macOS Keychain access.
- **`/status`** — active credential / auth method.
- **`claude --safe-mode`** (or `CLAUDE_CODE_SAFE_MODE`) — disables ALL customizations (CLAUDE.md, skills, plugins, hooks, MCP servers, custom commands/agents) to bisect misbehavior or high CPU/memory. **Permissions, auth, model selection, and built-in tools still apply** — it is not a permission bypass.
- **`claude --resume`** in the same directory recovers a session after a hang/freeze (closing the terminal does not lose the conversation).
- **`/heapdump`** writes a `.heapsnapshot` + memory breakdown to `~/Desktop` (home dir on Linux); open in Chrome DevTools → Memory → Load.
- `/feedback` reports to Anthropic (can include sessions from last 24h / 7 days). Config-debugging guidance: `/en/debug-your-config`.

### Standardize the install (avoid version drift)

- **Native installer is recommended**: `~/.local/bin/claude` (macOS/Linux), `%USERPROFILE%\.local\bin\claude.exe` (Windows). As of v2.1.113 `claude` spawns a native per-platform binary (not Node) pulled via an **optional** npm dependency (e.g. `@anthropic-ai/claude-code-darwin-arm64`).
- Three binary sources on macOS/Linux cause mismatches: `~/.local/bin/claude` (native), `~/.claude/local/` (legacy npm), and npm `-g`. **Audit with `which -a claude`**; remove extras (`npm uninstall -g @anthropic-ai/claude-code`, `rm -rf ~/.claude/local`, `brew uninstall --cask claude-code`, `winget uninstall Anthropic.ClaudeCode`).
- **Corporate npm mirror**: mirror all **eight** `@anthropic-ai/claude-code-*` platform packages plus the meta package; never use `--omit=optional`/`--ignore-optional`/`optional=false` (else `Could not find native binary package`). Prebuilt platforms: darwin-arm64/x64, linux-x64/arm64, linux-x64-musl, linux-arm64-musl, win32-x64/arm64.
- **Requirements**: ≥4 GB RAM (add swap on low-memory Linux/CI), 64-bit OS, macOS 13.0+; pre-2013 CPUs lacking AVX can't run the native binary.

### Networks, proxies & TLS

- **SSL-interception proxy**: distribute the CA bundle, set `NODE_EXTRA_CA_CERTS=/path/to/ca.pem` centrally. **Never** `NODE_TLS_REJECT_UNAUTHORIZED=0`. The OS CA store is now trusted **by default**; opt out with `CLAUDE_CODE_CERT_STORE=bundled`.
- Distribute `HTTP_PROXY`/`HTTPS_PROXY` (set before installing); allowlist `downloads.claude.ai` and the API endpoints. Verify with `curl -I https://api.anthropic.com`.
- A successful `curl -I` but failing Claude Code points between runtime and network: broken `/etc/resolv.conf` nameserver (common in WSL), stale macOS utun VPN interfaces, or Docker Desktop intercepting outbound.
- Cloud sessions/routines run sandboxed with an allowlist; `403` + `x-deny-reason: host_not_allowed` = blocked host. Default "Trusted" access; switch Network access to Custom or Full. Local CLI sessions are unaffected.

### Windows / WSL

- Pin `CLAUDE_CODE_GIT_BASH_PATH` in `settings.json` (`{"env":{"CLAUDE_CODE_GIT_BASH_PATH":"C:\\Program Files\\Git\\bin\\bash.exe"}}`) and require **v2.1.116+** so endpoint security (AppLocker/EDR) doesn't break shell detection; allowlist `claude.exe` and children (`cmd.exe`, `bash.exe`).
- Without Git Bash, Claude uses the **PowerShell tool**; **PowerShell 7** (Store, MSI, or .NET global tool) is auto-detected.
- Use **WSL2** (not WSL1). Keep projects on the Linux filesystem (`/home/`), not `/mnt/c/`. `claude auth login` accepts a pasted OAuth code for WSL2/SSH/containers/IPv6-only devcontainers where the localhost browser callback fails; set `BROWSER` to the Windows browser path on WSL2.

### Search & file discovery

- If the bundled ripgrep won't run (silently breaks Search, `@file` mentions, custom agents/skills): install the platform ripgrep and set `USE_BUILTIN_RIPGREP=0`.
- On native macOS/Linux builds, **Glob/Grep tools are replaced** by `bfs`/`ugrep` via Bash.

### Performance / resource usage

- Use `/compact` regularly on large codebases; close and restart between major tasks. Add large build dirs to `.gitignore`. Move large-output work to a **subagent** (separate context window).
- Garbled integrated-terminal text is a GPU-renderer issue → `/terminal-setup` (sets `terminal.integrated.gpuAcceleration` off) or disable `gpuAcceleration`. High CPU/memory may be a plugin/MCP/hook — confirm with `--safe-mode`.

---

## Team governance settings (managed settings)

| Setting | Purpose |
|---|---|
| `enforceAvailableModels` + `availableModels` | Allowlist that also constrains the **Default** model (users/projects can't widen it) |
| `requiredMinimumVersion` / `requiredMaximumVersion` | Pin approved version range; out-of-range clients exit at startup (but `claude update`/`install`/`doctor` still work for recovery) |
| `forceLoginOrgUUID` / `forceLoginMethod` | Lock login to your org; block third-party providers (Bedrock/Vertex/Foundry/Mantle) |
| `allowedMcpServers` / `deniedMcpServers` | Enterprise MCP allow/deny; enforce on reconnect, IDE configs, first session; **load before remote settings** |
| `--strict-mcp-config` | Block inline `mcpServers` in agent defs / subagent spawn; block non-MCP globs in deny rules |
| `pluginSuggestionMarketplaces` | Allowlist org marketplaces for plugin suggestions |
| `allowAllClaudeAiMcps` | Load claude.ai cloud MCP connectors alongside `managed-mcp.json` |
| `parentSettingsBehavior` | Fold SDK `managedSettings` into the managed-policy merge |
| `disableSkillShellExecution` | Block inline shell from skills/slash commands/plugin commands |
| `managed-settings.d/` | Drop-in directory for layered policy fragments (vs one monolithic file) |

- **Model precedence** (to clear a stale ID): `--model` > `ANTHROPIC_MODEL` > `.claude/settings.local.json` model field > project `.claude/settings.json` > `~/.claude/settings.json`. Use aliases (`sonnet`, `opus`) so they don't go stale.
- Constrain subagent models with `Tool(param:value)` rules, e.g. `Agent(model:opus)`; `Agent(type)` deny rules and `Agent(x,y)` allowed-types are enforced.
- `permissions.defaultMode: "auto"` gives reduced prompt friction with a background safety classifier — prefer over `--dangerously-skip-permissions`.
- `autoMode.hard_deny` blocks unconditionally even under broad allow rules; include `"$defaults"` in `autoMode.allow`/`soft_deny`/`environment` to extend (not replace) the built-in list.
- Deny rule `"*"` denies all tools (baseline lockdown); watch startup warnings for typo'd/unknown tool names.

---

## Team onboarding & distribution

- **`/team-onboarding`** — run in a project you've spent real time in; generates a replayable ramp-up guide so teammates inherit your setup instead of defaults.
- Distribute team **skills** by dropping them in `.claude/skills` (auto-loaded, no marketplace); `<dir>:<name>` qualification avoids collisions; `disableBundledSkills`/`CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` isolates a curated set. `/reload-plugins`/`/reload-skills` activate changes without restart.
- Distribute **plugins**: `--plugin-url https://.../plugin.zip` or `--plugin-dir <zip>` to trial before a marketplace; ship with `defaultEnabled: false` so they install dormant; `userConfig` prompts for settings at enable time (keychain-backed secrets). Audit with `/plugin list --enabled` / `claude plugin list`. `claude plugin prune` / `uninstall --prune` clears orphaned deps; `claude plugin tag` makes version-validated release tags.
- Install **`security-guidance@claude-plugins-official`** and commit `.claude/claude-security-guidance.md` so vulnerability review runs on each edit, end-of-turn, and commit/push.
- Reduce prompts team-wide with **`/fewer-permission-prompts`** (auto-generates a read-only Bash/MCP allowlist into `.claude/settings.json`).

---

## Live-session monitoring & automation (for CI/teams)

- **`claude agents --json`** (`--all` includes completed) lists live sessions with `id`/`state`/`waitingFor` — script session pickers/status bars and **detect sessions blocked on permission prompts**. Pin sessions with Ctrl+T to keep idle ones alive in `/resume`.
- Authenticate MCP in headless/CI/SSH with **`claude mcp login <name> --no-browser`** (not the interactive `/mcp` menu).
- **`claude ultrareview --json`** in CI exits 1 on failure → use as a merge gate. `/code-review high --comment` posts inline PR findings.
- Use the **Monitor tool** / "watch X and tell me when Y" instead of Bash `sleep` polling; `/loop` without an interval self-paces.
- `/usage` per-category breakdown finds and attributes cost hotspots across the team's tool surface.
- `/mcp` shows tool counts — a server connected with **0 tools** = misconfigured/broken.
- Upgrade to **v2.1.136+** for parallel-session OAuth/MCP-refresh reliability fixes if running many concurrent sessions/MCP servers.

---

### Gotchas

**Analytics undercounting & estimates**
- Contribution metrics are **disabled entirely under Zero Data Retention** (usage metrics only) and **unavailable for API/Console customers** (usage + spend only).
- Contribution metrics cover only users inside your **claude.ai org** — Console API and third-party-integration usage is excluded, so mixed-channel totals undercount.
- Console **"Spend this month" is an estimate**, NOT actual billing — reconcile against the billing page.
- Attribution **silently drops** contributions: developer rewrites >20%, sessions outside the 21-day-before/2-day-after window, and auto-excluded file types all show zero credit. Lines-accepted doesn't account for later deletions, so it can overstate net retained output.

**OTel pitfalls**
- **OTEL_* env vars are NOT inherited by subprocesses** (Bash, hooks, MCP, LSP) — an instrumented app run via Bash won't pick up the CLI's endpoint; set them in the command. (Conversely, subprocesses no longer wrongly inherit the CLI's own OTLP endpoint — a fixed prior bug.)
- `OTEL_RESOURCE_ATTRIBUTES` **cannot contain spaces** and quotes do NOT escape (`org.name="My Company"` keeps the literal quotes) — use underscores/camelCase or percent-encoding. Each custom key becomes a **per-series label** that silently inflates storage; set `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES=false` to keep them resource-block-only.
- `claude_code.cost.usage` is an **approximation**, not billing-grade.
- `user.email` is exported by default under OAuth — redact at the backend if needed.
- `OTEL_LOG_RAW_API_BODIES` exports **full conversation history** and implies consent to the other `OTEL_LOG_*` content flags.
- Leaving 1s debug export intervals in production floods the exporter.
- `tool_decision` source in interactive CLI collapses later rule-matched calls to `config` (Agent SDK / `-p` report the original source on every match).
- Dynamic `otelHeadersHelper` applies only to http/protobuf and http/json; grpc uses the static `OTEL_EXPORTER_OTLP_HEADERS`.
- Interactive sessions ignore inbound `TRACEPARENT` (to avoid inheriting ambient CI/container values).

**Auth & org policy**
- A leftover `ANTHROPIC_API_KEY` (or `apiKeyHelper`/`ANTHROPIC_AUTH_TOKEN`) **silently overrides subscription auth** (always used in `-p`) and can break or mis-route even with a working Pro/Max plan. It also **disables Remote Control, `/schedule`, claude.ai MCP connectors, and notification preferences** — unset it to use those.
- Plan/subscription changes on the web don't take effect in an existing session (`Claude Opus is not available…`) until you `/logout` then `/login` — the token reflects the plan at sign-in.
- Resumed sessions keep their own model and no longer inherit another session's `/model`. Relayed `SendMessage` cross-session messages no longer carry user authority — a teammate session can't grant permissions for you.

**Install**
- VS Code extension bundles a **private CLI not on PATH** — `~/.local/bin/claude` won't exist if only the extension is installed (looks like a broken install). IDE processes may not inherit shell env, so Bedrock/Vertex/Foundry creds set in the terminal can fail in the IDE.
- WSL commonly picks up Windows npm/node (`/mnt/c/`) → platform mismatch / `exec: node: not found`; do **not** disable Windows PATH importing.
- Homebrew cask lags **~1 week** behind latest. Installing npm with `--ignore-scripts` skips the link step (slower per-launch wrapper). Running the installer from `/` (Docker as root) scans the whole filesystem and hangs — set `WORKDIR /tmp`.

**Runtime / context**
- On WSL with a project on `/mnt/c/`, search silently returns fewer matches **and `/doctor` still reports Search as OK** — it won't flag this.
- Whole-file reads over the token limit now return a **truncated PARTIAL view** (not an error) — agents may proceed on incomplete content if they miss the notice.
- Auto-compaction can succeed then immediately **thrash** on one oversized file — chunk reads or focus `/compact`, don't retry.
- Subagents inherit **ALL** parent MCP tool definitions, which can exhaust their context before turn 1 (a hidden `Prompt is too long`) — disable unused MCP servers before spawning. Subagent chains are **hard-capped at 5 levels deep**.
- In non-interactive `-p`, an auto-mode classifier that exceeds its context window **aborts the run entirely** (retrying can't help — transcript only grows).
- `CLAUDE_CODE_MAX_RETRIES` is clamped at 15. `claude_code.api_error` only fires after retries are exhausted.

**Behavior changes that bite**
- `--dangerously-skip-permissions` now also **bypasses writes to `.claude/`, `.git/`, `.vscode/`, and shell config files** (previously protected) — only catastrophic removal commands still prompt.
- Even in `acceptEdits`, writes to code-executing files (`.npmrc`, `.bazelrc`, `.pre-commit-config.yaml`, `.zshenv`, `.bash_login`, `~/.config/git/`) now **pause for a prompt** (only `bypassPermissions` auto-approves) — silent-write automation will block.
- Default **effort silently changed to `high`** for API-key/Bedrock/Vertex/Foundry/Team/Enterprise (raises cost/latency) — lower with `/effort`. Switching to Opus 4.7 silently sets `xhigh` the first time.
- **Fast mode (`/fast`) is ~2x token cost for ~2.5x speed**, same model quality — don't default agentic loops to it; on Opus 4.8 it's $10/$50 per MTok.
- `! bash` commands now trigger an **automatic Claude response** by default — set `respondToBashCommands: false` for context-only.
- Thinking summaries are **off by default** in interactive sessions (`showThinkingSummaries: true` to restore).
- MCP timeouts **under 1000ms are silently ignored** (fall back to `MCP_TOOL_TIMEOUT`/default). MCP per-tool result override caps at **500K chars** (beyond that, truncated/persisted to disk). Hook outputs over **50K chars** silently move to disk (path + preview only).
- Managed allow/deny MCP rules **load before remote settings**, so a remote-allowed server can still be managed-denied.
- `availableModels` did **not** constrain the **Default** model unless `enforceAvailableModels` is set — a "blocked" model could still be reachable as Default.
- `worktree.baseRef` defaults to `fresh` (branches from remote default) — local unpushed HEAD commits won't appear in new worktrees unless set to `head`.
- Auto mode is a **research-preview classifier**, plan/provider-gated (Pro from Week 21; Bedrock/Vertex/Foundry only for Opus 4.7/4.8 from Week 23, opt-in via `CLAUDE_CODE_ENABLE_AUTO_MODE=1`) — not a guarantee; can let through actions a human would have paused on. It blocks destructive git/terraform/pulumi/cdk-destroy commands unless explicitly requested, silently halting automation that expects them.
- Each routine exposes a **tokened `/fire` endpoint — treat the token as a secret** (it can trigger the agent externally).
- The **changelog/what's-new digest covers headline features only** — consult `/en/changelog` for every bug fix and minor change; treat any model-name-specific claim in summarized changelogs as unverified.


---

## Enterprise providers & gateways

Claude Code (and the Agent SDK / Codex) can run against four enterprise backends — **AWS Bedrock**, **Claude Platform on AWS** (`aws-external-anthropic`), **Google Vertex AI**, and **Microsoft Foundry** — plus an **LLM gateway** (e.g. LiteLLM) in front of any of them. This section covers team setup, model pinning, auth, cost controls, and the gateway header/attribution contract.

### Team-setup essentials (do these first, every provider)

1. **Pin every model ID before any multi-user rollout.** Set `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL` (plus `ANTHROPIC_DEFAULT_FABLE_MODEL` on Claude Platform on AWS). Unpinned, the `sonnet`/`opus`/`haiku` aliases resolve to Claude Code's **built-in per-provider default**, which lags the newest release and may not be enabled in your account. Pinning also gives you control over **upgrade timing** so a new model release doesn't move the whole team at once. The `opus` alias defaults to **Opus 4.6** on Bedrock/Vertex/Foundry and **Opus 4.7** on Claude Platform on AWS.
2. **Pin `ANTHROPIC_DEFAULT_HAIKU_MODEL` to a real Haiku model/deployment.** On all four providers the small/fast (background-task) model defaults to the **PRIMARY** model — silent cost inflation, since session titles etc. run at primary rates. Haiku isn't enabled in every account/region/project by default.
3. **Distribute config via the `env` block of `settings.json`** (or enterprise managed settings), not per-developer shell exports. Treat workspace API keys and `AWS_PROFILE` as production credentials kept in settings files, not exported env (avoids leaking to child processes).
4. **Use the manual env-var setup path for CI/scripted enterprise rollouts**, not the interactive wizard.
5. **Run `/status` first** — confirms resolved provider, region (and its source), workspace ID, base-URL override, and auth-skip settings before you change anything.
6. **Dedicated cloud account/project** (AWS account or GCP project) per Claude Code deployment simplifies cost tracking and access control.

Example pinned IDs (as of these docs): `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5@20251001` (Vertex) / `claude-haiku-4-5-20251001-v1:0` (Bedrock) / `claude-haiku-4-5` (Foundry/Platform). Default Sonnet (unpinned primary): `claude-sonnet-4-5@20250929` (Vertex) / `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (Bedrock).

### Provider enable & precedence

```bash
export CLAUDE_CODE_USE_BEDROCK=1          # AWS Bedrock
export CLAUDE_CODE_USE_ANTHROPIC_AWS=1    # Claude Platform on AWS (must be truthy, e.g. 1)
export CLAUDE_CODE_USE_VERTEX=1           # Google Vertex AI
export CLAUDE_CODE_USE_FOUNDRY=1          # Microsoft Foundry
export CLAUDE_CODE_USE_MANTLE=1           # Bedrock Mantle (native Anthropic shape; v2.1.94+)
```

**Routing precedence:** `CLAUDE_CODE_USE_BEDROCK` and `CLAUDE_CODE_USE_FOUNDRY` take precedence over Claude Platform on AWS. If Platform-on-AWS should be used, **unset both** — otherwise requests silently go to the wrong provider. If `CLAUDE_CODE_USE_ANTHROPIC_AWS` is unset/non-truthy, requests go to `api.anthropic.com`.

### AWS Bedrock

**Region resolution (v2.1.172+):** `AWS_REGION` > `AWS_DEFAULT_REGION` > region on active AWS profile (shared credentials file, then shared config file) > `us-east-1`. Active profile = `AWS_PROFILE` if set, else `default`. Point at non-default files with `AWS_SHARED_CREDENTIALS_FILE` / `AWS_CONFIG_FILE`. On **v2.1.171 and earlier the AWS config file's `region` is NOT read** — set `AWS_REGION` explicitly or it falls back to `us-east-1`.

**Auth** (default AWS SDK credential chain): `aws configure`; access-key env vars (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN`); SSO (`aws sso login --profile=<name>` + `AWS_PROFILE`); `aws login`; or a Bedrock API key via `AWS_BEARER_TOKEN_BEDROCK=<key>`.

| Setting | When it runs | Use for |
|---|---|---|
| `awsAuthRefresh` | Only when creds detected **expired** (timestamp or Bedrock credential error), then retries | SSO login commands that modify `.aws`; adds a "refresh credentials" option under `/login` |
| `awsCredentialExport` | **Every** session start + each credential reload (even if valid); output captured **silently** | Can't modify `.aws`; must return cross-account creds directly. Must emit JSON `Credentials.{AccessKeyId,SecretAccessKey,SessionToken,Expiration}` |

- `awsCredentialExport`: v2.1.181 accepts **flat** output (`aws configure export-credentials --format process`, keys at top level). v2.1.176+ caches until 5 min before a valid ISO-8601 `Expiration` (optional); otherwise caches 1 hour.
- **Model pinning IDs** use cross-region inference-profile prefix `us.` (e.g. `us.anthropic.claude-opus-4-8`); GovCloud uses `us-gov.`. Override primary with `ANTHROPIC_MODEL` (inference-profile ID or application-inference-profile ARN).
- `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION` — region for small/fast model (no effect on Bedrock unless `ANTHROPIC_DEFAULT_HAIKU_MODEL` / deprecated `ANTHROPIC_SMALL_FAST_MODEL` is set).
- `ANTHROPIC_BEDROCK_BASE_URL` — custom endpoint/gateway.
- `modelOverrides` (settings map) — maps version IDs → distinct application-inference-profile ARNs so multiple versions of a family appear in `/model`, each routed to its own org-governed profile.
- `availableModels` (settings) — surfaces Mantle IDs in `/model` and **restricts the picker to listed entries**.
- **Service tiers:** `ANTHROPIC_BEDROCK_SERVICE_TIER` = `default` | `flex` (cheaper) | `priority` (lower latency); sent as `X-Amzn-Bedrock-Service-Tier`. Provisioned throughput: use a provisioned-throughput ARN as the model ID.
- **Guardrails:** set via `ANTHROPIC_CUSTOM_HEADERS` env block — `X-Amzn-Bedrock-GuardrailIdentifier: <id>`, `X-Amzn-Bedrock-GuardrailVersion: <n>`. Enable **Cross-Region inference** on the Guardrail when using cross-region inference profiles.
- **1M context:** Opus 4.6+ / Sonnet 4.6; auto-enabled for 1M variants, else append `[1m]` to a manually pinned ID.
- **IAM actions:** `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, `bedrock:ListInferenceProfiles`, `bedrock:GetInferenceProfile` on `inference-profile/*`, `application-inference-profile/*`, `foundation-model/*`; plus `aws-marketplace:ViewSubscriptions` and `aws-marketplace:Subscribe` (conditioned on `aws:CalledViaLast = bedrock.amazonaws.com`). Grant `bedrock:GetInferenceProfile` to avoid an extra round-trip per new model resolving ARNs (esp. for narrow `AWS_BEARER_TOKEN_BEDROCK` token policies).
- **AWS Organizations model access:** submit the use-case form once from the management account via `PutUseCaseForModelAccess` (needs `bedrock:PutUseCaseForModelAccess`); approval extends to child accounts.
- **Startup model check** (v2.1.94+): if a pinned version is older than the current default and the newer is invokable, prompts to update the pin (writes user settings + restarts; ARN-pinned models skipped). Unpinned-and-unavailable → falls back to previous version **for the session, not persisted**.
- Wizard: `/setup-bedrock` (saves to user-settings `env` block).
- **CI runners:** attach an IAM role + set `AWS_REGION`; credential chain picks it up automatically (AWS CLI only needed for SSO).

### Bedrock Mantle (native Anthropic API shape)

`CLAUDE_CODE_USE_MANTLE=1` (v2.1.94+). Mantle model IDs use prefix `anthropic.` **without a version suffix** (e.g. `anthropic.claude-haiku-4-5`) — distinct from standard Bedrock catalog IDs. `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` overrides the URL; `CLAUDE_CODE_SKIP_MANTLE_AUTH=1` skips client-side SigV4/x-api-key for gateways. Setting both `USE_BEDROCK=1` and `USE_MANTLE=1` routes Mantle-format IDs to Mantle and all others to the Bedrock Invoke API.

### Claude Platform on AWS (`aws-external-anthropic`)

- `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` (truthy). Base URL computed from `AWS_REGION` as `https://aws-external-anthropic.{region}.api.aws`; override with `ANTHROPIC_AWS_BASE_URL`.
- **`ANTHROPIC_AWS_WORKSPACE_ID` is required** (sent as `anthropic-workspace-id` on every request, e.g. `wrkspc_01ABCDEFGHIJKLMN`) — **not derived from AWS credentials**; missing it errors on every request.
- **Auth:** (A) AWS creds via SigV4 (standard chain); or (B) workspace API key `ANTHROPIC_AWS_API_KEY` (sent as `x-api-key`). **`ANTHROPIC_AWS_API_KEY` takes precedence over SigV4** — when set, AWS creds are ignored.
- **AWS Marketplace subscription provisions a NEW Anthropic org** tied to the AWS account, separate from any pre-existing Console org; credentials/keys do **not** transfer — use the AWS-linked org's workspace ID + keys.
- Model pinning adds `ANTHROPIC_DEFAULT_FABLE_MODEL` (e.g. `claude-fable-5`); unpinned `opus` → Opus 4.7.
- `awsAuthRefresh` re-runs the login command on mid-session SSO expiry (e.g. `{"awsAuthRefresh": "aws sso login --profile my-profile"}`).
- **Gateway:** `ANTHROPIC_AWS_BASE_URL` → proxy; `CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH=1` (gateway signs); `ANTHROPIC_AUTH_TOKEN` (gateway token).
- Agent SDK (`@anthropic-ai/claude-agent-sdk`) reads the same env vars — export `CLAUDE_CODE_USE_ANTHROPIC_AWS`, `ANTHROPIC_AWS_WORKSPACE_ID`, and key/creds before the call.
- `/login`/`/logout` do **not** sign into Claude.ai here; only the `awsAuthRefresh`-driven "refresh credentials" action works.

### Google Vertex AI

```bash
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=global          # or 'eu'/'us' multi-region, or e.g. 'us-east5'
export ANTHROPIC_VERTEX_PROJECT_ID=YOUR-PROJECT-ID
```

- **`CLOUD_ML_REGION=global` is preferred for availability.** For models lacking a global endpoint, set per-model overrides (`VERTEX_REGION_CLAUDE_*`, e.g. `VERTEX_REGION_CLAUDE_HAIKU_4_5=us-east5`, `VERTEX_REGION_CLAUDE_4_6_SONNET=europe-west1`) rather than switching everything to a region.
- **Project-ID precedence:** `GCLOUD_PROJECT`, `GOOGLE_CLOUD_PROJECT`, and the file at `GOOGLE_APPLICATION_CREDENTIALS` all **override** `ANTHROPIC_VERTEX_PROJECT_ID` (the lowest-precedence source). A stale env/credential file silently targets the wrong project.
- `GOOGLE_APPLICATION_CREDENTIALS` → service-account key file or X.509 Workload Identity Federation config (X.509 WIF needs v2.1.121+).
- `ANTHROPIC_VERTEX_BASE_URL` → custom endpoint/gateway.
- **`gcpAuthRefresh`** (settings, e.g. `{"gcpAuthRefresh": "gcloud auth application-default login"}`): refreshes expired GCP creds; **no interactive input, 3-minute timeout**; project-scoped (`.claude/settings.json`) only runs **after the workspace trust prompt is accepted**.
- **IAM (least privilege):** `roles/aiplatform.user`, or a custom role with only `aiplatform.endpoints.predict` (model invocation + token counting).
- **MCP tool search off by default on Vertex** (all MCP tool defs load upfront). Opt in with `ENABLE_TOOL_SEARCH=true` — **only on Sonnet 4.5+ / Opus 4.5+** (older models reject the beta header and requests FAIL).
- **1M context:** Opus 4.6+ / Sonnet 4.6; append `[1m]` for manually pinned IDs.
- Wizard `/setup-vertex` + startup model checks require **v2.1.98+**. **Model Garden access must be requested/approved (24–48 h)** before models invoke. For higher rate limits, contact Google Cloud support.

### Microsoft Foundry

- `CLAUDE_CODE_USE_FOUNDRY=1`. `ANTHROPIC_FOUNDRY_RESOURCE={resource}` or full `ANTHROPIC_FOUNDRY_BASE_URL=https://{resource}.services.ai.azure.com/anthropic`.
- **No interactive wizard** (unlike Bedrock/Vertex) — env vars are the only config path. **No startup model check** — a missing/unavailable default surfaces as a **runtime request failure**, not an early config error.
- **Auth:** (A) `ANTHROPIC_FOUNDRY_API_KEY=<azure-api-key>`; or (B) **Microsoft Entra ID** via Azure SDK `DefaultAzureCredential` (used automatically when no API key is set, e.g. local `az login`). **Prefer Entra ID for enterprise rollouts** over static keys.
- **Model alias env vars must match the Azure deployment names** created in the Foundry portal (`ai.azure.com`); create deployments for Opus, Sonnet, and Haiku. When creating deployments, **select a specific model version, not "auto-update to latest,"** so the pinned ID stays stable.
- **Azure RBAC:** built-in roles **`Azure AI User`** or **`Cognitive Services User`** suffice; restrictive custom role needs dataAction `Microsoft.CognitiveServices/accounts/providers/*`.
- Token error `Failed to get token from azureADTokenProvider: ChainedTokenCredential authentication failed` → configure Entra ID or set `ANTHROPIC_FOUNDRY_API_KEY`.

### LLM gateways (LiteLLM etc.)

A gateway must expose at least one of three API formats: **Anthropic Messages** (`/v1/messages`, `/v1/messages/count_tokens`), **Bedrock InvokeModel** (`/invoke`, `/invoke-with-response-stream`), or **Vertex rawPredict** (`:rawPredict`, `:streamRawPredict`, `/count-tokens:rawPredict`).

**Recommended — LiteLLM unified Anthropic endpoint** (load balancing, fallbacks, consistent cost + end-user tracking):
```bash
export ANTHROPIC_BASE_URL=https://litellm-server:4000
```
Pass-through variants (no load balancing/fallbacks):
```bash
# Anthropic pass-through
ANTHROPIC_BASE_URL=https://litellm-server:4000/anthropic
# Bedrock pass-through
ANTHROPIC_BEDROCK_BASE_URL=https://litellm-server:4000/bedrock
CLAUDE_CODE_SKIP_BEDROCK_AUTH=1  CLAUDE_CODE_USE_BEDROCK=1
# Vertex pass-through
ANTHROPIC_VERTEX_BASE_URL=https://litellm-server:4000/vertex_ai/v1
ANTHROPIC_VERTEX_PROJECT_ID=<gcp-project>  CLAUDE_CODE_SKIP_VERTEX_AUTH=1
CLAUDE_CODE_USE_VERTEX=1  CLOUD_ML_REGION=us-east5
# Claude Platform on AWS via gateway
ANTHROPIC_AWS_BASE_URL=https://litellm-server:4000/anthropic-aws
ANTHROPIC_AWS_WORKSPACE_ID=wrkspc_...  CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH=1
CLAUDE_CODE_USE_ANTHROPIC_AWS=1
```

**Auth at the gateway:**
- Static key: `ANTHROPIC_AUTH_TOKEN` (env or settings `env` block) → sent as `Authorization`.
- Dynamic/per-user key: `apiKeyHelper` (settings) → script (vault fetch or **JWT with user/team claims**); output sent as both `Authorization` and `X-Api-Key`. Control refresh with `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` (e.g. `3600000`). **`apiKeyHelper` has LOWER precedence than `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_API_KEY`** — a stray env var defeats it.

**Required header/body forwarding:** Anthropic Messages + Vertex rawPredict gateways must forward `anthropic-beta` and `anthropic-version` headers; Bedrock InvokeModel must preserve body fields `anthropic_beta` and `anthropic_version`. Dropping them **silently degrades functionality**. With Anthropic Messages over Bedrock/Vertex you may need `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`.

**Per-session / per-agent cost attribution** (no body parsing needed):

| Header | Meaning |
|---|---|
| `X-Claude-Code-Session-Id` | Unique per session — aggregate all session requests |
| `X-Claude-Code-Agent-Id` | Subagent/teammate issuing the request (in-process only; ephemeral per-spawn) |
| `X-Claude-Code-Parent-Agent-Id` | Spawning agent — attribute cost across nested/parallel subagents |

**Attribution block:** Claude Code prepends a short block (client version + conversation fingerprint) to the system prompt. The first-party Anthropic API strips it (no effect on first-party caching), but if your gateway runs its **own** prompt cache keyed on the full body, set `CLAUDE_CODE_ATTRIBUTION_HEADER=0` so it doesn't bust the cache.

**Gateway model discovery:** `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` (off by default; **v2.1.129+**) queries the gateway's `/v1/models` at startup and adds entries (labeled "From gateway", using `display_name`) to `/model`. Only when `ANTHROPIC_BASE_URL` points at an **Anthropic Messages** gateway (not Bedrock/Vertex pass-through, not `api.anthropic.com`), and only for IDs starting `claude`/`anthropic`. Cached to `~/.claude/cache/gateway-models.json`, refreshed each startup; falls back to cache or built-in list on failure. Authenticates like inference (`ANTHROPIC_AUTH_TOKEN` bearer, or `ANTHROPIC_API_KEY` as `x-api-key`, plus `ANTHROPIC_CUSTOM_HEADERS`). **Keep it off when the gateway is backed by a shared key** so users don't see every model the key can access; enable only for curated gateways. Non-matching model names won't appear — add them manually via Model-config vars (`/en/model-config`).

**Enterprise Desktop:** can configure gateway providers via managed settings; Claude Desktop runs against a self-hosted gateway via **Cowork** on 3P research preview (own config keys).

### Cost & caching controls (all providers)

- **Prompt caching is automatic** (5-minute default TTL). `DISABLE_PROMPT_CACHING=1` disables it.
- **`ENABLE_PROMPT_CACHING_1H=1`** requests a 1-hour TTL — **billed at a higher cache-write rate.** Use only when reuse spans >5 min and the hit-rate/latency benefit justifies it; otherwise rely on the 5-minute cache.
- On Bedrock, caching may be **unavailable in some regions** — if cache token counts stay at zero, check Bedrock's supported models/regions list.
- Tune Bedrock cost/latency with `ANTHROPIC_BEDROCK_SERVICE_TIER` (`flex` cheaper, `priority` lower latency).

### Gotchas

- **Model-alias trap:** unpinned `opus`/`sonnet`/`haiku` resolve to Claude Code's built-in **per-provider default** (`opus`→Opus 4.6 on Bedrock/Vertex/Foundry, 4.7 on Platform-on-AWS), which can lag the latest and may not be enabled in your account/project. Always pin before rollout.
- **Background tasks run on the PRIMARY model on every provider** unless `ANTHROPIC_DEFAULT_HAIKU_MODEL` points at a real Haiku model/deployment — silent cost inflation.
- **Unpinned fallback is per-session and NOT persisted** — behavior silently differs run-to-run as defaults/availability shift. Startup model checks need v2.1.94+ (Bedrock) / v2.1.98+ (Vertex); **Foundry has none** (failures surface at call time).
- **Bedrock region:** on v2.1.171 and earlier the AWS config file `region` is ignored — set `AWS_REGION` or get `us-east-1`.
- **`awsCredentialExport` vs `awsAuthRefresh`:** the former runs on *every* reload (even valid) with silent output; the latter only on detected expiry. Wrong choice → over-running commands or stale creds.
- **AWS SSO behind corporate VPN/TLS-inspection** can cause an infinite browser-tab auth loop with `awsAuthRefresh` (interrupted connections read as auth failures). Workaround: run `aws sso login` manually and **remove `awsAuthRefresh`** from settings.
- **Bedrock uses only the Invoke API, not Converse.** An "on-demand throughput isn't supported" error means you must specify the model as an **inference-profile ID**. `WebSearch` and `/logout` are unavailable on Bedrock.
- **Mantle:** standard inference-profile IDs (e.g. `us.anthropic.claude-sonnet-4-6`) fail with a 400 on Mantle; a 403 with valid creds = account lacks access to that Mantle model. Mixing Mantle's suffix-less `anthropic.` IDs with standard Bedrock catalog IDs routes to the wrong endpoint.
- **Platform-on-AWS routing:** it's opt-in even when AWS creds are present, and **Bedrock/Foundry silently take precedence** — leftover `CLAUDE_CODE_USE_BEDROCK/FOUNDRY` sends requests to the wrong provider. `CLAUDE_CODE_USE_ANTHROPIC_AWS` must be truthy (`1`) or requests go to `api.anthropic.com`.
- **Platform-on-AWS auth:** `ANTHROPIC_AWS_API_KEY` silently overrides SigV4 — a stale key yields 403s even with valid AWS creds. Forgetting `ANTHROPIC_AWS_WORKSPACE_ID` errors on every request. Marketplace-org keys ≠ pre-existing-org keys (silent auth failure).
- **Vertex project precedence:** `ANTHROPIC_VERTEX_PROJECT_ID` is lowest-priority — `GCLOUD_PROJECT`/`GOOGLE_CLOUD_PROJECT`/`GOOGLE_APPLICATION_CREDENTIALS` silently win.
- **Vertex `ENABLE_TOOL_SEARCH=true` on models older than Sonnet 4.5 / Opus 4.5 makes requests FAIL** (beta header rejected).
- **`CLOUD_ML_REGION=global`** causes "model not found" 404s for models lacking global endpoints — specify a supported model or a `VERTEX_REGION_*` override. **429s on regional endpoints** often mean the model isn't supported there — switching to global usually helps. `/logout` unavailable under Vertex.
- **Foundry:** alias env-var values **must match Azure deployment names** or requests fail at call time (no early validation). `/logout` unavailable (Azure-creds-only auth).
- **Gateways:** dropping `anthropic-beta`/`anthropic-version` causes reduced functionality with **no obvious error**. The attribution block can invalidate a gateway's full-body prompt cache unless `CLAUDE_CODE_ATTRIBUTION_HEADER=0`. Discovery only surfaces `claude`/`anthropic`-prefixed IDs in the Anthropic Messages format — Bedrock/Vertex pass-through and `api.anthropic.com` get nothing; non-matching models must be added manually.
- **`apiKeyHelper` is silently overridden by `ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_API_KEY`** — a stray env var defeats dynamic per-user keys.
- **LiteLLM is third-party and unaudited by Anthropic.** PyPI **1.82.7 and 1.82.8 were compromised with credential-stealing malware** — do not install them; remove the package, rotate all credentials, and follow BerriAI/litellm#24518. Pin versions and apply supply-chain caution.


---
