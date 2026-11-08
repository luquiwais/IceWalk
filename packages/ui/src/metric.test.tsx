import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Metric } from "./metric";

describe("Metric", () => {
  it("shows the label, value and unit", () => {
    render(<Metric label="Distance" value="7.2" unit="km" />);

    const term = screen.getByText("Distance");
    const value = screen.getByText("7.2");

    expect(term.tagName).toBe("DT");
    expect(value.closest("dd")).toHaveTextContent("7.2 km");
  });

  it("uses tabular numbers so values line up", () => {
    render(<Metric label="Dose" value="0.16" unit="mSv" />);

    expect(screen.getByText("0.16")).toHaveClass("tabular-nums");
  });
});
