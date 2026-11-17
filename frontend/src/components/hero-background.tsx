/**
 * Animated gradient field built only from the three brand colors.
 * Pure CSS — slow drifting blooms of Sunshine Yellow and Soft Cloud
 * over Deep Graphite, masked grid, and film grain.
 */
export function HeroBackground() {
  return (
    <div aria-hidden className="grain pointer-events-none absolute inset-0 overflow-hidden">
      {/* base sweep */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 80% at 80% -10%, rgba(255,201,40,0.20) 0%, rgba(28,29,32,0) 55%), radial-gradient(90% 70% at -10% 110%, rgba(242,244,241,0.08) 0%, rgba(28,29,32,0) 60%), #1C1D20",
        }}
      />
      {/* drifting blooms */}
      <div
        className="absolute -right-[10%] -top-[25%] h-[70vmax] w-[70vmax] animate-drift rounded-full opacity-70 blur-[90px]"
        style={{ background: "radial-gradient(circle at center, rgba(255,201,40,0.55) 0%, rgba(255,201,40,0.12) 40%, rgba(28,29,32,0) 70%)" }}
      />
      <div
        className="absolute -left-[20%] top-[30%] h-[60vmax] w-[60vmax] animate-drift-slow rounded-full opacity-60 blur-[100px]"
        style={{ background: "radial-gradient(circle at center, rgba(242,244,241,0.16) 0%, rgba(242,244,241,0.04) 45%, rgba(28,29,32,0) 70%)" }}
      />
      <div
        className="absolute bottom-[-30%] right-[15%] h-[45vmax] w-[45vmax] animate-drift rounded-full opacity-50 blur-[110px] [animation-delay:-7s] [animation-duration:24s]"
        style={{ background: "radial-gradient(circle at center, rgba(255,201,40,0.35) 0%, rgba(28,29,32,0) 65%)" }}
      />
      {/* grid, fading toward the edges */}
      <div
        className="bg-grid absolute inset-0"
        style={{
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 10%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 10%, transparent 75%)",
        }}
      />
      {/* bottom fade into page */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-graphite" />
    </div>
  );
}
