import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { RadioGroup, Radio } from "./radio-group";

it("uses named radio semantics and arrow navigation while skipping disabled choices", async () => {
  render(<RadioGroup label="Survey mode" defaultValue="a"><Radio value="a" label="Radar" /><Radio value="b" label="Unavailable" disabled /><Radio value="c" label="Drill" /></RadioGroup>);
  expect(screen.getByRole("radiogroup", { name: "Survey mode" })).toBeVisible();
  await userEvent.tab();
  await userEvent.keyboard("{ArrowDown}");
  expect(screen.getByRole("radio", { name: "Drill" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Drill" })).toHaveFocus();
});

it("preserves controlled state and disables the entire group", async () => {
  const change = vi.fn();
  const { rerender } = render(<RadioGroup label="Mode" value="a" onValueChange={change}><Radio value="a" label="Radar" /><Radio value="b" label="Drill" /></RadioGroup>);
  await userEvent.click(screen.getByRole("radio", { name: "Drill" }));
  expect(change).toHaveBeenLastCalledWith("b");
  expect(screen.getByRole("radio", { name: "Radar" })).toBeChecked();
  rerender(<RadioGroup label="Mode" value="a" disabled><Radio value="a" label="Radar" /></RadioGroup>);
  expect(screen.getByRole("radio")).toBeDisabled();
});

it("names the group once, links validation, and focuses the choice through its label", async () => {
  render(<RadioGroup label="Mode" error="Choose a mode" description="One per station"><Radio value="a" label="Radar" /><Radio value="b" label="Drill" /></RadioGroup>);
  const group = screen.getByRole("radiogroup", { name: "Mode" });
  expect(group).toHaveAttribute("aria-invalid", "true");
  expect(group).toHaveAccessibleDescription("One per station Choose a mode");
  expect(screen.queryByRole("group")).not.toBeInTheDocument();
  await userEvent.click(screen.getByText("Drill"));
  expect(screen.getByRole("radio", { name: "Drill" })).toBeChecked();
  await userEvent.keyboard("{ArrowUp}");
  expect(screen.getByRole("radio", { name: "Radar" })).toBeChecked();
});
