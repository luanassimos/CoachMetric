import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md",
    "text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border border-transparent",
          "bg-primary text-primary-foreground",
          "shadow-sm",
          "hover:bg-primary/85",
          "active:bg-primary/75",
        ].join(" "),

        destructive: [
          "border border-transparent",
          "bg-destructive text-destructive-foreground",
          "shadow-sm",
          "hover:bg-destructive/85",
          "active:bg-destructive/75",
        ].join(" "),

        outline: [
          "border border-white/10",
          "bg-white/[0.02]",
          "text-foreground",
          "hover:bg-white/[0.05]",
          "active:bg-white/[0.08]",
        ].join(" "),

        secondary: [
          "border border-white/8",
          "bg-white/[0.04]",
          "text-foreground",
          "hover:bg-white/[0.06]",
          "active:bg-white/[0.09]",
        ].join(" "),

        ghost: [
          "border border-transparent",
          "bg-transparent",
          "text-muted-foreground",
          "hover:bg-white/[0.05] hover:text-foreground",
          "active:bg-white/[0.08]",
        ].join(" "),
      },

      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };