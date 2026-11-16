import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { crewLink, seatUrl } from "./crew-link";
import { demoPlan, demoReplan } from "./plan";
import { snapshotKey, supersedes, useEvaLink, validRoom, type EvaPose, type EvaSnapshot, type EvaSeat } from "./use-eva-link";

const base: EvaSnapshot = { plan: demoPlan, previous: null, measurements: [], status: "ready", source: "mock", reviewing: false, returning: false, walkback: null, ivCall: null, approvedId: null };
const pose: EvaPose = { x: 0, y: 0, headingDeg: 0 };
type Props = Parameters<typeof useEvaLink>[0];

function seat(s: EvaSeat, snapshot: EvaSnapshot, got: EvaSnapshot[], poses: EvaPose[] = [], sendPose = false, p = pose, extra: Partial<Props> = {}): Props {
  return { seat: s, snapshot, onSnapshot: (x: EvaSnapshot) => got.push(x), pose: p, sendPose, onPose: (x: EvaPose) => poses.push(x), baseUrl: null, ...extra };
}

/** The planner API's relay (`/link/{room}`), in memory, with the same long polling as the server. */
function fakeRelay() {
  const log: { seq: number; from: string; message: unknown }[] = [];
  let waiters: (() => void)[] = [];
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      log.push({ seq: log.length + 1, from: body.from, message: body.message });
      const w = waiters; waiters = []; w.forEach((f) => f());
      return ok({ seq: log.length });
    }
    const after = url.searchParams.get("after");
    if (after === null) return ok({ seq: log.length, messages: [], reset: false });
    if (Number(after) >= log.length) {
      await new Promise<void>((resolve, reject) => {
        waiters.push(resolve);
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    }
    return ok({ seq: log.length, messages: log.filter((m) => m.seq > Number(after)), reset: false });
  }) as typeof globalThis.fetch;
  return { fetch, log };
}

