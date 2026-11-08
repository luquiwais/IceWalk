import type * as React from "react";

import { Callout, Footnote, Title2 } from "./text";
import { cn } from "./utils";

/** A grid of metrics. Real numbers stay visible: the users are technical. */
function MetricList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]",
        className,
      )}
      {...props}
    />
  );
}

type MetricProps = {
  label: string;
  value: string;
  unit?: string;
  className?: string;
};

/** Footnote label (secondary) over a Title 2 value. */
function Metric({ label, value, unit, className }: MetricProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <Footnote as="dt" tone="secondary" className="truncate">
        {label}
      </Footnote>
      <Title2 as="dd" className="whitespace-nowrap">
        <span className="tabular-nums">{value}</span>
        {unit ? (
          <>
            {" "}
            <Callout as="span" tone="secondary">
              {unit}
            </Callout>
          </>
        ) : null}
      </Title2>
    </div>
  );
}

export { Metric, MetricList };
export type { MetricProps };
