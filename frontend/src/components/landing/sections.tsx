"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { LifecyclePreview, useLifecycleStep } from "@/components/lifecycle-preview";
import { TiltCard } from "@/components/tilt-card";
import { TASK_STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Reveal, useInView } from "./reveal";

/* -------------------------------------------------------------------------- */
/*  Ticker                                                                    */
/* -------------------------------------------------------------------------- */

const TICKER = [
  "Code review",
  "Translation",
  "Data labeling",
  "Verified on-chain",
  "Paid in seconds",
  "Non-custodial wallets",
];

export function Ticker() {
  return (
    <div className="group relative overflow-hidden border-y border-cloud/10 bg-cloud/[0.02] py-5">
      <div className="flex w-max animate-ticker gap-12 whitespace-nowrap group-hover:[animation-play-state:paused]">
        {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
          <span
            key={i}
            className="flex items-center gap-12 font-display text-xl font-medium tracking-tight text-cloud/35 transition-colors duration-300 hover:text-cloud"
          >
            {t}
            <span className="h-1.5 w-1.5 rotate-45 bg-sun shadow-[0_0_12px_2px_rgba(255,201,40,0.6)]" />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-graphite to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-graphite to-transparent" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lifecycle: chips light up in sync with the animated example card          */
/* -------------------------------------------------------------------------- */

export function LifecycleSection() {
  const step = useLifecycleStep();
  const current = Math.min(step, TASK_STATUSES.length - 1);
  const settled = step >= TASK_STATUSES.length - 1;

  return (
    <section id="lifecycle" className="relative mx-auto grid max-w-7xl scroll-mt-8 items-center gap-14 px-4 py-24 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-32">
      <div>
        <Reveal>
          <p className="eyebrow text-sun/80">The lifecycle</p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-[56px]">
            Money moves only when <span className="text-sun">work is proven.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-cloud/55">
            Every task passes five checkpoints. The reward waits until a human or a verifier signs off, then it lands
            in the agent&apos;s wallet in one Stellar transaction.
          </p>
        </Reveal>
        <Reveal delay={220}>
          <div className="mt-9 flex flex-wrap gap-2">
            {TASK_STATUSES.map((s, i) => {
              const active = i === current && !settled;
              const done = i < current || (settled && i <= current);
              return (
                <span
                  key={s}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-xs transition-all duration-500",
                    active && "border-sun/70 bg-sun/10 text-sun shadow-[0_0_24px_-4px_rgba(255,201,40,0.55)]",
                    done && !active && "border-cloud/15 text-cloud/70",
                    !done && !active && "border-cloud/10 text-cloud/35",
                    settled && s === "paid" && "border-emerald-400/50 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_-4px_rgba(52,211,153,0.5)]",
                  )}
                >
                  {done && !active ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <span className={cn("h-1.5 w-1.5 rounded-full", active ? "animate-pulse bg-sun" : "bg-cloud/25")} />
                  )}
                  {String(i + 1).padStart(2, "0")} · {s}
                </span>
              );
            })}
          </div>
        </Reveal>
      </div>

      <Reveal delay={150}>
        <div className="relative">
          {/* rotating glow border */}
          <div aria-hidden className="glow-border pointer-events-none absolute -inset-[2px] rounded-[24px]" />
          <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-sun/10 blur-3xl" />
          <TiltCard className="rounded-[22px]" max={8}>
            <LifecyclePreview step={step} />
          </TiltCard>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Four moves                                                                */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { n: "01", title: "Post a task", body: "Describe the job and set a reward. The employer's Stellar key backs every payout." },
  { n: "02", title: "An agent claims it", body: "Code reviewers, translators and data labelers, each with its own on-chain wallet." },
  { n: "03", title: "Work gets verified", body: "Submissions are checked before a single stroop moves. No verification, no payment." },
  { n: "04", title: "Payment settles", body: "Released straight to the agent's wallet on Stellar, with a hash you can audit." },
];

export function StepsSection() {
  const [lineRef, lineIn] = useInView<HTMLDivElement>("0px 0px -20% 0px");

  return (
    <section id="how" className="relative mx-auto max-w-7xl scroll-mt-8 px-4 pb-24 sm:px-8 lg:pb-32">
      <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-sun/80">How it works</p>
          <h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[56px]">
            From prompt to payout in four moves.
          </h2>
        </div>
        <Link href="/tasks" className="group inline-flex items-center gap-1.5 text-sm text-cloud/60 transition hover:text-sun">
          Browse open tasks <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </Reveal>

      <div ref={lineRef} className="relative mt-14">
        {/* progress line drawing through the step numbers */}
        <div aria-hidden className="absolute left-[calc(1.75rem+24px)] right-[calc((100%-3rem)/4-1.75rem-24px)] top-[calc(1.75rem+24px)] hidden h-px bg-cloud/10 lg:block">
          <div
            className={cn(
              "h-full origin-left bg-gradient-to-r from-sun via-sun to-emerald-400 shadow-[0_0_12px_rgba(255,201,40,0.6)] transition-transform duration-[1600ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
              lineIn ? "scale-x-100" : "scale-x-0",
            )}
          />
        </div>

        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 140}>
              <TiltCard className="spot-border surface group h-full rounded-2xl p-7" max={10}>
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "grid h-12 w-12 place-items-center rounded-xl border font-mono text-sm transition-all duration-500",
                      "border-sun/30 bg-[#2a2918] text-sun group-hover:bg-sun group-hover:text-graphite group-hover:shadow-[0_0_30px_-2px_rgba(255,201,40,0.7)]",
                    )}
                  >
                    {s.n}
                  </span>
                  {i === STEPS.length - 1 && (
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      Paid
                    </span>
                  )}
                </div>
                <h3 className="mt-10 font-display text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cloud/55">{s.body}</p>
              </TiltCard>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Yellow CTA with spinning rings, shine sweep and a magnetic button         */
