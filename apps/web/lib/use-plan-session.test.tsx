import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { demoMeasurement, demoPlan, demoReplan, type Measurement, type Plan } from "./plan";
import {
  createPlanSession,
  describeSource,
  usePlanSession,
  type PlanSessionState,
} from "./use-plan-session";

const BASE = "http://planner.test";
const apiPlan: Plan = { ...demoPlan, plan_id: "plan-api0001", summary: { ...demoPlan.summary, is_mock: false } };
const apiReplan: Plan = { ...demoReplan, plan_id: "plan-api0002", replanned_from: "plan-api0001" };
const fallbackReplan: Plan = { ...demoReplan, plan_id: "plan-fallback-replan" };
const fallback = { plan: demoPlan, replan: fallbackReplan };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type Route = (init: RequestInit) => Response | Promise<Response>;

/** fetch keyed by path; unknown paths are a network failure. */
function routes(table: Record<string, Route>) {
  return vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const path = String(input).slice(BASE.length);
    const route = table[path];
    if (!route) throw new TypeError(`Failed to fetch ${path}`);
    return route(init);
  });
}

/** A response the test releases by hand; rejects if the request is aborted first. */
function deferred() {
  let release!: (response: Response) => void;
  const route: Route = (init) =>
    new Promise<Response>((resolve, reject) => {
      release = resolve;
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });
  return { route, release: (response: Response) => release(response) };
}

const healthy = { "/health": () => json({ status: "ok", planner: "real" }) };
const measurement = (result: Measurement["result"]): Measurement => ({ ...demoMeasurement, result });

async function started(fetch: typeof globalThis.fetch, timeoutMs?: number) {
  const session = createPlanSession({ baseUrl: BASE, fetch, fallback, timeoutMs });
  await session.start();
  return session;
}

