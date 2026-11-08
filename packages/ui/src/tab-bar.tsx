"use client";

import { Tabs } from "@base-ui/react/tabs";
import type * as React from "react";

import { MaterialLayers } from "./material";
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
  className?: string;
};

/*
 * visionOS tab bar (Figma: Tab Bars, collapsed): a vertical glass ornament on
 * the leading side of a window. 68pt wide, radius 34, padding 12, gap 12,
 * tabs of 44, symbols of 19pt.
 *   Unselected idle: no fill, secondary symbol.
 *   Unselected hover: white 7% + #5E5E5E 18% color-dodge, glow, primary symbol.
 *   Selected: white 7% + #5E5E5E 18% color-dodge, primary symbol (+ glow on hover).
 * The label shows as a tooltip, like the expanded tab bar.
 */
function TabBar({ label, tabs, value, defaultValue, onValueChange, className }: TabBarProps) {
  return (
    <Tabs.Root
      orientation="vertical"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(String(next))}
      className={className}
    >
      <Tabs.List
        aria-label={label}
        className="vision-surface relative flex w-[4.25rem] flex-col items-center gap-3 rounded-tab-bar p-3 [--glass-stroke-width:1.4px] [--glass-stroke-angle:155.104deg] [--glass-stroke-start:4.8235%] [--glass-stroke-fade:38.0778%] [--glass-stroke-rise:56.677%] [--glass-stroke-end:95.1021%]"
      >
        <MaterialLayers kind="glass" />
        {tabs.map((tab) => (
          <Tooltip key={tab.value} label={tab.label} side="right">
            <Tabs.Tab
              value={tab.value}
              disabled={tab.disabled}
              aria-label={tab.label}
              data-platter="false"
              className={cn(
                "vision-control vision-surface group relative flex size-11 items-center justify-center rounded-full outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-label",
                "data-active:not-data-disabled:vision-selected hover:not-data-disabled:vision-selected",
                "hover:not-data-disabled:[--fill-glow:radial-gradient(50%_50%_at_50%_100%,rgb(255_255_255/0.06),transparent)]",
                "hover:not-data-disabled:[--fill-glow-dodge:radial-gradient(50%_50%_at_50%_100%,rgb(94_94_94/0.16),transparent)]",
              )}
            >
              <MaterialLayers kind="platter" />
              <Vibrancy className="[&_svg]:size-5">
                {tab.icon}
              </Vibrancy>
            </Tabs.Tab>
          </Tooltip>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export { TabBar };
export type { TabBarProps, TabBarTab };
