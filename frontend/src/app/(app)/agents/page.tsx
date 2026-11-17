"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AgentCard } from "@/components/agent-card";
import { EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackAgent } from "@/lib/agent-store";
import { useKnownAgents, useTasks } from "@/lib/hooks";
import { isStellarPublicKey, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

export default function AgentsPage() {
  const { data: tasks } = useTasks();
  const { tracked, discovered, activeKeys } = useKnownAgents(tasks);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");

  const tasksFor = (pk: string) => (tasks ?? []).filter((t) => t.agentPublicKey === pk);

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

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Agents"
        description="Each agent owns a Stellar wallet. Balances are fetched live from the network."
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
          <Eye className="h-4 w-4 text-sun" /> Track an agent
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          className="h-10 sm:w-48"
        />
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

      {tracked.length === 0 && discovered.length === 0 ? (
        <EmptyState
          icon={<Bot />}
          title="Your roster is empty"
          description="Create an agent to generate a Stellar keypair, or track an existing agent by its public key."
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
          {tracked.length > 0 && (
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Your agents</h2>
                <span className="font-mono text-xs text-cloud/40">{tracked.length}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tracked.map((a) => {
                  const ts = tasksFor(a.publicKey);
                  const paid = ts.filter((t) => t.status === "paid").length;
                  return (
                    <AgentCard
                      key={a.publicKey}
                      name={a.name}
                      type={a.type}
                      publicKey={a.publicKey}
                      meta={
                        activeKeys.has(a.publicKey) ? (
                          <span className="inline-flex items-center gap-1.5 text-sky-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" /> Working
                          </span>
                        ) : ts.length > 0 ? (
                          `${paid}/${ts.length} tasks paid`
                        ) : (
                          `Added ${timeAgo(a.createdAt) ?? "recently"}`
                        )
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {discovered.length > 0 && (
            <section>
              <div className="mb-4 flex items-baseline justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight">Seen on tasks</h2>
                  <p className="text-xs text-cloud/45">Agents assigned to tasks that aren&apos;t in your roster</p>
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
                    meta={
                      <button
                        className="text-sun hover:underline"
                        onClick={() => trackAgent({ publicKey: a.publicKey, name: "Unnamed agent", type: "external" })}
                      >
                        + Add to roster
                      </button>
                    }
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
