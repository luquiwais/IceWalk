import { render, waitFor } from "@testing-library/react";
import { forwardRef, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// jsdom has no layout, so Base UI never renders the indicator. A bare stand-in
// lets the test drive the CSS variables Base UI would write.
vi.mock("@base-ui/react/tabs", () => ({
  Tabs: {
    Indicator: forwardRef<HTMLSpanElement, ComponentProps<"span"> & { renderBeforeHydration?: boolean }>(
      function Indicator(props, ref) {
        const rest = { ...props };
        delete rest.renderBeforeHydration;
        return <span ref={ref} data-testid="lens" {...rest} />;
      },
    ),
  },
}));

import { LiquidIndicator } from "./motion";
import { createSpringTrack, springState } from "./spring-motion";

function setLens(lens: HTMLElement, left: number, width = 100, top = 0, height = 44) {
  lens.style.setProperty("--active-tab-left", `${left}px`);
  lens.style.setProperty("--active-tab-top", `${top}px`);
  lens.style.setProperty("--active-tab-width", `${width}px`);
  lens.style.setProperty("--active-tab-height", `${height}px`);
}

type Call = { target: Element; keyframes: Keyframe[] };

describe("LiquidIndicator", () => {
  let calls: Call[];
  beforeEach(() => {
    calls = [];
    Element.prototype.animate = vi.fn(function (this: Element, keyframes: Keyframe[]) {
      calls.push({ target: this, keyframes });
      return {
        cancel: vi.fn(),
        currentTime: 65,
        effect: { getComputedTiming: () => ({ progress: 0.5 }) },
      } as unknown as Animation;
    });
  });
  afterEach(() => {
    // @ts-expect-error jsdom lacks WAAPI; remove the stub again.
    delete Element.prototype.animate;
    vi.restoreAllMocks();
  });

  function setup() {
    const view = render(
      <div className="vision-surface">
        <button data-active="">One</button>
        <button>Two</button>
        <LiquidIndicator />
      </div>,
    );
    const lens = view.getByTestId("lens");
    const [one, two] = view.getAllByRole("button");
    return { lens, one, two };
  }

  it("glides only its paint layers with translate and scale, reading inline values", async () => {
    const { lens, one, two } = setup();
    setLens(lens, 0);
    await Promise.resolve();
    const computed = vi.spyOn(window, "getComputedStyle");
    one.removeAttribute("data-active");
    two.setAttribute("data-active", "");
    setLens(lens, 200);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    const layers = lens.querySelectorAll("[data-vision-layer]");
    expect(calls.map((c) => c.target)).toEqual([...layers]);
    const from = calls[0].keyframes[0], to = calls[0].keyframes.at(-1)!;
    expect(from.translate).toBe("-200px 0px");
    expect(to.translate).toBe("0px 0px");
    expect(to.scale).toBe("1 1");
    // Geometry never animates; no style or layout reads on the way.
    expect(calls[0].keyframes.some((k) => "left" in k || "width" in k)).toBe(false);
    expect(computed).not.toHaveBeenCalled();
  });

  it("covers the old tab's size when the tabs differ in width", async () => {
    const { lens, one, two } = setup();
    setLens(lens, 0, 50);
    await Promise.resolve();
    one.removeAttribute("data-active");
    two.setAttribute("data-active", "");
    setLens(lens, 100, 100);
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    // Old center 25, new center 150; old width is half the new one.
    expect(calls[0].keyframes[0]).toMatchObject({ translate: "-125px 0px", scale: "0.5 1" });
  });

  it("retargets an interrupted glide from where the lens is", async () => {
    const { lens, one, two } = setup();
    setLens(lens, 0);
    await Promise.resolve();
    one.removeAttribute("data-active");
    two.setAttribute("data-active", "");
    setLens(lens, 200);
    await waitFor(() => expect(calls.length).toBe(2));
    two.removeAttribute("data-active");
    one.setAttribute("data-active", "");
    setLens(lens, 0);
    // The physical oscillator is sampled at the WAAPI playhead, not a new
    // easing curve whose velocity would restart from zero.
    await waitFor(() => expect(calls.length).toBe(4));
    const position = springState(createSpringTrack({ from: 50, to: 250, velocity: 0, duration: 280, bounce: .15 }), 65).position - 50;
    expect(parseFloat(String(calls[2].keyframes[0].translate))).toBeCloseTo(position, 2);
  });

  it("keeps the incoming velocity before reversing an interrupted glide", async () => {
    const { lens, one, two } = setup();
    setLens(lens, 0);
    await Promise.resolve();
    one.removeAttribute("data-active"); two.setAttribute("data-active", "");
    setLens(lens, 200);
    await waitFor(() => expect(calls.length).toBe(2));
    two.removeAttribute("data-active"); one.setAttribute("data-active", "");
    setLens(lens, 0);
    await waitFor(() => expect(calls.length).toBe(4));
    const [start, after] = calls[2].keyframes;
    // It is still travelling right; it must decelerate before coming back.
    expect(parseFloat(String(after.translate))).toBeGreaterThan(parseFloat(String(start.translate)));
  });

  it("jumps without a glide when the same tab only moves (resize, scroll)", async () => {
    const { lens } = setup();
    setLens(lens, 0);
    await Promise.resolve();
    setLens(lens, 30);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toHaveLength(0);
  });

  it("never transitions the lens box in CSS", () => {
    const css = readFileSync(join(process.cwd(), "src/motion.css"), "utf8");
    const rule = css.match(/\.vision-surface > \.vision-selection-indicator \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("left: var(--active-tab-left)");
    expect(rule).not.toContain("transition");
  });
});
