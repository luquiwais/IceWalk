import { describe, expect, it } from "vitest";

import { cuffChecklist, pet } from "./cuff";
import { demoPlan } from "./plan";

describe("cuff checklist", () => {
  it("formats PET as h:mm", () => {
    expect(pet(0)).toBe("0:00");
    expect(pet(45)).toBe("0:45");
    expect(pet(125.4)).toBe("2:05");
  });

  it("lists every station in order, with egress first and ingress last", () => {
    const cuff = cuffChecklist(demoPlan);
    const titles = cuff.steps.map((s) => s.title);
    expect(titles[0]).toBe("EGRESS");
    expect(titles.at(-1)).toBe("INGRESS");
    const stations = titles.filter((t) => t.startsWith("STATION ")).map((t) => t.slice(8));
    expect(stations).toEqual([...demoPlan.stations].sort((a, b) => a.order - b.order).map((s) => s.id));
    expect(cuff.planId).toBe(demoPlan.plan_id);
  });

  it("turns decision points into branches with a nominal option", () => {
    const cuff = cuffChecklist(demoPlan);
    const decisions = cuff.steps.filter((s) => s.decision);
    expect(decisions.length).toBe(demoPlan.decision_points?.length ?? 0);
    for (const d of decisions) {
      expect(d.lines.some((l) => l.endsWith("(nominal)"))).toBe(true);
      expect(d.lines.slice(0, -1).every((l) => l.startsWith("IF "))).toBe(true);
      expect(d.lines.at(-1)).toMatch(/^Bingo: leave /);
    }
  });

  it("keeps PET non-decreasing, decisions included", () => {
    const pets = cuffChecklist(demoPlan).steps.map((s) => s.pet.split(":").map(Number)).map(([h, m]) => h * 60 + m);
    for (let i = 1; i < pets.length; i++) expect(pets[i]).toBeGreaterThanOrEqual(pets[i - 1]);
  });
});
