"use client";

/**
 * The ice map that goes with the current plan. With the planner API it asks
 * GET /maps?plan_id= after every plan or replan, so the map changes live with each
 * measurement. Without the API, or if it fails, it loads the bundled snapshot of the
 * real model: map.json for the nominal plan and map-replan.json once the demo
 * measurement is applied (apps/planner/scripts/export_mocks.py --maps-only).
 */
import { useEffect, useState } from "react";

import { getIceMap } from "./api";
import type { IceMap } from "./ice-map";
import type { PlanSource } from "./use-plan-session";

export type IceMapState = { map: IceMap | null; source: PlanSource | null; loading: boolean };

/** plan_id of the bundled replan (apps/web/mock/replan.json). */
const MOCK_REPLAN_ID = "plan-demo0002";

async function loadMock(planId: string): Promise<IceMap> {
  const mod = planId === MOCK_REPLAN_ID ? await import("@/mock/map-replan.json") : await import("@/mock/map.json");
  return (mod.default ?? mod) as unknown as IceMap;
}

type Loaded = { planId: string | null; map: IceMap | null; source: PlanSource | null };

export function useIceMap(planId: string, planSource: PlanSource): IceMapState {
  const [state, setState] = useState<Loaded>({ planId: null, map: null, source: null });

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const fromApi = planSource === "api" ? getIceMap(planId, { signal: controller.signal }) : Promise.reject(new Error("mock"));
    fromApi
      .then((map) => alive && setState({ planId, map, source: "api" }))
      .catch(async () => {
        if (!alive) return;
        try {
          const map = await loadMock(planId);
          if (alive) setState({ planId, map, source: "mock" });
        } catch {
          if (alive) setState({ planId, map: null, source: null });
        }
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [planId, planSource]);

  // While the map of a new plan loads, keep showing the previous one.
  return { map: state.map, source: state.source, loading: state.planId !== planId };
}
