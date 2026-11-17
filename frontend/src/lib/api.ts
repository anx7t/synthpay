import axios from "axios";
import {
  TASK_STATUSES,
  type Agent,
  type Balance,
  type CreateAgentInput,
  type CreateTaskInput,
  type CreatedAgent,
  type Health,
  type PaymentResult,
  type ReleasePaymentInput,
  type Task,
  type TaskStatus,
} from "./types";

/*
 * SynthPay API client. Every call matches the backend reference:
 *
 *   GET    /health                              → { status, project }
 *   POST   /api/agents/create        { name, agentType }                → { success, agent, secretKey }
 *   GET    /api/agents                                                  → { success, agents }
 *   GET    /api/agents/:publicKey/balance                               → { success, balances }
 *   POST   /api/tasks/create         { title, description, reward, employerPublicKey, agentPublicKey? }
 *                                                                       → { success, task }
 *   GET    /api/tasks                                                   → { success, tasks }
 *   GET    /api/tasks/:id                                               → { success, task }
 *   PATCH  /api/tasks/:id/assign     { agentPublicKey }                 → { success, task }
 *   PATCH  /api/tasks/:id/submit     { proofUrl }                       → { success, task }
 *   PATCH  /api/tasks/:id/verify     —                                  → { success, task, message }
 *   POST   /api/payments/release     { senderSecret, receiverPublicKey, amount, taskId? }
 *                                                                       → { success, txHash, task? }
 *   GET    /api/payments/balance/:publicKey                             → { success, balances }
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

/* -------------------------------------------------------------------------- */
/*  Errors                                                                    */
/* -------------------------------------------------------------------------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function messageFrom(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) return data;
  if (!isObj(data)) return null;
  const msg = data.error ?? data.message ?? data.detail;
  if (typeof msg === "string") return msg;
  if (isObj(msg) && typeof msg.message === "string") return msg.message;
  return null;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return `Can't reach the SynthPay API at ${API_BASE_URL}`;
    return messageFrom(err.response.data) ?? `Request failed (${err.response.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

/** The API answers `{ success: false, error }` for failures — even with a 2xx. */
function ensureSuccess<T>(data: T): T {
  if (isObj(data) && data.success === false) {
    throw new Error(messageFrom(data) ?? "The SynthPay API reported a failure");
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/*  Normalizers                                                               */
/* -------------------------------------------------------------------------- */

function str(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

function num(...vals: unknown[]): number {
  for (const v of vals) {
    const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeStatus(raw: unknown): TaskStatus {
  const s = String(raw ?? "open").toLowerCase();
  // "paying" = backend has locked a verified task while its payment is in flight
  if (s === "paying") return "verified";
  return (TASK_STATUSES as readonly string[]).includes(s) ? (s as TaskStatus) : "open";
}

/*
 * The backend returns Supabase rows as-is, so fields are snake_case:
 *   tasks:  id, title, description, reward (text), employer_public_key,
 *           agent_public_key, status, proof_url, created_at
 *   agents: id, name, agent_type, public_key, created_at
 * camelCase is accepted too in case the API starts mapping them.
 */
export function normalizeTask(raw: unknown): Task {
  const t = isObj(raw) ? raw : {};
  return {
    id: str(t.id) ?? "unknown",
    title: str(t.title) ?? "Untitled task",
    description: str(t.description) ?? "",
    reward: num(t.reward),
    status: normalizeStatus(t.status),
    employerPublicKey: str(t.employer_public_key, t.employerPublicKey),
    agentPublicKey: str(t.agent_public_key, t.agentPublicKey),
    proofUrl: str(t.proof_url, t.proofUrl),
    txHash: str(t.tx_hash, t.txHash),
    createdAt: str(t.created_at, t.createdAt),
  };
}

export function normalizeAgent(raw: unknown): Agent {
  const a = isObj(raw) ? raw : {};
  return {
    publicKey: str(a.public_key, a.publicKey) ?? "",
    name: str(a.name) ?? "Unnamed agent",
    agentType: str(a.agent_type, a.agentType) ?? "agent",
    createdAt: str(a.created_at, a.createdAt),
  };
}

/** `balances` is a Horizon-style list: [{ asset_type, asset_code?, asset_issuer?, balance }]. */
export function normalizeBalances(list: unknown): Balance[] {
  if (!Array.isArray(list)) return [];
  return list.filter(isObj).map((x) => ({
    asset: x.asset_type === "native" ? "XLM" : str(x.asset_code, x.asset) ?? "UNKNOWN",
    amount: num(x.balance, x.amount),
    issuer: str(x.asset_issuer, x.issuer),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Endpoints                                                                 */
/* -------------------------------------------------------------------------- */

export const api = {
  async health(): Promise<Health> {
    const { data } = await http.get("/health", { timeout: 5_000 });
    return { status: str(data?.status) ?? "ok", project: str(data?.project) };
  },

  async createAgent(input: CreateAgentInput): Promise<CreatedAgent> {
    const { data } = await http.post("/api/agents/create", { name: input.name, agentType: input.agentType });
    ensureSuccess(data);
    const agent = normalizeAgent(data.agent);
    if (!agent.publicKey) throw new Error("Agent was created but the API did not return a public key");
    return {
      ...agent,
      name: agent.name === "Unnamed agent" ? input.name : agent.name,
      agentType: agent.agentType === "agent" ? input.agentType : agent.agentType,
      // secretKey is returned at the top level, next to `agent`
      secretKey: str(data.secretKey, isObj(data.agent) ? data.agent.secretKey : null),
    };
  },

  async listAgents(): Promise<Agent[]> {
    const { data } = await http.get("/api/agents");
    ensureSuccess(data);
    return Array.isArray(data.agents) ? data.agents.map(normalizeAgent).filter((a: Agent) => a.publicKey) : [];
  },

  async getAgentBalance(publicKey: string): Promise<Balance[]> {
    const { data } = await http.get(`/api/agents/${encodeURIComponent(publicKey)}/balance`);
    ensureSuccess(data);
    return normalizeBalances(data.balances);
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    const body: CreateTaskInput = {
      title: input.title,
      description: input.description,
      reward: input.reward,
      employerPublicKey: input.employerPublicKey,
    };
    if (input.agentPublicKey) body.agentPublicKey = input.agentPublicKey;
    const { data } = await http.post("/api/tasks/create", body);
    ensureSuccess(data);
    return normalizeTask(data.task);
  },

  async listTasks(): Promise<Task[]> {
    const { data } = await http.get("/api/tasks");
    ensureSuccess(data);
    return Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : [];
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await http.get(`/api/tasks/${encodeURIComponent(id)}`);
    ensureSuccess(data);
    return normalizeTask(data.task);
  },

  async assignTask(id: string, agentPublicKey: string): Promise<Task> {
    const { data } = await http.patch(`/api/tasks/${encodeURIComponent(id)}/assign`, { agentPublicKey });
    ensureSuccess(data);
    return normalizeTask(data.task);
  },

  async submitTask(id: string, proofUrl: string): Promise<Task> {
    const { data } = await http.patch(`/api/tasks/${encodeURIComponent(id)}/submit`, { proofUrl });
    ensureSuccess(data);
    return normalizeTask(data.task);
  },

  async verifyTask(id: string): Promise<{ task: Task; message: string | null }> {
    // No request body.
    const { data } = await http.patch(`/api/tasks/${encodeURIComponent(id)}/verify`);
    ensureSuccess(data);
    return { task: normalizeTask(data.task), message: str(data.message) };
  },

  async releasePayment(input: ReleasePaymentInput): Promise<PaymentResult> {
    const { data } = await http.post("/api/payments/release", {
      senderSecret: input.senderSecret,
      receiverPublicKey: input.receiverPublicKey,
      amount: input.amount,
      ...(input.taskId ? { taskId: input.taskId } : {}),
    });
    ensureSuccess(data);
    return { txHash: str(data.txHash) };
  },

  async getWalletBalance(publicKey: string): Promise<Balance[]> {
    const { data } = await http.get(`/api/payments/balance/${encodeURIComponent(publicKey)}`);
    ensureSuccess(data);
    return normalizeBalances(data.balances);
  },
};
