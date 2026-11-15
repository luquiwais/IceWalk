import { Button } from "@icewalk/ui/button";
import { Body, Footnote } from "@icewalk/ui/text";
import { Printer } from "lucide-react";
import { useState } from "react";
import { habitatOf } from "@/components/site/site-data";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { bearing, decisionPointFor, measuringTool, orderedStations, stationBlock, toolName, toolReachM, type Plan, type Station } from "@/lib/plan";
import { clock } from "./parts";

/** A camera move in the brief: stand at a point looking along a heading, or go back to the fly-over. */
export type Jump = { x: number; y: number; headingDeg: number; key: number; view?: "stand" | "fly" };
/** Where the viewer stands in the brief: a station id, the habitat, or nowhere (fly-over). */
export const AT_HABITAT = "@habitat";

/** Where the viewer stands after a jump: 15 m short of the station on the arriving leg, looking at it. */
const STAND_BACK_M = 15;
/** At the habitat the viewer stands behind it and aside, so the habitat model is in the foreground. */
const HABITAT_BACK_M = 45;
const HABITAT_ASIDE_M = 14;
/** Every jump gets a newer key, so the 3D view knows a jump came after the view the user picked. */
let jumpSeq = 0;
export const nextJumpKey = () => ++jumpSeq;

/**
 * Planner task lines, shortened for the card; the standing duty every station repeats (consumables
 * and walkback) is left to the cuff checklist, which keeps every line whole.
 */
