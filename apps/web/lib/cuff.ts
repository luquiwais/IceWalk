/**
 * EVA cuff checklist: the plan as the crew carries it on the wrist, in PET order. Apollo and
 * Shuttle crews flew a cuff checklist; this is the same idea built from the plan contract, so it
 * changes with every replan. Pure function of the plan (no UI), printed by app/cuff.
 */
import type { Plan, TimelineItem } from "./plan";
import { decisionPointFor, orderedStations, toolName, toolReachM } from "./plan";

export type CuffStep = {
  /** Phase elapsed time at the start, h:mm. */
  pet: string;
  title: string;
  lines: string[];
  /** Decision step: the crew picks a branch here. */
  decision?: boolean;
};

export type CuffChecklist = {
  title: string;
  planId: string;
  facts: [string, string][];
  steps: CuffStep[];
  hardStops: string[];
  notes: string[];
};

/** Minutes as PET h:mm (0:45, 2:05). */
export function pet(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const RESULT: Record<string, string> = { ice: "ICE", no_ice: "NO ICE", inconclusive: "INCONCLUSIVE", any: "ANY RESULT" };

export function cuffChecklist(plan: Plan): CuffChecklist {
  const s = plan.summary;
  const stations = new Map(orderedStations(plan).map((st) => [st.id, st]));
  const steps: CuffStep[] = [];
  const timeline = [...plan.timeline].sort((a, b) => a.t_start_min - b.t_start_min);

  for (const item of timeline) {
    if (item.kind === "reserve") continue;
    const st = item.station_id ? stations.get(item.station_id) : undefined;
    if (item.kind === "traverse") {
      const minutes = Math.round(item.t_end_min - item.t_start_min);
      steps.push({ pet: pet(item.t_start_min), title: st ? `TRAVERSE TO ${st.id}` : "RETURN TO HABITAT", lines: [`${minutes} min walk`] });
      continue;
    }
    if (item.kind === "station" && st) {
      const lines = st.tools.map((t) => {
        const reach = toolReachM(t);
        return `${toolName(t)}${reach ? ` to ${reach} m` : ""}`;
      });
      if (st.tasks.EV1?.length) lines.push(`EV1: ${st.tasks.EV1.map(taskText).join("; ")}`);
      if (st.tasks.EV2?.length) lines.push(`EV2: ${st.tasks.EV2.map(taskText).join("; ")}`);
      lines.push(`P(ice) ${Math.round(st.p_ice * 100)}% · margin ${marginOf(item)}`);
      if (st.comm_los === false) lines.push("NO LOS to habitat: EV partner relays");
      steps.push({ pet: pet(item.t_start_min), title: `STATION ${st.id}`, lines });

      const dp = decisionPointFor(plan, st.id);
      if (dp) {
        const options = [...dp.options].sort((a, b) => a.rank - b.rank);
        const goTo = (ids: readonly string[]) => (ids.length ? `go to ${ids[0]}` : "walk back to the habitat");
        // Every branch to the same next station: one line, and say that the result does not change it.
        const same = options.length > 1 && options.every((o) => (o.next_station_ids[0] ?? "") === (options[0].next_station_ids[0] ?? ""));
        const branches = same
          ? [`IF ANY RESULT: ${goTo(options[0].next_station_ids)} (nominal)`, "The result does not change the next station"]
          : options.map((o) => `IF ${RESULT[o.if_result] ?? o.if_result}: ${goTo(o.next_station_ids)}${o.rank === dp.default_option ? " (nominal)" : ""}`);
        steps.push({ pet: pet(item.t_end_min), title: `DECISION AT ${st.id}`, lines: [...branches, `Bingo: leave ${st.id} by ${pet(dp.decide_by_min)} at the latest`], decision: true });
      }
      continue;
    }
    steps.push({ pet: pet(item.t_start_min), title: item.label.toUpperCase(), lines: [`${Math.round(item.t_end_min - item.t_start_min)} min`] });
  }

  const facts: [string, string][] = [
    ["EVA", pet(s.duration_min)],
    ["Distance", `${s.distance_km.toFixed(2)} km`],
    ["Crew", `${s.crew ?? 2} EV`],
  ];
  if (s.min_walkback_margin_min != null) facts.push(["Min walkback margin", `${Math.round(s.min_walkback_margin_min)} min`]);
  if (s.walkback_caution_min != null) facts.push(["Margin caution", `${s.walkback_caution_min} min`]);
  if (s.feasibility) facts.push(["Mobility", s.feasibility.mobility.mode.toUpperCase()]);

  const hardStops = [
    "Walkback margin reaches 0: EVA TERMINATE, walk back now",
    "Solar particle event warning (DONKI): EVA TERMINATE",
    "Bingo time passed at a station: take the nominal branch",
    "Suit or comm fault: EVA TERMINATE, walk back with the EV partner",
  ];
  const notes: string[] = [];
  // Planetary protection once for the whole EVA, not on every station.
  const sensitive = orderedStations(plan).filter((st) => st.planetary_protection === "sensitive").map((st) => st.id);
  if (sensitive.length) notes.push(`Planetary protection sensitive at ${sensitive.length === stations.size ? "every station" : sensitive.join(", ")}: IV GO before heat-generating tasks`);
  const noLos = s.feasibility?.comms.stations_without_los ?? [];
  if (noLos.length) notes.push(`No line of sight at ${noLos.join(", ")}: keep the EV partner in view as relay`);
  for (const a of plan.alerts ?? []) if (a.level !== "advisory") notes.push(`${a.level.toUpperCase()}: ${a.message}`);

  return { title: "EVA CUFF CHECKLIST", planId: plan.plan_id, facts, steps, hardStops, notes };
}

/** Planner task lines read "Run <tool>"; containers are not run, samples go in them. */
function taskText(task: string): string {
  return task === "Run Clean sample containers" ? "Bag samples in clean containers" : task;
}

function marginOf(item: TimelineItem): string {
  return item.walkback_margin_min == null ? "n/a" : `${Math.round(item.walkback_margin_min)} min`;
}
