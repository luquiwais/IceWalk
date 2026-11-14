import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/site/site-scene", () => ({
  SiteScene: ({ plan, selectedStationId, hoveredStationId, onSelectStation, onHoverStation, measurements = [], layers, projection }: {
    plan: { stations: { id: string }[] }; selectedStationId: string | null; hoveredStationId: string | null;
    onSelectStation: (id: string) => void; onHoverStation: (id: string | null) => void;
    measurements?: { station_id: string }[]; layers: { grid: boolean; rings: boolean }; projection?: { headingDeg: number };
  }) => <div aria-label="Map stations" data-testid="mock-map" data-hovered={hoveredStationId} data-grid={layers.grid} data-projected={Boolean(projection)}>
    {plan.stations.map((s) => <button key={s.id} aria-pressed={s.id === selectedStationId} onClick={() => onSelectStation(s.id)} onMouseEnter={() => onHoverStation(s.id)}>Map {s.id}</button>)}
    {measurements.map((m) => <span key={m.station_id}>Measured {m.station_id}</span>)}
  </div>,
}));
vi.mock("@/components/globe/mars-globe", () => ({ MarsGlobe: ({ focus, onFocusComplete }: { focus?: unknown; onFocusComplete?: () => void }) => <div data-testid="mars-globe">{focus ? <button onClick={onFocusComplete}>Complete flight</button> : null}</div> }));
import { demoPlan, demoReplan, orderedStations, toolName, measuringTool } from "@/lib/plan";
import { PlanningView } from "./planning-view";
const first = orderedStations(demoPlan)[0];
const second = orderedStations(demoPlan)[1];
const visible = { ignore: "script, style, [aria-hidden], [aria-hidden] *" };

