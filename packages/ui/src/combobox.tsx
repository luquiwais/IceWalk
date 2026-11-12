"use client";

import { Combobox as Primitive } from "@base-ui/react/combobox";
import { Check, ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Field } from "./field";
import { MaterialLayers } from "./material";
import { PopupContent } from "./motion";
import { INPUT, SURFACE, POPUP, OPTION } from "./input-utils";
import type { SelectOption } from "./select";

type ComboboxProps = {
  label: string;
  options: SelectOption[];
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  error?: string;
  description?: string;
  className?: string;
};

/** Not a source-kit family: composes its TextField and menu materials. */
function Combobox({ label, options, value, defaultValue, onValueChange, placeholder, disabled, required, name, error, description, className }: ComboboxProps) {
  const anchor = useRef<HTMLDivElement>(null);
  const items = options.map((option) => option.value);
  const optionLabel = (item: string) => options.find((option) => option.value === item)?.label ?? item;
  return <Field {...{ label, error, description, className }}>{(field) => (
    <Primitive.Root items={items} value={value} defaultValue={defaultValue} onValueChange={(next) => onValueChange?.(next)} itemToStringLabel={optionLabel} filter={(item, query) => optionLabel(item).toLocaleLowerCase().includes(query.toLocaleLowerCase())} disabled={disabled} required={required} name={name}>
      <div ref={anchor} data-disabled={disabled ? "" : undefined} className={SURFACE}>
        <MaterialLayers kind={disabled ? "regular" : "recessed"} />
        <Primitive.Input {...field} placeholder={placeholder} className={INPUT} />
        <Primitive.Trigger aria-label={`Show ${label} options`} className="vision-input-control relative flex h-11 w-8 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-label"><ChevronDown aria-hidden className="size-5" /></Primitive.Trigger>
      </div>
      <Primitive.Portal><Primitive.Positioner anchor={anchor} sideOffset={8} align="start" className="z-50">
        <Primitive.Popup className={POPUP}>
          <MaterialLayers kind="glass" />
          <PopupContent>
            <Primitive.Empty className="px-5 py-3 text-body empty:hidden">No matching options</Primitive.Empty>
            <Primitive.List className="flex flex-col gap-2">{(item: string) => <Primitive.Item key={item} value={item} disabled={options.find((option) => option.value === item)?.disabled} data-platter="false" className={OPTION}>
              <MaterialLayers kind="platter" />
              <span className="relative flex w-5 shrink-0"><Primitive.ItemIndicator><Check aria-hidden className="size-4" /></Primitive.ItemIndicator></span>
              <span className="relative">{optionLabel(item)}</span>
            </Primitive.Item>}</Primitive.List>
          </PopupContent>
        </Primitive.Popup>
      </Primitive.Positioner></Primitive.Portal>
    </Primitive.Root>
  )}</Field>;
}
export { Combobox };
export type { ComboboxProps };
