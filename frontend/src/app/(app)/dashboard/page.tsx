"use client";

import Link from "next/link";
import { ArrowRight, Bot, Coins, ListChecks, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, STATUS_META } from "@/components/status-badge";
import { TaskActions } from "@/components/task-actions";
import { AgentAvatar, BalanceReadout, agentTypeLabel } from "@/components/agent-card";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnownAgents, useTasks } from "@/lib/hooks";
import { getErrorMessage } from "@/lib/api";
import { TASK_STATUSES, type Task } from "@/lib/types";
import { cn, formatAmount, shortId, truncateKey } from "@/lib/utils";

export default function DashboardPage() {
  const { data: tasks, isLoading, isError, error, refetch } = useTasks();
  const { tracked, discovered, activeKeys } = useKnownAgents(tasks);

  const paid = (tasks ?? []).filter((t) => t.status === "paid");
  const totalPaid = paid.reduce((sum, t) => sum + t.reward, 0);
  const escrowed = (tasks ?? []).filter((t) => t.status !== "paid").reduce((sum, t) => sum + t.reward, 0);
  const needsAction = (tasks ?? []).filter((t) => t.status === "submitted" || t.status === "verified").length;
  const agentCount = tracked.length + discovered.length;

  const recent = [...(tasks ?? [])]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Every task, agent and payout flowing through SynthPay — refreshed live from the network."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/agents/create">
                <Bot /> New agent
              </Link>
            </Button>
            <Button asChild>
              <Link href="/tasks/create">
                <Plus /> Post task
              </Link>
            </Button>
          </>
        }
      />

      {isError && (
        <ErrorState className="mb-6" message={getErrorMessage(error)} onRetry={() => refetch()} />
      )}

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total paid out"
          icon={Coins}
          value={formatAmount(totalPaid)}
          unit="XLM"
          highlight
          loading={isLoading}
          hint={`${paid.length} settled ${paid.length === 1 ? "payment" : "payments"}`}
        />
        <StatCard
          label="Total tasks"
          icon={ListChecks}
          value={tasks?.length ?? 0}
          loading={isLoading}
          hint={
            needsAction > 0 ? (
              <Link href="/tasks?status=submitted" className="text-sun hover:underline">
                {needsAction} awaiting your review →
              </Link>
            ) : (
              `${formatAmount(escrowed)} XLM in open rewards`
            )
          }
        />
        <StatCard
          label="Active agents"
          icon={Bot}
          value={activeKeys.size}
          loading={isLoading}
          hint={`${agentCount} known · ${activeKeys.size} on a live task`}
        />
      </section>

      {/* Pipeline */}
      <PipelineBar tasks={tasks} loading={isLoading} />

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Recent tasks */}
        <section className="surface overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Recent tasks</h2>
              <p className="text-xs text-cloud/45">Latest activity across the marketplace</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-5 pb-5 sm:px-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-5 pb-5 sm:px-6">
              <EmptyState
                icon={<ListChecks />}
                title="No tasks yet"
                description="Post the first task and an agent can pick it up right away."
                action={
                  <Button asChild size="sm">
                    <Link href="/tasks/create">
                      <Plus /> Post a task
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-cloud/10 bg-cloud/[0.02] text-left">
                      <th className="eyebrow px-6 py-2.5 font-normal">Task</th>
                      <th className="eyebrow px-3 py-2.5 font-normal">Status</th>
                      <th className="eyebrow px-3 py-2.5 font-normal">Agent</th>
                      <th className="eyebrow px-3 py-2.5 text-right font-normal">Reward</th>
                      <th className="px-6 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((t) => (
                      <tr key={t.id} className="border-b border-cloud/[0.06] transition-colors last:border-0 hover:bg-cloud/[0.03]">
                        <td className="max-w-[260px] px-6 py-3.5">
                          <p className="truncate font-medium">{t.title}</p>
                          <p className="font-mono text-[11px] text-cloud/35">#{shortId(t.id)}</p>
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-3 py-3.5">
                          <code className="whitespace-nowrap font-mono text-xs text-cloud/60">
                            {t.agentPublicKey ? truncateKey(t.agentPublicKey, 4, 4) : "—"}
                          </code>
                        </td>
                        <td className="num px-3 py-3.5 text-right font-display font-semibold text-sun">
                          {formatAmount(t.reward)} <span className="font-mono text-[11px] font-normal text-sun/60">XLM</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <TaskActions task={t} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile list */}
              <ul className="flex flex-col border-t border-cloud/10 md:hidden">
                {recent.map((t) => (
                  <li key={t.id} className="flex flex-col gap-3 border-b border-cloud/[0.06] px-5 py-4 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-medium leading-snug">{t.title}</p>
                      <p className="num shrink-0 font-display font-semibold text-sun">
                        {formatAmount(t.reward)} <span className="font-mono text-[11px] font-normal text-sun/60">XLM</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge status={t.status} />
                      <TaskActions task={t} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Recent agents */}
        <section className="surface rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Agents</h2>
              <p className="text-xs text-cloud/45">Live wallet balances</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agents">
                All <ArrowRight />
              </Link>
            </Button>
          </div>
          {agentCount === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                className="py-10"
                icon={<Bot />}
                title="No agents yet"
                description="Spawn an agent to give it a funded Stellar wallet."
                action={
                  <Button asChild size="sm">
                    <Link href="/agents/create">
                      <Plus /> Create agent
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="flex flex-col border-t border-cloud/10">
              {tracked.slice(0, 5).map((a) => (
                <li key={a.publicKey} className="flex items-center gap-3 border-b border-cloud/[0.06] px-5 py-3.5 last:border-0">
                  <AgentAvatar name={a.name} publicKey={a.publicKey} className="h-9 w-9 rounded-lg text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {a.name}
                      {activeKeys.has(a.publicKey) && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" title="On a live task" />}
                    </p>
                    <p className="truncate font-mono text-[11px] text-cloud/40">
                      {agentTypeLabel(a.type)} · {truncateKey(a.publicKey, 4, 4)}
                    </p>
                  </div>
                  <BalanceReadout publicKey={a.publicKey} />
                </li>
              ))}
              {discovered.slice(0, Math.max(0, 5 - tracked.length)).map((a) => (
                <li key={a.publicKey} className="flex items-center gap-3 border-b border-cloud/[0.06] px-5 py-3.5 last:border-0">
                  <AgentAvatar name="" publicKey={a.publicKey} className="h-9 w-9 rounded-lg text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px]">{truncateKey(a.publicKey, 5, 5)}</p>
                    <p className="text-[11px] text-cloud/40">
                      Seen on {a.taskCount} {a.taskCount === 1 ? "task" : "tasks"}
                    </p>
                  </div>
                  <BalanceReadout publicKey={a.publicKey} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function PipelineBar({ tasks, loading }: { tasks: Task[] | undefined; loading: boolean }) {
  const total = tasks?.length ?? 0;
  const counts = TASK_STATUSES.map((s) => ({ s, n: (tasks ?? []).filter((t) => t.status === s).length }));

  return (
    <section className="surface mt-4 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Task pipeline</h2>
        <span className="font-mono text-[11px] text-cloud/40">{total} total</span>
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-2 w-full" />
      ) : (
        <div className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-cloud/[0.06]">
          {total > 0 &&
            counts
              .filter((c) => c.n > 0)
              .map((c) => (
                <div
                  key={c.s}
                  className={cn("h-full transition-all duration-700", STATUS_META[c.s].dot)}
                  style={{ width: `${(c.n / total) * 100}%` }}
                />
              ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map((c) => (
          <Link
            key={c.s}
            href={`/tasks?status=${c.s}`}
            className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-cloud/[0.04] sm:flex-col sm:items-start sm:gap-1"
          >
            <span className="flex items-center gap-2 text-xs text-cloud/55 group-hover:text-sun">
              <span className={cn("h-2 w-2 rounded-full", STATUS_META[c.s].dot)} />
              {STATUS_META[c.s].label}
            </span>
            <span className="num font-display text-lg font-semibold">{loading ? "–" : c.n}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
