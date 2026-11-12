import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { OTPField } from "./otp-field";

it("distributes pasted digits, reports completion, and supports arrow navigation", async () => {
  const complete = vi.fn();
  render(<OTPField label="Access code" length={4} onComplete={complete} />);
  const slots = screen.getAllByRole("textbox");
  await userEvent.click(slots[0]);
  await userEvent.paste("1a234");
  expect(slots.map((slot) => (slot as HTMLInputElement).value).join("")).toBe("1234");
  expect(complete).toHaveBeenLastCalledWith("1234");
  await userEvent.keyboard("{ArrowLeft}");
  expect(slots[2]).toHaveFocus();
  expect(slots[0]).toHaveAccessibleName("Access code");
  expect(slots[1]).toHaveAccessibleName("Access code digit 2 of 4");
});

it("keeps controlled content, announces validation, and disables all slots", async () => {
  const change = vi.fn();
  const { rerender } = render(<OTPField label="Code" length={4} value="12" onValueChange={change} error="Incomplete code" />);
  const slots = screen.getAllByRole("textbox");
  await userEvent.click(slots[2]);
  await userEvent.type(slots[2], "3");
  expect(change).toHaveBeenLastCalledWith("123");
  expect(slots[2]).toHaveValue("");
  expect(slots[0]).toHaveAccessibleDescription("Incomplete code");
  rerender(<OTPField label="Code" length={4} value="12" disabled />);
  screen.getAllByRole("textbox").forEach((slot) => expect(slot).toBeDisabled());
});

it("focuses the first slot through its label and supports deleting a digit", async () => {
  const { container } = render(<OTPField label="Code" length={4} defaultValue="1234" />);
  await userEvent.click(screen.getByText("Code", { selector: "label" }));
  const slots = screen.getAllByRole("textbox");
  expect(slots[0]).toHaveFocus();
  await userEvent.keyboard("{Delete}");
  expect(slots.map((slot) => (slot as HTMLInputElement).value).join("")).toBe("234");
  const ids = Array.from(container.querySelectorAll("[id]")).map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it("rejects non-digits and moves back with Backspace", async () => {
  const change = vi.fn();
  render(<OTPField label="Code" length={4} onValueChange={change} required />);
  const slots = screen.getAllByRole("textbox");
  await userEvent.click(slots[0]);
  await userEvent.keyboard("a");
  expect(change).not.toHaveBeenCalled();
  await userEvent.keyboard("12");
  expect(slots[2]).toHaveFocus();
  await userEvent.keyboard("{Backspace}");
  expect(change).toHaveBeenLastCalledWith("1");
  expect(slots[1]).toHaveFocus();
});
