import { useMemo } from "react";
import { useKitLocale, useKitTimeZone } from "../i18n/kit-labels";
import { parseIsoDate } from "./dates";
import { formatWithMinus, type MinusStyle } from "./minus";
import { roundHalfAway } from "./round";

export type { MinusStyle } from "./minus";
// 0.50 (KIT-1 follow-up): the kit's minus for an app's OWN `Intl.NumberFormat` wrapper.
export { formatWithMinus } from "./minus";

/**
 * Number, money, percentage, date and relative-time formatting — `Intl`, in one place,
 * for the figures an app prints OUTSIDE a kit component.
 *
 * Each app grew its own: kastlan's `utils/formatters.ts` (a Swiss-pinned
 * `formatNumber`/`formatCurrency`, a date-fns `formatDate`, and a `formatRelativeTime`
 * whose "5m ago" / "3h ago" / "2d ago" stayed English in every language), its tenancy
 * `format.ts` (`formatChf`, a `formatPct` gluing a "+" onto `toFixed(2)`), keksdose's
 * own set. Every one of them is `Intl` with a locale bolted on, so the only thing
 * worth sharing is the locale — and the kit already has one, the provider's.
 *
 * The plain functions take a `locale` (none: the runtime default, as every `Intl` API
 * reads `undefined`). Inside a component, {@link useKitFormat} hands back the same
 * functions bound to the `<UiKitProvider locale>`, so a page formats exactly like the
 * kit components on it.
 *
 * A missing value — `null`, `undefined`, an unparseable date — formats as `empty`
 * (default "—", the dash `StatTile` shows for no value), never as "NaN" or "Invalid
 * Date". A number may also arrive as a numeric STRING (0.49, KIT-2) — "1850.00", "-12.5",
 * "0": a Decimal field off a Python API — and is formatted like the number. Anything
 * else (a non-numeric string, an object, `NaN`, ±`Infinity`) prints `empty` too, but is
 * a bug upstream rather than a gap in the data, so a development build says so on the
 * console, once per call site. Zero is a figure: `0` and `"0"` print "CHF 0.00", never
 * the dash.
 *
 * A negative figure carries the typographic minus, U+2212 (0.49, KIT-1), in every
 * locale — `Intl` writes a hyphen in most. `minus: "ascii"` for text a machine reads
 * back (a CSV, the clipboard).
 */

/** What every formatter here prints for a missing value, unless told otherwise. */
export const EMPTY_FORMATTED_VALUE = "—";

/** Fraction digits: a number pins both the minimum and the maximum (`2` → "3.10");
 *  an object sets them apart (a meter reading, 1–3). */
export type FormatDigits = number | { min?: number; max?: number };

interface BaseOptions {
  /** BCP 47 tag. Left out: the runtime default (the hook: the provider's). */
  locale?: string;
  /** Printed for a missing value. Default {@link EMPTY_FORMATTED_VALUE}. */
  empty?: string;
}

/** The options every number formatter shares (money and percent carry their own unit). */
export interface FormatNumberBaseOptions extends BaseOptions {
  digits?: FormatDigits;
  /** Compact notation: 12 400 → "12K". */
  compact?: boolean;
  /** `"exceptZero"` for a change ("+3", "−3", "0"). Default: the minus only. */
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
  /** Any further `Intl.NumberFormat` options, merged over the ones above. */
  options?: Intl.NumberFormatOptions;
  /**
   * The minus sign of a negative figure (0.49, KIT-1). `"typographic"` (default):
   * U+2212, as wide as "+" and the digits, as `SignedAmount` prints it — in every
   * locale, also where `Intl` writes a hyphen. `"ascii"`: U+002D, for an export a
   * machine parses back (a CSV download, the clipboard) — there, also pass
   * `options: { useGrouping: false }` or write the raw number.
   */
  minus?: MinusStyle;
}

