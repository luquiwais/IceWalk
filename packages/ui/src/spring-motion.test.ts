import { describe, expect, it } from "vitest";
import { createSpringTrack, springState, springFrames } from "./spring-motion";

describe("retargetable spatial spring", () => {
  it("preserves position and velocity when the target reverses", () => {
    const first = createSpringTrack({ from: 0, to: 200, velocity: 0, duration: 280, bounce: .15 });
    const moving = springState(first, 65);
    expect(moving.position).toBeGreaterThan(0);
    expect(moving.velocity).toBeGreaterThan(0);
    const reversed = createSpringTrack({ ...first, duration: 280, from: moving.position, to: 0, velocity: moving.velocity });
    expect(springState(reversed, 0)).toEqual(moving);
    // A moving material cannot stop and change direction at the same instant.
    expect(springState(reversed, 1).position).toBeGreaterThan(moving.position);
    expect(springState(reversed, reversed.duration)).toEqual({ position: 0, velocity: 0 });
  });

  it.each([0, .15, -.2])("has an analytic velocity that matches its motion (bounce %s)", (bounce) => {
    const track = createSpringTrack({ from: 20, to: 80, velocity: -120, duration: 360, bounce });
    for (const time of [1, 20, 90, 200]) {
      const derivative = (springState(track, time + .001).position - springState(track, time - .001).position) / .000002;
      expect(springState(track, time).velocity).toBeCloseTo(derivative, 3);
    }
  });

  it("samples absolute state with linear playback and no per-frame layout", () => {
    const tracks = [createSpringTrack({ from: 0, to: 100, velocity: 20, duration: 280, bounce: .15 })];
    const frames = springFrames(tracks, ([x]) => ({ translate: `${x}px 0px` }));
    expect(frames[0]).toMatchObject({ offset: 0, translate: "0px 0px" });
    expect(frames.at(-1)).toMatchObject({ offset: 1, translate: "100px 0px" });
    expect(frames.length).toBeGreaterThan(20);
    expect(frames.every(frame => !("left" in frame) && !("width" in frame))).toBe(true);
  });

  it("finishes a large morph without snapping the residual position or velocity", () => {
    const track = createSpringTrack({ from: 0, to: 2000, velocity: 4000, duration: 360, bounce: 0 });
    const beforeEnd = springState(track, track.duration - .0001);
    expect(Math.abs(beforeEnd.position - 2000)).toBeLessThan(.0011);
    expect(Math.abs(beforeEnd.velocity)).toBeLessThan(.011);
  });
});
