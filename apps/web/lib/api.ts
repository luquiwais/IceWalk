/**
 * Typed client for the planner API (apps/planner/app/main.py). The JSON schemas in
 * packages/contracts are the source of truth; this client only checks the minimum
 * shape the UI relies on, so a wrong or proxy response fails loudly instead of
 * rendering garbage.
 */
import { isIceMap, type IceMap } from "./ice-map";
import type { Measurement, Plan } from "./plan";

export type PlannerErrorKind =
  /** NEXT_PUBLIC_PLANNER_API_URL is not set. */
  | "config"
  /** The request never got an HTTP response (offline, CORS, refused). */
  | "network"
  | "timeout"
  /** The caller aborted, usually because a newer request replaced this one. */
  | "aborted"
  /** HTTP status outside 2xx. */
  | "http"
  /** 2xx but the body is not JSON or lacks the fields the UI needs. */
  | "shape";

export class PlannerApiError extends Error {
  readonly kind: PlannerErrorKind;
  readonly status?: number;
  readonly url?: string;

  constructor(kind: PlannerErrorKind, message: string, options: { status?: number; url?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "PlannerApiError";
    this.kind = kind;
    this.status = options.status;
    this.url = options.url;
  }
}

export type ApiOptions = {
  /** Defaults to NEXT_PUBLIC_PLANNER_API_URL. */
  baseUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Defaults to the global fetch, looked up at call time. */
  fetch?: typeof fetch;
};

export type PlannerHealth = { status: string; planner: "real" | "mock" };
export type CatalogTool = { id: string; name?: string; [key: string]: unknown };
/** GET /eva-window (eva_window.schema.json); the UI reads it through lib/eva-window. */
export type EvaWindowPayload = Record<string, unknown> & { best?: unknown; sols?: unknown };

export type PlanRequest = { stm?: Record<string, unknown>; measurements: Measurement[] };
export type ReplanRequest = {
  plan_id: string;
  measurement: Measurement;
  elapsed_min: number;
  stm?: Record<string, unknown>;
};

const DEFAULT_TIMEOUT_MS = 8_000;
/** The real planner builds a GP and a traverse map; give it longer. */
const PLAN_TIMEOUT_MS = 20_000;

/**
 * Base URL of the planner API, or undefined when it is not configured. Read as a
 * literal so Next inlines it at build time.
 */
export function plannerBaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_PLANNER_API_URL?.trim();
  return url ? url.replace(/\/+$/, "") : undefined;
}

export function getHealth(options?: ApiOptions): Promise<PlannerHealth> {
  return request("/health", { method: "GET" }, isHealth, options);
}

export function getToolCatalog(options?: ApiOptions): Promise<CatalogTool[]> {
  return request("/catalog/tools", { method: "GET" }, isCatalog, options);
}

/** GET /maps: the ice map, with the measurements of `planId` applied when given. */
export function getIceMap(planId?: string, options?: ApiOptions): Promise<IceMap> {
  const query = planId ? `?plan_id=${encodeURIComponent(planId)}` : "";
  return request(`/maps${query}`, { method: "GET" }, isIceMap, { timeoutMs: PLAN_TIMEOUT_MS, ...options });
}

/** GET /eva-window: best EVA start in the next sols and conditions at each station. */
export function getEvaWindow(planId?: string, options?: ApiOptions): Promise<EvaWindowPayload> {
  const query = planId ? `?plan_id=${encodeURIComponent(planId)}` : "";
  return request(`/eva-window${query}`, { method: "GET" }, isObject as (b: unknown) => b is EvaWindowPayload, options);
}

export function postPlan(body: PlanRequest, options?: ApiOptions): Promise<Plan> {
  return request("/plan", post(body), isPlan, { timeoutMs: PLAN_TIMEOUT_MS, ...options });
}

export function postReplan(body: ReplanRequest, options?: ApiOptions): Promise<Plan> {
  return request("/replan", post(body), isPlan, { timeoutMs: PLAN_TIMEOUT_MS, ...options });
}

function post(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

async function request<T>(
  path: string,
  init: RequestInit,
  check: (body: unknown) => body is T,
  options: ApiOptions = {},
): Promise<T> {
  const base = options.baseUrl ?? plannerBaseUrl();
  if (!base) throw new PlannerApiError("config", "NEXT_PUBLIC_PLANNER_API_URL is not set");
  const url = `${base.replace(/\/+$/, "")}${path}`;
  const fetchImpl = options.fetch ?? globalThis.fetch;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });

  const interrupted = (cause: unknown) =>
    timedOut
      ? new PlannerApiError("timeout", `${path} timed out`, { url, cause })
      : options.signal?.aborted
        ? new PlannerApiError("aborted", `${path} was aborted`, { url, cause })
        : undefined;

  try {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (cause) {
      throw interrupted(cause) ?? new PlannerApiError("network", `${path}: planner API unreachable`, { url, cause });
    }

    if (!response.ok) {
      const detail = await errorDetail(response);
      throw new PlannerApiError("http", `${path} returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`, {
        status: response.status,
        url,
      });
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw interrupted(cause) ?? new PlannerApiError("shape", `${path} did not return JSON`, { url, cause });
    }
    if (!check(body)) throw new PlannerApiError("shape", `${path} returned an unexpected shape`, { url });
    return body;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", forwardAbort);
  }
}

/** FastAPI puts the reason in `detail`. */
async function errorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (isObject(body) && typeof body.detail === "string") return body.detail;
  } catch {
    // Not JSON: the status is enough.
  }
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHealth(body: unknown): body is PlannerHealth {
  return isObject(body) && typeof body.status === "string" && (body.planner === "real" || body.planner === "mock");
}

function isCatalog(body: unknown): body is CatalogTool[] {
  return Array.isArray(body) && body.every((t) => isObject(t) && typeof t.id === "string");
}

function isPosition(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === "number");
}

/** The fields the views read without a guard; the full check is the JSON schema. */
function isPlan(body: unknown): body is Plan {
  return (
    isObject(body) &&
    typeof body.plan_id === "string" &&
    typeof body.mission_id === "string" &&
    Array.isArray(body.stations) &&
    body.stations.length > 0 &&
    body.stations.every(
      (s) =>
        isObject(s) &&
        typeof s.id === "string" &&
        typeof s.order === "number" &&
        isPosition(s.position) &&
        Array.isArray(s.tools) &&
        isObject(s.tasks),
    ) &&
    Array.isArray(body.timeline) &&
    isObject(body.route) &&
    isObject(body.summary) &&
    typeof body.summary.duration_min === "number" &&
    typeof body.summary.distance_km === "number"
  );
}
