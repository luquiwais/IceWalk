"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { usePress } from "@fluidkit/react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "./button";
import { cn } from "./utils";

type ToggleButtonProps = TogglePrimitive.Props &
  Omit<VariantProps<typeof buttonVariants>, "variant"> & {
    /**
     * solid: selected is white with black content (visionOS button Selected).
     * toolbar: idle text is secondary and selected is a platter (Toolbar items).
     */
    appearance?: "solid" | "toolbar";
    /** Show the thin fill while idle (solid appearance only). */
    platter?: boolean;
  };

function ToggleButton({ className, shape, size, appearance = "solid", platter = true, ...props }: ToggleButtonProps) {
  usePress();
  const toolbar = appearance === "toolbar";
  return (
    <TogglePrimitive
      data-slot="toggle-button"
      data-appearance={appearance}
      className={cn(
        buttonVariants({ variant: toolbar || !platter ? "plain" : "platter", shape, size }),
        toolbar
          ? "h-11 px-5 text-title-3 text-label-secondary data-pressed:text-label"
          : "data-pressed:ui-selected",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleButton };
export type { ToggleButtonProps };
