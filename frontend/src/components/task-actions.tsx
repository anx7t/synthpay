"use client";

import { useState } from "react";
import { ArrowRight, BadgeCheck, Banknote, Eye, EyeOff, Loader2, Lock, Send, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAssignTask, useKnownAgents, useReleasePayment, useSubmitTask, useVerifyTask } from "@/lib/hooks";
import type { Task } from "@/lib/types";
import { cn, formatAmount, isStellarPublicKey, truncateKey } from "@/lib/utils";

const STELLAR_SECRET_RE = /^S[A-Z2-7]{55}$/;
const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

type DialogKind = "assign" | "submit" | "release" | null;

/** The single next step for a task, rendered as the card's primary action. */
export function TaskActions({ task, size = "default" }: { task: Task; size?: "sm" | "default" }) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const verify = useVerifyTask();
  const set = (k: DialogKind) => (open: boolean) => setDialog(open ? k : null);

  switch (task.status) {
    case "open":
      return (
        <>
          <Button size={size} onClick={() => setDialog("assign")}>
            <UserPlus /> Assign agent
          </Button>
          <AssignDialog task={task} open={dialog === "assign"} onOpenChange={set("assign")} />
        </>
      );
    case "assigned":
      return (
        <>
          <Button size={size} onClick={() => setDialog("submit")}>
            <Send /> Submit proof
          </Button>
          <SubmitDialog task={task} open={dialog === "submit"} onOpenChange={set("submit")} />
        </>
      );
    case "submitted":
      return (
        <Button size={size} disabled={verify.isPending} onClick={() => verify.mutate({ id: task.id })}>
          {verify.isPending ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
          {verify.isPending ? "Verifying…" : "Verify work"}
        </Button>
      );
    case "verified":
      return (
        <>
          <Button size={size} onClick={() => setDialog("release")}>
            <Banknote /> Release {formatAmount(task.reward)} XLM
          </Button>
          <ReleaseDialog task={task} open={dialog === "release"} onOpenChange={set("release")} />
        </>
      );
    case "paid":
      return null;
  }
}

/* ------------------------------- Assign --------------------------------- */

function AssignDialog({ task, open, onOpenChange }: { task: Task; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { all: agents } = useKnownAgents(undefined);
  // Tasks created with an agent stay "open" on the backend — start from that agent.
  const [key, setKey] = useState(task.agentPublicKey ?? "");
  const [touched, setTouched] = useState(false);
  const assign = useAssignTask();
  const valid = isStellarPublicKey(key);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    assign.mutate(
      { id: task.id, agentPublicKey: key.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setKey(task.agentPublicKey ?? "");
          setTouched(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="eyebrow text-sun/80">Step 1 of 4 · Assign</p>
          <DialogTitle>Who takes “{task.title}”?</DialogTitle>
          <DialogDescription>
            The agent&apos;s public key receives the {formatAmount(task.reward)} XLM reward once work is verified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          {agents.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Agents</Label>
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
                {agents.map((a) => {
                  const selected = a.publicKey === key;
                  return (
                    <button
                      type="button"
                      key={a.publicKey}
                      onClick={() => setKey(a.publicKey)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                        selected ? "border-sun/60 bg-sun/10" : "border-cloud/10 bg-cloud/[0.03] hover:border-cloud/25",
                      )}
                    >
                      <span className="min-w-0">
                        <span className={cn("block truncate text-sm font-medium", selected && "text-sun")}>{a.name}</span>
                        <span className="block text-xs text-cloud/45">{a.agentType}</span>
                      </span>
                      <code className="shrink-0 font-mono text-xs text-cloud/60">{truncateKey(a.publicKey, 4, 4)}</code>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`assign-${task.id}`}>Agent public key</Label>
            <Input
              id={`assign-${task.id}`}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="G…"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={touched && !valid}
              className="font-mono text-[13px]"
            />
            {touched && !valid && (
              <p className="text-xs text-red-300">Enter a valid Stellar public key (56 chars, starts with G).</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={assign.isPending}>
              {assign.isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              Assign task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Submit --------------------------------- */

function SubmitDialog({ task, open, onOpenChange }: { task: Task; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [proofUrl, setProofUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const submit = useSubmitTask();
  const valid = isHttpUrl(proofUrl);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    submit.mutate(
      { id: task.id, proofUrl: proofUrl.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setProofUrl("");
          setTouched(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="eyebrow text-sun/80">Step 2 of 4 · Submit</p>
          <DialogTitle>Submit proof for “{task.title}”</DialogTitle>
          <DialogDescription>
            Link to the delivered work: a pull request, a document, a dataset, or any URL a reviewer can open.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`proof-${task.id}`}>Proof URL</Label>
            <Input
              id={`proof-${task.id}`}
              type="url"
              inputMode="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="https://github.com/org/repo/pull/482"
              aria-invalid={touched && !valid}
              autoComplete="off"
            />
            {touched && !valid && <p className="text-xs text-red-300">Enter a full http(s) URL.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              Submit for review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Release -------------------------------- */

function ReleaseDialog({ task, open, onOpenChange }: { task: Task; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [secret, setSecret] = useState("");
  const [reveal, setReveal] = useState(false);
  const [touched, setTouched] = useState(false);
  const release = useReleasePayment();
  const valid = STELLAR_SECRET_RE.test(secret.trim());

  function close(o: boolean) {
    if (!o) {
      // never keep the secret around after the dialog closes
      setSecret("");
      setReveal(false);
      setTouched(false);
    }
    onOpenChange(o);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || !task.agentPublicKey) return;
    release.mutate({ task, senderSecret: secret.trim() }, { onSuccess: () => close(false) });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <p className="eyebrow text-sun/80">Step 4 of 4 · Pay</p>
          <DialogTitle>Release payment</DialogTitle>
          <DialogDescription>Sign a Stellar payment from the employer account to the agent.</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 rounded-xl border border-cloud/10 bg-graphite/60 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-cloud/45">Amount</dt>
            <dd className="num font-display text-lg font-semibold">
              {formatAmount(task.reward)} <span className="font-mono text-xs font-normal text-cloud/45">XLM</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-cloud/45">To agent</dt>
            <dd className="font-mono text-xs text-cloud/80">{truncateKey(task.agentPublicKey, 6, 6)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-cloud/45">From employer</dt>
            <dd className="font-mono text-xs text-cloud/80">{truncateKey(task.employerPublicKey, 6, 6)}</dd>
          </div>
        </dl>

        {!task.agentPublicKey ? (
          <p className="text-sm text-red-300">This task has no assigned agent, so there is no one to pay.</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`secret-${task.id}`}>Employer secret key</Label>
              <div className="relative">
                <Input
                  id={`secret-${task.id}`}
                  type={reveal ? "text" : "password"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="S…"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={touched && !valid}
                  className="pr-11 font-mono text-[13px]"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  aria-label={reveal ? "Hide secret" : "Show secret"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-cloud/50 hover:text-sun"
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {touched && !valid && (
                <p className="text-xs text-red-300">Enter a valid Stellar secret key (56 chars, starts with S).</p>
              )}
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-cloud/45">
                <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                Sent once to the SynthPay API to sign this payment. It is never saved in the browser.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={release.isPending}>
                {release.isPending ? <Loader2 className="animate-spin" /> : <Banknote />}
                {release.isPending ? "Releasing…" : `Pay ${formatAmount(task.reward)} XLM`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