describe("Mission table", () => {
  it("keeps EV guidance in the window on compact screens, leaving the map and minimap clear", async () => {
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query === "(max-width: 759px)", addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    try {
      render(<PlanningView />);
      await userEvent.click(screen.getByRole("tab", { name: "EV" }));
      expect(screen.getByRole("region", { name: "Current station" })).toHaveTextContent(first.id);
      expect(screen.getByRole("img", { name: "North-up traverse minimap" })).toBeInTheDocument();
      expect(screen.queryByText(`Next station · ${first.order} · ${first.id}`, visible)).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Station procedure" })).toHaveTextContent(toolName(measuringTool(first)));
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("shows an oblique real-ortho EV view with a north-up minimap", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-projected", "true");
    expect(screen.getByRole("img", { name: "North-up traverse minimap" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Science" }));
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-projected", "false");
  });
  it("offers the Mars globe and can enter the site without waiting for a flight", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: "View Mars" }));
    expect(screen.getByTestId("mars-globe")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fly to S1094b" }));
    expect(screen.getByRole("button", { name: "Complete flight" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enter site now" }));
    expect(screen.queryByTestId("mars-globe")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mission brief" })).toBeInTheDocument();
  });

  it("hands over to the site when the globe flight lands", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: "View Mars" }));
    expect(screen.queryByRole("region", { name: "Mission brief" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fly to S1094b" }));
    await userEvent.click(screen.getByRole("button", { name: "Complete flight" }));
    expect(screen.queryByTestId("mars-globe")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mission brief" })).toBeInTheDocument();
  });
  it("explains arcs, habitat, traverse and data origin in the map legend", () => {
    render(<PlanningView />);
    const legend = screen.getByRole("group", { name: "Map legend" });
    for (const text of ["P(ice ≤ 3 m)", "Habitat", "Traverse", "Model estimate", "349 craters", "Bundled mock data"]) expect(legend).toHaveTextContent(text);
  });
  it("keeps the Planning selection out of the EV scene and restores it on return", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    expect(screen.getByRole("button", { name: `Map ${first.id}` })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "Map layers" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Planning" }));
    expect(screen.getByRole("heading", { name: `Station ${first.id}` })).toBeInTheDocument();
  });

  it("shows the mission brief, stations, time, safety and provenance without opening anything", () => {
    render(<PlanningView />);
    expect(screen.getByRole("region", { name: "Mission brief" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Plan timeline" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "EVA status" })).toHaveTextContent("Bundled mock data");
    expect(screen.getByText("S1094b · 35.11°N, 189.83°E", visible)).toBeInTheDocument();
    const brief = screen.getByRole("region", { name: "Mission brief" });
    for (const station of orderedStations(demoPlan)) expect(within(brief).getByRole("button", { name: new RegExp(`Station ${station.order}, ${station.id}`) })).toBeInTheDocument();
    // The site card is open from the start: drill NO_GO, radar GO, SkyFall radar flagged as precursor.
    expect(screen.getByRole("button", { name: "Is it worth going? · Site card" })).toHaveAttribute("aria-expanded", "true");
    const card = screen.getByRole("region", { name: "Site card" });
    expect(card).toHaveTextContent("No-go");
    expect(card).toHaveTextContent("SkyFall radar");
    expect(screen.getByRole("button", { name: "Evidence · why trust it" })).toHaveAttribute("aria-expanded", "false");
  });

  it("shares selection and hover between map, list and timeline, and returns to Brief", async () => {
    render(<PlanningView />);
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    const block = within(timeline).getByRole("button", { name: new RegExp(first.id) });
    await userEvent.hover(block);
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-hovered", first.id);
    await userEvent.click(block);
    expect(screen.getByRole("heading", { name: `Station ${first.id}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Map ${first.id}` })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Back to brief" }));
    expect(screen.getByRole("region", { name: "Mission brief" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Map ${first.id}` })).toHaveAttribute("aria-pressed", "false");
  });

  it("navigates timeline station blocks with arrows and Enter", async () => {
    render(<PlanningView />);
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    const a = within(timeline).getByRole("button", { name: new RegExp(first.id) });
    const b = within(timeline).getByRole("button", { name: new RegExp(second.id) });
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(b).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: `Station ${second.id}` })).toBeInTheDocument();
  });

  it("does not move focus back to a previous tab when changing views", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    const science = screen.getByRole("tab", { name: "Science" });
    await userEvent.click(science);
    expect(science).toHaveFocus();
    const ev = screen.getByRole("tab", { name: "EV" });
    await userEvent.click(ev);
    expect(ev).toHaveFocus();
  });

  it("toggles real geometry layers and the ice map modes from the bundled real-model map", async () => {
    render(<PlanningView />);
    const layers = screen.getByRole("region", { name: "Map layers" });
    const grid = within(layers).getByRole("button", { name: "Grid" });
    await userEvent.click(grid);
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-grid", "true");
    // The map loads asynchronously; Ice potential starts on and can be switched off.
    const potential = await within(layers).findByRole("button", { name: "Ice potential" });
    expect(potential).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(potential);
    expect(potential).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(within(layers).getByRole("button", { name: "Uncertainty" }));
    expect(within(layers).getByRole("button", { name: "Uncertainty" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the selected station through Map focus", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    await userEvent.click(screen.getByRole("button", { name: "Map focus" }));
    expect(screen.queryByRole("heading", { name: `Station ${first.id}` })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show planning window" }));
    expect(screen.getByRole("heading", { name: `Station ${first.id}` })).toBeInTheDocument();
  });

  it("shows station tasks, tools and decisions and logs a negative result with Measured on the scene", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    for (const task of first.tasks.EV1 ?? []) expect(screen.getByText(task, visible)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Decision point" })).toBeInTheDocument();
    expect(screen.getAllByText(toolName(measuringTool(first)), visible).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Log measurement" }));
    expect(screen.getByRole("region", { name: "Replan" })).toHaveTextContent(first.id);
    expect(screen.getByTestId("mock-map")).toHaveTextContent(`Measured ${first.id}`);
    expect(screen.queryByText(/Replan leaves 2.2 min minimum walkback/, visible)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to nominal plan" }));
    expect(screen.queryByRole("region", { name: "Replan" })).not.toBeInTheDocument();
  });

  it.each(["Ice", "Inconclusive"])("moves to the next unmeasured station after %s without changing the nominal route", async (result) => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    await userEvent.click(screen.getByRole("button", { name: result }));
    expect(screen.getByRole("region", { name: "Next station" })).toHaveTextContent(second.id);
    expect(screen.getByRole("status", { name: "Session update" })).toHaveTextContent("Nominal traverse retained");
    await userEvent.click(screen.getByRole("tab", { name: "Science" }));
    expect(screen.getByRole("region", { name: "Measurement log" })).toHaveTextContent(first.id);
    await userEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    expect(screen.getByRole("button", { name: "Plan approved" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Reset session" }));
    expect(screen.getByRole("region", { name: "Measurement log" })).toHaveTextContent("Waiting for the first measurement");
  });

  it("rejects a depth beyond the assigned instrument's catalog reach", async () => {
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    const field = screen.getByRole("spinbutton", { name: "Measurement depth (m)" });
    await userEvent.clear(field);
    await userEvent.type(field, "5");
    await userEvent.click(screen.getByRole("button", { name: "No ice" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a depth from 0 to 1 m");
    expect(screen.getByRole("status", { name: "Session update" })).toBeEmptyDOMElement();
  });
});

describe("Mission table API states", () => {
  const BASE = "http://planner.test";
  function response(body: unknown) { return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }); }
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("labels API failure clearly and preserves the bundled plan", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", BASE);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<PlanningView />);
    expect(await screen.findByText(/Using bundled mock data/, visible)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mission brief" })).toBeInTheDocument();
  });
  it("sends the current station instrument and a fresh timestamp, and prevents duplicate requests while loading", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", BASE);
    let resolveReplan!: (value: Response) => void;
    const fetch = vi.fn(async (url: string) => url.endsWith("/health") ? response({ status: "ok", planner: "real" }) : url.endsWith("/plan") ? response(demoPlan) : new Promise<Response>((resolve) => { resolveReplan = resolve; }));
    vi.stubGlobal("fetch", fetch);
    render(<PlanningView />);
    await waitFor(() => expect(screen.getByRole("region", { name: "EVA status" })).toHaveTextContent("Planner API"));
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    const before = Date.now();
    await userEvent.click(screen.getByRole("button", { name: "Ice" }));
    expect(screen.getByRole("button", { name: "No ice" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Inconclusive" })).toBeDisabled();
    const call = fetch.mock.calls.find(([url]) => String(url).endsWith("/replan"))!;
    const body = JSON.parse((call as unknown as [string, RequestInit])[1].body as string);
    expect(body.measurement).toMatchObject({ station_id: first.id, tool: measuringTool(first), result: "ice", position: first.position });
    expect(Date.parse(body.measurement.timestamp)).toBeGreaterThanOrEqual(before);
    resolveReplan(response(demoReplan));
    await waitFor(() => expect(screen.getByRole("status", { name: "Session update" })).toHaveTextContent("Replanned traverse ready for review"));
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith("/replan"))).toHaveLength(1);
  });
});
