import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Body, Footnote, LargeTitle, Text, Title3 } from "./text";

describe("Text", () => {
  it("applies the text style and renders a paragraph by default", () => {
    render(<Body>Duration</Body>);

    const text = screen.getByText("Duration");
    expect(text.tagName).toBe("P");
    expect(text).toHaveClass("text-body", "text-label");
  });

  it("renders the element it is given, keeping the style", () => {
    render(<Title3 as="h3">Stations</Title3>);

    const heading = screen.getByRole("heading", { level: 3, name: "Stations" });
    expect(heading).toHaveClass("text-title-3");
  });

  it("uses the secondary and tertiary label colors", () => {
    render(
      <>
        <Footnote tone="secondary">s1094b-eva1</Footnote>
        <Footnote tone="tertiary">draft</Footnote>
      </>,
    );

    expect(screen.getByText("s1094b-eva1")).toHaveClass("text-label-secondary");
    expect(screen.getByText("draft")).toHaveClass("text-label-tertiary");
  });

  it("lets a weight override the style's weight", () => {
    render(<Text variant="body" weight="semibold">Replan</Text>);

    expect(screen.getByText("Replan")).toHaveClass("text-body", "font-semibold");
  });

  it("keeps the given class names", () => {
    render(<LargeTitle className="truncate">EVA 1</LargeTitle>);

    expect(screen.getByText("EVA 1")).toHaveClass("text-large-title", "truncate");
  });
});
