"use client";

/**
 * Links the EV1 and IV windows, so the split-screen EVA runs as one: the session (plan,
 * measurements, replan under review, EVA TERMINATE, walkback) and the EV's pose travel between
 * them, and each window knows whether the other seat is on the loop.
 *
 * Two transports carry the same messages: BroadcastChannel between windows of this browser, and
 * the planner API's relay (`/link/{room}`, long polling) between devices that share a crew link
 * code. A message that arrives by both is applied once.
 *
 * No leader: every local change is sent as a snapshot with a revision number, and a window adopts
 * a snapshot only if it is newer than its own (ties go to the higher window id). A window that
 * opens says hello and sends nothing until it changes something, so joining mid-EVA adopts the
 * EVA in progress instead of overwriting it with a fresh plan.
 */
import { useEffect, useRef, useState } from "react";
import { plannerBaseUrl } from "./api";
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
  | { type: "state"; from: string; rev: number; snapshot: EvaSnapshot }
  | { type: "pose"; from: string; pose: EvaPose };

const CHANNEL = "icewalk-eva";
const HEARTBEAT_MS = 2000;
const STALE_MS = 6500;
/** The relay is an HTTP request per message: the pose goes at most four times a second. */
const RELAY_POSE_MS = 250;
const POLL_WAIT_S = 20;
const ROOM = /^[A-Za-z0-9_-]{4,32}$/;

/** What a snapshot changes, in one string: equal keys mean nothing to send. */
export function snapshotKey(s: EvaSnapshot): string {
  const last = s.measurements.at(-1);
  return [s.plan.plan_id, s.previous?.plan_id ?? "", s.measurements.length, last?.station_id ?? "", last?.result ?? "", s.status, s.source, s.reviewing, s.returning, s.walkback ? "w" : "", s.ivCall ?? "", s.approvedId ?? ""].join("|");
}

/** Whether an incoming snapshot replaces the local one: newer revision, or same and a higher id. */
export function supersedes(rev: number, from: string, localRev: number, me: string): boolean {
  return rev > localRev || (rev === localRev && from > me);
}

/** A crew link code: 4-32 letters, digits, '-' or '_'; anything else is no link. */
export function validRoom(code: string | null | undefined): string | null {
  return code && ROOM.test(code) ? code : null;
}

type Transport = { lane: "local" | "relay"; send: (m: Message) => void; close: () => void };

/** Messages to and from the relay, one request at a time; a newer pose or state replaces a queued one. */
function relayTransport(base: string, room: string, me: string, receive: (m: Message) => void, joined: () => void, fetchImpl: typeof fetch): Transport {
  const url = `${base}/link/${encodeURIComponent(room)}`;
  const stop = new AbortController();
  let queue: Message[] = [];
  let sending = false;
  let closed = false;
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function flush() {
    if (sending) return;
    sending = true;
    while (queue.length && !closed) {
      const m = queue.shift()!;
      try {
        await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: me, message: m }), signal: stop.signal, keepalive: m.type === "bye" });
      } catch { if (closed) break; await pause(1000); }
    }
    sending = false;
  }

  async function poll() {
    let after: number | null = null;
    let backoff = 500;
    while (!closed) {
      try {
        const res = await fetchImpl(after === null ? url : `${url}?after=${after}&wait=${POLL_WAIT_S}`, { signal: stop.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { seq: number; messages: { from: string; message: Message }[]; reset: boolean };
        const first = after === null;
        after = body.seq;
        backoff = 500;
        for (const entry of body.messages) if (entry.from !== me) receive(entry.message);
        // Joined, or fell behind (or the server restarted): say hello so the others answer.
        if (first || body.reset) joined();
      } catch {
        if (closed) break;
        await pause(backoff);
        backoff = Math.min(backoff * 2, 8000);
      }
    }
  }

  void poll();
  return {
    lane: "relay",
    send(m) {
      if (closed) return;
      if (m.type === "pose" || m.type === "state" || m.type === "presence") queue = queue.filter((q) => q.type !== m.type);
      queue.push(m);
      void flush();
    },
    close() {
      // The bye goes out on its own request, after the poll is aborted.
      closed = true;
      stop.abort();
      fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: me, message: { type: "bye", from: me } }), keepalive: true }).catch(() => {});
    },
  };
}

