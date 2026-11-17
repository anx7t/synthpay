"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getErrorMessage } from "./api";
import { useTrackedAgents } from "./agent-store";
import { recordPayment, usePaymentRecords, type PaymentRecord } from "./payment-store";
import type { Agent, CreateAgentInput, CreateTaskInput, Task } from "./types";
import { truncateKey } from "./utils";

export const queryKeys = {
  health: ["health"] as const,
  tasks: ["tasks"] as const,
  task: (id: string) => ["task", id] as const,
  agents: ["agents"] as const,
  agentBalance: (pk: string) => ["agent-balance", pk] as const,
  wallet: (pk: string) => ["wallet-balance", pk] as const,
};

/** Overlay this browser's payment records onto tasks the API still reports as verified. */
function withLocalPayment(task: Task, records: Record<string, PaymentRecord>): Task {
  const rec = records[task.id];
  if (!rec || task.status === "paid") return task;
  return { ...task, status: "paid", txHash: task.txHash ?? rec.txHash, paidLocally: true };
}

/* ------------------------------- Queries -------------------------------- */

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: 0,
  });
}

export function useTasks() {
  const records = usePaymentRecords();
  const query = useQuery({
    queryKey: queryKeys.tasks,
    queryFn: api.listTasks,
    refetchInterval: 15_000,
  });
  const data = useMemo(() => query.data?.map((t) => withLocalPayment(t, records)), [query.data, records]);
  return { ...query, data };
}

export function useTask(id: string) {
  const records = usePaymentRecords();
  const query = useQuery({
    queryKey: queryKeys.task(id),
    queryFn: () => api.getTask(id),
    enabled: !!id,
    refetchInterval: 15_000,
  });
  const data = useMemo(() => (query.data ? withLocalPayment(query.data, records) : undefined), [query.data, records]);
  return { ...query, data };
}

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: api.listAgents,
    refetchInterval: 30_000,
  });
}

export function useAgentBalance(publicKey: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.agentBalance(publicKey ?? ""),
    queryFn: () => api.getAgentBalance(publicKey!),
    enabled: !!publicKey,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useWalletBalance(publicKey: string | null) {
  return useQuery({
    queryKey: queryKeys.wallet(publicKey ?? ""),
    queryFn: () => api.getWalletBalance(publicKey!),
    enabled: !!publicKey,
    retry: 0,
  });
}

/**
 * Every agent we know about:
 *  - `registered`: from GET /api/agents (source of truth)
 *  - `tracked`: added in this browser but not (yet) returned by the API
 *  - `discovered`: keys seen on tasks that match neither
 */
export function useKnownAgents(tasks: Task[] | undefined) {
  const tracked = useTrackedAgents();
  const { data: registered = [], isLoading, isError, error } = useAgents();

  return useMemo(() => {
    const registeredKeys = new Set(registered.map((a) => a.publicKey));
    const localOnly = tracked.filter((a) => !registeredKeys.has(a.publicKey));
    const knownKeys = new Set([...registeredKeys, ...localOnly.map((a) => a.publicKey)]);

    const seen = new Map<string, number>();
    for (const t of tasks ?? []) {
      if (t.agentPublicKey && !knownKeys.has(t.agentPublicKey)) {
        seen.set(t.agentPublicKey, (seen.get(t.agentPublicKey) ?? 0) + 1);
      }
    }
    const activeKeys = new Set(
      (tasks ?? [])
        .filter((t) => t.agentPublicKey && (t.status === "assigned" || t.status === "submitted"))
        .map((t) => t.agentPublicKey!),
    );

    /** One list for pickers: registered first, then local-only. */
    const all: Agent[] = [
      ...registered,
      ...localOnly.map((a) => ({ publicKey: a.publicKey, name: a.name, agentType: a.type, createdAt: a.createdAt })),
    ];

    return {
      registered,
      tracked: localOnly,
      discovered: Array.from(seen, ([publicKey, taskCount]) => ({ publicKey, taskCount })),
      all,
      activeKeys,
      isLoading,
      isError,
      error,
    };
  }, [registered, tracked, tasks, isLoading, isError, error]);
}

/* ------------------------------ Mutations ------------------------------- */

function useTaskMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  success: (vars: TVars, data: TData) => string,
  opts?: { refreshBalances?: boolean; onSuccess?: (vars: TVars, data: TData) => void },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      opts?.onSuccess?.(vars, data);
      toast.success(success(vars, data));
      qc.invalidateQueries({ queryKey: queryKeys.tasks });
      qc.invalidateQueries({ queryKey: ["task"] });
      if (opts?.refreshBalances) {
        qc.invalidateQueries({ queryKey: ["agent-balance"] });
        qc.invalidateQueries({ queryKey: ["wallet-balance"] });
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateTask() {
  return useTaskMutation(
    (input: CreateTaskInput) => api.createTask(input),
    (vars) => `Task “${vars.title}” is live`,
  );
}

export function useAssignTask() {
  return useTaskMutation(
    ({ id, agentPublicKey }: { id: string; agentPublicKey: string }) => api.assignTask(id, agentPublicKey),
    (vars) => `Assigned to ${truncateKey(vars.agentPublicKey, 4, 4)}`,
  );
}

export function useSubmitTask() {
  return useTaskMutation(
    ({ id, proofUrl }: { id: string; proofUrl: string }) => api.submitTask(id, proofUrl),
    () => "Proof submitted for verification",
  );
}

export function useVerifyTask() {
  return useTaskMutation(
    ({ id }: { id: string }) => api.verifyTask(id),
    () => "Work verified — ready to release payment",
  );
}

/**
 * Releases the reward for a verified task: the employer's secret signs a
 * payment of `task.reward` to `task.agentPublicKey`.
 */
export function useReleasePayment() {
  return useTaskMutation(
    ({ task, senderSecret }: { task: Task; senderSecret: string }) => {
      if (!task.agentPublicKey) throw new Error("This task has no assigned agent to pay");
      return api.releasePayment({
        senderSecret,
        receiverPublicKey: task.agentPublicKey,
        amount: String(task.reward),
      });
    },
    (vars) => `Payment released · ${vars.task.reward} XLM`,
    {
      refreshBalances: true,
      onSuccess: ({ task }, res) =>
        recordPayment(task.id, {
          txHash: res.txHash,
          amount: String(task.reward),
          receiverPublicKey: task.agentPublicKey!,
          paidAt: new Date().toISOString(),
        }),
    },
  );
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInput) => api.createAgent(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
