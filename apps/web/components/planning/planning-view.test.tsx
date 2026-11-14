import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/site/site-scene", () => ({
  SiteScene: ({ plan, selectedStationId, hoveredStationId, onSelectStation, onHoverStation, measurements = [], layers, previousPlan }: {
    plan: { stations: { id: string }[] }; selectedStationId: string | null; hoveredStationId: string | null;
    onSelectStation: (id: string) => void; onHoverStation: (id: string | null) => void;
    measurements?: { station_id: string }[]; layers: { grid: boolean; rings: boolean }; previousPlan?: unknown;
  }) => <div aria-label="Map stations" data-testid="mock-map" data-hovered={hoveredStationId} data-grid={layers.grid} data-previous={Boolean(previousPlan)}>
    {plan.stations.map((s) => <button key={s.id} aria-pressed={s.id === selectedStationId} onClick={() => onSelectStation(s.id)} onMouseEnter={() => onHoverStation(s.id)}>Map {s.id}</button>)}
    {measurements.map((m) => <span key={m.station_id}>Measured {m.station_id}</span>)}
  </div>,
}));
vi.mock("@/components/globe/mars-globe", () => ({ MarsGlobe: ({ focus, onFocusComplete }: { focus?: unknown; onFocusComplete?: () => void }) => <div data-testid="mars-globe">{focus ? <button onClick={onFocusComplete}>Complete flight</button> : null}</div> }));
vi.mock("@/components/site3d/site-3d-stage", () => ({ Site3DStage: ({ jump }: { jump?: { x: number; y: number } }) => <div data-testid="site-3d" data-jump={jump ? `${jump.x},${jump.y}` : ""} /> }));
import { demoPlan, demoReplan, orderedStations, toolName, measuringTool } from "@/lib/plan";
import { PlanningView } from "./planning-view";
const first = orderedStations(demoPlan)[0];
const second = orderedStations(demoPlan)[1];
const visible = { ignore: "script, style, [aria-hidden], [aria-hidden] *" };
const tab = (name: string) => screen.getByRole("tab", { name: new RegExp(name) });

