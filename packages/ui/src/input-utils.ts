"use client";

import { useRef, useState } from "react";

function useInputValue<T>(value: T | undefined, defaultValue: T, onChange?: (value: T) => void) {
  const [local, setLocal] = useState(defaultValue);
  const current = value === undefined ? local : value;
  const latest = useRef(current);
  latest.current = current;
  function change(next: T) {
    if (value === undefined) {
      latest.current = next;
      setLocal(next);
    }
    onChange?.(next);
  }
  return [current, change, latest] as const;
}

/** The text inside a field. */
const INPUT = "h-11 min-w-0 flex-1 bg-transparent text-body text-label caret-accent outline-none placeholder:text-label-tertiary disabled:text-label-disabled";
/** A field: a well cut into the glass; the focus ring and the invalid edge sit on it. */
const SURFACE = "ui-well relative flex min-h-11 items-center gap-2 rounded-xl px-5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-label has-aria-invalid:shadow-[inset_0_0_0_1px_var(--color-warning)] aria-invalid:shadow-[inset_0_0_0_1px_var(--color-warning)] data-disabled:text-label-disabled";
/** A list popup (select, combobox): glass on Fluid Kit's blur-replace. */
const POPUP = "lb ui-pop min-w-(--anchor-width) max-w-[calc(100vw-2rem)] max-h-[min(24rem,var(--available-height))] overflow-y-auto rounded-[1.75rem] p-3 text-label outline-none";
/** A row in a list popup. */
const OPTION = "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-body outline-none data-highlighted:bg-white/10 data-disabled:cursor-not-allowed data-disabled:text-label-disabled";

export { useInputValue, INPUT, SURFACE, POPUP, OPTION };
