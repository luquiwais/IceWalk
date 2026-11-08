import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { Ornament, OrnamentItem } from "./ornament";

describe("Ornament", () => {
  it("is a named toolbar navigated with the arrow keys", async () => {
    render(
      <Ornament aria-label="Map layers">
        <OrnamentItem render={<Button variant="plain" />}>Probability</OrnamentItem>
        <OrnamentItem render={<Button variant="plain" />}>Uncertainty</OrnamentItem>
      </Ornament>,
    );

    expect(screen.getByRole("toolbar", { name: "Map layers" })).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Probability" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Uncertainty" })).toHaveFocus();
  });
});
