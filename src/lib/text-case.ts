/**
 * Upper-case the first letter only, in `locale` — the one copy of the rule (refactor audit
 * 2026-10-30, DUP-11: MonthPicker and JumpCalendar each had it, and MiniCalendar's caption
 * still used the CSS `capitalize` it was written against).
 *
 * Several locales (fr, es, it, pt, …) write month names in lower case, which at the head
 * of a field or a panel reads as a typo. But only the FIRST letter is ours to change:
 * `capitalize` upper-cases every word, so Spanish read "Septiembre De 2026", and a
 * caption that does not start with the month kept its wrong capital — Hungarian read
 * "2026. Szeptember". This gives "Septiembre de 2026" and "2026. szeptember".
 *
 * In `locale` because the case mapping is the language's: Turkish upper-cases "i" to "İ".
 * `undefined` is the runtime's default, as everywhere `Intl` takes one.
 *
 * Package-private — not re-exported from the barrel.
 */
export function upperFirst(text: string, locale: string | undefined): string {
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}
