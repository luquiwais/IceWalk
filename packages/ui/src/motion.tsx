"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type RefObject,
} from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { Tabs } from "@base-ui/react/tabs";
import { MaterialLayers } from "./material";
import { cn } from "./utils";
import { WEB_MOTION } from "./spring";
import { createSpringTrack, springFrames, springState, type SpringTrack } from "./spring-motion";

function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      query?.addEventListener?.("change", notify);
      return () => query?.removeEventListener?.("change", notify);
    },
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true,
    () => true,
  );
}

const modalDepth = new WeakMap<HTMLElement, number>();

/** Modal content occupies the original depth; its presenting surface recedes.
 * visionOS spatial layout: WWDC23/10076, 20:34. No transform on blended roots. */
function useModalDepth() {
  const trigger = useRef<HTMLButtonElement>(null);
  const owner = useRef<HTMLElement | undefined>(undefined);
  const update = (open: boolean) => {
    if (open && !owner.current) {
      const surface = trigger.current?.closest<HTMLElement>(".vision-motion-dialog, [data-slot='window']");
      if (!surface) return;
      owner.current = surface;
      const depth = (modalDepth.get(surface) ?? 0) + 1;
      modalDepth.set(surface, depth);
      surface.dataset.modalDepth = String(depth);
      surface.style.setProperty("--modal-depth-scale", String(.97 ** depth));
    } else if (!open && owner.current) {
      const surface = owner.current, depth = Math.max(0, (modalDepth.get(surface) ?? 1) - 1);
      if (depth) {
        modalDepth.set(surface, depth); surface.dataset.modalDepth = String(depth);
        surface.style.setProperty("--modal-depth-scale", String(.97 ** depth));
      } else {
        modalDepth.delete(surface); delete surface.dataset.modalDepth;
        surface.style.removeProperty("--modal-depth-scale");
      }
      owner.current = undefined;
    }
  };
  useEffect(() => () => update(false), []);
  return { trigger, update };
}

/** One layout per resize; only direct glass paints change shape during the morph.
 * Clip insets preserve circular corners without nonuniformly scaling text/radii.
 * CSS clipping may still repaint blur in some engines: profile on target hardware.
 */
