"use client";

import { RadioGroup as GroupPrimitive } from "@base-ui/react/radio-group";
import { Radio as Primitive } from "@base-ui/react/radio";
import { useId, type ReactNode } from "react";
import { Field } from "./field";
import { cn } from "./utils";

type RadioGroupProps = {
  label: string;
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
};

function RadioGroup({ label, children, value, defaultValue, onValueChange, name, disabled, required, error, description, className }: RadioGroupProps) {
  return <Field group {...{ label, error, description, className }}>{(field) => (
    <GroupPrimitive {...field} value={value} defaultValue={defaultValue} onValueChange={(next) => onValueChange?.(next)} name={name} disabled={disabled} required={required} className="flex flex-col gap-1">{children}</GroupPrimitive>
  )}</Field>;
}

function Radio({ value, label, disabled, className }: { value: string; label: ReactNode; disabled?: boolean; className?: string }) {
  const id = useId();
  return <label className={cn("inline-flex min-h-11 cursor-pointer items-center gap-3 text-body has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:text-label-disabled", className)}>
    <Primitive.Root render={<button type="button" />} nativeButton value={value} disabled={disabled} aria-labelledby={id} className="relative flex transition-colors size-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-label shadow-[inset_0_-0.5px_1px_rgb(255_255_255/0.3),inset_1px_1.5px_4px_rgb(0_0_0/0.08)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label data-checked:bg-accent data-disabled:bg-white/10">
      <Primitive.Indicator className="size-3 rounded-full bg-white" />
    </Primitive.Root>
    <span id={id}>{label}</span>
  </label>;
}
export { RadioGroup, Radio };
export type { RadioGroupProps };
