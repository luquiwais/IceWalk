import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

const views = [
  { value: "planning", label: "Planning" },
  { value: "ev", label: "EV" },
  { value: "science", label: "Science" },
];

describe("SegmentedControl", () => {
  it("marks the default option as selected", () => {
    render(
      <SegmentedControl label="View" options={views} defaultValue="planning" />,
    );

    expect(screen.getByRole("tab", { name: "Planning" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tablist", { name: "View" })).toBeInTheDocument();
  });

  it("selects an option on click and reports it", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        label="View"
        options={views}
        defaultValue="planning"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "EV" }));

    expect(screen.getByRole("tab", { name: "EV" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(onValueChange).toHaveBeenCalledWith("ev");
  });

  it("moves between options with the arrow keys", async () => {
    render(
      <SegmentedControl label="View" options={views} defaultValue="planning" />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Planning" }));
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "EV" })).toHaveFocus();
  });

  it("does not select a disabled option", async () => {
    render(
      <SegmentedControl
        label="View"
        options={[...views.slice(0, 2), { ...views[2], disabled: true }]}
        defaultValue="planning"
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Science" }));

    expect(screen.getByRole("tab", { name: "Planning" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("disables the entire group while retaining its selected value", async () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl label="View" options={views} defaultValue="planning" disabled onValueChange={onValueChange} />);

    // Base UI uses aria-disabled so tabs remain discoverable to assistive tech.
    for (const option of screen.getAllByRole("tab")) expect(option).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("tab", { name: "EV" }));
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveAttribute("aria-selected", "true");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
