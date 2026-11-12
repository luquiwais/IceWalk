"use client";

import { Select as Primitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Field } from "./field";
import { MaterialLayers } from "./material";
import { PopupContent } from "./motion";
import { POPUP, OPTION, SURFACE } from "./input-utils";
import { cn } from "./utils";

type SelectOption = { value: string; label: string; disabled?: boolean; group?: string };
type SelectProps = {
  label: string;
  options: SelectOption[];
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  showLabel?: boolean;
  description?: string;
  error?: string;
  className?: string;
};

/** A value selector, distinct from the action-only DropdownMenu. */
function Select({ label, options, value, defaultValue, onValueChange, placeholder = "Choose an option", disabled, required, name, id, showLabel, description, error, className }: SelectProps) {
  const trigger = useRef<HTMLButtonElement>(null);
  const groups = [...new Set(options.map((option) => option.group))];
  return <Field {...{ label, id, showLabel, description, error, className }} focusTarget={trigger}>{(field) => (
    <Primitive.Root items={options} value={value} defaultValue={defaultValue} onValueChange={(next) => onValueChange?.(next)} disabled={disabled} required={required} name={name}>
      <Primitive.Trigger {...field} ref={trigger} className={cn(SURFACE, "vision-input-control w-full text-body text-label outline-none")}>
        <MaterialLayers kind={disabled ? "regular" : "recessed"} />
        <Primitive.Value placeholder={placeholder} className="relative min-w-0 flex-1 truncate text-left" />
        <Primitive.Icon className="relative"><ChevronDown aria-hidden className="size-5" /></Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Positioner sideOffset={8} alignItemWithTrigger={false} className="z-50">
          <Primitive.Popup className={POPUP}>
            <MaterialLayers kind="glass" />
            <PopupContent>
              <Primitive.List className="flex flex-col gap-2">
                {groups.map((group) => <Primitive.Group key={group ?? "ungrouped"} className="flex flex-col gap-2">
                  {group ? <Primitive.GroupLabel className="px-5 py-2 text-footnote font-bold text-label">{group}</Primitive.GroupLabel> : null}
                  {options.filter((option) => option.group === group).map((option) => <Primitive.Item key={option.value} value={option.value} disabled={option.disabled} data-platter="false" className={OPTION}>
                    <MaterialLayers kind="platter" />
                    <span className="relative flex w-5 shrink-0"><Primitive.ItemIndicator><Check aria-hidden className="size-4" /></Primitive.ItemIndicator></span>
                    <Primitive.ItemText className="relative">{option.label}</Primitive.ItemText>
                  </Primitive.Item>)}
                </Primitive.Group>)}
              </Primitive.List>
            </PopupContent>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  )}</Field>;
}
export { Select };
export type { SelectProps, SelectOption };
