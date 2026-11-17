/**
 * Quiet backdrop for the hero: graphite with a faint cool light from the top,
 * a barely-there grid, and film grain. The yellow comes from the 3D coin
 * itself, so the background stays neutral and lets it stand out.
 */
export function HeroBackground() {
  return (
    <div aria-hidden className="grain pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 72% 45%, rgba(242,244,241,0.07) 0%, rgba(28,29,32,0) 70%), radial-gradient(50% 40% at 72% 48%, rgba(255,201,40,0.07) 0%, rgba(28,29,32,0) 70%), #1C1D20",
        }}
      />
      <div
        className="bg-grid absolute inset-0 opacity-60"
        style={{
          maskImage: "radial-gradient(ellipse 60% 55% at 70% 45%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 70% 45%, black 0%, transparent 75%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-graphite" />
    </div>
  );
}
