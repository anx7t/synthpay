"use client";

import { useSyncExternalStore } from "react";

/**
 * POST /api/payments/release takes no task id, so the API cannot mark a task
 * "paid" by itself. This browser keeps a record of payments it released
 * (task id → tx hash) so a verified task shows as paid and can't be paid twice
 * from here. Remove once the backend links payments to tasks.
 */
export interface PaymentRecord {
  txHash: string | null;
  amount: string;
  receiverPublicKey: string;
  paidAt: string;
}

const STORAGE_KEY = "synthpay.payments.v1";
const EMPTY: Record<string, PaymentRecord> = {};
const listeners = new Set<() => void>();
let cache: Record<string, PaymentRecord> | null = null;

function read(): Record<string, PaymentRecord> {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    cache = {};
  }
  return cache!;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function recordPayment(taskId: string, record: PaymentRecord) {
  const next = { ...read(), [taskId]: record };
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function usePaymentRecords(): Record<string, PaymentRecord> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
