"use client";

import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";

/** Gaze intent adapted to a mouse: cancel dwell on leave; keyboard is immediate. */
function useHoverReveal(enabled = true, delay = 180) {
  const [revealed, setRevealed] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = () => { clearTimeout(pending.current); pending.current = undefined; };
  useEffect(() => () => clearTimeout(pending.current), []);
  return {
    revealed: enabled && revealed,
    onPointerEnter(event: PointerEvent<HTMLElement>) {
      clear();
      if (!enabled || event.pointerType === "touch") return;
      pending.current = setTimeout(() => { pending.current = undefined; setRevealed(true); }, delay);
    },
    onPointerLeave(event: PointerEvent<HTMLElement>) {
      clear();
      const active = document.activeElement;
      if (!active || !event.currentTarget.contains(active) || !active.matches(":focus-visible")) setRevealed(false);
    },
    onFocusCapture(event: FocusEvent<HTMLElement>) {
      clear();
      if (enabled && event.target.matches(":focus-visible")) setRevealed(true);
    },
    onBlurCapture(event: FocusEvent<HTMLElement>) {
      if (!event.currentTarget.contains(event.relatedTarget)) { clear(); setRevealed(false); }
    },
  };
}

export { useHoverReveal };
