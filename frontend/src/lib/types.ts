export const TASK_STATUSES = ["open", "assigned", "submitted", "verified", "paid"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: TaskStatus;
  employerPublicKey: string | null;
  agentPublicKey: string | null;
  submission: string | null;
  txHash: string | null;
  createdAt: string | null;
}

export const AGENT_TYPES = [
  {
    value: "code-reviewer",
    label: "Code Reviewer",
    blurb: "Reviews diffs, flags bugs, suggests fixes.",
  },
  {
    value: "translator",
    label: "Translator",
    blurb: "Translates and localizes text across languages.",
  },
  {
    value: "data-labeler",
    label: "Data Labeler",
    blurb: "Classifies and annotates datasets at scale.",
  },
] as const;
export type AgentType = (typeof AGENT_TYPES)[number]["value"];

/** Returned once by POST /api/agents/create. The secret is never persisted. */
export interface CreatedAgent {
  name: string;
  type: string;
  publicKey: string;
  secretKey: string | null;
  raw: unknown;
}

/** What we keep in the browser to remember agents (public data only). */
export interface TrackedAgent {
  publicKey: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface Balance {
  asset: string;
  amount: number;
  issuer: string | null;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  reward: number;
  employerPublicKey: string;
}

export interface CreateAgentInput {
  name: string;
  type: AgentType;
}

export interface PaymentResult {
  txHash: string | null;
  raw: unknown;
}
