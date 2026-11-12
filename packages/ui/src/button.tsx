"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { usePress } from "@fluidkit/react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronLeft } from "lucide-react";
import type * as React from "react";

import { Tooltip } from "./tooltip";
import { cn } from "./utils";

/*
 * iOS 26/27 buttons, as Fluid Kit draws them. Capsules by default.
 *   glass       `.glass` (`lb lb-interactive`): floats over content (map controls, bar buttons)
 *   prominent   `.glassProminent` (`lb-tinted`): the tinted primary action
 *   platter     on glass: a gray fill, never a second glass (sheets, panels, alerts)
 *   plain       on glass, borderless: ink only until hovered or pressed
 * Heights: mini 28 · small 34 · regular 44 · large 50 · extra-large 56.
 */
const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-1.5 font-medium whitespace-nowrap select-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        glass: "lb lb-interactive",
        prominent: "lb lb-interactive lb-tinted font-semibold",
        platter: "ui-fill transition-colors",
        plain: "ui-plain transition-colors",
      },
      shape: {
        capsule: "rounded-full",
        rounded: "",
        circle: "rounded-full p-0",
      },
      size: {
        mini: "h-7 gap-1 px-2.5 text-footnote [&_svg]:size-3.5",
        small: "h-[2.125rem] gap-1 px-3.5 text-subheadline [&_svg]:size-4",
        regular: "h-11 px-5 text-body [&_svg]:size-5",
        large: "h-[3.125rem] px-6 text-headline [&_svg]:size-6",
        "extra-large": "h-14 px-7 text-headline [&_svg]:size-7",
      },
    },
    compoundVariants: [
      { shape: "rounded", size: ["mini", "small"], className: "rounded-lg" },
      { shape: "rounded", size: "regular", className: "rounded-xl" },
      { shape: "rounded", size: ["large", "extra-large"], className: "rounded-2xl" },
      { shape: "circle", size: "mini", className: "w-7" },
      { shape: "circle", size: "small", className: "w-[2.125rem]" },
      { shape: "circle", size: "regular", className: "w-11" },
      { shape: "circle", size: "large", className: "w-[3.125rem]" },
      { shape: "circle", size: "extra-large", className: "w-14" },
    ],
    defaultVariants: { variant: "platter", shape: "capsule", size: "regular" },
  },
);

type ButtonVariant = "glass" | "prominent" | "platter" | "plain";

type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { variant?: ButtonVariant };

/** A button's label and symbol, side by side. */
function ButtonContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex min-w-0 items-center justify-center gap-1.5", className)}>{children}</span>;
}

function Button({ className, variant, shape, size, ...props }: ButtonProps) {
  usePress();
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, shape, size }), className)} {...props} />;
}

type IconButtonProps = Omit<ButtonProps, "shape" | "aria-label"> & {
  /** Accessible name, also shown as a tooltip on pointer devices. Required: the button has no text. */
  label: string;
  showTooltip?: boolean;
};

/** Circular symbol button. */
function IconButton({ label, showTooltip = true, ...props }: IconButtonProps) {
  const button = <Button shape="circle" aria-label={label} {...props} />;
  return showTooltip ? <Tooltip label={label}>{button}</Tooltip> : button;
}

type BackButtonProps = Omit<IconButtonProps, "children">;

/** iOS 26 back button: a chevron in a circle, its destination as the accessible name. */
function BackButton(props: BackButtonProps) {
  return (
    <IconButton showTooltip={false} data-slot="back-button" {...props}>
      <ChevronLeft aria-hidden strokeWidth={2.5} />
    </IconButton>
  );
}

export { BackButton, Button, ButtonContent, IconButton, buttonVariants };
export type { BackButtonProps, ButtonProps, ButtonVariant, IconButtonProps };
