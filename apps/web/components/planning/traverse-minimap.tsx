import { memo } from "react";
import { HABITAT_XY, routeLines } from "@/components/site/site-data";
import { orderedStations, type Measurement, type Plan } from "@/lib/plan";

const SIZE = 132;
const PAD = 16;

/**
 * North-up overview for the EV view, whose main scene is heading-up: route,
 * stations, habitat and the simulated position with its heading. Geometry only,
 * in grid meters, from the same plan as the scene.
 */
export const TraverseMinimap = memo(function TraverseMinimap({ plan, measurements, position, headingDeg }: {
  plan: Plan; measurements: readonly Measurement[]; position: readonly number[]; headingDeg: number | undefined;
}) {
  const lines = routeLines(plan);
  const stations = orderedStations(plan);
  const points = [...lines.flat(), ...stations.map((s) => s.position), HABITAT_XY, position as [number, number]];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const xmin = Math.min(...xs);
  const ymax = Math.max(...ys);
  const k = (SIZE - 2 * PAD) / Math.max(1, Math.max(...xs) - xmin, ymax - Math.min(...ys));
  const ox = (SIZE - (Math.max(...xs) - xmin) * k) / 2;
  const oy = (SIZE - (ymax - Math.min(...ys)) * k) / 2;
  const at = (p: readonly number[]) => [ox + (p[0] - xmin) * k, oy + (ymax - p[1]) * k] as const;
  const measured = new Set(measurements.map((m) => m.station_id));
  const [px, py] = at(position);
  return <figure className="mission-minimap">
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="North-up traverse minimap">
      {lines.map((line, i) => <polyline key={i} className="mission-minimap-route" points={line.map((p) => at(p).join(",")).join(" ")} />)}
      {stations.map((s) => { const [x, y] = at(s.position); return <circle key={s.id} className="mission-minimap-station" data-measured={measured.has(s.id) || undefined} cx={x} cy={y} r={3.5} />; })}
      <g transform={`translate(${px} ${py}) rotate(${headingDeg ?? 0})`}>
        {headingDeg !== undefined ? <path className="mission-minimap-heading" d="M0 -15 5 -5H-5Z" /> : null}
        <circle className="mission-minimap-position" r={4.5} />
      </g>
      <path className="mission-minimap-north" d="M10 18V8M7 11l3-3 3 3" />
      <text className="mission-minimap-label" x={10} y={28} textAnchor="middle">N</text>
    </svg>
    <figcaption>North up · simulated position</figcaption>
  </figure>;
});
