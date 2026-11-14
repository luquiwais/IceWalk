"use client";

import { useMorph } from "@fluidkit/react";
import { useCallback, useEffect, useRef, useState, type Ref } from "react";

type MorphPopupOptions = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A Base UI popup (menu, popover, dialog) that grows out of its trigger and shrinks back into it,
 * with Fluid Kit's Morph: one continuous shape on interruptible springs. Base UI keeps behavior
 * (focus, keyboard, dismissal, positioning); Morph owns the transition.
 *
 *   const popup = useMorphPopup();
 *   <Menu.Root {...popup.root}>
 *     <Menu.Trigger ref={popup.trigger} />
 *     <Menu.Positioner><Menu.Popup ref={popup.popup} /></Menu.Positioner>
 *   </Menu.Root>
 *
 * Base UI mounts the popup while `root.open` is true. Opening mounts it first, then flies once it
 * is positioned; closing flies back first, then unmounts, so Base UI never cuts the shape short.
 *
 * The trigger stays visible: the morph's first state is an invisible stand-in laid over it
 * (`<MorphOrigin ref={popup.trigger} />` inside the trigger), so the glass grows out of the button
 * while the button itself never hides.
 */
function useMorphPopup({ open: controlled, defaultOpen = false, onOpenChange }: MorphPopupOptions = {}) {
  const [own, setOwn] = useState(defaultOpen);
  const wanted = controlled ?? own;
  const [mounted, setMounted] = useState(wanted);
  const morph = useMorph<"trigger" | "popup">({
    defaultValue: wanted ? "popup" : "trigger",
    container: typeof document === "undefined" ? null : document.body,
  });
  const { to, state } = morph;
  const element = useRef<HTMLElement | null>(null);
  const joined = useRef(false);
  /** Open from the first render (server HTML included): already in place, nothing to fly */
  const first = useRef(wanted);
  const button = useRef<HTMLElement | null>(null);
  const triggerState = state("trigger");
  const trigger = useCallback(
    (el: HTMLElement | null) => {
      button.current = el;
      triggerState(el);
    },
    [triggerState],
  );

  // The popup joins the morph only when it's about to fly. Until then it's transparent but still
  // focusable, so Base UI can move focus into it (a hidden morph state couldn't take focus).
  const popup = useCallback(
    (el: HTMLElement | null) => {
      element.current = el;
      if (el && !first.current) el.style.opacity = "0";
      else if (joined.current) {
        joined.current = false;
        state("popup")(null);
      }
    },
    [state],
  );

  // Opening: mount, then fly once the positioner has placed the popup (two frames).
  // Closing: fly back into the trigger, then unmount. Reversing mid-way just retargets.
  useEffect(() => {
    if (wanted && first.current) {
      first.current = false;
      if (element.current) {
        joined.current = true;
        state("popup")(element.current);
      }
      return;
    }
    first.current = false;
    if (wanted) {
      setMounted(true);
      // Reopened while it was still flying back: turn around at once
      if (joined.current) {
        void to("popup");
        return;
      }
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!element.current) return;
          joined.current = true;
          // The morph keeps a state's own inline styles: hand it over clean
          element.current.style.opacity = "";
          state("popup")(element.current);
          void to("popup");
        });
      });
      return () => cancelAnimationFrame(frame);
    }
    // No trigger to fly into (not rendered yet, or gone): close in place
    if (!button.current || !joined.current) {
      setMounted(false);
      return;
    }
    let current = true;
    void to("trigger").then((rested) => {
      if (rested && current) setMounted(false);
    });
    return () => {
      current = false;
    };
  }, [wanted, to, state]);

  const change = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setOwn(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  return {
    /** Spread on the Base UI Root */
    root: { open: mounted, onOpenChange: change },
    /** The ref for the trigger */
    trigger,
    /** The ref for the popup */
    popup,
    /** Asked to be open (the shape may still be flying) */
    open: wanted,
  };
}

export { useMorphPopup };

/**
 * The invisible stand-in over a trigger that the popup's glass grows from and shrinks back into.
 * Render it inside the trigger (which is positioned): it takes the trigger's box and corners.
 */
function MorphOrigin({ ref }: { ref: Ref<HTMLSpanElement> }) {
  return <span ref={ref} aria-hidden data-slot="morph-origin" className="pointer-events-none! absolute inset-0 rounded-[inherit]" />;
}

export { MorphOrigin };