/** The options {@link formatNumber} takes: the shared ones plus a free-text `unit`. */
export interface FormatNumberOptions extends FormatNumberBaseOptions {
  /**
   * A unit printed after the figure, joined by a narrow no-break space (U+202F):
   * "3.400 N", "12 kg", "4,5 m²". lenkbank (P8) prints forces, masses and lengths in
   * every table and summary, and each call site glued `${n} N` together with a plain
   * space — which wraps the "N" onto the next line in a narrow column and reads loose
   * beside the digit grouping. The narrow no-break space is the SI brochure's and the
   * Swiss typesetting rule's separator between value and unit, and it never breaks.
   *
   * Free text, not `Intl`'s `style: "unit"`: that one only knows the ECMA-402
   * sanctioned units (no "N", no "kN", no "m³/h"), so an app would still be gluing.
   * A missing value prints `empty` ALONE — "— N" says there is a newton-shaped
   * nothing, which is noise in a column that already heads its unit.
   */
  unit?: string;
}

/** Narrow no-break space (U+202F): between a figure and its {@link FormatNumberOptions.unit}. */
const UNIT_SEPARATOR = "\u202F";

export interface FormatMoneyOptions extends FormatNumberBaseOptions {
  /** `"symbol"` (default), `"narrowSymbol"`, `"code"` ("CHF 12.00") or `"name"`. */
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
}

export interface FormatPercentOptions extends FormatNumberBaseOptions {
  /**
   * `true` (default): `value` is a RATIO, as `Intl` and `StatTile`'s percent delta read
   * it — `0.12` is 12 %. `false`: it is already a percentage — `12` is 12 %
   * (kastlan's rent `change_pct`).
   */
  ratio?: boolean;
}

// One formatter per option set: a table formats the same way thousands of times, and
// constructing an Intl formatter is the expensive part.
const numberFormatters = new Map<string, Intl.NumberFormat>();
function numberFormatter(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = numberFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, f);
  }
  return f;
}

function digitOptions(digits: FormatDigits | undefined): Intl.NumberFormatOptions {
  if (digits === undefined) return {};
  if (typeof digits === "number") return { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return {
    ...(digits.min !== undefined ? { minimumFractionDigits: digits.min } : null),
    ...(digits.max !== undefined ? { maximumFractionDigits: digits.max } : null),
  };
}

function numberOptions(o: FormatNumberBaseOptions): Intl.NumberFormatOptions {
  return {
    ...digitOptions(o.digits),
    ...(o.compact ? { notation: "compact" } : null),
    ...(o.signDisplay ? { signDisplay: o.signDisplay } : null),
    ...o.options,
  };
}

/**
 * What the number formatters take (0.49, KIT-2): a number, a numeric string ("1850.00",
 * "-12.5", "1e3" — what a Decimal arrives as in JSON), or `null` / `undefined` for no
 * value. A string is read with `Number()`, so a figure with more significant digits than
 * a double holds (about 15–17) is printed as its nearest double.
 */
export type FormattableNumber = number | string | null | undefined;

/** A plain decimal: optional sign, digits with an optional point, an optional exponent.
 *  No grouping marks, no decimal comma, no currency — those are formatted text, and
 *  reading them back is a locale's guess. */
const NUMERIC_STRING = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

/** The kit's dev switch, as `lib/logger.ts` reads it: a development build, never a
 *  production one (the consumer's bundler makes `import.meta.env.DEV` false) and never
 *  under vitest. Read per call so a test can switch it on with `vi.stubEnv`. */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

const warnedSites = new Set<string>();
/** This module's own frames, skipped to find the caller ("Object.formatMoney" is a
 *  `useKitFormat` wrapper). */
const OWN_FRAME = /\b(?:formatNumber|formatMoney|formatPercent|toFormattable|warnInvalid|callSite)\b/;

/** The first stack frame outside the formatters: where the bad value was passed. */
function callSite(): string {
  const frames = (new Error().stack ?? "").split("\n").slice(1);
  return frames.find((frame) => !OWN_FRAME.test(frame))?.trim() ?? "";
}

function describeValue(value: unknown): string {
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/** A development build's console note about an invalid value — once per call site. */
function warnInvalid(fn: string, value: unknown): void {
  if (!devWarnings()) return;
  const site = callSite();
  const key = `${fn}|${site || typeof value}`;
  if (warnedSites.has(key)) return;
  warnedSites.add(key);
  const type = Array.isArray(value) ? "array" : typeof value;
  console.warn(
    `[ui-kit] ${fn} got ${describeValue(value)} (${type}), which is not a number: printed the empty value. ` +
      "Pass a number, a numeric string, or null/undefined for a missing value." +
      (site ? `\n  at ${site.replace(/^at /, "")}` : ""),
  );
}

/**
 * `value` as a finite number to format, or `undefined` to print `empty`. `null` and
 * `undefined` are a missing value and pass quietly; anything that is neither a finite
 * number nor a numeric string is an invalid one — ±Infinity included (lenkbank, adopting
 * 0.13: a division by zero upstream; "∞" in a money column reads like data) — and a
 * development build warns. `-0` is folded into `0`: zero carries no sign.
 */
function toFormattable(fn: string, value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  let n: number | undefined;
  if (typeof value === "number") n = value;
  else if (typeof value === "string" && NUMERIC_STRING.test(value.trim())) n = Number(value.trim());
  if (n === undefined || !Number.isFinite(n)) {
    warnInvalid(fn, value);
    return undefined;
  }
  return n + 0;
}

/** A number in `locale`: "1,234.5", "1.234,5", "1’234.5" — with `unit`, "3.400 N". */
export function formatNumber(value: FormattableNumber, options: FormatNumberOptions = {}): string {
  const n = toFormattable("formatNumber", value);
  if (n === undefined) return options.empty ?? EMPTY_FORMATTED_VALUE;
  const figure = formatWithMinus(numberFormatter(options.locale, numberOptions(options)), n, options.minus);
  return options.unit ? `${figure}${UNIT_SEPARATOR}${options.unit}` : figure;
}

/** An amount of `currency` (ISO 4217) in `locale`: "CHF 1’234.50", "1.234,50 €". */
export function formatMoney(value: FormattableNumber, currency: string, options: FormatMoneyOptions = {}): string {
  const n = toFormattable("formatMoney", value);
  if (n === undefined) return options.empty ?? EMPTY_FORMATTED_VALUE;
  const formatter = numberFormatter(options.locale, {
    style: "currency",
    currency,
    ...(options.currencyDisplay ? { currencyDisplay: options.currencyDisplay } : null),
    ...numberOptions(options),
  });
  return formatWithMinus(formatter, n, options.minus);
}

/** A percentage in `locale` ("12%", "12 %", "+1.25%"). See {@link FormatPercentOptions.ratio}
 *  for what `value` means. Default digits: at most one. */
export function formatPercent(value: FormattableNumber, options: FormatPercentOptions = {}): string {
  const n = toFormattable("formatPercent", value);
  if (n === undefined) return options.empty ?? EMPTY_FORMATTED_VALUE;
  const ratio = options.ratio === false ? n / 100 : n;
  const formatter = numberFormatter(options.locale, {
    style: "percent",
    ...(options.digits === undefined ? { maximumFractionDigits: 1 } : null),
    ...numberOptions(options),
  });
  return formatWithMinus(formatter, ratio, options.minus);
}

/* ── Dates ─────────────────────────────────────────────────────────────────── */

/**
 * The shapes a date is printed in, each a set of `Intl.DateTimeFormat` options:
 *  - `short` / `medium` / `long` / `full` — the date alone, at that `dateStyle`
 *    ("08/07/2026", "8 Jul 2026", "8 July 2026", "Wednesday, 8 July 2026" in en-GB).
 *  - `dateTime` — medium date and short time: a timestamp ("8 Jul 2026, 14:05").
 *  - `time` — the short time alone ("14:05").
 *  - `monthYear` — "July 2026".
 *
 * Or pass `Intl.DateTimeFormatOptions` for anything else. A date-fns PATTERN
 * ("dd.MM.yyyy") is deliberately not accepted: a pattern is one locale's order baked
 * into a string, which is how an English page ends up with German dates.
 */
export type FormatDateStyle = "short" | "medium" | "long" | "full" | "dateTime" | "time" | "monthYear";

const DATE_STYLES: Record<FormatDateStyle, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: "short" },
  medium: { dateStyle: "medium" },
  long: { dateStyle: "long" },
  full: { dateStyle: "full" },
  dateTime: { dateStyle: "medium", timeStyle: "short" },
  time: { timeStyle: "short" },
  monthYear: { month: "long", year: "numeric" },
};

