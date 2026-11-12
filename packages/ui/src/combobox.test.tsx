import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Combobox } from "./combobox";

const options = [{ value: "radar", label: "Ground radar" }, { value: "drill", label: "Drill" }, { value: "locked", label: "Unavailable", disabled: true }];

it("filters by displayed label and selects by keyboard", async () => {
  const change = vi.fn();
  render(<Combobox label="Tool search" options={options} onValueChange={change} />);
  const input = screen.getByRole("combobox", { name: "Tool search" });
  await userEvent.type(input, "Ground");
  expect(screen.getByRole("option", { name: "Ground radar" })).toBeVisible();
  expect(screen.queryByRole("option", { name: "Drill" })).not.toBeInTheDocument();
  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(change).toHaveBeenLastCalledWith("radar");
  expect(input).toHaveValue("Ground radar");
});

it("shows an empty result, exposes errors, and blocks a disabled field", async () => {
  const { rerender } = render(<Combobox label="Tool" options={options} error="Select an available tool" />);
  const input = screen.getByRole("combobox");
  expect(input).toHaveAccessibleDescription("Select an available tool");
  await userEvent.type(input, "missing");
  expect(screen.getByText("No matching options")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  expect(input).toHaveAttribute("aria-expanded", "false");
  rerender(<Combobox label="Tool" options={options} disabled value="radar" />);
  expect(input).toBeDisabled();
});

it("keeps controlled selection with the caller", async () => {
  const change = vi.fn();
  render(<Combobox label="Tool" options={options} value="radar" onValueChange={change} />);
  await userEvent.click(screen.getByRole("button", { name: "Show Tool options" }));
  await userEvent.click(await screen.findByRole("option", { name: "Drill" }));
  expect(change).toHaveBeenLastCalledWith("drill");
  expect(screen.getByRole("combobox")).toHaveValue("Ground radar");
});

it("focuses through its label, skips disabled options, and clears back to no selection", async () => {
  const change = vi.fn();
  render(<Combobox label="Tool" options={options} defaultValue="drill" onValueChange={change} />);
  await userEvent.click(screen.getByText("Tool"));
  const input = screen.getByRole("combobox", { name: "Tool" });
  expect(input).toHaveFocus();
  expect(input).toHaveValue("Drill");
  await userEvent.clear(input);
  expect(change).toHaveBeenLastCalledWith(null);
  await userEvent.type(input, "Unav");
  expect(await screen.findByRole("option", { name: "Unavailable" })).toHaveAttribute("aria-disabled", "true");
  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(change).not.toHaveBeenCalledWith("locked");
});
