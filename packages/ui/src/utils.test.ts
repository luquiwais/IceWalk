import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps a custom text style next to a text color", () => {
    expect(cn("text-caption-1", "text-label")).toBe("text-caption-1 text-label");
    expect(cn("text-large-title", "text-on-selected")).toBe("text-large-title text-on-selected");
  });

  it("still resolves conflicts between custom text styles", () => {
    expect(cn("text-body", "text-footnote")).toBe("text-footnote");
  });
});
