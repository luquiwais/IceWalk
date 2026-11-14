import { describe, expect, it } from "vitest";
import { demoPlan, orderedStations } from "./plan";
import { circle, Heightfield, hudAt, iceColor, pointAt, stationMarks, walkPath, type Site3DLevel } from "./site3d";

const level: Site3DLevel = {
  box_m: { xmin: 0, ymin: -20, xmax: 30, ymax: 0 }, step_m: 10, size: [3, 2],
  z_min_m: -4000, z_scale_m: 0.01, z_range_m: 3, heightmap: "", texture: "", boulders: [],
};

describe("site3d", () => {
  it("samples the heightfield at cell centers and interpolates between them", () => {
    const field = new Heightfield(level, Uint16Array.from([0, 100, 200, 0, 100, 300]));
    expect(field.at(5, -5)).toBeCloseTo(0);
    expect(field.at(15, -5)).toBeCloseTo(1);
    expect(field.at(25, -15)).toBeCloseTo(3);
    expect(field.at(10, -5)).toBeCloseTo(0.5);
    expect(field.at(-100, 100)).toBeCloseTo(0); // clamped to the box
    expect(() => new Heightfield(level, new Uint16Array(5))).toThrow();
  });

  it("builds a continuous walking path from the plan route and finds stations on it", () => {
    const path = walkPath(demoPlan, 2);
    expect(path.length).toBeGreaterThan(10);
    for (let i = 1; i < path.length; i++) expect(path[i].s).toBeGreaterThanOrEqual(path[i - 1].s);
    const total = path[path.length - 1].s;
    expect(total / 1000).toBeCloseTo(demoPlan.summary.distance_km, 0);
    const marks = stationMarks(path, orderedStations(demoPlan));
    expect(marks).toHaveLength(demoPlan.stations.length);
    for (let i = 1; i < marks.length; i++) expect(marks[i].s).toBeGreaterThanOrEqual(marks[i - 1].s);
    expect(pointAt(path, total + 100).s).toBe(total);
  });

  it("tells the HUD the next unmeasured station and the return at the end", () => {
    const path = walkPath(demoPlan, 2);
    const first = orderedStations(demoPlan)[0];
    const start = hudAt(demoPlan, [], path, 0);
    expect(start.returning).toBe(false);
    expect(start.next?.id).toBe(first.id);
    expect(start.next?.pIce).toBe(first.p_ice);
    const measured = orderedStations(demoPlan).map((s) => ({ station_id: s.id }) as never);
    expect(hudAt(demoPlan, measured, path, 0).returning).toBe(true);
  });

  it("draws closed rings and a blue P(ice) ramp", () => {
    const ring = circle([0, 0], 10, 8);
    expect(ring[0][0]).toBeCloseTo(ring[8][0]);
    expect(Math.hypot(...ring[3])).toBeCloseTo(10);
    expect(iceColor(0)).toBe("#cde2fb");
    expect(iceColor(1)).toBe("#0d366b");
  });
});

describe("site3d HUD order", () => {
  it("keeps the first unmeasured station as next even after walking past it", () => {
    const path = walkPath(demoPlan, 2);
    const first = orderedStations(demoPlan)[0];
    const later = hudAt(demoPlan, [], path, path[path.length - 1].s / 2);
    expect(later.next?.id).toBe(first.id);
  });
});
