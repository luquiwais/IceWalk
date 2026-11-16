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

import { getHealth, PlannerApiError, plannerBaseUrl, postEvaluate, postPlan, postReplan, type EditedStation, type PlannerHealth } from "./api";
import { demoPlan, demoReplan, type Measurement, type Plan } from "./plan";

export type PlanSource = "api" | "mock";
/** idle: API configured, first request not sent yet (also the server render). */
export type SessionStatus = "idle" | "loading" | "ready" | "error";
/** superseded: a newer action started before this one answered; its result was dropped. */
/** busy: a replan is pending; this measurement was not submitted or recorded. */
export type LogOutcome = "replanned" | "retained" | "failed" | "superseded" | "busy";

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
  /** Why the last habitat move was refused (the planner's reason), or null. */
  habitatError: string | null;
  /** The plan before the operator's last edit (POST /evaluate), for before/after and undo; null when not edited. */
  editBase: Plan | null;
  /** Why the last edit was refused (the planner's reason), or null. */
  editError: string | null;
  /** Tools the crew carries (catalog ids); null: the whole catalog. */
  tools: string[] | null;
};

export type PlanSessionOptions = {
  /** Defaults to NEXT_PUBLIC_PLANNER_API_URL; null forces mock mode. */
  baseUrl?: string | null;
  /** Bundled plans used without an API. `replan` is what a negative result loads. */
  fallback?: { plan: Plan; replan: Plan; confirm?: Plan };
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
  /** Re-plans from the habitat with another strategy: learn (reduce uncertainty) or confirm (go where ice is likeliest). */
  setStrategy: (strategy: Strategy) => Promise<void>;
  /** Re-plans from a habitat the operator placed (grid meters); keeps the plan if the planner refuses it. */
  setHabitat: (xy: [number, number]) => Promise<void>;
  /** Scores the operator's stations (POST /evaluate) and makes that the plan; keeps the plan if refused. */
  evaluate: (stations: EditedStation[]) => Promise<void>;
  /** Back to the plan before the last edit. */
  undoEdit: () => void;
  /** Re-plans from the habitat with only these tools (catalog ids); null: the whole catalog. */
  setTools: (tools: string[] | null) => Promise<void>;
  /** Takes the session another window holds (the EV1 / IV link): drops any request of its own. */
  /**
   * Takes another window's session (EV1-IV link). Returns false, and changes nothing, when it is a
   * bundled mock and this window has the planner API: that window's request failed, and taking its
   * state would cancel this one's request and leave both on mock data.
   */
  adopt: (from: Pick<PlanSessionState, "plan" | "previous" | "measurements" | "status" | "source">) => boolean;
  dispose: () => void;
};

export type Strategy = "learn" | "confirm";

