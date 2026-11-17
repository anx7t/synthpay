"use client";

import { ExternalLink, RotateCw, Trash2 } from "lucide-react";
import { KeyDisplay } from "./key-display";
import { useAgentBalance } from "@/lib/hooks";
import { getErrorMessage } from "@/lib/api";
import { untrackAgent } from "@/lib/agent-store";
import { AGENT_TYPES, type Balance } from "@/lib/types";
import { cn, explorerAccountUrl, formatAmount } from "@/lib/utils";

export function agentTypeLabel(type: string) {
  return AGENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Deterministic monogram tile, tinted only with brand colors. */
export function AgentAvatar({ name, publicKey, className }: { name: string; publicKey: string; className?: string }) {
  const initials =
    name
      .split(/[\s-_]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || publicKey.slice(1, 3);
  const hash = Array.from(publicKey).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const angle = hash % 360;
  return (
    <div
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sun/25 font-display text-sm font-bold text-sun",
        className,
      )}
      style={{
        background: `linear-gradient(${angle}deg, rgba(255,201,40,0.22), rgba(242,244,241,0.04) 70%)`,
      }}
    >
      {initials}
    </div>
  );
}

export function primaryBalance(balances: Balance[] | undefined) {
  if (!balances?.length) return null;
  return balances.find((b) => b.asset === "XLM") ?? balances[0];
}

export function BalanceReadout({ publicKey, align = "right" }: { publicKey: string; align?: "left" | "right" }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useAgentBalance(publicKey);
  const xlm = primaryBalance(data);
  const others = (data ?? []).filter((b) => b !== xlm);

  return (
    <div className={cn("flex flex-col", align === "right" ? "items-end text-right" : "items-start")}>
      {isLoading ? (
        <div className="skeleton h-6 w-20" />
      ) : isError ? (
        <button
          onClick={() => refetch()}
          title={getErrorMessage(error)}
          className="inline-flex items-center gap-1 text-xs text-red-300/80 hover:text-sun"
        >
          <RotateCw className="h-3 w-3" /> Unavailable
        </button>
      ) : (
        <>
          <p className={cn("num font-display text-xl font-semibold tracking-tight", isFetching && "opacity-60")}>
            {xlm ? formatAmount(xlm.amount, 2) : "0"}
            <span className="ml-1 font-mono text-xs font-normal text-cloud/45">{xlm?.asset ?? "XLM"}</span>
          </p>
          {others.length > 0 && (
            <p className="font-mono text-[11px] text-cloud/45">
              {others
                .slice(0, 2)
                .map((b) => `${formatAmount(b.amount)} ${b.asset}`)
                .join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function AgentCard({
  name,
  type,
  publicKey,
  meta,
  removable = true,
}: {
  name: string;
  type: string;
  publicKey: string;
  meta?: React.ReactNode;
  removable?: boolean;
}) {
  const { refetch, isFetching } = useAgentBalance(publicKey);

  return (
    <article className="surface group flex flex-col gap-5 rounded-2xl p-5 transition-colors hover:border-cloud/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AgentAvatar name={name} publicKey={publicKey} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold tracking-tight">{name}</h3>
            <p className="text-xs text-cloud/50">{agentTypeLabel(type)}</p>
          </div>
        </div>
        <BalanceReadout publicKey={publicKey} />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-cloud/10 bg-graphite/60 py-1 pl-3 pr-1">
        <KeyDisplay value={publicKey} head={8} tail={8} className="flex-1 justify-between" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-cloud/40">{meta}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => refetch()}
            className="rounded-md p-1.5 text-cloud/45 transition hover:bg-sun/10 hover:text-sun"
            title="Refresh balance"
            aria-label="Refresh balance"
          >
            <RotateCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </button>
          <a
            href={explorerAccountUrl(publicKey)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-1.5 text-cloud/45 transition hover:bg-sun/10 hover:text-sun"
            title="View on Stellar Expert"
            aria-label="View on Stellar Expert"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {removable && (
            <button
              onClick={() => untrackAgent(publicKey)}
              className="rounded-md p-1.5 text-cloud/45 transition hover:bg-red-500/10 hover:text-red-300"
              title="Stop tracking"
              aria-label="Stop tracking agent"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
