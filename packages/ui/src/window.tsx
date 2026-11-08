import type * as React from "react";

import { MaterialLayers } from "./material";
import { cn } from "./utils";

/*
 * visionOS window (Figma: Examples > Window): glass with a 1px edge and a
 * 46 pt corner radius. The HIG asks to keep the glass (no opaque backgrounds).
 */
function Window({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="window"
      className={cn("vision-surface relative flex min-w-0 flex-col rounded-window text-label", className)}
      {...props}
    >
      <MaterialLayers kind="glass" />
      {children}
    </section>
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

/** Navigation bar (Figma: Navigation Bars): 92 pt tall, Large Title, 24 pt margins. */
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
      className={cn("flex min-h-23 items-center gap-4 px-6 py-4", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <Heading id={id} className="truncate text-large-title text-balance">
          {title}
        </Heading>
        {subtitle ? <p className="vibrant-secondary truncate text-footnote">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function WindowBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="window-body"
      className={cn("flex min-h-0 flex-col gap-6 px-6 pb-6", className)}
      {...props}
    />
  );
}

export { Window, WindowBody, WindowHeader };
export type { WindowHeaderProps };
