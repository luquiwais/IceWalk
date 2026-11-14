import { describe, expect, it } from "vitest";

import { formatOdds } from "./format";
import {
  bearing,
  demoMeasurement,
  demoPlan,
  demoReplan,
  evaLimitMin,
  evaName,
  highestAlert,
  measurementSummary,
  measuringTool,
  missionObjective,
  nextBingo,
  nextStation,
  orderedStations,
  stationBlock,
  toolReachM,
  traverseHeading,
  type Measurement,
  type Plan,
} from "./plan";

const first = orderedStations(demoPlan)[0];
const measured = (station_id: string, result: Measurement["result"] = "ice"): Measurement => ({
  ...demoMeasurement,
  station_id,
  result,
});

describe("next station", () => {
  it("is the first station in order without a measurement", () => {
    expect(nextStation(demoPlan, [])?.id).toBe(first.id);
    // The old EV view kept showing the measured station after Ice or Inconclusive.
    expect(nextStation(demoPlan, [measured(first.id, "ice")])?.id).toBe(orderedStations(demoPlan)[1].id);
    expect(nextStation(demoPlan, [measured(first.id, "inconclusive")])?.id).toBe(orderedStations(demoPlan)[1].id);
  });

  it("is undefined once every station is measured", () => {
    expect(nextStation(demoPlan, demoPlan.stations.map((s) => measured(s.id)))).toBeUndefined();
  });
});

describe("tools from the catalog", () => {
  it("reads the reach of a tool", () => {
    expect(toolReachM("core_drill")).toBe(1);
    expect(toolReachM("gpr")).toBe(10);
    expect(toolReachM("unknown_tool")).toBeUndefined();
  });

  it("picks the station tool that measures ice presence", () => {
    const station = { ...first, tools: ["camera_spectrometer", "core_drill", "sample_kit"] };
    expect(measuringTool(station)).toBe("core_drill");
    expect(measuringTool({ ...first, tools: ["sample_kit"] })).toBe("sample_kit");
  });
});

describe("measurement summary", () => {
  it("says what was found and how deep", () => {
    expect(measurementSummary({ ...demoMeasurement, result: "no_ice", depth_m: 1 })).toBe("no ice to 1.0 m");
    expect(measurementSummary({ ...demoMeasurement, result: "ice", depth_m: 0.4 })).toBe("ice at 0.4 m");
    expect(measurementSummary({ ...demoMeasurement, result: "inconclusive", depth_m: null })).toBe("inconclusive");
  });
});

describe("bearing", () => {
  it("is computed from grid positions, clockwise from north", () => {
    expect(bearing([0, 0], [100, 0])).toMatchObject({ deg: 90, point: "E", distanceM: 100 });
    expect(bearing([300, -2200], [400, -2200]).label).toBe("090° E");
    expect(bearing([0, 0], [-100, 100]).label).toBe("315° NW");
    expect(bearing([0, 0], [0, -50]).label).toBe("180° S");
  });
});

describe("mission framing", () => {
  it("reads the EVA limit from the STM the planner used, or gives nothing", () => {
    // The planner defaults to contracts/examples/stm.s1094b.json (apps/planner/app/main.py).
    expect(evaLimitMin(demoPlan)).toBe(8 * 60);
    expect(evaLimitMin({ ...demoPlan, mission_id: "other" } as Plan)).toBeUndefined();
  });

  it("names the EVA and its first objective", () => {
    expect(evaName(demoPlan)).toBe("EVA 1");
    expect(missionObjective(demoPlan)).toMatch(/shallow ice/i);
    expect(missionObjective({ ...demoPlan, mission_id: "other" } as Plan)).toBeUndefined();
  });

  it("finds the next bingo and the planned window of a station", () => {
    // The earliest decision point of the plan, whatever the planner exported.
    const earliest = [...(demoPlan.decision_points ?? [])].sort((x, y) => x.decide_by_min - y.decide_by_min)[0];
    expect(nextBingo(demoPlan)).toMatchObject({ station_id: earliest.station_id, decide_by_min: earliest.decide_by_min });
    expect(nextBingo(demoPlan, 400)).toBeUndefined();
    expect(stationBlock(demoPlan, first.id)).toMatchObject({ t_start_min: 45, t_end_min: 85 });
  });

  it("ranks alerts warning > caution > advisory", () => {
    expect(highestAlert([])).toBeUndefined();
    expect(
      highestAlert([
        { level: "advisory", message: "a" },
        { level: "warning", message: "w" },
        { level: "caution", message: "c" },
      ])?.message,
    ).toBe("w");
  });

  it("keeps the planner's alerts in the bundled replan (no UI-made cautions)", () => {
    expect(demoReplan.alerts?.every((a) => a.source === "planner")).toBe(true);
  });
});

describe("formatOdds", () => {
  it("turns a probability into a plain frequency", () => {
    expect(formatOdds(0.648)).toBe("~2 in 3");
    expect(formatOdds(0.5)).toBe("~1 in 2");
    expect(formatOdds(0.1)).toBe("~1 in 10");
    expect(formatOdds(0.92)).toBe("~9 in 10");
    expect(formatOdds(0.02)).toBe("< 1 in 10");
    expect(formatOdds(0.99)).toBe("> 9 in 10");
  });
});

describe("traverseHeading", () => {
  const stations = orderedStations(demoPlan);
  it("points at the next station from the current position", () => {
    expect(traverseHeading(demoPlan, [measured(first.id)], first.position)).toBeCloseTo(bearing(first.position, stations[1].position).deg);
  });
  it("looks down the route when the crew is already on the next station", () => {
    expect(traverseHeading(demoPlan, [], first.position)).toBeCloseTo(bearing(first.position, stations[1].position).deg);
  });
  it("is undefined when nothing is left to visit", () => {
    expect(traverseHeading(demoPlan, stations.map((s) => measured(s.id)), first.position)).toBeUndefined();
  });
});
