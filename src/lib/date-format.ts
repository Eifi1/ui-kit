import { formatLocaleOf } from "../i18n/languages";
import type { KitDateFormatter } from "../i18n/kit-labels";
import { dateFormatter } from "./intl-cache";

/**
 * The date-format preference (0.46, lifted from keksdose's `date-format-store.ts`,
 * feedback #180): how a DAY is written — the order of day, month and year and the
 * separator between them — as a choice of its own, apart from the interface language.
 * "Read the app in English and still see German dates", or ISO everywhere.
 *
 * keksdose's rules, which the kit keeps:
 *
 * 1. **A label that identifies a day follows the preference** — anything that prints
 *    day, month and year goes through {@link formatDateWithPreference} (or the
 *    provider's `formatDate`, {@link dateFormatterFor}, for the kit's own date fields).
 * 2. **A label without a day follows the language**: "August 2026", a month or weekday
 *    NAME has no order to arrange. {@link dateFormatterFor} answers `""` for a month or a
 *    year, so the kit keeps its own rendering in the language.
 * 3. **A clock time follows the language**: `sv-SE` is a statement about digit order in
 *    a date, not about a 12- or 24-hour clock.
 * 4. **A weekday's NAME follows the language** (dev#546): `sv-SE` means "year first,
 *    with dashes", not "the reader speaks Swedish" — so with `weekday` the day's name is
 *    the language's, joined to the date the preference renders.
 *
 * The preference is the APP's to keep — keksdose holds it per device (a persisted store,
 * not an account column: nothing server-written formats a date for the reader). The kit
 * owns the vocabulary, the resolver, the renderer and the settings field
 * ({@link DateFormatSetting}).
 */

/** `"auto"` follows the interface language (the default — nobody's dates move until
 *  they ask); the rest are BCP 47 tags chosen for the SHAPE they produce: German
 *  01.08.2026, British 01/08/2026, US 08/01/2026, ISO 2026-08-01. */
export type DateFormatPreference = "auto" | "de-DE" | "en-GB" | "en-US" | "sv-SE";

/** The options in the order the setting lists them: `auto` first (the default), then
 *  German → UK → US → ISO. */
export const DATE_FORMAT_PREFERENCES: readonly DateFormatPreference[] = ["auto", "de-DE", "en-GB", "en-US", "sv-SE"];

/** Whether `value` is one of {@link DATE_FORMAT_PREFERENCES} — for a value read back from
 *  storage, where anything else falls back to `"auto"`. */
export function isDateFormatPreference(value: unknown): value is DateFormatPreference {
  return typeof value === "string" && (DATE_FORMAT_PREFERENCES as readonly string[]).includes(value);
}

/** A resolved preference: the locale and `Intl` options the date itself is rendered
 *  with, and — only when asked for — the locale the weekday's NAME comes from. */
export interface ResolvedDateFormat {
  locale: string | undefined;
  options: Intl.DateTimeFormatOptions;
  /** The language's format locale, present when `weekday` was asked for. */
  weekday?: { locale: string | undefined };
}

/** What {@link resolveDateFormat} and the renderers take beyond the preference. */
export interface DateFormatOptions {
  /** Name the day of the week too, in the interface language ("Mo., 01.08.2026"). A date
   *  in a COLUMN carries it; a date in a SENTENCE does not (keksdose dev#546). */
  weekday?: boolean;
}

/**
 * What a date is rendered with, given the preference and the interface language
 * (`language`: a code or tag — `"de"`, `"en"`, i18next's `resolvedLanguage`; it is read
 * through `formatLocaleOf`, so English is British and an unshipped tag stays itself).
 *
 * `"auto"` keeps the short-month shape ("01 Aug 2026", "01. Aug. 2026"); every explicit
 * choice is all-numeric, the only way it produces the shape its option promises —
 * `month: "short"` under `sv-SE` would print "2026 aug. 01", not ISO.
 */
export function resolveDateFormat(
  preference: DateFormatPreference,
  language: string | undefined,
  options: DateFormatOptions = {},
): ResolvedDateFormat {
  const languageLocale = language ? formatLocaleOf(language) : undefined;
  const weekday = options.weekday ? { weekday: { locale: languageLocale } } : {};
  if (preference === "auto") {
    return { locale: languageLocale, options: { year: "numeric", month: "short", day: "2-digit" }, ...weekday };
  }
  return { locale: preference, options: { year: "numeric", month: "2-digit", day: "2-digit" }, ...weekday };
}

/** A bare calendar day: no time, no zone. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `dateText`, already rendered under the preference, with the day's NAME around it in
 * `locale` (the language's). Not "weekday alone + comma": German says "So" alone and
 * "So., 06.09.2026" in company. The full date is formatted in the language and split
 * into parts; what that language puts before the first and after the last day/month/
 * year part (the weekday, its comma) frames the preference's digits — so where the two
 * locales coincide the output is the native string, character for character.
 */
