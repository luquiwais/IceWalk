"use client";

import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote } from "@icewalk/ui/text";
import { formatNumber } from "@/lib/format";
import type { PlanSource } from "@/lib/use-plan-session";
import { useEvaWindow, type EvaWindow, type WindowLevel } from "@/lib/use-eva-window";
import { RowLabel, Value } from "./parts";

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
    <section aria-label="EVA window and weather" className="mission-stack">
      <Body>
        {rec ? <>Recommended: sol {rec.sol}, {rec.start_ltst}–{rec.end_ltst} local solar time · <span className="mission-verdict" data-verdict={rec.go ? "GO" : "NO_GO"}>{rec.go ? "GO" : "Hold"}</span></> : "No safe window in the next sols."}
      </Body>
      <ListSection footer={data.climate_source ? `Climate: ${data.climate_source.split(",")[0]} (analogue at 48°N).` : undefined}>
        <ListRow trailing={<Value>{sw ? `${sw.events.length} events` : "—"}</Value>}>
          <RowLabel title="Space weather · NASA DONKI" detail={sw ? `${sw.events.map((e) => e.kind.toUpperCase()).join(", ") || "Quiet"}${data.mode === "demo" ? " · demo period Aug 2023" : " · live"}` : "Unavailable"} />
        </ListRow>
        <ListRow trailing={<Value>τ {data.dust ? formatNumber(data.dust.tau, 1) : "—"}</Value>}>
          <RowLabel title="Dust opacity" detail={dustDetail(data.dust)} />
        </ListRow>
        {(data.stations ?? []).slice(0, 6).map((s) => (
          <ListRow key={s.station_id} trailing={<Value>{LEVEL_LABEL[s.level]}</Value>}>
            <RowLabel title={`${s.station_id} · ${s.arrival_ltst}`} detail={`Sun ${formatNumber(s.sun_elevation_deg, 0)}° · ${formatNumber(s.temperature_k - 273.15, 0)} °C · wind p95 ${formatNumber(s.wind_p95_mps, 0)} m/s`} />
          </ListRow>
        ))}
      </ListSection>
      {data.notes ? <Footnote tone="secondary">{data.notes}</Footnote> : null}
    </section>
  );
}
