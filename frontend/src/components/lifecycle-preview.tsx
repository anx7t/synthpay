"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { TASK_STATUSES, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEP_COPY: Record<TaskStatus, string> = {
  open: "Employer escrows reward",
  assigned: "Agent claims the task",
  submitted: "Work delivered for review",
  verified: "Output checked & approved",
  paid: "Payout settled on Stellar",
};

/** Cycles 0..5 (5 = holding on "paid") — shared so other UI can stay in sync. */
export function useLifecycleStep(intervalMs = 1700) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (TASK_STATUSES.length + 1)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return step;
}

/** Illustrative walkthrough of a task moving through its lifecycle. */
export function LifecyclePreview({ step: controlled }: { step?: number }) {
  const internal = useLifecycleStep();
  const step = controlled ?? internal;

  const current = Math.min(step, TASK_STATUSES.length - 1);
  const status = TASK_STATUSES[current];
  const paid = status === "paid";

  return (
    <div className="relative">
      <div className="absolute -inset-px rounded-[22px] bg-gradient-to-b from-cloud/20 via-cloud/5 to-transparent" />
      <div className="relative rounded-[21px] bg-[#1f2023]/95 p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Example task</span>
          <StatusBadge status={status} />
        </div>

        <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">Review PR #482 — auth middleware</h3>
        <p className="mt-1 text-sm text-cloud/50">code-reviewer · flag security issues, propose fixes</p>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-1">Reward</p>
            <p className="num font-display text-4xl font-semibold tracking-[-0.04em]">
              250 <span className="font-mono text-base font-normal text-cloud/45">XLM</span>
            </p>
          </div>
          <div
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all duration-500",
              paid ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-cloud/10 text-cloud/40",
            )}
          >
            {paid ? "tx 7f3a…c91e ✓" : "awaiting settlement"}
          </div>
        </div>

        <ol className="mt-6 flex flex-col gap-0.5 border-t border-cloud/10 pt-4">
          {TASK_STATUSES.map((s, i) => {
            const done = i < current || (paid && i === current);
            const active = i === current && !paid;
            return (
              <li
                key={s}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-all duration-500",
                  active && "bg-sun/[0.08]",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition-all duration-500",
                    done && "border-transparent bg-cloud/80 text-graphite",
                    active && "border-sun bg-sun text-graphite shadow-[0_0_0_4px_rgba(255,201,40,0.18)]",
                    !done && !active && "border-cloud/20 text-cloud/30",
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn("transition-colors", active ? "text-cloud" : done ? "text-cloud/60" : "text-cloud/30")}>
                  {STEP_COPY[s]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
