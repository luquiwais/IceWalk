/**
 * Pure logic behind MarsGlobe: no Cesium import, so it is testable in jsdom and safe
 * to load on the server. MarsGlobe turns these descriptors into Cesium entities.
 */

export type LonLat = [number, number];

export type GlobeStation = {
  id: string;
  /** East longitude, latitude (degrees). */
  lonlat: LonLat;
  label?: string;
  selected?: boolean;
};

export type GlobeFocus = {
  lonlat: LonLat;
  /** Camera height above the surface, meters. Default: DEFAULT_FOCUS_HEIGHT_M. */
  heightM?: number;
};

/** Minimal GeoJSON subset: only LineString / MultiLineString features are drawn. */
export type RouteFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    properties?: Record<string, unknown> | null;
    geometry: {
      type: string;
      coordinates?: unknown;
    } | null;
  }[];
};

/** Cesium ion asset "Cesium Mars": global terrain + imagery as one 3D Tiles tileset. */
export const CESIUM_MARS_ION_ASSET_ID = 3644333;

/** NASA Trek WMTS (RESTful), Viking MDIM 2.1 colorized global mosaic, 232 m/px. */
export const TREK_MARS_TILE_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg";
export const TREK_MARS_MAX_LEVEL = 7;

export const CESIUM_MARS_CREDIT =
  "Cesium Mars: NASA/USGS Astrogeology Science Center (Viking MDIM 2.1 colorized mosaic, MOLA-HRSC blended DEM)";
export const TREK_MARS_CREDIT =
  "Imagery: NASA/USGS Astrogeology Science Center, Viking MDIM 2.1 colorized mosaic via NASA Trek";

export const DEFAULT_FOCUS_HEIGHT_M = 12_000;
/** Camera height that frames the whole planet (radius ~3.39e6 m). */
export const GLOBE_OVERVIEW_HEIGHT_M = 14_000_000;

export type MarsBasemap =
  | { kind: "ion-mars"; assetId: number; token: string; credit: string }
  | { kind: "trek"; url: string; maximumLevel: number; credit: string };

/** Picks the basemap. Without an ion token the app still works with public NASA tiles. */
export function selectBasemap(token: string | undefined | null): MarsBasemap {
  const t = token?.trim();
  if (t) {
    return { kind: "ion-mars", assetId: CESIUM_MARS_ION_ASSET_ID, token: t, credit: CESIUM_MARS_CREDIT };
  }
  return { kind: "trek", url: TREK_MARS_TILE_URL, maximumLevel: TREK_MARS_MAX_LEVEL, credit: TREK_MARS_CREDIT };
}

export function isValidLonLat(v: unknown): v is LonLat {
  return (
    Array.isArray(v) &&
    v.length >= 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Math.abs(v[1]) <= 90
  );
}

export type StationDescriptor = {
  id: string;
  lon: number;
  lat: number;
  label: string;
  selected: boolean;
};

export function stationDescriptors(stations: readonly GlobeStation[] | undefined): StationDescriptor[] {
  return (stations ?? [])
    .filter((s) => isValidLonLat(s.lonlat))
    .map((s) => ({
      id: s.id,
      lon: s.lonlat[0],
      lat: s.lonlat[1],
      label: s.label ?? s.id,
      selected: Boolean(s.selected),
    }));
}

export type RouteDescriptor = {
  id: string;
  /** Flat [lon, lat, lon, lat, ...] as expected by Cartesian3.fromDegreesArray. */
  positions: number[];
};

/** One descriptor per LineString (MultiLineString is split); invalid vertices are dropped. */
export function routeDescriptors(route: RouteFeatureCollection | undefined | null): RouteDescriptor[] {
  const out: RouteDescriptor[] = [];
  route?.features?.forEach((f, i) => {
    const g = f?.geometry;
    if (!g) return;
    const lines: unknown[] =
      g.type === "LineString"
        ? [g.coordinates]
        : g.type === "MultiLineString" && Array.isArray(g.coordinates)
          ? g.coordinates
          : [];
    lines.forEach((line, j) => {
      if (!Array.isArray(line)) return;
      const positions = line.filter(isValidLonLat).flatMap((p) => [p[0], p[1]]);
      if (positions.length >= 4) out.push({ id: `route-${i}-${j}`, positions });
    });
  });
  return out;
}

/** Stable key so the globe re-syncs entities only when the content changes. */
export function stationsKey(stations: readonly GlobeStation[] | undefined): string {
  return JSON.stringify(stationDescriptors(stations));
}

export function routeKey(route: RouteFeatureCollection | undefined | null): string {
  return JSON.stringify(routeDescriptors(route));
}

export function focusHeight(focus: GlobeFocus): number {
  const h = focus.heightM;
  return typeof h === "number" && Number.isFinite(h) && h > 0 ? h : DEFAULT_FOCUS_HEIGHT_M;
}
