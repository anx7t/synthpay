import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { KeyDisplay } from "./key-display";
import { TaskActions } from "./task-actions";
import { TiltCard } from "./tilt-card";
import { TASK_STATUSES, type Task } from "@/lib/types";
import { cn, explorerTxUrl, formatAmount, shortId, timeAgo, truncateKey } from "@/lib/utils";

export function LifecycleBar({ status, className }: { status: Task["status"]; className?: string }) {
  const idx = TASK_STATUSES.indexOf(status);
  return (
    <div className={cn("flex gap-1", className)} aria-label={`Step ${idx + 1} of ${TASK_STATUSES.length}`}>
      {TASK_STATUSES.map((s, i) => (
        <span
          key={s}
          title={s}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            i < idx && "bg-cloud/40",
            i === idx && (status === "paid" ? "bg-teal" : "bg-sun"),
            i > idx && "bg-cloud/10",
          )}
        />
      ))}
    </div>
  );
}

export function TaskCard({ task }: { task: Task }) {
  const created = timeAgo(task.createdAt);

  return (
    <TiltCard className="rounded-2xl" max={4}>
    <article
      className={cn(
        "surface group flex h-full flex-col rounded-2xl p-5 transition-colors hover:border-cloud/20 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={task.status} />
        <span className="font-mono text-[11px] text-cloud/35">
          #{shortId(task.id)}
          {created && <> · {created}</>}
        </span>
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="font-serif text-[22px] font-normal leading-tight tracking-normal">
          <Link href={`/tasks/${encodeURIComponent(task.id)}`} className="transition hover:text-sun">
            {task.title}
          </Link>
        </h3>
        {task.description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-cloud/55">{task.description}</p>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Reward</p>
          <p className="num font-display text-2xl font-semibold tracking-tight">
            {formatAmount(task.reward)} <span className="font-mono text-sm font-normal text-cloud/45">XLM</span>
          </p>
        </div>
      </div>

      <LifecycleBar status={task.status} className="mt-5" />

      <dl className="mt-4 grid gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-cloud/40">Employer</dt>
          <dd className="min-w-0">
            <KeyDisplay value={task.employerPublicKey} head={5} tail={5} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-cloud/40">Agent</dt>
          <dd className="min-w-0">
            {task.agentPublicKey ? (
              <KeyDisplay value={task.agentPublicKey} head={5} tail={5} />
            ) : (
              <span className="py-1.5 text-cloud/30">Unassigned</span>
            )}
          </dd>
        </div>
      </dl>

      {task.proofUrl && (
        <a
          href={task.proofUrl}
          target="_blank"
          rel="noreferrer"
          className="group/proof mt-4 flex items-center gap-3 rounded-lg border border-cloud/10 bg-graphite/60 p-3 transition hover:border-sun/40"
        >
          <span className="eyebrow shrink-0">Proof</span>
          <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-cloud/75 group-hover/proof:text-sun">
            {task.proofUrl.replace(/^https?:\/\//, "")}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-cloud/40 group-hover/proof:text-sun" />
        </a>
      )}

      <div className="flex-1" />
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-cloud/10 pt-4">
        {task.status === "paid" ? (
          task.txHash ? (
            <a
              href={explorerTxUrl(task.txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 items-center gap-2 text-xs text-teal transition hover:text-sun"
            >
              <span className="text-cloud/40">tx</span>
              <code className="truncate font-mono">{truncateKey(task.txHash, 8, 8)}</code>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {task.paidLocally && (
                <span title="Paid from this browser — the API still reports this task as verified" className="text-cloud/35">
                  · local
                </span>
              )}
            </a>
          ) : (
            <span className="text-xs text-teal">Settled on Stellar</span>
          )
        ) : (
          <span className="text-xs text-cloud/40">Next step</span>
        )}
        <TaskActions task={task} size="sm" />
      </div>
    </article>
    </TiltCard>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex justify-between">
        <div className="skeleton h-5 w-20 rounded-full" />
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="skeleton h-6 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-8 w-28" />
      <div className="skeleton h-1 w-full" />
      <div className="skeleton h-8 w-full" />
    </div>
  );
}
