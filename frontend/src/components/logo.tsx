import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <rect width="32" height="32" rx="9" fill="#FFD36B" />
      {/* Two interlocking strokes: a task handed off, a payment returned. */}
      <path
        d="M21.5 10.5h-8a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6h-8"
        fill="none"
        stroke="#060B0A"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="22.5" r="1.9" fill="#060B0A" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-lg font-bold tracking-tight text-sun">SynthPay</span>
    </Link>
  );
}
