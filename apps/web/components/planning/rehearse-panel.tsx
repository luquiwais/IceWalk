import { Button } from "@icewalk/ui/button";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { habitatOf } from "@/components/site/site-data";
import { bearing, measuringTool, orderedStations, toolName, type Plan } from "@/lib/plan";
import { NextStep } from "./phases";

export type Jump = { x: number; y: number; headingDeg: number; key: number };

/** Phase 3, pre-EVA brief: the map book on the real terrain (stand at any station) and the cuff checklist. */
export function RehearsePanel({ plan, onJump, onNext }: { plan: Plan; onJump: (jump: Jump) => void; onNext: () => void }) {
  const stations = orderedStations(plan);
  const habitat = habitatOf(plan);
  const jumpTo = (x: number, y: number, toward: readonly number[]) => {
    const dir = bearing([x, y], toward);
    onJump({ x, y, headingDeg: dir.distanceM > 1 ? dir.deg : 0, key: Date.now() });
  };
  return (
    <section aria-label="Rehearsal" className="mission-stack">
      <Body>Fly over the site, or stand at each station to see the ground the crew will work: the HiRISE terrain model, the planned route and the measured boulders.</Body>
      <Footnote tone="secondary">Drag to look around. Walking is for the EVA itself, in the EV helmet view.</Footnote>
      <section aria-label="Jump to" className="mission-stack">
        <Title3 as="h3">Jump to</Title3>
        <div className="mission-jumps">
          <Button size="small" variant="platter" onClick={() => jumpTo(habitat[0], habitat[1], stations[0]?.position ?? habitat)}>Habitat</Button>
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
