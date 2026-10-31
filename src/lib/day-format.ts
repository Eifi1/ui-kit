import { useCallback } from "react";
import { useKitDateFormatter, useKitLocale, useKitTimeZone } from "../i18n/kit-labels";
import { toLocalIso } from "./dates";
import { clockTime } from "./date-format";
import { EMPTY_FORMATTED_VALUE, formatDate, toDate, type DateInput, type FormatDateStyle } from "./format";
import { dateFormatter } from "./intl-cache";
import { isBareIsoDay } from "./iso-day";

/**
 * How a kit component prints a day — ONE ladder (refactor audit 2026-10-30, DUP-2):
 *
 *  1. the component's own prop (`formatDate`, `renderDate`), when the app gave one and it
 *     answers;
 *  2. else the `<UiKitProvider formatDate>` (keksdose K12: the app's date-format
 *     preference), asked for the calendar day with `source: "dateMark"`;
 *  3. else the kit's `formatDate` in the provider's locale AND `timeZone` (0.46).
 *
 * 0.46's rule — "a label that identifies a day follows the preference" — held only where
 * a component wrote that ladder itself: four copies (admin's `useDayText`, AccountStateChip,
 * DateMark, the feedback table), while about twelve components took their own prop or
 * nothing and went straight to `lib/format`. keksdose set the provider's `formatDate` and
 * still passed it into six components by hand; and the 10 that imported the raw
 * `formatDate` ignored the provider's `timeZone`.
 *
 * @internal Not part of the barrel: the components' props are the public way in.
 */

/** What a {@link DayFormatter} call may ask for. */
export interface DayTextOptions {
  /**
   * Name the day of the week — what the provider's formatter is told (its `weekday`).
   * keksdose's rule: a date in a COLUMN carries it, a date in a SENTENCE does not
   * (dev#546). Default `false`. The kit's own rendering follows `style`, not this.
   */
  weekday?: boolean;
  /** Add the clock time, in the language (date-format rule 3): a timestamp. Default false. */
  time?: boolean;
  /** The kit's own rendering (step 3). Default `"medium"`, `"dateTime"` with `time`. */
  style?: FormatDateStyle | Intl.DateTimeFormatOptions;
  /** `false`: skip the provider (step 2) — a component's explicit style wins over it,
   *  as `DateMark`'s `dateStyle` does. Default `true`. */
  preference?: boolean;
  /** Printed for no value. Default "—". */
  empty?: string;
}

/** A component's day printer: a value in, its text out. */
export type DayFormatter<V extends DateInput = DateInput> = (value: V, options?: DayTextOptions) => string;

/** The calendar day `date` falls on in `timeZone`, as "YYYY-MM-DD" — so the day the
 *  provider is asked for is the day the kit's own rendering would print. */
function isoDayIn(date: Date, timeZone: string | undefined): string {
  if (!timeZone) return toLocalIso(date);
  try {
    // `en-CA` writes YYYY-MM-DD with Latin digits.
    const parts = dateFormatter("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
      date,
    );
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return toLocalIso(date);
  }
}

/**
 * The component's day printer, bound to its `prop`, the provider's `formatDate`, locale
 * and `timeZone`. `prop` is called with the value as the component passed it, and wins
 * whenever it answers non-empty. A value that does not parse is printed as it came
 * (a bug upstream is better seen than hidden behind a dash).
 */
export function useDayFormatter<V extends DateInput = DateInput>(
  prop?: ((value: V) => string) | null,
  localeProp?: string,
): DayFormatter<V> {
  const locale = useKitLocale(localeProp);
  const timeZone = useKitTimeZone();
  const fromProvider = useKitDateFormatter();
  return useCallback<DayFormatter<V>>(
    (value, options = {}) => {
      const own = prop?.(value);
      if (own) return own;
      if (value === null || value === undefined || value === "") return options.empty ?? EMPTY_FORMATTED_VALUE;
      const date = toDate(value);
      if (!date) return String(value);
      const bareDay = isBareIsoDay(value);
      if (fromProvider && options.preference !== false) {
        const iso = bareDay ? value : isoDayIn(date, timeZone);
        const day = fromProvider(iso, { unit: "day", source: "dateMark", locale, weekday: options.weekday ?? false });
        if (day) return options.time && !bareDay ? `${day}, ${clockTime(date, locale, timeZone)}` : day;
      }
      return formatDate(value, options.style ?? (options.time ? "dateTime" : "medium"), { locale, timeZone });
    },
    [prop, fromProvider, locale, timeZone],
  );
}
