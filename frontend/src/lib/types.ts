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
  /** Proof of work submitted by the agent (PATCH /api/tasks/:id/submit). */
  proofUrl: string | null;
  txHash: string | null;
  createdAt: string | null;
  /** True when "paid" comes from this browser's payment record, not the API. */
  paidLocally?: boolean;
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

/** An agent as returned by GET /api/agents. */
export interface Agent {
  publicKey: string;
  name: string;
  agentType: string;
  createdAt: string | null;
}

/** Returned once by POST /api/agents/create. The secret is never persisted. */
export interface CreatedAgent extends Agent {
  secretKey: string | null;
}

/** Agents remembered by this browser (public data only). */
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
  agentPublicKey?: string;
}

export interface CreateAgentInput {
  name: string;
  agentType: AgentType;
}

export interface ReleasePaymentInput {
  senderSecret: string;
  receiverPublicKey: string;
  amount: string;
  /** Links the payment to a task so the backend marks it paid and stores tx_hash. */
  taskId?: string;
}

export interface PaymentResult {
  txHash: string | null;
}

export interface Health {
  status: string;
  project: string | null;
}
