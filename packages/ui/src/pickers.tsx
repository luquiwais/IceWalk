"use client";

import { Popover } from "@base-ui/react/popover";
import { ChevronLeft, ChevronRight, Pipette, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button, IconButton } from "./button";
import { Material } from "./material";
import { SegmentedControl } from "./segmented-control";
import { Slider } from "./slider";
import { TimeWheel as Wheel } from "./time-wheel";
import { Text } from "./text";
import { cn } from "./utils";

function PickerPopover({
  trigger,
  label,
  children,
  focusPopup = false,
}: {
  trigger: ReactElement;
  label: string;
  children: ReactNode;
  /** Focus the popup itself on open instead of its first tabbable field (time wheels). */
  focusPopup?: boolean;
}) {
  const popup = useRef<HTMLDivElement>(null);
  return (
    <Popover.Root>
      <Popover.Trigger render={trigger} />
      <Popover.Portal>
        <Popover.Positioner sideOffset={12} className="z-50">
          <Popover.Popup
            ref={popup}
            initialFocus={focusPopup ? popup : true}
            data-slot="picker-popover"
            className="vision-motion-popup relative max-w-[calc(100vw-2rem)] text-label outline-none"
          >
            <Popover.Title className="sr-only">{label}</Popover.Title>
            {children}
            <Popover.Close className="sr-only">Close {label}</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

type DatePickerProps = {
  label: string;
  value: string;
  onValueChange: (date: string) => void;
  disabled?: boolean;
  expanded?: boolean;
  className?: string;
};
/** Figma expanded calendar 436pt, 44pt days, 7pt row gaps. */
function Calendar({
  label,
  value,
  onValueChange,
  disabled = false,
  className,
}: DatePickerProps) {
  const [month, setMonth] = useState(
    () =>
      new Date(
        parseDate(value).getFullYear(),
        parseDate(value).getMonth(),
        1,
        12,
      ),
  );
  const [focusDay, setFocusDay] = useState(value);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const moveFocus = useRef(false);
  useEffect(() => {
    if (moveFocus.current) {
      buttons.current.get(focusDay)?.focus();
      moveFocus.current = false;
    }
  }, [focusDay, month]);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = month.getDay();
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, day: number) {
    const current = new Date(month.getFullYear(), month.getMonth(), day, 12);
    const map: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -current.getDay(),
      End: 6 - current.getDay(),
    };
    if (event.key === "PageUp" || event.key === "PageDown")
      current.setMonth(
        current.getMonth() + (event.key === "PageUp" ? -1 : 1),
        1,
      );
    else if (event.key in map)
      current.setDate(current.getDate() + map[event.key]);
    else return;
    event.preventDefault();
    moveFocus.current = true;
    setFocusDay(iso(current));
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1, 12));
  }
  return (
    <Material
      kind="glass"
      className={cn("w-[27.25rem] max-w-full rounded-[2rem] p-4", className)}
    >
      <div className="relative flex items-center justify-between gap-2">
        <Text
          variant="body"
          weight="semibold"
          aria-live="polite"
          className="px-4"
        >
          {month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <div className="flex gap-4">
          <IconButton
            label="Previous month"
            disabled={disabled}
            showTooltip={false}
            onClick={() =>
              setMonth(
                new Date(month.getFullYear(), month.getMonth() - 1, 1, 12),
              )
            }
          >
            <ChevronLeft aria-hidden className="size-7!" />
          </IconButton>
          <IconButton
            label="Next month"
            disabled={disabled}
            showTooltip={false}
            onClick={() =>
              setMonth(
                new Date(month.getFullYear(), month.getMonth() + 1, 1, 12),
              )
            }
          >
            <ChevronRight aria-hidden className="size-7!" />
          </IconButton>
        </div>
      </div>
      <div key={month.toISOString()} role="grid" aria-label={label} className="vision-content-change relative mt-4">
        <div role="row" className="grid grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text
              key={d}
              as="span"
              role="columnheader"
              variant="footnote"
              tone="secondary"
              className="py-2 text-center uppercase"
            >
              {d}
            </Text>
          ))}
        </div>
        {Array.from({ length: Math.ceil((offset + days) / 7) }, (_, week) => (
          <div
            role="row"
            key={week}
            className="mt-[0.4375rem] grid grid-cols-7 justify-items-center"
          >
            {Array.from({ length: 7 }, (_, weekday) => {
              const day = week * 7 + weekday - offset + 1;
              if (day < 1 || day > days)
                return <span role="gridcell" key={weekday} />;
              const key = iso(
                new Date(month.getFullYear(), month.getMonth(), day, 12),
              );
              return (
                <span role="gridcell" aria-selected={key === value} key={key}>
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) buttons.current.set(key, node);
                      else buttons.current.delete(key);
                    }}
                    disabled={disabled}
                    tabIndex={
                      key ===
                      (focusDay.startsWith(iso(month).slice(0, 7))
                        ? focusDay
                        : iso(month))
                        ? 0
                        : -1
                    }
                    aria-label={parseDate(key).toLocaleDateString("en-US", {
                      dateStyle: "full",
                    })}
                    onKeyDown={(event) => keyboard(event, day)}
                    onClick={() => {
                      setFocusDay(key);
                      onValueChange(key);
                    }}
                    className={cn(
                      "size-11 rounded-full text-[1rem] outline-none hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled",
                      key === value && "bg-white text-black hover:bg-white",
                    )}
                  >
                    {day}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </Material>
  );
}
function DatePicker(props: DatePickerProps) {
  if (props.expanded) return <Calendar {...props} />;
  return (
    <PickerPopover
      label={props.label}
      trigger={
        <Button disabled={props.disabled} aria-label={props.label}>
          {parseDate(props.value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Button>
      }
    >
      <Calendar {...props} />
    </PickerPopover>
  );
}

function TimePicker({
  label,
  value,
  onValueChange,
  expanded = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (time: string) => void;
  expanded?: boolean;
  disabled?: boolean;
}) {
  const [h, m] = value.split(":").map(Number);
  const hour = h % 12 || 12;
  const period = h >= 12 ? "PM" : "AM";
  function change(hours: number, minutes: number, meridiem: string) {
    onValueChange(
      `${String((hours % 12) + (meridiem === "PM" ? 12 : 0)).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    );
  }
  const wheels = (
    <Material
      kind="glass"
      className={cn(
        "flex h-[14.75rem] w-[15.875rem] max-w-full items-center gap-4 rounded-[2rem] p-4",
        disabled && "text-label-disabled",
      )}
    >
      <Wheel
        label={`${label} hour`}
        disabled={disabled}
        value={String(hour)}
        values={Array.from({ length: 12 }, (_, i) => String(i + 1))}
        onChange={(n) => change(Number(n), m, period)}
      />
      <Wheel
        label={`${label} minute`}
        disabled={disabled}
        value={String(m).padStart(2, "0")}
        values={Array.from({ length: 60 }, (_, i) =>
          String(i).padStart(2, "0"),
        )}
        onChange={(n) => change(hour, Number(n), period)}
      />
      <Wheel
        label={`${label} period`}
        disabled={disabled}
        value={period}
        values={["AM", "PM"]}
        onChange={(n) => change(hour, m, n)}
      />
    </Material>
  );
  return expanded ? (
    wheels
  ) : (
    <PickerPopover
      label={label}
      focusPopup
      trigger={
        <Button disabled={disabled} aria-label={label}>
          {hour}:{String(m).padStart(2, "0")} {period}
        </Button>
      }
    >
      {wheels}
    </PickerPopover>
  );
}

const SWATCHES = [
  "#000000",
  "#007aff",
  "#34c759",
  "#ff4015",
  "#7ac6f5",
  "#af52de",
  "#5856d6",
  "#ffffff",
];
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function hex(channels: number[]) {
  return `#${channels.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
function hsl(h: number, l: number) {
  const c = 1 - Math.abs(2 * l - 1),
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  const values =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return hex(values.map((v) => (v + m) * 255));
}
function ColorPicker({
  label = "Colors",
  value,
  onValueChange,
  disabled = false,
  initialTab = "grid",
  onClose,
}: {
  label?: string;
  value: string;
  onValueChange: (color: string) => void;
  disabled?: boolean;
  initialTab?: string;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [opacity, setOpacity] = useState(100);
  const [position, setPosition] = useState({ h: 15, l: 0.5 });
  const channels = rgb(value);
  function spectrum(x: number, y: number) {
    const h = Math.max(0, Math.min(359, x * 360)),
      l = Math.max(0, Math.min(1, 1 - y));
    setPosition({ h, l });
    onValueChange(hsl(h, l));
  }
  return (
    <Material
      kind="glass"
      className="w-[25.5rem] max-w-full rounded-[2.875rem] p-6"
    >
      <header className="relative flex items-center justify-between pb-6">
        <span aria-hidden className="flex size-11 items-center justify-center">
          <Pipette className="size-[1.1875rem]" />
        </span>
        <Text as="h3" variant="title-2">
          {label}
        </Text>
        {onClose ? (
          <IconButton
            label="Close colors"
            showTooltip={false}
            onClick={onClose}
          >
            <X aria-hidden />
          </IconButton>
        ) : (
          <span className="size-11" />
        )}
      </header>
      <SegmentedControl
        label="Color format"
        value={tab}
        onValueChange={setTab}
        disabled={disabled}
        options={[
          { value: "grid", label: "Grid" },
          { value: "spectrum", label: "Spectrum" },
          { value: "sliders", label: "Sliders" },
        ]}
      />
      <div key={tab} className="vision-motion-enter relative mt-4">
        {tab === "grid" ? (
          <div
            aria-label="Color grid"
            className="grid grid-cols-12 overflow-hidden rounded-2xl"
          >
            {Array.from({ length: 120 }, (_, i) => {
              const color =
                i < 12
                  ? hex(Array(3).fill(Math.round((255 * i) / 11)))
                  : hsl((i % 12) * 30, 0.9 - Math.floor(i / 12) * 0.08);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  aria-label={color}
                  aria-pressed={color === value}
                  onClick={() => onValueChange(color)}
                  className="aspect-square outline-none focus-visible:z-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white aria-pressed:ring-2 aria-pressed:ring-inset aria-pressed:ring-white disabled:opacity-40"
                  style={{ background: color }}
                />
              );
            })}
          </div>
        ) : tab === "spectrum" ? (
          <div
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label="Color spectrum"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(position.h)}
            aria-valuetext={`Hue ${Math.round(position.h)}, lightness ${Math.round(position.l * 100)} percent`}
            onPointerDown={(event) => {
              if (disabled) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              const rect = event.currentTarget.getBoundingClientRect();
              spectrum(
                (event.clientX - rect.left) / rect.width,
                (event.clientY - rect.top) / rect.height,
              );
            }}
            onPointerMove={(event) => {
              if (
                !disabled &&
                event.currentTarget.hasPointerCapture(event.pointerId)
              ) {
                const rect = event.currentTarget.getBoundingClientRect();
                spectrum(
                  (event.clientX - rect.left) / rect.width,
                  (event.clientY - rect.top) / rect.height,
                );
              }
            }}
            onKeyDown={(event) => {
              if (
                disabled ||
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              spectrum(
                (position.h +
                  (event.key === "ArrowRight"
                    ? 2
                    : event.key === "ArrowLeft"
                      ? -2
                      : 0)) /
                  360,
                1 -
                  position.l +
                  (event.key === "ArrowDown"
                    ? 0.02
                    : event.key === "ArrowUp"
                      ? -0.02
                      : 0),
              );
            }}
            className="relative h-[18.75rem] touch-none rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-label"
            style={{
              background:
                "linear-gradient(0deg,black,transparent 50%,white),linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
            }}
          >
            <span
              className="absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{
                left: `${(position.h / 360) * 100}%`,
                top: `${(1 - position.l) * 100}%`,
                background: value,
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-[18.75rem] flex-col justify-evenly gap-4">
            {["Red", "Green", "Blue"].map((channel, i) => (
              <div key={channel}>
                <Text variant="callout" className="mb-2">
                  {channel}{" "}
                  <span className="float-right tabular-nums">
                    {channels[i]}
                  </span>
                </Text>
                <Slider
                  label={channel}
                  variant="color"
                  max={255}
                  value={channels[i]}
                  disabled={disabled}
                  gradient={`linear-gradient(90deg,black,${["#ff0000", "#00ff00", "#0000ff"][i]})`}
                  onValueChange={(n) =>
                    onValueChange(
                      hex(channels.map((v, j) => (j === i ? n : v))),
                    )
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative mt-4">
        <Text variant="callout" className="mb-2">
          Opacity <span className="float-right tabular-nums">{opacity}%</span>
        </Text>
        <Slider
          label="Color opacity"
          variant="color"
          size="large"
          value={opacity}
          disabled={disabled}
          onValueChange={setOpacity}
          gradient={`linear-gradient(90deg,transparent,${value})`}
          className="w-full"
        />
      </div>
      <div className="relative mt-6 flex gap-5">
        <span
          aria-label={`Selected color ${value}, ${opacity}% opacity`}
          className="size-26 shrink-0 rounded-[1.375rem]"
          style={{ background: value, opacity: opacity / 100 }}
        />
        <div className="grid flex-1 grid-cols-4 gap-3">
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              disabled={disabled}
              aria-label={`Swatch ${color}`}
              aria-pressed={value === color}
              onClick={() => onValueChange(color)}
              className="aspect-square rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-pressed:ring-2 aria-pressed:ring-white aria-pressed:ring-offset-2 aria-pressed:ring-offset-transparent disabled:opacity-40"
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
    </Material>
  );
}

export { Calendar, ColorPicker, DatePicker, PickerPopover, TimePicker };
export type { DatePickerProps };
