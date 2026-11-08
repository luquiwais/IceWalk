import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavigationBar, Window } from "./window";

describe("Window", () => {
  it("is a region named by its navigation bar title", () => {
    render(
      <Window aria-labelledby="eva-title">
        <NavigationBar id="eva-title" title="EVA 1" />
      </Window>,
    );

    expect(screen.getByRole("region", { name: "EVA 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "EVA 1" })).toBeInTheDocument();
  });

  it("can use another heading level", () => {
    render(<NavigationBar title="Stations" level={3} />);

    expect(screen.getByRole("heading", { level: 3, name: "Stations" })).toBeInTheDocument();
  });
});
