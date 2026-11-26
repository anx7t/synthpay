"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

/** WebGL is client-only and heavy: load it lazily over a static glow. */
const Scene = dynamic(() => import("./coin-stream-scene"), {
  ssr: false,
  loading: () => null,
});

export function CoinStream({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  // Stop rendering when the hero is scrolled out of view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      style={{
        // Shown until the scene loads, and matches its first frame.
        background:
          "radial-gradient(45% 70% at 78% 25%, rgba(70,190,165,0.35) 0%, rgba(10,60,55,0.25) 45%, transparent 75%), #030605",
      }}
    >
      <Scene active={active} />
    </div>
  );
}
