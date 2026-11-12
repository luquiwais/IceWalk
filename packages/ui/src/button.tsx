"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Children, isValidElement, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { Tooltip } from "./tooltip";
import { cn } from "./utils";
import { useGlassMorph } from "./motion";
import { useHoverReveal } from "./hover-reveal";

/*
 * visionOS buttons (Figma: Buttons). Sizes, paddings, radii and type come from
 * the kit:
 *   text    small 32 (px 12, Callout) · regular 44 (px 20, Body semibold) · large 52 (px 25, Title 3 semibold)
 *   symbol  mini 28 · small 32 · regular 44 · large 52 · extra-large 64
 *   radius  capsule; rounded rect 8 / 12 / 16
 * States (hover glow, pinch, disabled, selected) live in globals.css.
 */
const buttonVariants = cva(
  [
    "vision-control vision-surface relative inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none",
    "outline-none transition-[background-color,color] duration-150 ease-(--ease-spring)",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&[data-with-symbol]_svg]:size-(--symbol)",
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
        small: "h-8 px-3 text-callout [&_svg]:size-4",
        regular: "h-11 px-5 text-body font-semibold [&_svg]:size-5",
        large: "h-13 px-[1.5625rem] text-title-3 font-semibold [&_svg]:size-[1.625rem]",
        "extra-large": "h-16 px-7 text-title-3 font-semibold [&_svg]:size-8",
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

function ButtonContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span data-vision-content className={cn("inline-flex min-w-0 items-center justify-center gap-1.5", className)}>
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
  const nodes = Children.toArray(children);
  const withSymbol =
    nodes.some((node) => typeof node === "string" || typeof node === "number") &&
    nodes.some((node) => isValidElement(node));
  return (
    <ButtonPrimitive
      data-slot="button"
      data-control-size={size ?? "regular"}
      data-with-symbol={withSymbol ? "" : undefined}
      data-platter={variant === "plain" ? "false" : undefined}
      className={cn(buttonVariants({ shape, size }), className)}
      {...props}
    >
      <MaterialLayers kind={variant === "glass" ? "glass" : "platter"} />
      <ButtonContent className={withSymbol && (size ?? "regular") === "small" ? "gap-0.5" : undefined}>{children as React.ReactNode}</ButtonContent>
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

type BackButtonProps = Omit<ButtonPrimitive.Props, "children" | "aria-label"> & { label: string };

/** Leading-anchored circle → capsule from WWDC25/303; icon/text never scale. */
function BackButton({ label, className, ref, ...props }: BackButtonProps) {
  const host = useRef<HTMLElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [labelWidth, setLabelWidth] = useState(0);
  const intent = useHoverReveal(!props.disabled);
  useGlassMorph(host, true, 760);
  useLayoutEffect(() => {
    const label = text.current;
    if (!label) return;
    const measure = () => setLabelWidth(label.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(label);
    return () => observer.disconnect();
  }, [label]);
  return <ButtonPrimitive {...props}
    ref={(node) => {
      host.current = node;
      const button = node instanceof HTMLButtonElement ? node : null;
      if (typeof ref === "function") ref(button);
      else if (ref) ref.current = button;
    }}
    aria-label={label} data-slot="back-button" data-revealed={intent.revealed ? "" : undefined}
    className={cn("vision-control vision-surface vision-back-button relative inline-flex h-11 shrink-0 items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label", className)}
    style={{ ...props.style, width: intent.revealed ? `calc(2.75rem + ${labelWidth}px + .875rem)` : "2.75rem" }}
    onPointerEnter={(event) => { intent.onPointerEnter(event); props.onPointerEnter?.(event); }}
    onPointerLeave={(event) => { intent.onPointerLeave(event); props.onPointerLeave?.(event); }}
    onFocusCapture={(event) => { intent.onFocusCapture(event); props.onFocusCapture?.(event); }}
    onBlurCapture={(event) => { intent.onBlurCapture(event); props.onBlurCapture?.(event); }}>
    <MaterialLayers kind="platter" />
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center"><ChevronLeft className="size-5" /></span>
    <span ref={text} aria-hidden className="vision-back-label shrink-0 whitespace-nowrap text-body font-semibold">{label}</span>
  </ButtonPrimitive>;
}

export { BackButton, Button, ButtonContent, IconButton, buttonVariants };
export type { BackButtonProps, ButtonProps, ButtonVariant, IconButtonProps };
