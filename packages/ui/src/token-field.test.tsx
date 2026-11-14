import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TokenField } from "./token-field";

it("creates trimmed tokens using Enter/comma, rejects duplicates, and removes the last token with Backspace", async () => {
  render(<TokenField label="Filters" />);
  const input = screen.getByRole("textbox", { name: "Filters" });
  await userEvent.type(input, " radar {Enter}ice,radar{Enter}");
  expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
  await userEvent.keyboard("{Backspace}");
  expect(screen.queryByRole("button", { name: "Remove ice" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Remove radar" }));
  expect(input).toHaveFocus();
  expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
});

it("reports controlled values, links errors, and blocks disabled changes", async () => {
  const change = vi.fn();
  const { rerender } = render(<TokenField label="Filters" value={["ice"]} onValueChange={change} error="Review filters" />);
  await userEvent.click(screen.getByRole("button", { name: "Remove ice" }));
  expect(change).toHaveBeenLastCalledWith([]);
  expect(screen.getByRole("button", { name: "Remove ice" })).toBeVisible();
  expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Review filters");
  rerender(<TokenField label="Filters" value={["ice"]} disabled />);
  expect(screen.getByRole("textbox")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Remove ice" })).toBeDisabled();
});

it("focuses through its label, splits pasted lists, and commits the draft on blur", async () => {
  const change = vi.fn();
  render(<TokenField label="Filters" defaultValue={["ice"]} onValueChange={change} />);
  await userEvent.click(screen.getByText("Filters"));
  const input = screen.getByRole("textbox", { name: "Filters" });
  expect(input).toHaveFocus();
  await userEvent.paste("radar, ice , drill");
  expect(change).toHaveBeenLastCalledWith(["ice", "radar", "drill"]);
  expect(input).toHaveValue("");
  await userEvent.type(input, "thermal");
  await userEvent.tab();
  expect(change).toHaveBeenLastCalledWith(["ice", "radar", "drill", "thermal"]);
});

it("enforces a maximum number of tokens", async () => {
  const change = vi.fn();
  render(<TokenField label="Filters" defaultValue={["a"]} max={2} onValueChange={change} />);
  const input = screen.getByRole("textbox");
  await userEvent.type(input, "b{Enter}c{Enter}");
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenLastCalledWith(["a", "b"]);
  expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(2);
});
