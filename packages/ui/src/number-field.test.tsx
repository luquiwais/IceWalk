import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { NumberField } from "./number-field";

it("steps with arrows, Shift, page keys and bounded Home/End, including visible units", async () => {
  render(<NumberField label="Depth" defaultValue={1} min={0} max={20} step={0.5} unit="m" />);
  const input = screen.getByRole("spinbutton", { name: "Depth" });
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowUp}");
  expect(input).toHaveAttribute("aria-valuenow", "1.5");
  await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
  expect(input).toHaveAttribute("aria-valuenow", "6.5");
  await userEvent.keyboard("{PageUp}");
  expect(input).toHaveAttribute("aria-valuenow", "11.5");
  await userEvent.keyboard("{PageDown}{Home}");
  expect(input).toHaveAttribute("aria-valuenow", "0");
  await userEvent.keyboard("{End}{ArrowUp}");
  expect(input).toHaveAttribute("aria-valuenow", "20");
  expect(input).toHaveAttribute("aria-valuetext", "20 m");
  expect(screen.getByText("m")).toBeVisible();
});

it("keeps controlled values owned by the caller and formats decimals", async () => {
  const change = vi.fn();
  render(<NumberField label="Distance" value={1234.5} onValueChange={change} precision={2} locale="en-US" />);
  const input = screen.getByRole("spinbutton");
  expect(input).toHaveValue("1,234.50");
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowUp}");
  expect(change).toHaveBeenLastCalledWith(1235.5);
  expect(input).toHaveAttribute("aria-valuenow", "1234.5");
});

it("clears to null, clamps on blur, and exposes validation while disabling input", async () => {
  const change = vi.fn();
  const { rerender } = render(<NumberField label="Mass" min={0} max={10} defaultValue={5} onValueChange={change} />);
  const input = screen.getByRole("spinbutton");
  await userEvent.clear(input);
  expect(change).toHaveBeenLastCalledWith(null);
  await userEvent.type(input, "99");
  await userEvent.tab();
  expect(input).toHaveAttribute("aria-valuenow", "10");
  rerender(<NumberField label="Mass" disabled error="Unavailable" value={3} />);
  expect(input).toBeDisabled();
  expect(input).toHaveAccessibleDescription("Unavailable");
  await userEvent.type(input, "7");
  expect(input).toHaveAttribute("aria-valuenow", "3");
});

it("focuses the numeric input through its label and keeps ids unique", async () => {
  const { container } = render(<NumberField label="Depth" defaultValue={1} />);
  await userEvent.click(screen.getByText("Depth", { selector: "label" }));
  expect(screen.getByRole("spinbutton")).toHaveFocus();
  const ids = Array.from(container.querySelectorAll("[id]")).map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("steps with its buttons, stops at the limits, and stays fixed while read-only", async () => {
  const change = vi.fn();
  const { rerender } = render(<NumberField label="Depth" defaultValue={2.75} min={0} max={3} step={0.25} controls required onValueChange={change} />);
  const input = screen.getByRole("spinbutton", { name: "Depth" });
  expect(input).toBeRequired();
  expect(input).not.toHaveAttribute("aria-invalid");
  await userEvent.click(screen.getByRole("button", { name: "Increase Depth" }));
  expect(input).toHaveAttribute("aria-valuenow", "3");
  expect(screen.getByRole("button", { name: "Increase Depth" })).toBeDisabled();
  change.mockClear();
  rerender(<NumberField label="Depth" defaultValue={2.75} min={0} max={3} step={0.25} controls readOnly onValueChange={change} />);
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowDown}{PageDown}");
  expect(change).not.toHaveBeenCalled();
  expect(input).toHaveAttribute("aria-valuenow", "3");
});
