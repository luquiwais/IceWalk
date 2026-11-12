"use client";

import { Tabs } from "@base-ui/react/tabs";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { LiquidIndicator, useGlassMorph } from "./motion";
import { useHoverReveal } from "./hover-reveal";
import { Tooltip } from "./tooltip";
import { cn } from "./utils";
import { Vibrancy } from "./vibrancy";

type TabBarTab = {
  value: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
};

type TabBarProps = {
  /** Accessible name of the tab list. */
  label: string;
  tabs: TabBarTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Figma "Expanded=True": 150pt wide, 126x44 tabs with the label (19 Medium) after the symbol. */
  expanded?: boolean;
  /** Expand on mouse intent or keyboard focus, preserving the icon anchors. */
  expandOnHover?: boolean;
  /** Horizontal is only for compact web layouts; the visionOS default stays vertical. */
  orientation?: "vertical" | "horizontal";
  className?: string;
};

/*
 * visionOS tab bar (Figma: Tab Bars, collapsed): a vertical glass ornament on
 * the leading side of a window. 68pt wide, radius 34, padding 12, gap 12,
 * tabs of 44, symbols of 19pt.
 *   Unselected idle: no fill, secondary symbol.
 *   Unselected hover: white 7% + #5E5E5E 18% color-dodge, glow, primary symbol.
 *   Selected: white 7% + #5E5E5E 18% color-dodge, primary symbol (+ glow on hover).
 * Collapsed, the label shows as a tooltip. Expanded (Figma Tabs=N, Expanded=True):
 * 150pt wide, tabs 126x44 (symbol slot 44, gap 4, trailing padding 28), label
 * 19pt Medium in the same vibrancy as the symbol. Height is 56N+12 either way.
 */
function TabBar({
  label,
  tabs,
  value,
  defaultValue,
  onValueChange,
  expanded = false,
  expandOnHover = true,
  orientation = "vertical",
  className,
}: TabBarProps) {
  const host = useRef<HTMLDivElement>(null);
  const [labelWidth, setLabelWidth] = useState(0);
  const intent = useHoverReveal(expandOnHover && orientation === "vertical");
  const isExpanded = expanded || intent.revealed;
  // The long, low-velocity tail belongs to hover reveal, not click response.
  // Measured Back example: WWDC25/303, 142.27–143.00s; web playback 760ms.
  useGlassMorph(host, true, 760);
  useLayoutEffect(() => {
    const labels = [...(host.current?.querySelectorAll<HTMLElement>(".vision-tab-label") ?? [])];
    const measure = () => setLabelWidth(Math.max(0, ...labels.map(label => label.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    labels.forEach(label => observer.observe(label));
    return () => observer.disconnect();
  }, [tabs]);
  return (
    <Tabs.Root
      orientation={orientation}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(String(next))}
      className={className}
    >
      <Tabs.List
        ref={host}
        aria-label={label}
        onPointerEnter={intent.onPointerEnter}
        onPointerLeave={intent.onPointerLeave}
        onFocusCapture={intent.onFocusCapture}
        onBlurCapture={intent.onBlurCapture}
        data-motion-tabs="tabs"
        data-expanded={isExpanded ? "" : undefined}
        style={isExpanded && orientation === "vertical" ? { width: `max(9.375rem, calc(6.25rem + ${labelWidth}px))` } : undefined}
        className={cn(
          "vision-surface vision-spatial-tabs relative flex gap-3 overflow-clip rounded-tab-bar p-3",
          orientation === "vertical" ? "flex-col" : "flex-row",
          isExpanded
            ? "w-[9.375rem] items-stretch"
            : orientation === "vertical"
              ? "w-[4.25rem] items-center"
              : "items-center",
          "[--glass-stroke-width:1.4px] [--glass-stroke-angle:155.104deg] [--glass-stroke-start:4.8235%] [--glass-stroke-fade:38.0778%] [--glass-stroke-rise:56.677%] [--glass-stroke-end:95.1021%]",
        )}
      >
        <MaterialLayers kind="glass" />
        <LiquidIndicator />
        {tabs.map((tab) => {
          const item = (
            <Tabs.Tab
              value={tab.value}
              disabled={tab.disabled}
              aria-label={tab.label}
              data-platter="false"
              className={cn(
                "vision-control vision-surface group relative flex h-11 items-center rounded-full outline-none",
                isExpanded
                  ? "min-w-[7.875rem] justify-start gap-1 pr-7"
                  : "w-11 justify-start",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label",
                "hover:not-data-active:not-data-disabled:vision-selected",
                "hover:not-data-disabled:[--fill-glow:radial-gradient(50%_50%_at_50%_100%,rgb(255_255_255/0.06),transparent)]",
                "hover:not-data-disabled:[--fill-glow-dodge:radial-gradient(50%_50%_at_50%_100%,rgb(94_94_94/0.16),transparent)]",
              )}
            >
              <MaterialLayers kind="platter" />
              <>
                  <Vibrancy className="size-11 shrink-0 place-items-center [&_svg]:size-5">
                    {tab.icon}
                  </Vibrancy>
                  <Vibrancy aria-hidden={!isExpanded || undefined} className="vision-tab-label text-left text-[1.1875rem] leading-6 font-medium whitespace-nowrap">
                    {tab.label}
                  </Vibrancy>
              </>
            </Tabs.Tab>
          );
          return (expandOnHover && orientation === "vertical") || expanded ? (
            <Fragment key={tab.value}>{item}</Fragment>
          ) : (
            <Tooltip key={tab.value} label={tab.label} side="right">
              {item}
            </Tooltip>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
}

export { TabBar };
export type { TabBarProps, TabBarTab };
