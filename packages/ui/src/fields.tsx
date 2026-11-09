"use client";
import { Search, X } from "lucide-react";
import { useId, useRef, useState, type ComponentProps } from "react";
import { IconButton } from "./button";
import { MaterialLayers } from "./material";
import { cn } from "./utils";

type TextFieldProps = Omit<ComponentProps<"input">, "size" | "value" | "defaultValue"> & {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  shape?: "pill" | "rounded";
  kind?: "text" | "search" | "secure";
  showLabel?: boolean;
};

/** 305×44pt, radius 12 or capsule, Recessed material (Figma 487:10689). */
function TextField({ label, disabled, className, id, value, defaultValue = "", onValueChange, onChange, shape = "pill", kind = "text", showLabel = false, placeholder, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const input = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(defaultValue);
  const current = value ?? localValue;
  function change(next: string) { setLocalValue(next); onValueChange?.(next); }
  return <div className={cn("flex w-[19.0625rem] max-w-full flex-col gap-2", className)}>
    <label htmlFor={inputId} className={showLabel ? "px-3 text-footnote" : "sr-only"}>{label}</label>
    <div data-slot="text-field" data-disabled={disabled ? "" : undefined} className={cn(
      "vision-surface relative flex h-11 items-center gap-2 px-5",
      "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-label",
      shape === "pill" ? "rounded-full" : "rounded-xl",
      kind === "search" && "px-2",
    )}>
      <MaterialLayers kind={disabled ? "regular" : "recessed"} />
      {kind === "search" ? <span aria-hidden className="flex size-7 shrink-0 items-center justify-center text-label"><Search className="size-[1.1875rem]" strokeWidth={2} /></span> : null}
      <input {...props} id={inputId} ref={input} disabled={disabled} value={current} placeholder={placeholder}
        type={kind === "secure" ? "password" : kind === "search" ? "search" : props.type ?? "text"}
        onChange={event => { change(event.target.value); onChange?.(event); }}
        className="vision-input relative h-full min-w-0 flex-1 bg-transparent text-body text-label caret-accent outline-none placeholder:text-white/60 disabled:text-label-disabled [&::-webkit-search-cancel-button]:appearance-none" />
      {kind === "search" && current ? <IconButton label={`Clear ${label}`} disabled={disabled} size="mini" variant="plain" showTooltip={false} onClick={() => { change(""); input.current?.focus(); }}><X className="size-[1.0625rem]!" strokeWidth={2.5} /></IconButton> : null}
    </div>
  </div>;
}
export { TextField };
export type { TextFieldProps };
