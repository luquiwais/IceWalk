import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/site/site-scene", () => ({
  SiteScene: ({ plan, selectedStationId, hoveredStationId, onSelectStation, onHoverStation, measurements = [], layers, previousPlan, onMoveHabitat }: {
    plan: { stations: { id: string }[] }; selectedStationId: string | null; hoveredStationId: string | null;
    onSelectStation: (id: string) => void; onHoverStation: (id: string | null) => void;
    measurements?: { station_id: string }[]; layers: { grid: boolean; rings: boolean }; previousPlan?: unknown; onMoveHabitat?: (xy: [number, number]) => void;
  }) => <div aria-label="Map stations" data-testid="mock-map" data-hovered={hoveredStationId} data-grid={layers.grid} data-previous={Boolean(previousPlan)}>
    {plan.stations.map((s) => <button key={s.id} aria-pressed={s.id === selectedStationId} onClick={() => onSelectStation(s.id)} onMouseEnter={() => onHoverStation(s.id)}>Map {s.id}</button>)}
    {measurements.map((m) => <span key={m.station_id}>Measured {m.station_id}</span>)}
    {onMoveHabitat ? <button onClick={() => onMoveHabitat([800, -1200])}>Drag habitat</button> : null}
  </div>,
}));
vi.mock("@/components/globe/mars-globe", () => ({ MarsGlobe: ({ focus, onFocusComplete }: { focus?: unknown; onFocusComplete?: () => void }) => <div data-testid="mars-globe">{focus ? <button onClick={onFocusComplete}>Complete flight</button> : null}</div> }));
type StageProps = {
  jump?: { x: number; y: number }; mode: string; pose: { x: number; y: number }; onPose: (p: { x: number; y: number; headingDeg: number }) => void;
  plan: { stations: { id: string; order: number }[] }; measurements: { station_id: string }[]; reviewing?: boolean;
  onLog?: (station: unknown, result: string, depth: number, crew: string) => void; onAccept?: () => void; onReturn?: () => void; onLeave?: () => void;
};
// The 3D helmet view, reduced to what the shell wires: arrival logging, the plan update and the pose.
vi.mock("@/components/site3d/site-3d-stage", () => ({ Site3DStage: ({ jump, mode, pose, onPose, plan, measurements, reviewing, onLog, onAccept, onReturn, onLeave }: StageProps) => {
  const next = [...plan.stations].sort((a, b) => a.order - b.order).find((s) => !measurements.some((m) => m.station_id === s.id));
  return <div data-testid="site-3d" data-mode={mode} data-jump={jump ? `${jump.x},${jump.y}` : ""} data-pose={`${pose.x},${pose.y}`}>
    {mode === "helmet" && onLog && next ? (["ice", "no_ice", "inconclusive"] as const).map((r) => <button key={r} onClick={() => onLog(next, r, 1, "EV1")}>EV log {r}</button>) : null}
    {mode === "helmet" ? <button onClick={() => onPose({ x: 350, y: -2250, headingDeg: 0 })}>Move EV</button> : null}
    {mode === "helmet" && onLeave ? <button onClick={onLeave}>Switch role</button> : null}
    {reviewing ? <><button onClick={onAccept}>Copy, continue</button><button onClick={onReturn}>Copy, terminate</button></> : null}
  </div>;
} }));
import { demoConfirm, demoPlan, demoReplan, orderedStations, measuringTool } from "@/lib/plan";
import { habitatOf } from "@/components/site/site-data";
import { PlanningView } from "./planning-view";
const first = orderedStations(demoPlan)[0];
const second = orderedStations(demoPlan)[1];
const visible = { ignore: "script, style, [aria-hidden], [aria-hidden] *" };
const tab = (name: string) => screen.getByRole("tab", { name: new RegExp(name) });
/** From the EV helmet to the IV console, through the role choice. */
async function joinAsIV() {
  await userEvent.click(screen.getByRole("button", { name: "Switch role" }));
  await userEvent.click(screen.getByRole("button", { name: "Join as IV" }));
}

