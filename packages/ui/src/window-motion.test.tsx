import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Window, WindowContent, WindowMotion } from "./window";
import { createSpringTrack, springState } from "./spring-motion";

function reduced(matches = false) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("window glass morph", () => {
  it("retargets the visible shape on interruption, touching only direct glass clips", () => {
    reduced();
    let resized: ResizeObserverCallback = () => {};
    vi.stubGlobal("ResizeObserver", class { constructor(callback: ResizeObserverCallback) { resized = callback; } observe() {} disconnect() {} });
    let width = 200;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width, height: 100 }) as DOMRect);
    const paints: { element: Element; keyframes: Keyframe[] }[] = [];
    const animate = vi.fn(function(this: Element, keyframes: Keyframe[]) {
      paints.push({ element: this, keyframes });
      return { cancel: vi.fn(), currentTime: 65, effect: { getComputedTiming: () => ({ progress: .5 }) }, finished: new Promise(() => {}) } as unknown as Animation;
    });
    vi.stubGlobal("Animation", class {});
    const original = Element.prototype.animate;
    Element.prototype.animate = animate;
    const { unmount } = render(<Window aria-label="Morph"><button>Never scale text</button></Window>);
    width = 400; act(() => resized([], {} as ResizeObserver));
    expect(paints).toHaveLength(3);
    expect(paints.every(({element,keyframes}) => element.hasAttribute("data-vision-layer") && keyframes.every(frame => Object.keys(frame).every(key => key === "clipPath" || key === "offset")))).toBe(true);
    width = 600; act(() => resized([], {} as ResizeObserver));
    const visible = springState(createSpringTrack({ from: 200, to: 400, velocity: 0, duration: 360, bounce: 0 }), 65).position;
    const inset = Number(String(paints[3].keyframes[0].clipPath).split(" ")[1].replace("px", ""));
    expect(inset).toBeCloseTo(600 - visible, 2);
    expect(screen.getByText("Never scale text").style.transform).toBe("");
    unmount();
    if (original) Element.prototype.animate = original;
    else delete (Element.prototype as Partial<Element>).animate;
  });
});

describe("WindowContent", () => {
  it.each([false, true])("moves a focused replaced panel into its successor (reduced=%s)", (reduce) => {
    reduced(reduce);
    const { rerender } = render(<WindowContent contentKey="brief"><button>Brief action</button></WindowContent>);
    screen.getByText("Brief action").focus();
    rerender(<WindowContent contentKey="station"><button>Station action</button></WindowContent>);
    expect(screen.getByText("Station action")).toHaveFocus();
  });
  it("does not steal external focus while replacing a panel", () => {
    reduced();
    const external = document.createElement("button"); document.body.append(external); external.focus();
    const { rerender } = render(<WindowContent contentKey="brief"><button>Brief action</button></WindowContent>);
    rerender(<WindowContent contentKey="station"><button>Station action</button></WindowContent>);
    expect(external).toHaveFocus(); external.remove();
  });
  it("keeps explicit ids unique while both panels are retained", () => {
    reduced();
    const { rerender } = render(<WindowContent contentKey="brief"><button id="shared-action">Brief action</button></WindowContent>);
    rerender(<WindowContent contentKey="station"><button id="shared-action">Station action</button></WindowContent>);
    expect(document.querySelectorAll("#shared-action")).toHaveLength(1);
    expect(document.getElementById("shared-action")).toHaveTextContent("Station action");
  });
  it("retains outgoing content inert and hidden from AT until the exit completes", () => {
    reduced(); vi.useFakeTimers();
    const { rerender } = render(<WindowContent contentKey="brief"><button>Brief</button></WindowContent>);
    rerender(<WindowContent contentKey="station"><button>Station</button></WindowContent>);
    expect(screen.getByText("Brief").parentElement).toHaveAttribute("inert");
    expect(screen.getByText("Brief").parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Station" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByText("Brief")).toBeNull();
  });
  it("handles three rapid changes without retaining stale panels", () => {
    reduced(); vi.useFakeTimers();
    const { rerender } = render(<WindowContent contentKey="a">A</WindowContent>);
    rerender(<WindowContent contentKey="b">B</WindowContent>);
    rerender(<WindowContent contentKey="c">C</WindowContent>);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.queryByText("B")).toBeNull();
    expect(screen.getByText("C")).not.toHaveAttribute("inert");
  });
  it("swaps instantly with Reduce Motion", () => {
    reduced(true);
    const { rerender } = render(<WindowContent contentKey="a">A</WindowContent>);
    rerender(<WindowContent contentKey="b">B</WindowContent>);
    expect(screen.queryByText("A")).toBeNull();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
  it("keeps same-key edits live without creating an outgoing panel", () => {
    reduced();
    const { rerender } = render(<WindowContent contentKey="a">Old value</WindowContent>);
    rerender(<WindowContent contentKey="a">New value</WindowContent>);
    expect(screen.queryByText("Old value")).toBeNull();
    expect(screen.getByText("New value")).toBeInTheDocument();
  });
});

describe("WindowMotion", () => {
  it("focuses the window on open and returns focus to its trigger on close", () => {
    reduced(); vi.useFakeTimers();
    const trigger = document.createElement("button"); document.body.append(trigger);
    const restoreFocus = { current: trigger };
    const { rerender } = render(<WindowMotion open restoreFocus={restoreFocus}><Window><button>Close window</button></Window></WindowMotion>);
    expect(screen.getByText("Close window")).toHaveFocus();
    rerender(<WindowMotion open={false} restoreFocus={restoreFocus}><Window><button>Close window</button></Window></WindowMotion>);
    expect(trigger).toHaveFocus();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText("Close window")).toBeNull(); trigger.remove();
  });
  it("can reopen during exit without leaving the content inert", () => {
    reduced(); vi.useFakeTimers();
    const { rerender } = render(<WindowMotion open><Window>Station</Window></WindowMotion>);
    rerender(<WindowMotion open={false}><Window>Station</Window></WindowMotion>);
    rerender(<WindowMotion open><Window>Station</Window></WindowMotion>);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Station").closest("[inert]")).toBeNull();
  });
});
