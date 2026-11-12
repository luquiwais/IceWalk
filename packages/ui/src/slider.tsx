"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { MaterialLayers } from "./material";
import { cn } from "./utils";

type SliderProps = {
  label: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: "mini" | "small" | "regular" | "large";
  variant?: "default" | "segmented" | "color";
  leading?: ReactNode;
  trailing?: ReactNode;
  gradient?: string;
  onValueChange?: (value: number) => void;
  className?: string;
};

/** Endpoint symbol canvas per slider size: SF 13/15/19/24pt Medium (ink 11.9/13.7/17.3/21.9). */
const ENDPOINT_ICON = {
  mini: "[&_svg]:size-3.5",
  small: "[&_svg]:size-4",
  regular: "[&_svg]:size-5",
  large: "[&_svg]:size-[1.625rem]",
} as const;

/** Figma Sliders: 288pt track, 16/20/28/44pt heights. Native range behavior. */
function Slider({
  label,
  value,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  size = "regular",
  variant = "default",
  leading,
  trailing,
  gradient = "linear-gradient(90deg,#ff453a,#ffd60a,#32d74b,#64d2ff,#0a84ff,#bf5af2,#ff453a)",
  onValueChange,
  className,
}: SliderProps) {
  const id = useId();
  const [localValue, setValue] = useState(defaultValue);
  const current = Math.max(min, Math.min(max, value ?? localValue));
  const fraction = max > min ? (current - min) / (max - min) : 0;
  return (
    <div
      data-slot="slider"
      data-size={size}
      data-variant={variant}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "vision-slider flex w-72 max-w-full items-center gap-3",
        className,
      )}
      style={
        {
          "--range-value": fraction,
          "--range-gradient": gradient,
        } as CSSProperties
      }
    >
      {leading ? (
        <span
          aria-hidden
          className={cn("range-endpoint flex size-7 shrink-0 items-center justify-center", ENDPOINT_ICON[size])}
        >
          {leading}
        </span>
      ) : null}
      <div className="vision-surface range-track relative min-w-0 flex-1 rounded-full">
        <MaterialLayers kind={disabled ? "regular" : "recessed"} />
        {variant === "color" ? (
          <span
            aria-hidden
            className="range-color absolute inset-0 rounded-full"
          />
        ) : (
          <span
            aria-hidden
            className="range-fill absolute inset-y-0 left-0 rounded-full"
          />
        )}
        {variant === "segmented" ? (
          <span
            aria-hidden
            className="range-divisions absolute inset-0 rounded-full"
          />
        ) : null}
        {variant === "color" ? (
          <span
            aria-hidden
            className="range-knob absolute top-1/2 rounded-full border-2 border-white"
          />
        ) : null}
        {variant !== "color" ? <span aria-hidden className="range-spatial-thumb absolute top-1/2 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/.3)]" /> : null}
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          aria-valuetext={`${current}`}
          onChange={(event) => {
            const next = Number(event.target.value);
            setValue(next);
            onValueChange?.(next);
          }}
          className="vision-range-input absolute inset-x-0 top-1/2 z-1 m-0 h-11 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed"
        />
      </div>
      {trailing ? (
        <span
          aria-hidden
          className={cn("range-endpoint flex size-7 shrink-0 items-center justify-center", ENDPOINT_ICON[size])}
        >
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

export { Slider };
export type { SliderProps };
