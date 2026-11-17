"use client";

import { useRef, useState } from "react";
import { ArrowRight, ExternalLink, Loader2, RotateCw, Search, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KeyDisplay } from "@/components/key-display";
import { ErrorState } from "@/components/states";
import { CoinCanvas } from "@/components/three/coin-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrackedAgents } from "@/lib/agent-store";
import { useWalletBalance } from "@/lib/hooks";
import { getErrorMessage } from "@/lib/api";
import { cn, explorerAccountUrl, formatAmount, isStellarPublicKey, truncateKey } from "@/lib/utils";

export default function WalletPage() {
  const agents = useTrackedAgents();
  const [input, setInput] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading, isFetching, isError, error, refetch, dataUpdatedAt } = useWalletBalance(lookup);

  const valid = isStellarPublicKey(input);
  const empty = !input.trim();
  const inputError = !touched
    ? null
    : empty
      ? "Enter a public key to look up"
      : !valid
        ? "That doesn't look like a Stellar public key (56 characters, starts with G)."
        : null;

  function check(pk: string) {
    setInput(pk);
    setTouched(true);
    if (!isStellarPublicKey(pk)) {
      inputRef.current?.focus();
      return;
    }
    if (pk.trim() === lookup) refetch();
    setLookup(pk.trim());
  }

  const xlm = data?.find((b) => b.asset === "XLM");
  const others = (data ?? []).filter((b) => b !== xlm);

  return (
    <>
      <PageHeader
        eyebrow="Wallet"
        title="Check any balance"
        description="Look up a Stellar account by public key — agents, employers, anyone."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(input);
        }}
        className="surface rounded-2xl p-2"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cloud/35" />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a public key — G…"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={!!inputError}
              aria-describedby={inputError ? "wallet-key-error" : undefined}
              aria-label="Stellar public key"
              className="h-14 border-transparent bg-transparent pl-11 font-mono text-sm hover:border-transparent focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0"
            />
          </div>
          <Button type="submit" size="xl" disabled={isFetching && lookup === input.trim()}>
            {isFetching && lookup === input.trim() ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            Check balance
          </Button>
        </div>
      </form>
      {inputError && (
        <p id="wallet-key-error" role="alert" className="mt-2 px-1 text-xs text-red-300">
          {inputError}
        </p>
      )}

      {agents.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-cloud/40">Your agents:</span>
          {agents.slice(0, 6).map((a) => (
            <button
              key={a.publicKey}
              onClick={() => check(a.publicKey)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                lookup === a.publicKey
                  ? "border-sun/60 bg-sun/10 text-sun"
                  : "border-cloud/10 text-cloud/60 hover:border-sun/40 hover:text-sun",
              )}
            >
              {a.name} <span className="ml-1 font-mono text-cloud/40">{truncateKey(a.publicKey, 3, 3)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        {!lookup ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-cloud/15 px-6 py-20 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sun/10 text-sun">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="mt-5 font-display text-lg font-semibold">No account selected</p>
            <p className="mt-1.5 max-w-sm text-sm text-cloud/50">
              Enter a public key above to fetch its balances from <code className="font-mono">/api/payments/balance</code>.
            </p>
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't fetch balance" message={getErrorMessage(error)} onRetry={() => refetch()} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Primary balance */}
            <section className="relative overflow-hidden rounded-3xl border border-sun/25 bg-gradient-to-br from-sun/[0.12] via-cloud/[0.04] to-transparent p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sun/15 blur-3xl" />
              <CoinCanvas variant="mini" className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 opacity-90 sm:h-72 sm:w-72" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="eyebrow">Account</p>
                  <KeyDisplay value={lookup} head={8} tail={8} className="mt-1" />
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh">
                    <RotateCw className={cn(isFetching && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={explorerAccountUrl(lookup)} target="_blank" rel="noreferrer" aria-label="Open in explorer">
                      <ExternalLink />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="relative mt-10">
                <p className="eyebrow mb-2">Native balance</p>
                {isLoading ? (
                  <div className="skeleton h-16 w-56" />
                ) : (
                  <p className="num break-all font-display text-5xl font-semibold tracking-[-0.045em] sm:text-7xl">
                    {formatAmount(xlm?.amount ?? 0, 4)}
                    <span className="ml-3 font-mono text-lg font-normal tracking-normal text-sun sm:text-xl">XLM</span>
                  </p>
                )}
              </div>
              <p className="relative mt-6 font-mono text-[11px] text-cloud/40">
                {dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : "Fetching…"}
              </p>
            </section>

            {/* Asset list */}
            <section className="surface rounded-3xl p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold tracking-tight">Assets</h2>
                <span className="font-mono text-xs text-cloud/40">{data?.length ?? 0}</span>
              </div>
              {isLoading ? (
                <div className="mt-5 flex flex-col gap-2">
                  <div className="skeleton h-14 w-full" />
                  <div className="skeleton h-14 w-full" />
                </div>
              ) : (data?.length ?? 0) === 0 ? (
                <p className="mt-5 text-sm text-cloud/50">No balances returned for this account.</p>
              ) : (
                <ul className="mt-5 flex flex-col gap-2">
                  {[...(xlm ? [xlm] : []), ...others].map((b) => (
                    <li
                      key={`${b.asset}-${b.issuer ?? "native"}`}
                      className="flex items-center gap-3 rounded-xl border border-cloud/10 bg-graphite/50 px-4 py-3"
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold",
                          b.asset === "XLM" ? "bg-cloud text-graphite" : "bg-sun text-graphite",
                        )}
                      >
                        {b.asset.slice(0, 4)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{b.asset}</p>
                        <p className="truncate font-mono text-[11px] text-cloud/40">
                          {b.issuer ? `issuer ${truncateKey(b.issuer, 4, 4)}` : "Stellar Lumens · native"}
                        </p>
                      </div>
                      <p className="num font-display font-semibold">{formatAmount(b.amount, 4)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
