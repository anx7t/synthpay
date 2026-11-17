"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

/** WebGL is client-only and heavy — load it lazily with a glow placeholder. */
const Scene = dynamic(() => import("./coin-scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-sun/20 blur-2xl" />
    </div>
  ),
});

export function CoinCanvas({ variant = "hero", className }: { variant?: "hero" | "mini"; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Scene variant={variant} />
    </div>
  );
}
