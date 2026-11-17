import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STELLAR_NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "public" ? "public" : "testnet";

const STELLAR_PK_RE = /^G[A-Z2-7]{55}$/;

export function isStellarPublicKey(value: string) {
  return STELLAR_PK_RE.test(value.trim());
}

export function truncateKey(key: string | null | undefined, head = 6, tail = 6) {
  if (!key) return "—";
  if (key.length <= head + tail + 1) return key;
  return `${key.slice(0, head)}…${key.slice(-tail)}`;
}

export function formatAmount(value: number, maxFractionDigits = 2) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function explorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/${STELLAR_NETWORK}/tx/${hash}`;
}

export function explorerAccountUrl(publicKey: string) {
  return `https://stellar.expert/explorer/${STELLAR_NETWORK}/account/${publicKey}`;
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/** Short, stable label for a task id (handles uuids, mongo ids and integers). */
export function shortId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id;
}
