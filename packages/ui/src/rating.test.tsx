import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Rating } from "./rating";

it("selects a named rating with keyboard arrows", async () => {
  render(<Rating label="Image quality" defaultValue={2} />);
  expect(screen.getByRole("radiogroup", { name: "Image quality" })).toBeVisible();
  await userEvent.tab();
  await userEvent.keyboard("{ArrowRight}");
  expect(screen.getByRole("radio", { name: "3 of 5 stars" })).toBeChecked();
});

it("reports controlled ratings and blocks disabled interaction", async () => {
  const change = vi.fn();
  const { rerender } = render(<Rating label="Quality" value={2} onValueChange={change} />);
  await userEvent.click(screen.getByRole("radio", { name: "4 of 5 stars" }));
  expect(change).toHaveBeenLastCalledWith(4);
  expect(screen.getByRole("radio", { name: "2 of 5 stars" })).toBeChecked();
  rerender(<Rating label="Quality" value={2} disabled />);
  screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled());
});

it("honors a custom scale, wraps with arrows, and links validation without a nested group", async () => {
  render(<Rating label="Confidence" max={3} defaultValue={3} error="Rate the confidence" />);
  const group = screen.getByRole("radiogroup", { name: "Confidence" });
  expect(group).toHaveAccessibleDescription("Rate the confidence");
  expect(group).toHaveAttribute("aria-invalid", "true");
  expect(screen.queryByRole("group")).not.toBeInTheDocument();
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  await userEvent.tab();
  expect(screen.getByRole("radio", { name: "3 of 3 stars" })).toHaveFocus();
  await userEvent.keyboard("{ArrowLeft}");
  expect(screen.getByRole("radio", { name: "2 of 3 stars" })).toBeChecked();
});

it("starts unrated with one tab stop", async () => {
  render(<Rating label="Quality" />);
  screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeChecked());
  await userEvent.tab();
  expect(screen.getByRole("radio", { name: "1 of 5 stars" })).toHaveFocus();
  await userEvent.keyboard(" ");
  expect(screen.getByRole("radio", { name: "1 of 5 stars" })).toBeChecked();
});