export interface FormatDateOptions extends BaseOptions {
  /** An IANA zone ("Europe/Zurich") for a timestamp. Left out: the device's. A bare
   *  "YYYY-MM-DD" ignores it: a calendar day is the day it names in every zone. */
  timeZone?: string;
}

/** A bare ISO calendar day, `"YYYY-MM-DD"`. */
const BARE_ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What {@link formatDate} and {@link formatRelativeTime} accept. */
export type DateInput = string | number | Date | null | undefined;

/**
 * `value` as a Date, or null. A bare "YYYY-MM-DD" is a CALENDAR day and is read on the
 * local calendar (`parseIsoDate`) — `new Date("2026-07-08")` is UTC midnight, which is
 * the 7th anywhere west of Greenwich. Anything else (a full ISO timestamp, epoch
 * milliseconds, a Date) is an instant and goes through `Date` as is.
 */
export function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && BARE_ISO_DAY.test(value)) return parseIsoDate(value);
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
function dateFormatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, f);
  }
  return f;
}

/**
 * A date or timestamp in `locale`. Takes an ISO date ("2026-07-08", read on the local
 * calendar), an ISO timestamp ("2026-07-08T14:05:00Z"), epoch milliseconds or a Date.
 * `style` defaults to `medium`; see {@link FormatDateStyle}.
 *
 * `formatIsoDate` (`@eifi1/ui-kit/dates`) remains for a plain "YYYY-MM-DD" with an
 * explicit locale; this is its superset for timestamps and the named styles.
 */
export function formatDate(
  value: DateInput,
  style: FormatDateStyle | Intl.DateTimeFormatOptions = "medium",
  options: FormatDateOptions = {},
): string {
  const d = toDate(value);
  if (!d) return options.empty ?? EMPTY_FORMATTED_VALUE;
  const base = typeof style === "string" ? DATE_STYLES[style] : style;
  // A bare "YYYY-MM-DD" is a calendar day, which has no zone: it is the day it names
  // wherever it is read, so a `timeZone` (in `options` or the style) never moves it — the
  // device's local midnight shown in a zone west of it was the day before (round 0.45, N9).
  if (typeof value === "string" && BARE_ISO_DAY.test(value)) {
    const day = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return dateFormatter(options.locale, { ...base, timeZone: "UTC" }).format(day);
  }
  return dateFormatter(options.locale, options.timeZone ? { ...base, timeZone: options.timeZone } : base).format(d);
}

