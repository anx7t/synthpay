import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border border-cloud/10 bg-cloud/[0.04] px-3.5 text-sm text-cloud placeholder:text-cloud/30 transition-colors",
        "hover:border-cloud/20 focus-visible:outline-none focus-visible:border-sun/70 focus-visible:bg-cloud/[0.06] focus-visible:ring-4 focus-visible:ring-sun/10",
        "aria-[invalid=true]:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
