/**
 * One `Intl.DateTimeFormat` per locale and option set, for every date the kit prints.
 *
 * Constructing the formatter is the expensive part: keksdose measured 392 ms per click on
 * a 270-row register when each cell built its own (dev#632), and kept its own renderer of
 * the date-format preference because the kit's built one per call (refactor audit
 * 2026-10-30, DUP-2). `lib/format` and `lib/date-format` both format through this one.
 *
 * @internal Not part of the barrel — `lib/format` is re-exported whole, so the cache
 * lives apart from it.
 */

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** The cached formatter for `locale` and `options`. Throws as `Intl.DateTimeFormat` does
 *  for a tag it refuses — and caches nothing then. */
export function dateFormatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = dateFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, f);
  }
  return f;
}
