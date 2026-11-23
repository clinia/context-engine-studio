import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-lg border px-2.5 py-0.5",
    "text-xs font-medium transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      // `success`, `warning` and `destructive` carry status. `accent` is a Trust outline for something new or featured.
      variant: {
        // Solid `primary` fill, for a neutral label.
        default: "border-transparent bg-primary text-primary-foreground",
        // Quiet `secondary` fill, for a label that sits back.
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        accent: "border-accent bg-transparent text-foreground",
        // Hairline `border` with no fill, the lightest label.
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
