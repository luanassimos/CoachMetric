import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        [
          "inline-flex min-w-max items-center gap-1",
          "rounded-lg border border-white/8",
          "bg-white/[0.03]",
          "p-1",
          "text-muted-foreground",
          "shadow-sm",
        ].join(" "),
        className,
      )}
      {...props}
    />
  </div>
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      [
        "inline-flex items-center justify-center whitespace-nowrap",
        "rounded-md px-3 py-1.5",
        "text-sm font-medium",
        "text-muted-foreground",
        "transition-[background-color,color,border-color,box-shadow] duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        "disabled:pointer-events-none disabled:opacity-40",
        "hover:bg-white/[0.04] hover:text-foreground",
        "data-[state=active]:border data-[state=active]:border-white/10",
        "data-[state=active]:bg-white/[0.08]",
        "data-[state=active]:text-foreground",
        "data-[state=active]:shadow-sm",
      ].join(" "),
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      [
        "mt-4 rounded-md",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30",
      ].join(" "),
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };