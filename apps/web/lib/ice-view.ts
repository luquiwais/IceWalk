/**
 * How the ice map is drawn for people: a 100 m dot grid (the planner's station grid,
 * contracts/grid.json) instead of a continuous blue raster.
 *
 * Why: at site scale the model knows little. In the nominal S1094b map about 75 % of the
 * cells sit exactly at the regional prior (P = 0.67) with uncertainty 1 (no local data);
 * a continuous ramp paints that as one flat blue and hides the 5 % that local craters or
 * measurements actually move. The dot grid separates the two questions:
 * - dot area: P(ice within the tool's reach) at the block's best-informed cell, from the GP;
 * - filled dot: local evidence there (uncertainty left below KNOWN_BELOW);
 * - hollow ring: regional prior only, "we do not know here".
 * Zones where P rises with evidence behind it are circled and labeled.
 * Display thresholds below are presentation choices, not model parameters.
 */
import { decodeLayer, renderPixels, type IceMap } from "./ice-map";

/**
 * Radius of the drawn ice map around the habitat: the HiRISE overview image ends 1.1 km south of
 * the habitat, and the plan reaches 0.5 km, so the circle stays on real imagery.
 */
export const ICE_RADIUS_M = 1100;
/** Station grid spacing (contracts/grid.json: station_grid_cell_size_m). */
export const BLOCK_M = 100;
/** Uncertainty left (fraction of prior variance) below which a block counts as data-backed. */
export const KNOWN_BELOW = 0.8;
/** A block is "likelier" / "less likely" when P differs from the prior by at least this. */
export const SHIFT = 0.1;

export type Block = { x: number; y: number; p: number; u: number; known: boolean; shift: -1 | 0 | 1 };
export type Hotspot = { x: number; y: number; radiusM: number; pMin: number; pMax: number; blocks: number };

/** P and uncertainty of the best-informed cell of each 100 m block; centers in grid meters. */
export function blocks(map: IceMap, blockM = BLOCK_M): Block[] {
  const size = map.width * map.height;
  const p = decodeLayer(map.layers.probability, size);
  const u = decodeLayer(map.layers.uncertainty, size);
  const k = Math.max(1, Math.round(blockM / map.cell_size_m));
  const b = map.bounds_xy_m;
  const out: Block[] = [];
  for (let r0 = 0; r0 + k <= map.height; r0 += k) {
    for (let c0 = 0; c0 + k <= map.width; c0 += k) {
      // The block shows its best-informed cell: local evidence (a crater, a measurement) is a few
      // tens of meters across, and averaging 100 cells would dilute it back into the prior.
      let pm = NaN, um = Infinity;
      for (let r = r0; r < r0 + k; r++) {
        for (let c = c0; c < c0 + k; c++) {
          const i = r * map.width + c;
          if (Number.isNaN(p[i])) continue;
          const ui = Number.isNaN(u[i]) ? 1 : u[i];
          if (ui < um) { um = ui; pm = p[i]; }
        }
      }
      if (Number.isNaN(pm)) continue;
      const known = um < KNOWN_BELOW;
      const d = pm - map.prior_probability;
      out.push({
        x: b.xmin + (c0 + k / 2) * map.cell_size_m,
        y: b.ymax - (r0 + k / 2) * map.cell_size_m,
        p: pm, u: um, known,
        shift: known && d >= SHIFT ? 1 : known && d <= -SHIFT ? -1 : 0,
      });
    }
  }
  return out;
}

/** Groups of neighbouring "likelier" blocks, each as a circle around it (8-connected). */
export function hotspots(list: readonly Block[], blockM = BLOCK_M): Hotspot[] {
  const hot = list.filter((b) => b.shift === 1);
  const key = (x: number, y: number) => `${Math.round(x / blockM)},${Math.round(y / blockM)}`;
  const index = new Map(hot.map((b) => [key(b.x, b.y), b]));
  const seen = new Set<string>();
  const groups: Hotspot[] = [];
  for (const start of hot) {
    const k0 = key(start.x, start.y);
    if (seen.has(k0)) continue;
    const members: Block[] = [];
    const stack = [start];
    seen.add(k0);
    while (stack.length) {
      const b = stack.pop()!;
      members.push(b);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const k = key(b.x + dx * blockM, b.y + dy * blockM);
        const n = index.get(k);
        if (n && !seen.has(k)) { seen.add(k); stack.push(n); }
      }
    }
    const x = members.reduce((a, b) => a + b.x, 0) / members.length;
    const y = members.reduce((a, b) => a + b.y, 0) / members.length;
    const radiusM = Math.max(...members.map((b) => Math.hypot(b.x - x, b.y - y))) + blockM * 0.85;
    const ps = members.map((b) => b.p);
    groups.push({ x, y, radiusM, pMin: Math.min(...ps), pMax: Math.max(...ps), blocks: members.length });
  }
  return groups.sort((a, b) => b.pMax - a.pMax);
}

