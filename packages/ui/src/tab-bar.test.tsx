import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TabBar } from "./tab-bar";

const tabs = [
  { value: "planning", label: "Planning", icon: <svg /> },
  { value: "ev", label: "EV", icon: <svg /> },
  { value: "science", label: "Science", icon: <svg /> },
];

describe("TabBar", () => {
  it("is a vertical tab list with named icon tabs", () => {
    render(<TabBar label="Views" tabs={tabs} defaultValue="planning" />);

    expect(screen.getByRole("tablist", { name: "Views" })).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("moves with the up and down arrows and reports the selection", async () => {
    const onValueChange = vi.fn();
    render(
      <TabBar
        label="Views"
        tabs={tabs}
        defaultValue="planning"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: "Planning" }));
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "EV" })).toHaveFocus();

    await userEvent.click(screen.getByRole("tab", { name: "Science" }));
    expect(onValueChange).toHaveBeenLastCalledWith("science");
  });

  it("uses left and right arrows in the compact horizontal web layout", async () => {
    render(
      <TabBar
        label="Views"
        tabs={tabs}
        defaultValue="planning"
        orientation="horizontal"
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Planning" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "EV" })).toHaveFocus();
  });

  it("keeps a disabled view unavailable to pointer and keyboard activation", async () => {
    const onValueChange = vi.fn();
    render(
      <TabBar
        label="Views"
        tabs={[tabs[0], { ...tabs[1], disabled: true }, tabs[2]]}
        defaultValue="planning"
        onValueChange={onValueChange}
      />,
    );
    const disabledTab = screen.getByRole("tab", { name: "EV" });
    expect(disabledTab).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(disabledTab);
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("tab", { name: "Planning" }));
    await userEvent.keyboard("{ArrowDown}");
    // Base UI leaves disabled tabs discoverable, while blocking activation.
    expect(disabledTab).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(onValueChange).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Science" })).toHaveFocus();
  });

  it("expanded shows each label next to its symbol and keeps names and selection", async () => {
    render(<TabBar label="Views" tabs={tabs} defaultValue="ev" expanded />);

    const tab = screen.getByRole("tab", { name: "EV" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(tab).toHaveTextContent("EV");
    expect(screen.getByRole("tab", { name: "Planning" })).toHaveTextContent(
      "Planning",
    );
    expect(screen.getByRole("tablist", { name: "Views" })).toHaveAttribute(
      "data-expanded",
    );
  });

  it("collapsed hides the labels (they live in tooltips)", () => {
    render(<TabBar label="Views" tabs={tabs} defaultValue="ev" />);
    expect(screen.getByRole("tab", { name: "EV" })).not.toHaveTextContent("EV");
    expect(screen.getByRole("tablist", { name: "Views" })).not.toHaveAttribute(
      "data-expanded",
    );
  });
});
