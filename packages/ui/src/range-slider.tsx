"use client";

import { Slider as Primitive } from "@base-ui/react/slider";
import { Field } from "./field";

type RangeSliderProps = {
  label: string;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  name?: string;
  unit?: string;
  description?: string;
  error?: string;
  className?: string;
};

/** Two-thumb composition using the source slider's 28pt regular track. */
function RangeSlider({ label, value, defaultValue, onValueChange, min = 0, max = 100, step = 1, disabled, name, unit, description, error, className }: RangeSliderProps) {
  return <Field group {...{ label, description, error, className }}>{(field) => (
    <Primitive.Root value={value} defaultValue={defaultValue ?? [min, max]} min={min} max={max} step={step} name={name} disabled={disabled} thumbCollisionBehavior="push" onValueChange={(next) => onValueChange?.([next[0], next[1]])} aria-labelledby={field["aria-labelledby"]}>
      <Primitive.Control className="relative flex h-11 w-full touch-none items-center">
        <Primitive.Track className="relative h-1.5 w-full rounded-full bg-[rgb(120_120_128/0.32)]">
          <Primitive.Indicator className="absolute inset-y-0 rounded-full bg-accent" />
          {[0, 1].map((index) => <Primitive.Thumb key={index} index={index} aria-label={`${label} ${index === 0 ? "minimum" : "maximum"}`} aria-describedby={field["aria-describedby"]} aria-invalid={field["aria-invalid"]} getAriaValueText={(formatted: string) => `${formatted}${unit ? ` ${unit}` : ""}`} className="lb lb-stretch absolute top-1/2 h-[22px] w-[34px] -translate-y-1/2 rounded-full [--lb-fill:#fff] [--lb-stretch-axis:x] [--lb-transparency:0] transition-[scale,--lb-lens,--lb-transparency] duration-300 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-dragging:scale-[1.4_1.45] data-dragging:[--lb-lens:1] data-dragging:[--lb-transparency:1] data-disabled:opacity-40" />)}
        </Primitive.Track>
      </Primitive.Control>
      <Primitive.Value className="block px-3 text-footnote tabular-nums">{(values: readonly string[]) => `${values[0]}–${values[1]}${unit ? ` ${unit}` : ""}`}</Primitive.Value>
    </Primitive.Root>
  )}</Field>;
}
export { RangeSlider };
export type { RangeSliderProps };