/** Share of the shown area that is data-backed, for the legend ("we know 6 % of this area"). */
export function knownFraction(list: readonly Block[]): number {
  return list.length ? list.filter((b) => b.known).length / list.length : 0;
}

/** Map modes as people read them; each answers one question with its own encoding. */
export type IceViewMode = "likely" | "unknown" | "change";
export const ICE_VIEW_MODES: { value: IceViewMode; label: string; question: string }[] = [
  { value: "likely", label: "Where ice is likely", question: "Dot size = P(ice within reach). Filled = local evidence; ring = regional prior only." },
  { value: "unknown", label: "What we don't know", question: "Fog = no local data (regional prior only). Clear = craters or measurements nearby." },
  { value: "change", label: "What measuring changed", question: "Shallower (blue) or deeper (grey) than the prior, after this session's measurements." },
];

const PX_PER_BLOCK = 24;
const FOG = [232, 235, 240] as const;

export type IceViewImage = { url: string; bounds: IceMap["bounds_xy_m"] };

/**
 * Draws the ice map for SiteScene and the 3D drape: the chosen mode inside a circle around
 * `center` (the habitat), feathered at the edge, transparent outside. Browser only.
 */
export function renderIceView(map: IceMap, mode: IceViewMode, center: readonly [number, number], radiusM: number): IceViewImage | undefined {
  if (typeof document === "undefined") return undefined;
  const b = map.bounds_xy_m;
  const scale = PX_PER_BLOCK / BLOCK_M; // px per meter
  const W = Math.round((b.xmax - b.xmin) * scale);
  const H = Math.round((b.ymax - b.ymin) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const px = (x: number) => (x - b.xmin) * scale;
  const py = (y: number) => (b.ymax - y) * scale;
  const list = blocks(map);

  if (mode === "likely") {
    for (const blk of list) {
      // Area, not radius, proportional to P (a dot twice as likely looks twice as big).
      const r = Math.max(1.5, 11 * Math.sqrt(Math.min(1, Math.max(0, blk.p))));
      ctx.beginPath();
      ctx.arc(px(blk.x), py(blk.y), r, 0, Math.PI * 2);
      if (blk.known) {
        // Size already carries P; one light blue keeps the dots readable on dark terrain.
        ctx.fillStyle = blk.shift === -1 ? "#9cc6f5" : "#4f9cf0";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgb(255 255 255 / 0.9)";
        ctx.stroke();
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgb(255 255 255 / 0.3)";
        ctx.stroke();
      }
    }
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const h of hotspots(list)) {
      const r = h.radiusM * scale;
      ctx.beginPath();
      ctx.arc(px(h.x), py(h.y), r, 0, Math.PI * 2);
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgb(255 255 255 / 0.95)";
      ctx.stroke();
      ctx.setLineDash([]);
      const lo = Math.round(h.pMin * 100), hi = Math.round(h.pMax * 100);
      const label = `Ice likely · ${lo === hi ? hi : `${lo}-${hi}`}%`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgb(0 0 0 / 0.65)";
      ctx.strokeText(label, px(h.x), py(h.y) - r - 6);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, px(h.x), py(h.y) - r - 6);
    }
  } else {
    // Cell-level layers, drawn at the map's own resolution and smoothed up.
    const small = document.createElement("canvas");
    small.width = map.width;
    small.height = map.height;
    const sctx = small.getContext("2d");
    if (!sctx) return undefined;
    const image = sctx.createImageData(map.width, map.height);
    if (mode === "unknown") {
      const u = decodeLayer(map.layers.uncertainty, map.width * map.height);
      for (let i = 0; i < u.length; i++) {
        const v = Number.isNaN(u[i]) ? 1 : Math.min(1, Math.max(0, u[i]));
        image.data.set([FOG[0], FOG[1], FOG[2], Math.round(150 * v)], i * 4);
      }
    } else {
      image.data.set(renderPixels(map, "change"));
    }
    sctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, W, H);
  }

  // Keep only the circle around the habitat, with a soft edge: no square cut-out.
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createRadialGradient(px(center[0]), py(center[1]), radiusM * scale * 0.9, px(center[0]), py(center[1]), radiusM * scale);
  g.addColorStop(0, "rgb(0 0 0 / 1)");
  g.addColorStop(1, "rgb(0 0 0 / 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  return { url: canvas.toDataURL("image/png"), bounds: b };
}
