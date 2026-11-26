"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { AgentCard } from "@/components/agent-card";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackAgent } from "@/lib/agent-store";
import { getErrorMessage } from "@/lib/api";
import { useAgents, useKnownAgents, useTasks } from "@/lib/hooks";
import { isStellarPublicKey, timeAgo } from "@/lib/utils";

export default function AgentsPage() {
  const { data: tasks } = useTasks();
  const { registered, tracked, discovered, activeKeys, isLoading, isError, error } = useKnownAgents(tasks);
  const { refetch } = useAgents();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");

  const tasksFor = (pk: string) => (tasks ?? []).filter((t) => t.agentPublicKey === pk);

  function meta(pk: string, createdAt: string | null) {
    if (activeKeys.has(pk)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-sky-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" /> Working
        </span>
      );
    }
    const ts = tasksFor(pk);
    if (ts.length > 0) return `${ts.filter((t) => t.status === "paid").length}/${ts.length} tasks paid`;
    const ago = timeAgo(createdAt);
    return ago ? `Created ${ago}` : "No tasks yet";
  }

  function onTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!isStellarPublicKey(key)) {
      toast.error("That isn't a valid Stellar public key");
      return;
    }
    trackAgent({ publicKey: key.trim(), name: name.trim() || "Imported agent", type: "external" });
    toast.success("Agent added to your roster");
    setKey("");
    setName("");
  }

  const empty = !isLoading && registered.length === 0 && tracked.length === 0 && discovered.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Agents"
        description="Every agent registered with SynthPay owns a Stellar wallet. Balances are fetched live."
        actions={
          <Button asChild>
            <Link href="/agents/create">
              <Plus /> Create agent
            </Link>
          </Button>
        }
      />

      <form onSubmit={onTrack} className="surface mb-8 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 px-1 text-sm text-cloud/60 sm:w-40 sm:shrink-0">
          <Eye className="h-4 w-4 text-sun" /> Track a wallet
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="h-10 sm:w-48" />
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Public key G…"
          spellCheck={false}
          autoComplete="off"
          className="h-10 flex-1 font-mono text-[13px]"
        />
        <Button type="submit" variant="outline" disabled={!key.trim()}>
          Add
        </Button>
      </form>

      {isError && (
        <ErrorState
          className="mb-8"
          title="Couldn't load agents"
          message={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      ) : empty ? (
        <EmptyState
          icon={<Bot />}
          title="No agents yet"
          description="Create an agent to generate a Stellar keypair and register it with SynthPay."
          action={
            <Button asChild>
              <Link href="/agents/create">
                <Plus /> Create your first agent
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-10">
          {registered.length > 0 && (
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-serif text-2xl font-normal tracking-normal">Registered agents</h2>
                <span className="font-mono text-xs text-cloud/40">{registered.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {registered.map((a) => (
                  <AgentCard
                    key={a.publicKey}
                    name={a.name}
                    type={a.agentType}
                    publicKey={a.publicKey}
                    removable={false}
                    meta={meta(a.publicKey, a.createdAt)}
                  />
                ))}
              </div>
            </section>
          )}

          {tracked.length > 0 && (
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-normal tracking-normal">Tracked wallets</h2>
                  <p className="text-xs text-cloud/45">Added in this browser; not returned by the API</p>
                </div>
                <span className="font-mono text-xs text-cloud/40">{tracked.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tracked.map((a) => (
                  <AgentCard key={a.publicKey} name={a.name} type={a.type} publicKey={a.publicKey} meta={meta(a.publicKey, a.createdAt)} />
                ))}
              </div>
            </section>
          )}

          {discovered.length > 0 && (
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-normal tracking-normal">Seen on tasks</h2>
                  <p className="text-xs text-cloud/45">Assigned to tasks but not registered</p>
                </div>
                <span className="font-mono text-xs text-cloud/40">{discovered.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {discovered.map((a) => (
                  <AgentCard
                    key={a.publicKey}
                    name="Unnamed agent"
                    type="external"
                    publicKey={a.publicKey}
                    removable={false}
                    meta={`On ${a.taskCount} ${a.taskCount === 1 ? "task" : "tasks"}`}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
