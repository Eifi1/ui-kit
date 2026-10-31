import { describe, expect, it } from "vitest";
import { sanitizeLive } from "../calc";
import { decimalMark, normalizeTypedMarks, readTyped } from "../decimal-marks";
import { formatMoney, formatNumber } from "../format";

/**
 * A figure pasted into a numeric field reads as the number it says (refactor audit
 * 2026-10-30, INP-3).
 *
 * (a) The minus. Since 0.49 the kit's own `formatMoney` and `formatNumber` print a
 * negative with U+2212, and the per-keystroke `sanitizeLive` kept only the ASCII "-": a
 * negative copied out of a kit table and pasted into an amount field arrived positive.
 * `evaluateExpression` already read the glyph; the keystroke path did not.
 *
 * (b) The order of the marks. With both "." and "," in one number, the one that is not the
 * locale's was taken as grouping wherever it stood, so "1.234,56" in a "." locale (en,
 * de-CH) read as 1.23456 — and a money field then settled it to 1.23. Whichever mark
 * comes last is the decimal one.
 */

describe("a pasted minus", () => {
  it.each(["−", "–", "—"])("keeps %s as the sign", (minus) => {
    expect(sanitizeLive(`${minus}12.50`)).toBe("-12.50");
    expect(readTyped(`${minus}12,50`, ",")).toBe("-12.50");
  });

  it("keeps it as a subtraction inside a sum", () => {
    expect(sanitizeLive("50−8")).toBe("50-8");
  });
});

describe("both marks in one number", () => {
  it.each([
    // [typed, the locale's mark, read as]
    ["1.234,56", ".", "1234.56"],
    ["1,234.56", ",", "1234.56"],
    ["1.234.567,89", ".", "1234567.89"],
    ["1,234,567.89", ",", "1234567.89"],
    // Unchanged: the locale's own mark last.
    ["1.234,56", ",", "1234.56"],
    ["1,234.56", ".", "1234.56"],
  ])("reads %s in a %s locale as %s", (typed, mark, read) => {
    expect(readTyped(typed, mark as "," | ".")).toBe(read);
  });

  it("decides per operand", () => {
    expect(normalizeTypedMarks("1.234,5+1,234.5", ".")).toBe("1234,5+1234.5");
  });
});

describe("what the kit prints, a field reads back", () => {
  it.each(["de-DE", "de-CH", "fr-CH", "it-CH", "en-US", "en-GB", "fr-FR"])("%s", (locale) => {
    const mark = decimalMark(locale);
    expect(Number(readTyped(formatNumber(-1234.5, { locale }), mark))).toBe(-1234.5);
    expect(Number(readTyped(formatMoney(-1234.5, "EUR", { locale }), mark))).toBe(-1234.5);
  });
});
