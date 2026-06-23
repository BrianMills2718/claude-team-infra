/**
 * The single capstone (cap-setup) that earns the a-setup achievement: the learner
 * lays out their team's shared AI infrastructure and justifies it. A deterministic
 * component (graded by the Quiz engine) plus an open-ended explanation graded by
 * the LLM judge (stored locally until the judge gates it). Fatal misconceptions
 * fail the task regardless of other credit and route to remediation nodes.
 */
import type { AssessmentTask, Misconception, Rubric } from "../types";

const M: Record<string, Misconception> = {
  oneSurface: { id: "one-surface", description: "Treats the surfaces as rivals and standardizes on exactly one.", remediationNodeIds: ["c-surfaces"], fatal: false },
  adviceIsEnforcement: { id: "advice-is-enforcement", description: "Relies on a worded CLAUDE.md to enforce a security must-not.", remediationNodeIds: ["c-gov"], fatal: true },
  codexInherits: { id: "codex-inherits", description: "Assumes Codex inherits CLAUDE.md / Claude's skills automatically.", remediationNodeIds: ["c-config", "c-caps"], fatal: true },
  secretInRepo: { id: "secret-in-repo", description: "Puts a secret in committed config because the repo is private.", remediationNodeIds: ["c-config"], fatal: true },
  oneDrawer: { id: "one-drawer", description: "Puts all shared config in one place instead of the right tier.", remediationNodeIds: ["c-decision"], fatal: false },
};

export const RUBRICS: Record<string, Rubric> = {
  "rub-setup": {
    id: "rub-setup",
    criteria: [
      { id: "surfaces", description: "Routes each audience/task to a fitting surface (CLI / Desktop / Cowork / Codex) and notes what each can't do.", maxScore: 20 },
      { id: "tiers", description: "Places each shared thing in the right tier: repo .claude, marketplace plugin, managed settings, or personal.", maxScore: 30 },
      { id: "portability", description: "Spans Claude + Codex deliberately (AGENTS.md / portable skills), not by assuming inheritance.", maxScore: 20 },
      { id: "governance", description: "Enforces the non-negotiables via managed settings; keeps secrets out; right-sizes governance to the team.", maxScore: 20 },
      { id: "justification", description: "States the decision and a short, revisitable rationale rather than listing features.", maxScore: 10 },
    ],
  },
};

const T = (t: AssessmentTask): AssessmentTask => t;

export const ASSESSMENTS: AssessmentTask[] = [
  T({
    id: "cap-setup",
    nodeId: "a-setup",
    kind: "hybrid",
    title: "Set Up Your Team's Shared AI Infrastructure",
    prompt:
      "Your team (a handful of devs plus some non-dev knowledge workers, on a mix of Windows/Mac/Linux, light governance, on the Team plan) is adopting Claude Code and Codex. Lay out the shared setup: which surfaces for whom, what config lives where (the four tiers), how it spans Claude and Codex, and which non-negotiables you enforce.",
    deterministic: [
      { id: "cap-q1", type: "multiple-choice", prompt: "A review skill many of your repos want belongs in:", options: ["Each person's home .claude", "A marketplace plugin", "A worded note in CLAUDE.md", "An email attachment"], correct: 1, explanation: "Cross-project tools live in a marketplace plugin so they're versioned and shared." },
      { id: "cap-q2", type: "true-false", prompt: "A strongly-worded CLAUDE.md is sufficient to guarantee nobody reads secret files.", correct: false, explanation: "CLAUDE.md is advisory; enforce must-nots with managed settings." },
      { id: "cap-q3", type: "multiple-choice", prompt: "To keep Codex aligned with your Claude setup you must:", options: ["Do nothing — it inherits CLAUDE.md", "Provide AGENTS.md and portable skills", "Buy a second license", "Rename the repo"], correct: 1, explanation: "Codex is a separate engine; bridge it with AGENTS.md and portable skills." },
    ],
    openEnded: {
      prompt:
        "Write your team's setup decision: surfaces by audience, what lives in each of the four tiers, how Claude and Codex stay aligned, and the two or three things you enforce. End with a one-paragraph rationale.",
      rubricId: "rub-setup",
    },
    requiredConcepts: ["four-tier-model", "shared-library", "managed-settings", "portable-skill", "marketplace"],
    fatalMisconceptions: [M.adviceIsEnforcement, M.codexInherits, M.secretInRepo, M.oneSurface, M.oneDrawer],
    passThreshold: 0.8,
  }),
];

export const ASSESSMENT_BY_ID: Record<string, AssessmentTask> = Object.fromEntries(
  ASSESSMENTS.map((a) => [a.id, a]),
);
