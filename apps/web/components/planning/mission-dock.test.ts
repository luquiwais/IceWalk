import { describe, expect, it } from "vitest";
import { demoPlan, orderedStations, type Plan } from "@/lib/plan";
import { nextStationBingo } from "./mission-dock";

describe("nextStationBingo", () => {
  const stations = orderedStations(demoPlan);
  // Two decision points where the later station has the earlier time: the dock must follow walking order.
  const plan: Plan = { ...demoPlan, decision_points: [
    { ...(demoPlan.decision_points?.[0] ?? {}), station_id: stations[1].id, decide_by_min: 344.6 },
    { ...(demoPlan.decision_points?.[0] ?? {}), station_id: stations[0].id, decide_by_min: 347.7 },
  ] as Plan["decision_points"] };

  it("returns the bingo of the next station in walking order, not the earliest time", () => {
    expect(nextStationBingo(plan, [])?.station_id).toBe(stations[0].id);
  });

  it("skips measured stations", () => {
    const measured = [{ station_id: stations[0].id, position: stations[0].position, tool: "core_drill", result: "ice" as const, timestamp: "2037-01-01T00:00:00Z" }];
    expect(nextStationBingo(plan, measured)?.station_id).toBe(stations[1].id);
  });
});
