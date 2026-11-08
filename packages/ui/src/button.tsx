"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { Tooltip } from "./tooltip";
import { cn } from "./utils";

/*
 * visionOS buttons (Figma: Buttons). Sizes, paddings, radii and type come from
 * the kit:
 *   text    small 32 (px 12, 15/20) · regular 44 (px 20, 17/22) · large 52 (px 25, 19/24)
 *   symbol  mini 28 · small 32 · regular 44 · large 52 · extra-large 64
 *   radius  capsule; rounded rect 8 / 12 / 16
 * States (hover glow, pinch, disabled, selected) live in globals.css.
 */
const buttonVariants = cva(
  [
    "vision-control vision-surface relative inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none",
    "outline-none transition-[background-color,color] duration-150 ease-(--ease-spring)",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      shape: {
        capsule: "rounded-full",
        rounded: "",
        circle: "rounded-full p-0",
      },
      size: {
        mini: "h-7 px-2.5 text-footnote [&_svg]:size-3.5",
        small: "h-8 px-3 text-[0.9375rem] leading-5 [&_svg]:size-4",
        regular: "h-11 px-5 text-[1.0625rem] leading-[1.375rem] [&_svg]:size-5",
        large: "h-13 px-[1.5625rem] text-[1.1875rem] leading-6 [&_svg]:size-6",
        "extra-large": "h-16 px-7 text-[1.1875rem] leading-6 [&_svg]:size-7",
      },
    },
    compoundVariants: [
      { shape: "rounded", size: ["mini", "small"], className: "rounded-lg" },
      { shape: "rounded", size: "regular", className: "rounded-xl" },
      { shape: "rounded", size: ["large", "extra-large"], className: "rounded-2xl" },
      { shape: "circle", size: "mini", className: "w-7" },
      { shape: "circle", size: "small", className: "w-8" },
      { shape: "circle", size: "regular", className: "w-11" },
      { shape: "circle", size: "large", className: "w-13" },
      { shape: "circle", size: "extra-large", className: "w-16" },
    ],
    defaultVariants: {
      shape: "capsule",
      size: "regular",
    },
  },
);

type ButtonVariant = "platter" | "plain" | "glass";

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /**
     * platter: thin fill, for buttons on a window (default).
     * plain: no fill until hover, for toolbars and lists.
     * glass: glass material, for buttons floating over the scene.
     */
    variant?: ButtonVariant;
  };

function ButtonContent({ children }: { children: React.ReactNode }) {
  return (
    <span data-vision-content className="inline-flex min-w-0 items-center justify-center gap-1.5">
      {children}
    </span>
  );
}

function Button({
  className,
  variant = "platter",
  shape,
  size,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-platter={variant === "plain" ? "false" : undefined}
      className={cn(buttonVariants({ shape, size }), className)}
      {...props}
    >
      <MaterialLayers kind={variant === "glass" ? "glass" : "platter"} />
      <ButtonContent>{children as React.ReactNode}</ButtonContent>
    </ButtonPrimitive>
  );
}

type IconButtonProps = Omit<ButtonProps, "shape" | "aria-label"> & {
  /** Accessible name, also shown as a tooltip. Required: the button has no text. */
  label: string;
  showTooltip?: boolean;
};

/** Circular symbol button with a tooltip that matches its accessible name. */
function IconButton({ label, showTooltip = true, ...props }: IconButtonProps) {
  const button = <Button shape="circle" aria-label={label} {...props} />;
  if (!showTooltip) return button;
  return <Tooltip label={label}>{button}</Tooltip>;
}

export { Button, ButtonContent, IconButton, buttonVariants };
export type { ButtonProps, ButtonVariant, IconButtonProps };
