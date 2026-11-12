import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabBar } from "./tab-bar";
import { BackButton } from "./button";
import { Slider } from "./slider";

afterEach(() => vi.useRealTimers());

describe("visionOS spatial reveals", () => {
  it("keeps tab icon and label nodes anchored while expanding after intent", () => {
    vi.useFakeTimers();
    render(<TabBar label="Views" defaultValue="planning" tabs={[{ value: "planning", label: "Planning", icon: <svg data-testid="fixed-icon" /> }]} />);
    const list = screen.getByRole("tablist"), icon = screen.getAllByTestId("fixed-icon")[0];
    const label = list.querySelector(".vision-tab-label");
    expect(list).not.toHaveAttribute("data-expanded");
    fireEvent.pointerEnter(list, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    expect(list).toHaveAttribute("data-expanded");
    expect(screen.getAllByTestId("fixed-icon")[0]).toBe(icon);
    expect(list.querySelector(".vision-tab-label")).toBe(label);
    expect(label).not.toBeNull();
  });

  it("cancels a transient hover instead of revealing after the pointer left", () => {
    vi.useFakeTimers();
    render(<BackButton label="Back to brief" />);
    const back = screen.getByRole("button", { name: "Back to brief" });
    fireEvent.pointerEnter(back, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(60));
    fireEvent.pointerLeave(back);
    act(() => vi.advanceTimersByTime(1000));
    expect(back).not.toHaveAttribute("data-revealed");
  });

  it("reveals Back on keyboard focus without changing its accessible name", () => {
    render(<BackButton label="Back to brief" />);
    const back = screen.getByRole("button", { name: "Back to brief" });
    act(() => back.focus());
    expect(back).toHaveAttribute("data-revealed");
    expect(back.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("gives the regular slider a material thumb to reveal, retaining native range semantics", () => {
    render(<Slider label="Traverse zoom" />);
    const slider = screen.getByRole("slider", { name: "Traverse zoom" });
    expect(slider).toHaveAttribute("type", "range");
    expect(slider.parentElement?.querySelector(".range-spatial-thumb")).toHaveAttribute("aria-hidden", "true");
  });
});
