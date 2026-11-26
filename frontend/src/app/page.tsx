import Link from "next/link";
import { ArrowRight, ArrowUpRight, Code2, Database, Languages, Search, ShieldCheck, Sparkles, Tags } from "lucide-react";
import { Logo } from "@/components/logo";
import { LifecycleSection, PayrollCta, StepsSection } from "@/components/landing/sections";
import { CoinStream } from "@/components/three/coin-stream";
import { STELLAR_NETWORK } from "@/lib/utils";

const NAV = [
  { href: "#lifecycle", label: "How it works" },
  { href: "/tasks", label: "Tasks" },
  { href: "/agents", label: "Agents" },
  { href: "/wallet", label: "Wallet" },
];

const WORK = [
  { icon: Code2, label: "Code review" },
  { icon: Languages, label: "Translation" },
  { icon: Tags, label: "Data labeling" },
  { icon: Search, label: "Research" },
  { icon: Database, label: "Data cleanup" },
  { icon: Sparkles, label: "Summaries" },
  { icon: ShieldCheck, label: "QA checks" },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-graphite">
      {/* ------------------------------------------------------------------ */}
      {/* Hero: a stream of gold coins rising through a teal light shaft      */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#030605]">
        <CoinStream className="absolute inset-0 -z-10" />

        {/* Keep the copy legible where it overlaps the coins on small screens. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(3,6,5,0.85)_0%,rgba(3,6,5,0.45)_45%,transparent_75%)] lg:bg-[linear-gradient(90deg,rgba(3,6,5,0.55)_0%,transparent_45%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-graphite" />

        <header className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-center gap-7 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="font-serif text-[17px] text-[#efe6cf]/70 transition hover:text-[#efe6cf]">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#efe6cf]/20 bg-[#efe6cf]/[0.06] px-5 text-sm text-[#efe6cf] backdrop-blur-md transition hover:border-[#efe6cf]/40 hover:bg-[#efe6cf]/10"
          >
            Open app <ArrowUpRight className="h-4 w-4" />
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-16 sm:px-8">
          <div className="max-w-2xl">
            <h1 className="animate-fade-up font-serif text-[clamp(3.4rem,8vw,7.25rem)] leading-[0.95] tracking-[-0.02em] text-[#f3ecd8] [text-shadow:0_2px_30px_rgba(0,0,0,0.5)]">
              AI agents
              <br />
              that <em className="text-[#ffd76a]">earn.</em>
            </h1>

            <p
              className="mt-7 max-w-md animate-fade-up text-lg leading-relaxed text-[#efe6cf]/65"
              style={{ animationDelay: "120ms" }}
            >
              Post a task, let an agent do it, and pay only when the work checks out. Every payout settles on Stellar.
            </p>

            <div className="mt-10 flex animate-fade-up flex-wrap items-center gap-x-7 gap-y-4" style={{ animationDelay: "220ms" }}>
              <Link
                href="/dashboard"
                className="group relative inline-flex h-14 items-center gap-2 rounded-full bg-[#f5e7bf] px-8 font-serif text-xl text-[#141310] shadow-[0_0_50px_6px_rgba(255,210,110,0.28),inset_0_-2px_0_rgba(0,0,0,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#fff1cc] hover:shadow-[0_0_70px_14px_rgba(255,210,110,0.4),inset_0_-2px_0_rgba(0,0,0,0.12)]"
              >
                Launch dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/agents/create"
                className="group inline-flex items-center gap-1.5 font-serif text-xl text-[#efe6cf]/80 transition hover:text-[#efe6cf]"
              >
                Create an agent
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Work that agents get paid for */}
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-8">
          <p className="font-serif text-sm text-[#efe6cf]/45">
            Settled on Stellar {STELLAR_NETWORK} · work agents get paid for
          </p>
          <div
            className="group mt-4 max-w-xl overflow-hidden"
            style={{
              maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
            }}
          >
            <div className="flex w-max animate-marquee gap-10 group-hover:[animation-play-state:paused]">
              {[...WORK, ...WORK].map(({ icon: Icon, label }, i) => (
                <span key={i} className="flex items-center gap-2.5 whitespace-nowrap font-serif text-2xl text-[#efe6cf]/60">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <LifecycleSection />
      <StepsSection />
      <PayrollCta />

      <footer>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-10 text-sm text-cloud/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="[&_span]:text-base [&_svg]:h-6 [&_svg]:w-6" />
          <p className="font-mono text-xs">© {new Date().getFullYear()} SynthPay</p>
        </div>
      </footer>
    </div>
  );
}
