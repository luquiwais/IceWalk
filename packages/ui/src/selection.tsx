"use client";

import { createIndicator } from "@fluidkit/react";
import { useEffect, useRef } from "react";
import { cn } from "./utils";

type HighlightProps = {
  /** Selector of the items it moves between, inside its parent. */
  items: string;
  /** Selector of the item it rests on (the chosen one); none rests nowhere (menus). */
  rest?: string;
  /**
   * menu: follows the pointer and keyboard focus, as Fluid Kit's menu example.
   * tabs: a thumb on the chosen tab, dragged across by a press, as Fluid Kit's tabs example.
   */
  variant?: "menu" | "tabs";
  className?: string;
};

/**
 * The highlight that moves between a group's items, as in iOS tabs, segmented controls, sidebars
 * and menus: one element on Fluid Kit's Indicator, following the pointer and keyboard focus on
 * springs that keep their speed. Put it inside the group (its parent is the container). It's a
 * fill, not glass: glass never sits on glass. Base UI keeps roles, keyboard and the value; this
 * only draws, resting on whatever matches `rest` as attributes change.
 */
function Highlight({ items, rest, variant = "menu", className }: HighlightProps) {
  const thumb = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const indicator = thumb.current;
    const container = indicator?.parentElement;
    if (!indicator || !container) return;
    const tabs = variant === "tabs";
    // Tabs: it shows the choice; keyboard focus keeps its own ring
    const engine = createIndicator({ container, indicator, items, trigger: tabs ? "press" : "auto", focus: !tabs });
    const follow = () => {
      const chosen = rest ? container.querySelector<HTMLElement>(rest) : null;
      if (engine.rest !== chosen) engine.rest = chosen;
    };
    follow();
    const observer = new MutationObserver(follow);
    observer.observe(container, { subtree: true, attributes: true, attributeFilter: ["data-active", "aria-selected", "aria-current", "data-selected", "aria-checked"] });
    return () => {
      observer.disconnect();
      engine.destroy();
    };
  }, [items, rest, variant]);
  return <span ref={thumb} aria-hidden data-slot="highlight" className={cn(variant === "tabs" ? "ui-thumb" : "ui-highlight", "pointer-events-none absolute top-0 left-0 -z-1", className)} />;
}

export { Highlight };
