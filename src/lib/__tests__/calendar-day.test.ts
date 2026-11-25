import { describe, expect, it } from "vitest";
import { calendarDayIso, calendarDayNumber } from "../calendar-day";

/**
 * The one "which calendar day" count (refactor audit 2026-11-22, DUP-2) that the relative
 * times, the trial banner's days left and FeedbackThread's day lines share. The suite runs
 * in Europe/Berlin (vitest.config.ts).
 */

describe("calendarDayNumber", () => {
  // 23:30Z on 7 November: the 8th in Berlin and Tokyo, still the 7th in New York.
  const late = new Date(Date.UTC(2026, 10, 7, 23, 30));

  it("is the device's day without a zone, and the zone's with one", () => {
    expect(calendarDayIso(calendarDayNumber(late))).toBe("2026-11-08");
    expect(calendarDayIso(calendarDayNumber(late, "America/New_York"))).toBe("2026-11-07");
    expect(calendarDayIso(calendarDayNumber(late, "Asia/Tokyo"))).toBe("2026-11-08");
  });

  it("subtracts to whole days across a DST change", () => {
    // Berlin leaves summer time on 25 October 2026: the 25th is 25 hours long.
    const before = new Date(2026, 9, 24, 12, 0);
    const after = new Date(2026, 9, 26, 12, 0);
    expect(calendarDayNumber(after) - calendarDayNumber(before)).toBe(2);
    expect(calendarDayNumber(after, "Europe/Berlin") - calendarDayNumber(before, "Europe/Berlin")).toBe(2);
  });

  it("reads the device's day for a zone Intl refuses", () => {
    expect(calendarDayNumber(late, "Not/A_Zone")).toBe(calendarDayNumber(late));
  });
});
