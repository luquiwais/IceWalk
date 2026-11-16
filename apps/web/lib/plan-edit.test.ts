import { describe, expect, it } from "vitest";
import { demoPlan, orderedStations, type Plan } from "./plan";
import { editedStations, editVerdict, midpointAfter } from "./plan-edit";

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

describe("reordering and adding stations", () => {
  const order = [...demoPlan.stations].sort((a, b) => a.order - b.order);
  it("shifts a station one place and keeps the rest in order", () => {
    const ids = editedStations(demoPlan, { shift: { id: order[0].id, by: 1 } }).map((s) => s.id);
    expect(ids.slice(0, 2)).toEqual([order[1].id, order[0].id]);
    expect(editedStations(demoPlan, { shift: { id: order[0].id, by: -1 } }).map((s) => s.id)[0]).toBe(order[0].id); // first stays first
  });
  it("inserts a new station without an id after the chosen one, halfway to the next", () => {
    const xy = midpointAfter(demoPlan, order[0].id, [0, 0]);
    const list = editedStations(demoPlan, { add: { after: order[0].id, xy } });
    expect(list).toHaveLength(order.length + 1);
    expect(list[1].id).toBeUndefined();
    expect(list[1].position).toEqual([Math.round((order[0].position[0] + order[1].position[0]) / 2), Math.round((order[0].position[1] + order[1].position[1]) / 2)]);
  });
});
