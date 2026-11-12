import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Select } from "./select";

const options = [{ value: "radar", label: "Radar", group: "Survey" }, { value: "drill", label: "Drill", group: "Sampling" }, { value: "locked", label: "Unavailable", disabled: true, group: "Sampling" }];

it("selects a grouped option with the keyboard and restores trigger focus", async () => {
  render(<Select label="Tool" options={options} defaultValue="radar" />);
  const trigger = screen.getByRole("combobox", { name: "Tool" });
  await userEvent.click(trigger);
  expect(await screen.findByRole("group", { name: "Survey" })).toBeVisible();
  await waitFor(() => expect(screen.getByRole("option", { name: "Radar" })).toHaveFocus());
  await userEvent.keyboard("d{Enter}");
  expect(trigger).toHaveTextContent("Drill");
  expect(trigger).toHaveFocus();
});

it("reports controlled selections, skips disabled options, and links errors", async () => {
  const change = vi.fn();
  const { rerender } = render(<Select label="Tool" options={options} value="radar" onValueChange={change} error="Choose a tool" />);
  const trigger = screen.getByRole("combobox");
  expect(trigger).toHaveAccessibleDescription("Choose a tool");
  await userEvent.click(trigger);
  expect(await screen.findByRole("option", { name: "Unavailable" })).toHaveAttribute("aria-disabled", "true");
  await userEvent.click(screen.getByRole("option", { name: "Drill" }));
  expect(change).toHaveBeenLastCalledWith("drill");
  expect(trigger).toHaveTextContent("Radar");
  rerender(<Select label="Tool" options={options} value="radar" disabled />);
  expect(trigger).toBeDisabled();
});

it("opens from the keyboard, never selects a disabled option, and closes with Escape", async () => {
  const change = vi.fn();
  render(<Select label="Tool" options={options} onValueChange={change} placeholder="Choose a tool" description="One per station" />);
  const trigger = screen.getByRole("combobox", { name: "Tool" });
  expect(trigger).toHaveTextContent("Choose a tool");
  expect(trigger).toHaveAccessibleDescription("One per station");
  expect(trigger).not.toHaveAttribute("aria-invalid");
  trigger.focus();
  await userEvent.keyboard("{Enter}");
  expect(await screen.findByRole("listbox")).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  expect(change).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  await screen.findByRole("listbox");
  await waitFor(() => expect(screen.getByRole("option", { name: "Radar" })).toHaveFocus());
  await userEvent.keyboard("{End}{Enter}");
  expect(screen.getByRole("option", { name: "Unavailable" })).toHaveFocus();
  expect(change).not.toHaveBeenCalled();
  await userEvent.keyboard("{ArrowUp}{Enter}");
  expect(change).toHaveBeenLastCalledWith("drill");
  expect(trigger).toHaveTextContent("Drill");
});

it("focuses the trigger from its label without opening the list", async () => {
  render(<Select label="Tool" options={options} defaultValue="radar" />);
  await userEvent.click(screen.getByText("Tool"));
  expect(screen.getByRole("combobox", { name: "Tool" })).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});
