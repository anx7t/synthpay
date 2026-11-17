"use client";

import { useHealth } from "@/lib/hooks";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ApiStatus({ compact = false }: { compact?: boolean }) {
  const { data, isSuccess, isError, isLoading } = useHealth();
  const state = isLoading ? "checking" : isSuccess ? "online" : isError ? "offline" : "checking";
  const host = API_BASE_URL.replace(/^https?:\/\//, "");

  return (
    <div
      title={`${data?.project ? `${data.project} · ` : ""}${API_BASE_URL}`}
      className={cn(
        "flex items-center gap-2.5 rounded-lg",
        !compact && "border border-cloud/10 bg-cloud/[0.03] px-3 py-2.5",
      )}
    >
      <span className="relative flex h-2 w-2">
        {state === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            state === "online" && "bg-emerald-400",
            state === "offline" && "bg-red-400",
            state === "checking" && "bg-cloud/40",
          )}
        />
      </span>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-medium text-cloud/80">
            {state === "online" ? "API online" : state === "offline" ? "API unreachable" : "Checking API…"}
          </p>
          <p className="truncate font-mono text-[10.5px] text-cloud/40">{host}</p>
        </div>
      )}
    </div>
  );
}
