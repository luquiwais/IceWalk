import type * as React from "react";

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
      <dt className="vibrant-secondary truncate text-footnote">{label}</dt>
      <dd className="text-title-2 whitespace-nowrap">
        <span className="tabular-nums">{value}</span>
        {unit ? (
          <>
            {" "}
            <span className="vibrant-secondary text-callout">{unit}</span>
          </>
        ) : null}
      </dd>
    </div>
  );
}

export { Metric, MetricList };
export type { MetricProps };
