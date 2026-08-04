/**
 * ISO date helpers, collected from copies that were scattered across the
 * pages. Two timezone families live here and they are NOT interchangeable:
 *
 *  - {@link todayIso} is UTC-based (`Date.toISOString()`), matching the
 *    existing filter / server-facing call sites. Near midnight it can differ
 *    from the local calendar day — that behaviour is preserved deliberately;
 *    don't "fix" it to local time without checking every caller.
 *  - {@link toLocalIso} / {@link monthKey} read local-time components
 *    (getFullYear/getMonth/getDate), matching the user-facing month/day call
 *    sites (budget cursor, calendar heatmap, report ranges).
 */

/** Zero-pad a number to two digits ("3" -> "03"). */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today as "YYYY-MM-DD", UTC-based (see module note on timezones). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
// UTC-based like todayIso (see module note); used by the data-table date filter
// and its MiniCalendar.

/** Today shifted by `days`, as "YYYY-MM-DD". */
export function shiftIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** First day (Monday) of the current week, as "YYYY-MM-DD". */
export function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // monday = 0
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** First day of the month `offsetMonths` from now, as "YYYY-MM-DD". */
export function startOfMonthIso(offsetMonths = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

/** Last day of the month `offsetMonths` from now, as "YYYY-MM-DD". */
export function endOfMonthIso(offsetMonths = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/** First day of the year `offsetYears` from now, as "YYYY-MM-DD". */
export function startOfYearIso(offsetYears = 0): string {
  const d = new Date();
  d.setMonth(0);
  d.setDate(1);
  d.setFullYear(d.getFullYear() + offsetYears);
  return d.toISOString().slice(0, 10);
}

/** Last day of the year `offsetYears` from now, as "YYYY-MM-DD". */
export function endOfYearIso(offsetYears = 0): string {
  const d = new Date();
  d.setMonth(11);
  d.setDate(31);
  d.setFullYear(d.getFullYear() + offsetYears);
  return d.toISOString().slice(0, 10);
}

/** Parse a "YYYY-MM-DD" string to a local-midnight Date, or null if malformed. */
export function parseIsoDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
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
 * The named ranges offered by the data-table date filter (UTC-based, like
 * {@link todayIso}). `key` maps to the consumer's `table.preset_*` labels.
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
