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

const TONE_PRESSED_CLASS = {
  // Yes/No criteria toggles -- matches the mockup's teal-filled selected state.
  teal: "data-pressed:border-brand-teal data-pressed:bg-brand-teal data-pressed:text-white data-pressed:hover:bg-brand-teal-dark",
  // Picking one of several named options (grade, teacher) -- matches the mockup's coral-filled chips.
  coral: "data-pressed:border-brand-coral data-pressed:bg-brand-coral data-pressed:text-white data-pressed:hover:bg-brand-coral-dark",
}

function ToggleGroupItem<Value extends string>({
  className,
  tone = "teal",
  ...props
}: TogglePrimitive.Props<Value> & { tone?: "teal" | "coral" }) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "h-8 rounded-lg border border-input bg-transparent px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none select-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        TONE_PRESSED_CLASS[tone],
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