export function useEvaLink({ seat, snapshot, onSnapshot, pose, sendPose, onPose, room = null, baseUrl, fetch: fetchImpl }: {
  seat: EvaSeat;
  snapshot: EvaSnapshot;
  onSnapshot: (s: EvaSnapshot) => void;
  pose: EvaPose;
  /** Only the EV in the helmet sends its pose. */
  sendPose: boolean;
  onPose: (p: EvaPose) => void;
  /** Crew link code: with it (and the planner API), windows on other devices join through the relay. */
  room?: string | null;
  /** Defaults to NEXT_PUBLIC_PLANNER_API_URL; null turns the relay off. */
  baseUrl?: string | null;
  fetch?: typeof fetch;
}) {
  const [peers, setPeers] = useState<Record<string, { seat: EvaSeat; seen: number }>>({});
  const [relayUp, setRelayUp] = useState(false);
  const transports = useRef<Transport[]>([]);
  const id = useRef("");
  const rev = useRef(0);
  const sentKey = useRef<string | null>(null);
  const adopted = useRef<string | null>(null);
  const latest = useRef(snapshot);
  const handlers = useRef({ onSnapshot, onPose });
  const seatRef = useRef(seat);
  useEffect(() => { latest.current = snapshot; handlers.current = { onSnapshot, onPose }; seatRef.current = seat; });

  const base = baseUrl === undefined ? plannerBaseUrl() : (baseUrl ?? undefined);
  const code = validRoom(room);
  const relayUrl = base && code ? base : null;

  useEffect(() => {
    id.current ||= Math.random().toString(36).slice(2, 12);
    const me = id.current;
    const send = (m: Message) => { for (const t of transports.current) t.send(m); };
    const sendState = () => send({ type: "state", from: me, rev: rev.current, snapshot: latest.current });
    const receive = (m: Message) => {
      if (!m || typeof m !== "object" || m.from === me) return;
      if (m.type === "bye") { setPeers((p) => { if (!(m.from in p)) return p; const n = { ...p }; delete n[m.from]; return n; }); return; }
      if (m.type === "hello" || m.type === "presence") {
        setPeers((p) => ({ ...p, [m.from]: { seat: m.seat, seen: Date.now() } }));
        if (m.type === "hello") { send({ type: "presence", from: me, seat: seatRef.current }); sendState(); }
        return;
      }
      if (m.type === "state") {
        if (typeof m.rev !== "number" || !m.snapshot) return;
        const key = snapshotKey(m.snapshot);
        if (!supersedes(m.rev, m.from, rev.current, me)) return;
        rev.current = m.rev;
        if (key === snapshotKey(latest.current) || key === adopted.current) return;
        adopted.current = key;
        handlers.current.onSnapshot(m.snapshot);
        return;
      }
      if (m.type === "pose") handlers.current.onPose(m.pose);
    };
    const list: Transport[] = [];
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = (event: MessageEvent<Message>) => receive(event.data);
      const local: Transport = {
        lane: "local",
        send: (m) => { try { ch.postMessage(m); } catch { /* closed */ } },
        close: () => { local.send({ type: "bye", from: me }); ch.close(); },
      };
      list.push(local);
      local.send({ type: "hello", from: me, seat: seatRef.current });
    }
    if (relayUrl && code) {
      // The relay says hello once the server answers (Render may be waking up); until then it queues.
      const relay = relayTransport(relayUrl, code, me, receive, () => {
        setRelayUp(true);
        relay.send({ type: "hello", from: me, seat: seatRef.current });
      }, fetchImpl ?? ((...a) => globalThis.fetch(...a)));
      list.push(relay);
    }
    transports.current = list;

    const beat = window.setInterval(() => {
      send({ type: "presence", from: me, seat: seatRef.current });
      setPeers((p) => {
        const now = Date.now();
        const live = Object.entries(p).filter(([, v]) => now - v.seen < STALE_MS);
        return live.length === Object.keys(p).length ? p : Object.fromEntries(live);
      });
    }, HEARTBEAT_MS);
    const leave = () => send({ type: "bye", from: me });
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      window.clearInterval(beat);
      for (const t of list) t.close();
      transports.current = [];
      setRelayUp(false);
    };
  }, [relayUrl, code, fetchImpl]);

  // Say at once when this window changes seat, so the other one knows who is on the loop.
  useEffect(() => {
    for (const t of transports.current) t.send({ type: "presence", from: id.current, seat });
  }, [seat]);

  // Every local change goes out with the next revision; what was just adopted does not bounce
  // back, and the state a window opens with is not sent (it answers hellos with it).
  const key = snapshotKey(snapshot);
  useEffect(() => {
    if (sentKey.current === null || sentKey.current === key) { sentKey.current = key; return; }
    sentKey.current = key;
    if (adopted.current === key) { adopted.current = null; return; }
    rev.current += 1;
    for (const t of transports.current) t.send({ type: "state", from: id.current, rev: rev.current, snapshot: latest.current });
  }, [key]);

  // The EV's pose: ten times a second in this browser, four through the relay.
  const lastPose = useRef({ local: 0, relay: 0 });
  useEffect(() => {
    if (!sendPose) return;
    const timers: number[] = [];
    transports.current.forEach((t) => {
      const lane = t.lane;
      const every = lane === "local" ? 100 : RELAY_POSE_MS;
      const send = () => { lastPose.current[lane] = Date.now(); t.send({ type: "pose", from: id.current, pose }); };
      const since = Date.now() - lastPose.current[lane];
      if (since >= every) send(); else timers.push(window.setTimeout(send, every - since));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [pose, sendPose]);

  const seats = Object.values(peers).map((p) => p.seat);
  return { ivOnline: seats.includes("iv"), evOnline: seats.includes("ev"), peers: seats.length, relay: relayUp };
}
