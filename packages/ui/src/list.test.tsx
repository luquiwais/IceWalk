import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ListRow, ListSection } from "./list";

describe("ListSection", () => {
  it("is a region named by its header, with its rows as list items", () => {
    render(
      <ListSection header="Stations" headerId="stations">
        <ListRow>Station S5</ListRow>
        <ListRow>Station S1</ListRow>
      </ListSection>,
    );

    const region = screen.getByRole("region", { name: "Stations" });
    expect(within(region).getAllByRole("listitem")).toHaveLength(2);
  });

  it("makes a row with an action a button", async () => {
    const onClick = vi.fn();
    render(
      <ListSection>
        <ListRow onClick={onClick}>Station S5</ListRow>
      </ListSection>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Station S5" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps static rows out of the tab order", () => {
    render(
      <ListSection>
        <ListRow>Duration</ListRow>
      </ListSection>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses a checkmark for selection without offering disclosure", async () => {
    const choose = vi.fn();
    render(
      <ListSection>
        <ListRow accessory="selection" selected onClick={choose}>
          Surface
        </ListRow>
      </ListSection>,
    );
    const row = screen.getByRole("button", { name: "Surface", pressed: true });
    expect(row).not.toHaveAttribute("aria-expanded");
    expect(row.querySelector("[data-slot=list-disclosure]")).toBeNull();
    await userEvent.click(row);
    expect(choose).toHaveBeenCalledOnce();
  });

  it("announces a real disclosure's expanded state and target", () => {
    render(
      <ListSection>
        <ListRow expanded={false} controls="tool-details" onClick={() => {}}>
          Tools
        </ListRow>
      </ListSection>,
    );
    expect(
      screen.getByRole("button", { name: "Tools", expanded: false }),
    ).toHaveAttribute("aria-controls", "tool-details");
  });
});
