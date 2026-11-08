import type * as React from "react";

import { cn } from "./utils";

type MaterialKind = "glass" | "recessed" | "regular" | "thick" | "platter";

const LAYERS: Record<MaterialKind, string[]> = {
  glass: ["vision-glass", "vision-glass-stroke"],
  recessed: [
    "vision-recessed-luminosity",
    "vision-recessed-burn",
    "vision-recessed-shadow",
  ],
  regular: ["vision-regular-burn", "vision-regular-luminosity"],
  thick: ["vision-thick-burn", "vision-thick-luminosity"],
  platter: ["vision-fill-lighten", "vision-fill-dodge"],
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

type MaterialProps = React.ComponentProps<"div"> & { kind: MaterialKind };

/** A block with a visionOS material behind its content. */
function Material({ kind, className, children, ...props }: MaterialProps) {
  return (
    <div
      data-slot="material"
      className={cn("vision-surface relative", kind === "platter" && "vision-platter", className)}
      {...props}
    >
      <MaterialLayers kind={kind} />
      {children}
    </div>
  );
}

export { Material, MaterialLayers };
export type { MaterialKind };
