"use client";

/**
 * SiteScene: the S1094b site as a mission instrument. The real HiRISE ortho,
 * top-down and north up, with the plan drawn in true grid meters.
 * Spec: docs/plans/web-design.md, "Componente SiteScene" and "Qué se dibuja".
 *
 * Rendering: React renders the structure; a frame loop writes positions
 * through refs, so pan and zoom never re-render React. Each image is its own
 * transformed layer at native resolution (sharp at any zoom); vectors and
 * markers are drawn in screen space, so strokes and markers keep their size.
 */
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
} from "react";

import { measurementSummary, nextStation, type Measurement, type Plan } from "@/lib/plan";

import {
  clamp,
  clampCamera,
  detailOpacity,
  easeInOut,
  fitCamera,
  freeArea,
  horizonY,
  lerpCamera,
  NO_INSETS,
  panBy,
  projectOblique,
  ringStepM,
  scaleBar,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Box,
  type Camera,
  type Insets,
  type Size,
} from "./camera";
import {
  CRATER_LABEL,
  CRATER_XY,
  framePoints,
  HABITAT_XY,
  habitatOnStation,
  MODEL_RANGE_M,
  pIceLabel,
  routeLines,
  SCENE_BOUNDS,
  sceneStations,
  SITE_IMAGERY,
  stationName,
  STATION_CELL_M,
  type RouteLine,
} from "./site-data";
import "./site-scene.css";

export type SiteLayers = { grid: boolean; rings: boolean };

/** A raster in grid meters, e.g. the ice potential from /maps once it exists. */
export type SiteRaster = { url: string; bounds: Box; legend?: unknown };

export type SiteProjection = { headingDeg: number; pitchDeg: number; focus?: readonly [number, number] };

export type SiteSceneHandle = {
  /** Frame these stations (all + habitat when omitted) in the free area. */
  fit: (ids?: readonly string[]) => void;
  zoomBy: (factor: number) => void;
};

export type SiteSceneProps = {
  plan: Plan;
  /** The plan before a re-plan: its route is drawn dashed and the diff is labeled. */
  previousPlan?: Plan;
  measurements?: readonly Measurement[];
  /**
   * Oblique presentation of the ortho, heading up, pivoting on `focus` (grid
   * meters). A tilted flat map, not a terrain elevation model; pan and zoom are off.
   */
  projection?: SiteProjection;
  selectedStationId: string | null;
  hoveredStationId: string | null;
  onSelectStation: (id: string | null) => void;
  onHoverStation: (id: string | null) => void;
  layers: SiteLayers;
  /** Screen px covered by the interface; framing centers in what is left. */
  insets?: Insets;
  raster?: SiteRaster;
  className?: string;
  ref?: Ref<SiteSceneHandle>;
};

const CAMERA_MS = 280;
/** Tilt in and out of the oblique view: the kit's surface morph time. */
const OBLIQUE_MS = 360;
const OBLIQUE_PERSPECTIVE_PX = 900;
/** Ground width shown across the free area at the pivot, in meters. */
const OBLIQUE_SPAN_M = 260;
/** The pivot sits low in the free area, so the view looks ahead along the heading. */
const OBLIQUE_PIVOT_Y = 0.7;

type Tilt = { pitch: number; heading: number };
const FLAT: Tilt = { pitch: 0, heading: 0 };

function obliqueCamera(focus: readonly [number, number], view: Size, insets: Insets): Camera {
  const free = freeArea(view, insets);
  // Keep the next 100 m leg below the legend even above a compact bottom sheet.
  const k = clamp(Math.min(free.width / OBLIQUE_SPAN_M, free.height / 120), 0.5, 4);
  const py = free.top + free.height * OBLIQUE_PIVOT_Y;
  return { pxPerM: k, cx: focus[0] - (free.cx - view.width / 2) / k, cy: focus[1] + (py - view.height / 2) / k };
}

function lerpTilt(a: Tilt, b: Tilt, t: number): Tilt {
  const turn = ((b.heading - a.heading + 540) % 360) - 180;
  return { pitch: a.pitch + (b.pitch - a.pitch) * t, heading: a.heading + turn * t };
}
const KEY_PAN_PX = 80;
const KEY_ZOOM = 1.5;
const CHEVRON_SPACING_PX = 80;
const CHEVRON_CLEAR_PX = 28;
const HAB_OFFSET_PX: [number, number] = [-40, -38];
const GRID_MIN_SPACING_PX = 24;
/** Below this spacing between stations, markers collapse to dots so they do not pile up. */
const COMPACT_BELOW_PX = 40;
/** Where ring labels may sit, in order of preference (degrees, screen y down). */
const RING_LABEL_ANGLES = [-60, -30, -120, -150, 30, 60, 120, 150, 0, 180, -90, 90];

/** Rings out to the farthest corner of the scene from the habitat. */
const RING_COUNT = Math.ceil(
  Math.max(
    ...[
      [SCENE_BOUNDS.xmin, SCENE_BOUNDS.ymin],
      [SCENE_BOUNDS.xmin, SCENE_BOUNDS.ymax],
      [SCENE_BOUNDS.xmax, SCENE_BOUNDS.ymin],
      [SCENE_BOUNDS.xmax, SCENE_BOUNDS.ymax],
    ].map(([x, y]) => Math.hypot(x - HABITAT_XY[0], y - HABITAT_XY[1])),
  ) / 100,
);

