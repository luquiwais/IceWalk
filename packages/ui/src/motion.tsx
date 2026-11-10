"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Tabs } from "@base-ui/react/tabs";
import { MaterialLayers } from "./material";
import { cn } from "./utils";

type MotionPresenceProps = ComponentProps<"div"> & {
  present: boolean;
  onExitComplete?: () => void;
};

/** Retains closing UI for its material transition. No transformed glass ancestors. */
function MotionPresence({
  present,
  onExitComplete,
  className,
  children,
  ...props
}: MotionPresenceProps) {
  const [exited, setExited] = useState(!present);
  const [previous, setPrevious] = useState(present);
  const [snapshot, setSnapshot] = useState(children);
  const callback = useRef(onExitComplete);
  useEffect(() => {
    callback.current = onExitComplete;
  }, [onExitComplete]);
  if (previous !== present) {
    setPrevious(present);
    if (present) setExited(false);
  }
  if (present && snapshot !== children) setSnapshot(children);
  useEffect(() => {
    if (present || exited) return;
    // Covers interrupted CSS, background tabs and browsers without @property.
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        setExited(true);
        callback.current?.();
      },
      reduced ? 0 : 450,
    );
    return () => window.clearTimeout(timer);
  }, [present, exited]);
  if (exited) return null;
  return (
    <div
      {...props}
      className={cn("vision-motion-presence", className)}
      data-motion-exiting={!present ? "" : undefined}
      inert={!present ? true : undefined}
      aria-hidden={!present ? true : undefined}
      onTransitionEnd={(event) => {
        props.onTransitionEnd?.(event);
        if (
          !present &&
          event.target === event.currentTarget &&
          event.propertyName === "--vision-lifetime"
        ) {
          setExited(true);
          callback.current?.();
        }
      }}
    >
      {present ? children : snapshot}
    </div>
  );
}

/** Measured height transitions with Base UI's retained exit and interruption handling. */
function Collapse({
  open,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { open: boolean }) {
  return (
    <Collapsible.Root open={open}>
      <Collapsible.Panel
        className={cn("vision-collapse", className)}
        {...props}
      >
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/** Natural content dimensions, independent of the animated clipping frame. */
function PopupContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const root = node.parentElement;
      if (!root) return;
      const style = getComputedStyle(root);
      const box = root.getBoundingClientRect();
      root.style.setProperty(
        "--popup-from-x",
        String(
          Math.min(
            1,
            Math.max(
              0.12,
              (parseFloat(style.getPropertyValue("--anchor-width")) || 44) /
                box.width,
            ),
          ),
        ),
      );
      root.style.setProperty(
        "--popup-from-y",
        String(
          Math.min(
            1,
            Math.max(
              0.06,
              (parseFloat(style.getPropertyValue("--anchor-height")) || 44) /
                box.height,
            ),
          ),
        ),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="vision-popup-content">
      {children}
    </div>
  );
}

/** A single travelling lens. Only its paint stretches; labels keep their size. */
function LiquidIndicator({ segmented = false }: { segmented?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof MutationObserver === "undefined") return;
    const animations = new Map<Element, Animation>();
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const cancelMotion = () => {
      if (media?.matches) animations.forEach((animation) => animation.cancel());
    };
    media?.addEventListener("change", cancelMotion);
    let previous: number[] | undefined;
    const update = () => {
      const style = getComputedStyle(node);
      const next = ["left", "top", "width", "height"].map(
        (key) => parseFloat(style.getPropertyValue(`--active-tab-${key}`)) || 0,
      );
      if (previous && next[2] && previous[2]) {
        const dx = next[0] - previous[0],
          dy = next[1] - previous[1];
        const distance = Math.hypot(dx, dy);
        if (distance && !media?.matches) {
          const stretch = 1 + Math.min(0.12, distance / 600);
          const shape =
            Math.abs(dy) > Math.abs(dx) ? `.97 ${stretch}` : `${stretch} .97`;
          node.querySelectorAll("[data-vision-layer]").forEach((layer) => {
            if (typeof layer.animate !== "function") return;
            const from = getComputedStyle(layer).scale;
            animations.get(layer)?.cancel();
            animations.set(
              layer,
              layer.animate(
                [
                  { scale: from === "none" ? "1" : from },
                  { scale: shape, offset: 0.22 },
                  { scale: "1" },
                ],
                { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
              ),
            );
          });
        }
      }
      previous = next;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(node, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      media?.removeEventListener("change", cancelMotion);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);
  return (
    <Tabs.Indicator
      ref={ref}
      renderBeforeHydration
      className={cn(
        "vision-selection-indicator vision-surface",
        segmented
          ? "vision-platter rounded-segment border-[0.5px] border-white/40 shadow-[0_2px_4px_0_rgb(0_0_0/0.1)]"
          : "vision-selected rounded-full",
      )}
    >
      <MaterialLayers kind="platter" />
    </Tabs.Indicator>
  );
}

export { Collapse, LiquidIndicator, MotionPresence, PopupContent };
export type { MotionPresenceProps };
