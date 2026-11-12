"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";

import { MaterialLayers } from "./material";
import { LargeTitle } from "./text";
import { cn } from "./utils";
import { MotionPresence, useGlassMorph, useReducedMotion } from "./motion";
import { WEB_MOTION } from "./spring";
import { OpticalEdge } from "./optical-edge";

const WindowPhase = createContext<boolean | undefined>(undefined);

/*
 * visionOS window (Figma: Examples > Window): glass with a 1px edge and a 46pt
 * corner radius. Default size in the kit is 1280x720pt. The HIG asks to keep
 * the glass (no opaque backgrounds).
 */
function Window({ className, children, morph = true, optics = false, ref, ...props }: ComponentProps<"section"> & { morph?: boolean; optics?: boolean }) {
  const phase = useContext(WindowPhase);
  const host = useRef<HTMLElement>(null);
  const setHost = useCallback((node: HTMLElement | null) => {
    host.current = node;
    if (typeof ref === "function") {
      const cleanup = ref(node);
      if (typeof cleanup === "function") return () => { host.current = null; cleanup(); };
    } else if (ref) ref.current = node;
  }, [ref]);
  useGlassMorph(host, morph, WEB_MOTION.surface, phase);
  return (
    <section
      data-slot="window"
      ref={setHost}
      className={cn("vision-surface relative flex min-w-0 overflow-clip rounded-window text-label", className)}
      {...props}
    >
      <MaterialLayers kind="glass" />
      {optics ? <OpticalEdge enabled /> : null}
      {children}
    </section>
  );
}

type WindowMotionProps = ComponentProps<"div"> & {
  open: boolean;
  restoreFocus?: RefObject<HTMLElement | null>;
  initialFocus?: RefObject<HTMLElement | null>;
};

/** Nonmodal window presence. Modal dialogs should keep Base UI's focus trap. */
function WindowMotion({ open, restoreFocus, initialFocus, children, className, ...props }: WindowMotionProps) {
  const host = useRef<HTMLDivElement>(null);
  const fallbackFocus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!open || !host.current) return;
    if (document.activeElement instanceof HTMLElement && !host.current.contains(document.activeElement))
      fallbackFocus.current = document.activeElement;
    const surface = host.current.querySelector<HTMLElement>("[data-slot='window']");
    const source = restoreFocus?.current ?? fallbackFocus.current;
    if (surface && source && source !== document.body) {
      const box = surface.getBoundingClientRect(), origin = source.getBoundingClientRect();
      surface.style.setProperty("--window-origin", `${origin.x + origin.width / 2 - box.x}px ${origin.y + origin.height / 2 - box.y}px`);
    }
    const target = initialFocus?.current ?? host.current.querySelector<HTMLElement>("[autofocus], button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex='0']");
    target?.focus({ preventScroll: true });
  }, [open, initialFocus, restoreFocus]);
  return <WindowPhase value={open}><MotionPresence present={open} restoreFocus={restoreFocus ?? fallbackFocus} className={cn("vision-window-motion", className)} {...props}>
    <div ref={host} className="contents">{children}</div>
  </MotionPresence></WindowPhase>;
}

type WindowContentProps = ComponentProps<"div"> & {
  contentKey: string;
  direction?: "forward" | "back" | "none";
};

/** Keyed content retention; layout uses the latest panel while outgoing ink leaves. */
function WindowContent({ contentKey, direction = "forward", children, className, ...props }: WindowContentProps) {
  const reduced = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const focusedPanel = useRef<string | null>(null);
  const snapshotPrefix = useId();
  const [key, setKey] = useState(contentKey);
  const [snapshot, setSnapshot] = useState<ReactNode>(children);
  const [outgoing, setOutgoing] = useState<{ key: string; children: ReactNode } | null>(null);
  if (key !== contentKey) {
    setKey(contentKey);
    setOutgoing(reduced ? null : { key, children: snapshot });
    setSnapshot(children);
  } else if (snapshot !== children) setSnapshot(children);
  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(() => setOutgoing(null), reduced ? 0 : WEB_MOTION.contentExit + 20);
    return () => window.clearTimeout(timer);
  }, [outgoing, reduced]);
  useLayoutEffect(() => {
    const current = host.current?.querySelector<HTMLElement>("[data-window-current]");
    const leaving = host.current?.querySelector("[data-window-outgoing]");
    // Explicit IDs may be reused by another panel (labels/descriptions). Keep
    // current IDs authoritative while the inaccessible snapshot finishes.
    leaving?.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
      element.dataset.windowOriginalId ??= element.id;
      element.id = `${snapshotPrefix}-outgoing-${element.dataset.windowOriginalId}`;
    });
    current?.querySelectorAll<HTMLElement>("[data-window-original-id]").forEach((element) => {
      element.id = element.dataset.windowOriginalId!;
      delete element.dataset.windowOriginalId;
    });
    if (leaving?.contains(document.activeElement) || (focusedPanel.current !== null && focusedPanel.current !== contentKey && document.activeElement === document.body)) {
      const target = current?.querySelector<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), [tabindex='0']") ?? current;
      target?.focus({ preventScroll: true });
    }
  }, [contentKey, snapshotPrefix]);
  return <div {...props} ref={host} data-slot="window-content" data-direction={direction} className={cn("vision-window-content relative min-w-0", className)}
    onFocusCapture={(event) => {
      if (event.target.closest("[data-window-current]")) focusedPanel.current = contentKey;
      props.onFocusCapture?.(event);
    }}
    onBlurCapture={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedPanel.current = null;
      props.onBlurCapture?.(event);
    }}>
    {[...(!reduced && outgoing ? [{ ...outgoing, leaving: true }] : []), { key: contentKey, children, leaving: false }].map((panel) => <div key={panel.key}
      data-window-outgoing={panel.leaving || undefined} data-window-current={!panel.leaving || undefined}
      className={panel.leaving ? "vision-motion-presence absolute inset-x-0 top-0" : "vision-motion-enter"}
      data-motion-exiting={panel.leaving ? "" : undefined} inert={panel.leaving || undefined}
      aria-hidden={panel.leaving || undefined} tabIndex={panel.leaving ? undefined : -1}>
      {panel.children}
    </div>)}
  </div>;
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

export { NavigationBar, Window, WindowContent, WindowControls, WindowMotion };
export type { NavigationBarProps, WindowContentProps, WindowMotionProps };
