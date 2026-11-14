import { Button } from "@icewalk/ui/button";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { HABITAT_XY } from "@/components/site/site-data";
import { bearing, measuringTool, orderedStations, toolName, type Plan } from "@/lib/plan";
import { NextStep } from "./phases";

export type Jump = { x: number; y: number; headingDeg: number; key: number };

/** Phase 3: rehearse on the real terrain. Jump to any station, print the cuff checklist. */
export function RehearsePanel({ plan, onJump, onNext }: { plan: Plan; onJump: (jump: Jump) => void; onNext: () => void }) {
  const stations = orderedStations(plan);
  const jumpTo = (x: number, y: number, toward: readonly number[]) => {
    const dir = bearing([x, y], toward);
    onJump({ x, y, headingDeg: dir.distanceM > 1 ? dir.deg : 0, key: Date.now() });
  };
  return (
    <section aria-label="Rehearsal" className="mission-stack">
      <Body>Walk the site at eye height on the HiRISE terrain model, with the planned route, the stations and the measured boulders.</Body>
      <Footnote tone="secondary">Drag to look around · W A S D or arrows to walk · Shift to move faster</Footnote>
      <section aria-label="Jump to" className="mission-stack">
        <Title3 as="h3">Jump to</Title3>
        <div className="mission-jumps">
          <Button size="small" variant="platter" onClick={() => jumpTo(HABITAT_XY[0], HABITAT_XY[1], stations[0]?.position ?? HABITAT_XY)}>Habitat</Button>
          {stations.map((s) => (
            <Button key={s.id} size="small" variant="platter" aria-label={`Station ${s.order}, ${s.id}, ${toolName(measuringTool(s))}`}
              onClick={() => jumpTo(s.position[0] - 15, s.position[1] - 15, s.position)}>
              {s.order} · {s.id}
            </Button>
          ))}
        </div>
      </section>
      <a className="mission-cuff-link" href={`/cuff?plan=${encodeURIComponent(plan.plan_id)}`} target="_blank" rel="noopener">Print the EVA cuff checklist</a>
      <NextStep label="Go for EVA" onClick={onNext} note="Execution is simulated: you log each result and the planner replans." />
    </section>
  );
}
