import type { TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  open: { label: "Open", className: "border-cloud/15 bg-cloud/[0.06] text-cloud/70", dot: "bg-cloud/50" },
  assigned: { label: "Assigned", className: "border-sky-400/30 bg-sky-400/10 text-sky-300", dot: "bg-sky-400" },
  submitted: { label: "Submitted", className: "border-sun/40 bg-sun/10 text-sun", dot: "bg-sun" },
  verified: { label: "Verified", className: "border-green-400/30 bg-green-400/10 text-green-300", dot: "bg-green-400" },
  paid: { label: "Paid", className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300", dot: "bg-emerald-400" },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold uppercase tracking-[0.08em]",
        meta.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, status === "submitted" && "animate-pulse")} />
      {meta.label}
    </span>
  );
}
