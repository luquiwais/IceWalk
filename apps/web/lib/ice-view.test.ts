import { describe, expect, it } from "vitest";
import type { IceMap } from "./ice-map";
import { bandOf, blocks, cellColor, hotspots, knownFraction, KNOWN_BELOW } from "./ice-view";
import mockMap from "@/mock/map.json";

/** A 40 x 40 m map at 10 m cells, prior 0.6: the north-west 20 m block has a crater. */
function tiny(): IceMap {
  const n = 16;
  const p = new Uint8Array(n).fill(Math.round(0.6 * 254));
  const u = new Uint8Array(n).fill(254);
  p[0] = Math.round(0.95 * 254); u[0] = Math.round(0.2 * 254); // best-informed cell of block (0, 0)
  const b64 = (a: Uint8Array) => btoa(String.fromCharCode(...a));
  return {
    site_id: "t", cell_size_m: 10, width: 4, height: 4, threshold_m: 3, prior_probability: 0.6,
    bounds_xy_m: { xmin: 0, xmax: 40, ymin: -40, ymax: 0 },
    layers: { probability: { encoding: "uint8-base64", min: 0, max: 1, nodata: 255, data: b64(p) }, uncertainty: { encoding: "uint8-base64", min: 0, max: 1, nodata: 255, data: b64(u) } },
    palettes: { probability: { label: "P", stops: [{ value: 0, color: "#ffffff" }, { value: 1, color: "#000000" }] }, uncertainty: { label: "U", stops: [{ value: 0, color: "#ffffff" }, { value: 1, color: "#000000" }] } },
  } as unknown as IceMap;
}

describe("ice view", () => {
  it("shows each block's best-informed cell, so a small crater is not averaged away", () => {
    const list = blocks(tiny(), 20);
    expect(list).toHaveLength(4);
    const nw = list.find((b) => b.x === 10 && b.y === -10)!;
    expect(nw.known).toBe(true);
    expect(nw.p).toBeCloseTo(0.95, 2);
    expect(nw.shift).toBe(1);
    expect(list.filter((b) => !b.known)).toHaveLength(3);
    expect(knownFraction(list)).toBe(0.25);
  });

  it("circles neighbouring likelier blocks as one labeled zone", () => {
    const zones = hotspots([
      { x: 50, y: 50, p: 0.9, u: 0.1, known: true, shift: 1 },
      { x: 150, y: 50, p: 0.8, u: 0.1, known: true, shift: 1 },
      { x: 950, y: 950, p: 0.85, u: 0.2, known: true, shift: 1 },
      { x: 250, y: 50, p: 0.6, u: 1, known: false, shift: 0 },
    ]);
    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({ blocks: 2, pMin: 0.8, pMax: 0.9 });
    expect(zones[0].radiusM).toBeGreaterThan(50);
  });

  it("on the real S1094b map, local evidence is a small share and the rest is the prior", () => {
    const list = blocks(mockMap as unknown as IceMap);
    const share = knownFraction(list);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(0.2);
    expect(list.every((b) => b.known === b.u < KNOWN_BELOW)).toBe(true);
    expect(hotspots(list).length).toBeGreaterThan(0);
  });
  it("colors by probability and certainty together: likelier is brighter, uncertain is dim", () => {
    expect(bandOf(0.5)).toBe(0);
    expect(bandOf(0.67)).toBeLessThan(bandOf(0.9));
    const lum = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    expect(lum(cellColor(0.9, 0.1))).toBeGreaterThan(lum(cellColor(0.68, 0.1)));
    const firm = cellColor(0.9, 0.1), vague = cellColor(0.9, 1);
    expect(vague[3]).toBeLessThan(firm[3]); // more transparent where uncertain
    expect(Math.max(...vague.slice(0, 3)) - Math.min(...vague.slice(0, 3))).toBeLessThan(Math.max(...firm.slice(0, 3)) - Math.min(...firm.slice(0, 3)));
  });
});
