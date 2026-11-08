"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * visionOS buttons (HIG > Buttons > visionOS):
 * - On a glass window, the background is the thin material (bg-fill).
 * - Floating in space (over the 3D scene), the background is glass.
 * - In toolbars and ornaments, buttons can be borderless.
 * - Prefer capsule (text) and circle (icon only); rounded rectangles for stacks.
 * - Sizes: mini 28, small 32, regular 44, large 52, extra large 64 (circle only).
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap select-none",
    "text-label outline-none transition-[background-color,color,scale,box-shadow] duration-150 ease-(--ease-spring)",
    "focus-visible:ring-2 focus-visible:ring-label focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    "motion-safe:active:scale-[0.97]",
    "data-disabled:cursor-not-allowed data-disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-fill hover:not-data-disabled:bg-fill-hover active:not-data-disabled:bg-fill-active",
        glass: "material-glass glass-rim hover:not-data-disabled:brightness-125",
        borderless:
          "bg-transparent hover:not-data-disabled:bg-fill-hover active:not-data-disabled:bg-fill-active",
      },
      shape: {
        capsule: "rounded-full",
        rounded: "rounded-[0.875rem]",
        circle: "rounded-full p-0",
      },
      size: {
        mini: "h-7 px-3 text-footnote [&_svg]:size-3.5",
        small: "h-8 px-3.5 text-subheadline [&_svg]:size-4",
        regular: "h-11 px-5 text-body [&_svg]:size-5",
        large: "h-13 px-6 text-headline [&_svg]:size-6",
        "extra-large": "h-16 px-7 text-title-3 [&_svg]:size-7",
      },
    },
    compoundVariants: [
      { shape: "circle", size: "mini", className: "w-7" },
      { shape: "circle", size: "small", className: "w-8" },
      { shape: "circle", size: "regular", className: "w-11" },
      { shape: "circle", size: "large", className: "w-13" },
      { shape: "circle", size: "extra-large", className: "w-16" },
    ],
    defaultVariants: {
      variant: "default",
      shape: "capsule",
      size: "regular",
    },
  },
);

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

function Button({ className, variant, shape, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, shape, size }), className)}
      {...props}
    />
  );
}

type IconButtonProps = Omit<ButtonProps, "shape" | "aria-label"> & {
  /** Accessible name, also shown as a tooltip. Required: the button has no text. */
  label: string;
  showTooltip?: boolean;
};

/** Circular icon-only button with a tooltip that matches its accessible name. */
function IconButton({ label, showTooltip = true, ...props }: IconButtonProps) {
  const button = <Button shape="circle" aria-label={label} {...props} />;
  if (!showTooltip) return button;
  return <Tooltip label={label}>{button}</Tooltip>;
}

export { Button, IconButton, buttonVariants };
export type { ButtonProps, IconButtonProps };
