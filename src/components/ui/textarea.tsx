import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          [
            "flex w-full min-w-0",
            "min-h-[96px] rounded-md px-3 py-2.5",
            "border border-white/10",
            "bg-white/[0.03]",
            "text-sm text-foreground",
            "placeholder:text-muted-foreground/80",
            "shadow-sm",
            "transition-[border-color,background-color,box-shadow,color] duration-150 ease-out",
            "focus-visible:outline-none",
            "focus-visible:border-white/20",
            "focus-visible:bg-white/[0.045]",
            "focus-visible:ring-2 focus-visible:ring-ring/30",
            "aria-invalid:border-destructive/40",
            "aria-invalid:ring-destructive/20",
            "disabled:cursor-not-allowed disabled:opacity-40",
            "resize-y",
          ].join(" "),
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
