/**
 * The locale's decimal mark and the reading of typed grouping marks, shared by the
 * kit's numeric text fields: {@link AmountInput}, {@link NumberInput} and, through
 * NumberInput, {@link NumberField} and {@link MoneyField}.
 *
 * Package-private — not re-exported from the barrel. It lives here rather than in
 * `calc.ts` because that module is re-exported wholesale (`export * from
 * "./lib/calc"`), and these are the fields' plumbing, not API.
 *
 * WHY ONE MODULE. AmountInput learned the locale's mark (kastlan 40) and the grouping
 * parse (keksdose G1); NumberInput learned neither, so the same "1.234,56" a German
 * user typed into a money field read as 1234.56 and, typed into the budget-goal field
 * next to it, as 1.23456 (keksdose K5). Two private copies of the same rule are how
 * that happened, so the rule now has one home.
 */
import { sanitizeLive } from "./calc";

/**
 * The locale's decimal mark, as far as a field can type it: "," or "." (kastlan 40).
 * A mark outside those two (Arabic's "٫") is not one {@link sanitizeLive} lets
 * through, so those locales keep the dot rather than get a field that eats the key it
 * shows. `undefined` is the runtime's own locale, which is what `Intl` reads it as.
 */
export function decimalMark(locale: string | undefined): "," | "." {
  try {
    const part = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal");
    return part?.value === "," ? "," : ".";
  } catch {
    // An invalid tag throws a RangeError; a typo in a locale must not take the form down.
    return ".";
  }
}

/**
 * Which typed mark is the decimal one (keksdose G1). {@link sanitizeLive} folds every
 * "," into ".", so on its own it read the German "1.234,56" as 1.23456 — and a money
 * field's settle then made that 1.23, final. This decides per operand, from the
 * typist's own text, before that fold:
 *
 * - both marks present: the one that is not the locale's is grouping, and goes;
 * - in a "," locale, only "." present: grouping when it cannot be a decimal as a
 *   German reader writes it — twice ("1.234.567"), or in thousands shape ("1.234",
 *   "12.500") — otherwise a decimal ("1.5", typed by a dot-decimal habit);
 * - in a "." locale, only "," present: grouping when it appears twice ("1,234,567");
 *   once it stays a decimal, because Swiss and German typists write "1,5" in a
 *   de-CH form (kastlan 40) and a unit price "1,789" is a decimal.
 *
 * Only a keystroke's text comes through here. A calculator result is dot-decimal
 * already, and "1.234" from `100/81.03…` is never a thousand.
 */
export function normalizeTypedMarks(raw: string, mark: "," | "."): string {
  const other = mark === "," ? "." : ",";
  return raw.replace(/[0-9.,]+/g, (operand) => {
    const hasMark = operand.includes(mark);
    const count = operand.split(other).length - 1;
    if (count === 0) return operand;
    const grouping = hasMark
      ? true
      : count > 1 || (mark === "," && /^\d{1,3}(\.\d{3})+$/.test(operand));
    return grouping ? operand.split(other).join("") : operand;
  });
}

/** What a keystroke's raw text reports: grouping read off, then the field's live
 *  sanitising (comma → dot, stray characters out, one decimal point per operand). */
export function readTyped(raw: string, mark: "," | "."): string {
  return sanitizeLive(normalizeTypedMarks(raw, mark));
}

// Spacing a typist uses to group digits — a space, the no-break and narrow no-break
// spaces `Intl` itself writes for fr-CH ("1 234,5" with U+202F), and the Swiss
// apostrophes ("1'234.50"). The live sanitising drops them, so they never reach the
// value; the draft may still show them.
const GROUP_SPACING = /[\s'’\u00a0\u202f]/g;

/**
 * Whether the field may keep SHOWING `raw` — the typist's own text — while it holds
 * `canonical` (dot-decimal, as `onChange` reported it).
 *
 * Showing the typed text rather than re-spelling the value is what keeps the caret
 * where the typist put it, and what keeps a grouping "." from being turned into a ","
 * under their fingers — after which no rule could tell the two apart (keksdose G1).
 * But only text that says the same as the value, and says it with nothing the field
 * would have DROPPED: a letter, or a second decimal point in one operand ("1.2.3"),
 * must not stay on screen while the value says "1.23" (Keksdose live #201 is the bug
 * that showing it would bring back). Grouping marks and grouping spaces may stay.
 */
export function showsTyped(raw: string, mark: "," | ".", canonical: string): boolean {
  const read = normalizeTypedMarks(raw, mark).replace(GROUP_SPACING, "");
  const sanitized = sanitizeLive(read);
  // Nothing dropped: the read text is the sanitised one, but for which mark it uses.
  return sanitized === read.replace(/,/g, ".") && sanitized === sanitizeLive(canonical);
}

/** A dot-decimal text spelt in `mark` — display only, one character for one, so a
 *  re-spelling never moves a caret. */
export function localizeMark(text: string, mark: "," | "."): string {
  return mark === "," ? text.replace(/\./g, ",") : text;
}
