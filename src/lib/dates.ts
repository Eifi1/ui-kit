/**
 * ISO date helpers, collected from copies that were scattered across the pages.
 *
 * **Every "what day is it" helper here reads the LOCAL calendar** — one family, not
 * two. It used to be two: these all built a local Date and then read it back through
 * `toISOString()`, which is UTC, so east of Greenwich they all returned YESTERDAY
 * between local midnight and the UTC rollover. The old module note called that
 * deliberate and warned against changing it. It was not defensible, and dev#471 is
 * what it cost:
 *
 * > *"Just entered a tx now from scheduled. But it still shows as upcoming. Is there
 * > a problem with timezones? It is currently 1 o clock middle european summer time."*
 *
 * There was: at 01:00 CEST `todayIso()` answered with the 14th, the row the scheduler
 * had just booked was dated the 15th, and `isUpcoming` compares the two strings — so a
 * transaction entered a second ago read as one still to come. The same slip moved
 * `startOfMonthIso()` onto the last day of the PREVIOUS month for an hour every first
 * of the month, which is a report range nobody would have questioned.
 *
 * A calendar day only means anything to the human reading it, and every caller here —
 * the register's today, the date-range presets, the budget cursor, a new
 * transaction's default date — is asking that question. There is no caller for whom
 * "the UTC day" is the right answer; the server compares plain dates with no zone at
 * all, so sending it the user's local day is also what it wants.
 */

/** Zero-pad a number to two digits ("3" -> "03"). */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today as "YYYY-MM-DD" on the LOCAL calendar (see the module note). */
export function todayIso(): string {
  return toLocalIso(new Date());
}

/** A Date as a local-time "YYYY-MM-DD" string. */
export function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A Date as a local-time "YYYY-MM" month key. */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// ---------- Date-range presets + calendar helpers ----------
// Local-calendar like todayIso (see the module note); used by the data-table date
// filter and its MiniCalendar. Each one mutates a local Date and must therefore READ
// it back locally — going out through toISOString() is what shifted every one of
// these by a day near midnight (dev#471).

/** Today shifted by `days`, as "YYYY-MM-DD". */
export function shiftIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalIso(d);
}

/** First day (Monday) of the current week, as "YYYY-MM-DD". */
export function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // monday = 0
  d.setDate(d.getDate() - diff);
  return toLocalIso(d);
}

/** First day of the month `offsetMonths` from now, as "YYYY-MM-DD". */
export function startOfMonthIso(offsetMonths = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return toLocalIso(d);
}

/** Last day of the month `offsetMonths` from now, as "YYYY-MM-DD". */
export function endOfMonthIso(offsetMonths = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths + 1);
  d.setDate(0);
  return toLocalIso(d);
}

/** First day of the year `offsetYears` from now, as "YYYY-MM-DD". */
export function startOfYearIso(offsetYears = 0): string {
  const d = new Date();
  d.setMonth(0);
  d.setDate(1);
  d.setFullYear(d.getFullYear() + offsetYears);
  return toLocalIso(d);
}

/** Last day of the year `offsetYears` from now, as "YYYY-MM-DD". */
export function endOfYearIso(offsetYears = 0): string {
  const d = new Date();
  d.setMonth(11);
  d.setDate(31);
  d.setFullYear(d.getFullYear() + offsetYears);
  return toLocalIso(d);
}

/** Parse a "YYYY-MM-DD" string to a local-midnight Date, or null if malformed —
 *  where "malformed" includes a date that does not exist.
 *
 *  The falsy check alone was not enough. `new Date(y, m - 1, d)` ROLLS OVER out-of-range
 *  components rather than refusing them, so "2026-13-45" came back as 2027-02-14 and
 *  "2026-02-30" as 2026-03-02: a valid-looking Date for a day that never happened. No
 *  caller could tell — {@link formatIsoDate} blanks only on `null`, so the invented
 *  date formatted and displayed exactly like a real one.
 *
 *  The round-trip is the check: build the Date, then read the components back off it.
 *  A value that rolled over cannot answer with the numbers it was given. That is the
 *  same shape {@link sameYmd} already expresses, applied to a Date and its source. */
export function parseIsoDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Format a "YYYY-MM-DD" string for display in `locale` (empty string when
 *  unparseable). Defaults to the locale's short numeric date; pass `options` to
 *  override (e.g. `{ dateStyle: "medium" }`). */
