import { HABITAT_XY } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { orderedStations, type Measurement, type Plan } from "@/lib/plan";
import type { PathPoint } from "@/lib/site3d";
import type { FreePose } from "./site-3d";

const SIZE = 200;
const PAD = 14;

/** How far along the route the crew is: the nearest route point to the current pose. */
export function routeProgress(path: readonly PathPoint[], pose: { x: number; y: number }): number {
  if (path.length < 2) return 0;
  let best = 0, bestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = (path[i].x - pose.x) ** 2 + (path[i].y - pose.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return path[best].s / path[path.length - 1].s;
}

/**
 * Track map of the EVA, north up, like a race-broadcast inset: the planned route, the stations
 * (measured, next, remaining), the habitat and the EV with its heading; progress below.
 */
export function EvaMinimap({ plan, path, measurements, pose, nextId, elapsedMin, marginMin }: {
  plan: Plan; path: readonly PathPoint[]; measurements: readonly Measurement[]; pose: FreePose; nextId?: string; elapsedMin: number; marginMin?: number;
}) {
  const stations = orderedStations(plan);
  const xs = [...path.map((p) => p.x), HABITAT_XY[0], pose.x];
  const ys = [...path.map((p) => p.y), HABITAT_XY[1], pose.y];
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 50);
  const k = (SIZE - 2 * PAD) / span;
  const ox = (SIZE - (maxX - minX) * k) / 2, oy = (SIZE - (maxY - minY) * k) / 2;
  const sx = (x: number) => ox + (x - minX) * k;
  const sy = (y: number) => SIZE - (oy + (y - minY) * k);
  const measured = new Set(measurements.map((m) => m.station_id));
  const done = stations.filter((s) => measured.has(s.id)).length;
  const progress = routeProgress(path, pose);
  const line = path.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const walked = path.filter((p) => p.s <= progress * (path.at(-1)?.s ?? 0)).map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const fmt = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  return (
    <section className="eva-minimap" aria-label="EVA progress">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Track map: ${done} of ${stations.length} stations measured, ${Math.round(progress * 100)}% of the route`}>
        <polyline points={line} className="eva-minimap-route" />
        {walked ? <polyline points={walked} className="eva-minimap-walked" /> : null}
        <rect x={sx(HABITAT_XY[0]) - 5} y={sy(HABITAT_XY[1]) - 5} width={10} height={10} className="eva-minimap-hab" />
        {stations.map((s) => {
          const state = measured.has(s.id) ? "done" : s.id === nextId ? "next" : "todo";
          return <g key={s.id} data-state={state}>
            <circle cx={sx(s.position[0])} cy={sy(s.position[1])} r={state === "next" ? 6 : 4.5} className="eva-minimap-station" />
            <text x={sx(s.position[0]) + 8} y={sy(s.position[1]) + 3} className="eva-minimap-label">{s.order}</text>
          </g>;
        })}
        <g transform={`translate(${sx(pose.x)} ${sy(pose.y)}) rotate(${pose.headingDeg})`}>
          <path d="M0 -8 L6 6 L0 3 L-6 6 Z" className="eva-minimap-ev" />
        </g>
        <text x={SIZE - 8} y={14} textAnchor="end" className="eva-minimap-label">N ↑</text>
      </svg>
      <div className="eva-progress">
        <div className="eva-progress-bar" aria-hidden><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <dl>
          <div><dt>Stations</dt><dd>{done} / {stations.length}</dd></div>
          <div><dt>Route</dt><dd>{Math.round(progress * 100)}%</dd></div>
          <div><dt>PET</dt><dd>{fmt(elapsedMin)}</dd></div>
          {marginMin != null ? <div><dt>Margin</dt><dd>{formatNumber(marginMin, 0)} min</dd></div> : null}
        </dl>
      </div>
    </section>
  );
}
