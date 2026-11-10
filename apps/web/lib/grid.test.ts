import { describe, expect, it } from "vitest";

import { gridToLonLat, lonLatToGrid } from "./grid";
import { demoPlan } from "./plan";

describe("grid", () => {
  it("puts the origin at the grid center", () => {
    expect(lonLatToGrid([189.8273, 35.1105])).toEqual([0, 0]);
  });

  it.each(demoPlan.stations.map((s) => [s.id, s] as const))(
    "maps %s lonlat to its grid position within 1 m",
    (_id, station) => {
      const [x, y] = lonLatToGrid(station.lonlat!);
      expect(Math.abs(x - station.position[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(y - station.position[1])).toBeLessThanOrEqual(1);

      const [lon, lat] = gridToLonLat(station.position);
      const [bx, by] = lonLatToGrid([lon, lat]);
      expect(Math.abs(bx - x)).toBeLessThanOrEqual(1);
      expect(Math.abs(by - y)).toBeLessThanOrEqual(1);
    },
  );

  it("checks all six mock stations", () => {
    expect(demoPlan.stations).toHaveLength(6);
  });

  it("round-trips grid meters", () => {
    for (const p of [
      [0, 0],
      [300, -2200],
      [-1500, 900],
      [2100, -3300],
    ] as const) {
      const [x, y] = lonLatToGrid(gridToLonLat(p));
      expect(x).toBeCloseTo(p[0], 6);
      expect(y).toBeCloseTo(p[1], 6);
    }
  });

  it("accepts west-negative longitudes", () => {
    const [x] = lonLatToGrid([189.833499 - 360, 35.073312]);
    expect(x).toBeCloseTo(300, 0);
  });
});
