"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
  showLabel = false,
}: {
  value: string;
  label?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md p-1.5 text-cloud/50 transition hover:bg-sun/10 hover:text-sun focus:outline-none focus-visible:ring-2 focus-visible:ring-sun/60",
        copied && "text-teal hover:text-teal",
        showLabel && "px-2.5 text-xs font-medium",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {showLabel && (copied ? "Copied" : label)}
    </button>
  );
}
