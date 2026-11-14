import { afterEach, describe, expect, it, vi } from "vitest";
import mockMap from "@/mock/map.json";

import {
  getHealth,
  getIceMap,
  getToolCatalog,
  plannerBaseUrl,
  PlannerApiError,
  postPlan,
  postReplan,
} from "./api";
import { demoMeasurement, demoPlan, demoReplan } from "./plan";

const BASE = "http://planner.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** A fetch that never answers until its signal aborts, like a planner that hangs. */
function hangingFetch() {
  return vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        );
      }),
  );
}

async function failure(promise: Promise<unknown>): Promise<PlannerApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(PlannerApiError);
    return error as PlannerApiError;
  }
  throw new Error("expected the request to fail");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("plannerBaseUrl", () => {
  it("is undefined when the variable is missing or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", "");
    expect(plannerBaseUrl()).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", "   ");
    expect(plannerBaseUrl()).toBeUndefined();
  });

  it("trims whitespace and trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", " http://localhost:8000/ ");
    expect(plannerBaseUrl()).toBe("http://localhost:8000");
  });
});

describe("planner API client", () => {
  it("reads the planner mode from /health", async () => {
    const fetch = vi.fn(async () => json({ status: "ok", planner: "real" }));
    await expect(getHealth({ baseUrl: BASE, fetch })).resolves.toEqual({
      status: "ok",
      planner: "real",
    });
    expect(fetch).toHaveBeenCalledWith(`${BASE}/health`, expect.objectContaining({ method: "GET" }));
  });

  it("posts the STM and measurements to /plan and returns the plan", async () => {
    const fetch = vi.fn(async () => json(demoPlan));
    const plan = await postPlan({ measurements: [] }, { baseUrl: BASE, fetch });
    expect(plan.plan_id).toBe(demoPlan.plan_id);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/plan`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ measurements: [] });
  });

  it("posts the measurement and elapsed time to /replan", async () => {
    const fetch = vi.fn(async () => json(demoReplan));
    const plan = await postReplan(
      { plan_id: demoPlan.plan_id, measurement: demoMeasurement, elapsed_min: 65 },
      { baseUrl: BASE, fetch },
    );
    expect(plan.replanned_from).toBe(demoPlan.plan_id);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/replan`);
    expect(JSON.parse(init.body as string)).toEqual({
      plan_id: demoPlan.plan_id,
      measurement: demoMeasurement,
      elapsed_min: 65,
    });
  });

  it("reads the tool catalog and the ice map of a plan", async () => {
    const catalog = vi.fn(async () => json([{ id: "core_drill", name: "Core drill" }]));
    await expect(getToolCatalog({ baseUrl: BASE, fetch: catalog })).resolves.toEqual([
      { id: "core_drill", name: "Core drill" },
    ]);

    const map = vi.fn(async () => json(mockMap));
    const result = await getIceMap("plan-demo0001", { baseUrl: BASE, fetch: map });
    expect(result.width).toBe(mockMap.width);
    expect(map).toHaveBeenCalledWith(`${BASE}/maps?plan_id=plan-demo0001`, expect.anything());
  });

  it.each([404, 500])("reports HTTP %i with its status and the API detail", async (status) => {
    const fetch = vi.fn(async () => json({ detail: "Unknown plan_id" }, status));
    const error = await failure(
      postReplan(
        { plan_id: "missing", measurement: demoMeasurement, elapsed_min: 0 },
        { baseUrl: BASE, fetch },
      ),
    );
    expect(error.kind).toBe("http");
    expect(error.status).toBe(status);
    expect(error.message).toContain("Unknown plan_id");
  });

  it("reports a network failure", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const error = await failure(getHealth({ baseUrl: BASE, fetch }));
    expect(error.kind).toBe("network");
    expect(error.status).toBeUndefined();
  });

  it("gives up after the timeout and aborts the request", async () => {
    const fetch = hangingFetch();
    const error = await failure(getHealth({ baseUrl: BASE, fetch, timeoutMs: 5 }));
    expect(error.kind).toBe("timeout");
    const init = fetch.mock.calls[0][1] as RequestInit;
    expect(init.signal?.aborted).toBe(true);
  });

  it("tells a caller abort apart from a timeout", async () => {
    const controller = new AbortController();
    const pending = postPlan(
      { measurements: [] },
      { baseUrl: BASE, fetch: hangingFetch(), signal: controller.signal, timeoutMs: 10_000 },
    );
    controller.abort();
    expect((await failure(pending)).kind).toBe("aborted");
  });

  it("rejects a response that does not have the shape of a plan", async () => {
    const fetch = vi.fn(async () => json({ plan_id: "p1", stations: "none" }));
    const error = await failure(postPlan({ measurements: [] }, { baseUrl: BASE, fetch }));
    expect(error.kind).toBe("shape");
  });

  it("rejects a body that is not JSON", async () => {
    const fetch = vi.fn(async () => new Response("<html>proxy error</html>", { status: 200 }));
    expect((await failure(getHealth({ baseUrl: BASE, fetch }))).kind).toBe("shape");
  });

  it("rejects an unknown planner mode and a malformed map", async () => {
    const health = vi.fn(async () => json({ status: "ok", planner: "maybe" }));
    expect((await failure(getHealth({ baseUrl: BASE, fetch: health }))).kind).toBe("shape");
    const map = vi.fn(async () => json({ kind: "value" }));
    expect((await failure(getIceMap(undefined, { baseUrl: BASE, fetch: map }))).kind).toBe("shape");
  });

  it("fails without a request when no base URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", "");
    const fetch = vi.fn();
    expect((await failure(getHealth({ fetch }))).kind).toBe("config");
    expect(fetch).not.toHaveBeenCalled();
  });
});
