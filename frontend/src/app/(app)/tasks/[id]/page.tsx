"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, RotateCw } from "lucide-react";
import { KeyDisplay } from "@/components/key-display";
import { StatusBadge } from "@/components/status-badge";
import { TaskActions } from "@/components/task-actions";
import { LifecycleBar } from "@/components/task-card";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { useTask } from "@/lib/hooks";
import { TASK_STATUSES } from "@/lib/types";
import { cn, explorerTxUrl, formatAmount, timeAgo, truncateKey } from "@/lib/utils";

const STEP_LABEL: Record<(typeof TASK_STATUSES)[number], string> = {
  open: "Posted",
  assigned: "Agent assigned",
  submitted: "Proof submitted",
  verified: "Work verified",
  paid: "Payment released",
};

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id);
  const { data: task, isLoading, isError, error, refetch, isFetching } = useTask(id);

  return (
    <>
      <Link href="/tasks" className="mb-6 inline-flex items-center gap-1.5 text-sm text-cloud/50 transition hover:text-sun">
        <ArrowLeft className="h-4 w-4" /> Tasks
      </Link>

      {isError ? (
        <ErrorState title="Couldn't load this task" message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading || !task ? (
        <div className="flex flex-col gap-4">
          <div className="skeleton h-10 w-2/3" />
          <div className="skeleton h-5 w-1/2" />
          <div className="skeleton mt-6 h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-4 flex items-center gap-3">
                <StatusBadge status={task.status} />
                <span className="font-mono text-xs text-cloud/40">#{task.id}</span>
              </div>
              <h1 className="font-serif text-[40px] font-normal leading-[1.02] tracking-[-0.01em] sm:text-[54px]">
                {task.title}
              </h1>
              {task.createdAt && <p className="mt-2 text-sm text-cloud/45">Posted {timeAgo(task.createdAt)}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh task">
                <RotateCw className={cn(isFetching && "animate-spin")} />
              </Button>
              <TaskActions task={task} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="surface rounded-2xl p-6">
              <p className="eyebrow mb-2">Description</p>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-cloud/75">
                {task.description || <span className="text-cloud/35">No description.</span>}
              </p>

              {task.proofUrl && (
                <div className="mt-8">
                  <p className="eyebrow mb-2">Proof of work</p>
                  <a
                    href={task.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-cloud/10 bg-graphite/60 px-3 py-2.5 font-mono text-sm text-cloud/80 transition hover:border-sun/40 hover:text-sun"
                  >
                    <span className="truncate">{task.proofUrl}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                </div>
              )}

              <div className="mt-8">
                <p className="eyebrow mb-4">Progress</p>
                <LifecycleBar status={task.status} />
                <ol className="mt-4 grid gap-2 sm:grid-cols-5">
                  {TASK_STATUSES.map((s, i) => {
                    const reached = i <= TASK_STATUSES.indexOf(task.status);
                    return (
                      <li key={s} className={cn("text-xs", reached ? "text-cloud/80" : "text-cloud/30")}>
                        <span className="font-mono text-cloud/35">{String(i + 1).padStart(2, "0")}</span> {STEP_LABEL[s]}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div className="rounded-2xl border border-sun/25 bg-sun/[0.06] p-6">
                <p className="eyebrow">Reward</p>
                <p className="num mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
                  {formatAmount(task.reward)} <span className="font-mono text-base font-normal text-cloud/45">XLM</span>
                </p>
              </div>

              <dl className="surface flex flex-col gap-4 rounded-2xl p-6 text-sm">
                <div>
                  <dt className="eyebrow mb-1">Employer</dt>
                  <dd>
                    <KeyDisplay value={task.employerPublicKey} head={8} tail={8} />
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow mb-1">Agent</dt>
                  <dd>
                    {task.agentPublicKey ? (
                      <KeyDisplay value={task.agentPublicKey} head={8} tail={8} />
                    ) : (
                      <span className="text-cloud/35">Unassigned</span>
                    )}
                  </dd>
                </div>
                {task.txHash && (
                  <div>
                    <dt className="eyebrow mb-1">Payment</dt>
                    <dd>
                      <a
                        href={explorerTxUrl(task.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[12.5px] text-teal hover:text-sun"
                      >
                        {truncateKey(task.txHash, 10, 10)} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      {task.paidLocally && (
                        <p className="mt-1 text-xs text-cloud/40">
                          Released from this browser. The API still lists this task as verified.
                        </p>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
