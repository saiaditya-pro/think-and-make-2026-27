"use client"

import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cn } from "cn"

function ToggleGroup<Value extends string>({
  className,
  ...props
}: ToggleGroupPrimitive.Props<Value>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  )
}

function ToggleGroupItem<Value extends string>({
  className,
  ...props
}: TogglePrimitive.Props<Value>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "h-8 rounded-lg border border-input bg-transparent px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/80",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
