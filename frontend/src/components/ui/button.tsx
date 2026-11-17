import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun/70 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-sun text-graphite font-semibold shadow-[0_0_0_1px_rgba(255,201,40,0.4),0_8px_24px_-8px_rgba(255,201,40,0.55)] hover:bg-[#ffd451] hover:shadow-[0_0_0_1px_rgba(255,201,40,0.6),0_10px_32px_-8px_rgba(255,201,40,0.7)]",
        outline:
          "border border-cloud/15 bg-cloud/[0.03] text-cloud hover:border-sun/60 hover:text-sun hover:bg-sun/[0.06]",
        ghost: "text-cloud/70 hover:text-sun hover:bg-cloud/[0.06]",
        subtle: "bg-cloud/[0.08] text-cloud hover:bg-cloud/[0.12] hover:text-sun",
        destructive: "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25",
        link: "text-sun underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-[15px]",
        xl: "h-14 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
