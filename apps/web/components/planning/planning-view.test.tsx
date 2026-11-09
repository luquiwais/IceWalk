import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Cesium needs WebGL; the globe is checked in the browser, not in jsdom.
vi.mock("@/components/globe/mars-globe", () => ({ MarsGlobe: () => null }));

import { formatDuration } from "@/lib/format";
import { demoMeasurement, demoPlan, demoReplan, diffPlans, orderedStations, toolName } from "@/lib/plan";

import { PlanningView } from "./planning-view";

const first = orderedStations(demoPlan)[0];

/** Secondary text also renders an aria-hidden vibrancy wash; query only what is exposed. */
const visible = { ignore: "script, style, [aria-hidden], [aria-hidden] *" };

describe("Planning view", () => {
  it("shows the plan summary with real numbers and the planner alerts", () => {
    render(<PlanningView backdrop="mars" />);

    const summary = screen.getByRole("region", { name: "Summary" });
    expect(within(summary).getByText(formatDuration(demoPlan.summary.duration_min), visible)).toBeInTheDocument();
    expect(within(summary).getByText(`${demoPlan.summary.min_walkback_margin_min} min`, visible)).toBeInTheDocument();
    expect(within(summary).getByText(`≤ ${demoPlan.summary.ice_threshold_m} m`, visible)).toBeInTheDocument();
    for (const alert of demoPlan.alerts ?? []) {
      expect(screen.getByText(alert.message, visible)).toBeInTheDocument();
    }
  });

  it("opens a station card with crew tasks, tools and its decision point", async () => {
    render(<PlanningView backdrop="mars" />);

    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Station ${first.id}`) }));

    expect(screen.getByRole("heading", { level: 2, name: `Station ${first.id}` })).toBeInTheDocument();
    expect(screen.getByText(first.hypothesis, visible)).toBeInTheDocument();
    for (const task of first.tasks.EV1 ?? []) expect(screen.getByText(task, visible)).toBeInTheDocument();
    for (const tool of first.tools) expect(screen.getAllByText(toolName(tool), visible).length).toBeGreaterThan(0);

    const point = demoPlan.decision_points!.find((p) => p.station_id === first.id)!;
    const decision = screen.getByRole("region", { name: "Decision point" });
    expect(within(decision).getByText(point.options[0].rationale, visible)).toBeInTheDocument();
    if (point.hard_stop) expect(within(decision).getByText(point.hard_stop, visible)).toBeInTheDocument();
  });

  it("logs the demo measurement and shows what the replan changed", async () => {
    render(<PlanningView backdrop="mars" />);

    await userEvent.click(screen.getByRole("button", { name: new RegExp(`Station ${demoMeasurement.station_id}`) }));
    await userEvent.click(screen.getByRole("button", { name: "Log measurement" }));

    const replan = screen.getByRole("region", { name: "Replan" });
    expect(within(replan).getByText(new RegExp(demoPlan.plan_id), visible)).toBeInTheDocument();
    const diff = diffPlans(demoPlan, demoReplan);
    expect(diff.removed.length + diff.added.length).toBeGreaterThan(0);
    if (diff.removed.length) expect(within(replan).getByText(diff.removed.map((s) => s.id).join(", "), visible)).toBeInTheDocument();
    if (diff.added.length) expect(within(replan).getByText(diff.added.map((s) => s.id).join(", "), visible)).toBeInTheDocument();

    // The window now shows the replanned plan.
    expect(screen.getByText(demoReplan.plan_id, { ...visible, exact: false })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back to nominal plan" }));
    expect(screen.queryByRole("region", { name: "Replan" })).not.toBeInTheDocument();
  });
});
