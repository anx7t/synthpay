"use client";

import { useEffect, useState } from "react";
import { Bot, Building2, ShieldCheck } from "lucide-react";
import { TASK_STATUSES, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Cycles 0..5 (5 = holding on "paid"): shared so the progress rail stays in sync. */
export function useLifecycleStep(intervalMs = 1700) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (TASK_STATUSES.length + 1)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return step;
}

const CAPTION: Record<TaskStatus, string> = {
  open: "Reward locked in escrow",
  assigned: "An agent picks up the task",
  submitted: "Work goes to the verifier",
  verified: "Verifier approves the output",
  paid: "Paid to the agent on Stellar",
};

/** Where the coin sits on the track (0 = employer, 50 = verifier, 100 = agent). */
const COIN_AT: Record<TaskStatus, number> = { open: 0, assigned: 0, submitted: 0, verified: 50, paid: 100 };

const NODES = [
  { key: "employer", label: "Employer", icon: Building2, at: 0 },
  { key: "verifier", label: "Verifier", icon: ShieldCheck, at: 50 },
  { key: "agent", label: "Agent", icon: Bot, at: 100 },
] as const;

/** Which node is "live" at each step. */
const LIVE: Record<TaskStatus, (typeof NODES)[number]["key"]> = {
  open: "employer",
  assigned: "agent",
  submitted: "verifier",
  verified: "verifier",
  paid: "agent",
};

/**
 * A payout in motion, with no card around it: a gold coin travels from the
 * employer, through verification, to the agent, in step with the lifecycle.
 */
export function PayoutFlow({ step }: { step: number }) {
  const current = TASK_STATUSES[Math.min(step, TASK_STATUSES.length - 1)];
  const paid = current === "paid";
  const coinAt = COIN_AT[current];
  const live = LIVE[current];

  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* soft light behind the flow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-16 -z-10"
        style={{ background: "radial-gradient(50% 50% at 50% 55%, rgba(95,227,200,0.08), transparent 70%)" }}
      />

      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cloud/40">Example · Review PR #482</p>

      <p className="num mt-4 font-serif text-[72px] leading-none tracking-[-0.02em] text-cloud sm:text-[96px]">
        250 <span className="font-sans text-xl tracking-normal text-cloud/40 sm:text-2xl">XLM</span>
      </p>

      {/* Caption swaps with a soft fade on every step. */}
      <p key={current} className="mt-3 animate-fade-up text-lg text-cloud/60">
        {CAPTION[current]}
      </p>

      {/* The track */}
      <div className="relative mt-14 px-7" aria-hidden>
        <div className="relative h-14">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cloud/[0.12]" />
          <div
            className={cn(
              "absolute left-0 top-1/2 h-px -translate-y-1/2 transition-[width] duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
              paid ? "bg-gradient-to-r from-sun/60 to-teal" : "bg-gradient-to-r from-sun/40 to-sun",
            )}
            style={{ width: `${coinAt}%` }}
          />

          {NODES.map(({ key, icon: Icon, at }) => {
            const isLive = key === live;
            const tealNow = paid && key === "agent";
            return (
              <div
                key={key}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${at}%` }}
              >
                {tealNow && <span className="absolute inset-0 animate-ping rounded-full bg-teal/30" />}
                <div
                  className={cn(
                    "relative grid h-14 w-14 place-items-center rounded-full bg-graphite transition-all duration-500",
                    tealNow
                      ? "text-teal shadow-[0_0_0_1px_rgba(95,227,200,0.6),0_0_40px_-4px_rgba(95,227,200,0.6)]"
                      : isLive
                        ? "text-sun shadow-[0_0_0_1px_rgba(255,211,107,0.6),0_0_36px_-6px_rgba(255,211,107,0.55)]"
                        : "text-cloud/40 shadow-[0_0_0_1px_rgba(243,236,216,0.14)]",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
              </div>
            );
          })}

          {/* Proof of work: travels from the agent to the verifier on "submitted". */}
          <span
            className={cn(
              "absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cloud shadow-[0_0_14px_rgba(243,236,216,0.8)] transition-[left,opacity] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
              current === "submitted" ? "opacity-100" : "opacity-0",
            )}
            style={{ left: current === "submitted" ? "50%" : "100%" }}
          />

          {/* The coin */}
          <span
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-[calc(50%+46px)] transition-[left] duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{ left: `${coinAt}%` }}
          >
            <span className="block h-9 w-9 animate-bob rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff1c2,#f3c867_45%,#b9821f)] shadow-[0_0_24px_rgba(255,211,107,0.55),inset_0_-2px_3px_rgba(110,62,6,0.45)] [animation-duration:2.4s]">
              <svg viewBox="0 0 32 32" className="h-full w-full p-[7px]">
                <path
                  d="M21.5 10.5h-8a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6h-8"
                  fill="none"
                  stroke="rgba(110,62,6,0.75)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </div>

        <div className="relative mt-4 h-5">
          {NODES.map(({ key, label, at }) => (
            <span
              key={key}
              className={cn(
                "absolute -translate-x-1/2 whitespace-nowrap text-[13px] transition-colors duration-500",
                key === live ? (paid ? "text-teal" : "text-cloud") : "text-cloud/40",
              )}
              style={{ left: `${at}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-12 font-mono text-[11px] text-cloud/35 transition-colors duration-500">
        {paid ? (
          <span className="text-teal/80">tx 7f3a…c91e · settled on Stellar</span>
        ) : (
          "awaiting settlement"
        )}
      </p>
    </div>
  );
}
