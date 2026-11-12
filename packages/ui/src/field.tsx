"use client";

import { useId, type ReactNode, type RefObject } from "react";
import { cn } from "./utils";
import "./inputs.css";

type FieldControlProps = {
  id: string;
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  label: string;
  description?: string;
  error?: string;
  id?: string;
  showLabel?: boolean;
  /** Group controls (radios, sliders) are named by the label without a second fieldset group. */
  group?: boolean;
  /** For button-like controls: the label focuses this element instead of activating it. */
  focusTarget?: RefObject<HTMLElement | null>;
  className?: string;
  children: (props: FieldControlProps) => ReactNode;
};

/** Shared labeling and validation; the control owns its native form behavior. */
function Field({ label, description, error, id, showLabel = true, group = false, focusTarget, className, children }: FieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const describedBy = [description && `${controlId}-description`, error && `${controlId}-error`].filter(Boolean).join(" ") || undefined;
  const labelClass = showLabel ? "px-3 text-footnote" : "sr-only";
  return (
    <div className={cn("vision-field flex min-w-0 w-[19.0625rem] max-w-full flex-col gap-2", className)}>
      {group || focusTarget
        ? <span id={`${controlId}-label`} className={labelClass} onClick={focusTarget ? () => focusTarget.current?.focus() : undefined}>{label}</span>
        : <label id={`${controlId}-label`} htmlFor={controlId} className={labelClass}>{label}</label>}
      {children({ id: controlId, "aria-labelledby": `${controlId}-label`, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {description ? <p id={`${controlId}-description`} className="px-3 text-footnote text-label">{description}</p> : null}
      <p id={`${controlId}-error`} aria-live="polite" aria-atomic="true" className={error ? "px-3 text-footnote text-warning" : "sr-only"}>{error ?? ""}</p>
    </div>
  );
}

export { Field };
export type { FieldProps, FieldControlProps };