export interface FormatRelativeTimeOptions extends BaseOptions {
  /** The zone of the date printed past `absoluteAfterDays` (0.46), and (0.51.7) the zone
   *  whose calendar days "yesterday" and "2 days ago" count. Left out: the device's. */
  timeZone?: string;
  /** The moment it is measured from. Default: now. */
  now?: DateInput;
  /** `"auto"` (default): "yesterday", "now", "next week". `"always"`: "1 day ago". */
  numeric?: Intl.RelativeTimeFormatNumeric;
  /** `"long"` (default) "3 hours ago", `"short"` "3 hr. ago", `"narrow"` "3h ago". */
  style?: Intl.RelativeTimeFormatStyle;
  /**
   * Past this many days either way, print the date instead ({@link formatDate} in
   * `absoluteStyle`) — kastlan's feed switches to the date after a week, because "5
   * weeks ago" makes a reader do sums. Default: never.
   */
  absoluteAfterDays?: number;
  /** The style of that date. Default `medium`. */
  absoluteStyle?: FormatDateStyle | Intl.DateTimeFormatOptions;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** [the largest |difference| a unit is used for, the unit, its length]. */
const RELATIVE_STEPS: Array<[number, Intl.RelativeTimeFormatUnit, number]> = [
  [45 * SECOND, "second", SECOND],
  [45 * MINUTE, "minute", MINUTE],
  [22 * HOUR, "hour", HOUR],
  [6.5 * DAY, "day", DAY],
  [26 * DAY, "week", 7 * DAY],
  [320 * DAY, "month", 30.44 * DAY],
  [Infinity, "year", 365.25 * DAY],
];

/**
 * `d`'s calendar day in `timeZone` (left out: the device's), as a whole number of days:
 * that day's UTC midnight over a day's length. Two of them subtract to whole calendar
 * days — a 23- or 25-hour DST day still counts one.
 */
function dayNumber(d: Date, timeZone: string | undefined): number {
  if (!timeZone) return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
  // `en-US`: Gregorian, Latin digits — the parts are read back as numbers.
  const fields: Intl.DateTimeFormatOptions = { timeZone, year: "numeric", month: "numeric", day: "numeric" };
  const parts = dateFormatter("en-US", fields).formatToParts(d);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY;
}

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();
function relativeFormatter(
  locale: string | undefined,
  numeric: Intl.RelativeTimeFormatNumeric,
  style: Intl.RelativeTimeFormatStyle,
): Intl.RelativeTimeFormat {
  const key = `${locale ?? ""}|${numeric}|${style}`;
  let f = relativeFormatters.get(key);
  if (!f) {
    f = new Intl.RelativeTimeFormat(locale, { numeric, style });
    relativeFormatters.set(key, f);
  }
  return f;
}

/**
 * How long ago (or until) `value` is, in `locale`'s words, through
 * `Intl.RelativeTimeFormat`: "3 hours ago", "vor 3 Stunden", "il y a 3 heures",
 * "in 2 days", and under 45 seconds "now". The unit is picked by size — seconds,
 * minutes, hours, days, weeks, months, years — and the count is rounded; days are
 * CALENDAR days (0.51.7), in `timeZone` when given: "yesterday" is the day before today,
 * however few hours ago that was.
 */
export function formatRelativeTime(value: DateInput, options: FormatRelativeTimeOptions = {}): string {
  const d = toDate(value);
  if (!d) return options.empty ?? EMPTY_FORMATTED_VALUE;
  const now = toDate(options.now ?? new Date()) ?? new Date();
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (options.absoluteAfterDays !== undefined && abs > options.absoluteAfterDays * DAY) {
    return formatDate(d, options.absoluteStyle ?? "medium", options);
  }
  const rtf = relativeFormatter(options.locale, options.numeric ?? "auto", options.style ?? "long");
  const [, unit, size] = RELATIVE_STEPS.find(([limit]) => abs < limit)!;
  if (unit === "day") {
    // By the calendar, not in 24-hour units (refactor audit 2026-10-30, DSP-7): rounded
    // elapsed time made 00:10 seen at 23:50 "yesterday" and 01:00 yesterday seen at 23:30
    // "2 days ago", beside an exact date (DateMark's second line, the feedback thread's
    // tooltip) that said otherwise. Counted in `timeZone`, the zone that date is printed
    // in; a bare "YYYY-MM-DD" is the day it names wherever it is read, as in formatDate.
    // Still the same day (22 hours and more since just after midnight): in hours.
    const bareDay = typeof value === "string" && BARE_ISO_DAY.test(value);
    const days = dayNumber(d, bareDay ? undefined : options.timeZone) - dayNumber(now, options.timeZone);
    return days === 0 ? rtf.format(Math.round(diff / HOUR), "hour") : rtf.format(days, "day");
  }
  // Under 45 seconds is "now" rather than "12 seconds ago": a feed that ticks through
  // the seconds is noise, and nothing reads a timestamp to the second.
  const count = unit === "second" ? 0 : Math.round(diff / size);
  // `+ 0` folds -0 into 0: `format(-0, …)` says "0 seconds ago" instead of "now".
  return rtf.format(count + 0, unit);
}

/* ── Bound to the provider ─────────────────────────────────────────────────── */

type WithoutLocale<T> = Omit<T, "locale"> & { locale?: string };

/** What {@link useKitFormat} returns: the formatters above with the provider's locale
 *  as their default (an explicit `locale` in the options still wins). */
export interface KitFormat {
  /** The locale they format in — the provider's, or `undefined` (runtime default). */
  locale: string | undefined;
  formatNumber: (value: FormattableNumber, options?: WithoutLocale<FormatNumberOptions>) => string;
  formatMoney: (value: FormattableNumber, currency: string, options?: WithoutLocale<FormatMoneyOptions>) => string;
  formatPercent: (value: FormattableNumber, options?: WithoutLocale<FormatPercentOptions>) => string;
  formatDate: (
    value: DateInput,
    style?: FormatDateStyle | Intl.DateTimeFormatOptions,
    options?: WithoutLocale<FormatDateOptions>,
  ) => string;
  formatRelativeTime: (value: DateInput, options?: WithoutLocale<FormatRelativeTimeOptions>) => string;
}

/**
 * The formatters, bound to the `<UiKitProvider locale>` (or to `locale`, which wins
 * over it — the same precedence as a component's `locale` prop):
 *
 *     const { formatMoney, formatRelativeTime } = useKitFormat();
 *     formatMoney(row.balance, "CHF");
 */
export function useKitFormat(locale?: string): KitFormat {
  const kitLocale = useKitLocale(locale);
  // 0.46 (§10.3): the provider's `timeZone` for timestamps; a call's own wins, and a bare
  // "YYYY-MM-DD" ignores it (formatDate).
  const timeZone = useKitTimeZone();
  return useMemo<KitFormat>(
    () => ({
      locale: kitLocale,
      formatNumber: (value, options) => formatNumber(value, { locale: kitLocale, ...options }),
      formatMoney: (value, currency, options) => formatMoney(value, currency, { locale: kitLocale, ...options }),
      formatPercent: (value, options) => formatPercent(value, { locale: kitLocale, ...options }),
      formatDate: (value, style, options) => formatDate(value, style, { locale: kitLocale, timeZone, ...options }),
      formatRelativeTime: (value, options) => formatRelativeTime(value, { locale: kitLocale, timeZone, ...options }),
    }),
    [kitLocale, timeZone],
  );
}

/* ── Currency minor units ──────────────────────────────────────────────────── */

/**
 * The decimals a currency is written with — its minor unit: CHF and EUR 2, JPY 0,
 * KWD 3 — from `Intl`, or `undefined` for a code `Intl` does not accept. The rule
 * AmountInput settles a typed figure by, for a host that needs it outside the field.
 */
export function currencyMinorDigits(currency: string | null | undefined): number | undefined {
  if (!currency) return undefined;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return undefined;
  }
}

