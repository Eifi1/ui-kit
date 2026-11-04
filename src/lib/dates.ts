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

// Imports nothing else: `@eifi1/ui-kit/dates` reaches no package (packaging-contract).
import { dateFormatter } from "./intl-cache";

/** Zero-pad a number to two digits ("3" -> "03"). */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// ---------- Where "today" comes from (0.55) ----------
// keksdose's 0.51 adoption N2: the dev clock (server-kit 0.20's `DevSwitchAnswer.today`,
// docs/top-bar-harmonization.md §2.7.1 rule 5) moves the day the SERVER takes for today,
// and the app's own `todayIso()` followed it — but every helper below and the kit's
// calendars (DatePicker's today, MonthPicker's this month) read the device clock, so a
// month end or a "today" worked out by the kit disagreed with the server's. One settable
// source now, which all of them read: the device clock until something moves it.

/** The day {@link setToday} moved "today" to, or `null`: the device's own. */
let movedToday: string | null = null;
const todayListeners = new Set<() => void>();

/**
 * Move "today" for every helper here, and for the kit's calendars and pickers, to `day`
 * ("YYYY-MM-DD") — the dev clock's day, which the app reads at boot and from its dev menu's
 * Time rows (`setToday(answer.today)`) — or back to the device's own with `null`. A string
 * that is not a real day is the device's own too: a dev tool must not stop the app.
 *
 * Only the DATE moves, as on the server: {@link currentDate} keeps the device's time of
 * day, and a timestamp the kit takes (`new Date()` for a sync, a crash report, a relative
 * time) stays on the device's real clock. Not for production code: the app gates the call
 * (`import.meta.env.DEV`), as it gates the menu. The kit's `DevMenu` puts its "Overrides
 * on" dot on the flask while a day is set.
 */
export function setToday(day: string | null): void {
  const next = day !== null && parseIsoDate(day) !== null ? day : null;
  if (next === movedToday) return;
  movedToday = next;
  for (const listener of [...todayListeners]) listener();
}

/** The day {@link setToday} moved "today" to, or `null` while it is the device's own. */
export function todayOverride(): string | null {
  return movedToday;
}

/** Hear {@link setToday} move the day; returns the unsubscribe. With {@link todayOverride},
 *  `useSyncExternalStore`'s pair. */
export function subscribeToday(listener: () => void): () => void {
  todayListeners.add(listener);
  return () => {
    todayListeners.delete(listener);
  };
}

/**
 * Now, on the day the kit takes for today: the device's clock, or — while {@link setToday}
 * has moved it — that day at the device's time of day. A new Date on every call, free to
 * mutate. Every "what day is it" here reads it; read it for an app's own.
 */
export function currentDate(): Date {
  const now = new Date();
  if (movedToday !== null) {
    const [y, m, d] = movedToday.split("-").map(Number);
    // The date's three parts at once, so no day is passed through that does not exist
    // (31 March set to February first); the time of day is kept.
    now.setFullYear(y, m - 1, d);
  }
  return now;
}

/** Today as "YYYY-MM-DD" on the LOCAL calendar (see the module note), on the day
 *  {@link currentDate} takes for today. */
export function todayIso(): string {
  return toLocalIso(currentDate());
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
// these by a day near midnight (dev#471). "Now" is `currentDate()`, so a day moved by
// `setToday` moves them all (0.55).

/** Today shifted by `days`, as "YYYY-MM-DD". */
export function shiftIso(days: number): string {
  const d = currentDate();
  d.setDate(d.getDate() + days);
  return toLocalIso(d);
}

/** First day (Monday) of the current week, as "YYYY-MM-DD". */
export function startOfWeekIso(): string {
  const d = currentDate();
  const day = d.getDay();
  const diff = (day + 6) % 7; // monday = 0
  d.setDate(d.getDate() - diff);
  return toLocalIso(d);
}

/** First day of the month `offsetMonths` from now, as "YYYY-MM-DD". */
export function startOfMonthIso(offsetMonths = 0): string {
  const d = currentDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return toLocalIso(d);
}

/** Last day of the month `offsetMonths` from now, as "YYYY-MM-DD". */
export function endOfMonthIso(offsetMonths = 0): string {
  const d = currentDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths + 1);
  d.setDate(0);
  return toLocalIso(d);
}

/** First day of the year `offsetYears` from now, as "YYYY-MM-DD". */
export function startOfYearIso(offsetYears = 0): string {
  const d = currentDate();
  d.setMonth(0);
  d.setDate(1);
  d.setFullYear(d.getFullYear() + offsetYears);
  return toLocalIso(d);
}

