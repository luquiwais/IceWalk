"use client";

import { NumberField as Primitive } from "@base-ui/react/number-field";
import { Minus, Plus } from "lucide-react";
import { Field } from "./field";
import { INPUT, SURFACE, useInputValue } from "./input-utils";
import { cn } from "./utils";

type NumberFieldProps = {
  label: string;
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  locale?: string;
  format?: Intl.NumberFormatOptions;
  unit?: string;
  controls?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  description?: string;
  error?: string;
  showLabel?: boolean;
  className?: string;
};

/** Numeric behavior and locale parsing come from Base UI; the surface matches TextField. */
function NumberField({ label, value, defaultValue, onValueChange, min, max, step = 1, precision, locale = "en-US", format, unit, controls = false, disabled, readOnly, required, name, id, description, error, showLabel, className }: NumberFieldProps) {
  const [current, change] = useInputValue<number | null>(value, defaultValue ?? null, onValueChange);
  const numberFormat = { ...format, ...(precision === undefined ? {} : { minimumFractionDigits: precision, maximumFractionDigits: precision }) };
  const text = current === null ? "" : new Intl.NumberFormat(locale, numberFormat).format(current);
  return (
    <Field {...{ label, id, description, error, showLabel, className }}>{(field) => (
      <Primitive.Root id={field.id} value={current} onValueChange={(next) => change(next)} min={min} max={max} step={step} largeStep={step * 10} locale={locale} format={numberFormat} disabled={disabled} readOnly={readOnly} required={required} name={name}>
        <Primitive.Group data-disabled={disabled ? "" : undefined} className={cn(SURFACE, controls && "pr-1")}>
          <Primitive.Input {...field} role="spinbutton" aria-roledescription={undefined} aria-valuenow={current ?? undefined} aria-valuemin={min} aria-valuemax={max} aria-valuetext={[text, unit].filter(Boolean).join(" ")} className={INPUT}
            onKeyDown={(event) => {
              if (disabled || readOnly || !["PageUp", "PageDown"].includes(event.key)) return;
              event.preventDefault();
              const next = (current ?? 0) + step * 10 * (event.key === "PageUp" ? 1 : -1);
              change(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, next)));
            }}
          />
          {unit ? <span aria-hidden className="relative text-body text-label">{unit}</span> : null}
          {controls ? <span className="relative flex shrink-0 gap-1">
            <Primitive.Decrement aria-label={`Decrease ${label}`} className="flex size-10 items-center justify-center rounded-full outline-none hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled"><Minus aria-hidden className="size-4" /></Primitive.Decrement>
            <Primitive.Increment aria-label={`Increase ${label}`} className="flex size-10 items-center justify-center rounded-full outline-none hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled"><Plus aria-hidden className="size-4" /></Primitive.Increment>
          </span> : null}
        </Primitive.Group>
      </Primitive.Root>
    )}</Field>
  );
}
export { NumberField };
export type { NumberFieldProps };
