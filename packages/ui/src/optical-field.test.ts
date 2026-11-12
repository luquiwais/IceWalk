import { describe, expect, it } from "vitest";
import { opticalField } from "./optical-field";

describe("bounded optical edge field", () => {
  it("leaves the readable interior and exterior neutral, bending only the edge", () => {
    const field = opticalField(160, 80, 20, 12);
    const at = (x: number, y: number) => [...field.pixels.slice((y * field.width + x) * 4, (y * field.width + x) * 4 + 4)];
    expect(at(80, 40)).toEqual([128, 128, 128, 255]);
    expect(at(0, 0)).toEqual([128, 128, 128, 255]);
    expect(at(5, 40)[0]).toBeLessThan(128);
    expect(at(154, 40)[0]).toBeGreaterThan(128);
    expect(at(5, 40)[0] + at(154, 40)[0]).toBe(256);
    expect(at(5, 40)[1]).toBe(128);
  });
  it("bounds texture work for large windows instead of allocating viewport-sized maps", () => {
    const field = opticalField(4000, 2200, 46);
    expect(field.width).toBeLessThanOrEqual(384);
    expect(field.height).toBeLessThanOrEqual(256);
    expect(field.pixels.length).toBeLessThanOrEqual(384 * 256 * 4);
  });
  it("rejects invalid dimensions before allocating", () => {
    expect(() => opticalField(Infinity, 80, 20)).toThrow(RangeError);
    expect(() => opticalField(0, 80, 20)).toThrow(RangeError);
  });
});
