"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "./utils";

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
  const drag = useRef<{
    y: number;
    index: number;
    lastY: number;
    time: number;
    velocity: number;
    moved: boolean;
  } | null>(null);
  const cancelled = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const numeric = values.every((item) => /^\d+$/.test(item));
  const current = Math.max(0, values.indexOf(value));
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
    indexRef.current = next;
    onChange(values[next]);
    setDraft(values[next]);
  }
  function stepHeight() {
    return ((root.current?.getBoundingClientRect().height || 204) * 32) / 204;
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
    event.currentTarget.setPointerCapture?.(event.pointerId);
    input.current?.blur();
    drag.current = {
      y: event.clientY,
      index: current,
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
    if (Math.abs(distance) > 4) {
      state.moved = true;
      setDragging(true);
    }
    if (!state.moved) return;
    const elapsed = event.timeStamp - state.time;
    if (elapsed > 0) state.velocity = (state.lastY - event.clientY) / elapsed;
    state.lastY = event.clientY;
    state.time = event.timeStamp;
    const raw = state.index + distance / stepHeight();
    choose(Math.round(raw));
    setOffset((Math.round(raw) - raw) * stepHeight());
  }
  function finish(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    setDragging(false);
    setOffset(0);
    if (state.moved) {
      const velocity = event.timeStamp - state.time < 80 ? state.velocity : 0;
      choose(
        Math.round(
          state.index +
            (state.y - event.clientY) / stepHeight() +
            Math.max(-5, Math.min(5, (velocity * 90) / stepHeight())),
        ),
      );
    } else {
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
        drag.current = null;
        setDragging(false);
        setOffset(0);
      }}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center",
          !dragging &&
            "transition-transform duration-150 ease-out motion-reduce:transition-none",
        )}
        style={{ transform: `translateY(${offset}px)` }}
      >
        {[-3, -2, -1, 0, 1, 2, 3].map((delta) => (
          <span
            key={delta}
            className={cn(
              "flex w-full shrink-0 items-center justify-center",
              delta === 0
                ? "h-11 text-large-title font-semibold"
                : "h-8 text-title-2 text-white/40",
              delta === 0 && editing && "invisible",
            )}
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
          "absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 rounded-lg bg-transparent text-center text-large-title font-semibold outline-none focus:bg-white/10 focus:ring-1 focus:ring-white/35",
          !editing && "opacity-0",
        )}
      />
    </div>
  );
}
export { TimeWheel };
