import { describe, expect, it } from "vitest";
import { addMonthsIso, daysBetweenIso, isoWeekNumber, monthStartOf, monthsBetweenIso, weekStartOf } from "../dates";

/**
 * ISO-day arithmetic from a GIVEN day (refactor audit 2026-11-22, DUP-4). The kit counted
 * only from today (`startOfWeekIso()`, `startOfMonthIso(offset)`), so keksdose
 * (`monthStart`/`nextMonth`/`prevMonth`/`monthsBetween`, `isoWeekStart`/`isoWeekNumber`),
 * Staunlabor (`dayNumber`/`dayString`/`mondayOf`) and kastlan each wrote the from-a-day
 * forms. Pure string arithmetic: no time zone, no DST fold, no device clock (the suite runs
 * in Europe/Berlin, which has both).
 */
describe("monthStartOf", () => {
  it("is the 1st of the day's month", () => {
    expect(monthStartOf("2026-11-22")).toBe("2026-11-01");
    expect(monthStartOf("2026-01-01")).toBe("2026-01-01");
  });

  it("hands back what is not a day, as addDaysIso does", () => {
    expect(monthStartOf("2026-02-30")).toBe("2026-02-30");
    expect(monthStartOf("")).toBe("");
  });
});

describe("addMonthsIso", () => {
  it("moves by whole months, clamping the day to the target month's last", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIso("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsIso("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonthsIso("2026-11-15", 0)).toBe("2026-11-15");
  });

  it("crosses years both ways (keksdose's nextMonth / prevMonth)", () => {
    expect(addMonthsIso("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonthsIso("2026-01-01", -1)).toBe("2025-12-01");
    expect(addMonthsIso("2026-05-10", -17)).toBe("2024-12-10");
    expect(addMonthsIso("2026-05-10", 24)).toBe("2028-05-10");
  });

  it("over the DST change (Berlin: 29 March, 25 October 2026) the day stays the day", () => {
    expect(addMonthsIso("2026-02-28", 1)).toBe("2026-03-28");
    expect(addMonthsIso("2026-09-25", 1)).toBe("2026-10-25");
  });

  it("hands back what is not a day", () => {
    expect(addMonthsIso("2026-13-01", 1)).toBe("2026-13-01");
  });
});

describe("monthsBetweenIso", () => {
  it("counts calendar months between the two days' months, negative backwards", () => {
    expect(monthsBetweenIso("2026-01-31", "2026-02-01")).toBe(1);
    expect(monthsBetweenIso("2026-11-01", "2026-11-30")).toBe(0);
    expect(monthsBetweenIso("2025-12-15", "2027-01-01")).toBe(13);
    expect(monthsBetweenIso("2026-03-01", "2026-01-01")).toBe(-2);
  });
});

describe("weekStartOf", () => {
  it("is the Monday on or before the day by default (ISO 8601)", () => {
    expect(weekStartOf("2026-11-22")).toBe("2026-11-16"); // a Sunday
    expect(weekStartOf("2026-11-16")).toBe("2026-11-16"); // the Monday itself
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28"); // across the year
  });

  it("takes another week start as a Date#getDay index (localeWeekStart's answer)", () => {
    expect(weekStartOf("2026-11-22", 0)).toBe("2026-11-22"); // Sunday-first: the day itself
    expect(weekStartOf("2026-11-21", 0)).toBe("2026-11-15");
    expect(weekStartOf("2026-11-20", 6)).toBe("2026-11-14"); // Saturday-first
  });

  it("over the DST change it lands on the Monday, not a day off", () => {
    expect(weekStartOf("2026-03-29")).toBe("2026-03-23");
    expect(weekStartOf("2026-10-27")).toBe("2026-10-26");
  });
});

describe("daysBetweenIso", () => {
  it("counts days from the first to the second, negative backwards", () => {
    expect(daysBetweenIso("2026-11-16", "2026-11-22")).toBe(6);
    expect(daysBetweenIso("2026-11-22", "2026-11-16")).toBe(-6);
    expect(daysBetweenIso("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetweenIso("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("is whole days across the DST change (a 23- and a 25-hour day)", () => {
    expect(daysBetweenIso("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetweenIso("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("is NaN when either is not a day", () => {
    expect(daysBetweenIso("2026-02-30", "2026-03-01")).toBeNaN();
  });
});

describe("isoWeekNumber", () => {
  it("is the ISO 8601 week: the week holding the year's first Thursday is 1", () => {
    expect(isoWeekNumber("2026-11-22")).toBe(47);
    expect(isoWeekNumber("2026-01-01")).toBe(1); // a Thursday
    expect(isoWeekNumber("2027-01-01")).toBe(53); // a Friday: the last week of 2026
    expect(isoWeekNumber("2024-12-30")).toBe(1); // a Monday: week 1 of 2025
    expect(isoWeekNumber("2021-01-03")).toBe(53); // a Sunday: 2020 had 53
  });

  it("is NaN for what is not a day", () => {
    expect(isoWeekNumber("not a day")).toBeNaN();
  });
});
