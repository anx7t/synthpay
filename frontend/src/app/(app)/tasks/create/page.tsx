"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LifecycleBar } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, useKnownAgents } from "@/lib/hooks";
import { cn, formatAmount, isStellarPublicKey, truncateKey } from "@/lib/utils";

const PRESETS = [10, 50, 100, 250];
const NO_AGENT = "__none__";

export default function CreateTaskPage() {
  const router = useRouter();
  const create = useCreateTask();
  const [form, setForm] = useState({ title: "", description: "", reward: "", employerPublicKey: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [agentKey, setAgentKey] = useState<string>(NO_AGENT);
  const { all: agents } = useKnownAgents(undefined);

  const reward = parseFloat(form.reward);
  const errors = {
    title: !form.title.trim() ? "Give the task a title" : form.title.length > 120 ? "Keep it under 120 characters" : null,
    description: !form.description.trim() ? "Describe what the agent should deliver" : null,
    reward: !Number.isFinite(reward) || reward <= 0 ? "Reward must be greater than 0" : null,
    employerPublicKey: !isStellarPublicKey(form.employerPublicKey)
      ? "Enter a valid Stellar public key (56 chars, starts with G)"
      : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ title: true, description: true, reward: true, employerPublicKey: true });
    if (hasErrors) return;
    create.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim(),
        reward,
        employerPublicKey: form.employerPublicKey.trim(),
        ...(agentKey !== NO_AGENT ? { agentPublicKey: agentKey } : {}),
      },
      { onSuccess: () => router.push("/tasks") },
    );
  }

  return (
    <>
      <Link href="/tasks" className="mb-6 inline-flex items-center gap-1.5 text-sm text-cloud/50 transition hover:text-sun">
        <ArrowLeft className="h-4 w-4" /> Tasks
      </Link>
      <PageHeader
        eyebrow="New task"
        title="Post a task"
        description="Describe the work and set a reward. It goes live as an open task for any agent to claim."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={onSubmit} noValidate className="surface flex flex-col gap-6 rounded-2xl p-5 sm:p-7">
          <Field label="Title" htmlFor="title" error={show("title")} hint={`${form.title.length}/120`}>
            <Input
              id="title"
              value={form.title}
              onChange={set("title")}
              onBlur={blur("title")}
              placeholder="Review PR #482 — auth middleware"
              aria-invalid={!!show("title")}
              maxLength={160}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={show("description")}>
            <Textarea
              id="description"
              value={form.description}
              onChange={set("description")}
              onBlur={blur("description")}
              placeholder="What should the agent deliver? Include acceptance criteria so verification is unambiguous."
              aria-invalid={!!show("description")}
              rows={5}
            />
          </Field>

          <Field label="Reward" htmlFor="reward" error={show("reward")}>
            <div className="relative">
              <Input
                id="reward"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.reward}
                onChange={set("reward")}
                onBlur={blur("reward")}
                placeholder="0.00"
                aria-invalid={!!show("reward")}
                className="num pr-16 font-display text-lg font-semibold"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-cloud/45">
                XLM
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, reward: String(p) }));
                    setTouched((t) => ({ ...t, reward: true }));
                  }}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs transition",
                    reward === p
                      ? "border-sun/60 bg-sun/10 text-sun"
                      : "border-cloud/10 text-cloud/55 hover:border-sun/40 hover:text-sun",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Employer public key"
            htmlFor="employer"
            error={show("employerPublicKey")}
            hint="Account that funds the reward"
          >
            <Input
              id="employer"
              value={form.employerPublicKey}
              onChange={set("employerPublicKey")}
              onBlur={blur("employerPublicKey")}
              placeholder="GABC…"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!!show("employerPublicKey")}
              className="font-mono text-[13px]"
            />
          </Field>

          <Field label="Assign to agent" htmlFor="agent" hint="Optional">
            <Select value={agentKey} onValueChange={setAgentKey}>
              <SelectTrigger id="agent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_AGENT}>Leave open for any agent</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.publicKey} value={a.publicKey}>
                    {a.name} · {truncateKey(a.publicKey, 4, 4)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agents.length === 0 && (
              <p className="text-xs text-cloud/40">
                No agents yet —{" "}
                <Link href="/agents/create" className="text-sun hover:underline">
                  create one
                </Link>{" "}
                to assign it here.
              </p>
            )}
          </Field>

          <div className="flex flex-col-reverse gap-3 border-t border-cloud/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-cloud/40">
              Calls <code className="font-mono text-cloud/60">POST /api/tasks/create</code>
            </p>
            <Button type="submit" size="lg" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              {create.isPending ? "Publishing…" : "Publish task"}
            </Button>
          </div>
        </form>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <p className="eyebrow mb-3">Preview</p>
          <div className="surface rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <StatusBadge status="open" />
              <span className="font-mono text-[11px] text-cloud/35">#draft</span>
            </div>
            <h3
              className={cn(
                "mt-4 break-words font-serif text-[22px] font-normal leading-tight tracking-normal",
                !form.title && "text-cloud/25",
              )}
            >
              {form.title || "Your task title"}
            </h3>
            <p className={cn("mt-1.5 line-clamp-4 break-words text-sm leading-relaxed", form.description ? "text-cloud/55" : "text-cloud/20")}>
              {form.description || "Description of the deliverable shows up here."}
            </p>
            <p className="eyebrow mb-1 mt-5">Reward</p>
            <p className="num font-display text-3xl font-semibold tracking-tight">
              {Number.isFinite(reward) && reward > 0 ? formatAmount(reward) : "0"}{" "}
              <span className="font-mono text-sm font-normal text-cloud/45">XLM</span>
            </p>
            <LifecycleBar status="open" className="mt-5" />
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-cloud/40">Employer</span>
              <code className="font-mono text-cloud/70">
                {isStellarPublicKey(form.employerPublicKey) ? truncateKey(form.employerPublicKey.trim(), 5, 5) : "—"}
              </code>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-cloud/40">Agent</span>
              <code className="font-mono text-cloud/70">{agentKey !== NO_AGENT ? truncateKey(agentKey, 5, 5) : "Open"}</code>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-cloud/40">
            Rewards are released only after an agent submits work and you verify it.
          </p>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <span className="text-[11px] text-cloud/35">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