describe("Mission flow", () => {
  it("opens on the site: the globe, the question and the site card per tool", () => {
    render(<PlanningView />);
    expect(screen.getByTestId("mars-globe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Is there ice within reach here?" })).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Site card" });
    expect(card).toHaveTextContent("Out of reach");
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

  it("answers at the EVA level with the flight rules, and keeps the timeline and provenance", async () => {
    render(<PlanningView initialPhase="plan" />);
    const panel = screen.getByRole("region", { name: "EVA plan" });
    expect(panel).toHaveTextContent(/^(GO|NO-GO) ·/);
    expect(within(within(panel).getByRole("navigation", { name: "Review stations" })).getAllByRole("button")).toHaveLength(orderedStations(demoPlan).length);
    const rules = within(panel).getByRole("list", { name: "Flight rules" });
    expect(within(rules).getAllByRole("listitem")).toHaveLength(8);
    for (const name of ["Duration", "Walkback margin", "Distance out", "Route slope", "Comms gap", "Metabolic rate", "Carry per EV", "EVA window"]) expect(rules).toHaveTextContent(name);
    expect(screen.queryByRole("group", { name: "Plan timeline" })).not.toBeInTheDocument(); // opens on demand
    expect(screen.getByRole("group", { name: "Map legend" })).toHaveTextContent("Bundled mock data");
    expect(screen.getByRole("group", { name: "Map legend" })).toHaveTextContent("Station · select");
    expect(screen.getByText("Step 2 of 5 · Plan", visible)).toBeInTheDocument();
  });

  it("lets the crew choose the EVA goal and says why each station is there", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    expect(screen.getByRole("region", { name: "Why this station" })).toHaveTextContent(first.reason!);
    await userEvent.click(screen.getByRole("button", { name: "Back to plan" }));
    await userEvent.click(screen.getByRole("tab", { name: "Confirm ice" }));
    const c1 = orderedStations(demoConfirm)[0];
    await userEvent.click(await screen.findByRole("button", { name: `Map ${c1.id}` }));
    expect(screen.getByRole("region", { name: "Why this station" })).toHaveTextContent(c1.reason!);
    expect(screen.getByRole("region", { name: "After this station" })).toBeInTheDocument();
  });

  it("opens each rule's own evidence, never the same view twice", async () => {
    render(<PlanningView initialPhase="plan" />);
    const back = () => userEvent.click(screen.getByRole("button", { name: "Flight rules" }));
    await userEvent.click(screen.getByRole("button", { name: /^Distance out/ }));
    expect(screen.getByRole("region", { name: "Distance detail" })).toHaveTextContent("ICES-2026-127");
    await back();
    await userEvent.click(screen.getByRole("button", { name: /^Route slope/ }));
    expect(screen.getByRole("region", { name: "Slope detail" })).toHaveTextContent("Soil firmness");
    expect(screen.queryByRole("region", { name: "Distance detail" })).not.toBeInTheDocument();
    await back();
    await userEvent.click(screen.getByRole("button", { name: /^Comms gap/ }));
    expect(screen.getByRole("region", { name: "Comms detail" })).toHaveTextContent("Line of sight to habitat");
    await back();
    await userEvent.click(screen.getByRole("button", { name: /^EVA window/ }));
    expect(screen.getByRole("region", { name: "EVA window and weather" })).toHaveTextContent("Hope EMIRS (UAE)");
  });

  it("lets the planner drag the habitat before approval, and shows the planner's answer", async () => {
    render(<PlanningView initialPhase="plan" />);
    expect(screen.getByRole("group", { name: "Map legend" })).toHaveTextContent("Habitat · drag");
    await userEvent.click(screen.getByRole("button", { name: "Drag habitat" }));
    expect(await screen.findByText(/Habitat not moved: Moving the habitat needs the planner API/, visible)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    expect(screen.queryByRole("button", { name: "Drag habitat" })).not.toBeInTheDocument();
  });

  it("explains the ice map: probability and certainty in one legend, and the prior as background", async () => {
    render(<PlanningView initialPhase="plan" />);
    const legend = screen.getByRole("group", { name: "Map legend" });
    await within(legend).findByText(/Background 67% = regional prior/);
    expect(within(legend).getByRole("img", { name: /Brighter blue means likelier ice/ })).toBeInTheDocument();
    for (const text of ["P(ice within 3 m)", "Likelier", "Prior only", "Habitat", "Traverse", "349 craters"]) expect(legend).toHaveTextContent(text);
    const layers = screen.getByRole("region", { name: "Map layers" });
    const map = within(layers).getByRole("button", { name: "Ice map" });
    expect(map).toHaveAttribute("aria-pressed", "true");
    expect(within(layers).queryByRole("button", { name: "What measuring changed" })).not.toBeInTheDocument();
    await userEvent.click(within(layers).getByRole("button", { name: "Grid" }));
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-grid", "true");
  });

  it("shares selection and hover between map, list and timeline, and returns to the plan", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: "Timeline" }));
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    const block = within(timeline).getByRole("button", { name: new RegExp(first.id) });
    await userEvent.hover(block);
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-hovered", first.id);
    await userEvent.click(block);
    expect(screen.getByRole("heading", { name: `Station ${first.order} · ${first.id}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Map ${first.id}` })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Back to plan" }));
    expect(screen.getByRole("region", { name: "EVA plan" })).toBeInTheDocument();
  });

  it("navigates timeline station blocks with arrows and Enter", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: "Timeline" }));
    const timeline = screen.getByRole("group", { name: "Plan timeline" });
    within(timeline).getByRole("button", { name: new RegExp(first.id) }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(within(timeline).getByRole("button", { name: new RegExp(second.id) })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: `Station ${second.order} · ${second.id}` })).toBeInTheDocument();
  });

  it("keeps the selected station through Map focus", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: `Map ${first.id}` }));
    await userEvent.click(screen.getByRole("button", { name: "Map focus" }));
    expect(screen.queryByRole("heading", { name: `Station ${first.order} · ${first.id}` })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show plan window" }));
    expect(screen.getByRole("heading", { name: `Station ${first.order} · ${first.id}` })).toBeInTheDocument();
  });

  it("briefs the EVA on the 3D terrain, jumps to a station and goes for EVA", async () => {
    render(<PlanningView initialPhase="plan" />);
    await userEvent.click(screen.getByRole("button", { name: "Approve plan" }));
    expect(screen.getByRole("region", { name: "Approved plan" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Plan timeline" })).toBeInTheDocument(); // opens on approval
    await userEvent.click(screen.getByRole("button", { name: "Brief the EVA" }));
    expect(screen.getByTestId("site-3d")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-map")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Station ${first.order}, ${first.id}`) }));
    // Stands as the crew arrives: 15 m short of the station on the leg from the habitat, facing it.
    const [hx, hy] = habitatOf(demoPlan);
    const leg = Math.hypot(first.position[0] - hx, first.position[1] - hy);
    const [jx, jy] = (screen.getByTestId("site-3d").getAttribute("data-jump") ?? "").split(",").map(Number);
    expect(jx).toBeCloseTo(first.position[0] - ((first.position[0] - hx) / leg) * 15, 6);
    expect(jy).toBeCloseTo(first.position[1] - ((first.position[1] - hy) / leg) * 15, 6);
    // The window takes the station's name with a back arrow, as in Plan; back returns to the fly-over.
    expect(screen.getByRole("heading", { name: `Station ${first.order} · ${first.id}` })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to fly-over" }));
    expect(screen.getByRole("heading", { name: "Pre-EVA review: what will we find?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Station ${first.order}, ${first.id}`) }));
    expect(screen.getByRole("link", { name: "Print the EVA cuff checklist" })).toHaveAttribute("href", `/cuff?plan=${demoPlan.plan_id}`);
    expect(screen.getByRole("region", { name: `Station ${first.order} brief` })).toHaveTextContent("Expect:");
    // Going for EVA asks for confirmation; cancel keeps the brief.
    await userEvent.click(screen.getByRole("button", { name: "Go for EVA" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(tab("Brief")).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("button", { name: "Go for EVA" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm EVA" }));
    expect(tab("EVA")).toHaveAttribute("aria-selected", "true");
    // The EVA opens on the role choice: EV1 in the helmet or the IV console, each with a window of its own.
    const roles = screen.getByRole("region", { name: "Join the EVA" });
    expect(within(roles).getAllByRole("link", { name: /Open in a new window/ }).map((a) => a.getAttribute("href"))).toEqual(["/?phase=eva&role=ev1", "/?phase=eva&role=iv"]);
    expect(within(roles).getByRole("article", { name: "IV · Habitat console" })).toHaveTextContent("Does not log measurements");
    await userEvent.click(screen.getByRole("button", { name: "Join as EV1" }));
    expect(screen.queryByRole("region", { name: "Join the EVA" })).not.toBeInTheDocument();
    expect(screen.getByTestId("site-3d")).toHaveAttribute("data-mode", "helmet");
    expect(screen.getByRole("region", { name: "EV guide" })).toBeInTheDocument();
    await joinAsIV();
    expect(screen.getByTestId("mock-map")).toBeInTheDocument();
    expect(screen.getByText("SIM", visible)).toBeInTheDocument();
    // The IV switches back from its own panel.
    await userEvent.click(screen.getByRole("button", { name: "Switch role" }));
    expect(screen.getByRole("region", { name: "Join the EVA" })).toBeInTheDocument();
  });

  it("logs results only from the EV helmet; the IV console sees them and has no measurement controls", async () => {
    const { unmount } = render(<PlanningView initialPhase="execute" initialEvaView="iv" />);
    expect(screen.getByRole("region", { name: "Current station" })).toHaveTextContent(first.id);
    expect(screen.getByText(`Waiting for EV1 to report at ${first.id}.`, visible)).toBeInTheDocument();
    for (const name of ["Ice", "No ice", "Inconclusive", "Log measurement"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    unmount();
    render(<PlanningView initialPhase="execute" initialEvaView="ev" />);
    expect(screen.queryByRole("group", { name: "Plan timeline" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "EV log ice" }));
    await joinAsIV();
    expect(screen.getByRole("region", { name: "Next station" })).toHaveTextContent(second.id);
    expect(screen.getByText(new RegExp(`Last report: ${first.id} · ice at 1.0 m · EV1`), visible)).toBeInTheDocument();
  });

  it("replans after the EV's result: the EV copies it in the helmet, the IV reviews the old route against the new", async () => {
    render(<PlanningView initialPhase="execute" initialEvaView="ev" />);
    await userEvent.click(screen.getByRole("button", { name: "EV log no_ice" }));
    expect(screen.getByRole("button", { name: "Copy, continue" })).toBeInTheDocument();
    await joinAsIV();
    const review = screen.getByRole("region", { name: "Replan" });
    expect(review).toHaveTextContent(first.id);
    expect(review).toHaveTextContent(demoReplan.replan?.recommendation === "return_to_habitat" ? "EVA TERMINATE" : "Continue the EVA");
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-previous", "true");
    expect(screen.getByTestId("mock-map")).toHaveTextContent(`Measured ${first.id}`);
    await userEvent.click(within(review).getByRole("button", { name: "Concur with replan" }));
    expect(screen.queryByRole("region", { name: "Replan" })).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Session update" })).toHaveTextContent("Replan accepted");
  });

  it("terminates the EVA when the EV copies a terminate, and debriefs", async () => {
    render(<PlanningView initialPhase="execute" initialEvaView="ev" />);
    await userEvent.click(screen.getByRole("button", { name: "EV log no_ice" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy, terminate" }));
    await joinAsIV();
    expect(screen.getByText(/EVA TERMINATE · walkback to the habitat/, visible)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Debrief the EVA" }));
    expect(screen.getByRole("list", { name: "Measurement log" })).toHaveTextContent(first.id);
    await userEvent.click(screen.getByRole("button", { name: "Beyond one EVA" }));
    expect(screen.getByRole("img", { name: /P\(ice confirmed\) after 1 to 6 EVAs/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to the debrief" }));
    const layers = screen.getByRole("region", { name: "Map layers" });
    expect(within(layers).getByRole("button", { name: "What measuring changed" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Reset session" }));
    expect(screen.getByRole("region", { name: "Debrief" })).toHaveTextContent("No measurements yet");
  });

  it("keeps the walk across phase changes", async () => {
    render(<PlanningView initialPhase="execute" initialEvaView="ev" />);
    await userEvent.click(screen.getByRole("button", { name: "Move EV" }));
    expect(screen.getByTestId("site-3d")).toHaveAttribute("data-pose", "350,-2250");
    await userEvent.click(tab("Plan"));
    await userEvent.click(tab("EVA"));
    expect(screen.getByTestId("site-3d")).toHaveAttribute("data-pose", "350,-2250");
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
    render(<PlanningView initialPhase="execute" initialEvaView="ev" />);
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/plan"))).toBe(true));
    const before = Date.now();
    await userEvent.click(screen.getByRole("button", { name: "EV log ice" }));
    await userEvent.click(screen.getByRole("button", { name: "EV log no_ice" }));
    const call = fetch.mock.calls.find(([url]) => String(url).endsWith("/replan"))!;
    const body = JSON.parse((call as unknown as [string, RequestInit])[1].body as string);
    expect(body.measurement).toMatchObject({ station_id: first.id, tool: measuringTool(first), result: "ice", position: first.position });
    expect(Date.parse(body.measurement.timestamp)).toBeGreaterThanOrEqual(before);
    resolveReplan(response(demoReplan));
    await waitFor(() => expect(screen.getByRole("status", { name: "Session update" })).toHaveTextContent("Replanned traverse ready for review"));
    expect(screen.getByRole("button", { name: "Copy, continue" })).toBeInTheDocument();
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith("/replan"))).toHaveLength(1);
  });
});
