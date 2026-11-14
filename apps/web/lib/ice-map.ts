/**
 * Ice map from GET /maps (packages/contracts/schemas/map.schema.json): decode the
 * 8-bit layers and color them with the palettes the planner sends, so the web never
 * invents a color scale. Rows start at the north edge (gp/maps.py).
 *
 * Modes:
 * - potential: probability color mixed with the fog color by the uncertainty left
 *   (palettes.potential.formula). Grey means "we do not know", not "no ice".
 * - probability / uncertainty: the raw layers.
 * - change: probability minus the prior, on palettes.change (deeper vs shallower).
 */
import type { Box } from "@/components/site/camera";

export type PaletteStop = { value: number; color: string };
export type Palette = { label: string; units?: string; min?: number; max?: number; stops: PaletteStop[] };
export type MapLayer = { encoding: "uint8-base64"; min: number; max: number; nodata: number; data: string };

export type IceMap = {
  site_id: string;
  plan_id?: string;
  threshold_m: number;
  cell_size_m: number;
  width: number;
  height: number;
  bounds_xy_m: Box;
  prior_probability: number;
  layers: { probability: MapLayer; uncertainty: MapLayer };
  palettes: {
    probability: Palette;
    uncertainty: Palette;
    change?: Palette;
    potential?: { label: string; fog_color: string };
  };
  is_prior_only: boolean;
  craters_in_model?: number;
  measurements_in_model?: number;
  is_mock?: boolean;
};

export type IceMapMode = "potential" | "probability" | "uncertainty" | "change";

export const ICE_MAP_MODES: { value: IceMapMode; label: string }[] = [
  { value: "potential", label: "Ice potential" },
  { value: "probability", label: "P(ice)" },
  { value: "uncertainty", label: "Uncertainty" },
  { value: "change", label: "Change vs prior" },
];

/** Opacity of the overlay over the HiRISE ortho, so the terrain stays readable. */
export const OVERLAY_ALPHA = 0.62;

export function isIceMap(body: unknown): body is IceMap {
  if (typeof body !== "object" || body === null) return false;
  const m = body as Record<string, unknown>;
  const layers = m.layers as Record<string, unknown> | undefined;
  return (
    typeof m.width === "number" &&
    typeof m.height === "number" &&
    typeof m.bounds_xy_m === "object" &&
    typeof layers?.probability === "object" &&
    typeof layers?.uncertainty === "object" &&
    typeof m.palettes === "object"
  );
}

/** Values in [min, max]; NaN where the cell has no data. */
export function decodeLayer(layer: MapLayer, size: number): Float32Array {
  const bytes = base64ToBytes(layer.data);
  if (bytes.length !== size) throw new Error(`map layer has ${bytes.length} cells, expected ${size}`);
  const out = new Float32Array(size);
  const span = layer.max - layer.min;
  for (let i = 0; i < size; i++) {
    const q = bytes[i];
    out[i] = q === layer.nodata ? Number.NaN : layer.min + (q / 254) * span;
  }
  return out;
}

function base64ToBytes(data: string): Uint8Array {
  const raw = typeof atob === "function" ? atob(data) : Buffer.from(data, "base64").toString("binary");
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Piecewise-linear color along the stops; clamps outside them. */
export function colorAt(stops: readonly PaletteStop[], value: number): [number, number, number] {
  if (value <= stops[0].value) return hexToRgb(stops[0].color);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (value <= b.value) {
      const t = (value - a.value) / (b.value - a.value || 1);
      const ca = hexToRgb(a.color);
      const cb = hexToRgb(b.color);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
    }
  }
  return hexToRgb(stops[stops.length - 1].color);
}

/** RGBA pixels, row 0 = north, ready for ImageData. Transparent where there is no data. */
export function renderPixels(map: IceMap, mode: IceMapMode, alpha = OVERLAY_ALPHA): Uint8ClampedArray {
  const size = map.width * map.height;
  const p = decodeLayer(map.layers.probability, size);
  const u = decodeLayer(map.layers.uncertainty, size);
  const fog = hexToRgb(map.palettes.potential?.fog_color ?? "#d4d8dd");
  const change = map.palettes.change;
  const out = new Uint8ClampedArray(size * 4);
  const a = Math.round(alpha * 255);
  for (let i = 0; i < size; i++) {
    const pi = p[i];
    const ui = u[i];
    let rgb: [number, number, number] | null = null;
    if (mode === "probability" && !Number.isNaN(pi)) rgb = colorAt(map.palettes.probability.stops, pi);
    else if (mode === "uncertainty" && !Number.isNaN(ui)) rgb = colorAt(map.palettes.uncertainty.stops, ui);
    else if (mode === "change" && change && !Number.isNaN(pi)) rgb = colorAt(change.stops, pi - map.prior_probability);
    else if (mode === "potential" && !Number.isNaN(pi)) {
      const base = colorAt(map.palettes.probability.stops, pi);
      const w = Number.isNaN(ui) ? 1 : Math.min(1, Math.max(0, ui));
      rgb = [0, 1, 2].map((k) => Math.round(base[k] * (1 - w) + fog[k] * w)) as [number, number, number];
    }
    if (rgb) {
      out[i * 4] = rgb[0];
      out[i * 4 + 1] = rgb[1];
      out[i * 4 + 2] = rgb[2];
      out[i * 4 + 3] = a;
    }
  }
  return out;
}

/** PNG data URL for SiteScene's raster. Browser only; undefined where there is no canvas. */
export function renderDataUrl(map: IceMap, mode: IceMapMode): string | undefined {
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const pixels = renderPixels(map, mode);
  const image = ctx.createImageData(map.width, map.height);
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Legend for the current mode: label, gradient stops and the two ends. */
export function legendFor(map: IceMap, mode: IceMapMode): { label: string; stops: PaletteStop[] } {
  if (mode === "uncertainty") return { label: map.palettes.uncertainty.label, stops: map.palettes.uncertainty.stops };
  if (mode === "change" && map.palettes.change) return { label: map.palettes.change.label, stops: map.palettes.change.stops };
  if (mode === "potential") return { label: map.palettes.potential?.label ?? map.palettes.probability.label, stops: map.palettes.probability.stops };
  return { label: map.palettes.probability.label, stops: map.palettes.probability.stops };
}

/** P(ice) at a grid point (meters), or undefined outside the map. */
export function probabilityAt(map: IceMap, x: number, y: number): number | undefined {
  const b = map.bounds_xy_m;
  if (x < b.xmin || x >= b.xmax || y <= b.ymin || y > b.ymax) return undefined;
  const col = Math.floor((x - b.xmin) / map.cell_size_m);
  const row = Math.floor((b.ymax - y) / map.cell_size_m);
  const p = decodeLayer(map.layers.probability, map.width * map.height)[row * map.width + col];
  return Number.isNaN(p) ? undefined : p;
}
