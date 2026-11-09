"use client";

import { Tabs } from "@base-ui/react/tabs";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { cn } from "./utils";
import { Vibrancy } from "./vibrancy";

type SegmentedOption = {
  value: string;
  label: string;
  /** Optional symbol before the label (Figma segment with symbol: gap 3, 15pt Semibold). */
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

/*
 * visionOS segmented control: Recessed when enabled, Regular when disabled
 * track (h 44, padding 4, gap 4) with segments of h 36. The selected segment
 * is a platter with a 0.5px edge and a soft shadow; idle labels are secondary.
 */
function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
}: SegmentedControlProps) {
  return (
    <Tabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(String(next))}
      className={className}
    >
      <Tabs.List
        aria-label={label}
        className="vision-surface relative flex h-11 items-center gap-1 rounded-full p-1"
      >
        <MaterialLayers kind={disabled ? "regular" : "recessed"} />
        {options.map((option) => (
          <Tabs.Tab
            key={option.value}
            data-slot="segment"
            value={option.value}
            disabled={disabled || option.disabled}
            className={cn(
              "vision-control vision-surface group relative flex h-9 min-w-14 flex-1 sm:min-w-24 items-center justify-center rounded-full px-2",
              "text-callout whitespace-nowrap outline-none select-none",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-label",
              "not-data-active:[--fill-lighten:transparent] not-data-active:[--fill-dodge:transparent]",
              "hover:not-data-active:not-data-disabled:[--fill-lighten:rgb(255_255_255/0.06)] hover:not-data-active:not-data-disabled:[--fill-dodge:rgb(94_94_94/0.18)]",
              "hover:not-data-active:not-data-disabled:[--fill-glow:radial-gradient(100%_100%_at_50%_100%,rgb(255_255_255/0.12),transparent_66.7%)]",
              "hover:not-data-active:not-data-disabled:[--fill-glow-dodge:radial-gradient(100%_100%_at_50%_100%,rgb(94_94_94/0.32),transparent_73.8%)]",
              "data-active:not-data-disabled:rounded-segment data-active:not-data-disabled:border-[0.5px] data-active:not-data-disabled:border-white/40 data-active:not-data-disabled:shadow-[0_2px_4px_0_rgb(0_0_0/0.1)]",
              "data-disabled:[--fill-lighten:transparent] data-disabled:[--fill-dodge:transparent]",
              "data-disabled:data-active:shadow-[0_1px_4px_0_rgb(0_0_0/0.1)]",
            )}
          >
            <MaterialLayers kind="platter" />
            {option.icon ? (
              <Vibrancy className="mr-[0.1875rem] [&_svg]:size-4" >
                {option.icon}
              </Vibrancy>
            ) : null}
            <Vibrancy>
              {option.label}
            </Vibrancy>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentedOption };
