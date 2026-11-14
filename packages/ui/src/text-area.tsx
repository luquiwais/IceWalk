"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { Field } from "./field";
import { INPUT, SURFACE, useInputValue } from "./input-utils";
import { cn } from "./utils";

type TextAreaProps = Omit<ComponentProps<"textarea">, "value" | "defaultValue"> & {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  autoGrow?: boolean;
  counter?: boolean;
  description?: string;
  error?: string;
  showLabel?: boolean;
};

function TextArea({ label, value, defaultValue = "", onValueChange, autoGrow, counter, description, error, showLabel, className, disabled, id, rows = 3, ...props }: TextAreaProps) {
  const [current, change] = useInputValue(value, defaultValue, onValueChange);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!autoGrow || !textarea.current) return;
    textarea.current.style.height = "auto";
    textarea.current.style.height = `${textarea.current.scrollHeight}px`;
  }, [current, autoGrow]);
  return <Field {...{ label, id, description, error, showLabel, className }}>{(field) => <>
    <div data-disabled={disabled ? "" : undefined} className={cn(SURFACE, "items-start py-3")}>
      <textarea {...props} {...field} ref={textarea} rows={rows} disabled={disabled} value={current} onChange={(event) => { change(event.target.value); props.onChange?.(event); }} className={cn(INPUT, "h-auto min-h-11 w-full py-0", autoGrow ? "resize-none overflow-hidden" : "resize-y")} />
    </div>
    {counter ? <span className="px-3 text-right text-footnote tabular-nums">{current.length}{props.maxLength === undefined ? " characters" : ` / ${props.maxLength} characters`}</span> : null}
  </>}</Field>;
}
export { TextArea };
export type { TextAreaProps };
