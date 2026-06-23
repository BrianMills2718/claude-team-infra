/**
 * Open debates — DERIVED from claims.jsonl (the contested entries) by
 * scripts/derive-debates.mjs. DO NOT EDIT BY HAND; edit the ledger and re-run.
 * Rendered by the #/debates view so learners see positions + arguments, not just consensus.
 */

export interface DebatePosition {
  name: string;
  claim: string;
  sources: string[];
}
export interface Debate {
  id: string;
  question: string;
  positions: DebatePosition[];
  sources: string[];
  conceptIds: string[];
}

export const DEBATES: Debate[] = [
  {
    "id": "agents-md-vs-skills-debate",
    "question": "For supplying always-true knowledge, a static docs-index (AGENTS.md/CLAUDE.md) currently outperforms model-invoked Skills in published evals.",
    "positions": [
      {
        "name": "passive-context-wins-now",
        "claim": "Vercel eval: AGENTS.md docs-index 100% vs Skills 53-79% (skill never invoked in 56% of cases) - results matter now.",
        "sources": [
          "https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals"
        ]
      },
      {
        "name": "skills-for-actions",
        "claim": "Skills win for vertical, explicitly-triggered action workflows; the gap is a current model tool-use limitation that will close.",
        "sources": [
          "https://news.ycombinator.com/item?id=46809708"
        ]
      }
    ],
    "sources": [
      "https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals"
    ],
    "conceptIds": [
      "skill",
      "progressive-disclosure"
    ]
  },
  {
    "id": "mcp-context-bloat-debate",
    "question": "Loading many MCP tools consumes a large share of the context window before work begins; the open question is whether to restrict tools or compress outputs.",
    "positions": [
      {
        "name": "thin-gateway-cli-first",
        "claim": "An MCP should be a thin secure gateway with a few high-level tools; migrate stateless tools (Jira/GitHub/AWS) to CLIs, reserve MCP for stateful (Playwright).",
        "sources": [
          "https://blog.sshh.io/p/how-i-use-every-claude-code-feature"
        ]
      },
      {
        "name": "compress-dont-restrict",
        "claim": "Keep tool richness; route outputs through a compression middleware for ~98% context reduction.",
        "sources": [
          "https://mksg.lu/blog/context-mode"
        ]
      }
    ],
    "sources": [
      "https://blog.sshh.io/p/how-i-use-every-claude-code-feature",
      "https://mksg.lu/blog/context-mode"
    ],
    "conceptIds": [
      "mcp"
    ]
  },
  {
    "id": "codex-vs-claude-debate",
    "question": "Claude Code vs Codex is not either/or; the productive pattern is to run both.",
    "positions": [
      {
        "name": "claude-quality",
        "claim": "Claude Code higher quality (~67% blind win), leads SWE-bench, full MCP; but tighter usage limits.",
        "sources": [
          "https://dev.to/_46ea277e677b888e0cd13/claude-code-vs-codex-2026-what-500-reddit-developers-really-think-31pb"
        ]
      },
      {
        "name": "codex-efficiency",
        "claim": "Codex cheaper (~4x fewer tokens), leads Terminal-Bench; 'Codex for keystroke, Claude Code for commits'.",
        "sources": [
          "https://dev.to/_46ea277e677b888e0cd13/claude-code-vs-codex-2026-what-500-reddit-developers-really-think-31pb"
        ]
      }
    ],
    "sources": [
      "https://dev.to/_46ea277e677b888e0cd13/claude-code-vs-codex-2026-what-500-reddit-developers-really-think-31pb"
    ],
    "conceptIds": [
      "codex",
      "claude-code"
    ]
  }
];
