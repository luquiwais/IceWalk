import { Suspense } from "react";
import { RoutedPlanningView } from "@/components/planning/routed-planning-view";

// The planner. The landing page is `/`; old links to `/?phase=…` are sent here (legacy-redirect.tsx).
// The page stays static; the phase and EVA role in the URL are read on the client.
export default function PlannerPage() {
  return <Suspense fallback={null}><RoutedPlanningView /></Suspense>;
}
