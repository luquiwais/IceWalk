"use client";

import { Tabs } from "@base-ui/react/tabs";

import { MaterialLayers } from "./material";
import { cn } from "./utils";

type SegmentedOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SegmentedControlProps = {
  /** Accessible name of the group, e.g. "View". */
  label: string;
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

/*
 * visionOS segmented control (Figma: Segmented Controls): a recessed capsule
 * track (h 44, padding 4, gap 4) with segments of h 36. The selected segment
 * is a platter with a 0.5px edge and a soft shadow; idle labels are secondary.
 */
function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
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
        <MaterialLayers kind="recessed" />
        {options.map((option) => (
          <Tabs.Tab
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              "vision-control vision-surface group relative flex h-9 min-w-14 flex-1 sm:min-w-24 items-center justify-center rounded-full px-2",
              "text-[0.9375rem] leading-5 font-semibold whitespace-nowrap outline-none select-none",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-label",
              "not-data-active:[--fill-lighten:transparent] not-data-active:[--fill-dodge:transparent]",
              "hover:not-data-active:not-data-disabled:[--fill-lighten:rgb(255_255_255/0.06)] hover:not-data-active:not-data-disabled:[--fill-dodge:rgb(94_94_94/0.18)]",
              "hover:not-data-active:not-data-disabled:[--fill-glow:radial-gradient(100%_100%_at_50%_100%,rgb(255_255_255/0.12),transparent_66.7%)]",
              "hover:not-data-active:not-data-disabled:[--fill-glow-dodge:radial-gradient(100%_100%_at_50%_100%,rgb(94_94_94/0.32),transparent_73.8%)]",
              "data-active:rounded-segment data-active:border-[0.5px] data-active:border-white/40 data-active:shadow-[0_2px_4px_0_rgb(0_0_0/0.1)]",
            )}
          >
            <MaterialLayers kind="platter" />
            <span className="vibrant-secondary group-data-active:text-label group-data-active:mix-blend-normal group-data-disabled:text-label-disabled group-data-disabled:mix-blend-normal">
              {option.label}
            </span>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentedOption };
