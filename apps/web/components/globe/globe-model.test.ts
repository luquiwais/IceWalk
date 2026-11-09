import { describe, expect, it } from "vitest";

import {
  CESIUM_MARS_ION_ASSET_ID,
  DEFAULT_FOCUS_HEIGHT_M,
  TREK_MARS_TILE_URL,
  focusHeight,
  routeDescriptors,
  selectBasemap,
  stationDescriptors,
  type RouteFeatureCollection,
} from "./globe-model";

describe("selectBasemap", () => {
  it("uses Cesium Mars from ion when a token is set", () => {
    const b = selectBasemap("  abc.def  ");
    expect(b.kind).toBe("ion-mars");
    if (b.kind === "ion-mars") {
      expect(b.assetId).toBe(CESIUM_MARS_ION_ASSET_ID);
      expect(b.token).toBe("abc.def");
    }
  });

  it.each([undefined, null, "", "   "])("falls back to NASA Trek tiles without token (%j)", (t) => {
    const b = selectBasemap(t);
    expect(b.kind).toBe("trek");
    if (b.kind === "trek") expect(b.url).toBe(TREK_MARS_TILE_URL);
  });
});

describe("stationDescriptors", () => {
  it("maps stations, defaults label to id and drops invalid positions", () => {
    const out = stationDescriptors([
      { id: "A", lonlat: [189.8, 35.07], selected: true },
      { id: "B", lonlat: [189.9, 35.1], label: "Station B" },
      { id: "bad", lonlat: [Number.NaN, 0] },
      { id: "pole", lonlat: [0, 95] },
    ]);
    expect(out).toEqual([
      { id: "A", lon: 189.8, lat: 35.07, label: "A", selected: true },
      { id: "B", lon: 189.9, lat: 35.1, label: "Station B", selected: false },
    ]);
  });

  it("accepts undefined", () => {
    expect(stationDescriptors(undefined)).toEqual([]);
  });
});

describe("routeDescriptors", () => {
  const fc: RouteFeatureCollection = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "LineString", coordinates: [[1, 2], [3, 4], [5, 6]] } },
      { type: "Feature", geometry: { type: "Point", coordinates: [1, 2] } },
      { type: "Feature", geometry: null },
      {
        type: "Feature",
        geometry: { type: "MultiLineString", coordinates: [[[0, 0], [1, 1]], [[2, 2]]] },
      },
    ],
  };

  it("flattens LineStrings and splits MultiLineStrings, skipping the rest", () => {
    const out = routeDescriptors(fc);
    expect(out.map((r) => r.id)).toEqual(["route-0-0", "route-3-0"]);
    expect(out[0].positions).toEqual([1, 2, 3, 4, 5, 6]);
    expect(out[1].positions).toEqual([0, 0, 1, 1]);
  });

  it("accepts undefined and null", () => {
    expect(routeDescriptors(undefined)).toEqual([]);
    expect(routeDescriptors(null)).toEqual([]);
  });
});

describe("focusHeight", () => {
  it("uses heightM when valid, else the default", () => {
    expect(focusHeight({ lonlat: [0, 0], heightM: 3000 })).toBe(3000);
    expect(focusHeight({ lonlat: [0, 0] })).toBe(DEFAULT_FOCUS_HEIGHT_M);
    expect(focusHeight({ lonlat: [0, 0], heightM: -5 })).toBe(DEFAULT_FOCUS_HEIGHT_M);
  });
});
