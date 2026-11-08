"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToggleButtonProps = TogglePrimitive.Props &
  VariantProps<typeof buttonVariants>;

/** On/off control. Pressed uses the visionOS toggled style: white fill, dark content. */
function ToggleButton({
  className,
  variant,
  shape,
  size,
  ...props
}: ToggleButtonProps) {
  return (
    <TogglePrimitive
      data-slot="toggle-button"
      className={cn(
        buttonVariants({ variant, shape, size }),
        "data-pressed:bg-selected data-pressed:text-on-selected hover:data-pressed:bg-selected",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleButton };
export type { ToggleButtonProps };
