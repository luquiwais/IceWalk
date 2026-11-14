import { describe, expect, it } from "vitest";

import {
  clampCamera,
  detailOpacity,
  fitCamera,
  FIT_MARGIN,
  freeArea,
  horizonY,
  lerpCamera,
  MAX_PX_PER_M,
  MIN_PX_PER_M,
  NO_INSETS,
  projectOblique,
  ringStepM,
  scaleBar,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Box,
} from "./camera";

const VIEW = { width: 1440, height: 900 };
const BOUNDS: Box = { xmin: -1500, ymin: -3300, xmax: 2100, ymax: 900 };
// The demo plan's stations and the habitat.
const POINTS: [number, number][] = [
  [300, -2200],
  [400, -2200],
  [400, -2300],
  [300, -2300],
  [200, -2300],
  [100, -2300],
];

describe("worldToScreen / screenToWorld", () => {
  it("are inverse, with north up", () => {
    const cam = { cx: 300, cy: -2200, pxPerM: 2 };
    expect(worldToScreen(cam, VIEW, 300, -2200)).toEqual([720, 450]);
    const [, yNorth] = worldToScreen(cam, VIEW, 300, -2100);
    expect(yNorth).toBeLessThan(450);
    const [x, y] = screenToWorld(cam, VIEW, ...worldToScreen(cam, VIEW, 123, -456));
    expect(x).toBeCloseTo(123);
    expect(y).toBeCloseTo(-456);
  });
});

describe("fitCamera", () => {
  it("centers the stations in the free area, not in the viewport", () => {
    const insets = { top: 88, right: 440, bottom: 176, left: 96 };
    const cam = fitCamera(POINTS, VIEW, insets);
    const free = freeArea(VIEW, insets);
    const [sx, sy] = worldToScreen(cam, VIEW, 250, -2250);
    expect(sx).toBeCloseTo(free.cx);
    expect(sy).toBeCloseTo(free.cy);
    expect(free.cx).not.toBe(VIEW.width / 2);
  });

  it("leaves a 25 % margin per side on the limiting axis", () => {
    const cam = fitCamera(POINTS, VIEW, NO_INSETS);
    // 300 m wide box -> 450 m with margins; 1440 px / 450 m = 3.2 px/m.
    expect(cam.pxPerM).toBeCloseTo(VIEW.width / (300 * (1 + 2 * FIT_MARGIN)));
    const [left] = worldToScreen(cam, VIEW, 100, -2250);
    expect(left).toBeCloseTo(VIEW.width * (FIT_MARGIN / (1 + 2 * FIT_MARGIN)));
  });

  it("does not zoom to the limit on a single station", () => {
    const cam = fitCamera([[300, -2200]], VIEW, NO_INSETS);
    expect(cam.pxPerM).toBeLessThan(MAX_PX_PER_M);
    expect(cam.pxPerM).toBeCloseTo(900 / 200);
  });
});

describe("clampCamera", () => {
  it("keeps the zoom within 0.15 to 6 px/m", () => {
    expect(clampCamera({ cx: 300, cy: -2200, pxPerM: 50 }, VIEW, NO_INSETS, BOUNDS).pxPerM).toBe(MAX_PX_PER_M);
    expect(clampCamera({ cx: 300, cy: -2200, pxPerM: 0.01 }, VIEW, NO_INSETS, BOUNDS).pxPerM).toBe(MIN_PX_PER_M);
  });

  it("does not let the view leave the overview box", () => {
    const cam = clampCamera({ cx: -5000, cy: 5000, pxPerM: 2 }, VIEW, NO_INSETS, BOUNDS);
    const [left, top] = screenToWorld(cam, VIEW, 0, 0);
    expect(left).toBeCloseTo(BOUNDS.xmin);
    expect(top).toBeCloseTo(BOUNDS.ymax);
  });

  it("centers the box in the free area when it is smaller than the view", () => {
    const insets = { top: 0, right: 400, bottom: 0, left: 0 };
    const cam = clampCamera({ cx: 9999, cy: 9999, pxPerM: MIN_PX_PER_M }, VIEW, insets, BOUNDS);
    const free = freeArea(VIEW, insets);
    const [sx, sy] = worldToScreen(cam, VIEW, (BOUNDS.xmin + BOUNDS.xmax) / 2, (BOUNDS.ymin + BOUNDS.ymax) / 2);
    expect(sx).toBeCloseTo(free.cx);
    expect(sy).toBeCloseTo(free.cy);
  });
});

