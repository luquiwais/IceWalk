/**
 * Site grid <-> east longitude / latitude, from packages/contracts/grid.json.
 *
 * The grid is an equirectangular projection on a sphere:
 *   +proj=eqc +lat_ts=35.1105 +lat_0=35.1105 +lon_0=189.8273 +R=3389574.349
 *   x = R · cos(lat_ts) · (lon − lon_0),  y = R · (lat − lat_0)   (radians)
 * x grows east and y north, in meters from the crater (the grid origin).
 * Same math as apps/planner/app/contracts.py:xy_to_lonlat.
 */
import grid from "../../../packages/contracts/grid.json";

export type GridPoint = readonly [x: number, y: number];
export type LonLat = readonly [lonEast: number, lat: number];

const DEG = Math.PI / 180;

export const GRID = {
  radiusM: grid.crs.sphere_radius_m,
  lat0Deg: grid.crs.center_lat_deg,
  lon0EastDeg: grid.crs.center_lon_east_deg,
  /** Standard parallel = lat_0 for this grid. */
  latTsDeg: grid.crs.center_lat_deg,
  stationCellM: grid.station_grid_cell_size_m,
} as const;

const KX = GRID.radiusM * Math.cos(GRID.latTsDeg * DEG) * DEG; // m per degree of longitude
const KY = GRID.radiusM * DEG; // m per degree of latitude

/** Longitude difference wrapped to [-180, 180), so 189.8° E and −170.2° give the same x. */
function wrapDegrees(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

export function lonLatToGrid([lon, lat]: LonLat): [number, number] {
  return [wrapDegrees(lon - GRID.lon0EastDeg) * KX, (lat - GRID.lat0Deg) * KY];
}

/** Grid meters to east longitude in [0, 360) and latitude, in degrees. */
export function gridToLonLat([x, y]: GridPoint): [number, number] {
  const lon = (((GRID.lon0EastDeg + x / KX) % 360) + 360) % 360;
  return [lon, GRID.lat0Deg + y / KY];
}
