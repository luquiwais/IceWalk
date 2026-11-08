import { ReferenceScene } from "@/components/design/reference-scene";

// First reproduce the requested Figma example; populate the planning data after
// its materials and geometry have been reviewed. PlanningView remains available
// in components/planning for that next step.
export default function Home() {
  return <div className="flex min-h-dvh items-center justify-center overflow-hidden"><ReferenceScene /></div>;
}
