"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
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

/**
 * iOS slider, drawn as Fluid Kit's slider example: a 6pt track filled to the value and a white
 * glass knob that turns into a lens, stretched along the track, while held. A native range input
 * does the work underneath (keyboard, touch, screen readers).
 */
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
  const endpoint = (content: ReactNode) => (
    <span aria-hidden className={cn("flex size-7 shrink-0 items-center justify-center text-label-secondary", ENDPOINT_ICON[size])}>{content}</span>
  );
  return (
    <div
      data-slot="slider"
      data-variant={variant}
      data-disabled={disabled ? "" : undefined}
      className={cn("flex w-72 max-w-full items-center gap-3 data-disabled:opacity-40", className)}
      style={{ "--v": fraction } as CSSProperties}
    >
      {leading ? endpoint(leading) : null}
      <div className="ui-slider">
        <span className="ui-slider-track" style={variant === "color" ? { background: gradient } : undefined}>
          {variant === "color" ? null : <span className="ui-slider-fill" />}
        </span>
        <span aria-hidden className="ui-slider-knob lb lb-stretch" />
        <label htmlFor={id} className="sr-only">{label}</label>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={variant === "segmented" ? (max - min) / 4 : step}
          value={current}
          disabled={disabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            setValue(next);
            onValueChange?.(next);
          }}
          className="ui-slider-input"
        />
      </div>
      {trailing ? endpoint(trailing) : null}
    </div>
  );
}

export { Slider };
export type { SliderProps };
