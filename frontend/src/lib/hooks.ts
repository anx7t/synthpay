"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getErrorMessage } from "./api";
import { useTrackedAgents } from "./agent-store";
import type { CreateAgentInput, CreateTaskInput, Task } from "./types";
import { truncateKey } from "./utils";

export const queryKeys = {
  health: ["health"] as const,
  tasks: ["tasks"] as const,
  agentBalance: (pk: string) => ["agent-balance", pk] as const,
  wallet: (pk: string) => ["wallet-balance", pk] as const,
};

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
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: api.listTasks,
    refetchInterval: 15_000,
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

/** Agents known to this browser plus any agent keys seen on tasks. */
export function useKnownAgents(tasks: Task[] | undefined) {
  const tracked = useTrackedAgents();
  return useMemo(() => {
    const trackedKeys = new Set(tracked.map((a) => a.publicKey));
    const seen = new Map<string, number>();
    for (const t of tasks ?? []) {
      if (t.agentPublicKey && !trackedKeys.has(t.agentPublicKey)) {
        seen.set(t.agentPublicKey, (seen.get(t.agentPublicKey) ?? 0) + 1);
      }
    }
    const activeKeys = new Set(
      (tasks ?? [])
        .filter((t) => t.agentPublicKey && (t.status === "assigned" || t.status === "submitted"))
        .map((t) => t.agentPublicKey!),
    );
    return {
      tracked,
      discovered: Array.from(seen, ([publicKey, taskCount]) => ({ publicKey, taskCount })),
      allKeys: [...trackedKeys, ...seen.keys()],
      activeKeys,
    };
  }, [tracked, tasks]);
}

/* ------------------------------ Mutations ------------------------------- */

function useTaskMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  success: (vars: TVars, data: unknown) => string,
  opts?: { refreshBalances?: boolean },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      toast.success(success(vars, data));
      qc.invalidateQueries({ queryKey: queryKeys.tasks });
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
    ({ id, submission }: { id: string; submission: string }) => api.submitTask(id, submission),
    () => "Work submitted for verification",
  );
}

export function useVerifyTask() {
  return useTaskMutation(
    ({ id }: { id: string }) => api.verifyTask(id),
    () => "Task verified — ready for payout",
  );
}

export function useReleasePayment() {
  return useTaskMutation(
    ({ taskId }: { taskId: string; reward: number }) => api.releasePayment(taskId),
    (vars) => `Payment released · ${vars.reward} XLM`,
    { refreshBalances: true },
  );
}

export function useCreateAgent() {
  return useMutation({
    mutationFn: (input: CreateAgentInput) => api.createAgent(input),
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