export function createPlanSession(options: PlanSessionOptions = {}): PlanSession {
  const fallback = options.fallback ?? { plan: demoPlan, replan: demoReplan };
  const baseUrl = options.baseUrl === undefined ? plannerBaseUrl() : (options.baseUrl ?? undefined);
  const api = { baseUrl, fetch: options.fetch, timeoutMs: options.timeoutMs };
  const stm = options.stm ? { stm: options.stm } : {};
  const listeners = new Set<() => void>();

  /** The nominal plan from POST /plan; reset returns to it (the server keeps it by plan_id). */
  let nominal: Plan | null = null;
  let strategy: Strategy = "learn";
  let habitat: [number, number] | null = null;
  let tools: string[] | null = null;
  let generation = 0;
  let controller: AbortController | null = null;
  let state: PlanSessionState = {
    ...mockState(fallback.plan),
    status: baseUrl ? "idle" : "ready",
    apiConfigured: Boolean(baseUrl),
    habitatError: null,
    editBase: null,
    editError: null,
    tools: null,
  };

  function mockState(plan: Plan): Omit<PlanSessionState, "status" | "apiConfigured"> {
    return { plan, previous: null, measurements: [], source: "mock", planner: null, isMock: isMock(plan), error: null, habitatError: null, editBase: null, editError: null, tools };
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
      postPlan({ ...stm, measurements: [], strategy, ...(habitat ? { habitat_xy: habitat } : {}), ...(tools ? { tools } : {}) }, { ...api, signal }),
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
        habitatError: null,
        editBase: null,
        editError: null,
        tools,
      });
    } else {
      nominal = null;
      set({ ...mockState(fallback.plan), status: "error", error: asError(plan.reason) });
    }
  }

  async function logMeasurement(measurement: Measurement, elapsedMin: number): Promise<LogOutcome> {
    // Replans extend a server-side plan by id. Superseding one with a second
    // measurement would fork the old plan and lose the first measurement.
    // Guard synchronously as two submissions can occur before React disables UI.
    if (state.source === "api" && state.status === "loading") return "busy";
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
    set({ ...mockState(strategy === "confirm" && fallback.confirm ? fallback.confirm : fallback.plan), status: "ready" });
  }

  async function setHabitat(xy: [number, number]) {
    if (!baseUrl || state.source !== "api") {
      set({ habitatError: "Moving the habitat needs the planner API." });
      return;
    }
    const { id, signal } = begin();
    set({ status: "loading", habitatError: null });
    try {
      const plan = await postPlan({ ...stm, measurements: [], strategy, habitat_xy: xy, ...(tools ? { tools } : {}) }, { ...api, signal });
      if (id !== generation) return;
      habitat = plan.habitat_xy ?? xy;
      nominal = plan;
      set({ plan, previous: null, measurements: [], status: "ready", isMock: isMock(plan), error: null, habitatError: null, editBase: null, editError: null });
    } catch (error) {
      if (id !== generation) return;
      const e = asError(error);
      // The plan stays as it was: only the move is refused, with the planner's reason.
      set({ status: "ready", habitatError: e.detail ?? refusal(e, "The planner could not place the habitat there.") });
    }
  }

  async function setStrategy(next: Strategy) {
    strategy = next;
    if (!baseUrl) {
      begin();
      set({ ...mockState(next === "confirm" && fallback.confirm ? fallback.confirm : fallback.plan), status: "ready" });
      return;
    }
    await start();
  }

  async function evaluate(stations: EditedStation[]) {
    if (!baseUrl || state.source !== "api") {
      set({ editError: "Editing stations needs the planner API." });
      return;
    }
    const before = state.plan;
    const { id, signal } = begin();
    set({ status: "loading", editError: null });
    try {
      const plan = await postEvaluate({ plan_id: before.plan_id, stations, decisions: true }, { ...api, signal });
      if (id !== generation) return;
      nominal = plan;
      set({ plan, previous: null, measurements: [], status: "ready", isMock: isMock(plan), error: null, editBase: before, editError: null });
    } catch (error) {
      if (id !== generation) return;
      const e = asError(error);
      set({ status: "ready", editError: e.detail ?? refusal(e, "The planner could not score that edit.") });
    }
  }

  function undoEdit() {
    const base = state.editBase;
    if (!base) return;
    begin();
    nominal = base;
    set({ plan: base, previous: null, measurements: [], status: "ready", isMock: isMock(base), error: null, editBase: null, editError: null });
  }

  async function setTools(next: string[] | null) {
    tools = next && next.length ? [...next] : null;
    set({ tools });
    if (!baseUrl) return;
    await start();
  }

  function adopt(from: Pick<PlanSessionState, "plan" | "previous" | "measurements" | "status" | "source">): boolean {
    if (baseUrl && from.source !== "api") return false;
    begin();
    if (from.source === "api" && !from.previous && !from.measurements.length) nominal = from.plan;
    set({ plan: from.plan, previous: from.previous, measurements: from.measurements, status: from.status, source: from.source, isMock: isMock(from.plan), error: null, habitatError: null });
    return true;
  }

  return {
    getSnapshot: () => state,
    adopt,
    evaluate,
    undoEdit,
    setTools,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    logMeasurement,
    reset,
    setStrategy,
    setHabitat,
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
  return { ...state, logMeasurement: session.logMeasurement, reset: session.reset, setStrategy: session.setStrategy, setHabitat: session.setHabitat, adopt: session.adopt, evaluate: session.evaluate, undoEdit: session.undoEdit, setTools: session.setTools };
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

/** Why a move or an edit failed: a slow or unreachable planner is not a refusal of the request. */
function refusal(error: PlannerApiError, refused: string): string {
  if (error.kind === "timeout") return "The planner took too long to answer. Try again.";
  if (error.kind === "network") return "The planner API is unreachable. Try again.";
  return refused;
}

function asError(error: unknown): PlannerApiError {
  return error instanceof PlannerApiError
    ? error
    : new PlannerApiError("network", error instanceof Error ? error.message : String(error), { cause: error });
}
