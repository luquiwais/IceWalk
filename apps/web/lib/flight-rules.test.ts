import { describe, expect, it } from "vitest";
import { flightRules, worstLevel } from "@/lib/flight-rules";
import { demoPlan, type Plan } from "@/lib/plan";
import mockWindow from "@/mock/eva-window.json";
import type { EvaWindow } from "@/lib/use-eva-window";

const win = mockWindow as unknown as EvaWindow;

describe("flightRules", () => {
  it("lists the eight rules with value, limit and level", () => {
    const rules = flightRules(demoPlan, win);
    expect(rules.map((r) => r.id)).toEqual(["duration", "walkback", "distance", "slope", "comms", "effort", "carry", "window"]);
    for (const r of rules) { expect(r.value).not.toBe(""); expect(r.limit).not.toBe(""); expect(r.explain.length).toBeGreaterThan(10); }
  });

  it("never passes a rule without data: the window is unknown until it loads", () => {
    expect(flightRules(demoPlan).find((r) => r.id === "window")?.level).toBe("unknown");
  });

  it("flags a walkback margin under the caution threshold, and a negative one as a warning", () => {
    const caution: Plan = { ...demoPlan, summary: { ...demoPlan.summary, min_walkback_margin_min: 10, walkback_caution_min: 15 } };
    const warning: Plan = { ...demoPlan, summary: { ...demoPlan.summary, min_walkback_margin_min: -2, walkback_caution_min: 15 } };
    expect(flightRules(caution, win).find((r) => r.id === "walkback")?.level).toBe("caution");
    expect(flightRules(warning, win).find((r) => r.id === "walkback")?.level).toBe("warning");
    expect(worstLevel(flightRules(warning, win))).toBe("warning");
  });

  it("flags a plan longer than the STM budget (eva_max_h minus the reserve)", () => {
    const long: Plan = { ...demoPlan, summary: { ...demoPlan.summary, duration_min: 400 } };
    expect(flightRules(long, win).find((r) => r.id === "duration")?.level).toBe("warning");
  });
});
