"use client";

import { RadioGroup as Group } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Star } from "lucide-react";
import { Field } from "./field";
import { useInputValue } from "./input-utils";

type RatingProps = {
  label: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  max?: number;
  disabled?: boolean;
  name?: string;
  error?: string;
  description?: string;
  className?: string;
};

function Rating({ label, value, defaultValue = 0, onValueChange, max = 5, disabled, name, error, description, className }: RatingProps) {
  const [current, change] = useInputValue(value, defaultValue, onValueChange);
  return <Field group {...{ label, error, description, className }}>{(field) => (
    <Group {...field} value={current} onValueChange={(next) => change(next)} disabled={disabled} name={name} className="flex flex-wrap">
      {Array.from({ length: max }, (_, index) => <Radio.Root key={index} value={index + 1} render={<button type="button" />} nativeButton aria-label={`${index + 1} of ${max} stars`} className="flex size-11 items-center justify-center rounded-full text-label outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-label data-disabled:text-label-disabled">
        <Star aria-hidden className="size-6" fill={index < current ? "currentColor" : "none"} />
      </Radio.Root>)}
    </Group>
  )}</Field>;
}
export { Rating };
export type { RatingProps };
