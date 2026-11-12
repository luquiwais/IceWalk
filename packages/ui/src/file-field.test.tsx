import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { FileField } from "./file-field";

it("selects multiple files and removes one by keyboard-accessible action", async () => {
  const change = vi.fn();
  render(<FileField label="Evidence" multiple accept="image/*,.csv" onValueChange={change} />);
  const photo = new File(["a"], "ice.png", { type: "image/png" });
  const data = new File(["a"], "data.csv", { type: "text/csv" });
  await userEvent.upload(screen.getByLabelText("Evidence"), [photo, data]);
  expect(change).toHaveBeenLastCalledWith([photo, data]);
  await userEvent.click(screen.getByRole("button", { name: "Remove ice.png" }));
  expect(change).toHaveBeenLastCalledWith([data]);
});

it("validates dropped file types, single mode, and disabled drops", () => {
  const change = vi.fn();
  const { rerender } = render(<FileField label="Evidence" accept=".csv" onValueChange={change} />);
  const input = screen.getByLabelText("Evidence");
  const drop = input.parentElement!;
  const csv = new File(["x"], "data.csv", { type: "text/csv" });
  const extra = new File(["x"], "other.csv", { type: "text/csv" });
  const invalid = new File(["x"], "image.png", { type: "image/png" });
  fireEvent.drop(drop, { dataTransfer: { files: [invalid] } });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Choose .csv files.");
  expect(change).not.toHaveBeenCalled();
  fireEvent.drop(drop, { dataTransfer: { files: [csv, extra] } });
  expect(change).toHaveBeenLastCalledWith([csv]);
  rerender(<FileField label="Evidence" disabled onValueChange={change} />);
  change.mockClear();
  fireEvent.drop(drop, { dataTransfer: { files: [invalid] } });
  expect(change).not.toHaveBeenCalled();
  expect(input).toBeDisabled();
});

it("leaves a controlled list owned by the caller", async () => {
  const file = new File(["x"], "data.csv");
  const change = vi.fn();
  render(<FileField label="Evidence" value={[file]} onValueChange={change} />);
  await userEvent.click(screen.getByRole("button", { name: "Remove data.csv" }));
  expect(change).toHaveBeenLastCalledWith([]);
  expect(screen.getByText("data.csv")).toBeVisible();
});

it("replaces the file in single mode and keeps description and validation linked", async () => {
  const change = vi.fn();
  render(<FileField label="Evidence" description="One CSV" error="Add the station file" onValueChange={change} />);
  const input = screen.getByLabelText("Evidence");
  expect(input).toHaveAccessibleDescription("One CSV Add the station file");
  expect(input).not.toHaveAttribute("multiple");
  const first = new File(["a"], "a.csv", { type: "text/csv" });
  const second = new File(["b"], "b.csv", { type: "text/csv" });
  await userEvent.upload(input, first);
  await userEvent.upload(input, second);
  expect(change).toHaveBeenLastCalledWith([second]);
  expect(screen.queryByText("a.csv")).not.toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Evidence selected files" })).toHaveTextContent("b.csv");
});

it("clears its own type error once a valid file arrives", () => {
  render(<FileField label="Evidence" accept=".csv" />);
  const input = screen.getByLabelText("Evidence");
  fireEvent.drop(input.parentElement!, { dataTransfer: { files: [new File(["x"], "image.png", { type: "image/png" })] } });
  expect(input).toHaveAttribute("aria-invalid", "true");
  fireEvent.drop(input.parentElement!, { dataTransfer: { files: [new File(["x"], "data.csv", { type: "text/csv" })] } });
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(screen.getByText("data.csv")).toBeVisible();
});
