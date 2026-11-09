"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { cn } from "./utils";

type TooltipProps = {
  /** Short visual label. The trigger must carry the same accessible name. */
  label: React.ReactNode;
  /** The trigger element; it receives the tooltip's event handlers. */
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

/*
 * visionOS tooltip (Figma: Tooltips): a bezel 8 pt below the control, with a
 * 0.75px specular edge (gradient 159.2deg at the kit's 64x24 bezel: white 45%
 * -> 0 -> 15%), padding 4/12 and Caption 1 text. Appears after a short dwell.
 */
function Tooltip({ label, children, side = "bottom", className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger delay={600} render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={8}>
          <TooltipPrimitive.Popup
            className={cn(
              "vision-surface relative rounded-full px-3 py-1 text-caption-1 whitespace-nowrap text-label",
              "[--glass-stroke-width:0.75px] [--glass-stroke-angle:159.2deg] [--glass-stroke-alpha-start:0.45] [--glass-stroke-alpha-end:0.15] [--glass-stroke-start:8.56%] [--glass-stroke-fade:37.9%] [--glass-stroke-rise:50.2%] [--glass-stroke-end:80.1%]",
              "origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-(--ease-spring)",
              "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
              className,
            )}
          >
            <MaterialLayers kind="tooltip" />
            <span>{label}</span>
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Tooltip };
