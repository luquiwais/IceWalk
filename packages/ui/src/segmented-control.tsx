"use client";

import { Tabs } from "@base-ui/react/tabs";
import type * as React from "react";

import { Highlight } from "./selection";

type SegmentedOption = {
  value: string;
  label: string;
  /** Optional symbol before the label. */
  icon?: React.ReactNode;
  disabled?: boolean;
};

type SegmentedControlProps = {
  /** Accessible name of the group, e.g. "View". */
  label: string;
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

/** iOS segmented control: a capsule track with a thumb that glides to the chosen segment. */
function SegmentedControl({ label, options, value, defaultValue, onValueChange, disabled = false, className }: SegmentedControlProps) {
  return (
    <Tabs.Root value={value} defaultValue={defaultValue ?? options[0]?.value} onValueChange={(next) => onValueChange?.(String(next))} className={className}>
      <Tabs.List
        aria-label={label}
        data-disabled={disabled ? "" : undefined}
        className="ui-tabs relative isolate flex items-center rounded-full p-[3px] data-disabled:opacity-50"
      >
        <Highlight variant="tabs" items="[role=tab]" rest="[data-active]" />
        {options.map((option) => (
          <Tabs.Tab
            key={option.value}
            data-slot="segment"
            value={option.value}
            disabled={disabled || option.disabled}
            className="flex h-8 min-w-14 flex-1 items-center justify-center gap-1 rounded-full px-2.5 text-[0.875rem] font-medium whitespace-nowrap text-label-secondary transition-colors duration-200 outline-none data-active:text-label focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current [&_svg]:size-4"
          >
            {option.icon}
            {option.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentedOption };
