import axios from "axios";
import {
  TASK_STATUSES,
  type Balance,
  type CreateAgentInput,
  type CreateTaskInput,
  type CreatedAgent,
  type PaymentResult,
  type Task,
  type TaskStatus,
} from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

/* -------------------------------------------------------------------------- */
/*  Error handling                                                            */
/* -------------------------------------------------------------------------- */

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return `Can't reach the SynthPay API at ${API_BASE_URL}`;
    const data = err.response.data as Record<string, unknown> | string | undefined;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const msg = data.error ?? data.message ?? data.detail;
      if (typeof msg === "string") return msg;
      if (msg && typeof msg === "object" && "message" in msg) return String((msg as { message: unknown }).message);
    }
    return `Request failed (${err.response.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

/* -------------------------------------------------------------------------- */
/*  Response normalization                                                    */
/*  The backend may wrap payloads ({ data }, { success, task }) or use        */
/*  slightly different field names. Everything is normalized here so the UI   */
/*  only ever sees the types in ./types.                                      */
/* -------------------------------------------------------------------------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function unwrap(body: unknown, ...keys: string[]): unknown {
  let cur = body;
  if (isObj(cur) && "data" in cur && cur.data !== undefined) cur = cur.data;
  for (const k of keys) {
    if (isObj(cur) && k in cur && cur[k] !== undefined) return cur[k];
  }
  return cur;
}

function str(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
    if (isObj(v)) {
      const nested = str(v.publicKey, v.public_key, v.pk, v.id);
      if (nested) return nested;
    }
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
  if ((TASK_STATUSES as readonly string[]).includes(s)) return s as TaskStatus;
  if (s === "completed" || s === "complete" || s === "released") return "paid";
  if (s === "approved") return "verified";
  if (s === "in_progress" || s === "in-progress") return "assigned";
  return "open";
}

export function normalizeTask(raw: unknown): Task {
  const t = isObj(raw) ? raw : {};
  return {
    id: str(t.id, t._id, t.taskId) ?? "unknown",
    title: str(t.title, t.name) ?? "Untitled task",
    description: str(t.description) ?? "",
    reward: num(t.reward, t.rewardAmount, t.reward_amount, t.amount),
    status: normalizeStatus(t.status),
    employerPublicKey: str(t.employerPublicKey, t.employer_public_key, t.employerPk, t.employer),
    agentPublicKey: str(
      t.agentPublicKey,
      t.agent_public_key,
      t.agentPk,
      t.assignedAgent,
      t.assignedTo,
      t.assigned_to,
      t.agent,
    ),
    submission: str(t.submission, t.result, t.output, t.work),
    txHash: str(t.txHash, t.tx_hash, t.paymentTxHash, t.transactionHash, t.hash),
    createdAt: str(t.createdAt, t.created_at),
  };
}

export function normalizeBalances(body: unknown): Balance[] {
  const b = unwrap(body, "balances");
  const list = Array.isArray(b) ? b : null;

  if (list) {
    return list.filter(isObj).map((x) => ({
      asset:
        x.asset_type === "native"
          ? "XLM"
          : str(x.asset_code, x.assetCode, x.asset, x.code, x.currency) ?? "UNKNOWN",
      amount: num(x.balance, x.amount),
      issuer: str(x.asset_issuer, x.issuer),
    }));
  }

  if (isObj(b)) {
    if ("balance" in b) {
      const inner = b.balance;
      if (Array.isArray(inner) || isObj(inner)) return normalizeBalances(inner);
      return [{ asset: str(b.asset, b.asset_code) ?? "XLM", amount: num(inner), issuer: null }];
    }
    // Map form: { XLM: "100.5", USDC: "12" }
    return Object.entries(b)
      .filter(([k, v]) => !/key|account|address|id/i.test(k) && v !== null && v !== "" && Number.isFinite(Number(v)))
      .map(([k, v]) => ({ asset: k.toUpperCase(), amount: Number(v), issuer: null }));
  }

  if (typeof b === "string" || typeof b === "number") {
    return [{ asset: "XLM", amount: num(b), issuer: null }];
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/*  Endpoints                                                                 */
/* -------------------------------------------------------------------------- */

export const api = {
  /** GET /health */
  async health(): Promise<{ ok: boolean; raw: unknown }> {
    const { data } = await http.get("/health", { timeout: 5_000 });
    return { ok: true, raw: data };
  },

  /** POST /api/agents/create */
  async createAgent(input: CreateAgentInput): Promise<CreatedAgent> {
    const { data } = await http.post("/api/agents/create", { name: input.name, type: input.type });
    const a = unwrap(data, "agent");
    const o = isObj(a) ? a : {};
    const keypair = isObj(o.keypair) ? o.keypair : {};
    const publicKey = str(o.publicKey, o.public_key, o.pk, keypair.publicKey, keypair.public_key);
    if (!publicKey) throw new Error("Agent was created but the API did not return a public key");
    return {
      name: str(o.name) ?? input.name,
      type: str(o.type, o.agentType) ?? input.type,
      publicKey,
      secretKey: str(o.secretKey, o.secret_key, o.secret, o.sk, keypair.secretKey, keypair.secret),
      raw: data,
    };
  },

  /** GET /api/agents/:pk/balance */
  async getAgentBalance(publicKey: string): Promise<Balance[]> {
    const { data } = await http.get(`/api/agents/${encodeURIComponent(publicKey)}/balance`);
    return normalizeBalances(data);
  },

  /** POST /api/tasks/create */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const { data } = await http.post("/api/tasks/create", input);
    return normalizeTask(unwrap(data, "task"));
  },

  /** GET /api/tasks */
  async listTasks(): Promise<Task[]> {
    const { data } = await http.get("/api/tasks");
    const list = unwrap(data, "tasks");
    return Array.isArray(list) ? list.map(normalizeTask) : [];
  },

  /** PATCH /api/tasks/:id/assign */
  async assignTask(id: string, agentPublicKey: string): Promise<Task> {
    const { data } = await http.patch(`/api/tasks/${encodeURIComponent(id)}/assign`, { agentPublicKey });
    return normalizeTask(unwrap(data, "task"));
  },

  /** PATCH /api/tasks/:id/submit */
  async submitTask(id: string, submission: string): Promise<Task> {
    const { data } = await http.patch(`/api/tasks/${encodeURIComponent(id)}/submit`, { submission });
    return normalizeTask(unwrap(data, "task"));
  },

  /** PATCH /api/tasks/:id/verify */
  async verifyTask(id: string): Promise<Task> {
    const { data } = await http.patch(`/api/tasks/${encodeURIComponent(id)}/verify`, { approved: true });
    return normalizeTask(unwrap(data, "task"));
  },

  /** POST /api/payments/release */
  async releasePayment(taskId: string): Promise<PaymentResult> {
    const { data } = await http.post("/api/payments/release", { taskId });
    const p = unwrap(data, "payment", "result");
    const o = isObj(p) ? p : {};
    const task = isObj(o.task) ? o.task : {};
    return {
      txHash: str(o.txHash, o.tx_hash, o.hash, o.transactionHash, task.txHash),
      raw: data,
    };
  },

  /** GET /api/payments/balance/:pk */
  async getWalletBalance(publicKey: string): Promise<Balance[]> {
    const { data } = await http.get(`/api/payments/balance/${encodeURIComponent(publicKey)}`);
    return normalizeBalances(data);
  },
};
