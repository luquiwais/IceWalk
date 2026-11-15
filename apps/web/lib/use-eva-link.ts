"use client";

/**
 * Links the EV1 and IV windows of the same browser (BroadcastChannel), so the split-screen EVA
 * runs as one: the session (plan, measurements, replan under review, EVA TERMINATE, walkback) and
 * the EV's pose travel between them, and each window knows whether the other seat is on the loop.
 *
 * No server and no leader: every local change is sent as a snapshot and the other windows adopt it.
 * A window that opens says hello and the others answer with their state, so it joins mid-EVA. The
 * snapshot's `key` says what changed; a window does not echo back what it just adopted.
 */
import { useEffect, useRef, useState } from "react";
import type { Measurement, Plan } from "./plan";
import type { PlanSource, SessionStatus } from "./use-plan-session";

export type EvaSeat = "ev" | "iv" | null;
/** The IV's call on a replan under review (xEVA Con Ops, sec. 4.3.2 and 8.1); the EV copies it. */
export type IvCall = "continue" | "terminate" | null;

export type EvaSnapshot = {
  plan: Plan;
  previous: Plan | null;
  measurements: Measurement[];
  status: SessionStatus;
  source: PlanSource;
  reviewing: boolean;
  returning: boolean;
  walkback: unknown;
  ivCall: IvCall;
  approvedId: string | null;
};

export type EvaPose = { x: number; y: number; headingDeg: number; [k: string]: unknown };

type Message =
  | { type: "hello"; from: string; seat: EvaSeat }
  | { type: "presence"; from: string; seat: EvaSeat }
  | { type: "bye"; from: string }
  | { type: "state"; from: string; snapshot: EvaSnapshot }
  | { type: "pose"; from: string; pose: EvaPose };

const CHANNEL = "icewalk-eva";
const HEARTBEAT_MS = 1500;
const STALE_MS = 4500;

/** What a snapshot changes, in one string: equal keys mean nothing to send. */
export function snapshotKey(s: EvaSnapshot): string {
  const last = s.measurements.at(-1);
  return [s.plan.plan_id, s.previous?.plan_id ?? "", s.measurements.length, last?.station_id ?? "", last?.result ?? "", s.status, s.source, s.reviewing, s.returning, s.walkback ? "w" : "", s.ivCall ?? "", s.approvedId ?? ""].join("|");
}

export function useEvaLink({ seat, snapshot, onSnapshot, pose, sendPose, onPose }: {
  seat: EvaSeat;
  snapshot: EvaSnapshot;
  onSnapshot: (s: EvaSnapshot) => void;
  pose: EvaPose;
  /** Only the EV in the helmet sends its pose. */
  sendPose: boolean;
  onPose: (p: EvaPose) => void;
}) {
  const [peers, setPeers] = useState<Record<string, { seat: EvaSeat; seen: number }>>({});
  const channel = useRef<BroadcastChannel | null>(null);
  const id = useRef("");
  const adopted = useRef<string | null>(null);
  const latest = useRef(snapshot);
  const handlers = useRef({ onSnapshot, onPose });
  const seatRef = useRef(seat);
  useEffect(() => { latest.current = snapshot; handlers.current = { onSnapshot, onPose }; seatRef.current = seat; });

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    id.current = Math.random().toString(36).slice(2);
    const ch = new BroadcastChannel(CHANNEL);
    channel.current = ch;
    const me = id.current;
    const post = (m: Message) => { try { ch.postMessage(m); } catch { /* closed */ } };
    ch.onmessage = (event: MessageEvent<Message>) => {
      const m = event.data;
      if (!m || m.from === me) return;
      if (m.type === "bye") { setPeers((p) => { const n = { ...p }; delete n[m.from]; return n; }); return; }
      if (m.type === "hello" || m.type === "presence") {
        setPeers((p) => ({ ...p, [m.from]: { seat: m.seat, seen: Date.now() } }));
        if (m.type === "hello") {
          post({ type: "presence", from: me, seat: seatRef.current });
          post({ type: "state", from: me, snapshot: latest.current });
        }
        return;
      }
      if (m.type === "state") {
        const key = snapshotKey(m.snapshot);
        if (key === snapshotKey(latest.current)) return;
        adopted.current = key;
        handlers.current.onSnapshot(m.snapshot);
        return;
      }
      if (m.type === "pose") handlers.current.onPose(m.pose);
    };
    post({ type: "hello", from: me, seat: seatRef.current });
    const beat = window.setInterval(() => {
      post({ type: "presence", from: me, seat: seatRef.current });
      setPeers((p) => {
        const now = Date.now();
        const live = Object.entries(p).filter(([, v]) => now - v.seen < STALE_MS);
        return live.length === Object.keys(p).length ? p : Object.fromEntries(live);
      });
    }, HEARTBEAT_MS);
    const leave = () => post({ type: "bye", from: me });
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      window.clearInterval(beat);
      leave();
      ch.close();
      channel.current = null;
    };
  }, []);

  // Say at once when this window changes seat, so the other one knows who is on the loop.
  useEffect(() => {
    channel.current?.postMessage({ type: "presence", from: id.current, seat } satisfies Message);
  }, [seat]);

  // Every local change goes out; what was just adopted from a peer does not bounce back.
  const key = snapshotKey(snapshot);
  useEffect(() => {
    if (adopted.current === key) { adopted.current = null; return; }
    channel.current?.postMessage({ type: "state", from: id.current, snapshot: latest.current } satisfies Message);
  }, [key]);

  // The EV's pose, at most ten times a second.
  const lastPose = useRef(0);
  useEffect(() => {
    if (!sendPose) return;
    const now = Date.now();
    const send = () => { lastPose.current = Date.now(); channel.current?.postMessage({ type: "pose", from: id.current, pose } satisfies Message); };
    if (now - lastPose.current >= 100) { send(); return; }
    const t = window.setTimeout(send, 100 - (now - lastPose.current));
    return () => window.clearTimeout(t);
  }, [pose, sendPose]);

  const seats = Object.values(peers).map((p) => p.seat);
  return { ivOnline: seats.includes("iv"), evOnline: seats.includes("ev"), peers: seats.length };
}
