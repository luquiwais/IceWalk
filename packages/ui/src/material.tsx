import type * as React from "react";

import { cn } from "./utils";

type MaterialKind = "glass" | "regular" | "thick" | "recessed" | "platter" | "tooltip";

/*
 * visionOS materials on Fluid Kit's Liquid Blur: one element, plain CSS. Thinner and thicker
 * glass is the same material with less or more fill (`--lb-transparency`); recessed is a well
 * cut into the glass, with no blur of its own; platter is a control's fill on glass.
 */
const MATERIAL: Record<MaterialKind, string> = {
  glass: "lb",
  tooltip: "lb",
  regular: "lb",
  thick: "lb",
  recessed: "ui-well",
  platter: "ui-fill",
};

/** The classes of a material, for an element of your own. */
function material(kind: MaterialKind) {
  return MATERIAL[kind];
}

type ScrollDirection = "vertical" | "horizontal" | "both";

/** Scrolling content whose edges fade out where there is more to scroll (Fluid Kit Scroll Edge). */
function SurfaceScroll({ direction = "vertical", className, ...props }: React.ComponentProps<"div"> & { direction?: ScrollDirection }) {
  return <div data-slot="surface-scroll" className={cn(
    "min-h-0 min-w-0 overscroll-contain",
    direction === "vertical" && "lb-edge overflow-x-hidden overflow-y-auto",
    direction === "horizontal" && "lb-edge-x overflow-x-auto overflow-y-hidden",
    direction === "both" && "overflow-auto",
    className,
  )} {...props} />;
}

type MaterialProps = React.ComponentProps<"div"> & { kind: MaterialKind; scrollable?: ScrollDirection };

/** A block of a visionOS material with its content. */
function Material({ kind, className, children, scrollable, ...props }: MaterialProps) {
  return (
    <div
      data-slot="material"
      className={cn("relative rounded-3xl", MATERIAL[kind], scrollable && "flex min-h-0 flex-col overflow-clip", className)}
      {...props}
    >
      {scrollable ? <SurfaceScroll direction={scrollable} className="flex-1">{children}</SurfaceScroll> : children}
    </div>
  );
}

export { Material, SurfaceScroll, material };
export type { MaterialKind };