export function formatIsoDate(
  iso: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = parseIsoDate(iso);
  return d ? d.toLocaleDateString(locale, options) : "";
}

/** A "YYYY-MM-DD" string shifted by `days` (negative shifts back), or the input
 *  unchanged when it isn't a parseable date.
 *
 *  Local-time throughout — {@link parseIsoDate} builds a local-midnight Date and
 *  {@link toLocalIso} reads local components back, so this never slides a day the way
 *  a `toISOString()` round-trip does west of UTC. */
export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toLocalIso(d);
}

/** Whether two Dates fall on the same local calendar day. */
export function sameYmd(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface DateRangePreset {
  key: string;
  from: string;
  to: string;
}

/**
 * The named ranges offered by the data-table date filter (local-calendar, like
 * {@link todayIso} — see the module note). `key` maps to the consumer's
 * `table.preset_*` labels.
 */
export function dateRangePresets(): DateRangePreset[] {
  const mondayOffset = (new Date().getDay() + 6) % 7; // monday = 0
  return [
    { key: "today", from: todayIso(), to: todayIso() },
    { key: "yesterday", from: shiftIso(-1), to: shiftIso(-1) },
    { key: "this_week", from: startOfWeekIso(), to: todayIso() },
    { key: "last_week", from: shiftIso(-7 - mondayOffset), to: shiftIso(-1 - mondayOffset) },
    { key: "last_7_days", from: shiftIso(-6), to: todayIso() },
    { key: "last_30_days", from: shiftIso(-29), to: todayIso() },
    { key: "this_month", from: startOfMonthIso(0), to: todayIso() },
    { key: "last_month", from: startOfMonthIso(-1), to: endOfMonthIso(-1) },
    { key: "last_3_months", from: shiftIso(-90), to: todayIso() },
    { key: "ytd", from: startOfYearIso(0), to: todayIso() },
    { key: "last_year", from: startOfYearIso(-1), to: endOfYearIso(-1) },
  ];
}

/** The last `n` WHOLE calendar months before the current one, as an inclusive
 *  `{ from, to }` — on 15 May, `n = 3` is 1 February … 30 April. Local-calendar, like
 *  everything here; `now` is for tests and for a host with its own clock. */
export function lastFullMonthsRange(n: number, now: Date = new Date()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth() - n, 1);
  // Day 0 of the current month is the last day of the previous one.
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toLocalIso(from), to: toLocalIso(to) };
}

/** The last `n` WHOLE calendar years before the current one — in 2026, `n = 2` is
 *  1 January 2024 … 31 December 2025. */
export function lastFullYearsRange(n: number, now: Date = new Date()): { from: string; to: string } {
  const year = now.getFullYear();
  return { from: `${year - n}-01-01`, to: `${year - 1}-12-31` };
}

export interface CalendarMonthPresetOptions {
  /** How many whole months each month preset spans. Default `[3, 6]`. */
  months?: readonly number[];
  /** How many whole years each year preset spans. Default `[2]`. */
  years?: readonly number[];
  /** The day to count back from. Default: now, on the local calendar. */
  now?: Date;
}

/**
 * Month-ALIGNED presets, beside the rolling-day ones of {@link dateRangePresets}.
 *
 * kastlan's accounting reports are closed by the month: "the last three months" there
 * means February, March and April, never "the 90 days up to this morning", which
 * starts mid-month and ends with a day that is still being booked. `last_3_months`
 * above is the rolling kind and stays that way for the data table's filter, so these
 * are separate keys rather than a changed meaning under an old one.
 *
 * Keys are `last_<n>_full_months` and `last_<n>_full_years`; the host labels them (the
 * same arrangement as `dateRangePresets`' keys and its `table.preset_*` strings). With
 * `DateRangePicker`, pass the key as the preset's `id` so the choice keeps its
 * identity while the dates are recomputed on every render.
 */
export function calendarMonthPresets(options: CalendarMonthPresetOptions = {}): DateRangePreset[] {
  const { months = [3, 6], years = [2], now = new Date() } = options;
  return [
    ...months.map((n) => ({ key: `last_${n}_full_months`, ...lastFullMonthsRange(n, now) })),
    ...years.map((n) => ({ key: `last_${n}_full_years`, ...lastFullYearsRange(n, now) })),
  ];
}
