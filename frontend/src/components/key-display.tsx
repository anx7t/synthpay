import { CopyButton } from "./copy-button";
import { cn, truncateKey } from "@/lib/utils";

/** Monospace, truncated Stellar key with a copy affordance. */
export function KeyDisplay({
  value,
  label,
  head = 6,
  tail = 6,
  className,
}: {
  value: string | null | undefined;
  label?: string;
  head?: number;
  tail?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      {label && <span className="mr-1 shrink-0 text-xs text-cloud/40">{label}</span>}
      <code title={value ?? undefined} className="truncate font-mono text-[12.5px] text-cloud/80">
        {truncateKey(value, head, tail)}
      </code>
      {value && <CopyButton value={value} label="Copy key" />}
    </div>
  );
}
