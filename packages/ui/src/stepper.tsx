"use client";

import { NumberField as Primitive } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { Field } from "./field";
import { INPUT, useInputValue } from "./input-utils";

type StepperProps = {
  label: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  showLabel?: boolean;
  onValueChange?: (value: number) => void;
  unit?: string;
  error?: string;
  description?: string;
  className?: string;
};

/** A numeric spinbutton with press-and-hold controls, including pointer cancellation. */
function Stepper({ label, value, defaultValue = 0, min, max, step = 1, disabled, required, name, id, showLabel, onValueChange, unit, error, description, className }: StepperProps) {
  const [current, change] = useInputValue(value, defaultValue, onValueChange);
  return <Field {...{ label, id, showLabel, error, description, className }}>{(field) => (
    <Primitive.Root id={field.id} value={current} min={min} max={max} step={step} largeStep={10 * step} disabled={disabled} required={required} name={name} onValueChange={(next) => { if (next !== null) change(next); }}>
      <Primitive.Group data-disabled={disabled ? "" : undefined} className="ui-well relative flex items-center rounded-full focus-within:outline-2 focus-within:outline-label">
        <Primitive.Decrement aria-label={`Decrease ${label}`} className="relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled"><Minus aria-hidden className="size-5" /></Primitive.Decrement>
        <Primitive.Input {...field} role="spinbutton" aria-roledescription={undefined} aria-valuenow={current} aria-valuemin={min} aria-valuemax={max} aria-valuetext={`${current}${unit ? ` ${unit}` : ""}`} className={`${INPUT} w-16 text-center tabular-nums`} />
        {unit ? <span aria-hidden className="relative pr-1 text-footnote">{unit}</span> : null}
        <Primitive.Increment aria-label={`Increase ${label}`} className="relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled"><Plus aria-hidden className="size-5" /></Primitive.Increment>
      </Primitive.Group>
    </Primitive.Root>
  )}</Field>;
}
export { Stepper };
export type { StepperProps };
