import type { IceMap } from "@/lib/ice-map";
import { HABITAT_XY } from "@/components/site/site-data";
import { blocks, ICE_RADIUS_M, ICE_VIEW_MODES, knownFraction, type IceViewMode } from "@/lib/ice-view";
import { IceLegend } from "./ice-legend";
import { useMemo } from "react";

/** Legend of the ice map: what each mark means in the current mode, and how much is known. */
export function IceViewLegend({ map, mode }: { map: IceMap; mode: IceViewMode }) {
  const known = useMemo(() => knownFraction(blocks(map).filter((b) => Math.hypot(b.x - HABITAT_XY[0], b.y - HABITAT_XY[1]) <= ICE_RADIUS_M)), [map]);
  const info = ICE_VIEW_MODES.find((m) => m.value === mode)!;
  if (mode === "change") return <span className="mission-ice-legend"><IceLegend map={map} mode="change" /></span>;
  return (
    <span className="mission-ice-legend" data-mode={mode}>
      <span className="mission-ice-title">{info.label} · within {map.threshold_m} m</span>
      {mode === "likely" ? (
        <span className="mission-ice-keys">
          <span><i className="mission-key-dot" data-filled aria-hidden />Local evidence</span>
          <span><i className="mission-key-dot" aria-hidden />Regional prior only ({Math.round(map.prior_probability * 100)}%)</span>
          <span><i className="mission-key-zone" aria-hidden />Ice likely zone</span>
          <span>Bigger dot = likelier</span>
        </span>
      ) : (
        <span className="mission-ice-keys">
          <span><i className="mission-key-fog" aria-hidden />No local data</span>
          <span><i className="mission-key-clear" aria-hidden />Craters or measurements nearby</span>
        </span>
      )}
      <span className="mission-ice-known">Local evidence covers {Math.round(known * 100)}% of the area shown · 100 m grid</span>
    </span>
  );
}
