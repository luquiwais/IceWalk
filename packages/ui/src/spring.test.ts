import { describe, expect, it } from "vitest";
import { springParameters, springPosition, springEasing, SPRINGS } from "./spring";

describe("public SwiftUI spring model", () => {
  it("matches the documented .5s / .3 bounce example", () => {
    const p = springParameters(.5, .3);
    expect(p.mass).toBe(1);
    expect(p.stiffness).toBeCloseTo(157.91367, 4);
    expect(p.damping).toBeCloseTo(17.59292, 4);
  });
  it("starts at rest and smooth reaches its destination without overshooting", () => {
    expect(springPosition(0, .5, 0)).toBe(0);
    expect(springPosition(.00001, .5, 0) / .00001).toBeLessThan(.01);
    const samples = Array.from({ length: 101 }, (_, i) => springPosition(i / 100, .5, 0));
    expect(samples.every((x, i) => x >= 0 && x <= 1 && (!i || x >= samples[i-1]))).toBe(true);
    expect(samples.at(-1)).toBeGreaterThan(.999);
  });
  it("retains the public snappy and bouncy overshoot instead of clipping it", () => {
    const max = (bounce: number) => Math.max(...Array.from({ length: 101 }, (_, i) => springPosition(i / 100, .5, bounce)));
    expect(max(.15)).toBeGreaterThan(1);
    expect(max(.3)).toBeGreaterThan(max(.15));
    expect(SPRINGS.smooth.perceptualDuration).toBe(500);
    expect(SPRINGS.smooth.duration).toBe(800);
    expect(springEasing(.5, 0)).toMatch(/^linear\(0, /);
  });
  it("rejects non-settling or invalid spring parameters", () => {
    expect(() => springParameters(0, 0)).toThrow();
    expect(() => springParameters(.5, 1)).toThrow();
  });
});
