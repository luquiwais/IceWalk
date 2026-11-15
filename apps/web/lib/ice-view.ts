/**
 * How the ice map is drawn for people. The whole area is covered in probability bands, the way
 * an interpolated climate map is drawn: the background is the regional prior (P = 0.67 at
 * S1094b, likely but uncertain), and around craters or measurements the probability rises or
 * falls in concentric bands with thin isolines. Probability and certainty set the color
 * together: brighter blue = likelier ice within reach; dim, grey and more transparent = less
 * certain (the imagery is dimmed, so brightness carries the signal). The real peak of each likelier zone is labeled from the unsmoothed model.
 *
 * Blocks and hotspots (100 m, the planner's station grid) still summarize where local evidence
 * sits, for labels and the legend. Display thresholds below are presentation choices, not
 * model parameters.
 */
import { decodeLayer, renderPixels, type IceMap } from "./ice-map";

/** Radius of the drawn ice map around the habitat: the whole 3 x 3 km map window (planner map_half_m). */
export const ICE_RADIUS_M = 1500;
/** Station grid spacing (contracts/grid.json: station_grid_cell_size_m). */
export const BLOCK_M = 100;
/** Uncertainty left (fraction of prior variance) below which a block counts as data-backed. */
export const KNOWN_BELOW = 0.95;  // 0.8 left half of the cells craters move as prior only (research 2026-11-14)
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

/** Map modes: the combined ice map (planning and EVA) and what measuring changed (debrief). */
export type IceViewMode = "likely" | "change";
export const ICE_VIEW_MODES: { value: IceViewMode; label: string; question: string }[] = [
  { value: "likely", label: "Ice map", question: "Brighter blue = likelier ice within reach; dim and grey = less certain." },
  { value: "change", label: "What measuring changed", question: "Shallower (blue) or deeper (grey) than the prior, after this session's measurements." },
];

/**
 * Probability classes of the combined map (P(ice within reach)). The prior (0.67 at S1094b)
 * falls in the 0.66-0.70 band, so the background reads as "likely, as the region says".
 */
export const P_BANDS = [0.6, 0.64, 0.66, 0.7, 0.74, 0.8, 0.86, 0.92];
/** Blues from light (less likely) to deep (likelier), one per band plus the open ends. */
/** On the dimmed imagery, likelier is brighter: from a dim slate blue to bright ice blue. */
export const P_COLORS = ["#1b2b40", "#203752", "#264565", "#2d5a86", "#3572a8", "#4189c6", "#5aa3dc", "#83c0ec", "#bfe3fb"];
/** Neutral grey the color fades to where the model is uncertain. */
const VEIL: [number, number, number] = [92, 102, 116];
/**
 * Smoothing of the drawn field (cells of 10 m): soft band edges that fade outward. It widens a
 * zone visually beyond the model's own reach (tens of meters), so peaks are labeled from the
 * unsmoothed model and the legend says the halo is visual.
 */
const SMOOTH_CELLS = 5;
const PX_PER_CELL = 3;

export type IceViewImage = { url: string; bounds: IceMap["bounds_xy_m"] };

function gaussian(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-0.5 * ((i - r) / sigma) ** 2));
  const sum = k.reduce((a, v) => a + v, 0);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r];
    tmp[y * w + x] = acc / sum;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r];
    out[y * w + x] = acc / sum;
  }
  return out;
}

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Band index of a probability (0 = below the first edge). */
export function bandOf(p: number): number {
  let i = 0;
  while (i < P_BANDS.length && p >= P_BANDS[i]) i++;
  return i;
}

/**
 * Color of one cell: the band's blue, faded toward a light veil and made more transparent as
 * the uncertainty left grows. Probability and certainty decide it together.
 */
export function cellColor(p: number, u: number): [number, number, number, number] {
  const c = hex(P_COLORS[bandOf(p)]);
  const uu = Math.min(1, Math.max(0, u));
  const veil = uu * 0.5;
  const rgb = c.map((v, i) => Math.round(v * (1 - veil) + VEIL[i] * veil)) as [number, number, number];
  const alpha = Math.min(0.92, 0.16 + 0.5 * (1 - uu) + 0.32 * (bandOf(p) / P_BANDS.length));
  return [rgb[0], rgb[1], rgb[2], Math.round(alpha * 255)];
}

/** Marching squares: line segments where `field` crosses `level` (grid coordinates). */
function isoSegments(field: Float32Array, w: number, h: number, level: number): number[] {
  const seg: number[] = [];
  const lerp = (a: number, b: number) => (level - a) / (b - a || 1e-9);
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const a = field[y * w + x], b = field[y * w + x + 1], c = field[(y + 1) * w + x + 1], d = field[(y + 1) * w + x];
    const code = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const top = [x + lerp(a, b), y], right = [x + 1, y + lerp(b, c)], bottom = [x + lerp(d, c), y + 1], left = [x, y + lerp(a, d)];
    const add = (p: number[], q: number[]) => seg.push(p[0], p[1], q[0], q[1]);
    switch (code) {
      case 1: case 14: add(left, bottom); break;
      case 2: case 13: add(bottom, right); break;
      case 3: case 12: add(left, right); break;
      case 4: case 11: add(top, right); break;
      case 6: case 9: add(top, bottom); break;
      case 7: case 8: add(left, top); break;
      case 5: add(left, top); add(bottom, right); break;
      case 10: add(top, right); add(left, bottom); break;
    }
  }
  return seg;
}

