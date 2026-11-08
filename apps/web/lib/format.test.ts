import { describe, expect, it } from "vitest";

import { formatDuration, formatNumber, formatPercent } from "@/lib/format";

describe("formatDuration", () => {
  it("shows hours and minutes for long EVAs", () => {
    expect(formatDuration(343.8)).toBe("5 h 44 min");
  });

  it("shows only minutes under one hour", () => {
    expect(formatDuration(45)).toBe("45 min");
  });

  it("drops the minutes when the duration is a whole number of hours", () => {
    expect(formatDuration(120)).toBe("2 h");
  });

  it("rounds to the nearest minute", () => {
    expect(formatDuration(59.6)).toBe("1 h");
  });
});

describe("formatNumber", () => {
  it("uses a fixed number of decimals", () => {
    expect(formatNumber(7.16, 1)).toBe("7.2");
    expect(formatNumber(0.16, 2)).toBe("0.16");
  });
});

describe("formatPercent", () => {
  it("formats a 0-1 fraction as a percentage", () => {
    expect(formatPercent(0.47)).toBe("47%");
    expect(formatPercent(0.255, 1)).toBe("25.5%");
  });
});
