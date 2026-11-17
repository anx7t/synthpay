"use client";

import { useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  // Stop rendering when the scene is scrolled out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Scene variant={variant} active={active} />
    </div>
  );
}