/**
 * Draws the ice map for SiteScene and the 3D drape inside a circle around `center`, feathered at
 * the edge. "likely": the whole area in probability bands colored by probability and certainty,
 * thin isolines at the band edges and the real peak of each likelier zone labeled.
 * "change": probability minus the prior. Browser only.
 */
export function renderIceView(map: IceMap, mode: IceViewMode, center: readonly [number, number], radiusM: number): IceViewImage | undefined {
  if (typeof document === "undefined") return undefined;
  const b = map.bounds_xy_m;
  const w = map.width, h = map.height;
  const W = w * PX_PER_CELL, H = h * PX_PER_CELL;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d");
  if (!ctx || !sctx) return undefined;
  const scale = PX_PER_CELL / map.cell_size_m;
  const px = (x: number) => (x - b.xmin) * scale;
  const py = (y: number) => (b.ymax - y) * scale;
  const image = sctx.createImageData(w, h);

  if (mode === "likely") {
    const rawP = decodeLayer(map.layers.probability, w * h);
    const rawU = decodeLayer(map.layers.uncertainty, w * h);
    const p0 = rawP.map((v) => (Number.isNaN(v) ? map.prior_probability : v));
    const u0 = rawU.map((v) => (Number.isNaN(v) ? 1 : v));
    // Smooth for the outward fade, then rescale so each zone's core keeps the model's real value:
    // the peak above (and the dip below) the prior, and the best certainty, survive the blur.
    const prior = map.prior_probability;
    const ps = gaussian(p0, w, h, SMOOTH_CELLS);
    const us = gaussian(u0, w, h, SMOOTH_CELLS);
    let rawUp = 0, rawDown = 0, smUp = 0, smDown = 0, rawC = 0, smC = 0;
    for (let i = 0; i < w * h; i++) {
      rawUp = Math.max(rawUp, p0[i] - prior); rawDown = Math.max(rawDown, prior - p0[i]);
      smUp = Math.max(smUp, ps[i] - prior); smDown = Math.max(smDown, prior - ps[i]);
      rawC = Math.max(rawC, 1 - u0[i]); smC = Math.max(smC, 1 - us[i]);
    }
    const kUp = smUp > 1e-6 ? rawUp / smUp : 1, kDown = smDown > 1e-6 ? rawDown / smDown : 1, kC = smC > 1e-6 ? rawC / smC : 1;
    const p = ps.map((v) => (v >= prior ? prior + (v - prior) * kUp : prior - (prior - v) * kDown));
    const u = us.map((v) => 1 - Math.min(1, (1 - v) * kC));
    for (let i = 0; i < w * h; i++) image.data.set(cellColor(p[i], u[i]), i * 4);
    sctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, W, H);
    // Isolines at the band edges, thicker for the likelier bands.
    ctx.lineCap = "round";
    P_BANDS.forEach((level, k) => {
      const seg = isoSegments(p, w, h, level);
      if (!seg.length) return;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) {
        ctx.moveTo((seg[i] + 0.5) * PX_PER_CELL, (seg[i + 1] + 0.5) * PX_PER_CELL);
        ctx.lineTo((seg[i + 2] + 0.5) * PX_PER_CELL, (seg[i + 3] + 0.5) * PX_PER_CELL);
      }
      ctx.strokeStyle = `rgb(255 255 255 / ${level > map.prior_probability ? 0.75 : 0.45})`;
      ctx.lineWidth = 0.6 + 0.18 * k;
      ctx.stroke();
    });
    // The real peak of each likelier zone, read from the unsmoothed model.
    ctx.font = "600 13px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const z of hotspots(blocks(map))) {
      const label = `${Math.round(z.pMax * 100)}%`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgb(10 20 35 / 0.7)";
      ctx.strokeText(label, px(z.x), py(z.y) + 4);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, px(z.x), py(z.y) + 4);
    }
  } else {
    image.data.set(renderPixels(map, "change"));
    sctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(small, 0, 0, W, H);
  }

  // Keep only the circle around the habitat, with a soft edge: no square cut-out.
  ctx.globalCompositeOperation = "destination-in";
  const g = ctx.createRadialGradient(px(center[0]), py(center[1]), radiusM * scale * 0.88, px(center[0]), py(center[1]), radiusM * scale);
  g.addColorStop(0, "rgb(0 0 0 / 1)");
  g.addColorStop(1, "rgb(0 0 0 / 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  return { url: canvas.toDataURL("image/png"), bounds: b };
}
