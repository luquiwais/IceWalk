import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { demoPlan, demoReplan } from "@/lib/plan";

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
});
