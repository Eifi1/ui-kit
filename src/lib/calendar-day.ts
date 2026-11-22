import { dateFormatter } from "./intl-cache";

const DAY = 86_400_000;

/**
 * The calendar day `date` falls on in `timeZone` (left out, or one `Intl` refuses: the
 * device's), as a whole number of days — that day's UTC midnight over a day's length. Two
 * of them subtract to whole calendar days ("yesterday" is -1 however few hours ago it
 * was), and a 23- or 25-hour DST day still counts one. `n * 86_400_000` is the day's UTC
 * midnight again, for its "YYYY-MM-DD".
 *
 * The one count (refactor audit 2026-11-22, DUP-2): `formatRelativeTime`'s days followed
 * the provider's zone, while `billingDaysLeft` (the trial banner's "ends tomorrow") and
 * FeedbackThread's day lines each counted the device's, by hand.
 *
 * @internal Not part of the barrel.
 */
export function calendarDayNumber(date: Date, timeZone?: string): number {
  if (timeZone) {
    try {
      // `en-US`: Gregorian, Latin digits — the parts are read back as numbers.
      const parts = dateFormatter("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(date);
      const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
      return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY;
    } catch {
      // A zone `Intl` refuses: the reader's own day, as `clockTime` falls back to the
      // reader's own clock.
    }
  }
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

/** A {@link calendarDayNumber} as "YYYY-MM-DD". @internal */
export function calendarDayIso(day: number): string {
  return new Date(day * DAY).toISOString().slice(0, 10);
}
