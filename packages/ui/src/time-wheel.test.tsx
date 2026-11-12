import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimeWheel } from "./time-wheel";

const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function Harness({ onCommit, onChange }: { onCommit: () => void; onChange: (v: string) => void }) {
  const [value, setValue] = useState("30");
  return (
    <Profiler id="wheel" onRender={onCommit}>
      <TimeWheel
        label="Minute"
        value={value}
        values={minutes}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
    </Profiler>
  );
}

describe("TimeWheel drag", () => {
  let frames: FrameRequestCallback[];
  let rects: number;
  beforeEach(() => {
    frames = [];
    rects = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => {
      rects++;
      return { x: 0, y: 0, top: 0, left: 0, width: 80, height: 204, right: 80, bottom: 204, toJSON() {} } as DOMRect;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  const flush = () => act(() => frames.splice(0).forEach((cb) => cb(0)));

  function setup() {
    const commits = vi.fn();
    const changes = vi.fn();
    render(<Harness onCommit={commits} onChange={changes} />);
    const wheel = screen.getByRole("spinbutton").closest("[data-slot=time-wheel]") as HTMLElement;
    const reel = wheel.querySelector("[aria-hidden]") as HTMLElement;
    return { commits, changes, wheel, reel };
  }

  it("follows the pointer with refs and frames, re-rendering only when the value changes", () => {
    const { commits, changes, wheel, reel } = setup();
    fireEvent.pointerDown(wheel, { clientY: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(wheel, { clientY: 94, pointerId: 1 }); // starts the drag
    flush();
    const settled = commits.mock.calls.length;
    for (const y of [93, 92, 91, 90, 89]) {
      fireEvent.pointerMove(wheel, { clientY: y, pointerId: 1 });
      flush();
    }
    // 11 px of a 32 px step: same minute, so nothing re-renders.
    expect(commits.mock.calls.length).toBe(settled);
    expect(changes).not.toHaveBeenCalled();
    expect(reel.style.transform).toBe("translateY(-11px)");
    // One measurement for the whole gesture, none per move.
    expect(rects).toBeLessThanOrEqual(1);
  });

  it("changes the value once per step crossed and keeps the reel continuous", () => {
    const { changes, wheel, reel } = setup();
    fireEvent.pointerDown(wheel, { clientY: 200, button: 0, pointerId: 1 });
    for (let y = 199; y >= 150; y--) fireEvent.pointerMove(wheel, { clientY: y, pointerId: 1 });
    flush();
    // 50 px up = 1.5625 steps: rounds to two steps ahead.
    expect(changes.mock.calls.map(([v]) => v)).toEqual(["31", "32"]);
    expect(reel.style.transform).toBe("translateY(14px)");
  });

  it("schedules at most one frame per burst of moves", () => {
    const { wheel } = setup();
    fireEvent.pointerDown(wheel, { clientY: 100, button: 0, pointerId: 1 });
    for (let y = 99; y > 80; y--) fireEvent.pointerMove(wheel, { clientY: y, pointerId: 1 });
    expect(frames.length).toBe(1);
  });

  it("starts the fling settle where the finger left the reel, without adding a row", () => {
    const starts: number[] = [];
    HTMLElement.prototype.animate = function (keyframes: Keyframe[]) {
      starts.push(parseFloat(String(keyframes[0].transform).replace("translateY(", "")));
      return { cancel() {}, effect: { getComputedTiming: () => ({ progress: 0 }) } } as unknown as Animation;
    };
    try {
      const { changes, wheel } = setup();
      const at = (type: "pointerDown" | "pointerMove" | "pointerUp", clientY: number, time: number) => {
        const event = createEvent[type](wheel, { clientY, button: 0, pointerId: 1 });
        Object.defineProperty(event, "timeStamp", { value: time });
        fireEvent(wheel, event);
      };
      at("pointerDown", 100, 0);
      at("pointerMove", 94, 10);
      at("pointerMove", 92, 20);
      at("pointerMove", 90, 30); // 10 px up at 0.2 px/ms: still minute 30
      expect(changes).not.toHaveBeenCalled();
      at("pointerUp", 90, 35);
      // The fling carries it one row on: 30.3125 + 0.5625 rounds to 31.
      expect(changes.mock.calls.map(([v]) => v)).toEqual(["31"]);
      // Row 31 sits 22 px below centre when released; every settle starts there.
      expect(starts.length).toBeGreaterThan(0);
      expect(starts.every((y) => y === 22)).toBe(true);
    } finally {
      delete (HTMLElement.prototype as { animate?: unknown }).animate;
    }
  });

  it("keeps the full visible offset of a fast fling instead of clipping it to two rows", () => {
    const starts: number[] = [];
    HTMLElement.prototype.animate = function (keyframes: Keyframe[]) {
      starts.push(parseFloat(String(keyframes[0].transform).replace("translateY(", "")));
      return { cancel() {}, currentTime: 0, effect: { getComputedTiming: () => ({ progress: 0 }) } } as unknown as Animation;
    };
    try {
      const { wheel } = setup();
      const at = (type: "pointerDown" | "pointerMove" | "pointerUp", clientY: number, time: number) => {
        const event = createEvent[type](wheel, { clientY, button: 0, pointerId: 1 });
        Object.defineProperty(event, "timeStamp", { value: time }); fireEvent(wheel, event);
      };
      at("pointerDown", 100, 1000); at("pointerMove", 60, 1010); at("pointerUp", 60, 1015);
      // Raw31.25 plus maxfive-row impulse→36; row36 is152px belowcentre.
      expect(starts.at(-1)).toBe(152);
    } finally { delete (HTMLElement.prototype as { animate?: unknown }).animate; }
  });
});