/** Last day of the year `offsetYears` from now, as "YYYY-MM-DD". */
export function endOfYearIso(offsetYears = 0): string {
  const d = currentDate();
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

/** The fields that make an option set a DATE for `toLocaleDateString` (ECMA-402's
 *  ToDateTimeOptions, required "date"): with none of them it adds year, month and day. */
const DATE_FIELDS = ["weekday", "year", "month", "day", "dateStyle"] as const;
const NUMERIC_DATE: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" };

/** `options` as `toLocaleDateString` reads them: with a date in them, whatever else they
 *  ask for. `{ hour: "numeric" }` alone is a date and an hour there, never the hour alone
 *  that `Intl.DateTimeFormat` would print for it. */
function asDateOptions(options: Intl.DateTimeFormatOptions | undefined): Intl.DateTimeFormatOptions {
  if (!options) return NUMERIC_DATE;
  return DATE_FIELDS.some((field) => options[field] !== undefined) ? options : { ...options, ...NUMERIC_DATE };
}

/** Format a "YYYY-MM-DD" string for display in `locale` (empty string when
 *  unparseable). Defaults to the locale's short numeric date; pass `options` to
 *  override (e.g. `{ dateStyle: "medium" }`). `locale` may be `undefined` since 0.34 —
 *  the runtime's default, as `Intl` reads it and as every other kit formatter takes it
 *  (DUP-11: DatePicker re-wrapped this function only to pass none).
 *
 *  Through the kit's formatter cache since 0.54 (keksdose audit follow-up, 2026-11-01):
 *  `toLocaleDateString` builds a formatter per call, and this one runs for the date
 *  pickers' trigger on every render and for an app's date column once per row. The output
 *  is `toLocaleDateString`'s: the same options, with the date it adds when they name none
 *  (`asDateOptions`). */
export function formatIsoDate(iso: string, locale: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  const d = parseIsoDate(iso);
  return d ? dateFormatter(locale, asDateOptions(options)).format(d) : "";
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

/**
 * `d` moved by whole months, keeping the day of the month where the target has one.
 * `setMonth` alone ROLLS OVER — 31 January + 1 month is 3 March — which would skip
 * February entirely for anyone paging through the year with PageDown. Returns a new
 * Date; `d` is not touched.
 */
export function addMonthsClamped(d: Date, months: number): Date {
  const day = d.getDate();
  const out = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastOfTarget = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, lastOfTarget));
  return out;
}

/**
 * The first day of the week in `locale`, as a `Date#getDay` index (0 = Sunday).
 *
 * `Intl.Locale#getWeekInfo()` is the standard spelling; V8 shipped it first as the
 * `weekInfo` accessor, and Firefox has neither yet — hence both reads and a Monday
 * fallback, which is ISO 8601. Its `firstDay` counts 1 = Monday … 7 = Sunday, so `% 7`
 * maps it onto `getDay`. `undefined` asks for the runtime's default locale.
 */
export function localeWeekStart(locale: string | undefined): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  try {
    const tag = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
    const loc = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay;
    if (typeof firstDay === "number") return (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  } catch {
    // A malformed tag throws from `Intl.Locale`; a calendar still has to render.
  }
  return 1;
}

/** Whether two Dates fall on the same local calendar day. */
export function sameYmd(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  const mondayOffset = (currentDate().getDay() + 6) % 7; // monday = 0
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
 *  everything here; `now` is for tests and for a host with its own clock (default
 *  {@link currentDate}). */
export function lastFullMonthsRange(n: number, now: Date = currentDate()): { from: string; to: string } {
  const from = new Date(now.getFullYear(), now.getMonth() - n, 1);
  // Day 0 of the current month is the last day of the previous one.
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: toLocalIso(from), to: toLocalIso(to) };
}

/** The last `n` WHOLE calendar years before the current one — in 2026, `n = 2` is
 *  1 January 2024 … 31 December 2025. */
export function lastFullYearsRange(n: number, now: Date = currentDate()): { from: string; to: string } {
  const year = now.getFullYear();
  return { from: `${year - n}-01-01`, to: `${year - 1}-12-31` };
}

export interface CalendarMonthPresetOptions {
  /** How many whole months each month preset spans. Default `[3, 6]`. */
  months?: readonly number[];
  /** How many whole years each year preset spans. Default `[2]`. */
  years?: readonly number[];
  /** The day to count back from. Default: now, on the local calendar ({@link currentDate}). */
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
  const { months = [3, 6], years = [2], now = currentDate() } = options;
  return [
    ...months.map((n) => ({ key: `last_${n}_full_months`, ...lastFullMonthsRange(n, now) })),
    ...years.map((n) => ({ key: `last_${n}_full_years`, ...lastFullYearsRange(n, now) })),
  ];
}