const SHORT: [string, string][] = [
  ["Run Clean sample containers", "Bag samples"],
  ["Run ", ""],
  ["Powered hand core drill", "core drill"],
  ["Handheld camera / spectrometer", "camera / spectrometer"],
  ["Document station (photos, notes)", "Document station"],
];
const EVERY_STATION = "Monitor consumables and walkback margin";
const shortTask = (task: string) => {
  const t = SHORT.reduce((acc, [from, to]) => acc.replace(from, to), task);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

type Props = {
  plan: Plan;
  /** Station id, AT_HABITAT, or null for the fly-over. */
  at: string | null;
  onStand: (at: string, jump: Jump) => void;
  onNext: () => void;
};

/**
 * Phase 3, pre-EVA brief: see the EVA before it starts, from above or from the crew's eyes at each
 * station on the real terrain, with what the crew will find and do there. No walking and no logging:
 * that is the EVA phase. Standing at a point titles the window with it and shows the back arrow, as
 * a station does in Plan.
 */
export function RehearsePanel({ plan, at, onStand, onNext }: Props) {
  const stations = orderedStations(plan);
  const habitat = habitatOf(plan);
  const [confirming, setConfirming] = useState(false);
  const stand = (id: string, x: number, y: number, toward: readonly number[]) => {
    const dir = bearing([x, y], toward);
    onStand(id, { x, y, headingDeg: dir.distanceM > 1 ? dir.deg : 0, key: nextJumpKey(), view: "stand" });
  };
  // Stand as the crew arrives: short of the station on the leg from the previous stop, facing it.
  const standAt = (s: Station) => {
    const i = stations.findIndex((o) => o.id === s.id);
    const from = i > 0 ? stations[i - 1].position : habitat;
    const dx = s.position[0] - from[0], dy = s.position[1] - from[1];
    const d = Math.hypot(dx, dy);
    const [ux, uy] = d > 1 ? [dx / d, dy / d] : [Math.SQRT1_2, Math.SQRT1_2];
    stand(s.id, s.position[0] - ux * STAND_BACK_M, s.position[1] - uy * STAND_BACK_M, s.position);
  };
  // At the habitat: behind it and a little aside, facing the first station, so the habitat is in view.
  const standAtHabitat = () => {
    const first = stations[0]?.position ?? [habitat[0], habitat[1] + 1];
    const dx = first[0] - habitat[0], dy = first[1] - habitat[1];
    const d = Math.hypot(dx, dy) || 1;
    const [ux, uy] = [dx / d, dy / d];
    stand(AT_HABITAT, habitat[0] - ux * HABITAT_BACK_M + uy * HABITAT_ASIDE_M, habitat[1] - uy * HABITAT_BACK_M - ux * HABITAT_ASIDE_M, first);
  };
  const station = stations.find((s) => s.id === at);

  return (
    <section aria-label="Pre-EVA brief" className="mission-stack mission-brief">
      {at ? null : <Body>See the EVA before it starts: fly over the traverse, or stand where the crew will work at each station.</Body>}
      <div className="mission-station-strip" role="group" aria-label="Stand at">
        <span>Stand at</span>
        <div className="mission-station-chips">
          <button type="button" className="mission-chip-hab" aria-pressed={at === AT_HABITAT} aria-label="Habitat"
            onClick={standAtHabitat}>HAB</button>
          {stations.map((s) => (
            <button key={s.id} type="button" aria-pressed={at === s.id} aria-label={`Station ${s.order}, ${s.id}, ${toolName(measuringTool(s))}`} onClick={() => standAt(s)}>{s.order}</button>
          ))}
        </div>
      </div>

      {station ? <StationBrief plan={plan} station={station} />
        : at === AT_HABITAT ? <HabitatBrief plan={plan} first={stations[0]} />
          : <Footnote tone="secondary" className="mission-brief-hint">Pick a point to stand where the crew will work and see what they will find there; the back arrow returns to the fly-over. Drag the view to look around. Execution is simulated: EV1 logs each result and the planner replans.</Footnote>}

      <div className="mission-next">
        <div className="mission-brief-go">
          {confirming ? <>
            <Button variant="platter" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="prominent" onClick={onNext}>Confirm EVA</Button>
          </> : <>
            <a className="mission-cuff" href={`/cuff?plan=${encodeURIComponent(plan.plan_id)}`} target="_blank" rel="noopener" aria-label="Print the EVA cuff checklist" title="Print the EVA cuff checklist"><Printer aria-hidden />Cuff checklist</a>
            <Button variant="prominent" onClick={() => setConfirming(true)}>Go for EVA</Button>
          </>}
        </div>
      </div>
    </section>
  );
}

/** What the crew will find there, in one sentence: the answer the brief exists for. */
function expectation(station: Station, tool: string, reach: number | undefined): string {
  const depth = station.depth_median_m;
  const name = toolName(tool).replace("Powered hand core drill", "core drill");
  if (depth == null) return `ice depth unknown here; the ${name} samples ${reach ? `to ${reach} m` : "the near subsurface"}.`;
  if (reach == null) return `ice at about ${formatNumber(depth, 1)} m (model median).`;
  return depth <= reach
    ? `ice at about ${formatNumber(depth, 1)} m, within the ${reach} m ${name}.`
    : `ice at about ${formatNumber(depth, 1)} m, below the ${reach} m ${name}: "not within ${reach} m" is likely.`;
}

/** What the crew will find and do at the station: the ground truth they are walking to. */
function StationBrief({ plan, station }: { plan: Plan; station: Station }) {
  const order = orderedStations(plan);
  const next = order[order.findIndex((s) => s.id === station.id) + 1];
  const block = stationBlock(plan, station.id);
  const point = decisionPointFor(plan, station.id);
  const tool = measuringTool(station);
  const reach = toolReachM(tool);
  const threshold = plan.summary.ice_threshold_m;
  const nexts = point ? [...new Set(point.options.map((o) => o.next_station_ids[0] ?? ""))] : [];
  const then = point && nexts.length > 1
    ? point.options.map((o) => `${o.if_result === "no_ice" ? "not within reach" : o.if_result.replace("_", " ")} → ${o.next_station_ids[0] ?? "habitat"}`).join(" · ")
    : point ? `${nexts[0] || "the habitat"} for any result` : next ? next.id : "walk back to the habitat";
  const tasks = (["EV1", "EV2"] as const).map((m) => [m, (station.tasks[m] ?? []).filter((t) => t !== EVERY_STATION).map(shortTask)] as const).filter(([, t]) => t.length);
  return (
    <section className="mission-station mission-brief-station" aria-label={`Station ${station.order} brief`}>
      <section className="mission-why" aria-label="What we expect">
        <span><strong>Expect:</strong> {expectation(station, tool, reach)}</span>
      </section>
      <dl className="mission-facts" aria-label="Station numbers">
        <div><dt>Tool</dt><dd>{toolName(tool).replace("Powered hand core drill", "Core drill")}<small>{reach ? `to ${reach} m` : "reach unknown"}</small></dd></div>
        <div><dt>{threshold ? `P(ice ≤ ${threshold} m)` : "P(ice)"}</dt><dd>{formatPercent(station.p_ice)}<small>model</small></dd></div>
        <div><dt>At station</dt><dd>{block ? clock(block.t_start_min) : "—"}<small>{formatDuration(station.duration_min)}</small></dd></div>
        <div><dt>Walkback</dt><dd>{block?.walkback_margin_min != null ? `${formatNumber(block.walkback_margin_min, 0)} min` : "—"}</dd></div>
        <div><dt>Comms</dt><dd>{station.comm_los == null ? "Unknown" : station.comm_los ? "In view" : "Relay EV2"}</dd></div>
        <div><dt>Bingo</dt><dd>{point ? clock(point.decide_by_min) : "—"}</dd></div>
      </dl>
      {tasks.length ? <p className="mission-brief-crew" aria-label="Crew tasks">{tasks.map(([m, t]) => <span key={m}><b>{m}</b>{t.join(" · ")}</span>)}</p> : null}
      <p className="mission-after"><strong>Then:</strong> {then}.</p>
    </section>
  );
}

/** At the habitat: egress, the way to the first station and the whole EVA in a few numbers. */
function HabitatBrief({ plan, first }: { plan: Plan; first?: Station }) {
  const leg = first ? bearing(habitatOf(plan), first.position) : undefined;
  const s = plan.summary;
  return (
    <section className="mission-station mission-brief-station" aria-label="Habitat brief">
      <section className="mission-why" aria-label="What we expect">
        <span><strong>Egress:</strong> {first && leg ? `the first station, ${first.id}, is ${formatNumber(leg.distanceM, 0)} m ${leg.label} of the habitat.` : "no stations in this plan."}</span>
      </section>
      <dl className="mission-facts" aria-label="EVA numbers">
        <div><dt>EVA</dt><dd>{formatDuration(s.duration_min)}</dd></div>
        <div><dt>Traverse</dt><dd>{formatNumber(s.distance_km, 2)} km<small>{orderedStations(plan).length} stations</small></dd></div>
        <div><dt>Walkback</dt><dd>{s.min_walkback_margin_min != null ? `${formatNumber(s.min_walkback_margin_min, 0)} min` : "—"}<small>minimum</small></dd></div>
      </dl>
    </section>
  );
}
