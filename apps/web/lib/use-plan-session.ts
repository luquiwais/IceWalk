"use client";

/**
 * Plan session: the current plan, the one before the last replan, and where both
 * came from. With NEXT_PUBLIC_PLANNER_API_URL set it uses POST /plan and POST
 * /replan; without it, or when the API does not answer, it serves the bundled mocks
 * exactly as the demo did before. `source` says which one the UI is showing, so mock
 * data is never presented as planner output (the bundled JSON is a snapshot of the
 * real planner and says `is_mock: false`).
 *
 * The state lives in a small external store so it can be tested without React and
 * so the static build renders the mock (the server snapshot) with no request.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

import { getHealth, PlannerApiError, plannerBaseUrl, postPlan, postReplan, type PlannerHealth } from "./api";
import { demoPlan, demoReplan, type Measurement, type Plan } from "./plan";

export type PlanSource = "api" | "mock";
/** idle: API configured, first request not sent yet (also the server render). */
export type SessionStatus = "idle" | "loading" | "ready" | "error";
/** superseded: a newer action started before this one answered; its result was dropped. */
export type LogOutcome = "replanned" | "retained" | "failed" | "superseded";

export type PlanSessionState = {
  plan: Plan;
  /** The plan before the last replan, for diffPlans; null when nothing was replanned. */
  previous: Plan | null;
  /** Measurements the current plan accounts for. */
  measurements: Measurement[];
  status: SessionStatus;
  source: PlanSource;
  /** Mode reported by GET /health; null in mock mode or when /health did not answer. */
  planner: PlannerHealth["planner"] | null;
  /** summary.is_mock of the current plan, as the planner reports it. */
  isMock: boolean | null;
  error: PlannerApiError | null;
  apiConfigured: boolean;
};

export type PlanSessionOptions = {
  /** Defaults to NEXT_PUBLIC_PLANNER_API_URL; null forces mock mode. */
  baseUrl?: string | null;
  /** Bundled plans used without an API. `replan` is what a negative result loads. */
  fallback?: { plan: Plan; replan: Plan };
  stm?: Record<string, unknown>;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export type PlanSession = {
  getSnapshot: () => PlanSessionState;
  subscribe: (listener: () => void) => () => void;
  start: () => Promise<void>;
  logMeasurement: (measurement: Measurement, elapsedMin: number) => Promise<LogOutcome>;
  reset: () => void;
  dispose: () => void;
};

export function createPlanSession(options: PlanSessionOptions = {}): PlanSession {
  const fallback = options.fallback ?? { plan: demoPlan, replan: demoReplan };
  const baseUrl = options.baseUrl === undefined ? plannerBaseUrl() : (options.baseUrl ?? undefined);
  const api = { baseUrl, fetch: options.fetch, timeoutMs: options.timeoutMs };
  const stm = options.stm ? { stm: options.stm } : {};
  const listeners = new Set<() => void>();

  /** The nominal plan from POST /plan; reset returns to it (the server keeps it by plan_id). */
  let nominal: Plan | null = null;
  let generation = 0;
  let controller: AbortController | null = null;
  let state: PlanSessionState = {
    ...mockState(fallback.plan),
    status: baseUrl ? "idle" : "ready",
    apiConfigured: Boolean(baseUrl),
  };

  function mockState(plan: Plan): Omit<PlanSessionState, "status" | "apiConfigured"> {
    return { plan, previous: null, measurements: [], source: "mock", planner: null, isMock: isMock(plan), error: null };
  }

  function set(patch: Partial<PlanSessionState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  /** Every action supersedes the previous one: abort it and drop its answer. */
  function begin() {
    generation += 1;
    controller?.abort();
    controller = new AbortController();
    return { id: generation, signal: controller.signal };
  }

  async function start() {
    if (!baseUrl) return;
    const { id, signal } = begin();
    set({ status: "loading" });
    const [health, plan] = await Promise.allSettled([
      getHealth({ ...api, signal, timeoutMs: Math.min(api.timeoutMs ?? 5_000, 5_000) }),
      postPlan({ ...stm, measurements: [] }, { ...api, signal }),
    ]);
    if (id !== generation) return;
    if (plan.status === "fulfilled") {
      nominal = plan.value;
      set({
        plan: plan.value,
        previous: null,
        measurements: [],
        status: "ready",
        source: "api",
        planner: health.status === "fulfilled" ? health.value.planner : null,
        isMock: isMock(plan.value),
        error: null,
      });
    } else {
      nominal = null;
      set({ ...mockState(fallback.plan), status: "error", error: asError(plan.reason) });
    }
  }

  async function logMeasurement(measurement: Measurement, elapsedMin: number): Promise<LogOutcome> {
    const { id, signal } = begin();
    const measurements = [...state.measurements, measurement];

    if (state.source === "mock") {
      // Same as the demo before the API: only the precomputed negative result replans.
      if (measurement.result === "no_ice") {
        set({ plan: fallback.replan, previous: fallback.plan, measurements, status: "ready", isMock: isMock(fallback.replan) });
        return "replanned";
      }
      set({ measurements, status: "ready" });
      return "retained";
    }

    const before = state.plan;
    set({ status: "loading" });
    try {
      const next = await postReplan(
        { plan_id: before.plan_id, measurement, elapsed_min: elapsedMin, ...stm },
        { ...api, signal },
      );
      if (id !== generation) return "superseded";
      set({ plan: next, previous: before, measurements, status: "ready", isMock: isMock(next), error: null });
      return "replanned";
    } catch (error) {
      if (id !== generation) return "superseded";
      set({ status: "error", error: asError(error) });
      return "failed";
    }
  }

  function reset() {
    if (baseUrl && nominal) {
      begin();
      set({ plan: nominal, previous: null, measurements: [], status: "ready", source: "api", isMock: isMock(nominal), error: null });
      return;
    }
    if (baseUrl) {
      // The API never gave us a plan: show the mock now and try again.
      set({ ...mockState(fallback.plan), error: state.error });
      void start();
      return;
    }
    begin();
    set({ ...mockState(fallback.plan), status: "ready" });
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    logMeasurement,
    reset,
    dispose() {
      generation += 1;
      controller?.abort();
      controller = null;
    },
  };
}

export function usePlanSession(options: PlanSessionOptions = {}) {
  // Options are read once, on mount.
  const [session] = useState(() => createPlanSession(options));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    void session.start();
    return () => session.dispose();
  }, [session]);
  return { ...state, logMeasurement: session.logMeasurement, reset: session.reset };
}

/** One discreet line for the UI about where the plan comes from. */
export function describeSource(state: PlanSessionState): string {
  if (state.source === "mock") {
    if (!state.apiConfigured) return "Bundled mock data";
    if (state.status === "idle" || state.status === "loading") return "Connecting to the planner · bundled mock data";
    if (state.error) return "Planner API unavailable · bundled mock data";
    return "Bundled mock data";
  }
  if (state.status === "loading") return "Planner API · replanning";
  if (state.status === "error") return "Planner API · replan failed, showing the last plan";
  if (state.planner === "mock" || state.isMock) return "Planner API · mock planner";
  if (state.planner === "real") return "Planner API · real planner";
  return "Planner API";
}

function isMock(plan: Plan): boolean | null {
  return plan.summary.is_mock ?? null;
}

function asError(error: unknown): PlannerApiError {
  return error instanceof PlannerApiError
    ? error
    : new PlannerApiError("network", error instanceof Error ? error.message : String(error), { cause: error });
}
