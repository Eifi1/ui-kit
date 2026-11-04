import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calendarMonthPresets,
  currentDate,
  dateRangePresets,
  endOfMonthIso,
  endOfYearIso,
  lastFullMonthsRange,
  lastFullYearsRange,
  setToday,
  shiftIso,
  startOfMonthIso,
  startOfWeekIso,
  startOfYearIso,
  subscribeToday,
  todayIso,
  todayOverride,
} from "../dates";

/**
 * The kit's one "today" (0.55, keksdose's 0.51 adoption N2): the dev clock moves the day
 * the server takes for today, and every helper here followed the device clock instead.
 * `setToday` moves it for all of them; `null` (or a day that does not exist) is the
 * device's own again. The device is pinned to Wednesday 4 November 2026, 10:30.
 */

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 30));
});
afterEach(() => {
  setToday(null);
  vi.useRealTimers();
});

describe("the device's clock, until something moves it", () => {
  it("reads the device's day with no override", () => {
    expect(todayOverride()).toBeNull();
    expect(todayIso()).toBe("2026-11-04");
    expect(startOfMonthIso()).toBe("2026-11-01");
  });
});

describe("setToday", () => {
  it("todayIso and currentDate follow it; the time of day stays the device's", () => {
    setToday("2026-10-31");
    expect(todayOverride()).toBe("2026-10-31");
    expect(todayIso()).toBe("2026-10-31");
    const now = currentDate();
    expect([now.getFullYear(), now.getMonth(), now.getDate()]).toEqual([2026, 9, 31]);
    expect([now.getHours(), now.getMinutes()]).toEqual([10, 30]);
  });

  it("shiftIso and the week, month and year helpers count from the moved day", () => {
    setToday("2026-10-31"); // a Saturday
    expect(shiftIso(1)).toBe("2026-11-01");
    expect(shiftIso(-30)).toBe("2026-10-01");
    expect(startOfWeekIso()).toBe("2026-10-26");
    expect(startOfMonthIso()).toBe("2026-10-01");
    expect(startOfMonthIso(1)).toBe("2026-11-01");
    expect(endOfMonthIso()).toBe("2026-10-31");
    expect(endOfMonthIso(-1)).toBe("2026-09-30");
    setToday("2025-12-31");
    expect(startOfYearIso()).toBe("2025-01-01");
    expect(endOfYearIso()).toBe("2025-12-31");
    expect(shiftIso(1)).toBe("2026-01-01");
  });

  it("a moved day keeps its own date when the device's month is shorter", () => {
    // 31 October onto a device on 30 November would roll to 1 December if the day were
    // set before the month.
    vi.setSystemTime(new Date(2026, 10, 30, 9, 0));
    setToday("2026-10-31");
    expect(todayIso()).toBe("2026-10-31");
    vi.setSystemTime(new Date(2026, 1, 28, 9, 0));
    setToday("2026-01-31");
    expect(todayIso()).toBe("2026-01-31");
  });

  it("dateRangePresets are worked out on the moved day", () => {
    setToday("2026-10-31");
    const byKey = Object.fromEntries(dateRangePresets().map((p) => [p.key, { from: p.from, to: p.to }]));
    expect(byKey.today).toEqual({ from: "2026-10-31", to: "2026-10-31" });
    expect(byKey.yesterday).toEqual({ from: "2026-10-30", to: "2026-10-30" });
    expect(byKey.this_week).toEqual({ from: "2026-10-26", to: "2026-10-31" });
    expect(byKey.last_week).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(byKey.this_month).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(byKey.last_month).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(byKey.ytd).toEqual({ from: "2026-01-01", to: "2026-10-31" });
  });

  it("calendarMonthPresets and the full-month ranges count back from it by default", () => {
    setToday("2026-10-31");
    expect(calendarMonthPresets()).toEqual([
      { key: "last_3_full_months", from: "2026-07-01", to: "2026-09-30" },
      { key: "last_6_full_months", from: "2026-04-01", to: "2026-09-30" },
      { key: "last_2_full_years", from: "2024-01-01", to: "2025-12-31" },
    ]);
    expect(lastFullMonthsRange(1)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    setToday("2027-01-15");
    expect(lastFullYearsRange(1)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    // An explicit `now` still wins.
    expect(lastFullMonthsRange(1, new Date(2026, 4, 15))).toEqual({ from: "2026-04-01", to: "2026-04-30" });
  });

  it("null, and a day that does not exist, are the device's own again", () => {
    setToday("2026-10-31");
    setToday(null);
    expect(todayIso()).toBe("2026-11-04");
    setToday("2026-02-30");
    expect(todayOverride()).toBeNull();
    expect(todayIso()).toBe("2026-11-04");
    setToday("not a day");
    expect(todayIso()).toBe("2026-11-04");
  });

  it("tells its subscribers when the day changes, and only then", () => {
    const listener = vi.fn();
    const off = subscribeToday(listener);
    setToday("2026-10-31");
    setToday("2026-10-31");
    expect(listener).toHaveBeenCalledTimes(1);
    setToday(null);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    setToday("2026-10-30");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
