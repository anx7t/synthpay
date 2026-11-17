"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Plus, RotateCw, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskCard, TaskCardSkeleton } from "@/components/task-card";
import { STATUS_META } from "@/components/status-badge";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/lib/hooks";
import { getErrorMessage } from "@/lib/api";
import { TASK_STATUSES, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = TaskStatus | "all";

export default function TasksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Tasks"
        description="Move each task from open to paid. Actions call the SynthPay API and settle on Stellar."
        actions={
          <Button asChild>
            <Link href="/tasks/create">
              <Plus /> Post task
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<TaskGridSkeleton />}>
        <TaskBoard />
      </Suspense>
    </>
  );
}

function TaskBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("status");
  const filter: Filter = raw && (TASK_STATUSES as readonly string[]).includes(raw) ? (raw as TaskStatus) : "all";
  const [query, setQuery] = useState("");

  const { data: tasks, isLoading, isError, error, refetch, isFetching } = useTasks();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, open: 0, assigned: 0, submitted: 0, verified: 0, paid: 0 };
    for (const t of tasks ?? []) {
      c.all++;
      c[t.status]++;
    }
    return c;
  }, [tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tasks ?? [])
      .filter((t) => filter === "all" || t.status === filter)
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.agentPublicKey?.toLowerCase().includes(q) ||
          t.employerPublicKey?.toLowerCase().includes(q),
      )
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [tasks, filter, query]);

  function setFilter(next: Filter) {
    const sp = new URLSearchParams(params.toString());
    if (next === "all") sp.delete("status");
    else sp.set("status", next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filters: Filter[] = ["all", ...TASK_STATUSES];

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div role="tablist" aria-label="Filter by status" className="inline-flex gap-1 rounded-xl border border-cloud/10 bg-cloud/[0.03] p-1">
            {filters.map((f) => {
              const active = f === filter;
              return (
                <button
                  key={f}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-sun text-graphite" : "text-cloud/60 hover:bg-cloud/[0.05] hover:text-sun",
                  )}
                >
                  {f !== "all" && (
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-graphite" : STATUS_META[f].dot)} />
                  )}
                  {f === "all" ? "All" : STATUS_META[f].label}
                  <span className={cn("num font-mono text-[11px]", active ? "text-graphite/70" : "text-cloud/35")}>
                    {counts[f]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cloud/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, id or key"
              className="h-10 pl-9"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => refetch()} aria-label="Refresh tasks">
            <RotateCw className={cn(isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : isLoading ? (
        <TaskGridSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title={
            counts.all === 0
              ? "No tasks on the board"
              : query
                ? "No tasks match your search"
                : `No ${filter === "all" ? "" : STATUS_META[filter as TaskStatus].label.toLowerCase()} tasks`
          }
          description={
            counts.all === 0
              ? "Post a task with a reward and it will show up here for agents to claim."
              : "Try a different status or clear your search."
          }
          action={
            counts.all === 0 ? (
              <Button asChild size="sm">
                <Link href="/tasks/create">
                  <Plus /> Post a task
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </>
  );
}

function TaskGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </div>
  );
}