function useGlassMorph(host: RefObject<HTMLElement | null>, enabled = true, duration = WEB_MOTION.surface, materialize?: boolean) {
  const reduced = useReducedMotion();
  const phaseControl = useRef<((phase: boolean) => void) | undefined>(undefined);
  useLayoutEffect(() => {
    const node = host.current;
    if (!node || !enabled || reduced || typeof ResizeObserver === "undefined") return;
    let previous = node.getBoundingClientRect();
    let animations: Animation[] = [];
    let running: SpringTrack[] | undefined;
    let target = [0, 0, previous.width, previous.height];
    let restore: (() => void) | undefined;
    let phase = materialize;
    const paints = Array.from(node.querySelectorAll<HTMLElement>(":scope > [data-vision-layer]"));
    const at = () => {
      if (!running) return { values: target, velocity: [0, 0, 0, 0] };
      const time = Number(animations[0]?.currentTime ?? 0);
      const state = running.map(track => springState(track, time));
      return { values: state.map(value => value.position), velocity: state.map(value => value.velocity) };
    };
    const animate = (next: number[], playback: number, initial?: number[]) => {
      const old = initial ? { values: initial, velocity: [0, 0, 0, 0] } : at();
      animations.forEach(animation => animation.cancel());
      restore?.();
      target = next;
      if (!paints[0]?.animate || !next[2] || !next[3]) return;
      const tracks: SpringTrack[] = old.values.map((from, i) => createSpringTrack({ from, to: next[i], velocity: old.velocity[i], duration: playback, bounce: 0 }));
      const samples = springFrames(tracks, ([x, y, width, height]) => ({ x, y, width, height }));
      const width = Math.max(previous.width, ...samples.map(frame => Number(frame.x) + Number(frame.width)));
      const height = Math.max(previous.height, ...samples.map(frame => Number(frame.y) + Number(frame.height)));
      const radius = getComputedStyle(node).borderTopLeftRadius || "46px";
      const rounded = (value: number) => `${Math.round(value * 1000) / 1000}px`;
      const clip = ([x, y, w, h]: number[]) => `inset(${rounded(y)} ${rounded(width - x - w)} ${rounded(height - y - h)} ${rounded(x)} round ${radius})`;
      const overflow = node.style.overflow;
      const styles = paints.map(paint => paint.getAttribute("style"));
      node.style.overflow = "visible";
      node.setAttribute("data-material-motion", "");
      paints.forEach(paint => {
        paint.style.width = `${width}px`; paint.style.height = `${height}px`;
        paint.style.borderRadius = "0"; paint.style.clipPath = clip(next);
      });
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        node.style.overflow = overflow;
        node.removeAttribute("data-material-motion");
        paints.forEach((paint, i) => {
          if (styles[i] === null) paint.removeAttribute("style");
          else paint.setAttribute("style", styles[i]!);
        });
      };
      restore = cleanup;
      const frames = springFrames(tracks, values => ({ clipPath: clip(values) }));
      const lifetime = Math.max(...tracks.map(track => track.duration));
      if (materialize !== undefined) node.closest<HTMLElement>(".vision-window-motion")?.style.setProperty("--surface-lifetime", `${lifetime}ms`);
      animations = paints.map(paint => paint.animate(frames, { duration: lifetime, easing: "linear" }));
      running = tracks;
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        cleanup(); if (restore === cleanup) running = undefined;
      }, () => {});
    };
    const arrivalBox = (amount: number) => [previous.width * amount / 2, previous.height * amount / 2, previous.width * (1 - amount), previous.height * (1 - amount)];
    if (materialize === true) animate(target, duration, arrivalBox(.14));
    phaseControl.current = (nextPhase) => {
      if (nextPhase === phase) return;
      phase = nextPhase;
      animate(nextPhase ? [0, 0, previous.width, previous.height] : arrivalBox(.08), nextPhase ? duration : WEB_MOTION.exit);
    };
    const observer = new ResizeObserver(() => {
      const next = node.getBoundingClientRect();
      if (node.querySelector("[data-layout-animating]")) { previous = next; return; }
      if (!previous.width || !previous.height || !next.width || !next.height ||
        (Math.abs(previous.width - next.width) < .5 && Math.abs(previous.height - next.height) < .5)) { previous = next; return; }
      previous = next;
      animate(phase === false ? arrivalBox(.08) : [0, 0, next.width, next.height], phase === false ? WEB_MOTION.exit : duration);
    });
    observer.observe(node);
    return () => {
      observer.disconnect(); phaseControl.current = undefined;
      animations.forEach(animation => animation.cancel()); restore?.();
    };
    // Phase changes retarget the existing trajectory below, preserving velocity.
  }, [host, enabled, reduced, duration]);
  useLayoutEffect(() => { if (materialize !== undefined) phaseControl.current?.(materialize); }, [materialize]);
}

type MotionPresenceProps = ComponentProps<"div"> & {
  present: boolean;
  onExitComplete?: () => void;
  onExitStart?: () => void;
  restoreFocus?: RefObject<HTMLElement | null>;
};

/** Retains closing UI for its material transition. No transformed glass ancestors. */
function MotionPresence({
  present,
  onExitComplete,
  onExitStart,
  restoreFocus,
  className,
  children,
  ...props
}: MotionPresenceProps) {
  const [exited, setExited] = useState(!present);
  const [previous, setPrevious] = useState(present);
  const [snapshot, setSnapshot] = useState(children);
  const callback = useRef(onExitComplete);
  const host = useRef<HTMLDivElement>(null);
  const focusedInside = useRef(false);
  const lastExternalFocus = useRef<HTMLElement | null>(null);
  const wasPresent = useRef(present);
  useLayoutEffect(() => {
    if (wasPresent.current && !present) {
      const active = document.activeElement;
      if (host.current?.contains(active) || (active === document.body && focusedInside.current)) {
        const destination = restoreFocus?.current ?? lastExternalFocus.current;
        if (destination?.isConnected) destination.focus({ preventScroll: true });
      }
      onExitStart?.();
    }
    if (present && document.activeElement instanceof HTMLElement && document.activeElement !== document.body && !host.current?.contains(document.activeElement))
      lastExternalFocus.current = document.activeElement;
    wasPresent.current = present;
  }, [present, restoreFocus, onExitStart]);
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
    const value = host.current ? (getComputedStyle(host.current).getPropertyValue("--surface-lifetime").trim() || getComputedStyle(host.current).getPropertyValue("--surface-duration").trim()) : "";
    const duration = parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
    const timer = window.setTimeout(
      () => {
        setExited(true);
        callback.current?.();
      },
      reduced ? 0 : Number.isFinite(duration) ? duration + 34 : 450,
    );
    return () => window.clearTimeout(timer);
  }, [present, exited]);
  if (exited) return null;
  return (
    <div
      {...props}
      ref={host}
      className={cn("vision-motion-presence", className)}
      data-motion-exiting={!present ? "" : undefined}
      inert={!present ? true : undefined}
      aria-hidden={!present ? true : undefined}
      onFocusCapture={(event) => {
        if (event.relatedTarget instanceof HTMLElement && !event.currentTarget.contains(event.relatedTarget))
          lastExternalFocus.current = event.relatedTarget;
        focusedInside.current = true;
        props.onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedInside.current = false;
        props.onBlurCapture?.(event);
      }}
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

/** React types every transition event alike but only fills `propertyName` on
 * `transitionend`; run, start and cancel carry it on the native event alone. */
const transitionProperty = (event: { nativeEvent: Event }) =>
  (event.nativeEvent as TransitionEvent).propertyName;

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
        onTransitionRun={(event) => {
          if (event.target === event.currentTarget && transitionProperty(event) === "height")
            event.currentTarget.setAttribute("data-layout-animating", "");
          props.onTransitionRun?.(event);
        }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === "height")
            event.currentTarget.removeAttribute("data-layout-animating");
          props.onTransitionEnd?.(event);
        }}
        onTransitionCancel={(event) => {
          if (event.target === event.currentTarget && transitionProperty(event) === "height")
            event.currentTarget.removeAttribute("data-layout-animating");
          props.onTransitionCancel?.(event);
        }}
      >
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Natural content dimensions, independent of the animated clip. It measures
 * the trigger's footprint inside the popup so the glass grows out of it, and
 * only while the popup is entering or leaving: Base UI positions the popup
 * after mount, so a mount-time reading would use stale or default values.
 */
function PopupContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const popup = ref.current?.parentElement;
    if (!popup || typeof MutationObserver === "undefined") return;
    const positioner = popup.parentElement;
    let measured = false;
    let phase: boolean | undefined;
    let motion: { animation: Animation; tracks: SpringTrack[] } | undefined;
    const originalClip = popup.style.clipPath;
    const originalLifetime = popup.style.getPropertyValue("--surface-lifetime");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const clear = () => {
      motion?.animation.cancel(); motion = undefined;
      popup.removeAttribute("data-popup-material-motion");
      popup.style.clipPath = originalClip;
      if (originalLifetime) popup.style.setProperty("--surface-lifetime", originalLifetime);
      else popup.style.removeProperty("--surface-lifetime");
    };
    const materialize = (from: number[], to: number[], open: boolean, box: DOMRect) => {
      if (!popup.classList.contains("vision-motion-menu") || !popup.animate || reduced?.matches || phase === open) return;
      let values = from, velocity = from.map(() => 0);
      if (motion) {
        const state = motion.tracks.map(track => springState(track, Number(motion!.animation.currentTime ?? 0)));
        values = state.map(value => value.position); velocity = state.map(value => value.velocity);
      }
      motion?.animation.cancel();
      phase = open;
      const tracks = values.map((value, i) => createSpringTrack({ from: value, to: to[i], velocity: velocity[i], duration: open ? WEB_MOTION.surface : WEB_MOTION.exit, bounce: 0 }));
      const clip = ([left, top, width, height, radius]: number[]) => `inset(${top}px ${box.width - left - width}px ${box.height - top - height}px ${left}px round ${Math.max(0, radius)}px)`;
      const duration = Math.max(...tracks.map(track => track.duration));
      popup.setAttribute("data-popup-material-motion", "");
      popup.style.setProperty("--surface-lifetime", `${duration}ms`);
      popup.style.clipPath = clip(to);
      const animation = popup.animate(springFrames(tracks, state => ({ clipPath: clip(state) })), { duration, easing: "linear" });
      const current = { animation, tracks }; motion = current;
      animation.finished?.then(() => {
        if (motion !== current) return;
        motion = undefined; popup.removeAttribute("data-popup-material-motion"); popup.style.clipPath = originalClip;
      }, () => {});
    };
    const measure = () => {
      if (
        measured &&
        !popup.hasAttribute("data-starting-style") &&
        !popup.hasAttribute("data-ending-style") && phase !== false
      )
        return;
      const id = popup.getAttribute("aria-labelledby")?.split(" ")[0];
      const trigger = id ? document.getElementById(id) : null;
      const box = popup.getBoundingClientRect();
      if (!trigger || !box.width || !box.height) return;
      const anchor = trigger.getBoundingClientRect();
      if (!anchor.width || !anchor.height) return;
      const width = Math.min(anchor.width, box.width);
      const height = Math.min(anchor.height, box.height);
      const left = clamp(anchor.left - box.left, 0, box.width - width);
      const top = clamp(anchor.top - box.top, 0, box.height - height);
      const set = (name: string, value: number) =>
        popup.style.setProperty(`--popup-clip-${name}`, `${Math.round(value * 10) / 10}px`);
      set("top", top);
      set("left", left);
      set("right", box.width - left - width);
      set("bottom", box.height - top - height);
      set("radius", height / 2);
      measured = true;
      const small = [left, top, width, height, height / 2];
      // Resting clip extends past the shadow. Its rounded rectangle still
      // describes the actual28pt menu edge, without scaling the text.
      const margin = 64;
      const full = [-margin, -margin, box.width + margin * 2, box.height + margin * 2, (parseFloat(getComputedStyle(popup).borderTopLeftRadius) || 28) + margin];
      const open = !popup.hasAttribute("data-ending-style");
      materialize(open ? small : full, open ? full : small, open, box);
    };
    measure();
    const observer = new MutationObserver(measure);
    observer.observe(popup, {
      attributes: true,
      attributeFilter: ["data-starting-style", "data-ending-style"],
    });
    if (positioner)
      observer.observe(positioner, { attributes: true, attributeFilter: ["style"] });
    const preference = () => { if (reduced?.matches) { clear(); popup.style.setProperty("--surface-lifetime", "0ms"); } };
    reduced?.addEventListener?.("change", preference);
    return () => { observer.disconnect(); reduced?.removeEventListener?.("change", preference); clear(); };
  }, []);
  return (
    <div ref={ref} className="vision-popup-content">
      {children}
    </div>
  );
}

type Box = { x: number; y: number; width: number; height: number };

/** Center and size travel independently; velocity bends only the moving paint. */
function lensTracks(box: Box, target: Box, velocity = [0, 0, 0, 0]): SpringTrack[] {
  const from = [box.x + box.width / 2, box.y + box.height / 2, box.width, box.height];
  const to = [target.x + target.width / 2, target.y + target.height / 2, target.width, target.height];
  return from.map((value, i) => createSpringTrack({ from: value, to: to[i], velocity: velocity[i], duration: WEB_MOTION.selection, bounce: .15 }));
}

function lensKeyframes(tracks: SpringTrack[], target: Box): Keyframe[] {
  const cx = target.x + target.width / 2, cy = target.y + target.height / 2;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return springFrames(tracks, ([x, y, width, height], [vx, vy]) => {
    // A bounded, velocity-driven deformation: no arbitrary fixed overshoot.
    // Web calibration; native shape/optics are not public shader parameters.
    const stretch = Math.min(.06, Math.hypot(vx, vy) / 18000);
    const vertical = Math.abs(vy) > Math.abs(vx);
    const sx = width / target.width * (vertical ? 1 - stretch * .4 : 1 + stretch);
    const sy = height / target.height * (vertical ? 1 + stretch : 1 - stretch * .4);
    return { translate: `${round(x - cx)}px ${round(y - cy)}px`, scale: `${round(sx)} ${round(sy)}` };
  });
}

/** A single travelling lens. Only its paint moves; labels keep their size. */
function LiquidIndicator({ segmented = false }: { segmented?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof MutationObserver === "undefined") return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    // Base UI writes the lens geometry inline: read it there, never computed.
    const read = (): Box | undefined => {
      const value = (key: string) =>
        parseFloat(node.style.getPropertyValue(`--active-tab-${key}`)) || 0;
      const box = { x: value("left"), y: value("top"), width: value("width"), height: value("height") };
      return box.width > 0 && box.height > 0 ? box : undefined;
    };
    const activeTab = () => node.parentElement?.querySelector("[data-active]") ?? null;
    let rest = read();
    let tab = activeTab();
    let glide: { animations: Animation[]; tracks: SpringTrack[] } | undefined;
    const stop = () => {
      glide?.animations.forEach((animation) => animation.cancel());
      glide = undefined;
    };
    const onMedia = () => {
      if (media?.matches) stop();
    };
    media?.addEventListener?.("change", onMedia);
    const update = () => {
      const next = read();
      if (!next) return;
      const previous = rest;
      const previousTab = tab;
      rest = next;
      tab = activeTab();
      // Re-renders rewrite identical values: never disturb a running glide.
      if (
        previous &&
        previous.x === next.x && previous.y === next.y &&
        previous.width === next.width && previous.height === next.height
      )
        return;
      if (!previous || (tab === previousTab && previous.width === next.width && previous.height === next.height) || media?.matches) {
        // Same tab, new geometry (resize, scroll): follow it without a glide.
        stop();
        return;
      }
      let from = previous;
      let velocity: number[] | undefined;
      if (glide) {
        // WAAPI runs with linear time: evaluate the same oscillator at its
        // playhead, carrying real incoming velocity into the new target.
        const elapsed = Number(glide.animations[0]?.currentTime ?? 0);
        const state = glide.tracks.map(track => springState(track, elapsed));
        from = { x: state[0].position - state[2].position / 2, y: state[1].position - state[3].position / 2,
          width: state[2].position, height: state[3].position };
        velocity = state.map(value => value.velocity);
      }
      stop();
      const tracks = lensTracks(from, next, velocity);
      const keyframes = lensKeyframes(tracks, next);
      const animations: Animation[] = [];
      node.querySelectorAll("[data-vision-layer]").forEach((layer) => {
        if (typeof layer.animate === "function")
          animations.push(layer.animate(keyframes, { duration: Math.max(...tracks.map(track => track.duration)), easing: "linear" }));
      });
      const current = { animations, tracks };
      glide = current;
      if (animations.every(animation => animation.finished))
        Promise.all(animations.map(animation => animation.finished)).then(() => { if (glide === current) glide = undefined; }, () => {});
    };
    const observer = new MutationObserver(update);
    observer.observe(node, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", onMedia);
      stop();
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

export { Collapse, LiquidIndicator, MotionPresence, PopupContent, useGlassMorph, useModalDepth, useReducedMotion };
export type { MotionPresenceProps };
