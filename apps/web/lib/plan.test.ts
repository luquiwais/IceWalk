import { describe, expect, it } from "vitest";

import {
  decisionPointFor,
  demoMeasurement,
  demoPlan,
  demoReplan,
  diffPlans,
  orderedStations,
  stationById,
  timelineViolations,
  toolName,
  totalEquipmentMass,
  type Plan,
} from "./plan";

describe("plan selectors", () => {
  it("orders stations by their order field, not their array position", () => {
    const plan = {
      ...demoPlan,
      stations: [...demoPlan.stations].reverse(),
    };
    expect(orderedStations(plan).map((s) => s.order)).toEqual(
      [...demoPlan.stations].map((s) => s.order).sort((a, b) => a - b),
    );
  });

  it("finds a station and its decision point", () => {
    const first = orderedStations(demoPlan)[0];
    expect(stationById(demoPlan, first.id)?.id).toBe(first.id);
    expect(stationById(demoPlan, "missing")).toBeUndefined();

    const point = decisionPointFor(demoPlan, demoPlan.decision_points![0].station_id);
    expect(point?.options.length).toBeGreaterThan(0);
    expect(decisionPointFor(demoPlan, "missing")).toBeUndefined();
    expect(decisionPointFor({ ...demoPlan, decision_points: undefined }, first.id)).toBeUndefined();
  });

  it("flags timeline items whose walkback margin is negative as warnings", () => {
    const plan: Plan = {
      ...demoPlan,
      timeline: [
        { t_start_min: 0, t_end_min: 10, kind: "egress", label: "Egress" },
        { t_start_min: 10, t_end_min: 50, kind: "station", label: "Station A", walkback_margin_min: 0 },
        { t_start_min: 50, t_end_min: 90, kind: "station", label: "Station B", walkback_margin_min: -4 },
      ],
    };
    expect(timelineViolations(plan)).toEqual([
      { index: 2, level: "warning", message: "Station B: walkback margin -4 min" },
    ]);
    expect(timelineViolations(demoPlan)).toEqual([]);
  });

  it("describes what a replan changed", () => {
    const diff = diffPlans(demoPlan, demoReplan);
    const before = new Set(demoPlan.stations.map((s) => s.id));
    const after = new Set(demoReplan.stations.map((s) => s.id));

    expect(diff.added.map((s) => s.id)).toEqual(demoReplan.stations.filter((s) => !before.has(s.id)).map((s) => s.id));
    expect(diff.removed.map((s) => s.id)).toEqual(demoPlan.stations.filter((s) => !after.has(s.id)).map((s) => s.id));
    expect(diff.delta.duration_min).toBeCloseTo(demoReplan.summary.duration_min - demoPlan.summary.duration_min);
    expect(diff.delta.distance_km).toBeCloseTo(demoReplan.summary.distance_km - demoPlan.summary.distance_km);
    expect(diff.delta.min_walkback_margin_min).toBeCloseTo(
      demoReplan.summary.min_walkback_margin_min! - demoPlan.summary.min_walkback_margin_min!,
    );
  });

  it("leaves a delta undefined when either plan lacks the value", () => {
    const without = { ...demoPlan, summary: { ...demoPlan.summary, dose_estimate_msv: undefined } };
    expect(diffPlans(without, demoReplan).delta.dose_estimate_msv).toBeUndefined();
  });

  it("links the demo replan to the demo plan and measurement", () => {
    expect(demoReplan.replanned_from).toBe(demoPlan.plan_id);
    expect(stationById(demoPlan, demoMeasurement.station_id)).toBeDefined();
  });
});

describe("equipment", () => {
  it("names tools from the certified catalog and falls back to the id", () => {
    expect(toolName("core_drill")).not.toBe("core_drill");
    expect(toolName("unknown_tool")).toBe("unknown tool");
  });

  it("sums known masses and says how many are unknown", () => {
    expect(
      totalEquipmentMass([
        { tool: "a", count: 2, mass_kg: 1.5 },
        { tool: "b", count: 1, mass_kg: null },
        { tool: "c", count: 1 },
      ]),
    ).toEqual({ known_kg: 3, unknown: 2 });
  });
});
