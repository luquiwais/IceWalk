import { legendFor, type IceMap, type IceMapMode } from "@/lib/ice-map";

/** Color scale of the ice map, from the planner's own palette. */
export function IceLegend({ map, mode }: { map: IceMap; mode: IceMapMode }) {
  const { label, stops } = legendFor(map, mode);
  const lo = stops[0].value;
  const hi = stops[stops.length - 1].value;
  const gradient = `linear-gradient(to right, ${stops.map((s) => `${s.color} ${((s.value - lo) / (hi - lo || 1)) * 100}%`).join(", ")})`;
  const end = (v: number) => (mode === "change" ? `${v > 0 ? "+" : ""}${Math.round(v * 100)}` : `${Math.round(v * 100)}%`);
  return (
    <span className="mission-ice-legend">
      <span>{label}</span>
      <span className="mission-ice-scale" aria-hidden>
        <span>{end(lo)}</span>
        <i style={{ background: gradient }} />
        <span>{end(hi)}</span>
      </span>
      {mode === "potential" ? <span>Grey: not enough data nearby</span> : null}
    </span>
  );
}
