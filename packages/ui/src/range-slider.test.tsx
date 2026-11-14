import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { RangeSlider } from "./range-slider";

it("names both thumbs and moves each by keyboard within the range", async () => {
  render(<RangeSlider label="Depth" defaultValue={[1, 3]} min={0} max={5} step={0.5} unit="m" />);
  const lower = screen.getByRole("slider", { name: "Depth minimum" });
  const upper = screen.getByRole("slider", { name: "Depth maximum" });
  lower.focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(lower).toHaveAttribute("aria-valuenow", "1.5");
  upper.focus();
  await userEvent.keyboard("{End}{ArrowRight}");
  expect(upper).toHaveAttribute("aria-valuenow", "5");
  expect(upper).toHaveAttribute("aria-valuetext", "5 m");
});

it("reports a controlled pair without mutating it and prevents disabled changes", async () => {
  const change = vi.fn();
  const { rerender } = render(<RangeSlider label="Depth" value={[1, 3]} onValueChange={change} error="Review range" />);
  const lower = screen.getByRole("slider", { name: "Depth minimum" });
  lower.focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(change).toHaveBeenLastCalledWith([2, 3]);
  expect(lower).toHaveAttribute("aria-valuenow", "1");
  expect(lower).toHaveAccessibleDescription("Review range");
  rerender(<RangeSlider label="Depth" value={[1, 3]} disabled />);
  expect(lower).toBeDisabled();
});

it("keeps the handles ordered and clamps each one to the limits", async () => {
  const change = vi.fn();
  render(<RangeSlider label="Depth" defaultValue={[1, 2]} min={0} max={3} step={1} onValueChange={change} />);
  const lower = screen.getByRole("slider", { name: "Depth minimum" });
  const upper = screen.getByRole("slider", { name: "Depth maximum" });
  lower.focus();
  await userEvent.keyboard("{Home}{ArrowLeft}");
  expect(lower).toHaveAttribute("aria-valuenow", "0");
  await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}");
  const [low, high] = change.mock.lastCall![0];
  expect(low).toBeLessThanOrEqual(high);
  expect(Number(upper.getAttribute("aria-valuenow"))).toBeLessThanOrEqual(3);
  expect(screen.getByText(`${low}–${high}`)).toBeVisible();
});
