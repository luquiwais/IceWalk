import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TextArea } from "./text-area";

it("accepts multiline text and enforces its limit with a counter", async () => {
  render(<TextArea label="Notes" maxLength={8} counter autoGrow />);
  await userEvent.type(screen.getByRole("textbox", { name: "Notes" }), "Ice{Enter}nearby");
  expect(screen.getByRole("textbox")).toHaveValue("Ice\nnear");
  expect(screen.getByText("8 / 8 characters")).toBeVisible();
});

it("supports controlled text, associated errors, and disabled input", async () => {
  const change = vi.fn();
  const { rerender } = render(<TextArea label="Notes" value="A" onValueChange={change} error="Required evidence" />);
  await userEvent.type(screen.getByRole("textbox"), "B");
  expect(change).toHaveBeenLastCalledWith("AB");
  expect(screen.getByRole("textbox")).toHaveValue("A");
  expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Required evidence");
  rerender(<TextArea label="Notes" disabled value="A" />);
  expect(screen.getByRole("textbox")).toBeDisabled();
});

it("focuses through its label, keeps uncontrolled text, and forwards native change events", async () => {
  const native = vi.fn();
  render(<TextArea label="Notes" defaultValue="Dry" description="Station log" onChange={native} required />);
  await userEvent.click(screen.getByText("Notes"));
  const area = screen.getByRole("textbox", { name: "Notes" });
  expect(area).toHaveFocus();
  expect(area).toBeRequired();
  expect(area).not.toHaveAttribute("aria-invalid");
  expect(area).toHaveAccessibleDescription("Station log");
  await userEvent.type(area, " regolith");
  expect(area).toHaveValue("Dry regolith");
  expect(native).toHaveBeenCalled();
});

it("does not accept typing while disabled", async () => {
  const change = vi.fn();
  render(<TextArea label="Notes" defaultValue="Dry" disabled onValueChange={change} />);
  await userEvent.type(screen.getByRole("textbox"), "x");
  expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox")).toHaveValue("Dry");
});