function withWeekday(date: Date, dateText: string, locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const isDatePart = (p: Intl.DateTimeFormatPart) => p.type === "day" || p.type === "month" || p.type === "year";
  const parts = dateFormatter(locale, { weekday: "short", ...options }).formatToParts(date);
  const first = parts.findIndex(isDatePart);
  if (first === -1) return dateText;
  let last = first;
  parts.forEach((p, i) => {
    if (isDatePart(p)) last = i;
  });
  const join = (ps: Intl.DateTimeFormatPart[]) => ps.map((p) => p.value).join("");
  return join(parts.slice(0, first)) + dateText + join(parts.slice(last + 1));
}

/**
 * A date under the preference: `""` for no value, the input itself when it does not
 * parse. A bare "YYYY-MM-DD" is the calendar day it names in every zone (formatted in
 * UTC, undoing `new Date`'s UTC-midnight parse — west of Greenwich it read a day early);
 * a timestamp is an instant and stays in the reader's zone. The weekday, when asked for,
 * is rendered in the same zone, so a Sunday is never captioned Saturday.
 */
export function formatDateWithPreference(
  value: string | Date | null | undefined,
  preference: DateFormatPreference,
  language: string | undefined,
  options: DateFormatOptions = {},
): string {
  if (!value) return "";
  const resolved = resolveDateFormat(preference, language, options);
  const dateOnly = typeof value === "string" && DATE_ONLY.test(value);
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const intl: Intl.DateTimeFormatOptions = dateOnly ? { ...resolved.options, timeZone: "UTC" } : resolved.options;
  try {
    // Through the shared cache (refactor audit 2026-10-30, DUP-2): a `toLocaleDateString`
    // builds a formatter per call, which is why keksdose kept its own copy of this
    // renderer — 392 ms per click on a 270-row register (dev#632).
    const text = dateFormatter(resolved.locale, intl).format(date);
    return resolved.weekday ? withWeekday(date, text, resolved.weekday.locale, intl) : text;
  } catch {
    // A language tag `Intl` refuses: the ISO day rather than nothing (keksdose's fallback).
    return date.toISOString().slice(0, 10);
  }
}

/**
 * The clock time of `date` as the language writes it ("14:05"), two digits each: rule 3,
 * a clock follows the language, never the preference — `sv-SE` is a statement about the
 * order of a date's digits, not about a 12- or 24-hour clock. `language` is read through
 * `formatLocaleOf`, so English is the British 24-hour clock, not "02:05 PM" in a
 * German household's app. In `timeZone` when given, else the reader's.
 *
 * @internal Shared with the kit's own day formatter; not part of the barrel.
 */
export function clockTime(date: Date, language: string | undefined, timeZone?: string): string {
  try {
    const locale = language ? formatLocaleOf(language) : undefined;
    return dateFormatter(locale, { hour: "2-digit", minute: "2-digit", ...(timeZone ? { timeZone } : null) }).format(
      date,
    );
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

/**
 * A timestamp under the preference (0.52, keksdose's `formatDateTimeFor`, refactor audit
 * 2026-10-30, DUP-2): the date as {@link formatDateWithPreference} writes it, weekday
 * when asked for, then the clock time in the LANGUAGE ({@link clockTime}): "01.08.2026,
 * 14:05", "Sa., 01.08.2026, 14:05". keksdose's notification inbox and admin scheduler
 * were where an explicit ISO choice did nothing until it wrote this. `""` for no value,
 * the input itself when it does not parse; a bare "YYYY-MM-DD" names no moment, so it
 * prints as the date alone.
 */
export function formatDateTimeWithPreference(
  value: string | Date | null | undefined,
  preference: DateFormatPreference,
  language: string | undefined,
  options: DateFormatOptions = {},
): string {
  if (!value) return "";
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    return formatDateWithPreference(value, preference, language, options);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatDateWithPreference(date, preference, language, options)}, ${clockTime(date, language)}`;
}

/** The sample an option is labelled with — 1 August 2026 in its shape, the shape being
 *  the whole choice (a country name would say nothing about the digit order). */
export function dateFormatSample(preference: DateFormatPreference, language: string | undefined): string {
  return formatDateWithPreference("2026-08-01", preference, language);
}

/**
 * The `<UiKitProvider formatDate>` for a preference — so the kit's own date fields
 * (DatePicker, DateRangePicker, DateMark) write a day as the app's dates do. A day
 * follows the preference, with the weekday where the kit suggests it; a month or a year
 * answers `""` and keeps the kit's rendering in the language (rule 2). Rebuild it when
 * the preference or the language changes (a `useMemo` on both).
 */
export function dateFormatterFor(preference: DateFormatPreference, language: string | undefined): KitDateFormatter {
  return (iso, { unit, weekday, locale }) =>
    unit === "day" ? formatDateWithPreference(iso, preference, locale ?? language, { weekday }) : "";
}
