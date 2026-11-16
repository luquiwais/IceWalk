"use client";

import { useSearchParams } from "next/navigation";
import type { Phase } from "./phases";
import { PlanningView } from "./planning-view";
import type { EvaRole } from "./role-select";

/** URL names of the phases and EVA roles, so each role can open in a window of its own. */
const PHASE_PARAM: Record<string, Phase> = { site: "site", plan: "plan", brief: "rehearse", eva: "execute", debrief: "debrief" };
const ROLE_PARAM: Record<string, EvaRole> = { ev1: "ev", iv: "iv" };

/** `/?phase=eva&role=iv` opens the EVA in that seat; unknown values are ignored. */
export function RoutedPlanningView() {
  const params = useSearchParams();
  const phaseKey = params.get("phase")?.toLowerCase() ?? "";
  const roleKey = params.get("role")?.toLowerCase() ?? "";
  const phase = Object.hasOwn(PHASE_PARAM, phaseKey) ? PHASE_PARAM[phaseKey] : undefined;
  const role = Object.hasOwn(ROLE_PARAM, roleKey) ? ROLE_PARAM[roleKey] : undefined;
  return <PlanningView initialPhase={phase ?? (role ? "execute" : undefined)} initialEvaView={role} initialLink={params.get("link")} />;
}
