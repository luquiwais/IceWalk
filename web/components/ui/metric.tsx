import type * as React from "react";

import { cn } from "@/lib/utils";

/** A grid of metrics. Real numbers stay visible: the users are technical. */
function MetricList({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-6 gap-y-4",
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

function Metric({ label, value, unit, className }: MetricProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="truncate text-footnote text-label-secondary">{label}</dt>
      <dd className="text-title-2 font-bold whitespace-nowrap text-label">
        <span className="tabular-nums">{value}</span>
        {unit ? (
          <>
            {" "}
            <span className="text-subheadline font-semibold text-label-secondary">
              {unit}
            </span>
          </>
        ) : null}
      </dd>
    </div>
  );
}

export { Metric, MetricList };
export type { MetricProps };
