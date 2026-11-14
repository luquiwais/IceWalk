/**
 * Pure helpers for the 3D site view: the HiRISE DTM heightfield, the walking
 * path along the planned route and what the helmet HUD shows at each point.
 * Data comes from apps/web/scripts/build-site-3d.py (public/site/s1094b-3d.json).
 */
import { HABITAT_XY, routeLines } from "@/components/site/site-data";
import { bearing, measuringTool, orderedStations, toolName, type Measurement, type Plan, type Station } from "./plan";

export type Box = { xmin: number; ymin: number; xmax: number; ymax: number };
/** x_m, y_m, diameter_m, height_m, form ("b" block, "i" indeterminate), confidence. */
export type Boulder = [number, number, number, number, string, number];
export type Site3DLevel = {
  box_m: Box;
  step_m: number;
  size: [number, number];
  z_min_m: number;
  z_scale_m: number;
  z_range_m: number;
  heightmap: string;
  texture: string;
  boulders: Boulder[];
};
export type Site3DData = { site_id: string; levels: Record<"overview" | "detail", Site3DLevel>; credit: string };
export type Site3DLevelName = keyof Site3DData["levels"];

/** Walking pace used to turn path length into minutes (STM example, 2 km/h). */
export const WALK_MPS = 2 / 3.6;

/** Heights from the uint16 heightmap (cm above z_min, rows north to south), bilinear. */
export class Heightfield {
  constructor(readonly level: Site3DLevel, readonly cm: Uint16Array) {
    if (cm.length !== level.size[0] * level.size[1]) throw new Error("Heightmap size does not match the level");
  }

  /** Height above the level minimum (m) at grid meters (x, y), clamped to the box. */
  at(x: number, y: number): number {
    const { box_m: b, step_m: s, size: [w, h], z_scale_m: k } = this.level;
    const c = Math.min(Math.max((x - b.xmin) / s - 0.5, 0), w - 1);
    const r = Math.min(Math.max((b.ymax - y) / s - 0.5, 0), h - 1);
    const c0 = Math.floor(c), r0 = Math.floor(r);
    const c1 = Math.min(c0 + 1, w - 1), r1 = Math.min(r0 + 1, h - 1);
    const fc = c - c0, fr = r - r0;
    const v = (rr: number, cc: number) => this.cm[rr * w + cc] * k;
    return (v(r0, c0) * (1 - fc) + v(r0, c1) * fc) * (1 - fr) + (v(r1, c0) * (1 - fc) + v(r1, c1) * fc) * fr;
  }
}

export type PathPoint = { x: number; y: number; s: number };

/** The plan route as one polyline in grid meters, resampled every `step` meters. */
export function walkPath(plan: Plan, step = 2): PathPoint[] {
  const raw = routeLines(plan).flat();
  const out: PathPoint[] = [];
  let s = 0;
  for (let i = 0; i < raw.length; i++) {
    const [x, y] = raw[i];
    if (i === 0) { out.push({ x, y, s: 0 }); continue; }
    const [px, py] = raw[i - 1];
    const d = Math.hypot(x - px, y - py);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push({ x: px + (x - px) * t, y: py + (y - py) * t, s: s + d * t });
    }
    s += d;
  }
  return out;
}

/** Point at distance `s` along the path (clamped). */
export function pointAt(path: readonly PathPoint[], s: number): PathPoint {
  if (!path.length) return { x: 0, y: 0, s: 0 };
  const total = path[path.length - 1].s;
  const t = Math.min(Math.max(s, 0), total);
  let lo = 0, hi = path.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (path[mid].s <= t) lo = mid; else hi = mid; }
  const a = path[lo], b = path[hi];
  const f = b.s > a.s ? (t - a.s) / (b.s - a.s) : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, s: t };
}

/** Path distance at which each station is reached (closest path point after the previous one). */
export function stationMarks(path: readonly PathPoint[], stations: readonly Station[]): { station: Station; s: number }[] {
  const marks: { station: Station; s: number }[] = [];
  let from = 0;
  for (const station of stations) {
    let best = from, bestD = Infinity;
    for (let i = from; i < path.length; i++) {
      const d = Math.hypot(path[i].x - station.position[0], path[i].y - station.position[1]);
      if (d < bestD) { bestD = d; best = i; }
    }
    marks.push({ station, s: path[best]?.s ?? 0 });
    from = best;
  }
  return marks;
}

export type HudState = {
  next?: { id: string; order: number; distanceM: number; heading: string; tool: string; pIce: number; commLos?: boolean | null; walkbackMarginMin?: number };
  elapsedMin: number;
  remainingKm: number;
  returning: boolean;
};

/** What the helmet HUD shows at distance `s` along the walking path. */
export function hudAt(plan: Plan, measurements: readonly Measurement[], path: readonly PathPoint[], s: number): HudState {
  const here = pointAt(path, s);
  const measured = new Set(measurements.map((m) => m.station_id));
  const marks = stationMarks(path, orderedStations(plan));
  // The first unmeasured station in visit order, even if the walk already passed it.
  const ahead = marks.find((m) => !measured.has(m.station.id));
  const total = path.length ? path[path.length - 1].s : 0;
  const base = { elapsedMin: s / WALK_MPS / 60, remainingKm: Math.max(total - s, 0) / 1000 };
  if (!ahead) return { ...base, returning: true };
  const st = ahead.station;
  const dir = bearing([here.x, here.y], st.position);
  const margin = plan.timeline.find((t) => t.kind === "station" && t.station_id === st.id)?.walkback_margin_min;
  return {
    ...base,
    returning: false,
    next: {
      id: st.id, order: st.order, distanceM: Math.abs(ahead.s - s), heading: dir.label,
      tool: toolName(measuringTool(st)), pIce: st.p_ice, commLos: st.comm_los, walkbackMarginMin: margin,
    },
  };
}

/** Points of a circle in grid meters (walkback limit ring). */
export function circle(center: readonly [number, number], radius: number, n = 256): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [center[0] + radius * Math.cos(a), center[1] + radius * Math.sin(a)];
  });
}

/** Blue ramp used for P(ice) markers, same ends as the globe zones. */
export function iceColor(p: number): string {
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * Math.min(Math.max(p, 0), 1));
  const [r, g, b] = [lerp(0xcd, 0x0d), lerp(0xe2, 0x36), lerp(0xfb, 0x6b)];
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** HUD for a free-moving crewmember at grid (x, y): the first unmeasured station in visit order. */
export function hudFrom(plan: Plan, measurements: readonly Measurement[], x: number, y: number): HudState {
  const measured = new Set(measurements.map((m) => m.station_id));
  const st = orderedStations(plan).find((s) => !measured.has(s.id));
  const base = { elapsedMin: 0, remainingKm: 0 };
  if (!st) {
    const back = bearing([x, y], HABITAT_XY);
    return { ...base, returning: true, remainingKm: back.distanceM / 1000 };
  }
  const dir = bearing([x, y], st.position);
  const margin = plan.timeline.find((t) => t.kind === "station" && t.station_id === st.id)?.walkback_margin_min;
  return {
    ...base,
    returning: false,
    remainingKm: dir.distanceM / 1000,
    next: { id: st.id, order: st.order, distanceM: dir.distanceM, heading: dir.label, tool: toolName(measuringTool(st)), pIce: st.p_ice, commLos: st.comm_los, walkbackMarginMin: margin },
  };
}
