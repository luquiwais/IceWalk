"use client";

import { Tabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

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
  size?: "small" | "regular";
  className?: string;
};

/** visionOS-style segmented picker: a capsule track with a sliding white selection. */
function SegmentedControl({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  size = "regular",
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
        className="relative isolate flex items-center gap-1 rounded-full bg-fill p-1"
      >
        {options.map((option) => (
          <Tabs.Tab
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              "relative rounded-full font-semibold whitespace-nowrap text-label-secondary outline-none select-none",
              "transition-colors duration-200 ease-(--ease-spring)",
              "hover:not-data-disabled:not-data-active:text-label",
              "focus-visible:ring-2 focus-visible:ring-label",
              "data-active:text-on-selected data-disabled:cursor-not-allowed data-disabled:text-label-tertiary",
              size === "small" ? "h-7 px-3 text-footnote" : "h-9 px-4 text-subheadline",
            )}
          >
            {option.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute top-1/2 left-0 -z-10 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) -translate-y-1/2 rounded-full bg-selected transition-[translate,width] duration-300 ease-(--ease-spring) motion-reduce:transition-none" />
      </Tabs.List>
    </Tabs.Root>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps, SegmentedOption };
