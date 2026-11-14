/**
 * Camera math for SiteScene, pure so it can be tested without a DOM.
 *
 * World = grid meters (x east, y north). Screen = CSS px from the top-left of
 * the scene. The camera keeps world point (cx, cy) at the center of the
 * viewport, at pxPerM screen px per meter; north is always up here.
 */

export type Camera = { cx: number; cy: number; pxPerM: number };
export type Size = { width: number; height: number };
export type Insets = { top: number; right: number; bottom: number; left: number };
export type Box = { xmin: number; ymin: number; xmax: number; ymax: number };

/** Zoom limits (docs/plans/web-design.md, "Cámara"). */
export const MIN_PX_PER_M = 0.15;
export const MAX_PX_PER_M = 6;
/** The 0.25 m/px detail image fades in from this zoom. */
export const DETAIL_FROM_PX_PER_M = 1.2;
export const DETAIL_FULL_PX_PER_M = 1.6;
/** Margin around the stations + habitat when framing, per side, as a fraction of the box. */
export const FIT_MARGIN = 0.25;
/** Smallest framed extent, so a single station does not zoom to the limit. */
export const FIT_MIN_EXTENT_M = 200;

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function worldToScreen(cam: Camera, view: Size, x: number, y: number): [number, number] {
  return [view.width / 2 + (x - cam.cx) * cam.pxPerM, view.height / 2 - (y - cam.cy) * cam.pxPerM];
}

export function screenToWorld(cam: Camera, view: Size, sx: number, sy: number): [number, number] {
  return [cam.cx + (sx - view.width / 2) / cam.pxPerM, cam.cy - (sy - view.height / 2) / cam.pxPerM];
}

/** The part of the viewport not covered by the interface, in screen px. */
export function freeArea(view: Size, insets: Insets) {
  const width = Math.max(1, view.width - insets.left - insets.right);
  const height = Math.max(1, view.height - insets.top - insets.bottom);
  return { left: insets.left, top: insets.top, width, height, cx: insets.left + width / 2, cy: insets.top + height / 2 };
}

/**
 * Keeps the zoom within limits and the free area inside `bounds`. When the
 * free area is larger than the bounds in one axis, the bounds are centered in
 * it on that axis instead.
 */
export function clampCamera(cam: Camera, view: Size, insets: Insets, bounds: Box): Camera {
  const k = clamp(cam.pxPerM, MIN_PX_PER_M, MAX_PX_PER_M);
  const free = freeArea(view, insets);
  // World coordinates at the free area's edges for a given center.
  const dx = (free.cx - view.width / 2) / k; // world x offset of the free center from cx
  const dy = (free.cy - view.height / 2) / k;
  const halfW = free.width / 2 / k;
  const halfH = free.height / 2 / k;

  const axis = (center: number, lo: number, hi: number, half: number) =>
    hi - lo <= 2 * half ? (lo + hi) / 2 : clamp(center, lo + half, hi - half);

  // Free-area center in world, clamped, then back to the camera center.
  const fx = axis(cam.cx + dx, bounds.xmin, bounds.xmax, halfW);
  const fy = axis(cam.cy - dy, bounds.ymin, bounds.ymax, halfH);
  return { cx: fx - dx, cy: fy + dy, pxPerM: k };
}

/** Zoom by `factor` keeping the world point under screen point (sx, sy) fixed. */
export function zoomAt(cam: Camera, view: Size, factor: number, sx: number, sy: number): Camera {
  const k = clamp(cam.pxPerM * factor, MIN_PX_PER_M, MAX_PX_PER_M);
  const [wx, wy] = screenToWorld(cam, view, sx, sy);
  return {
    pxPerM: k,
    cx: wx - (sx - view.width / 2) / k,
    cy: wy + (sy - view.height / 2) / k,
  };
}

export function panBy(cam: Camera, dxPx: number, dyPx: number): Camera {
  return { ...cam, cx: cam.cx - dxPx / cam.pxPerM, cy: cam.cy + dyPx / cam.pxPerM };
}

/**
 * Frames `points` with FIT_MARGIN per side, centered in the free area (the
 * viewport minus the interface), not in the viewport.
 */
