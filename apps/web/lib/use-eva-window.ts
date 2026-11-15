"use client";

import { useEffect, useState } from "react";
import { getEvaWindow } from "@/lib/api";
import type { PlanSource } from "@/lib/use-plan-session";
import mockWindow from "@/mock/eva-window.json";

export type WindowLevel = "none" | "advisory" | "caution" | "warning";
export type StationConditions = { station_id: string; arrival_ltst: string; sun_elevation_deg: number; temperature_k: number; wind_p95_mps: number; level: WindowLevel; reasons: string[] };
export type EvaWindow = {
  mode?: string;
  recommended?: { sol: number; start_ltst: string; end_ltst: string; level: WindowLevel; go: boolean; reasons: string[] } | null;
  dust?: { tau: number; reported: boolean; source?: "crew" | "hope_emirs" | "default"; ls_deg?: number; note?: string };
  space_weather?: { source: string; status: string; events: { kind: string; time_utc: string }[] };
  stations?: StationConditions[];
  climate_source?: string;
  notes?: string;
};

/** Best EVA start and per-station conditions (GET /eva-window); the bundled demo window when offline. */
export function useEvaWindow(planId: string, source: PlanSource): EvaWindow {
  const [data, setData] = useState<EvaWindow>(mockWindow as unknown as EvaWindow);
  useEffect(() => {
    if (source !== "api") return;
    const controller = new AbortController();
    getEvaWindow(planId, { signal: controller.signal })
      .then((w) => setData(w as unknown as EvaWindow))
      .catch(() => undefined); // keep the bundled demo window
    return () => controller.abort();
  }, [planId, source]);
  return data;
}
