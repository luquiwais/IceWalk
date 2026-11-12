import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TabBar } from "./tab-bar";
import { BackButton } from "./button";
import { Slider } from "./slider";

describe("visionOS spatial reveals (CSS only)", () => {
  it("shows each tab's symbol over its label, the label naming the tab", () => {
    render(<TabBar label="Views" defaultValue="planning" tabs={[{ value: "planning", label: "Planning", icon: <svg /> }]} />);
    const tab = screen.getByRole("tab", { name: "Planning" });
    expect(tab.querySelector("svg")?.closest("[aria-hidden]")).not.toBeNull();
  });

  it("names Back (iOS 26: a chevron in a circle) by its destination", () => {
    render(<BackButton label="Back to brief" />);
    const back = screen.getByRole("button", { name: "Back to brief" });
    expect(back.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the native range input as the slider, with its thumb decorative", () => {
    render(<Slider label="Traverse zoom" />);
    const slider = screen.getByRole("slider", { name: "Traverse zoom" });
    expect(slider).toHaveAttribute("type", "range");
    expect(slider.parentElement?.querySelector(".lb")).toHaveAttribute("aria-hidden", "true");
  });
});
