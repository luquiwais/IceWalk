import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it.each([
    ["advisory", "Advisory"],
    ["caution", "Caution"],
    ["warning", "Warning"],
  ] as const)("names the %s level in text, not only by color", (level, name) => {
    render(<StatusBadge level={level}>Dust opacity rising</StatusBadge>);

    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText("Dust opacity rising")).toBeInTheDocument();
  });

  it("announces warnings to assistive technology", () => {
    render(<StatusBadge level="warning">Solar particle event</StatusBadge>);

    expect(screen.getByRole("alert")).toHaveTextContent("Solar particle event");
  });

  it("keeps advisories and cautions polite", () => {
    render(<StatusBadge level="caution">Walkback margin under 30 min</StatusBadge>);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Walkback margin under 30 min",
    );
  });
});
