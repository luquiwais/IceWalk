import { Info, OctagonAlert, TriangleAlert } from "lucide-react";
import type * as React from "react";

import { Subheadline } from "./text";
import { cn } from "./utils";

type AlertLevel = "advisory" | "caution" | "warning";

const LEVELS: Record<AlertLevel, { name: string; icon: React.ElementType; color: string }> = {
  advisory: { name: "Advisory", icon: Info, color: "text-advisory" },
  caution: { name: "Caution", icon: TriangleAlert, color: "text-caution" },
  warning: { name: "Warning", icon: OctagonAlert, color: "text-warning" },
};

type StatusBadgeProps = {
  level: AlertLevel;
  children: React.ReactNode;
  className?: string;
};

/**
 * Alert in the three PRD levels, on a thin platter. The level is always named
 * in text (color is never the only cue) and color goes on bold text, as the
 * HIG suggests on glass. Colors are visionOS system colors.
 */
function StatusBadge({ level, children, className }: StatusBadgeProps) {
  const { name, icon: Icon, color } = LEVELS[level];

  return (
    <div
      role={level === "warning" ? "alert" : "status"}
      data-level={level}
      className={cn(
        "ui-fill ui-swap relative inline-flex min-h-8 max-w-full items-center gap-2 self-start rounded-full py-1.5 pr-3.5 pl-3",
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", color)} strokeWidth={2.5} />
      <Subheadline as="span" tone="inherit" weight="bold" className={color}>
        {name}
      </Subheadline>
      <Subheadline as="span" className="min-w-0 truncate">
        {children}
      </Subheadline>
    </div>
  );
}

export { StatusBadge };
export type { AlertLevel, StatusBadgeProps };
