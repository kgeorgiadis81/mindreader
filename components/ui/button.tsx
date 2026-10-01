import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d10] disabled:pointer-events-none disabled:opacity-40 touch-manipulation [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-300 text-zinc-950 hover:bg-cyan-200 shadow-[0_0_24px_rgba(34,225,255,0.25)]",
        outline:
          "border border-white/15 bg-white/5 text-zinc-100 hover:border-cyan-300/50 hover:bg-white/8",
        ghost: "text-zinc-300 hover:bg-white/5 hover:text-white",
        answer:
          "border border-white/12 bg-[#14181f] text-zinc-100 hover:border-cyan-300/60 hover:text-cyan-100 min-h-14 text-xs sm:text-sm uppercase tracking-[0.14em]",
      },
      size: {
        default: "h-12 px-6",
        lg: "h-14 px-8 text-base",
        wide: "h-14 w-full px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
