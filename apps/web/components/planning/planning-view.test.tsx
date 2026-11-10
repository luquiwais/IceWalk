import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

// Cesium needs WebGL; the globe is checked in the browser, not in jsdom.
vi.mock("./site-map", () => ({
  SiteMap: ({
    plan,
    selectedId,
    onSelect,
    layer,
  }: {
    plan: { stations: { id: string }[] };
    selectedId: string | null;
    onSelect: (id: string) => void;
    layer: string;
  }) => (
    <div aria-label="Map stations" data-testid="mock-map" data-layer={layer}>
      {plan.stations.map((s) => (
        <button
          key={s.id}
          aria-pressed={s.id === selectedId}
          onClick={() => onSelect(s.id)}
        >
          Map {s.id}
        </button>
      ))}
    </div>
  ),
}));

import { formatDuration, formatNumber } from "@/lib/format";
import {
  demoMeasurement,
  demoPlan,
  demoReplan,
  diffPlans,
  orderedStations,
  toolName,
} from "@/lib/plan";

import { PlanningView } from "./planning-view";

const first = orderedStations(demoPlan)[0];

/** Secondary text also renders an aria-hidden vibrancy wash; query only what is exposed. */
const visible = { ignore: "script, style, [aria-hidden], [aria-hidden] *" };

