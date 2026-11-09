import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu } from "./menu";

async function open(name = "Actions") {
  await userEvent.click(screen.getByRole("button", { name }));
  return screen.findByRole("menu");
}

describe("DropdownMenu (Figma: Menus)", () => {
  it("reserves the checkmark column only when some action is selectable", async () => {
    const { unmount } = render(
      <DropdownMenu
        label="Actions"
        items={[
          { id: "a", label: "Plain" },
          { id: "b", label: "Selectable", checked: false },
        ]}
      />,
    );
    await open();
    expect(screen.getAllByRole("menuitem").map((item) => item.querySelector("[data-slot='menu-check']") !== null)).toEqual([true, true]);
    unmount();

    render(<DropdownMenu label="Actions" items={[{ id: "a", label: "Plain" }]} />);
    await open();
    expect(screen.getByRole("menuitem", { name: "Plain" }).querySelector("[data-slot='menu-check']")).toBeNull();
  });

  it("renders section headers and accessory actions that run and close the menu", async () => {
    const cut = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        accessories={[{ id: "cut", label: "Cut", icon: <svg />, onSelect: cut }]}
        items={[
          { id: "a", label: "One" },
          { id: "b", label: "Two", section: "Section Header" },
        ]}
      />,
    );
    const menu = await open();
    expect(menu.querySelector("[data-slot='menu-section']")).toHaveTextContent("Section Header");
    await userEvent.click(screen.getByRole("menuitem", { name: "Cut" }));
    expect(cut).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("marks disabled actions for the 20% label treatment", async () => {
    render(<DropdownMenu label="Actions" items={[{ id: "a", label: "Copy", disabled: true }]} />);
    await open();
    expect(screen.getByRole("menuitem", { name: "Copy" })).toHaveAttribute("data-disabled");
  });
});
