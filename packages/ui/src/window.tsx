"use client";

import { useMergedRefs } from "@fluidkit/react";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ComponentProps, type ReactNode, type RefCallback, type RefObject } from "react";

import { useMorphPopup } from "./morph-popup";

import { LargeTitle } from "./text";
import { cn } from "./utils";

/** The Morph state ref of the window inside a WindowMotion. */
const WindowState = createContext<RefCallback<HTMLElement> | null>(null);

/*
 * visionOS window (Figma: Examples > Window): glass with a 46pt corner radius. One element:
 * Fluid Kit's Liquid Blur.
 */
function Window({ className, ref, ...props }: ComponentProps<"section">) {
  const state = useContext(WindowState);
  const merged = useMergedRefs(state, ref ?? null);
  return <section data-slot="window" ref={merged} className={cn("lb ui-panel relative flex min-w-0 text-label", className)} {...props} />;
}

type WindowMotionProps = ComponentProps<"div"> & {
  open: boolean;
  /** The button that opens the window: the window grows out of it and goes back into it. */
  restoreFocus?: RefObject<HTMLElement | null>;
  initialFocus?: RefObject<HTMLElement | null>;
};

/**
 * A nonmodal window that grows out of the button that opens it and shrinks back into it (Fluid Kit
 * Morph, interruptible). Without a button it comes in and goes out in place. Opening moves focus
 * into the window; closing gives it back to the button. Modal dialogs use SystemDialog.
 */
function WindowMotion({ open, restoreFocus, initialFocus, children, className, ...props }: WindowMotionProps) {
  const morph = useMorphPopup({ open });
  const host = useRef<HTMLDivElement>(null);
  const opened = useRef(open);
  const registered = useRef<HTMLElement | null>(null);

  // The button is given from outside and may only exist while the window is closed: follow it
  useLayoutEffect(() => {
    const button = restoreFocus?.current ?? null;
    if (button !== registered.current) {
      registered.current = button;
      morph.trigger(button);
    }
  });

  // Focus follows the window when it opens or closes, never on first render
  useEffect(() => {
    if (opened.current === open) return;
    opened.current = open;
    if (open) {
      const target = initialFocus?.current ?? host.current?.querySelector<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), [tabindex='0']");
      target?.focus({ preventScroll: true });
    } else if (host.current?.contains(document.activeElement)) restoreFocus?.current?.focus({ preventScroll: true });
  }, [open, initialFocus, restoreFocus]);

  if (!restoreFocus)
    return <div ref={host} hidden={!open} className={cn("fk-transition fk-scale", className)} {...props}>{children}</div>;
  if (!morph.root.open) return null;
  return (
    <WindowState value={morph.popup}>
      <div ref={host} className={className} {...props}>{children}</div>
    </WindowState>
  );
}

type WindowContentProps = ComponentProps<"div"> & {
  contentKey: string;
  direction?: "forward" | "back" | "none";
};

/** Content that changes in place: the new panel comes in on Fluid Kit's spring, from its side. */
function WindowContent({ contentKey, direction = "forward", children, className, ...props }: WindowContentProps) {
  return (
    <div data-slot="window-content" data-direction={direction} className={cn("relative min-w-0", className)} {...props}>
      <div key={contentKey} className="ui-swap">{children}</div>
    </div>
  );
}

type NavigationBarProps = Omit<ComponentProps<"header">, "title"> & {
  title: ReactNode;
  /** Centered title (default) or leading title. */
  titleAlign?: "center" | "leading";
  leading?: ReactNode;
  trailing?: ReactNode;
  level?: 1 | 2 | 3;
  /** Id for the heading, so a region can reference it with aria-labelledby. */
  id?: string;
};

/*
 * Navigation bar (Figma: Navigation Bars): 92pt tall, 24pt side margins. Centered title: Large
 * Title (29 bold) in a 562pt box. Symbol buttons of 44 with 16 between them.
 */
function NavigationBar({ title, titleAlign = "center", leading, trailing, level = 2, id, className, ...props }: NavigationBarProps) {
  return (
    <header data-slot="navigation-bar" className={cn("relative flex h-23 shrink-0 items-center justify-between gap-4 px-6", className)} {...props}>
      {leading ? <div className="flex shrink-0 items-center gap-4">{leading}</div> : null}
      <LargeTitle
        key={typeof title === "string" ? title : undefined}
        as={`h${level}`}
        id={id}
        className={cn(
          "ui-swap min-w-0 truncate leading-normal",
          titleAlign === "center" ? "pointer-events-none absolute inset-x-0 mx-auto w-[min(35.125rem,100%-12rem)] text-center" : "flex-1",
        )}
      >
        {title}
      </LargeTitle>
      {titleAlign === "center" && !leading ? <span aria-hidden /> : null}
      {trailing ? <div className="flex shrink-0 items-center gap-4">{trailing}</div> : null}
    </header>
  );
}

/** Window controls (Figma: Window Controls): the window bar below a window. Decorative on the web. */
function WindowControls({ className }: { className?: string }) {
  return (
    <div aria-hidden data-slot="window-controls" className={cn("flex h-[2.3125rem] items-center justify-center gap-6 pt-[1.375rem] pb-px", className)}>
      <span className="size-3.5 rounded-full" />
      <span className="h-2.5 w-34 rounded-full bg-white/30" />
      <span className="size-3.5 rounded-full" />
    </div>
  );
}

export { NavigationBar, Window, WindowContent, WindowControls, WindowMotion };
export type { NavigationBarProps, WindowContentProps, WindowMotionProps };
