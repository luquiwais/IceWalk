import type * as React from "react";

import { MaterialLayers } from "./material";
import { LargeTitle } from "./text";
import { cn } from "./utils";

/*
 * visionOS window (Figma: Examples > Window): glass with a 1px edge and a 46pt
 * corner radius. Default size in the kit is 1280x720pt. The HIG asks to keep
 * the glass (no opaque backgrounds).
 */
function Window({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="window"
      className={cn("vision-surface relative flex min-w-0 overflow-clip rounded-window text-label", className)}
      {...props}
    >
      <MaterialLayers kind="glass" />
      {children}
    </section>
  );
}

type NavigationBarProps = Omit<React.ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  /** Centered title (default) or leading title. */
  titleAlign?: "center" | "leading";
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  level?: 1 | 2 | 3;
  /** Id for the heading, so a region can reference it with aria-labelledby. */
  id?: string;
};

/*
 * Navigation bar (Figma: Navigation Bars): 92pt tall, 24pt side margins,
 * items spread to both ends. Centered title: Large Title (29 bold) in a 562pt
 * box centered on the bar. Symbol buttons of 44 with 16 between them.
 */
function NavigationBar({
  title,
  titleAlign = "center",
  leading,
  trailing,
  level = 2,
  id,
  className,
  ...props
}: NavigationBarProps) {
  return (
    <header
      data-slot="navigation-bar"
      className={cn("relative flex h-23 shrink-0 items-center justify-between gap-4 px-6", className)}
      {...props}
    >
      {leading ? <div className="flex shrink-0 items-center gap-4">{leading}</div> : null}
      <LargeTitle
        key={typeof title === "string" ? title : undefined}
        as={`h${level}`}
        id={id}
        className={cn(
          "vision-content-change min-w-0 truncate leading-normal",
          titleAlign === "center"
            ? "pointer-events-none absolute inset-x-0 mx-auto w-[min(35.125rem,100%-12rem)] text-center"
            : "flex-1",
        )}
      >
        {title}
      </LargeTitle>
      {titleAlign === "center" && !leading ? <span aria-hidden /> : null}
      {trailing ? <div className="flex shrink-0 items-center gap-4">{trailing}</div> : null}
    </header>
  );
}

/*
 * Window controls (Figma: Window Controls): a 37pt strip right below the
 * window; 22pt from its top, the window bar (136x10pt, white 30% over a 10px
 * blur) between the close and share buttons (14pt, only visible on hover in
 * visionOS, so transparent here). Decorative on the web.
 */
function WindowControls({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-slot="window-controls"
      className={cn("flex h-[2.3125rem] items-center justify-center gap-6 pt-[1.375rem] pb-px", className)}
    >
      <span className="size-3.5 rounded-full" />
      <span className="h-2.5 w-34 rounded-full bg-white/30 backdrop-blur-[10px]" />
      <span className="size-3.5 rounded-full" />
    </div>
  );
}

export { NavigationBar, Window, WindowControls };
export type { NavigationBarProps };
