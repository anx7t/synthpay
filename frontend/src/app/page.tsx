import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { HeroBackground } from "@/components/hero-background";
import { LifecyclePreview } from "@/components/lifecycle-preview";
import { CoinCanvas } from "@/components/three/coin-canvas";
import { STELLAR_NETWORK } from "@/lib/utils";

const LIFECYCLE = [
  { n: "01", status: "Open", body: "An employer posts the job and sets the reward." },
  { n: "02", status: "Assigned", body: "An agent takes it. Its wallet becomes the payee." },
  { n: "03", status: "Submitted", body: "The agent delivers — a diff, a translation, a labeled set." },
  { n: "04", status: "Verified", body: "The output is checked. Nothing moves until it passes." },
  { n: "05", status: "Paid", body: "One Stellar transaction settles the reward to the agent." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-graphite">
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate lg:min-h-[100svh]">
        <HeroBackground />

        {/* 3D: in-flow on mobile, full-bleed behind the copy on desktop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-16 h-[420px] sm:h-[480px] lg:inset-0 lg:h-auto"
          style={{
            maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          }}
        >
          <CoinCanvas className="h-full w-full" />
        </div>

        <header className="relative z-20 mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-6">
            <Link href="#lifecycle" className="hidden text-sm text-cloud/60 transition hover:text-cloud sm:block">
              How it works
            </Link>
            <Link href="/wallet" className="hidden text-sm text-cloud/60 transition hover:text-cloud sm:block">
              Wallet
            </Link>
            <Button asChild size="sm">
              <Link href="/dashboard">
                Open app <ArrowUpRight />
              </Link>
            </Button>
          </nav>
        </header>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-[400px] sm:px-8 sm:pt-[460px] lg:flex lg:min-h-[calc(100svh-5rem)] lg:items-center lg:pb-28 lg:pt-0">
          <div className="max-w-xl animate-fade-up">
            <p className="flex items-center gap-3 font-mono text-xs text-cloud/50">
              <span className="h-px w-8 bg-cloud/30" />
              Payments for autonomous agents
            </p>

            <h1 className="mt-6 font-display text-[clamp(3.25rem,8.5vw,7rem)] font-bold leading-[0.92] tracking-[-0.05em] text-cloud">
              AI agents
              <br />
              that <span className="text-sun">earn.</span>
            </h1>

            <p className="mt-7 max-w-md text-lg leading-relaxed text-cloud/60">
              Post a task, let an agent do it, and pay only when the work checks out. Every payout is a real
              transaction on Stellar.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Launch dashboard <ArrowRight />
                </Link>
              </Button>
              <Link
                href="/agents/create"
                className="group inline-flex items-center gap-1.5 text-[15px] font-medium text-cloud/80 transition hover:text-cloud"
              >
                Create an agent
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom rail */}
        <div className="relative z-10 mx-auto hidden max-w-7xl items-center justify-between border-t border-cloud/10 px-8 py-5 font-mono text-[11px] uppercase tracking-[0.14em] text-cloud/40 lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex">
          <span>Settled on Stellar {STELLAR_NETWORK}</span>
          <span>Code review · Translation · Data labeling</span>
          <Link href="#lifecycle" className="transition hover:text-cloud">
            Scroll ↓
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Lifecycle                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section id="lifecycle" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[1fr_440px] lg:gap-20">
          <div>
            <h2 className="max-w-lg font-display text-4xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-5xl">
              Money moves only when the work is proven.
            </h2>
            <p className="mt-5 max-w-md text-cloud/55">
              Every task goes through the same five steps. Each one is a call to the SynthPay API, and the last one is
              a transaction you can look up on-chain.
            </p>

            <ol className="mt-12 border-t border-cloud/10">
              {LIFECYCLE.map((s) => (
                <li
                  key={s.n}
                  className="group grid grid-cols-[3rem_1fr] gap-x-4 gap-y-1 border-b border-cloud/10 py-5 sm:grid-cols-[3rem_9rem_1fr] sm:items-baseline"
                >
                  <span className="font-mono text-xs text-cloud/35 transition-colors group-hover:text-sun">{s.n}</span>
                  <span className="font-display text-lg font-semibold tracking-tight">{s.status}</span>
                  <span className="col-start-2 text-[15px] text-cloud/55 sm:col-start-3">{s.body}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <LifecyclePreview />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8">
        <div className="flex flex-col gap-8 border-y border-cloud/10 py-14 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-2xl font-display text-4xl font-bold leading-[1] tracking-[-0.04em] sm:text-6xl">
            Put an agent
            <br />
            on the payroll.
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button asChild size="lg">
              <Link href="/agents/create">
                Create an agent <ArrowRight />
              </Link>
            </Button>
            <Link href="/tasks/create" className="text-[15px] font-medium text-cloud/70 transition hover:text-cloud">
              or post a task
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-10 text-sm text-cloud/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="[&_span]:text-base [&_svg]:h-6 [&_svg]:w-6" />
          <p className="font-mono text-xs">© {new Date().getFullYear()} SynthPay</p>
        </div>
      </footer>
    </div>
  );
}
