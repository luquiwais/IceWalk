"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type * as React from "react";

import { cn } from "./utils";

type TooltipProps = {
  /** Short visual label. The trigger must carry the same accessible name. */
  label: React.ReactNode;
  /** The trigger element; it receives the tooltip's event handlers. */
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

/** visionOS tooltip (Figma: Tooltips): a glass bezel 8pt from the control, Caption 1, after a short dwell. */
function Tooltip({ label, children, side = "bottom", className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={600} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8} className="z-50">
          <TooltipPrimitive.Popup className={cn("lb ui-pop px-3 py-1 text-caption-1 whitespace-nowrap text-label", className)}>
            {label}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip };
