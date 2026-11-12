import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { demoMeasurement, demoPlan, demoReplan } from "@/lib/plan";

import { fitCamera, worldToScreen } from "./camera";
import { framePoints, habitatOnStation, routeLines, sceneStations, stationName } from "./site-data";
import { SiteScene, type SiteSceneProps } from "./site-scene";

const VIEW = { width: 1440, height: 900 };

/** rAF that runs only when flushed, like a real frame. */
let frames: FrameRequestCallback[] = [];
function flushFrames() {
  act(() => {
    for (let i = 0; i < 10 && frames.length; i++) {
      const run = frames;
      frames = [];
      run.forEach((cb) => cb(performance.now()));
    }
  });
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: VIEW.width,
    bottom: VIEW.height,
    width: VIEW.width,
    height: VIEW.height,
    toJSON: () => ({}),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setup(props: Partial<SiteSceneProps> = {}) {
  const onSelectStation = vi.fn();
  const onHoverStation = vi.fn();
  const utils = render(
    <SiteScene
      plan={demoPlan}
      selectedStationId={null}
      hoveredStationId={null}
      onSelectStation={onSelectStation}
      onHoverStation={onHoverStation}
      layers={{ grid: true, rings: true }}
      {...props}
    />,
  );
  flushFrames();
  return { ...utils, onSelectStation, onHoverStation };
}

function anchorOf(name: RegExp) {
  return screen.getByRole("button", { name }).parentElement as HTMLElement;
}

function translate(el: HTMLElement): [number, number] {
  const m = el.style.transform.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/);
  if (!m) throw new Error(`no transform: ${el.style.transform}`);
  return [Number(m[1]), Number(m[2])];
}

describe("site data", () => {
  it("names stations for assistive tech", () => {
    expect(stationName(demoPlan.stations[0])).toBe("Station 1, E03S22, P(ice) 65%");
  });

  it("converts the route as it comes, in grid meters", () => {
    const [line] = routeLines(demoPlan);
    expect(line).toHaveLength(17);
    // The planner's route vertices sit ~(+5, -5) m off the stations: drawn as given.
    expect(line[0][0]).toBeCloseTo(305, 0);
    expect(line[0][1]).toBeCloseTo(-2205, 0);
  });

  it("labels the re-plan diff", () => {
    const { stations, dropped } = sceneStations(demoReplan, demoPlan);
    expect(stations.filter((s) => s.status === "added").map((s) => s.id)).toEqual(["E02S22"]);
    expect(dropped.map((s) => s.id)).toEqual(["E03S22", "E01S23"]);
  });

  it("knows when the habitat sits on a station", () => {
    expect(habitatOnStation(demoPlan.stations)).toBe(true);
    expect(habitatOnStation(demoReplan.stations)).toBe(false);
  });
});

describe("SiteScene", () => {
  it("calls a completed station Measured instead of Dropped after re-planning", () => {
    setup({ plan: demoReplan, previousPlan: demoPlan, measurements: [demoMeasurement] });
    expect(screen.getByRole("img", { name: /Measured station E03S22.*no ice to 1.0 m/ })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Dropped station E03S22/ })).not.toBeInTheDocument();
  });
  it("renders every station as a button with its accessible name", () => {
    setup();
    for (const s of demoPlan.stations) {
      expect(screen.getByRole("button", { name: stationName(s) })).toBeInTheDocument();
    }
    expect(screen.getByRole("group", { name: "Site map, S1094b" })).toHaveAttribute("aria-roledescription", "map");
  });

  it("shows the HiRISE credit", () => {
    setup();
    expect(screen.getByText("HiRISE ESP_073578_2155 · NASA/JPL-Caltech/UArizona")).toBeInTheDocument();
  });

  it("frames the plan in the free area on first layout", () => {
    const insets = { top: 88, right: 440, bottom: 176, left: 96 };
    setup({ insets });
    const cam = fitCamera(framePoints(demoPlan), VIEW, insets);
    const [ex, ey] = worldToScreen(cam, VIEW, 300, -2200);
    const [x, y] = translate(anchorOf(/^Station 1,/));
    expect(x).toBeCloseTo(ex, 0);
    expect(y).toBeCloseTo(ey, 0);
  });

  it("reframes when measured interface insets arrive after the initial camera", () => {
    const { rerender } = setup();
    const insets = { top: 120, right: 440, bottom: 176, left: 96 };
    rerender(<SiteScene plan={demoPlan} selectedStationId={null} hoveredStationId={null} onSelectStation={vi.fn()} onHoverStation={vi.fn()} layers={{ grid: true, rings: true }} insets={insets} />);
    flushFrames();
    const cam = fitCamera(framePoints(demoPlan), VIEW, insets);
    const [ex, ey] = worldToScreen(cam, VIEW, 300, -2200);
    const [x, y] = translate(anchorOf(/^Station 1,/));
    expect(x).toBeCloseTo(ex, 0);
    expect(y).toBeCloseTo(ey, 0);
  });

  it("keeps markers in screen space while the map zooms", () => {
    setup();
    const scene = screen.getByRole("group", { name: "Site map, S1094b" });
    const before = translate(anchorOf(/^Station 3,/));
    // Zoom out around station 3: it stays put, its neighbor moves closer.
    const neighbor = translate(anchorOf(/^Station 4,/));
    fireEvent.wheel(scene, { deltaY: 200, clientX: before[0], clientY: before[1] });
    flushFrames();
    const after = translate(anchorOf(/^Station 3,/));
    expect(after[0]).toBeCloseTo(before[0], 0);
    expect(after[1]).toBeCloseTo(before[1], 0);
    const moved = translate(anchorOf(/^Station 4,/));
    expect(Math.abs(moved[0] - after[0])).toBeLessThan(Math.abs(neighbor[0] - before[0]));
  });

  it("zooms and pans with the keyboard", async () => {
    setup();
    const scene = screen.getByRole("group", { name: "Site map, S1094b" });
    scene.focus();
    const start = translate(anchorOf(/^Station 1,/));
    await userEvent.keyboard("{ArrowRight}");
    flushFrames();
    const panned = translate(anchorOf(/^Station 1,/));
    expect(panned[0]).toBeCloseTo(start[0] - 80, 0);
    await userEvent.keyboard("-");
    flushFrames();
    const s1 = translate(anchorOf(/^Station 1,/));
    const s2 = translate(anchorOf(/^Station 2,/));
    // 100 m apart; zoomed out from the 3.2 px/m fit by 1.5.
    expect(s2[0] - s1[0]).toBeCloseTo((100 * 3.2) / 1.5, 0);
  });

  it("selects a station by click and by keyboard, and toggles it off", async () => {
    const { onSelectStation, rerender } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Station 2,/ }));
    expect(onSelectStation).toHaveBeenLastCalledWith("E04S22");

    rerender(
      <SiteScene
        plan={demoPlan}
        selectedStationId="E04S22"
        hoveredStationId={null}
        onSelectStation={onSelectStation}
        onHoverStation={vi.fn()}
        layers={{ grid: true, rings: true }}
      />,
    );
    const selected = screen.getByRole("button", { name: /^Station 2,/ });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Model range 100 m")).toBeInTheDocument();
    expect(screen.getByText(/Selected Station 2, E04S22/)).toBeInTheDocument();

    selected.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelectStation).toHaveBeenLastCalledWith(null);

    screen.getByRole("button", { name: /^Station 5,/ }).focus();
    await userEvent.keyboard(" ");
    expect(onSelectStation).toHaveBeenLastCalledWith("E02S23");

    await userEvent.keyboard("{Escape}");
    expect(onSelectStation).toHaveBeenLastCalledWith(null);
  });

  it("reports hover and shows the hover label", async () => {
    const { onHoverStation, rerender } = setup();
    const button = screen.getByRole("button", { name: /^Station 1,/ });
    await userEvent.hover(button);
    expect(onHoverStation).toHaveBeenLastCalledWith("E03S22");
    await userEvent.unhover(button);
    expect(onHoverStation).toHaveBeenLastCalledWith(null);

    rerender(
      <SiteScene
        plan={demoPlan}
        selectedStationId={null}
        hoveredStationId="E03S22"
        onSelectStation={vi.fn()}
        onHoverStation={onHoverStation}
        layers={{ grid: true, rings: true }}
      />,
    );
    expect(button).toHaveAttribute("data-hovered");
    expect(screen.getByText("E03S22 · 65%")).toBeInTheDocument();
  });

  it("labels the re-plan diff with text, not only shape", () => {
    setup({ plan: demoReplan, previousPlan: demoPlan });
    expect(screen.getByRole("button", { name: /^Station 5, E02S22, .*added by the re-plan$/ })).toBeInTheDocument();
    expect(screen.getByText("Added")).toBeInTheDocument();
    expect(screen.getAllByText("Dropped")).toHaveLength(2);
    expect(screen.getByRole("img", { name: "Dropped station E01S23, was station 6" })).toBeInTheDocument();
    // Dropped stations are not part of the plan: no buttons for them.
    expect(screen.queryByRole("button", { name: /E01S23/ })).toBeNull();
  });

  it("hides the station grid when the layer is off", () => {
    const { container, rerender } = setup();
    const grid = container.querySelector(".site-grid-lines")!;
    expect(grid.getAttribute("d")).not.toBe("");
    rerender(
      <SiteScene
        plan={demoPlan}
        selectedStationId={null}
        hoveredStationId={null}
        onSelectStation={vi.fn()}
        onHoverStation={vi.fn()}
        layers={{ grid: false, rings: false }}
      />,
    );
    flushFrames();
    expect(grid.getAttribute("d")).toBe("");
    const rings = [...container.querySelectorAll<SVGCircleElement>(".site-ring")];
    expect(rings.every((r) => r.style.display === "none")).toBe(true);
  });

  it("draws a raster when one is passed", () => {
    const { container } = setup({ raster: { url: "/maps/test.png", bounds: { xmin: 0, ymin: -2500, xmax: 500, ymax: -2000 } } });
    expect(container.querySelector('img[data-kind="raster"]')).toHaveAttribute("src", "/maps/test.png");
  });

  describe("oblique projection", () => {
    const insets = { top: 120, right: 440, bottom: 176, left: 96 };
    const reduced = () => vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));

    it("keeps the next station below the legend when a compact EV viewport has little free height", () => {
      reduced();
      vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({
        x: 0, y: 0, left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844, toJSON: () => ({}),
      });
      const compactInsets = { top: 265, right: 20, bottom: 500, left: 20 };
      setup({ insets: compactInsets, projection: { headingDeg: 90, pitchDeg: 58, focus: [300, -2200] } });
      const [, y2] = translate(anchorOf(/^Station 2,/));
      expect(y2).toBeGreaterThan(compactInsets.top + 16);
      const [, y1] = translate(anchorOf(/^Station 1,/));
      expect(y1).toBeLessThan(844 - compactInsets.bottom - 16);
    });

    it("turns the heading up around the focus and keeps markers upright", () => {
      reduced();
      setup({ insets, projection: { headingDeg: 90, pitchDeg: 58, focus: [300, -2200] } });
      const map = screen.getByRole("group", { name: "Site map, S1094b" });
      expect(map).toHaveAttribute("data-projected");
      expect(map).toHaveAttribute("data-tilted");
      // Station 1 is the focus; station 2 is 100 m east of it, so it lies straight ahead.
      const [x1, y1] = translate(anchorOf(/^Station 1,/));
      const [x2, y2] = translate(anchorOf(/^Station 2,/));
      expect(x1).toBeCloseTo(96 + (VIEW.width - 96 - 440) / 2, 0);
      expect(x2).toBeCloseTo(x1, 0);
      expect(y2).toBeLessThan(y1 - 20);
      expect(anchorOf(/^Station 2,/).style.transform).toMatch(/scale\(0\.\d+\)/);
      expect(screen.getByRole("img", { name: "Heading 090°, north to the left" })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: "North is up" })).not.toBeInTheDocument();
    });

    it("returns to the north-up framing when the projection is removed", () => {
      reduced();
      const { rerender } = setup({ insets, projection: { headingDeg: 90, pitchDeg: 58, focus: [300, -2200] } });
      rerender(<SiteScene plan={demoPlan} selectedStationId={null} hoveredStationId={null} onSelectStation={vi.fn()} onHoverStation={vi.fn()} layers={{ grid: true, rings: true }} insets={insets} />);
      flushFrames();
      const map = screen.getByRole("group", { name: "Site map, S1094b" });
      expect(map).not.toHaveAttribute("data-tilted");
      const cam = fitCamera(framePoints(demoPlan), VIEW, insets);
      const [ex, ey] = worldToScreen(cam, VIEW, 300, -2200);
      const [x, y] = translate(anchorOf(/^Station 1,/));
      expect(x).toBeCloseTo(ex, 0);
      expect(y).toBeCloseTo(ey, 0);
      expect(anchorOf(/^Station 1,/).style.transform).not.toMatch(/scale/);
    });

    it("frames the stations a re-plan dropped together with the new plan", () => {
      setup({ insets, plan: demoReplan, previousPlan: demoPlan });
      const dropped = sceneStations(demoReplan, demoPlan).dropped.map((s) => [s.position[0], s.position[1]] as [number, number]);
      const cam = fitCamera([...framePoints(demoReplan), ...dropped], VIEW, insets);
      const [ex, ey] = worldToScreen(cam, VIEW, 400, -2200);
      const [x, y] = translate(anchorOf(/^Station 1,/));
      expect(x).toBeCloseTo(ex, 0);
      expect(y).toBeCloseTo(ey, 0);
    });
  });
});
