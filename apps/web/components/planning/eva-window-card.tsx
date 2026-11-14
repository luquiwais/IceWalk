"use client";

import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote } from "@icewalk/ui/text";
import { useEffect, useState } from "react";
import { getEvaWindow } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { PlanSource } from "@/lib/use-plan-session";
import mockWindow from "@/mock/eva-window.json";
import { RowLabel, Value } from "./parts";

type Level = "none" | "advisory" | "caution" | "warning";
type StationConditions = { station_id: string; arrival_ltst: string; sun_elevation_deg: number; temperature_k: number; wind_p95_mps: number; level: Level; reasons: string[] };
type EvaWindow = {
  mode?: string;
  recommended?: { sol: number; start_ltst: string; end_ltst: string; level: Level; go: boolean; reasons: string[] } | null;
  dust?: { tau: number; reported: boolean };
  space_weather?: { source: string; status: string; events: { kind: string; time_utc: string }[] };
  stations?: StationConditions[];
  climate_source?: string;
  notes?: string;
};

const LEVEL_LABEL: Record<Level, string> = { none: "Nominal", advisory: "Advisory", caution: "Caution", warning: "Warning" };

/** Best EVA start in the next sols and conditions at each station (GET /eva-window). */
export function EvaWindowCard({ planId, source }: { planId: string; source: PlanSource }) {
  const [data, setData] = useState<EvaWindow>(mockWindow as unknown as EvaWindow);
  useEffect(() => {
    if (source !== "api") return;
    const controller = new AbortController();
    getEvaWindow(planId, { signal: controller.signal })
      .then((w) => setData(w as unknown as EvaWindow))
      .catch(() => undefined); // keep the bundled demo window
    return () => controller.abort();
  }, [planId, source]);

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
          <RowLabel title="Dust opacity" detail={data.dust?.reported ? "Reported by the crew" : "Not reported · assumed"} />
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
