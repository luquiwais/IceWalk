import { Suspense } from "react";
import { RoutedPlanningView } from "@/components/planning/routed-planning-view";

// The Figma reference composition lives at /design/reference.
// The page stays static; the phase and EVA role in the URL are read on the client.
export default function Home() {
  return <Suspense fallback={null}><RoutedPlanningView /></Suspense>;
}
