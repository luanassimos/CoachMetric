import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          [
            "flex w-full min-w-0",
            "h-9 rounded-md px-3",
            "border border-white/10",
            "bg-white/[0.03]",
            "text-sm text-foreground",
            "shadow-sm",
            "transition-[border-color,background-color,box-shadow,color] duration-150 ease-out",
            "placeholder:text-muted-foreground/80",
            "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "focus-visible:outline-none",
            "focus-visible:border-white/20",
            "focus-visible:bg-white/[0.045]",
            "focus-visible:ring-2 focus-visible:ring-ring/30",
            "aria-invalid:border-destructive/40",
            "aria-invalid:ring-destructive/20",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" "),
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };