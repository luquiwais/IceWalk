"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "./utils";
import { createSpringTrack, springFrames, springState, type SpringTrack } from "./spring-motion";

type TimeWheelProps = {
  label: string;
  value: string;
  values: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
};

/** Scrollable wheel with pointer scrubbing, wheel/keyboard stepping and direct entry. */
function TimeWheel({
  label,
  value,
  values,
  onChange,
  disabled = false,
}: TimeWheelProps) {
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const reel = useRef<HTMLDivElement>(null);
  // The settle/step animation and where it started, to retarget without
  // reading computed styles.
  const motion = useRef<{ animation: Animation; track: SpringTrack } | null>(null);
  const drag = useRef<{
    y: number;
    index: number;
    raw: number;
    step: number;
    lastY: number;
    time: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const frame = useRef<number | undefined>(undefined);
  const height = useRef(0);
  const cancelled = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const numeric = values.every((item) => /^\d+$/.test(item));
  const current = Math.max(0, values.indexOf(value));
  const previous = useRef(current);
  /** Row pitch, measured once and kept current by a ResizeObserver. */
  function stepHeight() {
    if (!height.current)
      height.current = root.current?.getBoundingClientRect().height || 204;
    return (height.current * 32) / 204;
  }
  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      height.current = entry.contentRect.height;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  /** Signed distance in rows from `from` to `to`, the short way round. */
  function rows(to: number, from: number) {
    let delta = to - from;
    if (numeric && Math.abs(delta) > values.length / 2)
      delta -= Math.sign(delta) * values.length;
    return delta;
  }
  /** The reel offset that keeps the rendered rows under the finger. */
  function dragOffset(rendered: number) {
    const state = drag.current;
    if (!state) return 0;
    const nearest = Math.round(state.raw);
    return (nearest + rows(rendered, normalized(nearest)) - state.raw) * state.step;
  }
  function apply() {
    if (drag.current?.moved && reel.current)
      reel.current.style.transform = `translateY(${dragOffset(previous.current)}px)`;
  }
  function paint() {
    frame.current = undefined;
    apply();
  }
  /** Eases the reel from `from` px to rest, unless reduced motion is on. */
  function settle(from: number, velocity = 0) {
    const node = reel.current;
    if (!node) return;
    motion.current?.animation.cancel();
    motion.current = null;
    node.style.transform = "translateY(0px)";
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!from || reduced || typeof node.animate !== "function") return;
    const track = createSpringTrack({ from, to: 0, velocity, duration: 160, bounce: 0 });
    motion.current = { track, animation: node.animate(
      springFrames([track], ([offset]) => ({ transform: `translateY(${offset}px)` })),
      { duration: track.duration, easing: "linear" },
    ) };

  }
  /** Where an interrupted settle currently shows the reel. */
  function visibleOffset() {
    const active = motion.current;
    if (!active) return 0;
    return springState(active.track, Number(active.animation.currentTime ?? 0)).position;
  }
  useLayoutEffect(() => {
    const delta = rows(current, previous.current);
    previous.current = current;
    if (!delta || editing) return;
    // Mid-drag: re-anchor the reel to the new rows in the same frame.
    if (drag.current?.moved) {
      apply();
      return;
    }
    const step = stepHeight();
    const incoming = motion.current ? springState(motion.current.track, Number(motion.current.animation.currentTime ?? 0)).velocity : 0;
    // Home/End across most of the wheel are immediate; nearby steps retain
    // physical motion and the visible position/velocity of an interrupted step.
    settle(Math.abs(delta) > 5 ? 0 : visibleOffset() + delta * step, incoming);
  }, [current, editing, numeric, values.length]);
  useEffect(
    () => () => {
      motion.current?.animation.cancel();
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const indexRef = useRef(current);
  useEffect(() => {
    indexRef.current = current;
  }, [current]);
  function normalized(index: number) {
    return numeric
      ? ((index % values.length) + values.length) % values.length
      : Math.max(0, Math.min(values.length - 1, index));
  }
  function choose(index: number) {
    const next = normalized(index);
    if (next === indexRef.current) return;
    indexRef.current = next;
    onChange(values[next]);
    setDraft(values[next]);
  }
  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    if (!editing) return;
    let next = value;
    if (numeric && /^\d+$/.test(draft))
      next =
        values[
          Math.max(
            0,
            Math.min(values.length - 1, Number(draft) - Number(values[0])),
          )
        ];
    else if (!numeric)
      next =
        values.find((item) =>
          item.toLowerCase().startsWith(draft.trim().toLowerCase()),
        ) ?? value;
    onChange(next);
    setDraft(next);
    setEditing(false);
  }
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let accumulated = 0;
    const wheel = (event: WheelEvent) => {
      if (disabled || document.activeElement === input.current) return;
      event.preventDefault();
      accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      const amount = Math.trunc(accumulated / 24);
      if (amount) {
        accumulated -= amount * 24;
        const index = numeric
          ? (indexRef.current + amount + values.length * 100) % values.length
          : Math.max(0, Math.min(values.length - 1, indexRef.current + amount));
        indexRef.current = index;
        onChange(values[index]);
      }
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [disabled, numeric, values, onChange]);
  function start(event: PointerEvent<HTMLDivElement>) {
    if (
      disabled ||
      event.button !== 0 ||
      (editing && event.target === input.current)
    )
      return;
    event.preventDefault();
    const shown = visibleOffset();
    motion.current?.animation.cancel();
    motion.current = null;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic or already released pointers can't be captured.
    }
    input.current?.blur();
    const step = stepHeight();
    // Pick up the reel where an interrupted settle left it.
    const raw = current - shown / step;
    drag.current = {
      y: event.clientY,
      index: raw,
      raw,
      step,
      lastY: event.clientY,
      time: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const distance = state.y - event.clientY;
    if (!state.moved && Math.abs(distance) > 4) {
      state.moved = true;
      setDragging(true);
    }
    if (!state.moved) return;
    const elapsed = event.timeStamp - state.time;
    if (elapsed > 0) state.velocity = (state.lastY - event.clientY) / elapsed;
    state.lastY = event.clientY;
    state.time = event.timeStamp;
    state.raw = state.index + distance / state.step;
    if (!numeric) state.raw = Math.max(0, Math.min(values.length - 1, state.raw));
    // Only a new value re-renders; the reel itself moves once per frame.
    choose(Math.round(state.raw));
    if (frame.current === undefined) frame.current = requestAnimationFrame(paint);
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    if (state.moved) {
      const velocity = event.timeStamp - state.time < 80 ? state.velocity : 0;
      let target = Math.round(
        state.raw + Math.max(-5, Math.min(5, (velocity * 90) / state.step)),
      );
      if (!numeric) target = Math.max(0, Math.min(values.length - 1, target));
      const from = (target - state.raw) * state.step;
      drag.current = null;
      setDragging(false);
      // This settle already covers the rows the fling adds: mark them rendered
      // so the value effect doesn't restart it one row further away.
      previous.current = normalized(target);
      choose(target);
      // Glide from where the finger left the reel to the chosen row.
      settle(from, -velocity * 1000);
    } else {
      drag.current = null;
      setDragging(false);
      setDraft(value);
      setEditing(true);
      input.current?.focus();
      input.current?.select();
    }
  }
  return (
    <div
      ref={root}
      data-slot="time-wheel"
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className="relative h-[12.75rem] min-w-0 flex-1 touch-none select-none overflow-hidden rounded-xl outline-none [mask-image:linear-gradient(transparent,black_25%,black_75%,transparent)] data-disabled:text-label-disabled"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={() => {
        const state = drag.current;
        drag.current = null;
        setDragging(false);
        if (state?.moved) settle((previous.current - state.raw) * state.step);
      }}
    >
      <div
        ref={reel}
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        {Array.from({ length: 17 }, (_, i) => i - 8).map((delta) => (
          <span
            key={delta}
            className={cn(
              "flex h-8 w-full shrink-0 items-center justify-center",
              delta === 0
                ? "text-large-title font-semibold"
                : "text-title-2 text-white/40",
              delta === 0 && editing && "invisible",
            )}
            style={{ transform: `perspective(14rem) rotateX(${Math.max(-85, Math.min(85, -delta * 16))}deg)` }}
          >
            {!numeric &&
            (current + delta < 0 || current + delta >= values.length)
              ? ""
              : values[normalized(current + delta)]}
          </span>
        ))}
      </div>
      <input
        ref={input}
        type="text"
        inputMode={numeric ? "numeric" : "text"}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={numeric ? Number(values[0]) : 0}
        aria-valuemax={numeric ? Number(values.at(-1)) : values.length - 1}
        aria-valuenow={numeric ? Number(value) : current}
        aria-valuetext={value}
        disabled={disabled}
        value={editing ? draft : value}
        readOnly={!editing}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => {
          setDraft(value);
          setEditing(true);
          event.currentTarget.select();
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (
            [
              "ArrowUp",
              "ArrowDown",
              "PageUp",
              "PageDown",
              "Home",
              "End",
            ].includes(event.key)
          ) {
            event.preventDefault();
            const amount =
              event.key === "ArrowUp"
                ? 1
                : event.key === "ArrowDown"
                  ? -1
                  : event.key === "PageUp"
                    ? 5
                    : -5;
            choose(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? values.length - 1
                  : current + amount,
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            input.current?.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancelled.current = true;
            setDraft(value);
            setEditing(false);
            input.current?.blur();
          }
        }}
        className={cn(
          "absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 rounded-lg bg-transparent text-center text-large-title font-semibold outline-none focus:bg-white/10 focus:ring-2 focus:ring-inset focus:ring-white/40",
          !editing && "opacity-0",
        )}
      />
    </div>
  );
}
export { TimeWheel };