describe("Mission flow", () => {
  it("opens on the site: the globe, the question and the site card per tool", () => {
    render(<PlanningView />);
    expect(screen.getByTestId("mars-globe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Is there ice within reach here?" })).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Site card" });
    expect(card).toHaveTextContent("No-go");
    expect(card).toHaveTextContent("SkyFall radar");
    expect(screen.getByText(/not one of NASA's 51 exploration zones/, visible)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "EVA status" })).not.toBeInTheDocument();
  });

  it("flies to S1094b and lands on the plan, or skips the flight", async () => {
    const { unmount } = render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: "Fly to S1094b and plan the EVA" }));
    await userEvent.click(screen.getByRole("button", { name: "Complete flight" }));
    expect(screen.queryByTestId("mars-globe")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "EVA plan" })).toBeInTheDocument();
    unmount();
    render(<PlanningView />);
    await userEvent.click(screen.getByRole("button", { name: "Skip the flight" }));
    expect(screen.getByRole("heading", { name: "Where do we go, and is it safe?" })).toBeInTheDocument();
  });

  it("shows the plan numbers, go/no-go checks, stations, timeline and provenance", () => {
    render(<PlanningView initialPhase="plan" />);
    const panel = screen.getByRole("region", { name: "EVA plan" });
    expect(within(panel).getByLabelText("Plan numbers")).toBeInTheDocument();
    for (const s of orderedStations(demoPlan)) expect(within(panel).getByRole("button", { name: new RegExp(`Station ${s.order}, ${s.id}`) })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Go / no-go checks" })).toHaveTextContent("Comms with the habitat");
    expect(screen.getByRole("group", { name: "Plan timeline" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "EVA status" })).toHaveTextContent("Bundled mock data");
    expect(screen.getByText("Step 2 of 5 · Plan", visible)).toBeInTheDocument();
  });

  it("answers whether the EVA can be walked, and where the dust opacity comes from", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: /Can we walk it\?/ }));
    const card = screen.getByRole("region", { name: "Feasibility" });
    expect(card).toHaveTextContent("Soil firmness");
    expect(card).toHaveTextContent("ICES-2026-127");
    await userEvent.click(screen.getByRole("button", { name: /EVA window & space weather/ }));
    expect(screen.getByRole("region", { name: "EVA window and weather" })).toHaveTextContent("Hope EMIRS (UAE)");
  });

  it("explains the ice map: evidence dots, prior rings, likely zones and how much is known", async () => {
    render(<PlanningView initialPhase="plan" />);
    const legend = screen.getByRole("group", { name: "Map legend" });
    await within(legend).findByText(/Local evidence covers \d+% of the area shown/);
    for (const text of ["Where ice is likely", "Local evidence", "Regional prior only", "Ice likely zone", "Habitat", "Traverse", "349 craters"]) expect(legend).toHaveTextContent(text);
    const layers = screen.getByRole("region", { name: "Map layers" });
    const likely = within(layers).getByRole("button", { name: "Where ice is likely" });
    expect(likely).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(layers).getByRole("button", { name: "What we don't know" }));
    expect(legend).toHaveTextContent("No local data");
    expect(within(layers).queryByRole("button", { name: "What measuring changed" })).not.toBeInTheDocument();
    await userEvent.click(within(layers).getByRole("button", { name: "Grid" }));
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-grid", "true");
  });

  it("shares selection and hover between map, list and timeline, and returns to the plan", async () => {
    render(<PlanningView initialPhase="plan" />);
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    const block = within(timeline).getByRole("button", { name: new RegExp(first.id) });
    await userEvent.hover(block);
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-hovered", first.id);
    await userEvent.click(block);
    expect(screen.getByRole("heading", { name: `Station ${first.id}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Map ${first.id}` })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Back to plan" }));
    expect(screen.getByRole("region", { name: "EVA plan" })).toBeInTheDocument();
  });

  it("navigates timeline station blocks with arrows and Enter", async () => {
    render(<PlanningView initialPhase="plan" />);
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    within(timeline).getByRole("button", { name: new RegExp(first.id) }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(within(timeline).getByRole("button", { name: new RegExp(second.id) })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: `Station ${second.id}` })).toBeInTheDocument();
  });

  it("keeps the selected station through Map focus", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    await userEvent.click(screen.getByRole("button", { name: "Map focus" }));
    expect(screen.queryByRole("heading", { name: `Station ${first.id}` })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show plan window" }));
    expect(screen.getByRole("heading", { name: `Station ${first.id}` })).toBeInTheDocument();
  });

  it("briefs the EVA on the 3D terrain, jumps to a station and goes for EVA", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: "Brief the EVA in 3D" }));
    expect(screen.getByTestId("site-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-map")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Station ${first.order}, ${first.id}`) }));
    expect(screen.getByTestId("site-3d")).toHaveAttribute("data-jump", `${first.position[0] - 15},${first.position[1] - 15}`);
    expect(screen.getByRole("link", { name: "Print the EVA cuff checklist" })).toHaveAttribute("href", `/cuff?plan=${demoPlan.plan_id}`);
    await userEvent.click(screen.getByRole("button", { name: "Go for EVA" }));
    expect(tab("Execute")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("SIM", visible)).toBeInTheDocument();
  });

  it("executes a station, reviews the replan with the old route, and accepts it", async () => {
    render(<PlanningView initialPhase="execute" />);
    expect(screen.getByRole("region", { name: "Current station" })).toHaveTextContent(first.id);
    expect(screen.getByRole("region", { name: "Station procedure" })).toHaveTextContent(toolName(measuringTool(first)));
    for (const task of first.tasks.EV1 ?? []) expect(screen.getByText(task, visible)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "No ice" }));
    const review = screen.getByRole("region", { name: "Replan" });
    expect(review).toHaveTextContent(first.id);
    expect(review).toHaveTextContent(demoReplan.replan?.recommendation === "return_to_habitat" ? "EVA TERMINATE" : "Continue the EVA");
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-previous", "true");
    expect(screen.getByTestId("mock-map")).toHaveTextContent(`Measured ${first.id}`);
    await userEvent.click(within(review).getByRole("button", { name: "Accept replan" }));
    expect(screen.queryByRole("region", { name: "Replan" })).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-previous", "false");
    expect(screen.getByRole("status", { name: "Session update" })).toHaveTextContent("Replan accepted");
  });

  it("terminates the EVA from the replan review and debriefs", async () => {
    render(<PlanningView initialPhase="execute" />);
    await userEvent.click(screen.getByRole("button", { name: "No ice" }));
    await userEvent.click(screen.getByRole("button", { name: "Terminate EVA instead" }));
    expect(screen.getByText(/EVA TERMINATE · walkback to the habitat/, visible)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Station procedure" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Debrief the EVA" }));
    expect(screen.getByRole("region", { name: "Measurement log" })).toHaveTextContent(first.id);
    expect(screen.getByRole("img", { name: /P\(ice confirmed\) after 1 to 6 EVAs/ })).toBeInTheDocument();
    const layers = screen.getByRole("region", { name: "Map layers" });
    expect(within(layers).getByRole("button", { name: "What measuring changed" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Reset session" }));
    expect(screen.getByRole("region", { name: "Measurement log" })).toHaveTextContent("Waiting for the first measurement");
  });

  it.each(["Ice", "Inconclusive"])("moves to the next station after %s without a replan to review", async (result) => {
    render(<PlanningView initialPhase="execute" />);
    await userEvent.click(screen.getByRole("button", { name: result }));
    expect(screen.queryByRole("region", { name: "Replan" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Next station" })).toHaveTextContent(second.id);
    expect(screen.getByRole("status", { name: "Session update" })).toHaveTextContent("Nominal traverse retained");
  });

  it("rejects a depth beyond the assigned instrument's catalog reach", async () => {
    render(<PlanningView initialPhase="execute" />);
    const field = screen.getByRole("spinbutton", { name: "Measurement depth (m)" });
    await userEvent.clear(field);
    await userEvent.type(field, "5");
    await userEvent.click(screen.getByRole("button", { name: "No ice" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a depth from 0 to 1 m");
    expect(screen.getByRole("status", { name: "Session update" })).toBeEmptyDOMElement();
  });

  it("keeps compact screens usable: the phase window holds the station procedure", async () => {
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query === "(max-width: 759px)", addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    try {
      render(<PlanningView initialPhase="execute" />);
      expect(screen.getByRole("region", { name: "Current station" })).toHaveTextContent(first.id);
      expect(screen.getByRole("region", { name: "Station procedure" })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("Mission flow API states", () => {
  const BASE = "http://planner.test";
  function response(body: unknown) { return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }); }
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("labels API failure clearly and preserves the bundled plan", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", BASE);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<PlanningView initialPhase="plan" />);
    expect(await screen.findByText(/Using bundled mock data/, visible)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "EVA plan" })).toBeInTheDocument();
  });
  it("sends the current station instrument and a fresh timestamp, and prevents duplicate requests while loading", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLANNER_API_URL", BASE);
    let resolveReplan!: (value: Response) => void;
    const fetch = vi.fn(async (url: string) => url.endsWith("/health") ? response({ status: "ok", planner: "real" }) : url.endsWith("/plan") ? response(demoPlan) : url.endsWith("/replan") ? new Promise<Response>((resolve) => { resolveReplan = resolve; }) : Promise.reject(new TypeError("not mocked")));
    vi.stubGlobal("fetch", fetch);
    render(<PlanningView initialPhase="execute" />);
    await waitFor(() => expect(screen.getByRole("region", { name: "EVA status" })).toHaveTextContent("Planner API"));
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
    expect(screen.getByRole("region", { name: "Replan" })).toBeInTheDocument();
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith("/replan"))).toHaveLength(1);
  });
});
