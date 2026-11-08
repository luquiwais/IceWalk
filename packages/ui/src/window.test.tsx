import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Window, WindowHeader } from "./window";

describe("Window", () => {
  it("is a region named by its title", () => {
    render(
      <Window aria-labelledby="eva-title">
        <WindowHeader id="eva-title" title="EVA 1" subtitle="S1094b" />
      </Window>,
    );

    expect(screen.getByRole("region", { name: "EVA 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "EVA 1" })).toBeInTheDocument();
    expect(screen.getByText("S1094b")).toBeInTheDocument();
  });

  it("can use another heading level", () => {
    render(<WindowHeader title="Stations" level={3} />);

    expect(screen.getByRole("heading", { level: 3, name: "Stations" })).toBeInTheDocument();
  });
});
