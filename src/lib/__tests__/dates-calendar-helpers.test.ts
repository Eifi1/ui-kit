import { describe, expect, it } from "vitest";
import { addMonthsClamped, localeWeekStart, toLocalIso } from "../dates";

describe("addMonthsClamped", () => {
  it("keeps the day of the month where the target has one", () => {
    expect(toLocalIso(addMonthsClamped(new Date(2026, 4, 15), 1))).toBe("2026-06-15");
    expect(toLocalIso(addMonthsClamped(new Date(2026, 0, 15), -1))).toBe("2025-12-15");
  });

  it("clamps rather than rolling over into the month after", () => {
    expect(toLocalIso(addMonthsClamped(new Date(2026, 0, 31), 1))).toBe("2026-02-28");
    expect(toLocalIso(addMonthsClamped(new Date(2024, 0, 31), 1))).toBe("2024-02-29");
  });

  it("does not touch its argument", () => {
    const d = new Date(2026, 0, 31);
    addMonthsClamped(d, 12);
    expect(toLocalIso(d)).toBe("2026-01-31");
  });
});

describe("localeWeekStart", () => {
  it("falls back to Monday for a tag it cannot read", () => {
    expect(localeWeekStart("not a locale!!")).toBe(1);
  });

  it("answers with a getDay index", () => {
    expect([0, 1, 2, 3, 4, 5, 6]).toContain(localeWeekStart("en-US"));
    expect([0, 1, 2, 3, 4, 5, 6]).toContain(localeWeekStart(undefined));
  });
});
