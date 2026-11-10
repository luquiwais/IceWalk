"use client";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { Check, Minus } from "lucide-react";
import { useId, type ReactNode } from "react";
import { MaterialLayers } from "./material";
import { cn } from "./utils";

type SelectionProps = {
  label: ReactNode;
  disabled?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  className?: string;
  showLabel?: boolean;
  indeterminate?: boolean;
};

/** 56×32pt track, 28pt knob; the disabled state uses Regular, not green. */
function Switch({
  label,
  className,
  showLabel = true,
  onCheckedChange,
  ...props
}: SelectionProps) {
  const id = useId();
  const rootProps = { ...props };
  delete rootProps.indeterminate;
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3 text-body has-[[data-disabled]]:cursor-not-allowed",
        className,
      )}
    >
      <SwitchPrimitive.Root
        {...rootProps}
        aria-labelledby={id}
        onCheckedChange={(checked) => onCheckedChange?.(checked)}
        className="vision-switch vision-surface relative flex h-8 w-14 shrink-0 items-center rounded-full px-0.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label"
      >
        <MaterialLayers kind={props.disabled ? "regular" : "recessed"} />
        <SwitchPrimitive.Thumb
          data-slot="switch-thumb"
          className="vision-surface relative size-7 rounded-full bg-white shadow-[0_1px_1px_0_rgb(0_0_0/0.22)] data-checked:ml-6 data-disabled:bg-transparent data-disabled:shadow-none"
        >
          {props.disabled ? (
            <span className="vision-platter absolute inset-0 rounded-full [--fill-lighten:rgb(255_255_255/0.11)] [--fill-lighten-blend:normal] [--fill-dodge:rgb(94_94_94/0.21)]">
              <MaterialLayers kind="platter" />
            </span>
          ) : null}
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
      <span
        id={id}
        className={cn(
          !showLabel && "sr-only",
          props.disabled && "text-label-disabled",
        )}
      >
        {label}
      </span>
    </label>
  );
}

/** Circular 28pt checkbox from 487:10602, with a 44pt labelled hit area. */
function Checkbox({
  label,
  className,
  showLabel = true,
  onCheckedChange,
  ...props
}: SelectionProps) {
  const id = useId();
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3 text-body has-[[data-disabled]]:cursor-not-allowed",
        className,
      )}
    >
      <CheckboxPrimitive.Root
        {...props}
        aria-labelledby={id}
        onCheckedChange={(checked) => onCheckedChange?.(checked)}
        className="vision-checkbox relative flex size-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-label shadow-[inset_0_-0.5px_1px_rgb(255_255_255/0.3),inset_1px_1.5px_4px_rgb(0_0_0/0.08)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label data-checked:bg-accent data-checked:shadow-none data-checked:backdrop-blur-[20px] data-indeterminate:bg-accent data-disabled:bg-white/10 data-disabled:text-label-disabled"
      >
        <CheckboxPrimitive.Indicator keepMounted data-slot="checkbox-indicator">
          {props.indeterminate ? (
            <Minus aria-hidden className="size-4" strokeWidth={2.5} />
          ) : (
            <Check aria-hidden className="size-4" strokeWidth={2.5} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span
        id={id}
        className={cn(
          !showLabel && "sr-only",
          props.disabled && "text-label-disabled",
        )}
      >
        {label}
      </span>
    </label>
  );
}
export { Switch, Checkbox };
export type { SelectionProps };
