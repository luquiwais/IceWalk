"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type * as React from "react";

import { cn } from "@/lib/utils";

type TooltipProps = {
  /** Short visual label. The trigger must carry the same accessible name. */
  label: React.ReactNode;
  /** The trigger element; it receives the tooltip's event handlers. */
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

/** Appears after a short gaze/hover, like visionOS tooltips on icon buttons. */
function Tooltip({ label, children, side = "top", className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={600} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={10}>
          <TooltipPrimitive.Popup
            className={cn(
              "material-glass glass-rim rounded-full px-3 py-1.5 text-footnote font-semibold text-label",
              "origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-(--ease-spring)",
              "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
              className,
            )}
          >
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip };
