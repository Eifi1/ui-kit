import { describe, expect, it } from "vitest";
import { calendarMonthPresets, lastFullMonthsRange, lastFullYearsRange } from "../dates";

/**
 * Month-aligned presets (kastlan's accounting reports): whole calendar months and
 * years that have ENDED, never a rolling window that starts mid-month and ends today.
 */
describe("calendar-aligned ranges", () => {
  // Mid-May, and a local Date: the helpers read the local calendar like the rest.
  const may15 = new Date(2026, 4, 15, 10, 30);

  it("counts whole months before the current one", () => {
    expect(lastFullMonthsRange(3, may15)).toEqual({ from: "2026-02-01", to: "2026-04-30" });
    expect(lastFullMonthsRange(6, may15)).toEqual({ from: "2025-11-01", to: "2026-04-30" });
    expect(lastFullMonthsRange(1, may15)).toEqual({ from: "2026-04-01", to: "2026-04-30" });
  });

  it("crosses a year boundary and lands on the real last day of February", () => {
    const jan31 = new Date(2026, 0, 31);
    expect(lastFullMonthsRange(3, jan31)).toEqual({ from: "2025-10-01", to: "2025-12-31" });
    const mar31 = new Date(2024, 2, 31);
    expect(lastFullMonthsRange(1, mar31)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });

  it("counts whole years before the current one", () => {
    expect(lastFullYearsRange(2, may15)).toEqual({ from: "2024-01-01", to: "2025-12-31" });
  });

  it("calendarMonthPresets: last 3 / 6 full months and last 2 full years by default, keyed", () => {
    expect(calendarMonthPresets({ now: may15 })).toEqual([
      { key: "last_3_full_months", from: "2026-02-01", to: "2026-04-30" },
      { key: "last_6_full_months", from: "2025-11-01", to: "2026-04-30" },
      { key: "last_2_full_years", from: "2024-01-01", to: "2025-12-31" },
    ]);
  });

  it("takes other spans", () => {
    const keys = calendarMonthPresets({ months: [12], years: [], now: may15 }).map((p) => p.key);
    expect(keys).toEqual(["last_12_full_months"]);
  });
});
