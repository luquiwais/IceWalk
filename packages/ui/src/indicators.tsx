"use client";

import type { CSSProperties } from "react";
import { cn } from "./utils";

function ProgressBar({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(max, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className={cn(
        "ui-well relative h-1 w-72 max-w-full overflow-clip rounded-full",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative block h-full rounded-full bg-label-secondary transition-[width] duration-150 motion-reduce:transition-none"
        style={{ width: `${max > 0 ? (clamped / max) * 100 : 0}%` }}
      />
    </div>
  );
}

/** Eight fading bars, 14/28/42pt (Figma 487:12235). */
function ActivityIndicator({
  label = "Loading",
  size = "regular",
  className,
}: {
  label?: string;
  size?: "small" | "regular" | "large";
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "relative inline-block shrink-0",
        size === "small"
          ? "size-3.5"
          : size === "large"
            ? "size-[2.625rem]"
            : "size-7",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="ui-activity-bar absolute left-[45%] top-0 h-[28%] w-[10%] origin-[50%_178.57%] rounded-full bg-label"
          style={
            {
              transform: `rotate(${i * 45}deg)`,
              "--bar-index": i,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function PageControl({
  count,
  value,
  onValueChange,
  label = "Pages",
  disabled = false,
  className,
}: {
  count: number;
  value: number;
  onValueChange: (page: number) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn("flex flex-wrap items-center justify-center", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          aria-label={`Page ${i + 1}`}
          aria-current={i === value ? "page" : undefined}
          onClick={() => onValueChange(i)}
          className="group flex size-11 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-label disabled:opacity-35"
        >
          <span
            aria-hidden
            data-slot="page-dot"
            data-current={i === value}
            className={cn(
              "relative h-2 rounded-full bg-label/30",
              i === value ? "w-4" : "w-2 group-hover:bg-label-secondary",
            )}
          >
            <span className="absolute right-0 size-2 rounded-full bg-label" />
          </span>
        </button>
      ))}
    </nav>
  );
}

export { ActivityIndicator, PageControl, ProgressBar };
