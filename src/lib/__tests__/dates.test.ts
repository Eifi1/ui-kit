import {
  addDaysIso,
  dateRangePresets,
  endOfMonthIso,
  endOfYearIso,
  formatIsoDate,
  monthKey,
  pad,
  parseIsoDate,
  sameYmd,
  shiftIso,
  startOfMonthIso,
  startOfWeekIso,
  startOfYearIso,
  todayIso,
  toLocalIso,
} from "../dates";

/**
 * Characterisation suite for the date helpers (refactor plan 2026-08-24, U-1b).
 *
 * The suite runs on Europe/Berlin (see vitest.config.ts) and that is load-bearing,
 * not decorative: every helper here was moved off UTC onto the local calendar after
 * dev#471, and on a UTC runner the old broken implementation and the current one
 * agree — so a regression test would pass against the bug.
 */

/** 01:00 CEST on the 15th: the exact clock from the dev#471 report, and the hour in
 *  which a `toISOString()` round-trip still answers with the 14th. */
const DEV_471 = new Date(2026, 6, 15, 1, 0, 0);

describe("the local-calendar family (dev#471)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(DEV_471);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers with the local day, not the UTC one", () => {
    // The bug: at 01:00 CEST the UTC instant is still 23:00 on the 14th, so
    // toISOString() said "2026-07-14" and a transaction booked a second ago read as
    // one still to come.
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-07-14"); // the trap itself
    expect(todayIso()).toBe("2026-07-15");
    expect(toLocalIso(new Date())).toBe("2026-07-15");
    expect(monthKey(new Date())).toBe("2026-07");
  });

  it("keeps the month and week boundaries on the local calendar", () => {
    // The same slip moved startOfMonthIso onto the last day of the PREVIOUS month
    // for an hour every first of the month — a report range nobody would question.
    expect(startOfMonthIso(0)).toBe("2026-07-01");
    expect(startOfMonthIso(-1)).toBe("2026-06-01");
    expect(endOfMonthIso(-1)).toBe("2026-06-30");
    expect(endOfMonthIso(0)).toBe("2026-07-31");
    expect(startOfWeekIso()).toBe("2026-07-13"); // the 15th is a Wednesday
    expect(startOfYearIso(0)).toBe("2026-01-01");
    expect(endOfYearIso(-1)).toBe("2025-12-31");
    expect(shiftIso(-1)).toBe("2026-07-14");
    expect(shiftIso(1)).toBe("2026-07-16");
  });

  it("crosses a DST boundary without losing a day", () => {
    // Europe/Berlin springs forward on 2026-03-29. A 24h-arithmetic shift lands on
    // 23:00 the previous day; reading local components back does not care.
    vi.setSystemTime(new Date(2026, 2, 30, 0, 30, 0));
    expect(todayIso()).toBe("2026-03-30");
    expect(shiftIso(-1)).toBe("2026-03-29");
    expect(addDaysIso("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDaysIso("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("offers presets whose ranges are all local-calendar", () => {
    const presets = Object.fromEntries(dateRangePresets().map((p) => [p.key, p]));
    expect(presets.today).toEqual({ key: "today", from: "2026-07-15", to: "2026-07-15" });
    expect(presets.yesterday.from).toBe("2026-07-14");
    expect(presets.this_week.from).toBe("2026-07-13");
    expect(presets.last_week).toEqual({
      key: "last_week",
      from: "2026-07-06",
      to: "2026-07-12",
    });
    expect(presets.last_7_days.from).toBe("2026-07-09");
    expect(presets.last_30_days.from).toBe("2026-06-16");
    expect(presets.this_month.from).toBe("2026-07-01");
    expect(presets.last_month).toEqual({ key: "last_month", from: "2026-06-01", to: "2026-06-30" });
    expect(presets.ytd.from).toBe("2026-01-01");
    expect(presets.last_year).toEqual({ key: "last_year", from: "2025-01-01", to: "2025-12-31" });
  });
});

describe("pad", () => {
  it("pads to two digits", () => {
    expect(pad(3)).toBe("03");
    expect(pad(12)).toBe("12");
  });
});

describe("parseIsoDate", () => {
  it("parses a well-formed date to local midnight", () => {
    const d = parseIsoDate("2026-07-15");
    expect(d).not.toBeNull();
    expect(toLocalIso(d!)).toBe("2026-07-15");
    expect(d!.getHours()).toBe(0);
  });

  it("returns null for the obviously malformed", () => {
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("not-a-date")).toBeNull();
    expect(parseIsoDate("2026-07")).toBeNull();
    expect(parseIsoDate("0000-00-00")).toBeNull();
  });

  it("rejects out-of-range components instead of rolling them over (U-8)", () => {
    // `new Date` rolls over: before the fix "2026-13-45" returned 2027-02-14 and
    // "2026-02-30" returned 2026-03-02 — a valid-looking Date for a day that does
    // not exist. Callers could not tell, because formatIsoDate only blanks on null,
    // so a rolled-over date formatted and displayed as though it were real.
    expect(parseIsoDate("2026-13-45")).toBeNull();
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-01-32")).toBeNull();
    expect(parseIsoDate("2025-02-29")).toBeNull(); // 2025 is not a leap year
  });

  it("still accepts the real end-of-month days it must not reject", () => {
    expect(parseIsoDate("2026-02-28")).not.toBeNull();
    expect(parseIsoDate("2024-02-29")).not.toBeNull(); // 2024 is a leap year
    expect(parseIsoDate("2026-12-31")).not.toBeNull();
    expect(parseIsoDate("2026-01-01")).not.toBeNull();
  });
});

describe("formatIsoDate", () => {
  it("formats a real date and blanks an unparseable one", () => {
    expect(formatIsoDate("2026-07-15", "en-GB")).toBe("15/07/2026");
    expect(formatIsoDate("2026-07-15", "de-DE")).toBe("15.7.2026");
    expect(formatIsoDate("", "en-GB")).toBe("");
    expect(formatIsoDate("nonsense", "en-GB")).toBe("");
  });

  it("blanks a date that does not exist rather than inventing one (U-8)", () => {
    expect(formatIsoDate("2026-02-30", "en-GB")).toBe("");
  });
});

describe("addDaysIso", () => {
  it("shifts, crossing month and year boundaries", () => {
    expect(addDaysIso("2026-07-15", 1)).toBe("2026-07-16");
    expect(addDaysIso("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDaysIso("2026-07-15", 0)).toBe("2026-07-15");
  });

  it("returns the input unchanged when it is not a parseable date", () => {
    expect(addDaysIso("", 1)).toBe("");
    expect(addDaysIso("nope", 1)).toBe("nope");
  });
});

describe("sameYmd", () => {
  it("compares local calendar days, ignoring the time", () => {
    expect(sameYmd(new Date(2026, 6, 15, 1, 0), new Date(2026, 6, 15, 23, 59))).toBe(true);
    expect(sameYmd(new Date(2026, 6, 15), new Date(2026, 6, 16))).toBe(false);
    expect(sameYmd(new Date(2026, 6, 15), new Date(2025, 6, 15))).toBe(false);
  });
});
