"use client";

import { OTPField as Primitive } from "@base-ui/react/otp-field";
import { Field } from "./field";
import { INPUT } from "./input-utils";

type OTPFieldProps = {
  label: string;
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  mask?: boolean;
  name?: string;
  error?: string;
  description?: string;
  className?: string;
};

function OTPField({ label, length = 6, value, defaultValue, onValueChange, onComplete, disabled, required, mask, name, error, description, className }: OTPFieldProps) {
  return <Field {...{ label, error, description, className }}>{(field) => (
    <Primitive.Root id={field.id} length={length} value={value} defaultValue={defaultValue} onValueChange={(next) => onValueChange?.(next)} onValueComplete={(next) => onComplete?.(next)} disabled={disabled} required={required} mask={mask} name={name} aria-describedby={field["aria-describedby"]} className="flex flex-wrap gap-2">
      {Array.from({ length }, (_, index) => <span key={index} data-disabled={disabled ? "" : undefined} className="ui-well relative flex size-11 focus-within:outline-2 focus-within:outline-label items-center rounded-xl">
        <Primitive.Input aria-label={index === 0 ? undefined : `${label} digit ${index + 1} of ${length}`} aria-describedby={field["aria-describedby"]} aria-invalid={field["aria-invalid"]} className={`${INPUT} w-11 text-center tabular-nums`} />
      </span>)}
    </Primitive.Root>
  )}</Field>;
}
export { OTPField };
export type { OTPFieldProps };
