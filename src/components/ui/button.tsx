import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary — gradient bleu
        default:
          "text-white shadow-sm",
        // Destructive
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 hover:border-destructive/50",
        // Outline — surface sombre avec bordure
        outline:
          "border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border",
        // Secondary — surface légèrement surélevée
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent hover:text-foreground",
        // Ghost — sans fond
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-foreground",
        // Link
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-8 px-3.5 py-1.5 text-xs",
        sm:      "h-7 px-2.5 py-1 text-[11px]",
        lg:      "h-9 px-5 py-2 text-sm",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Style inline appliqué uniquement sur le variant "default" pour le gradient
const DEFAULT_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, #3b3ff5 0%, #000091 100%)",
  boxShadow: "0 0 12px rgba(59,63,245,0.3), 0 2px 6px rgba(0,0,0,0.25)",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const isDefault = !variant || variant === "default";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={isDefault ? { ...DEFAULT_STYLE, ...style } : style}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
