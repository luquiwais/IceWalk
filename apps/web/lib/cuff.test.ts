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
      const branches = d.lines.filter((l) => l !== "The result does not change the next station").slice(0, -1);
      expect(branches.every((l) => l.startsWith("IF "))).toBe(true);
      expect(d.lines.at(-1)).toMatch(/^Bingo: leave /);
    }
  });

  it("collapses branches that lead to the same station and says so", () => {
    const first = cuffChecklist(demoPlan).steps.find((s) => s.decision);
    expect(first?.lines[0]).toMatch(/^IF ANY RESULT: go to \S+ \(nominal\)$/);
    expect(first?.lines[1]).toBe("The result does not change the next station");
  });

  it("names EVA TERMINATE in the hard stops and lists planetary protection once", () => {
    const cuff = cuffChecklist(demoPlan);
    expect(cuff.hardStops.some((h) => h.includes("EVA TERMINATE"))).toBe(true);
    expect(cuff.hardStops.some((h) => /return to habitat/i.test(h))).toBe(false);
    expect(cuff.steps.some((s) => s.lines.some((l) => l.startsWith("Planetary protection")))).toBe(false);
    expect(cuff.notes.filter((n) => n.startsWith("Planetary protection")).length).toBe(1);
  });

  it("keeps PET non-decreasing, decisions included", () => {
    const pets = cuffChecklist(demoPlan).steps.map((s) => s.pet.split(":").map(Number)).map(([h, m]) => h * 60 + m);
    for (let i = 1; i < pets.length; i++) expect(pets[i]).toBeGreaterThanOrEqual(pets[i - 1]);
  });
});
