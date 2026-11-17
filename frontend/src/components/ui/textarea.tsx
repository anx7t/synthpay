import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full resize-y rounded-lg border border-cloud/10 bg-cloud/[0.04] px-3.5 py-3 text-sm leading-relaxed text-cloud placeholder:text-cloud/30 transition-colors",
        "hover:border-cloud/20 focus-visible:outline-none focus-visible:border-sun/70 focus-visible:bg-cloud/[0.06] focus-visible:ring-4 focus-visible:ring-sun/10",
        "aria-[invalid=true]:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
