"use client";

import { Tabs } from "@base-ui/react/tabs";
import type * as React from "react";

import { Highlight } from "./selection";
import { cn } from "./utils";

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
  /** Vertical only: show the labels beside the symbols. */
  expanded?: boolean;
  /** Horizontal: the iOS tab bar. Vertical: a column of the same tabs, for wide layouts. */
  orientation?: "vertical" | "horizontal";
  /** Regular-width iPad layout puts labels beside symbols. */
  layout?: "compact" | "regular";
  className?: string;
};

/*
 * iOS 26/27 tab bar: a floating glass capsule; each tab a symbol over its caption. The chosen tab is
 * tinted and sits on a fill that glides between tabs (Fluid Kit Indicator), never a second glass.
 */
function TabBar({
  label,
  tabs,
  value,
  defaultValue,
  onValueChange,
  expanded = false,
  orientation = "horizontal",
  layout = "compact",
  className,
}: TabBarProps) {
  const vertical = orientation === "vertical";
  return (
    <Tabs.Root
      orientation={orientation}
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={(next) => onValueChange?.(String(next))}
      className={className}
    >
      <Tabs.List
        aria-label={label}
        className={cn(
          "lb relative isolate flex gap-0.5 rounded-full p-1 touch-none select-none",
          vertical && "flex-col",
        )}
      >
        <Highlight variant="tabs" items="[role=tab]" rest="[data-active]" />
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              "flex items-center justify-center rounded-full text-label outline-none data-active:text-accent [&_svg]:size-6",
              (vertical && expanded) || (!vertical && layout === "regular")
                ? "h-12 gap-2 px-4 text-subheadline font-medium"
                : "min-h-13 min-w-16 flex-col gap-0.5 px-3 text-caption-2 font-medium",
            )}
          >
            <span aria-hidden className="flex">
              {tab.icon}
            </span>
            {!vertical || expanded ? (
              tab.label
            ) : (
              <span className="sr-only">{tab.label}</span>
            )}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export { TabBar };
export type { TabBarProps, TabBarTab };
