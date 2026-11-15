import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoPlan, demoReplan } from "./plan";
import { snapshotKey, useEvaLink, type EvaPose, type EvaSnapshot, type EvaSeat } from "./use-eva-link";

const base: EvaSnapshot = { plan: demoPlan, previous: null, measurements: [], status: "ready", source: "mock", reviewing: false, returning: false, walkback: null, ivCall: null, approvedId: null };
const pose: EvaPose = { x: 0, y: 0, headingDeg: 0 };

function seat(s: EvaSeat, snapshot: EvaSnapshot, got: EvaSnapshot[], poses: EvaPose[] = [], sendPose = false, p = pose) {
  return { seat: s, snapshot, onSnapshot: (x: EvaSnapshot) => got.push(x), pose: p, sendPose, onPose: (x: EvaPose) => poses.push(x) };
}

describe.skipIf(typeof BroadcastChannel === "undefined")("useEvaLink", () => {
  it("keys what matters to the other window", () => {
    expect(snapshotKey(base)).not.toBe(snapshotKey({ ...base, ivCall: "terminate" }));
    expect(snapshotKey(base)).toBe(snapshotKey({ ...base }));
  });

  it("links EV1 and IV: presence, a late joiner gets the state, changes and the pose travel", async () => {
    const evGot: EvaSnapshot[] = [];
    const ivGot: EvaSnapshot[] = [];
    const ivPoses: EvaPose[] = [];
    const reviewing = { ...base, plan: demoReplan, previous: demoPlan, reviewing: true };
    const ev = renderHook((props) => useEvaLink(props), { initialProps: seat("ev", reviewing, evGot, [], true) });
    const iv = renderHook((props) => useEvaLink(props), { initialProps: seat("iv", base, ivGot, ivPoses) });
    // The IV opened later: it says hello and adopts the EV's replan under review.
    await waitFor(() => expect(ivGot.at(-1)?.reviewing).toBe(true));
    await waitFor(() => expect(ev.result.current.ivOnline).toBe(true));
    await waitFor(() => expect(iv.result.current.evOnline).toBe(true));
    // The IV calls terminate; the EV hears it.
    act(() => iv.rerender(seat("iv", { ...reviewing, ivCall: "terminate" }, ivGot, ivPoses)));
    await waitFor(() => expect(evGot.at(-1)?.ivCall).toBe("terminate"));
    // The EV walks; the IV sees the pose.
    act(() => ev.rerender(seat("ev", reviewing, evGot, [], true, { x: 12, y: -30, headingDeg: 90 })));
    await waitFor(() => expect(ivPoses.at(-1)).toMatchObject({ x: 12, y: -30 }));
    ev.unmount();
    iv.unmount();
  });
});
