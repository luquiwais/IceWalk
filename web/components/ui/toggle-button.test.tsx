import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToggleButton } from "@/components/ui/toggle-button";

describe("ToggleButton", () => {
  it("toggles its pressed state", async () => {
    render(<ToggleButton>Uncertainty</ToggleButton>);
    const toggle = screen.getByRole("button", { name: "Uncertainty" });

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("reports changes when controlled", async () => {
    const onPressedChange = vi.fn();
    render(
      <ToggleButton pressed onPressedChange={onPressedChange}>
        Probability
      </ToggleButton>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Probability" }));

    expect(onPressedChange).toHaveBeenCalledWith(false, expect.anything());
  });
});
