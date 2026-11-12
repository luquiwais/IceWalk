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

const INPUT = "vision-input-control vision-input relative h-11 min-w-0 flex-1 bg-transparent text-body text-label caret-accent outline-none placeholder:text-white/60";
const SURFACE = "vision-input-surface vision-surface relative flex items-center gap-2 px-5";
const POPUP = "vision-input-popup vision-surface vision-popup-glass vision-motion-popup vision-motion-menu relative rounded-[1.75rem] p-3 text-label outline-none shadow-2xl [--glass-stroke-width:1.4px] [--glass-stroke-angle:150.286deg] [--glass-stroke-start:0%] [--glass-stroke-fade:40.569%] [--glass-stroke-rise:57.437%] [--glass-stroke-end:100%]";
const OPTION = "vision-input-option vision-control vision-surface relative flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-body outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label data-disabled:cursor-not-allowed";

export { useInputValue, INPUT, SURFACE, POPUP, OPTION };
