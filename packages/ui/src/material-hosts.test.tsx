import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button, IconButton } from "./button";
import { TextField } from "./fields";
import { ListRow, ListSection } from "./list";
import { DropdownMenu } from "./menu";
import { SegmentedControl } from "./segmented-control";
import { Sidebar, SidebarItem, SidebarSection } from "./sidebar";
import { TabBar } from "./tab-bar";
import { ToggleButton } from "./toggle-button";

/*
 * A material layer is `position: absolute; inset: 0; border-radius: inherit`, so
 * it only fits its component if its parent is positioned (vision-surface) and
 * carries the radius. A layer whose parent is not a vision-surface escapes to the
 * nearest positioned ancestor: a lighter rectangle with no rounded corners over
 * neighbouring rows.
 */
function layerHostsWithoutSurface(container: HTMLElement) {
  return [...container.querySelectorAll("[data-vision-layer]")]
    .map((layer) => layer.parentElement as HTMLElement)
    .filter((host) => !host.classList.contains("vision-surface"));
}

describe("material layer hosts", () => {
  it("every component that renders material layers renders them inside a vision-surface", () => {
    const { container } = render(
      <div>
        <Button>Button</Button>
        <IconButton label="Icon" ><svg /></IconButton>
        <ToggleButton>Toggle</ToggleButton>
        <TextField label="Field" />
        <SegmentedControl label="View" options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} defaultValue="a" />
        <TabBar label="Tabs" tabs={[{ value: "a", label: "A", icon: <svg /> }]} defaultValue="a" />
        <ListSection header="List" headerId="h">
          <ListRow onClick={() => {}}>Row</ListRow>
        </ListSection>
        <Sidebar label="Nav" title="Title">
          <SidebarSection heading="Section">
            <SidebarItem icon={<svg />}>Item</SidebarItem>
          </SidebarSection>
        </Sidebar>
      </div>,
    );
    expect(container.querySelectorAll("[data-vision-layer]").length).toBeGreaterThan(10);
    expect(layerHostsWithoutSurface(container)).toEqual([]);
  });

  it("menu rows and accessories render their layers inside a vision-surface", async () => {
    render(
      <DropdownMenu
        label="Actions"
        accessories={[{ id: "a", label: "Cut", icon: <svg /> }]}
        items={[{ id: "x", label: "One", checked: true }, { id: "y", label: "Two", items: [{ id: "z", label: "Three" }] }]}
      />,
    );
    await userEvent.click(document.querySelector("button")!);
    await document.body.querySelector("[role=menu]");
    expect(layerHostsWithoutSurface(document.body)).toEqual([]);
  });

  it("sidebar hover and selection are declarative: no item carries JS hover state and only the current one is selected", async () => {
    const { container } = render(
      <Sidebar label="Nav" title="Title">
        <SidebarItem current>One</SidebarItem>
        <SidebarItem>Two</SidebarItem>
        <SidebarItem>Three</SidebarItem>
      </Sidebar>,
    );
    const items = [...container.querySelectorAll("button")];
    for (const item of items) {
      await userEvent.hover(item);
      await userEvent.unhover(item);
    }
    expect(container.querySelectorAll("[aria-current]").length).toBe(1);
    expect(container.querySelectorAll("[data-hovered],[data-hover],[data-highlighted]").length).toBe(0);
  });
});