describe("plan session without an API", () => {
  it("serves the bundled mock as ready, labelled mock, without any request", async () => {
    const fetch = vi.fn();
    const session = createPlanSession({ baseUrl: null, fetch, fallback });
    await session.start();
    expect(session.getSnapshot()).toMatchObject({
      plan: demoPlan,
      previous: null,
      status: "ready",
      source: "mock",
      planner: null,
      apiConfigured: false,
      error: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads the precomputed replan only after a negative result, as the demo does today", async () => {
    const session = createPlanSession({ baseUrl: null, fallback });
    await expect(session.logMeasurement(measurement("ice"), 65)).resolves.toBe("retained");
    expect(session.getSnapshot()).toMatchObject({ plan: demoPlan, previous: null });

    await expect(session.logMeasurement(measurement("no_ice"), 65)).resolves.toBe("replanned");
    expect(session.getSnapshot()).toMatchObject({ plan: fallbackReplan, previous: demoPlan, status: "ready" });
    expect(session.getSnapshot().measurements).toHaveLength(2);

    session.reset();
    expect(session.getSnapshot()).toMatchObject({ plan: demoPlan, previous: null, measurements: [] });
  });

  it("updates the mock synchronously so the UI can announce the result in the same event", () => {
    const session = createPlanSession({ baseUrl: null, fallback });
    void session.logMeasurement(measurement("no_ice"), 65);
    expect(session.getSnapshot().plan).toBe(fallbackReplan);
  });
});

describe("plan session against the API", () => {
  it("requests a plan and records where it came from", async () => {
    const fetch = routes({ ...healthy, "/plan": () => json(apiPlan) });
    const session = createPlanSession({ baseUrl: BASE, fetch, fallback });
    expect(session.getSnapshot()).toMatchObject({ status: "idle", source: "mock", apiConfigured: true });

    const pending = session.start();
    expect(session.getSnapshot().status).toBe("loading");
    await pending;

    expect(session.getSnapshot()).toMatchObject({
      plan: apiPlan,
      status: "ready",
      source: "api",
      planner: "real",
      isMock: false,
      error: null,
    });
    const [, init] = fetch.mock.calls.find(([url]) => String(url).endsWith("/plan"))!;
    expect(JSON.parse(init!.body as string)).toEqual({ measurements: [] });
  });

  it("falls back to the bundled mock when the API does not respond", async () => {
    const fetch = routes({});
    const session = await started(fetch);
    expect(session.getSnapshot()).toMatchObject({ plan: demoPlan, status: "error", source: "mock" });
    expect(session.getSnapshot().error?.kind).toBe("network");

    // With no plan on the server, measurements are handled by the mock, not /replan.
    await expect(session.logMeasurement(measurement("no_ice"), 65)).resolves.toBe("replanned");
    expect(session.getSnapshot().plan).toBe(fallbackReplan);
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/replan"))).toBe(false);
  });

  it("uses the API plan when /health does not answer, with the planner mode unknown", async () => {
    const session = await started(routes({ "/plan": () => json(apiPlan) }));
    expect(session.getSnapshot()).toMatchObject({ source: "api", planner: null, status: "ready" });
  });

  it("falls back when /plan answers with something that is not a plan", async () => {
    const session = await started(routes({ ...healthy, "/plan": () => json({ plan_id: "x" }) }));
    expect(session.getSnapshot()).toMatchObject({ source: "mock", status: "error" });
    expect(session.getSnapshot().error?.kind).toBe("shape");
  });

  it.each(["ice", "no_ice", "inconclusive"] as const)(
    "sends a %s measurement to /replan and keeps the previous plan for the diff",
    async (result) => {
      const fetch = routes({ ...healthy, "/plan": () => json(apiPlan), "/replan": () => json(apiReplan) });
      const session = await started(fetch);
      const logged = measurement(result);

      const pending = session.logMeasurement(logged, 65);
      expect(session.getSnapshot().status).toBe("loading");
      await expect(pending).resolves.toBe("replanned");

      expect(session.getSnapshot()).toMatchObject({
        plan: apiReplan,
        previous: apiPlan,
        status: "ready",
        source: "api",
        measurements: [logged],
      });
      const [, init] = fetch.mock.calls.find(([url]) => String(url).endsWith("/replan"))!;
      expect(JSON.parse(init!.body as string)).toEqual({
        plan_id: apiPlan.plan_id,
        measurement: logged,
        elapsed_min: 65,
      });
    },
  );

  it.each([404, 500])("keeps the last plan and reports HTTP %i when /replan fails", async (status) => {
    const fetch = routes({
      ...healthy,
      "/plan": () => json(apiPlan),
      "/replan": () => json({ detail: "Unknown plan_id" }, status),
    });
    const session = await started(fetch);
    await expect(session.logMeasurement(measurement("no_ice"), 65)).resolves.toBe("failed");
    const state = session.getSnapshot();
    expect(state).toMatchObject({ plan: apiPlan, previous: null, status: "error", source: "api", measurements: [] });
    expect(state.error).toMatchObject({ kind: "http", status });
  });

  it("does not stay loading when /replan hangs", async () => {
    const hang = deferred();
    const session = await started(routes({ ...healthy, "/plan": () => json(apiPlan), "/replan": hang.route }), 5);
    await expect(session.logMeasurement(measurement("no_ice"), 65)).resolves.toBe("failed");
    expect(session.getSnapshot().status).toBe("error");
    expect(session.getSnapshot().error?.kind).toBe("timeout");
  });

  it("rejects a second submission while a replan is pending without losing the first measurement", async () => {
    const pending = deferred();
    const fetch = routes({ ...healthy, "/plan": () => json(apiPlan), "/replan": pending.route });
    const session = await started(fetch);
    const firstMeasurement = measurement("ice");

    const first = session.logMeasurement(firstMeasurement, 60);
    const second = session.logMeasurement(measurement("no_ice"), 65);
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith("/replan"))).toHaveLength(1);
    await expect(second).resolves.toBe("busy");
    expect(session.getSnapshot().status).toBe("loading");

    pending.release(json(apiReplan));
    await expect(first).resolves.toBe("replanned");
    expect(session.getSnapshot().measurements).toEqual([firstMeasurement]);
    expect(session.getSnapshot().plan).toEqual(apiReplan);

    const next = { ...apiReplan, plan_id: "plan-api0003" };
    fetch.mockImplementationOnce(async () => json(next));
    await expect(session.logMeasurement(measurement("no_ice"), 70)).resolves.toBe("replanned");
    const [, init] = fetch.mock.calls.at(-1)!;
    expect(JSON.parse(init!.body as string).plan_id).toBe(apiReplan.plan_id);
    expect(session.getSnapshot().measurements).toHaveLength(2);
  });

  it("ignores a replan that arrives after a reset and a newer submission", async () => {
    const first = deferred();
    const second = deferred();
    const queue = [first.route, second.route];
    const session = await started(
      routes({ ...healthy, "/plan": () => json(apiPlan), "/replan": (init) => queue.shift()!(init) }),
    );

    const older = session.logMeasurement(measurement("ice"), 60);
    session.reset();
    const newer = session.logMeasurement(measurement("no_ice"), 65);
    second.release(json(apiReplan));
    await expect(newer).resolves.toBe("replanned");
    first.release(json({ ...apiReplan, plan_id: "plan-stale" }));
    await expect(older).resolves.toBe("superseded");

    expect(session.getSnapshot().plan.plan_id).toBe(apiReplan.plan_id);
    expect(session.getSnapshot().status).toBe("ready");
  });

  it("ignores the initial plan if the user acts before it arrives", async () => {
    const slow = deferred();
    const session = createPlanSession({ baseUrl: BASE, fetch: routes({ ...healthy, "/plan": slow.route }), fallback });
    const loading = session.start();
    await session.logMeasurement(measurement("no_ice"), 65);
    await loading;

    // The slow request was aborted; the user's action stands, honestly labelled mock.
    expect(session.getSnapshot()).toMatchObject({ plan: fallbackReplan, source: "mock", status: "ready" });
  });

  it("resets to the nominal API plan without a request", async () => {
    const fetch = routes({ ...healthy, "/plan": () => json(apiPlan), "/replan": () => json(apiReplan) });
    const session = await started(fetch);
    await session.logMeasurement(measurement("no_ice"), 65);
    const calls = fetch.mock.calls.length;

    session.reset();
    expect(session.getSnapshot()).toMatchObject({ plan: apiPlan, previous: null, measurements: [], status: "ready" });
    expect(fetch.mock.calls.length).toBe(calls);
  });

  it("retries the API on reset after a failed start", async () => {
    let up = false;
    const fetch = routes({
      "/health": () => json({ status: "ok", planner: "mock" }),
      "/plan": () => (up ? json(apiPlan) : json({ detail: "boom" }, 500)),
    });
    const session = await started(fetch);
    expect(session.getSnapshot().source).toBe("mock");

    up = true;
    session.reset();
    await waitFor(() => expect(session.getSnapshot().source).toBe("api"));
    expect(session.getSnapshot()).toMatchObject({ plan: apiPlan, planner: "mock", status: "ready" });
  });
});

