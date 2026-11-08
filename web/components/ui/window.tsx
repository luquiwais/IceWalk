import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A visionOS window: a plane of glass floating over the scene. The HIG asks to
 * keep the glass background (an opaque one feels heavy and blocks the scene).
 */
function Window({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="window"
      className={cn(
        "material-glass glass-rim flex min-w-0 flex-col rounded-window text-label",
        className,
      )}
      {...props}
    />
  );
}

type WindowHeaderProps = Omit<React.ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Trailing controls, e.g. icon buttons. */
  actions?: React.ReactNode;
  level?: 1 | 2 | 3;
  /** Id for the heading, so the window can reference it with aria-labelledby. */
  id?: string;
};

function WindowHeader({
  title,
  subtitle,
  actions,
  level = 2,
  id,
  className,
  ...props
}: WindowHeaderProps) {
  const Heading = `h${level}` as const;

  return (
    <header
      data-slot="window-header"
      className={cn("flex items-start gap-4 px-6 pt-6 pb-4", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading id={id} className="truncate text-title-3 font-bold text-balance">
          {title}
        </Heading>
        {subtitle ? (
          <p className="truncate text-subheadline text-label-secondary">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function WindowBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="window-body"
      className={cn("flex min-h-0 flex-col gap-4 px-6 pb-6", className)}
      {...props}
    />
  );
}

/** A grouped area inside a window (regular material, concentric smaller radius). */
function WindowSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="window-section"
      className={cn("material-regular rounded-section p-4", className)}
      {...props}
    />
  );
}

export { Window, WindowBody, WindowHeader, WindowSection };
export type { WindowHeaderProps };
