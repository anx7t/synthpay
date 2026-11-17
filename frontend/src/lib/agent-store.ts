"use client";

import { useSyncExternalStore } from "react";
import type { TrackedAgent } from "./types";

/**
 * The backend has no "list agents" endpoint, so the agents this browser
 * creates (or explicitly tracks) are remembered locally. Only public data is
 * stored — secret keys never touch storage.
 */
const STORAGE_KEY = "synthpay.agents.v1";
const EMPTY: TrackedAgent[] = [];
const listeners = new Set<() => void>();
let cache: TrackedAgent[] | null = null;

function read(): TrackedAgent[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(next: TrackedAgent[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — keep in-memory copy */
  }
  listeners.forEach((l) => l());
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

export function trackAgent(agent: Omit<TrackedAgent, "createdAt"> & { createdAt?: string }) {
  const rest = read().filter((a) => a.publicKey !== agent.publicKey);
  write([{ ...agent, createdAt: agent.createdAt ?? new Date().toISOString() }, ...rest]);
}

export function untrackAgent(publicKey: string) {
  write(read().filter((a) => a.publicKey !== publicKey));
}

export function useTrackedAgents(): TrackedAgent[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
