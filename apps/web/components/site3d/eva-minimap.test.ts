import { describe, expect, it } from "vitest";

import { minimapFrame } from "./eva-minimap";

const route: [number, number][] = [[0, 0], [0, -200], [100, -300], [100, -500], [0, -500]];

describe("minimap frame", () => {
  it("keeps the whole route in the frame for any heading", () => {
    for (let heading = 0; heading < 360; heading += 15) {
      const at = minimapFrame(route, { x: 50, y: -250, headingDeg: heading }, "heading");
      for (const [x, y] of route) {
        const [sx, sy] = at(x, y);
        expect(sx).toBeGreaterThanOrEqual(0);
        expect(sx).toBeLessThanOrEqual(200);
        expect(sy).toBeGreaterThanOrEqual(0);
        expect(sy).toBeLessThanOrEqual(200);
      }
    }
  });

  it("puts what is ahead above the EV heading up, and north above north up", () => {
    const pose = { x: 0, y: 0, headingDeg: 90 }; // facing east
    const pts: [number, number][] = [[0, 0], [100, 0], [0, 100]];
    const heading = minimapFrame(pts, pose, "heading");
    expect(heading(100, 0)[1]).toBeLessThan(heading(0, 0)[1]); // east is up
    const north = minimapFrame(pts, pose, "north");
    expect(north(0, 100)[1]).toBeLessThan(north(0, 0)[1]); // north is up
  });
});

describe("route progress", () => {
  it("does not jump to the walk back at the habitat before the first station", async () => {
    const { routeProgress } = await import("./eva-minimap");
    // Out to (0, -100) and back: at the start, the nearest point is also the end of the walk back.
    const path = [0, 25, 50, 75, 100, 75, 50, 25, 0].map((d, i) => ({ x: 0, y: -d, s: i * 25 }));
    expect(routeProgress(path, { x: 0, y: -2 }, { to: [0, -100] })).toBeLessThan(0.1);
    expect(routeProgress(path, { x: 0, y: -2 }, { from: [0, -100] })).toBeGreaterThan(0.9);
  });
});
