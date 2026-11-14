"use client";

import { useMergedRefs } from "@fluidkit/react";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";

import { MorphOrigin, useMorphPopup } from "./morph-popup";
import { cn } from "./utils";

const WindowState = createContext<RefCallback<HTMLElement> | null>(null);

/** A glass panel (sheet, window): one element, Fluid Kit's Liquid Blur, 34pt corners. */
function Window({ className, ref, ...props }: ComponentProps<"section">) {
  const state = useContext(WindowState);
  const merged = useMergedRefs(ref ?? null, state);
  return (
    <section
      ref={merged}
      data-slot="window"
      className={cn("lb ui-panel relative flex min-w-0 text-label", className)}
      {...props}
    />
  );
}

type WindowMotionProps = ComponentProps<"div"> & {
  open: boolean;
  /** The button that opens the window: the window grows out of it and goes back into it. */
  restoreFocus?: RefObject<HTMLElement | null>;
  initialFocus?: RefObject<HTMLElement | null>;
  /** A WindowOrigin inside the invoking button. Opts into Fluid Kit's interruptible Morph. */
  morphOrigin?: RefObject<HTMLElement | null>;
};

/**
 * A nonmodal window. With a morphOrigin it grows from that origin and flies back before
 * unmounting, following Fluid Kit's dialog lifecycle. The real invoking button stays visible.
 * Without an origin, use the in-place transition. Modal dialogs use SystemDialog.
 */
function WindowMotion({
  open,
  restoreFocus,
  initialFocus,
  morphOrigin,
  children,
  className,
  ...props
}: WindowMotionProps) {
  const morph = useMorphPopup({ open: morphOrigin ? open : false });
  const visible = morphOrigin ? morph.root.open : open;
  const host = useRef<HTMLDivElement>(null);
  const opened = useRef(open);
  useLayoutEffect(() => {
    morph.trigger(morphOrigin?.current ?? null);
    return () => morph.trigger(null);
  }, [morphOrigin, morph.trigger]);
  // Focus follows the window when it opens or closes, never on first render
  useEffect(() => {
    if (open && !visible) return;
    if (opened.current === open) return;
    opened.current = open;
    if (open) {
      const target =
        initialFocus?.current ??
        host.current?.querySelector<HTMLElement>(
          "button:not(:disabled), [href], input:not(:disabled), [tabindex='0']",
        );
      target?.focus({ preventScroll: true });
    } else if (host.current?.contains(document.activeElement))
      restoreFocus?.current?.focus({ preventScroll: true });
  }, [open, visible, initialFocus, restoreFocus]);
  if (morphOrigin) {
    if (!visible) return null;
    return (
      <WindowState value={morph.popup}>
        <div ref={host} className={cn("relative z-2", className)} {...props}>
          {children}
        </div>
      </WindowState>
    );
  }
  return (
    <div
      ref={host}
      hidden={!open}
      className={cn("fk-transition fk-scale", className)}
      {...props}
    >
      {children}
    </div>
  );
}

type WindowContentProps = ComponentProps<"div"> & {
  contentKey: string;
  direction?: "forward" | "back" | "none";
};

/** Content that changes in place: the new panel comes in on Fluid Kit's spring, from its side. */
function WindowContent({
  contentKey,
  direction = "forward",
  children,
  className,
  ...props
}: WindowContentProps) {
  return (
    <div
      data-slot="window-content"
      data-direction={direction}
      className={cn("relative min-w-0", className)}
      {...props}
    >
      <div key={contentKey} className="ui-swap">
        {children}
      </div>
    </div>
  );
}

type NavigationBarProps = Omit<ComponentProps<"header">, "title"> & {
  title: ReactNode;
  /** center: the inline title (17 semibold) in the bar. leading: the large title (34 bold) under it. */
  titleAlign?: "center" | "leading";
  leading?: ReactNode;
  trailing?: ReactNode;
  level?: 1 | 2 | 3;
  /** Id for the heading, so a region can reference it with aria-labelledby. */
  id?: string;
};

/*
 * iOS 26/27 navigation bar: a 44pt bar with its buttons at the ends (several on one side sit
 * together) and the title either inline in the middle or large below the bar, leading-aligned.
 * No background of its own: the buttons carry the glass when the bar floats over content.
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
  const Heading = `h${level}` as const;
  const large = titleAlign === "leading";
  return (
    <header
      data-slot="navigation-bar"
      className={cn(
        "flex shrink-0 flex-col px-4 pt-1.5",
        large && "pb-2",
        className,
      )}
      {...props}
    >
      <div className="relative flex h-11 items-center justify-between gap-2">
        <div className="flex min-w-11 items-center gap-2">{leading}</div>
        {large ? null : (
          <Heading
            id={id}
            className="ui-swap pointer-events-none absolute inset-x-24 truncate text-center text-headline"
            key={typeof title === "string" ? title : undefined}
          >
            {title}
          </Heading>
        )}
        <div className="flex min-w-11 items-center justify-end gap-2">
          {trailing}
        </div>
      </div>
      {large ? (
        <Heading
          id={id}
          className="ui-swap truncate font-display text-large-title"
          key={typeof title === "string" ? title : undefined}
        >
          {title}
        </Heading>
      ) : null}
    </header>
  );
}

/** The grabber under a window (iPadOS windows): decorative on the web. */
function WindowControls({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-slot="window-controls"
      className={cn(
        "flex h-[2.3125rem] items-center justify-center gap-6 pt-[1.375rem] pb-px",
        className,
      )}
    >
      <span className="size-3.5 rounded-full" />
      <span className="h-2.5 w-34 rounded-full bg-label/30" />
      <span className="size-3.5 rounded-full" />
    </div>
  );
}

export {
  NavigationBar,
  Window,
  WindowContent,
  WindowControls,
  WindowMotion,
  MorphOrigin as WindowOrigin,
};
export type { NavigationBarProps, WindowContentProps, WindowMotionProps };