export function fitCamera(points: readonly (readonly [number, number])[], view: Size, insets: Insets): Camera {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  const w = Math.max(FIT_MIN_EXTENT_M, (xmax - xmin) * (1 + 2 * FIT_MARGIN));
  const h = Math.max(FIT_MIN_EXTENT_M, (ymax - ymin) * (1 + 2 * FIT_MARGIN));
  const free = freeArea(view, insets);
  const k = clamp(Math.min(free.width / w, free.height / h), MIN_PX_PER_M, MAX_PX_PER_M);
  const wx = (xmin + xmax) / 2;
  const wy = (ymin + ymax) / 2;
  return { pxPerM: k, cx: wx - (free.cx - view.width / 2) / k, cy: wy + (free.cy - view.height / 2) / k };
}

/** Camera between a and b at t in [0, 1]; zoom is interpolated in log space. */
export function lerpCamera(a: Camera, b: Camera, t: number): Camera {
  const k = Math.exp(Math.log(a.pxPerM) + (Math.log(b.pxPerM) - Math.log(a.pxPerM)) * t);
  // Interpolate the screen-space path so the motion looks even across zoom changes.
  return { pxPerM: k, cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t };
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Scale bar lengths; the plan's 50 m to 1 km, plus 10 and 25 m for the closest zooms. */
export const SCALE_STEPS_M = [10, 25, 50, 100, 250, 500, 1000] as const;
const SCALE_MAX_PX = 140;

/** Longest step that fits in SCALE_MAX_PX, or the shortest one. */
export function scaleBar(pxPerM: number): { meters: number; px: number; label: string } {
  const fitting = SCALE_STEPS_M.filter((m) => m * pxPerM <= SCALE_MAX_PX);
  const meters = fitting.length ? fitting[fitting.length - 1] : SCALE_STEPS_M[0];
  return { meters, px: meters * pxPerM, label: meters >= 1000 ? `${meters / 1000} km` : `${meters} m` };
}

/** Detail image opacity for a zoom: 0 below DETAIL_FROM, 1 from DETAIL_FULL. */
export function detailOpacity(pxPerM: number): number {
  return clamp((pxPerM - DETAIL_FROM_PX_PER_M) / (DETAIL_FULL_PX_PER_M - DETAIL_FROM_PX_PER_M), 0, 1);
}

/** Range ring spacing on screen: every 100 m, or every 500 m when 100 m rings would crowd. */
export function ringStepM(pxPerM: number): number | null {
  if (100 * pxPerM >= 28) return 100;
  if (500 * pxPerM >= 28) return 500;
  return null;
}

/**
 * Oblique presentation of the flat map: the plane is turned so `headingDeg`
 * points up and tipped back by `pitchDeg` around the pivot, as CSS does with
 * `perspective` + `rotateX() rotateZ()`. It is a tilted ortho image, not terrain.
 */
export type Oblique = { headingDeg: number; pitchDeg: number; perspectivePx: number };

/** Screen position and size factor of a flat-map screen point under `oblique`. */
export function projectOblique(point: readonly [number, number], pivot: readonly [number, number], oblique: Oblique) {
  const h = (-oblique.headingDeg * Math.PI) / 180;
  const a = (oblique.pitchDeg * Math.PI) / 180;
  const dx = point[0] - pivot[0];
  const dy = point[1] - pivot[1];
  const x = dx * Math.cos(h) - dy * Math.sin(h);
  const y = dx * Math.sin(h) + dy * Math.cos(h);
  // Toward the viewer is positive; keep clear of the eye plane.
  const z = Math.min(y * Math.sin(a), oblique.perspectivePx * 0.9);
  const scale = oblique.perspectivePx / (oblique.perspectivePx - z);
  return { x: pivot[0] + x * scale, y: pivot[1] + y * Math.cos(a) * scale, scale };
}

/** Screen y of the horizon of the tilted plane (-Infinity when it is not tilted). */
export function horizonY(pivot: readonly [number, number], oblique: Oblique): number {
  const a = (oblique.pitchDeg * Math.PI) / 180;
  return Math.sin(a) < 1e-6 ? -Infinity : pivot[1] - (oblique.perspectivePx * Math.cos(a)) / Math.sin(a);
}