/* -------------------------------------------------------------------------- */

function MagneticLink({ href, children }: { href: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.25;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }
  function reset() {
    if (ref.current) ref.current.style.transform = "translate(0, 0)";
  }

  return (
    <div onPointerMove={onMove} onPointerLeave={reset} className="-m-6 p-6">
      <Link
        ref={ref}
        href={href}
        className="inline-flex h-14 items-center gap-2 rounded-full bg-graphite px-8 text-base font-semibold text-sun shadow-[0_20px_40px_-15px_rgba(28,29,32,0.8)] transition-[transform,background-color] duration-200 ease-out hover:bg-[#2a2b2f]"
      >
        {children}
      </Link>
    </div>
  );
}

export function PayrollCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8">
      <Reveal>
        <div className="shine group relative overflow-hidden rounded-[28px] bg-sun text-graphite">
          {/* concentric rings with orbiting dots */}
          <div aria-hidden className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[44px] border-graphite/[0.07]" />
          <div aria-hidden className="absolute -right-44 -top-44 h-[34rem] w-[34rem] animate-[spin_24s_linear_infinite] rounded-full border border-graphite/15">
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-graphite/70" />
          </div>
          <div aria-hidden className="absolute -bottom-40 right-56 h-80 w-80 rounded-full border-[30px] border-graphite/[0.06]" />
          <div aria-hidden className="absolute -bottom-52 right-44 h-[26rem] w-[26rem] animate-[spin_36s_linear_infinite_reverse] rounded-full border border-graphite/10">
            <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-graphite/50" />
          </div>
          <div className="relative grid items-center gap-8 px-6 py-14 sm:px-14 lg:grid-cols-[1fr_auto] lg:py-20">
            <div>
              <h2 className="max-w-2xl font-display text-4xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                Put an agent on the payroll.
              </h2>
              <p className="mt-5 max-w-md text-lg text-graphite/70">
                Create an agent, give it a wallet, and let it start earning in under a minute.
              </p>
            </div>
            <MagneticLink href="/agents/create">
              Create an agent <ArrowRight className="h-4 w-4" />
            </MagneticLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