describe("zoomAt", () => {
  it("keeps the point under the cursor fixed", () => {
    const cam = { cx: 300, cy: -2200, pxPerM: 1 };
    const before = screenToWorld(cam, VIEW, 1000, 200);
    const next = zoomAt(cam, VIEW, 2, 1000, 200);
    const after = screenToWorld(next, VIEW, 1000, 200);
    expect(next.pxPerM).toBe(2);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
  });

  it("stops at the zoom limits", () => {
    expect(zoomAt({ cx: 0, cy: 0, pxPerM: 5 }, VIEW, 4, 0, 0).pxPerM).toBe(MAX_PX_PER_M);
  });
});

describe("scale, detail, rings", () => {
  it("picks the longest bar that fits", () => {
    expect(scaleBar(0.15)).toMatchObject({ meters: 500, label: "500 m" });
    expect(scaleBar(0.14)).toMatchObject({ meters: 1000, label: "1 km" });
    expect(scaleBar(1)).toMatchObject({ meters: 100 });
    expect(scaleBar(3.2)).toMatchObject({ meters: 25 });
    expect(scaleBar(6)).toMatchObject({ meters: 10 });
  });

  it("fades the detail image in from 1.2 px/m", () => {
    expect(detailOpacity(1)).toBe(0);
    expect(detailOpacity(1.2)).toBe(0);
    expect(detailOpacity(1.4)).toBeCloseTo(0.5);
    expect(detailOpacity(3)).toBe(1);
  });

  it("thins the range rings when 100 m would crowd", () => {
    expect(ringStepM(1)).toBe(100);
    expect(ringStepM(0.15)).toBe(500);
    expect(ringStepM(0.05)).toBeNull();
  });

  it("interpolates the camera with its ends exact", () => {
    const a = { cx: 0, cy: 0, pxPerM: 0.5 };
    const b = { cx: 100, cy: -100, pxPerM: 2 };
    expect(lerpCamera(a, b, 0)).toEqual(a);
    expect(lerpCamera(a, b, 1).pxPerM).toBeCloseTo(2);
    expect(lerpCamera(a, b, 0.5).pxPerM).toBeCloseTo(1);
  });
});

describe("projectOblique", () => {
  const pivot: [number, number] = [500, 600];
  const p = { headingDeg: 0, pitchDeg: 58, perspectivePx: 900 };

  it("keeps the pivot fixed and is the identity without pitch or heading", () => {
    expect(projectOblique([500, 600], pivot, p)).toMatchObject({ x: 500, y: 600, scale: 1 });
    const flat = projectOblique([620, 410], pivot, { headingDeg: 0, pitchDeg: 0, perspectivePx: 900 });
    expect(flat.x).toBeCloseTo(620);
    expect(flat.y).toBeCloseTo(410);
    expect(flat.scale).toBeCloseTo(1);
  });

  it("foreshortens and shrinks what lies ahead, and enlarges what lies behind", () => {
    const ahead = projectOblique([500, 300], pivot, p);
    expect(ahead.x).toBeCloseTo(500);
    expect(ahead.y).toBeGreaterThan(300);
    expect(ahead.y).toBeLessThan(600);
    expect(ahead.scale).toBeLessThan(1);
    expect(projectOblique([500, 700], pivot, p).scale).toBeGreaterThan(1);
  });

  it("turns the heading to the top of the screen", () => {
    // East of the pivot on a north-up map; heading 090 puts it straight ahead.
    const east = projectOblique([700, 600], pivot, { ...p, headingDeg: 90 });
    expect(east.x).toBeCloseTo(500);
    expect(east.y).toBeLessThan(600);
  });

  it("never projects past the horizon", () => {
    const far = projectOblique([500, -1e7], pivot, p);
    expect(far.y).toBeGreaterThanOrEqual(horizonY(pivot, p) - 1e-6);
  });
});
