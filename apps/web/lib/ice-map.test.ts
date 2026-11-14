import { describe, expect, it } from "vitest";

import { colorAt, decodeLayer, isIceMap, legendFor, probabilityAt, renderPixels, type IceMap } from "./ice-map";
import mockMap from "@/mock/map.json";

const stops = [
  { value: 0, color: "#000000" },
  { value: 1, color: "#ffffff" },
];

function layer(values: number[]) {
  const bytes = values.map((v) => (Number.isNaN(v) ? 255 : Math.round(v * 254)));
  return { encoding: "uint8-base64" as const, min: 0, max: 1, nodata: 255, data: Buffer.from(bytes).toString("base64") };
}

const tiny: IceMap = {
  site_id: "test",
  threshold_m: 3,
  cell_size_m: 10,
  width: 2,
  height: 1,
  bounds_xy_m: { xmin: 0, xmax: 20, ymin: 0, ymax: 10 },
  prior_probability: 0.5,
  layers: { probability: layer([1, Number.NaN]), uncertainty: layer([0, 1]) },
  palettes: { probability: { label: "P", stops }, uncertainty: { label: "U", stops }, potential: { label: "Pot", fog_color: "#808080" } },
  is_prior_only: false,
};

describe("ice map", () => {
  it("decodes 8-bit layers with nodata", () => {
    const p = decodeLayer(tiny.layers.probability, 2);
    expect(p[0]).toBeCloseTo(1);
    expect(Number.isNaN(p[1])).toBe(true);
    expect(() => decodeLayer(tiny.layers.probability, 3)).toThrow();
  });

  it("interpolates palette colors and clamps", () => {
    expect(colorAt(stops, 0.5)).toEqual([128, 128, 128]);
    expect(colorAt(stops, -1)).toEqual([0, 0, 0]);
    expect(colorAt(stops, 2)).toEqual([255, 255, 255]);
  });

  it("potential is the probability color when certain and transparent without data", () => {
    const px = renderPixels(tiny, "potential", 1);
    expect(Array.from(px.slice(0, 4))).toEqual([255, 255, 255, 255]); // p = 1, u = 0
    expect(px[7]).toBe(0); // no data: transparent
  });

  it("reads P(ice) at a grid point, north row first", () => {
    expect(probabilityAt(tiny, 5, 5)).toBeCloseTo(1);
    expect(probabilityAt(tiny, 15, 5)).toBeUndefined(); // nodata
    expect(probabilityAt(tiny, 50, 5)).toBeUndefined(); // outside
  });

  it("the bundled mock is a valid map from the real model", () => {
    expect(isIceMap(mockMap)).toBe(true);
    const map = mockMap as unknown as IceMap;
    expect(map.craters_in_model).toBe(349);
    expect(legendFor(map, "potential").stops.length).toBeGreaterThan(2);
    expect(renderPixels(map, "potential").length).toBe(map.width * map.height * 4);
  });
});