describe("useEvaLink", () => {
  it("keys what matters to the other window and orders snapshots by revision", () => {
    expect(snapshotKey(base)).not.toBe(snapshotKey({ ...base, ivCall: "terminate" }));
    expect(snapshotKey(base)).toBe(snapshotKey({ ...base }));
    expect(supersedes(3, "a", 2, "b")).toBe(true);
    expect(supersedes(2, "a", 3, "b")).toBe(false);
    // A tie goes to the higher id: one window adopts, the other keeps its own.
    expect(supersedes(3, "b", 3, "a")).toBe(true);
    expect(supersedes(3, "a", 3, "b")).toBe(false);
  });

  it.skipIf(typeof BroadcastChannel === "undefined")("links EV1 and IV in this browser: presence, a late joiner gets the state, changes and the pose travel", async () => {
    const evGot: EvaSnapshot[] = [];
    const ivGot: EvaSnapshot[] = [];
    const ivPoses: EvaPose[] = [];
    const reviewing = { ...base, plan: demoReplan, previous: demoPlan, reviewing: true };
    const ev = renderHook((props) => useEvaLink(props), { initialProps: seat("ev", base, evGot, [], true) });
    // The EV replans (a local change), then the IV opens.
    act(() => ev.rerender(seat("ev", reviewing, evGot, [], true)));
    const iv = renderHook((props) => useEvaLink(props), { initialProps: seat("iv", base, ivGot, ivPoses) });
    await waitFor(() => expect(ivGot.at(-1)?.reviewing).toBe(true));
    await waitFor(() => expect(ev.result.current.ivOnline).toBe(true));
    await waitFor(() => expect(iv.result.current.evOnline).toBe(true));
    // The IV's fresh state never reached the EV mid-EVA.
    expect(evGot.some((s) => !s.reviewing)).toBe(false);
    // The IV calls terminate; the EV hears it.
    act(() => iv.rerender(seat("iv", { ...reviewing, ivCall: "terminate" }, ivGot, ivPoses)));
    await waitFor(() => expect(evGot.at(-1)?.ivCall).toBe("terminate"));
    // The EV walks; the IV sees the pose.
    act(() => ev.rerender(seat("ev", { ...reviewing, ivCall: "terminate" }, evGot, [], true, { x: 12, y: -30, headingDeg: 90 })));
    await waitFor(() => expect(ivPoses.at(-1)).toMatchObject({ x: 12, y: -30 }));
    ev.unmount();
    iv.unmount();
  });

  it("links EV1 and IV on two devices through the planner API's relay", async () => {
    const realBC = globalThis.BroadcastChannel;
    // Two devices: no BroadcastChannel between them, only the relay.
    // @ts-expect-error -- removed for this test
    delete globalThis.BroadcastChannel;
    try {
      const relay = fakeRelay();
      const net = { baseUrl: "https://planner.test", room: "K7Q2MX", fetch: relay.fetch };
      const evGot: EvaSnapshot[] = [];
      const ivGot: EvaSnapshot[] = [];
      const ivPoses: EvaPose[] = [];
      const measured = { ...base, plan: demoReplan, previous: demoPlan, reviewing: true, measurements: [{ station_id: "S1", position: [0, 0], tool: "core_drill", result: "no_ice", depth_m: 1, timestamp: "2026-11-15T00:00:00Z", crew_member: "EV1" }] } as EvaSnapshot;
      const ev = renderHook((props) => useEvaLink(props), { initialProps: seat("ev", base, evGot, [], true, pose, net) });
      await waitFor(() => expect(ev.result.current.relay).toBe(true));
      act(() => ev.rerender(seat("ev", measured, evGot, [], true, pose, net)));
      const iv = renderHook((props) => useEvaLink(props), { initialProps: seat("iv", base, ivGot, ivPoses, false, pose, net) });
      // The IV joins mid-EVA: it adopts the EV's measurement and replan, and each sees the other.
      await waitFor(() => expect(ivGot.at(-1)?.measurements).toHaveLength(1));
      await waitFor(() => expect(ev.result.current.ivOnline).toBe(true));
      await waitFor(() => expect(iv.result.current.evOnline).toBe(true));
      expect(evGot).toHaveLength(0);
      // The IV's call reaches the helmet; the EV's pose reaches the console.
      act(() => iv.rerender(seat("iv", { ...measured, ivCall: "terminate" }, ivGot, ivPoses, false, pose, net)));
      await waitFor(() => expect(evGot.at(-1)?.ivCall).toBe("terminate"));
      act(() => ev.rerender(seat("ev", { ...measured, ivCall: "terminate" }, evGot, [], true, { x: 40, y: 7, headingDeg: 180 }, net)));
      await waitFor(() => expect(ivPoses.at(-1)).toMatchObject({ x: 40, y: 7 }));
      // Leaving says bye: the other seat goes offline at once.
      ev.unmount();
      await waitFor(() => expect(iv.result.current.evOnline).toBe(false));
      iv.unmount();
      expect(relay.log.every((m) => typeof m.from === "string")).toBe(true);
    } finally {
      globalThis.BroadcastChannel = realBC;
    }
  });
});

describe("crew link", () => {
  const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

  it("keeps this browser's code, takes the one in a shared link and rejects junk", () => {
    const s = store();
    const mine = crewLink(null, s);
    expect(validRoom(mine)).toBe(mine);
    expect(crewLink(null, s)).toBe(mine);
    expect(crewLink("k7q2mx", s)).toBe("K7Q2MX");
    expect(crewLink(null, s)).toBe("K7Q2MX");
    expect(crewLink("../etc", s)).toBe("K7Q2MX");
    expect(validRoom("ab")).toBeNull();
  });

  it("builds the seat URL for another device", () => {
    expect(seatUrl("https://icewalk.test", "/app", "iv", "K7Q2MX")).toBe("https://icewalk.test/app?phase=eva&role=iv&link=K7Q2MX");
    expect(seatUrl("", "/", "ev1", null)).toBe("/?phase=eva&role=ev1");
  });
});
