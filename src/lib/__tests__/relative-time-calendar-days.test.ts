import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../format";

/**
 * "Yesterday" means the calendar day before today, not "about 24 hours ago" (refactor
 * audit 2026-10-30, DSP-7). The day word came from the elapsed time rounded to 24-hour
 * units, so it named the wrong day near midnight — while the exact date shown beside it
 * (DateMark's second line, the feedback thread's tooltip) said otherwise.
 *
 * The suite runs in Europe/Berlin (CONTRIBUTING, "Tests"), so `new Date(y, m, d, h, min)`
 * below is a Berlin wall-clock time.
 */
const at = (day: number, h: number, min = 0) => new Date(2026, 9, day, h, min);

describe("formatRelativeTime names days by the calendar", () => {
  it.each([
    // [what, value, now, en, de]
    ["00:10 today, seen at 23:50", at(30, 0, 10), at(30, 23, 50), "24 hours ago", "vor 24 Stunden"],
    ["14:00 two days ago, seen at 01:00", at(28, 14), at(30, 1), "2 days ago", "vorgestern"],
    ["01:00 yesterday, seen at 23:30", at(29, 1), at(30, 23, 30), "yesterday", "gestern"],
  ])("%s", (_, value, now, en, de) => {
    expect(formatRelativeTime(value, { now, locale: "en" })).toBe(en);
    expect(formatRelativeTime(value, { now, locale: "de" })).toBe(de);
  });

  it("counts the days in `timeZone` when one is given", () => {
    // 15:30 UTC is 17:30 on the 8th in Berlin but 00:30 on the 9th in Tokyo; 14:00 UTC the
    // next day is the 9th in both.
    const value = "2026-07-08T15:30:00Z";
    const now = "2026-07-09T14:00:00Z";
    expect(formatRelativeTime(value, { now, locale: "en" })).toBe("yesterday");
    expect(formatRelativeTime(value, { now, locale: "en", timeZone: "Asia/Tokyo" })).toBe("22 hours ago");
  });

  it("takes a DST night as one day", () => {
    // Berlin's clocks went back an hour in the night to Sunday 25 October 2026.
    expect(formatRelativeTime(at(24, 23, 30), { now: at(25, 23), locale: "en" })).toBe("yesterday");
    expect(formatRelativeTime(at(24, 12), { now: at(26, 1), locale: "en" })).toBe("2 days ago");
  });
});
