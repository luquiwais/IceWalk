import { useMemo } from "react";
import { HABITAT_XY } from "@/components/site/site-data";
import type { IceMap } from "@/lib/ice-map";
import { blocks, cellColor, ICE_RADIUS_M, knownFraction, type IceViewMode } from "@/lib/ice-view";
import { IceLegend } from "./ice-legend";

/** Columns of the legend grid: representative probabilities across the bands. */
const P_SAMPLES = [0.62, 0.68, 0.77, 0.9];
/** Rows: firm evidence (top) and regional prior only (bottom). */
const U_SAMPLES = [0.1, 1];

/**
 * Legend of the combined ice map: a small grid where probability runs left to right and
 * certainty top to bottom, drawn with the map's own colors, and one line in words.
 */
export function IceViewLegend({ map, mode, habitat = HABITAT_XY }: { map: IceMap; mode: IceViewMode; habitat?: readonly [number, number] }) {
  const [hx, hy] = habitat;
  const known = useMemo(() => knownFraction(blocks(map).filter((b) => Math.hypot(b.x - hx, b.y - hy) <= ICE_RADIUS_M)), [map, hx, hy]);
  if (mode === "change") return <span className="mission-ice-legend"><IceLegend map={map} mode="change" /></span>;
  return (
    <span className="mission-ice-legend" data-mode={mode}>
      <span className="mission-ice-title">P(ice within {map.threshold_m} m)</span>
      <span className="mission-ice-matrix" role="img" aria-label="Brighter blue means likelier ice; dim and grey means less certain">
        <span className="mission-ice-axis" aria-hidden>Certain</span>
        <span className="mission-ice-grid" aria-hidden>
          {U_SAMPLES.map((u) => P_SAMPLES.map((p) => {
            // Legend swatches drawn opaque, so they read on the glass card (the map draws them translucent).
            const [r, g, b] = cellColor(p, u);
            return <i key={`${u}-${p}`} style={{ background: `rgb(${r} ${g} ${b})` }} />;
          }))}
        </span>
        <span className="mission-ice-axis" aria-hidden>Prior only</span>
        <span className="mission-ice-scale-labels" aria-hidden><span>Less likely</span><span>Likelier</span></span>
      </span>
      <span className="mission-ice-known" title={`Local evidence near craters and measurements covers ${Math.round(known * 100)}% of the area. Labels give each zone's real peak; halos are drawn wider than the model's reach.`}>Background {Math.round(map.prior_probability * 100)}% = regional prior · numbers = real peaks</span>
    </span>
  );
}
