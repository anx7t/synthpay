"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, Download, Eye, EyeOff, Loader2, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AgentAvatar, agentTypeLabel } from "@/components/agent-card";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trackAgent } from "@/lib/agent-store";
import { useCreateAgent } from "@/lib/hooks";
import { AGENT_TYPES, type AgentType, type CreatedAgent } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CreateAgentPage() {
  const [result, setResult] = useState<CreatedAgent | null>(null);

  return (
    <>
      <Link href="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm text-cloud/50 transition hover:text-sun">
        <ArrowLeft className="h-4 w-4" /> Agents
      </Link>
      <PageHeader
        eyebrow={result ? "Agent created" : "New agent"}
        title={result ? `${result.name} is live` : "Spawn an agent"}
        description={
          result
            ? "A fresh Stellar keypair was generated for this agent. Store the secret before leaving this page."
            : "Every agent gets its own Stellar wallet so it can be paid directly for verified work."
        }
      />
      {result ? <ResultCard agent={result} onReset={() => setResult(null)} /> : <CreateForm onCreated={setResult} />}
    </>
  );
}

function CreateForm({ onCreated }: { onCreated: (a: CreatedAgent) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AgentType | "">("");
  const [touched, setTouched] = useState(false);
  const create = useCreateAgent();
  const valid = name.trim().length > 0 && !!type;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    create.mutate(
      { name: name.trim(), agentType: type as AgentType },
      {
        onSuccess: (agent) => {
          trackAgent({ publicKey: agent.publicKey, name: agent.name, type: agent.agentType });
          onCreated(agent);
        },
      },
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <form onSubmit={onSubmit} noValidate className="surface flex flex-col gap-6 rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Agent name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Atlas Reviewer"
            aria-invalid={touched && !name.trim()}
            maxLength={60}
            autoFocus
          />
          {touched && !name.trim() && <p className="text-xs text-red-300">Name your agent</p>}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Agent type</Label>
          <Select value={type} onValueChange={(v) => setType(v as AgentType)}>
            <SelectTrigger id="type" aria-invalid={touched && !type}>
              <SelectValue placeholder="Choose a specialty" />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {touched && !type && <p className="text-xs text-red-300">Pick what this agent does</p>}
        </div>

        {/* Visual type picker mirrors the dropdown for faster scanning */}
        <div className="grid gap-2 sm:grid-cols-3">
          {AGENT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                "rounded-xl border p-3.5 text-left transition",
                type === t.value
                  ? "border-sun/60 bg-sun/[0.08]"
                  : "border-cloud/10 bg-cloud/[0.02] hover:border-cloud/25",
              )}
            >
              <p className={cn("font-mono text-[11px]", type === t.value ? "text-sun" : "text-cloud/40")}>{t.value}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-cloud/65">{t.blurb}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-cloud/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-cloud/40">
            Calls <code className="font-mono text-cloud/60">POST /api/agents/create</code>
          </p>
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {create.isPending ? "Generating keypair…" : "Create agent"}
          </Button>
        </div>
      </form>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <p className="eyebrow mb-3">What happens</p>
        <ol className="surface flex flex-col gap-4 rounded-2xl p-5 text-sm">
          {[
            ["Keypair generated", "A new Stellar account is created for the agent."],
            ["Secret shown once", "You get the secret key a single time. SynthPay won't show it again."],
            ["Ready to earn", "Assign it tasks. Verified work pays straight into its wallet."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-sun/40 font-mono text-[11px] text-sun">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-cloud/50">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function ResultCard({ agent, onReset }: { agent: CreatedAgent; onReset: () => void }) {
  const [reveal, setReveal] = useState(false);

  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { name: agent.name, agentType: agent.agentType, publicKey: agent.publicKey, secretKey: agent.secretKey },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synthpay-agent-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      {agent.secretKey && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-sun/40 bg-sun/[0.08] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-sun" />
          <div>
            <p className="font-semibold text-sun">Save the secret key now</p>
            <p className="mt-0.5 text-sm text-cloud/70">
              This is the only time it will be displayed. Anyone with it controls the agent&apos;s funds — and if you lose
              it, they&apos;re gone.
            </p>
          </div>
        </div>
      )}

      <div className="surface overflow-hidden rounded-2xl">
        <div className="flex items-center gap-4 border-b border-cloud/10 p-5 sm:p-6">
          <AgentAvatar name={agent.name} publicKey={agent.publicKey} className="h-14 w-14 text-lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold tracking-tight">{agent.name}</h2>
            <p className="text-sm text-cloud/50">{agentTypeLabel(agent.agentType)}</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            Active
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <KeyBlock label="Public key" value={agent.publicKey} note="Share freely — this is the agent's payout address." />
          {agent.secretKey ? (
            <KeyBlock
              label="Secret key"
              value={agent.secretKey}
              secret
              revealed={reveal}
              onToggle={() => setReveal((r) => !r)}
              note="Never share this. Store it in a password manager or secrets vault."
            />
          ) : (
            <p className="rounded-lg border border-cloud/10 bg-graphite/60 p-3 text-sm text-cloud/55">
              The API did not return a secret key for this agent — it may be held server-side.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-cloud/10 bg-cloud/[0.02] p-5 sm:flex-row sm:items-center sm:p-6">
          {agent.secretKey && (
            <Button variant="outline" onClick={download}>
              <Download /> Download keypair
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" onClick={onReset} className="flex-1 sm:flex-none">
              <Plus /> Another
            </Button>
            <Button asChild className="flex-1 sm:flex-none">
              <Link href="/agents">
                View agents <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyBlock({
  label,
  value,
  note,
  secret = false,
  revealed = true,
  onToggle,
}: {
  label: string;
  value: string;
  note: string;
  secret?: boolean;
  revealed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className={cn("eyebrow", secret && "text-sun/80")}>{label}</p>
        <div className="flex items-center gap-1">
          {secret && (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-cloud/55 transition hover:bg-sun/10 hover:text-sun"
            >
              {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {revealed ? "Hide" : "Reveal"}
            </button>
          )}
          <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} showLabel />
        </div>
      </div>
      <code
        className={cn(
          "block break-all rounded-lg border px-3.5 py-3 font-mono text-[13px] leading-relaxed",
          secret ? "border-sun/25 bg-sun/[0.04] text-sun" : "border-cloud/10 bg-graphite/60 text-cloud/85",
          secret && !revealed && "select-none blur-[5px]",
        )}
      >
        {value}
      </code>
      <p className="mt-1.5 text-xs text-cloud/40">{note}</p>
    </div>
  );
}
