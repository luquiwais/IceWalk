import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Sidebar, SidebarItem } from "./sidebar";

describe("Sidebar", () => {
  it("is a navigation landmark that marks the current item", () => {
    render(
      <Sidebar label="EVA sections" title="EVA 1">
        <SidebarItem current>Overview</SidebarItem>
        <SidebarItem>Stations</SidebarItem>
      </Sidebar>,
    );

    expect(screen.getByRole("navigation", { name: "EVA sections" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Stations" })).not.toHaveAttribute("aria-current");
  });

  it("reports a selection and shows the counter as part of the name", async () => {
    const onSelect = vi.fn();
    render(
      <Sidebar label="EVA sections" title="EVA 1">
        <SidebarItem counter={4} onSelect={onSelect}>
          Stations
        </SidebarItem>
      </Sidebar>,
    );

    await userEvent.click(screen.getByRole("button", { name: /Stations/ }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /Stations/ })).toHaveTextContent("4");
  });

  it("skips disabled items with the keyboard and ignores their clicks", async () => {
    const onSelect = vi.fn();
    render(<Sidebar label="EVA sections" title="EVA 1"><SidebarItem disabled onSelect={onSelect}>Stations</SidebarItem><SidebarItem>Overview</SidebarItem></Sidebar>);

    expect(screen.getByRole("button", { name: "Stations" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Stations" }));
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