describe("usePlanSession", () => {
  it("starts on mount, replans and aborts in-flight work on unmount", async () => {
    const fetch = routes({ ...healthy, "/plan": () => json(apiPlan), "/replan": () => json(apiReplan) });
    const { result, unmount } = renderHook(() => usePlanSession({ baseUrl: BASE, fetch, fallback }));
    await waitFor(() => expect(result.current.source).toBe("api"));

    await act(() => result.current.logMeasurement(measurement("no_ice"), 65));
    expect(result.current.plan).toEqual(apiReplan);
    expect(result.current.previous).toEqual(apiPlan);

    const hang = deferred();
    fetch.mockImplementationOnce(async (_url, init) => hang.route(init ?? {}));
    let outcome: Promise<string> | undefined;
    act(() => {
      outcome = result.current.logMeasurement(measurement("ice"), 70);
    });
    unmount();
    await expect(outcome).resolves.toBe("superseded");
  });

  it("stays on the mock without an API", () => {
    const { result } = renderHook(() => usePlanSession({ baseUrl: null, fallback }));
    expect(result.current).toMatchObject({ source: "mock", status: "ready", plan: demoPlan });
  });
});

describe("describeSource", () => {
  const base: PlanSessionState = {
    plan: demoPlan,
    previous: null,
    measurements: [],
    status: "ready",
    source: "mock",
    planner: null,
    isMock: false,
    error: null,
    apiConfigured: false,
  };

  it("never presents bundled data as planner output", () => {
    expect(describeSource(base)).toBe("Bundled mock data");
    expect(describeSource({ ...base, apiConfigured: true, status: "loading" })).toBe(
      "Connecting to the planner · bundled mock data",
    );
    expect(
      describeSource({ ...base, apiConfigured: true, status: "error", error: { kind: "network" } as never }),
    ).toBe("Planner API unavailable · bundled mock data");
  });

  it("says which planner answered", () => {
    const api = { ...base, apiConfigured: true, source: "api" as const };
    expect(describeSource({ ...api, planner: "real" })).toBe("Planner API · real planner");
    expect(describeSource({ ...api, planner: "mock" })).toBe("Planner API · mock planner");
    expect(describeSource({ ...api, planner: "real", isMock: true })).toBe("Planner API · mock planner");
    expect(describeSource({ ...api, planner: null })).toBe("Planner API");
    expect(describeSource({ ...api, status: "loading" })).toBe("Planner API · replanning");
    expect(describeSource({ ...api, status: "error", error: { kind: "timeout" } as never })).toBe(
      "Planner API · replan failed, showing the last plan",
    );
  });
});
