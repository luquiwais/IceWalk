import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { Ornament, OrnamentItem } from "@/components/ui/ornament";

describe("Ornament", () => {
  it("is a named toolbar navigated with the arrow keys", async () => {
    render(
      <Ornament aria-label="Map layers">
        <OrnamentItem render={<Button variant="borderless" />}>Probability</OrnamentItem>
        <OrnamentItem render={<Button variant="borderless" />}>Uncertainty</OrnamentItem>
      </Ornament>,
    );

    expect(screen.getByRole("toolbar", { name: "Map layers" })).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Probability" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Uncertainty" })).toHaveFocus();
  });
});
