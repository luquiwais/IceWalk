import { Button } from "@icewalk/ui/button";
import { Footnote } from "@icewalk/ui/text";
import { Box, ClipboardCheck, Footprints, Globe, Map as MapIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The mission flow, in the order of the concept of operations and of NASA's Plan, Train, Fly:
 * choose the site, plan the EVA, brief it on the real terrain (pre-EVA review), execute it with
 * replanning, and debrief (docs/research/flujo-ui-nasa-2026-11-14.md). Every phase answers one question and
 * suggests the next step; phases are never locked.
 */
export type Phase = "site" | "plan" | "rehearse" | "execute" | "debrief";

export const PHASES: { value: Phase; label: string; question: string; icon: ReactNode }[] = [
  { value: "site", label: "Site", question: "Is there ice within reach here?", icon: <Globe /> },
  { value: "plan", label: "Plan", question: "Where do we go, and is it safe?", icon: <MapIcon /> },
  { value: "rehearse", label: "Brief", question: "Pre-EVA review: what will we find?", icon: <Box /> },
  { value: "execute", label: "Execute", question: "What do we do now?", icon: <Footprints /> },
  { value: "debrief", label: "Debrief", question: "What did we learn?", icon: <ClipboardCheck /> },
];

export function phaseIndex(phase: Phase) {
  return PHASES.findIndex((p) => p.value === phase);
}

/** The one suggested next step at the bottom of a phase panel. */
export function NextStep({ label, onClick, note, disabled }: { label: string; onClick: () => void; note?: string; disabled?: boolean }) {
  return (
    <div className="mission-next">
      {note ? <Footnote tone="secondary">{note}</Footnote> : null}
      <Button variant="prominent" disabled={disabled} onClick={onClick}>{label}</Button>
    </div>
  );
}
