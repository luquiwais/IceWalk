import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Stepper } from "./stepper";

afterEach(() => vi.useRealTimers());

it("increments within limits and disables the bound control", async () => {
  render(<Stepper label="Crew" defaultValue={1} min={1} max={2} />);
  expect(screen.getByRole("button", { name: "Decrease Crew" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Increase Crew" }));
  expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "2");
  expect(screen.getByRole("button", { name: "Increase Crew" })).toBeDisabled();
});

it("repeats while held and stops after release", () => {
  vi.useFakeTimers();
  render(<Stepper label="Count" defaultValue={0} />);
  const increase = screen.getByRole("button", { name: "Increase Count" });
  fireEvent.pointerDown(increase, { button: 0, pointerId: 1, pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(1500));
  const held = Number(screen.getByRole("spinbutton").getAttribute("aria-valuenow"));
  expect(held).toBeGreaterThan(1);
  fireEvent.pointerUp(increase, { button: 0, pointerId: 1 });
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", `${held}`);
});

it("reports controlled changes without changing the provided value and respects disabled", async () => {
  const change = vi.fn();
  const { rerender } = render(<Stepper label="Count" value={2} onValueChange={change} />);
  await userEvent.click(screen.getByRole("button", { name: "Increase Count" }));
  expect(change).toHaveBeenLastCalledWith(3);
  expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "2");
  rerender(<Stepper label="Count" value={2} disabled />);
  expect(screen.getByRole("spinbutton")).toBeDisabled();
});

it("focuses through the label without duplicate input ids", async () => {
  const { container } = render(<Stepper label="Crew count" defaultValue={2} />);
  await userEvent.click(screen.getByText("Crew count", { selector: "label" }));
  expect(screen.getByRole("spinbutton")).toHaveFocus();
  const ids = Array.from(container.querySelectorAll("[id]")).map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("steps with the keyboard, clamps typed values on blur, and links validation", async () => {
  render(<Stepper label="Crew" defaultValue={2} min={1} max={4} unit="crew" error="Confirm the crew" description="1–4" />);
  const input = screen.getByRole("spinbutton", { name: "Crew" });
  expect(input).toHaveAccessibleDescription("1–4 Confirm the crew");
  expect(input).toHaveAttribute("aria-invalid", "true");
  await userEvent.click(input);
  await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
  expect(input).toHaveAttribute("aria-valuenow", "4");
  expect(input).toHaveAttribute("aria-valuetext", "4 crew");
  await userEvent.keyboard("{Home}");
  expect(input).toHaveAttribute("aria-valuenow", "1");
  await userEvent.clear(input);
  await userEvent.type(input, "9");
  await userEvent.tab();
  expect(input).toHaveAttribute("aria-valuenow", "4");
});

it("ignores its buttons while disabled", async () => {
  const change = vi.fn();
  render(<Stepper label="Crew" defaultValue={2} disabled onValueChange={change} />);
  await userEvent.click(screen.getByRole("button", { name: "Increase Crew" }));
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuenow", "2");
});
