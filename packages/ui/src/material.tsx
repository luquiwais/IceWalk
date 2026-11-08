import type * as React from "react";

import { cn } from "./utils";

type MaterialKind = "glass" | "recessed" | "regular" | "thick" | "platter";

const LAYERS: Record<MaterialKind, string[]> = {
  glass: ["vision-glass-blur", "vision-glass", "vision-glass-stroke"],
  recessed: [
    "vision-recessed-burn",
    "vision-recessed-luminosity",
    "vision-recessed-overlay",
    "vision-recessed-shadow",
  ],
  // Figma paints the first fill on top; DOM layers paint last on top.
  regular: ["vision-regular-luminosity", "vision-regular-burn"],
  thick: ["vision-thick-luminosity", "vision-thick-burn"],
  platter: ["vision-fill-dodge", "vision-fill-lighten"],
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
