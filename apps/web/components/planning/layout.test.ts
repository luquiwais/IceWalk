import { describe, expect, it } from "vitest";
import { sceneInsets } from "./layout";
const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height });
describe("scene insets from measured chrome", () => {
  it("leaves the right contextual window outside the framed map", () => {
    expect(sceneInsets(rect(0, 0, 1440, 900), rect(500, 24, 700, 72), rect(24, 280, 80, 250), rect(1016, 120, 400, 600), rect(24, 756, 1392, 120))).toEqual({ top: 116, left: 124, right: 444, bottom: 164 });
  });
  it("reserves a measured bottom sheet on a narrow screen", () => {
    expect(sceneInsets(rect(0, 0, 390, 844), rect(12, 60, 366, 90), rect(12, 164, 300, 44), rect(12, 454, 366, 250), rect(12, 716, 366, 116))).toEqual({ top: 228, left: 20, right: 20, bottom: 410 });
  });
  it("uses the full map width when the compact bottom sheet is hidden", () => {
    expect(sceneInsets(rect(0, 0, 390, 844), rect(12, 60, 366, 90), rect(12, 164, 170, 64), undefined, rect(12, 716, 366, 116))).toEqual({ top: 248, left: 20, right: 20, bottom: 148 });
  });
  it("keeps the map clear of the tools above the timeline and of a legend under the tabs", () => {
    expect(sceneInsets(rect(0, 0, 1440, 900), rect(500, 24, 700, 72), rect(24, 280, 80, 250), rect(1016, 120, 400, 600), rect(24, 756, 1392, 120), { below: rect(24, 640, 380, 100) }).bottom).toBe(280);
    expect(sceneInsets(rect(0, 0, 390, 844), rect(12, 60, 366, 90), rect(12, 164, 300, 44), rect(12, 454, 366, 250), rect(12, 716, 366, 116), { above: rect(12, 214, 300, 18) }).top).toBe(252);
  });
});
