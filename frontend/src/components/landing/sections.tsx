"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LifecyclePreview, useLifecycleStep } from "@/components/lifecycle-preview";
import { TiltCard } from "@/components/tilt-card";
import { TASK_STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Reveal, useInView } from "./reveal";

/* -------------------------------------------------------------------------- */
/*  Lifecycle: a progress rail in sync with the animated example card        */
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
          <h2 className="mt-4 font-serif text-5xl leading-[0.98] tracking-[-0.01em] sm:text-6xl lg:text-[72px]">
            Money moves only when <em className="text-sun">work is proven.</em>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-cloud/55">
            Every task passes five checkpoints. The reward waits until a human or a verifier signs off, then it lands
            in the agent&apos;s wallet in one Stellar transaction.
          </p>
        </Reveal>
        <Reveal delay={220}>
          {/* Progress rail: a thin line that fills as the example task advances. */}
          <div className="mt-12 max-w-lg" role="list" aria-label="Task lifecycle">
            <div className="relative h-px bg-cloud/[0.12]">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-sun/70 to-sun transition-[width] duration-700 ease-out"
                style={{ width: `${(current / (TASK_STATUSES.length - 1)) * 100}%` }}
              />
            </div>
            <div className="relative h-12">
              {TASK_STATUSES.map((s, i) => {
                const last = TASK_STATUSES.length - 1;
                const reached = i <= current;
                const active = i === current;
                const align = i === 0 ? "items-start" : i === last ? "items-end -translate-x-full" : "items-center -translate-x-1/2";
                return (
                  <div
                    key={s}
                    role="listitem"
                    aria-current={active ? "step" : undefined}
                    className={cn("absolute top-0 flex flex-col pt-5", align)}
                    style={{ left: `${(i / last) * 100}%` }}
                  >
                    <span
                      className={cn(
                        "absolute top-0 h-[7px] w-[7px] -translate-y-1/2 rounded-full transition-colors duration-500",
                        i === 0 ? "left-0" : i === last ? "right-0" : "left-1/2 -translate-x-1/2",
                        reached ? (settled && s === "paid" ? "bg-teal" : "bg-sun") : "bg-cloud/25",
                      )}
                    />
                    <span className="font-mono text-[10px] text-cloud/35">{String(i + 1).padStart(2, "0")}</span>
                    <span
                      className={cn(
                        "mt-1 text-[13px] capitalize transition-colors duration-500",
                        active ? (settled ? "text-teal" : "text-cloud") : reached ? "text-cloud/60" : "text-cloud/30",
                      )}
                    >
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={150}>
        <div className="relative">
          <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-teal/[0.07] blur-3xl" />
          <LifecyclePreview step={step} />
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
          <h2 className="mt-4 max-w-xl font-serif text-5xl leading-[0.98] tracking-[-0.01em] sm:text-6xl lg:text-[72px]">
            From prompt to payout in <em className="text-sun">four moves.</em>
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
              "h-full origin-left bg-gradient-to-r from-sun via-sun to-teal shadow-[0_0_12px_rgba(255,211,107,0.6)] transition-transform duration-[1600ms] ease-[cubic-bezier(0.65,0,0.35,1)]",
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
                      "border-sun/30 bg-sun/10 text-sun group-hover:bg-sun group-hover:text-graphite group-hover:shadow-[0_0_30px_-2px_rgba(255,211,107,0.7)]",
                    )}
                  >
                    {s.n}
                  </span>
                  {i === STEPS.length - 1 && (
                    <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal">
                      Paid
                    </span>
                  )}
                </div>
                <h3 className="mt-10 font-serif text-[28px] leading-tight">
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
        className="glow-pill inline-flex h-14 items-center gap-2 rounded-full px-8 font-serif text-xl transition-[transform,background-color,box-shadow] duration-200 ease-out"
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
        <div className="shine group relative overflow-hidden rounded-[28px] border border-cloud/10 bg-[#050a09]">
          {/* teal light shaft, like the hero */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(45% 90% at 85% 0%, rgba(95,227,200,0.28) 0%, rgba(20,90,80,0.18) 45%, transparent 75%), radial-gradient(30% 50% at 75% 15%, rgba(200,235,140,0.12) 0%, transparent 70%)",
            }}
          />
          <div aria-hidden className="starfield absolute inset-0 opacity-70" />
          {/* gold coins of light drifting up through the beam */}
          {COINS.map((c, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute bottom-[-20%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff1c2,#f3c867_45%,#b9821f)] opacity-0 shadow-[0_0_24px_rgba(255,211,107,0.45)] animate-[coin-rise_linear_infinite] motion-reduce:hidden"
              style={{
                left: c.left,
                width: c.size,
                height: c.size * 0.62,
                animationDuration: `${c.dur}s`,
                animationDelay: `${c.delay}s`,
              }}
            />
          ))}
          <div className="relative grid items-center gap-8 px-6 py-14 sm:px-14 lg:grid-cols-[1fr_auto] lg:py-20">
            <div>
              <h2 className="max-w-2xl font-serif text-5xl leading-[0.95] tracking-[-0.01em] text-cloud sm:text-6xl lg:text-[80px]">
                Put an agent on the <em className="text-sun">payroll.</em>
              </h2>
              <p className="mt-5 max-w-md text-lg text-cloud/60">
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

const COINS = [
  { left: "62%", size: 34, dur: 9, delay: 0 },
  { left: "74%", size: 22, dur: 11, delay: 2.5 },
  { left: "86%", size: 40, dur: 10, delay: 5 },
  { left: "93%", size: 18, dur: 8, delay: 1.2 },
  { left: "80%", size: 28, dur: 12, delay: 7 },
  { left: "68%", size: 16, dur: 9.5, delay: 4 },
];
