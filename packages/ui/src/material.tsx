import type * as React from "react";

import { cn } from "./utils";

type MaterialKind = "glass" | "recessed" | "regular" | "thick" | "platter" | "tooltip";

const LAYERS: Record<MaterialKind, string[]> = {
  glass: ["vision-glass-blur", "vision-glass", "vision-glass-stroke"],
  // Measured 2026-11-09 against the kit's Materials swatches (backdrop
  // rgb(82 107 142)): the plugin API lists fills bottom to top, which is the DOM
  // order. Recessed [luminosity, burn] reproduces rgb(53 78 113) exactly (the old
  // burn-first order gave 56 78 116); Thick [burn, luminosity] gives 49 75 111
  // against the kit's 49 76 112. Regular keeps [luminosity, burn]: Safari-verified,
  // and within 1/255 of the kit (61 86 121 vs 62 87 122).
  recessed: [
    "vision-recessed-luminosity",
    "vision-recessed-burn",
    "vision-recessed-overlay",
    "vision-recessed-shadow",
  ],
  regular: ["vision-regular-luminosity", "vision-regular-burn"],
  thick: ["vision-thick-burn", "vision-thick-luminosity"],
  // Controls - Fills (Materials page), same backdrop: Pinch measured 133 159 194
  // with [lighten, dodge] vs the kit's 132 157 193 (the old [dodge, lighten] order
  // gave 124 150 185); Idle 104 129 166 vs 103 129 165; Hover 92 117 152 vs 91 116 151.
  platter: ["vision-fill-lighten", "vision-fill-dodge"],
  // Tooltip bezel (548:2239): blur 136 (68px), white 3% luminosity + #808080 15%
  // color-dodge, and a 0.75 specular edge. Measured: reproduces rgb(85 117 158)
  // over rgb(68 97 137); the kit renders (84,118,161). A plain 15% gray gives (77,102,136).
  tooltip: ["vision-tooltip-blur", "vision-tooltip-luminosity", "vision-tooltip-dodge", "vision-glass-stroke"],
};

/**
 * The layers of a visionOS material (Figma: Materials). Render them as the
 * first children of an element with `vision-surface`; they blend with whatever
 * is behind the element.
 */
function MaterialLayers({ kind }: { kind: MaterialKind }) {
  return (
    <>
      {LAYERS[kind].map((layer) => (
        <span key={layer} aria-hidden data-vision-layer className={cn("vision-layer", layer)} />
      ))}
    </>
  );
}

type ScrollDirection = "vertical" | "horizontal" | "both";

/** Scroll content inside a material, never the element that paints its layers. */
function SurfaceScroll({ direction = "vertical", className, ...props }: React.ComponentProps<"div"> & { direction?: ScrollDirection }) {
  return <div data-slot="surface-scroll" className={cn(
    "min-h-0 min-w-0 overscroll-contain",
    direction === "vertical" && "overflow-x-hidden overflow-y-auto",
    direction === "horizontal" && "overflow-x-auto overflow-y-hidden",
    direction === "both" && "overflow-auto",
    className,
  )} {...props} />;
}

type MaterialProps = React.ComponentProps<"div"> & { kind: MaterialKind; scrollable?: ScrollDirection };

/** A block with a visionOS material behind its content. */
function Material({ kind, className, children, scrollable, ...props }: MaterialProps) {
  return (
    <div
      data-slot="material"
      className={cn("vision-surface relative", scrollable && "flex min-h-0 flex-col overflow-clip", kind === "platter" && "vision-platter", className)}
      {...props}
    >
      <MaterialLayers kind={kind} />
      {scrollable ? <SurfaceScroll direction={scrollable} className="flex-1">{children}</SurfaceScroll> : children}
    </div>
  );
}

export { Material, MaterialLayers, SurfaceScroll };
export type { MaterialKind };
