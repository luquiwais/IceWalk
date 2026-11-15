import { habitatOf } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { orderedStations, type Measurement, type Plan } from "@/lib/plan";
import type { PathPoint } from "@/lib/site3d";
import type { FreePose } from "./site-3d";

const SIZE = 200;
const PAD = 16;

/** Index of the route point nearest to (x, y), among points with `from <= s <= to`. */
function nearestIndex(path: readonly PathPoint[], x: number, y: number, from = 0, to = Infinity): number {
  let best = -1, bestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    if (path[i].s < from || path[i].s > to) continue;
    const d = (path[i].x - x) ** 2 + (path[i].y - y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/**
 * How far along the route the crew is. The route starts and ends at the habitat, so the nearest
 * point alone can land on the walk back: the search is bounded to the leg between the last
 * measured station and the next one (or to the walk back once there is no next station).
 */
export function routeProgress(path: readonly PathPoint[], pose: { x: number; y: number }, leg?: { from?: readonly number[]; to?: readonly number[] }): number {
  if (path.length < 2) return 0;
  const total = path[path.length - 1].s;
  const fromI = leg?.from ? nearestIndex(path, leg.from[0], leg.from[1]) : 0;
  const fromS = fromI >= 0 ? path[fromI].s : 0;
  const toI = leg?.to ? nearestIndex(path, leg.to[0], leg.to[1], fromS) : -1;
  const toS = toI >= 0 ? path[toI].s : total;
  const at = nearestIndex(path, pose.x, pose.y, fromS, toS);
  return at >= 0 ? path[at].s / total : fromS / total;
}

/**
 * Map frame of the track map. Every point is first turned about the EV (heading up: what is ahead
 * is up) or left as is (north up), and only then fitted to the frame, so the whole route, the
 * habitat and the EV always fit, whatever the heading.
 */
export function minimapFrame(points: readonly (readonly [number, number])[], pose: FreePose, orientation: "heading" | "north") {
  const t = orientation === "heading" ? (pose.headingDeg * Math.PI) / 180 : 0;
  const cos = Math.cos(t), sin = Math.sin(t);
  // Counterclockwise by the heading: the heading vector (sin, cos) lands on (0, 1), up.
  const turn = (x: number, y: number): [number, number] => {
    const dx = x - pose.x, dy = y - pose.y;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  };
  const turned = points.map(([x, y]) => turn(x, y));
  const xs = turned.map((p) => p[0]), ys = turned.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = (SIZE - 2 * PAD) / Math.max(maxX - minX, maxY - minY, 50);
  const ox = (SIZE - (maxX - minX) * k) / 2, oy = (SIZE - (maxY - minY) * k) / 2;
  return (x: number, y: number): [number, number] => {
    const [rx, ry] = turn(x, y);
    return [ox + (rx - minX) * k, SIZE - (oy + (ry - minY) * k)];
  };
}

type Props = {
  plan: Plan;
  path: readonly PathPoint[];
  measurements: readonly Measurement[];
  pose: FreePose;
  nextId?: string;
  elapsedMin: number;
  marginMin?: number;
  /** The EV sees it heading up; the IV north up, like its big map. */
  orientation?: "heading" | "north";
  /** The route before the last replan, dashed. */
  previousPath?: readonly PathPoint[];
  /** EVA TERMINATE: the fastest route back, in caution amber. */
  walkback?: readonly PathPoint[];
  /** "overlay": the helmet inset. "panel": map and numbers side by side, for the IV window. */
  layout?: "overlay" | "panel";
};

/**
 * Track map of the EVA, like a race-broadcast inset: the whole planned route, the stations
 * (measured, next, remaining), the habitat and the EV with its heading; progress beside it.
 */
export function EvaMinimap({ plan, path, measurements, pose, nextId, elapsedMin, marginMin, orientation = "heading", previousPath, walkback, layout = "overlay" }: Props) {
  const stations = orderedStations(plan);
  const hab = habitatOf(plan);
  const pts: [number, number][] = [...path.map((p) => [p.x, p.y] as [number, number]), ...(walkback ?? []).map((p) => [p.x, p.y] as [number, number]), [hab[0], hab[1]], [pose.x, pose.y]];
  const at = minimapFrame(pts, pose, orientation);
  const measured = new Set(measurements.map((m) => m.station_id));
  // A replan drops the stations already measured from the plan: count them from the log.
  const done = measured.size;
  const total = stations.filter((s) => !measured.has(s.id)).length + done;
  const lastDone = [...measurements].reverse().find((m) => stations.some((s) => s.id === m.station_id));
  const nextStop = stations.find((s) => s.id === nextId);
  const progress = routeProgress(path, pose, { from: lastDone?.position, to: nextStop?.position });
  const poly = (list: readonly PathPoint[]) => list.map((p) => at(p.x, p.y).map((v) => v.toFixed(1)).join(",")).join(" ");
  const walked = path.filter((p) => p.s <= progress * (path.at(-1)?.s ?? 0));
  const [hx, hy] = at(hab[0], hab[1]);
  const [ex, ey] = at(pose.x, pose.y);
  const heading = orientation === "heading" ? 0 : pose.headingDeg;
  const north = orientation === "heading" ? -pose.headingDeg : 0;
  const fmt = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  return (
    <section className="eva-minimap" data-layout={layout} aria-label="EVA progress">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Track map, ${orientation === "heading" ? "heading" : "north"} up: ${done} of ${total} stations measured, ${Math.round(progress * 100)}% of the route`}>
        {previousPath?.length ? <polyline points={poly(previousPath)} className="eva-minimap-previous" /> : null}
        <polyline points={poly(path)} className="eva-minimap-route" data-faded={walkback?.length ? true : undefined} />
        {walked.length > 1 ? <polyline points={poly(walked)} className="eva-minimap-walked" /> : null}
        {walkback?.length ? <polyline points={poly(walkback)} className="eva-minimap-walkback" /> : null}
        <rect x={hx - 5} y={hy - 5} width={10} height={10} className="eva-minimap-hab" />
        {stations.map((s) => {
          const state = measured.has(s.id) ? "done" : s.id === nextId ? "next" : "todo";
          const [cx, cy] = at(s.position[0], s.position[1]);
          return <g key={s.id} data-state={state}>
            <circle cx={cx} cy={cy} r={state === "next" ? 6.5 : 5} className="eva-minimap-station" />
            <text x={cx + 9} y={cy + 3.5} className="eva-minimap-label">{s.order}</text>
          </g>;
        })}
        <g transform={`translate(${ex} ${ey}) rotate(${heading})`}>
          <path d="M0 -8 L6 6 L0 3 L-6 6 Z" className="eva-minimap-ev" />
        </g>
        <g transform={`translate(${SIZE - 14} 14) rotate(${north})`}>
          <path d="M0 -8 L3 0 L-3 0 Z" className="eva-minimap-north" /><text y={11} textAnchor="middle" className="eva-minimap-label">N</text>
        </g>
      </svg>
      <div className="eva-progress">
        <div className="eva-progress-bar" aria-hidden><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <dl>
          <div><dt>Stations</dt><dd>{done} / {total}</dd></div>
          <div><dt>Route</dt><dd>{Math.round(progress * 100)}%</dd></div>
          <div><dt>PET</dt><dd>{fmt(elapsedMin)}</dd></div>
          {marginMin != null ? <div><dt>Margin</dt><dd>{formatNumber(marginMin, 0)} min</dd></div> : null}
        </dl>
      </div>
    </section>
  );
}
