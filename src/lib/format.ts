import { useMemo } from "react";
import { useKitLocale } from "../i18n/kit-labels";
import { parseIsoDate } from "./dates";

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
 * A missing value — `null`, `undefined`, `NaN`, an unparseable date — formats as
 * `empty` (default "—", the dash `StatTile` shows for no value), never as "NaN" or
 * "Invalid Date".
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

export interface FormatNumberOptions extends BaseOptions {
  digits?: FormatDigits;
  /** Compact notation: 12 400 → "12K". */
  compact?: boolean;
  /** `"exceptZero"` for a change ("+3", "−3", "0"). Default: the minus only. */
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
  /** Any further `Intl.NumberFormat` options, merged over the ones above. */
  options?: Intl.NumberFormatOptions;
}

export interface FormatMoneyOptions extends FormatNumberOptions {
  /** `"symbol"` (default), `"narrowSymbol"`, `"code"` ("CHF 12.00") or `"name"`. */
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
}

export interface FormatPercentOptions extends FormatNumberOptions {
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

function numberOptions(o: FormatNumberOptions): Intl.NumberFormatOptions {
  return {
    ...digitOptions(o.digits),
    ...(o.compact ? { notation: "compact" } : null),
    ...(o.signDisplay ? { signDisplay: o.signDisplay } : null),
    ...o.options,
  };
}

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

/** A number in `locale`: "1,234.5", "1.234,5", "1’234.5". */
export function formatNumber(value: number | null | undefined, options: FormatNumberOptions = {}): string {
  if (isMissing(value)) return options.empty ?? EMPTY_FORMATTED_VALUE;
  return numberFormatter(options.locale, numberOptions(options)).format(value);
}

/** An amount of `currency` (ISO 4217) in `locale`: "CHF 1’234.50", "1.234,50 €". */
export function formatMoney(
  value: number | null | undefined,
  currency: string,
  options: FormatMoneyOptions = {},
): string {
  if (isMissing(value)) return options.empty ?? EMPTY_FORMATTED_VALUE;
  return numberFormatter(options.locale, {
    style: "currency",
    currency,
    ...(options.currencyDisplay ? { currencyDisplay: options.currencyDisplay } : null),
    ...numberOptions(options),
  }).format(value);
}

/** A percentage in `locale` ("12%", "12 %", "+1.25%"). See {@link FormatPercentOptions.ratio}
 *  for what `value` means. Default digits: at most one. */
export function formatPercent(value: number | null | undefined, options: FormatPercentOptions = {}): string {
  if (isMissing(value)) return options.empty ?? EMPTY_FORMATTED_VALUE;
  const ratio = options.ratio === false ? value / 100 : value;
  return numberFormatter(options.locale, {
    style: "percent",
    ...(options.digits === undefined ? { maximumFractionDigits: 1 } : null),
    ...numberOptions(options),
  }).format(ratio);
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
  /** An IANA zone ("Europe/Zurich") for a timestamp. Left out: the device's. */
  timeZone?: string;
}

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
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseIsoDate(value);
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
  return dateFormatter(options.locale, options.timeZone ? { ...base, timeZone: options.timeZone } : base).format(d);
}

export interface FormatRelativeTimeOptions extends BaseOptions {
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
 * minutes, hours, days, weeks, months, years — and the count is rounded.
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
  formatNumber: (value: number | null | undefined, options?: WithoutLocale<FormatNumberOptions>) => string;
  formatMoney: (
    value: number | null | undefined,
    currency: string,
    options?: WithoutLocale<FormatMoneyOptions>,
  ) => string;
  formatPercent: (value: number | null | undefined, options?: WithoutLocale<FormatPercentOptions>) => string;
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
  return useMemo<KitFormat>(
    () => ({
      locale: kitLocale,
      formatNumber: (value, options) => formatNumber(value, { locale: kitLocale, ...options }),
      formatMoney: (value, currency, options) => formatMoney(value, currency, { locale: kitLocale, ...options }),
      formatPercent: (value, options) => formatPercent(value, { locale: kitLocale, ...options }),
      formatDate: (value, style, options) => formatDate(value, style, { locale: kitLocale, ...options }),
      formatRelativeTime: (value, options) => formatRelativeTime(value, { locale: kitLocale, ...options }),
    }),
    [kitLocale],
  );
}
