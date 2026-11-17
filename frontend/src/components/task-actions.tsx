"use client";

import { useState } from "react";
import { ArrowRight, BadgeCheck, Banknote, Loader2, Send, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useTrackedAgents } from "@/lib/agent-store";
import { useAssignTask, useReleasePayment, useSubmitTask, useVerifyTask } from "@/lib/hooks";
import type { Task } from "@/lib/types";
import { cn, formatAmount, isStellarPublicKey, truncateKey } from "@/lib/utils";

/** The single next step for a task, rendered as the card's primary action. */
export function TaskActions({ task, size = "default" }: { task: Task; size?: "sm" | "default" }) {
  const [dialog, setDialog] = useState<"assign" | "submit" | null>(null);
  const verify = useVerifyTask();
  const release = useReleasePayment();

  switch (task.status) {
    case "open":
      return (
        <>
          <Button size={size} onClick={() => setDialog("assign")}>
            <UserPlus /> Assign agent
          </Button>
          <AssignDialog task={task} open={dialog === "assign"} onOpenChange={(o) => setDialog(o ? "assign" : null)} />
        </>
      );
    case "assigned":
      return (
        <>
          <Button size={size} onClick={() => setDialog("submit")}>
            <Send /> Submit work
          </Button>
          <SubmitDialog task={task} open={dialog === "submit"} onOpenChange={(o) => setDialog(o ? "submit" : null)} />
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
        <Button
          size={size}
          disabled={release.isPending}
          onClick={() => release.mutate({ taskId: task.id, reward: task.reward })}
        >
          {release.isPending ? <Loader2 className="animate-spin" /> : <Banknote />}
          {release.isPending ? "Releasing…" : `Release ${formatAmount(task.reward)} XLM`}
        </Button>
      );
    case "paid":
      return null;
  }
}

function AssignDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const agents = useTrackedAgents();
  const [key, setKey] = useState("");
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
          setKey("");
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
              <Label>Your agents</Label>
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
                        selected
                          ? "border-sun/60 bg-sun/10"
                          : "border-cloud/10 bg-cloud/[0.03] hover:border-cloud/25",
                      )}
                    >
                      <span className="min-w-0">
                        <span className={cn("block truncate text-sm font-medium", selected && "text-sun")}>{a.name}</span>
                        <span className="block text-xs text-cloud/45">{a.type}</span>
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

function SubmitDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [work, setWork] = useState("");
  const submit = useSubmitTask();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!work.trim()) return;
    submit.mutate(
      { id: task.id, submission: work.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setWork("");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className="eyebrow text-sun/80">Step 2 of 4 · Submit</p>
          <DialogTitle>Submit work for “{task.title}”</DialogTitle>
          <DialogDescription>
            Paste the agent&apos;s output, a link to a PR, or a pointer to the delivered artifact.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`submit-${task.id}`}>Deliverable</Label>
            <Textarea
              id={`submit-${task.id}`}
              value={work}
              onChange={(e) => setWork(e.target.value)}
              placeholder="e.g. https://github.com/org/repo/pull/482 — 3 issues flagged, 2 fixes proposed"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending || !work.trim()}>
              {submit.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              Submit for review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
