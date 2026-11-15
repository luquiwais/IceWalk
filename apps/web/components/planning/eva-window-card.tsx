"use client";

import { Footnote } from "@icewalk/ui/text";
import { formatNumber } from "@/lib/format";
import type { PlanSource } from "@/lib/use-plan-session";
import { useEvaWindow, type EvaWindow, type WindowLevel } from "@/lib/use-eva-window";

type Level = WindowLevel;

function dustDetail(dust: EvaWindow["dust"]): string {
  if (!dust) return "Unavailable";
  if (dust.reported) return "Reported by the crew";
  if (dust.source === "hope_emirs") {
    const where = `Hope EMIRS (UAE) · site region${dust.ls_deg !== undefined ? `, Ls ${formatNumber(dust.ls_deg, 0)}°` : ""}`;
    return dust.note ? `${where} · interpolated across a data gap` : where;
  }
  return "Not reported · assumed";
}

const LEVEL_LABEL: Record<Level, string> = { none: "Nominal", advisory: "Advisory", caution: "Caution", warning: "Warning" };

/** Best EVA start in the next sols and conditions at each station (GET /eva-window). */
export function EvaWindowCard({ planId, source }: { planId: string; source: PlanSource }) {
  const data = useEvaWindow(planId, source);
  const rec = data.recommended;
  const sw = data.space_weather;
  return (
    <section aria-label="EVA window and weather" className="mission-detail">
      <p className="mission-detail-lead"><strong>NASA DONKI:</strong> {sw ? (sw.events.map((e) => e.kind === "sep" ? "SEP" : e.kind.replace(/_/g, " ").replace(/^cme/i, "CME")).join(", ") || "quiet") : "unavailable"}{sw && data.mode === "demo" ? " (demo period)" : ""} · <strong>Dust</strong> τ {data.dust ? formatNumber(data.dust.tau, 1) : "—"}, <span title={dustDetail(data.dust)}>{data.dust?.source === "hope_emirs" ? "Hope EMIRS (UAE)" : data.dust?.reported ? "crew report" : "assumed"}</span></p>
      <table className="mission-table">
        <thead><tr><th>Station</th><th>LTST</th><th>Sun</th><th>Temp.</th><th>Wind p95</th><th>Level</th></tr></thead>
        <tbody>{(data.stations ?? []).slice(0, 8).map((st) => (
          <tr key={st.station_id} data-level={st.level}><td>{st.station_id}</td><td>{st.arrival_ltst}</td><td>{formatNumber(st.sun_elevation_deg, 0)}°</td><td>{formatNumber(st.temperature_k - 273.15, 0)} °C</td><td>{formatNumber(st.wind_p95_mps, 0)} m/s</td><td>{LEVEL_LABEL[st.level]}</td></tr>
        ))}</tbody>
      </table>
      <Footnote tone="secondary">Stations at planned arrival{rec ? ` on sol ${rec.sol}` : ""}. Viking 2 climate (48°N analogue); thresholds are assumptions.</Footnote>
    </section>
  );
}
