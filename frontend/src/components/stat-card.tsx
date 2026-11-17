import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { TiltCard } from "./tilt-card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  highlight = false,
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  icon: LucideIcon;
  highlight?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <TiltCard className="rounded-2xl" max={7}>
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl p-5 sm:p-6",
        highlight ? "border border-sun/30 bg-sun/[0.07]" : "surface",
        className,
      )}
    >
      {highlight && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sun/20 blur-3xl" />
      )}
      <div className="relative flex items-start justify-between">
        <p className="eyebrow">{label}</p>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg",
            highlight ? "bg-sun text-graphite" : "bg-cloud/[0.07] text-cloud/60",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-5 flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <>
            <span
              className={cn(
                "num font-display text-4xl font-semibold tracking-[-0.04em] sm:text-[44px]",
                highlight && "text-sun",
              )}
            >
              {value}
            </span>
            {unit && <span className="font-mono text-sm text-cloud/45">{unit}</span>}
          </>
        )}
      </div>
      {hint && <div className="relative mt-2 text-[13px] text-cloud/50">{hint}</div>}
    </div>
    </TiltCard>
  );
}
