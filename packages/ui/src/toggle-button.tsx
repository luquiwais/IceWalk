"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { ButtonContent, buttonVariants } from "./button";
import { MaterialLayers } from "./material";
import { cn } from "./utils";
import { Vibrancy } from "./vibrancy";

type ToggleButtonProps = TogglePrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * solid: selected is white with black content (visionOS button Selected).
     * toolbar: idle text is secondary and selected is a platter (Toolbar items).
     */
    appearance?: "solid" | "toolbar";
    /** Show the thin fill while idle (solid appearance only). */
    platter?: boolean;
  };

function ToggleButton({
  className,
  shape,
  size,
  appearance = "solid",
  platter = true,
  children,
  ...props
}: ToggleButtonProps) {
  const isToolbar = appearance === "toolbar";

  return (
    <TogglePrimitive
      data-slot="toggle-button"
      data-appearance={appearance}
      data-platter={isToolbar || !platter ? "false" : undefined}
      className={cn(
        buttonVariants({ shape, size }),
        isToolbar && "h-11 px-5 text-title-3 font-semibold",
        className,
      )}
      {...props}
    >
      <MaterialLayers kind="platter" />
      <ButtonContent>{isToolbar ? <Vibrancy>{children as React.ReactNode}</Vibrancy> : children as React.ReactNode}</ButtonContent>
    </TogglePrimitive>
  );
}

export { ToggleButton };
export type { ToggleButtonProps };