/** The options form of {@link roundToCurrency}'s third argument. */
export interface RoundToCurrencyOptions {
  /** Decimals to round to, whatever the currency — the plain `digits` argument. */
  digits?: number;
  /**
   * Decimals for a currency `Intl` cannot resolve — no code yet (`null`, `""`), or a
   * malformed one ("EURO", "€"). Left out, such a value comes back unchanged, as
   * before. Note that `Intl` resolves ANY well-formed three-letter code, a made-up
   * "XYZ" included (to 2), so this is the case of a missing or broken code, not of a
   * rare currency.
   */
  fallbackDigits?: number;
}

/**
 * `value` rounded to the currency's minor unit (or to `digits`), half away from zero,
 * in decimal arithmetic: 93.4213 CHF → 93.42, 1.005 EUR → 1.01 (`Math.round(1.005 *
 * 100)` is 100, since 1.005 is 1.00499… in binary). A non-finite value, or a currency
 * `Intl` does not know without `digits`, comes back unchanged (keksdose live #356: an
 * FX estimate set into an AmountInput showed four decimals) — unless the options form
 * gives `fallbackDigits`: `roundToCurrency(v, code, { fallbackDigits: 2 })` rounds a
 * figure whose currency is not chosen yet to cents rather than leaving 0.1 + 0.2 as is.
 * A finite value never comes back NaN or -0, however small or large (BUG-11):
 * 0.1 + 0.2 - 0.3 → 0, -0.004 → 0.
 */
export function roundToCurrency(
  value: number,
  currency: string | null | undefined,
  digits?: number | RoundToCurrencyOptions,
): number {
  const options = typeof digits === "object" && digits !== null ? digits : { digits };
  const places = options.digits ?? currencyMinorDigits(currency) ?? options.fallbackDigits;
  if (places === undefined) return value;
  return roundHalfAway(value, places);
}