function signed(v: number): string {
  const r = Math.round(v);
  return `${r < 0 ? "−" : ""}${Math.abs(r)}`;
}

function minSpacing(points: readonly (readonly [number, number])[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      best = Math.min(best, Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]));
  return Number.isFinite(best) ? best : STATION_CELL_M;
}

/** Where north falls on screen when `headingDeg` points up. */
function northSide(headingDeg: number): string {
  const h = ((headingDeg % 360) + 360) % 360;
  if (h < 22.5 || h >= 337.5) return "north ahead";
  if (h < 157.5) return h < 67.5 ? "north ahead to the left" : h < 112.5 ? "north to the left" : "north behind to the left";
  if (h < 202.5) return "north behind";
  return h < 247.5 ? "north behind to the right" : h < 292.5 ? "north to the right" : "north ahead to the right";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

type Live = {
  /** Stations + habitat of the current plan, for the initial framing. */
  framing: [number, number][];
  /** Smallest distance between two stations, in meters. */
  spacingM: number;
  lines: RouteLine[];
  previousLines: RouteLine[];
  points: Map<string, [number, number]>;
  selected: string | null;
  layers: SiteLayers;
  insets: Insets;
  habitatOffset: boolean;
  projection: SiteProjection | null;
};

export function SiteScene({
  plan,
  previousPlan,
  measurements = [],
  projection,
  selectedStationId,
  hoveredStationId,
  onSelectStation,
  onHoverStation,
  layers,
  insets = NO_INSETS,
  raster,
  className,
  ref,
}: SiteSceneProps) {
  const helpId = useId();
  const { stations, dropped } = useMemo(() => sceneStations(plan, previousPlan), [plan, previousPlan]);
  /** Stations + habitat, and what a re-plan dropped, so the diff stays in frame. */
  const framing = useMemo(
    () => [...framePoints(plan), ...dropped.map((s) => [s.position[0], s.position[1]] as [number, number])],
    [plan, dropped],
  );
  const measuredById = new Map(measurements.map((m) => [m.station_id, m]));
  const nextId = measurements.length ? nextStation(plan, measurements)?.id : undefined;
  const lines = useMemo(() => routeLines(plan), [plan]);
  const previousLines = useMemo(() => (previousPlan ? routeLines(previousPlan) : []), [previousPlan]);
  const habitatOffset = habitatOnStation([...stations, ...dropped]);
  const selected = stations.find((s) => s.id === selectedStationId) ?? null;

  const [ready, setReady] = useState(false);
  const [detailWanted, setDetailWanted] = useState(false);

  // DOM handles.
  const root = useRef<HTMLDivElement>(null);
  const images = useRef(new Map<string, { el: HTMLImageElement; box: Box; width: number }>());
  const anchors = useRef(new Map<string, HTMLDivElement>());
  const gridPath = useRef<SVGPathElement>(null);
  const rings = useRef<(SVGCircleElement | null)[]>([]);
  const ringLabels = useRef<(SVGTextElement | null)[]>([]);
  const previousPath = useRef<SVGPathElement>(null);
  const haloPath = useRef<SVGPathElement>(null);
  const routePath = useRef<SVGPathElement>(null);
  const chevronPath = useRef<SVGPathElement>(null);
  const rangeCircle = useRef<SVGCircleElement>(null);
  const rangeLabel = useRef<SVGTextElement>(null);
  const leader = useRef<SVGLineElement>(null);
  const northEl = useRef<HTMLDivElement>(null);
  const scaleBarEl = useRef<HTMLDivElement>(null);
  const scaleLabel = useRef<HTMLSpanElement>(null);
  const coords = useRef<HTMLSpanElement>(null);
  const clipRect = useRef<SVGRectElement>(null);
  const clipId = useId().replace(/:/g, "");

  // Frame state, outside React.
  const camera = useRef<Camera | null>(null);
  const autoFrame = useRef(true);
  const framedIds = useRef<readonly string[] | undefined>(undefined);
  const size = useRef<Size>({ width: 0, height: 0 });
  const anim = useRef<{ from: Camera; to: Camera; start: number } | null>(null);
  const tilt = useRef<Tilt>(FLAT);
  const tiltAnim = useRef<{ from: Tilt; to: Tilt; start: number } | null>(null);
  /** World point the tilt pivots on; kept after the projection ends so the way back is continuous. */
  const pivotWorld = useRef<readonly [number, number]>(HABITAT_XY);
  const projectionKey = useRef("");
  const pointer = useRef<[number, number] | null>(null);
  const frame = useRef(0);
  const flags = useRef({ ready: false, detail: false });
  const live = useRef<Live>({
    framing: [],
    spacingM: STATION_CELL_M,
    lines,
    previousLines,
    points: new Map(),
    selected: selectedStationId,
    layers,
    insets,
    habitatOffset,
    projection: null,
  });

  const draw = useCallback(() => {
    frame.current = 0;
    const view = size.current;
    if (!view.width || !view.height) return;
    const L = live.current;
    if (!camera.current) {
      if (!L.framing.length) return;
      camera.current = clampCamera(
        L.projection ? obliqueCamera(pivotWorld.current, view, L.insets) : fitCamera(L.framing, view, L.insets),
        view,
        L.insets,
        SCENE_BOUNDS,
      );
    }
    const ta = tiltAnim.current;
    if (ta) {
      const t = Math.min(1, (performance.now() - ta.start) / OBLIQUE_MS);
      tilt.current = lerpTilt(ta.from, ta.to, easeInOut(t));
      if (t >= 1) tiltAnim.current = null;
      else if (!frame.current) frame.current = requestAnimationFrame(draw);
    }
    const a = anim.current;
    if (a) {
      const t = Math.min(1, (performance.now() - a.start) / CAMERA_MS);
      camera.current = lerpCamera(a.from, a.to, easeInOut(t));
      if (t >= 1) anim.current = null;
      else if (!frame.current) frame.current = requestAnimationFrame(draw);
    }
    const cam = camera.current;
    const k = cam.pxPerM;
    const toScreen = (x: number, y: number) => worldToScreen(cam, view, x, y);
    const fmt = (v: number) => v.toFixed(1);

    // Oblique view: the ground layer is tilted in CSS; markers are projected here and stay upright.
    const T = tilt.current;
    const tilted = T.pitch > 0.01;
    const pivot = toScreen(pivotWorld.current[0], pivotWorld.current[1]);
    const oblique = tilted ? { headingDeg: T.heading, pitchDeg: T.pitch, perspectivePx: OBLIQUE_PERSPECTIVE_PX } : null;
    const el = root.current;
    if (el) {
      if (tilted !== (el.dataset.tilted !== undefined)) {
        if (tilted) el.dataset.tilted = "";
        else delete el.dataset.tilted;
      }
      const vars = tilted
        ? `${T.pitch.toFixed(2)}|${(-T.heading).toFixed(2)}|${fmt(pivot[0])}|${fmt(pivot[1])}|${fmt(Math.max(0, horizonY(pivot, oblique!)))}`
        : "";
      if (vars !== el.dataset.tilt) {
        el.dataset.tilt = vars;
        const [pitch, heading, px, py, horizon] = vars ? vars.split("|") : ["0", "0", "0", "0", "0"];
        el.style.setProperty("--site-pitch", `${pitch}deg`);
        el.style.setProperty("--site-heading", `${heading}deg`);
        el.style.setProperty("--site-pivot-x", `${px}px`);
        el.style.setProperty("--site-pivot-y", `${py}px`);
        el.style.setProperty("--site-horizon", `${horizon}px`);
        if (northEl.current) northEl.current.style.setProperty("--site-north", `${heading}deg`);
      }
    }
    const place = (p: readonly [number, number]) =>
      oblique ? projectOblique(p, pivot, oblique) : { x: p[0], y: p[1], scale: 1 };

    // Imagery: one transform per image, at its native pixel size.
    for (const { el, box, width } of images.current.values()) {
      const [sx, sy] = toScreen(box.xmin, box.ymax);
      const scale = (k * (box.xmax - box.xmin)) / width;
      el.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${scale})`;
      if (el.dataset.kind === "detail") el.style.opacity = String(detailOpacity(k));
    }

    // Vectors stay on the imagery.
    const clip = clipRect.current;
    if (clip) {
      const [bx0, by0] = toScreen(SCENE_BOUNDS.xmin, SCENE_BOUNDS.ymax);
      clip.setAttribute("x", fmt(bx0));
      clip.setAttribute("y", fmt(by0));
      clip.setAttribute("width", fmt((SCENE_BOUNDS.xmax - SCENE_BOUNDS.xmin) * k));
      clip.setAttribute("height", fmt((SCENE_BOUNDS.ymax - SCENE_BOUNDS.ymin) * k));
    }
    if (root.current) {
      const compact = L.spacingM * k < COMPACT_BELOW_PX;
      if (compact !== (root.current.dataset.density === "compact")) {
        if (compact) root.current.dataset.density = "compact";
        else delete root.current.dataset.density;
      }
    }

    // Station grid: cell edges, half a cell off the station lattice.
    const grid = gridPath.current;
    if (grid) {
      const spacing = STATION_CELL_M * k;
      if (L.layers.grid && spacing >= GRID_MIN_SPACING_PX) {
        const [wx0, wy1] = screenToWorld(cam, view, 0, 0);
        const [wx1, wy0] = screenToWorld(cam, view, view.width, view.height);
        const x0 = Math.max(wx0, SCENE_BOUNDS.xmin);
        const x1 = Math.min(wx1, SCENE_BOUNDS.xmax);
        const y0 = Math.max(wy0, SCENE_BOUNDS.ymin);
        const y1 = Math.min(wy1, SCENE_BOUNDS.ymax);
        const half = STATION_CELL_M / 2;
        let d = "";
        for (let x = Math.ceil((x0 - half) / STATION_CELL_M) * STATION_CELL_M + half; x <= x1; x += STATION_CELL_M) {
          const [sx, sy0] = toScreen(x, y1);
          const [, sy1] = toScreen(x, y0);
          d += `M${Math.round(sx) + 0.5} ${fmt(sy0)}V${fmt(sy1)}`;
        }
        for (let y = Math.ceil((y0 - half) / STATION_CELL_M) * STATION_CELL_M + half; y <= y1; y += STATION_CELL_M) {
          const [sx0, sy] = toScreen(x0, y);
          const [sx1] = toScreen(x1, y);
          d += `M${fmt(sx0)} ${Math.round(sy) + 0.5}H${fmt(sx1)}`;
        }
        grid.setAttribute("d", d);
      } else grid.setAttribute("d", "");
    }

    // Range rings from the habitat.
    const step = L.layers.rings ? ringStepM(k) : null;
    const free = freeArea(view, L.insets);
    const [imgLeft, imgTop] = toScreen(SCENE_BOUNDS.xmin, SCENE_BOUNDS.ymax);
    const [imgRight, imgBottom] = toScreen(SCENE_BOUNDS.xmax, SCENE_BOUNDS.ymin);
    const [hx, hy] = toScreen(HABITAT_XY[0], HABITAT_XY[1]);
    rings.current.forEach((ring, i) => {
      const meters = (i + 1) * 100;
      const label = ringLabels.current[i];
      const show = step !== null && meters % step === 0;
      if (ring) {
        ring.style.display = show ? "" : "none";
        if (show) {
          ring.setAttribute("cx", fmt(hx));
          ring.setAttribute("cy", fmt(hy));
          ring.setAttribute("r", fmt(meters * k));
        }
      }
      if (label) {
        label.style.display = show ? "" : "none";
        if (show) {
          // First spot on the ring inside the free area, so every visible ring is named.
          const r = meters * k;
          const spot = RING_LABEL_ANGLES.map((deg) => {
            const t = (deg * Math.PI) / 180;
            return [hx + Math.cos(t) * r, hy + Math.sin(t) * r] as const;
          }).find(
            ([x, y]) =>
              x > Math.max(free.left, imgLeft) + 8 &&
              x < Math.min(free.left + free.width, imgRight) - 48 &&
              y > Math.max(free.top, imgTop) + 16 &&
              y < Math.min(free.top + free.height, imgBottom) - 8,
          );
          label.style.display = spot ? "" : "none";
          if (spot) {
            label.setAttribute("x", fmt(spot[0] + 4));
            label.setAttribute("y", fmt(spot[1] - 4));
          }
        }
      }
    });

    // Routes.
    const pathOf = (route: RouteLine[]) =>
      route
        .map((line) => line.map(([x, y], i) => `${i ? "L" : "M"}${fmt(toScreen(x, y)[0])} ${fmt(toScreen(x, y)[1])}`).join(""))
        .join("");
    const d = pathOf(L.lines);
    haloPath.current?.setAttribute("d", d);
    routePath.current?.setAttribute("d", d);
    previousPath.current?.setAttribute("d", L.previousLines.length ? pathOf(L.previousLines) : "");

    // Direction chevrons every ~80 px, clear of the markers.
    const markerPts = [...L.points.values()].map(([x, y]) => toScreen(x, y));
    markerPts.push(L.habitatOffset ? [hx + HAB_OFFSET_PX[0], hy + HAB_OFFSET_PX[1]] : [hx, hy]);
    let chevrons = "";
    for (const line of L.lines) {
      let carry = CHEVRON_SPACING_PX / 2;
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = toScreen(...line[i - 1]);
        const [bx, by] = toScreen(...line[i]);
        const len = Math.hypot(bx - ax, by - ay);
        if (len < 1e-6) continue;
        const ux = (bx - ax) / len;
        const uy = (by - ay) / len;
        let s = carry;
        for (; s < len; s += CHEVRON_SPACING_PX) {
          const px = ax + ux * s;
          const py = ay + uy * s;
          if (markerPts.some(([mx, my]) => Math.hypot(mx - px, my - py) < CHEVRON_CLEAR_PX)) continue;
          if (px < -20 || py < -20 || px > view.width + 20 || py > view.height + 20) continue;
          const w = 3.5;
          chevrons += `M${fmt(px - ux * w - uy * w)} ${fmt(py - uy * w + ux * w)}L${fmt(px + ux * w * 0.6)} ${fmt(py + uy * w * 0.6)}L${fmt(px - ux * w + uy * w)} ${fmt(py - uy * w - ux * w)}`;
        }
        carry = s - len;
      }
    }
    chevronPath.current?.setAttribute("d", chevrons);

    // Markers.
    for (const [id, el] of anchors.current) {
      let p: [number, number] | undefined;
      let offset: readonly [number, number] = [0, 0];
      if (id === "@habitat") {
        p = [hx, hy];
        if (L.habitatOffset) offset = HAB_OFFSET_PX;
      } else if (id === "@crater") {
        p = toScreen(CRATER_XY[0], CRATER_XY[1]);
      } else {
        const w = L.points.get(id);
        if (w) p = toScreen(w[0], w[1]);
      }
      if (!p) continue;
      const at = place(p);
      el.style.transform =
        `translate3d(${fmt(at.x + offset[0])}px, ${fmt(at.y + offset[1])}px, 0)` +
        (oblique ? ` scale(${clamp(at.scale, 0.45, 1.4).toFixed(3)})` : "");
    }
    const lead = leader.current;
    if (lead) {
      if (L.habitatOffset && !oblique) {
        const len = Math.hypot(...HAB_OFFSET_PX);
        const ux = HAB_OFFSET_PX[0] / len;
        const uy = HAB_OFFSET_PX[1] / len;
        // From the station's edge to the habitat square's corner.
        lead.setAttribute("x1", fmt(hx + ux * 22));
        lead.setAttribute("y1", fmt(hy + uy * 22));
        lead.setAttribute("x2", fmt(hx + HAB_OFFSET_PX[0] + 14));
        lead.setAttribute("y2", fmt(hy + HAB_OFFSET_PX[1] + 14));
        lead.style.display = "";
      } else lead.style.display = "none";
    }

    // Model range around the selected station.
    const sel = L.selected ? L.points.get(L.selected) : undefined;
    const rc = rangeCircle.current;
    const rl = rangeLabel.current;
    if (rc && rl) {
      if (sel) {
        const [sx, sy] = toScreen(sel[0], sel[1]);
        const r = MODEL_RANGE_M * k;
        rc.setAttribute("cx", fmt(sx));
        rc.setAttribute("cy", fmt(sy));
        rc.setAttribute("r", fmt(r));
        // Label on the circle where it is in view: below, above, then the sides.
        const spot = (
          [
            [sx, sy + r + 16, "middle"],
            [sx, sy - r - 8, "middle"],
            [sx - r - 8, sy + 4, "end"],
            [sx + r + 8, sy + 4, "start"],
            [sx + r * 0.71 + 6, sy + r * 0.71 + 12, "start"],
            [sx - r * 0.71 - 6, sy + r * 0.71 + 12, "end"],
            [sx + r * 0.71 + 6, sy - r * 0.71 - 6, "start"],
            [sx - r * 0.71 - 6, sy - r * 0.71 - 6, "end"],
          ] as const
        ).find(
          ([x, y, anchor]) =>
            x > free.left + 64 &&
            x < free.left + free.width - 64 &&
            y > free.top + 12 &&
            y < free.top + free.height - 4 &&
            // Clear of every marker (the label is ~110 px wide).
            !markerPts.some(([mx, my]) => {
              const cx = anchor === "middle" ? x : anchor === "start" ? x + 55 : x - 55;
              return Math.abs(mx - cx) < 55 + 22 && Math.abs(my - (y - 4)) < 8 + 22;
            }),
        );
        rc.style.display = r > 24 ? "" : "none";
        rl.style.display = r > 24 && spot ? "" : "none";
        if (spot) {
          rl.setAttribute("x", fmt(spot[0]));
          rl.setAttribute("y", fmt(spot[1]));
          rl.setAttribute("text-anchor", spot[2]);
        }
      } else {
        rc.style.display = "none";
        rl.style.display = "none";
      }
    }

    // Scale bar and cursor readout.
    const bar = scaleBar(k);
    if (scaleBarEl.current) scaleBarEl.current.style.width = `${bar.px.toFixed(1)}px`;
    if (scaleLabel.current) scaleLabel.current.textContent = bar.label;
    if (coords.current) {
      const p = pointer.current;
      if (p && !oblique) {
        const [wx, wy] = screenToWorld(cam, view, p[0], p[1]);
        coords.current.textContent = `x ${signed(wx)} m · y ${signed(wy)} m`;
      } else coords.current.textContent = "";
    }

    if (!flags.current.detail && k >= 0.9) {
      flags.current.detail = true;
      setDetailWanted(true);
    }
    if (!flags.current.ready) {
      flags.current.ready = true;
      setReady(true);
    }
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current && typeof requestAnimationFrame !== "undefined") frame.current = requestAnimationFrame(draw);
  }, [draw]);

  const setCamera = useCallback(
    (next: Camera) => {
      anim.current = null;
      camera.current = clampCamera(next, size.current, live.current.insets, SCENE_BOUNDS);
      schedule();
    },
    [schedule],
  );

  const animateTo = useCallback(
    (to: Camera) => {
      const target = clampCamera(to, size.current, live.current.insets, SCENE_BOUNDS);
      if (!camera.current || prefersReducedMotion()) return setCamera(target);
      anim.current = { from: camera.current, to: target, start: performance.now() };
      schedule();
    },
    [schedule, setCamera],
  );

  const fit = useCallback(
    (ids?: readonly string[]) => {
      if (!size.current.width) return;
      autoFrame.current = true;
      framedIds.current = ids;
      if (live.current.projection) return;
      animateTo(fitCamera(ids?.length ? framePoints(plan, ids) : framing, size.current, live.current.insets));
    },
    [animateTo, plan, framing],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const cam = camera.current;
      if (!cam || live.current.projection) return;
      autoFrame.current = false;
      const free = freeArea(size.current, live.current.insets);
      setCamera(zoomAt(cam, size.current, factor, free.cx, free.cy));
    },
    [setCamera],
  );

  useImperativeHandle(ref, () => ({ fit, zoomBy }), [fit, zoomBy]);

  // Props into the frame loop.
  useLayoutEffect(() => {
    const layoutChanged = Object.keys(insets).some((key) => live.current.insets[key as keyof Insets] !== insets[key as keyof Insets]);
    live.current = {
      framing,
      spacingM: minSpacing([...stations, ...dropped].map((s) => s.position)),
      lines,
      previousLines,
      points: new Map([...stations, ...dropped].map((s) => [s.id, [s.position[0], s.position[1]]])),
      selected: selectedStationId,
      layers,
      insets,
      habitatOffset,
      projection: projection ?? null,
    };
    if (projection?.focus) pivotWorld.current = projection.focus;
    const flatCamera = () =>
      fitCamera(framedIds.current?.length ? framePoints(plan, framedIds.current) : framing, size.current, insets);
    const key = projection ? `${projection.headingDeg}|${projection.pitchDeg}|${pivotWorld.current.join(",")}` : "";
    if (key !== projectionKey.current) {
      // Into, out of, or along the oblique view: camera and tilt move together.
      projectionKey.current = key;
      const to: Tilt = projection ? { pitch: projection.pitchDeg, heading: projection.headingDeg } : FLAT;
      autoFrame.current = true;
      if (size.current.width && camera.current) {
        const target = projection ? obliqueCamera(pivotWorld.current, size.current, insets) : flatCamera();
        if (prefersReducedMotion()) {
          tiltAnim.current = null;
          tilt.current = to;
          setCamera(target);
        } else {
          tiltAnim.current = { from: tilt.current.pitch > 0.01 ? tilt.current : FLAT, to, start: performance.now() };
          animateTo(target);
        }
      } else {
        tiltAnim.current = null;
        tilt.current = to;
      }
    } else if (layoutChanged && autoFrame.current && size.current.width) {
      anim.current = null;
      camera.current = clampCamera(
        projection ? obliqueCamera(pivotWorld.current, size.current, insets) : flatCamera(),
        size.current,
        insets,
        SCENE_BOUNDS,
      );
    }
    schedule();
  }, [plan, framing, lines, previousLines, stations, dropped, selectedStationId, layers, insets, habitatOffset, projection, schedule, animateTo, setCamera]);

  // Size, gestures and keys: native listeners, so wheel can be non-passive and
  // nothing goes through React per frame.
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      size.current = { width: rect.width, height: rect.height };
      const L = live.current;
      if (camera.current) camera.current = L.projection
        ? clampCamera(obliqueCamera(pivotWorld.current, size.current, L.insets), size.current, L.insets, SCENE_BOUNDS)
        : autoFrame.current
          ? clampCamera(fitCamera(L.framing, size.current, L.insets), size.current, L.insets, SCENE_BOUNDS)
          : clampCamera(camera.current, size.current, L.insets, SCENE_BOUNDS);
      schedule();
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);

    const local = (e: { clientX: number; clientY: number }): [number, number] => {
      const rect = el.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };
    const onObject = (e: Event) => (e.target as Element | null)?.closest?.("button, a, input, [data-site-object]") != null;

    const pointers = new Map<number, [number, number]>();
    let pinch: { dist: number; mid: [number, number] } | null = null;
    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number] };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (live.current.projection) return;
      autoFrame.current = false;
      if (e.button !== 0 || onObject(e)) return;
      el.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, local(e));
      anim.current = null;
      if (pointers.size === 2) pinch = pinchState();
      el.dataset.dragging = "";
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = local(e);
      pointer.current = e.pointerType === "mouse" ? p : null;
      const prev = pointers.get(e.pointerId);
      const cam = camera.current;
      if (prev && cam) {
        pointers.set(e.pointerId, p);
        if (pointers.size === 1) {
          setCamera(panBy(cam, p[0] - prev[0], p[1] - prev[1]));
          return;
        }
        if (pointers.size === 2 && pinch) {
          const now = pinchState();
          const zoomed = zoomAt(cam, size.current, now.dist / pinch.dist, pinch.mid[0], pinch.mid[1]);
          setCamera(panBy(zoomed, now.mid[0] - pinch.mid[0], now.mid[1] - pinch.mid[1]));
          pinch = now;
          return;
        }
      }
      schedule();
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = pointers.size === 2 ? pinchState() : null;
      if (!pointers.size) delete el.dataset.dragging;
    };
    const onPointerLeave = () => {
      pointer.current = null;
      schedule();
    };
    const onWheel = (e: WheelEvent) => {
      if (live.current.projection) return;
      autoFrame.current = false;
      const cam = camera.current;
      if (!cam) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.current.height : 1;
      // ctrlKey = trackpad pinch, which sends small deltas.
      const factor = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0018));
      const [sx, sy] = local(e);
      setCamera(zoomAt(cam, size.current, factor, sx, sy));
    };
    const onDoubleClick = (e: MouseEvent) => {
      if (live.current.projection) return;
      autoFrame.current = false;
      const cam = camera.current;
      if (!cam || onObject(e)) return;
      const [sx, sy] = local(e);
      const to = zoomAt(cam, size.current, 2, sx, sy);
      if (prefersReducedMotion()) setCamera(to);
      else animateTo(to);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDoubleClick);
    return () => {
      observer?.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDoubleClick);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [animateTo, schedule, setCamera]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "="].includes(e.key)) autoFrame.current = false;
    const cam = camera.current;
    if (!cam || e.altKey || e.metaKey || e.ctrlKey) return;
    const pan = e.shiftKey ? KEY_PAN_PX * 3 : KEY_PAN_PX;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [pan, 0],
      ArrowRight: [-pan, 0],
      ArrowUp: [0, pan],
      ArrowDown: [0, -pan],
    };
    if (moves[e.key]) {
      e.preventDefault();
      setCamera(panBy(cam, ...moves[e.key]));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(KEY_ZOOM);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomBy(1 / KEY_ZOOM);
    } else if (e.key === "0") {
      e.preventDefault();
      fit();
    } else if (e.key === "Escape" && selectedStationId) {
      onSelectStation(null);
    }
  };

  /** Keyboard focus on a station off the free area brings it into view. */
  const reveal = (id: string) => {
    const cam = camera.current;
    const w = live.current.points.get(id);
    if (!cam || !w) return;
    const view = size.current;
    const free = freeArea(view, live.current.insets);
    const [sx, sy] = worldToScreen(cam, view, w[0], w[1]);
    const m = 48;
    if (sx < free.left + m || sx > free.left + free.width - m || sy < free.top + m || sy > free.top + free.height - m) {
      animateTo({ ...cam, cx: cam.cx + (sx - free.cx) / cam.pxPerM, cy: cam.cy - (sy - free.cy) / cam.pxPerM });
    }
  };

  const anchorRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      anchors.current.set(id, el);
      schedule();
      return () => {
        anchors.current.delete(id);
      };
    }
  };

  const imageRef = (key: string, box: Box, width: number) => (el: HTMLImageElement | null) => {
    if (el) {
      images.current.set(key, { el, box, width });
      schedule();
      return () => {
        images.current.delete(key);
      };
    }
  };

  const overview = SITE_IMAGERY.overview;
  const detail = SITE_IMAGERY.detail;
  const rasterWidth = raster ? raster.bounds.xmax - raster.bounds.xmin : 0;

  return (
    <div
      ref={root}
      className={["site-scene", className].filter(Boolean).join(" ")}
      data-ready={ready ? "" : undefined}
      data-projected={projection ? "" : undefined}
      tabIndex={projection ? -1 : 0}
      role="group"
      aria-roledescription="map"
      aria-label="Site map, S1094b"
      aria-describedby={helpId}
      onKeyDown={projection ? undefined : onKeyDown}
      style={
        {
          "--site-inset-top": `${insets.top}px`,
          "--site-inset-right": `${insets.right}px`,
          "--site-inset-bottom": `${insets.bottom}px`,
          "--site-inset-left": `${insets.left}px`,
        } as CSSProperties
      }
    >
      <p id={helpId} className="site-sr-only">
        North up. Drag or use the arrow keys to pan, plus and minus to zoom, 0 to frame the plan. Tab moves between stations.
      </p>

      <div className="site-ground">
      <div className="site-imagery" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- transformed per frame; next/image adds nothing here */}
        <img
          ref={imageRef("overview", overview.box, overview.width)}
          className="site-image"
          data-kind="overview"
          src={overview.src}
          width={overview.width}
          height={overview.height}
          alt=""
          draggable={false}
          decoding="async"
        />
        {detailWanted ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef("detail", detail.box, detail.width)}
            className="site-image"
            data-kind="detail"
            src={detail.src}
            width={detail.width}
            height={detail.height}
            alt=""
            draggable={false}
            decoding="async"
          />
        ) : null}
        {raster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef("raster", raster.bounds, rasterWidth)}
            className="site-image"
            data-kind="raster"
            src={raster.url}
            width={rasterWidth}
            height={raster.bounds.ymax - raster.bounds.ymin}
            alt=""
            draggable={false}
          />
        ) : null}
      </div>
      <div className="site-tint" aria-hidden />
      <svg className="site-vectors" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <rect ref={clipRect} />
          </clipPath>
        </defs>
        <path ref={gridPath} className="site-grid-lines" />
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: RING_COUNT }, (_, i) => (
            <circle
              key={i}
              ref={(el) => {
                rings.current[i] = el;
              }}
              className="site-ring"
              style={{ display: "none" }}
            />
          ))}
          {Array.from({ length: RING_COUNT }, (_, i) => (
            <text
              key={i}
              ref={(el) => {
                ringLabels.current[i] = el;
              }}
              className="site-svg-label"
              style={{ display: "none" }}
            >
              {(i + 1) * 100 >= 1000 ? `${((i + 1) * 100) / 1000} km` : `${(i + 1) * 100} m`}
            </text>
          ))}
        </g>
        <path ref={previousPath} className="site-route-previous" />
        <path ref={haloPath} className="site-route-halo" />
        <path ref={routePath} className="site-route" />
        <path ref={chevronPath} className="site-chevrons" />
        <circle ref={rangeCircle} className="site-range" style={{ display: "none" }} />
        <text ref={rangeLabel} className="site-svg-label site-range-label" style={{ display: "none" }}>
          Model range {MODEL_RANGE_M} m
        </text>
        <line ref={leader} className="site-leader" />
      </svg>
      </div>
      <div className="site-haze" aria-hidden />
      <div className="site-vignette" aria-hidden />

      <div className="site-markers">
        <div ref={anchorRef("@crater")} className="site-anchor" data-site-object>
          <div className="site-crater" role="img" aria-label={`${CRATER_LABEL}, grid origin`} />
          <span className="site-crater-label" aria-hidden>
            {CRATER_LABEL}
          </span>
        </div>

        {dropped.map((s) => (
          <div key={`dropped-${s.id}`} ref={anchorRef(s.id)} className="site-anchor">
            <div className="site-dropped" role="img" aria-label={measuredById.has(s.id) ? `Measured station ${s.id}, ${measurementSummary(measuredById.get(s.id)!)}` : `Dropped station ${s.id}, was station ${s.order}`} data-site-object>
              <span className="site-station-dot">{s.order}</span>
              <span className="site-tags" aria-hidden>
                <span className="site-tag" data-tag={measuredById.has(s.id) ? "measured" : "dropped"}>
                  {measuredById.has(s.id) ? <>Measured<span className="site-tag-detail"> · {measurementSummary(measuredById.get(s.id)!)}</span></> : "Dropped"}
                </span>
                <span className="site-label site-label-static">{s.id}</span>
              </span>
            </div>
          </div>
        ))}

        <div ref={anchorRef("@habitat")} className="site-anchor">
          <div className="site-hab" role="img" aria-label={`Habitat, x ${signed(HABITAT_XY[0])} m, y ${signed(HABITAT_XY[1])} m`} data-site-object>
            HAB
          </div>
        </div>

        {stations.map((s) => {
          const isSelected = s.id === selectedStationId;
          const isHovered = s.id === hoveredStationId;
          const p = Math.max(0, Math.min(1, s.p_ice));
          return (
            <div key={s.id} ref={anchorRef(s.id)} className="site-anchor">
              <button
                type="button"
                className="site-station"
                aria-label={stationName(s) + (measuredById.has(s.id) ? `, measured, ${measurementSummary(measuredById.get(s.id)!)}` : s.status === "added" ? ", added by the re-plan" : "")}
                aria-pressed={isSelected}
                data-selected={isSelected ? "" : undefined}
                data-hovered={isHovered ? "" : undefined}
                data-status={s.status}
                onClick={() => onSelectStation(isSelected ? null : s.id)}
                onPointerEnter={() => onHoverStation(s.id)}
                onPointerLeave={() => onHoverStation(null)}
                onFocus={() => reveal(s.id)}
              >
                <span className="site-station-body">
                  <svg className="site-arc" viewBox="0 0 44 44" aria-hidden>
                    <circle className="site-arc-track" cx="22" cy="22" r="19.5" />
                    <circle
                      className="site-arc-value"
                      cx="22"
                      cy="22"
                      r="19.5"
                      pathLength={100}
                      strokeDasharray={`${(p * 100).toFixed(2)} 100`}
                    />
                  </svg>
                  <span className="site-station-dot">{s.order}</span>
                </span>
                <span className="site-tags" aria-hidden>
                  {measuredById.has(s.id) ? <span className="site-tag" data-tag="measured">Measured<span className="site-tag-detail"> · {measurementSummary(measuredById.get(s.id)!)}</span></span> : s.id === nextId ? <span className="site-tag" data-tag="next">Next</span> : null}
                  {s.status === "added" ? (
                    <span className="site-tag" data-tag="added">
                      Added
                    </span>
                  ) : null}
                  <span className="site-label">
                    {s.id} · {pIceLabel(s)}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="site-hud">
        <div className="site-hud-row">
          <div
            ref={northEl}
            className="site-north"
            role="img"
            aria-label={projection ? `Heading ${String(Math.round(projection.headingDeg) % 360).padStart(3, "0")}°, ${northSide(projection.headingDeg)}` : "North is up"}
          >
            <svg viewBox="0 0 12 16" aria-hidden>
              <path d="M6 0 12 16 6 12 0 16Z" />
            </svg>
            <span aria-hidden>N</span>
          </div>
          <div className="site-scale">
            <span ref={scaleLabel} aria-hidden />
            <div ref={scaleBarEl} className="site-scale-bar" aria-hidden />
          </div>
        </div>
        <span ref={coords} className="site-coords" aria-hidden />
        <span className="site-credit">{SITE_IMAGERY.credit}</span>
      </div>

      <p className="site-sr-only" aria-live="polite">
        {selected ? `Selected ${stationName(selected)}. Model range ${MODEL_RANGE_M} m shown.` : ""}
      </p>
    </div>
  );
}
