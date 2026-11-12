"use client";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { useDrag, useMergedRefs } from "@fluidkit/react";
import { Check, Minus } from "lucide-react";
import { useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

/**
 * iOS switch, as in Fluid Kit's Drag example: tap or Space toggles; dragged, the knob follows and
 * snaps to the side it's let go nearer or flicked toward. The knob is white glass at rest and a
 * clear lens while held.
 */
function Switch({ label, className, showLabel = true, checked: controlled, defaultChecked = false, onCheckedChange, disabled, name }: SelectionProps) {
  const id = useId();
  const [own, setOwn] = useState(defaultChecked);
  const checked = controlled ?? own;
  const change = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onCheckedChange?.(next);
  };
  const toggle = useRef<HTMLButtonElement>(null);
  const drag = useDrag({
    axis: "x",
    snaps: ({ width, element }) => [0, width - element.offsetWidth - 4],
    snap: checked ? 1 : 0,
    onSnapChange: (snap) => change(snap === 1),
    rubberband: 0,
    disabled,
    spring: { duration: 0.3, bounce: 0 },
    follow: { duration: 0.18, bounce: 0 },
    onMove: ({ x }) => {
      const el = toggle.current!;
      const travel = el.clientWidth - el.firstElementChild!.clientWidth - 4;
      el.style.setProperty("--on", String(x / travel));
    },
  });
  return (
    <span className={cn("inline-flex min-h-11 items-center gap-3 text-body", className)}>
      <button
        ref={useMergedRefs(toggle, drag.handle)}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        data-checked={checked ? "" : undefined}
        className="ui-switch"
        style={{ "--on": checked ? 1 : 0 } as CSSProperties}
        onClick={() => change(!checked)}
      >
        <span ref={drag.element} className="ui-switch-thumb lb" />
      </button>
      {name ? <input type="hidden" name={name} value={checked ? "on" : ""} /> : null}
      <span id={id} className={cn(!showLabel && "sr-only", disabled && "text-label-disabled")}>{label}</span>
    </span>
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
        className="relative flex transition-colors size-7 shrink-0 items-center justify-center rounded-full bg-black/10 text-label shadow-[inset_0_-0.5px_1px_rgb(255_255_255/0.3),inset_1px_1.5px_4px_rgb(0_0_0/0.08)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label data-checked:bg-accent data-checked:shadow-none data-checked:backdrop-blur-[20px] data-indeterminate:bg-accent data-disabled:bg-white/10 data-disabled:text-label-disabled"
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