describe("Planning view", () => {
  it("starts with an immersive scene and keeps secondary information closed", async () => {
    render(<PlanningView />);
    expect(
      screen.queryByRole("region", { name: "Mission brief" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Plan timeline" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    expect(screen.getByRole("button", { name: "Which tool?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await userEvent.click(screen.getByRole("button", { name: "Which tool?" }));
    expect(
      screen.getByRole("region", { name: "Which tool?" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(
      screen.queryByRole("region", { name: "Which tool?" }),
    ).not.toBeInTheDocument();
  });

  it("keeps simulated status visible while browsing sections and labels the mock data", async () => {
    render(<PlanningView />);
    const status = screen.getByRole("region", { name: "EVA status" });
    expect(
      within(status).getByText("Design demo · simulated data", visible),
    ).toBeInTheDocument();
    expect(
      within(status).getByRole("button", {
        name: `Walkback ${formatNumber(demoPlan.summary.min_walkback_margin_min!, 1)} min`,
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Which tool?" }));
    expect(status).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Which tool?" }),
    ).toHaveTextContent("Illustrative yield");
  });

  it("selects map layers without exposing a false disclosure control", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: "Layers" }));
    const layers = screen.getByRole("region", { name: "Layers" });
    const surface = within(layers).getByRole("button", {
      name: "Surface",
      pressed: true,
    });
    expect(layers.querySelector("[data-slot=list-disclosure]")).toBeNull();
    for (const button of within(layers).getAllByRole("button"))
      expect(button).toBeEnabled();
    await userEvent.click(
      within(layers).getByRole("button", { name: "Ice potential" }),
    );
    expect(
      within(layers).getByRole("button", {
        name: "Ice potential",
        pressed: true,
      }),
    ).toBeInTheDocument();
    expect(surface).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("mock-map")).toHaveAttribute(
      "data-layer",
      "potential",
    );
  });

  it("restores the selected station after Map focus and opens map picks in the window", async () => {
    render(<PlanningView />);
    await userEvent.click(
      screen.getByRole("button", { name: `Map ${first.id}` }),
    );
    expect(
      screen.getByRole("heading", { name: `Station ${first.id}` }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Map focus" }));
    expect(
      screen.queryByRole("heading", { name: `Station ${first.id}` }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "EVA status" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Show planning window" }),
    );
    expect(
      screen.getByRole("heading", { name: `Station ${first.id}` }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Map focus" }));
    const second = orderedStations(demoPlan)[1];
    await userEvent.click(
      screen.getByRole("button", { name: `Map ${second.id}` }),
    );
    expect(
      screen.getByRole("heading", { name: `Station ${second.id}` }),
    ).toBeInTheDocument();
  });

  it("shares selection between the mini-timeline, station detail and map", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: "Timeline" }));
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    await userEvent.click(
      within(timeline).getByRole("button", { name: new RegExp(first.id) }),
    );
    expect(
      screen.getByRole("heading", { name: `Station ${first.id}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Map ${first.id}` }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(
      within(screen.getByRole("group", { name: "Plan timeline" })).getByRole(
        "button",
        { name: new RegExp(first.id) },
      ),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("records an EV measurement, carries the replan into Science and approves it locally", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    expect(
      screen.getByRole("region", { name: "Station procedure" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "No ice" }));
    expect(
      screen.getByRole("status", { name: "Session update" }),
    ).toHaveTextContent("No ice");
    await userEvent.click(screen.getByRole("tab", { name: "Science" }));
    expect(
      screen.getByRole("region", { name: "Measurement log" }),
    ).toHaveTextContent(first.id);
    await userEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    expect(
      screen.getByRole("status", { name: "Session update" }),
    ).toHaveTextContent("approved");
    expect(
      screen.getByRole("button", { name: "Plan approved" }),
    ).toBeDisabled();
  });

  it.each(["Ice", "Inconclusive"])(
    "keeps the nominal route after a simulated %s result",
    async (result) => {
      render(<PlanningView />);
      await userEvent.click(screen.getByRole("tab", { name: "EV" }));
      await userEvent.click(screen.getByRole("button", { name: result }));
      expect(
        screen.getByRole("status", { name: "Session update" }),
      ).toHaveTextContent("Nominal traverse retained");
      await userEvent.click(screen.getByRole("tab", { name: "Science" }));
      expect(
        screen.getByRole("region", { name: "Measurement log" }),
      ).toHaveTextContent(result);
      await userEvent.click(screen.getByRole("button", { name: "Reset demo" }));
      expect(
        screen.getByRole("region", { name: "Measurement log" }),
      ).toHaveTextContent("Waiting for the first measurement");
    },
  );

  it("rejects a measurement beyond the mock drill's reach", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    const depth = screen.getByRole("spinbutton", {
      name: "Measurement depth (m)",
    });
    await userEvent.clear(depth);
    await userEvent.type(depth, "5");
    await userEvent.click(screen.getByRole("button", { name: "No ice" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a depth from 0 to 1 m",
    );
    expect(
      screen.getByRole("status", { name: "Session update" }),
    ).toBeEmptyDOMElement();
  });

  it("reveals the brief and safety details on demand", async () => {
    render(<PlanningView />);

    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    const summary = screen
      .getAllByRole("region", { name: "Mission brief" })
      .at(-1)!;
    expect(
      within(summary).getByText(
        formatDuration(demoPlan.summary.duration_min),
        visible,
      ),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText(
        formatNumber(demoPlan.summary.distance_km, 2),
        visible,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Walkback/ }));
    expect(
      screen.getAllByText(
        `${formatNumber(demoPlan.summary.min_walkback_margin_min!, 1)} min`,
        visible,
      ).length,
    ).toBeGreaterThan(0);
    for (const alert of demoPlan.alerts ?? []) {
      expect(
        screen.getAllByText(alert.message, visible).length,
      ).toBeGreaterThan(0);
    }
  });

  it("opens a station card with crew tasks, tools and its decision point", async () => {
    render(<PlanningView />);

    await userEvent.click(
      screen.getByRole("button", { name: `Map ${first.id}` }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Station details" }),
    );

    expect(
      screen.getByRole("heading", { level: 2, name: `Station ${first.id}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(first.hypothesis, visible)).toBeInTheDocument();
    for (const task of first.tasks.EV1 ?? [])
      expect(screen.getByText(task, visible)).toBeInTheDocument();
    for (const tool of first.tools)
      expect(
        screen.getAllByText(toolName(tool), visible).length,
      ).toBeGreaterThan(0);

    const point = demoPlan.decision_points!.find(
      (p) => p.station_id === first.id,
    )!;
    const decision = screen.getByRole("region", { name: "Decision point" });
    expect(
      within(decision).getByText(point.options[0].rationale, visible),
    ).toBeInTheDocument();
    if (point.hard_stop)
      expect(
        within(decision).getByText(point.hard_stop, visible),
      ).toBeInTheDocument();
  });

  it("labels the bundled mock as such when no planner API is configured", async () => {
    render(<PlanningView />);
    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    expect(
      screen.getByText(`${demoPlan.plan_id} · Bundled mock data`, visible),
    ).toBeInTheDocument();
  });

  it("logs the demo measurement and shows what the replan changed", async () => {
    render(<PlanningView />);

    await userEvent.click(
      screen.getByRole("button", { name: `Map ${demoMeasurement.station_id}` }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Log measurement" }),
    );

    const replan = screen.getByRole("region", { name: "Replan" });
    expect(
      within(replan).getByText(new RegExp(demoPlan.plan_id), visible),
    ).toBeInTheDocument();
    const diff = diffPlans(demoPlan, demoReplan);
    expect(diff.removed.length + diff.added.length).toBeGreaterThan(0);
    if (diff.removed.length)
      expect(
        within(replan).getByText(
          diff.removed.map((s) => s.id).join(", "),
          visible,
        ),
      ).toBeInTheDocument();
    if (diff.added.length)
      expect(
        within(replan).getByText(
          diff.added.map((s) => s.id).join(", "),
          visible,
        ),
      ).toBeInTheDocument();

    // The window now shows the replanned plan.
    expect(
      screen.getByText(demoReplan.plan_id, { ...visible, exact: false }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Back to nominal plan" }),
    );
    expect(
      screen.queryByRole("region", { name: "Replan" }),
    ).not.toBeInTheDocument();
  });
});

describe("Planning view against the planner API", () => {
  const BASE = "http://planner.test";
  const apiPlan = { ...demoPlan, plan_id: "plan-api0001" };
  const apiReplan = {
    ...demoReplan,
    plan_id: "plan-api0002",
    replanned_from: "plan-api0001",
  };

  function respond(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  function planner(up = true) {
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const path = String(input).slice(BASE.length);
      if (!up) throw new TypeError("Failed to fetch");
      if (path === "/health") return respond({ status: "ok", planner: "real" });
      if (path === "/plan") return respond(apiPlan);
      if (path === "/replan") return respond(apiReplan);
      return respond({ detail: "Not Found" }, 404);
    });
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", BASE);
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("shows the planner's plan and sends a logged measurement to /replan", async () => {
    const fetch = planner();
    render(<PlanningView />);
    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    expect(
      await screen.findByText(
        `${apiPlan.plan_id} · Planner API · real planner`,
        visible,
      ),
    ).toBeInTheDocument();

    // Every result replans with the API, not only a negative one.
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    await userEvent.click(screen.getByRole("button", { name: "Ice" }));
    await waitFor(() =>
      expect(
        screen.getByRole("status", { name: "Session update" }),
      ).toHaveTextContent("Replanned traverse ready for review"),
    );

    const replan = fetch.mock.calls.find(([url]) =>
      String(url).endsWith("/replan"),
    )!;
    expect(JSON.parse(replan[1]!.body as string)).toMatchObject(
      {
        plan_id: apiPlan.plan_id,
        measurement: { station_id: first.id, result: "ice" },
      },
    );
    await userEvent.click(screen.getByRole("tab", { name: "Planning" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    expect(
      within(screen.getByRole("region", { name: "Replan" })).getByText(
        new RegExp(apiPlan.plan_id),
        visible,
      ),
    ).toBeInTheDocument();
  });

  it("falls back to the bundled mock and says so when the planner is down", async () => {
    planner(false);
    render(<PlanningView />);
    await userEvent.click(
      screen.getByRole("button", { name: "Mission brief" }),
    );
    expect(
      await screen.findByText(
        `${demoPlan.plan_id} · Planner API unavailable · bundled mock data`,
        visible,
      ),
    ).toBeInTheDocument();
  });
});
