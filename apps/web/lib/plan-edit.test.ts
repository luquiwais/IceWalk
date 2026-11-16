import { describe, expect, it } from "vitest";
import { demoPlan, orderedStations, type Plan } from "./plan";
import { editedStations, editVerdict } from "./plan-edit";

describe("editedStations", () => {
  it("keeps walking order, moves one station and leaves one out", () => {
    const [first, second] = orderedStations(demoPlan);
    const moved = editedStations(demoPlan, { move: { id: first.id, xy: [10, -20] } });
    expect(moved.map((s) => s.id)).toEqual(orderedStations(demoPlan).map((s) => s.id));
    expect(moved[0].position).toEqual([10, -20]);
    expect(moved[1].position).toEqual(second.position);
    expect(editedStations(demoPlan, { remove: first.id }).map((s) => s.id)).not.toContain(first.id);
  });
});

describe("editVerdict", () => {
  const with_ = (margin: number, alerts: Plan["alerts"] = []): Plan => ({ ...demoPlan, alerts, summary: { ...demoPlan.summary, min_walkback_margin_min: margin, walkback_caution_min: 15 } });
  it("reads the planner's margin and alerts", () => {
    expect(editVerdict(with_(27)).level).toBe("go");
    expect(editVerdict(with_(8)).level).toBe("caution");
    expect(editVerdict(with_(-4))).toMatchObject({ level: "warning", text: expect.stringContaining("Not viable") });
    expect(editVerdict(with_(27, [{ level: "warning", message: "Not viable: walkback margin", source: "planner" }])).level).toBe("warning");
  });
});
