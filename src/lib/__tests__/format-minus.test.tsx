import { describe, expect, it } from "vitest";
import { formatMoney, formatNumber, formatPercent } from "../format";
import { formatWithMinus, TYPOGRAPHIC_MINUS } from "../minus";
import { cellNumber, parseTable } from "../table-text";

// 0.49 KIT-1: one minus sign. Every formatter prints a negative with U+2212, as
// SignedAmount always has; `minus: "ascii"` gives U+002D for text a machine reads back.
const M = TYPOGRAPHIC_MINUS;
const LOCALES = ["de-CH", "en", "es", "fr", "it", "hu", "zh"];

describe("one minus sign (KIT-1)", () => {
  it("formatNumber prints U+2212", () => {
    expect(formatNumber(-1234.5, { locale: "en-US" })).toBe(`${M}1,234.5`);
    expect(formatNumber(-3, { locale: "en-US", signDisplay: "exceptZero" })).toBe(`${M}3`);
    expect(formatNumber(-3.4, { locale: "de-DE", unit: "N" })).toBe(`${M}3,4\u202FN`);
  });

  it("compact notation prints U+2212", () => {
    expect(formatNumber(-12400, { locale: "en-US", compact: true })).toBe(`${M}12K`);
  });

  it("formatMoney prints U+2212, wherever the locale puts the sign", () => {
    expect(formatMoney(-1234.5, "CHF", { locale: "en" })).toBe(`${M}CHF\u00A01,234.50`);
    expect(formatMoney(-1234.5, "CHF", { locale: "de-CH" })).toBe(`CHF${M}1'234.50`);
    // A hyphen in a currency's NAME is not a minus and stays.
    const named = formatMoney(-2, "BAM", { locale: "en", currencyDisplay: "name" });
    expect(named.startsWith(M)).toBe(true);
    expect(named).toContain("Bosnia-Herzegovina");
  });

  it("formatPercent prints U+2212", () => {
    expect(formatPercent(-0.12, { locale: "en-US" })).toBe(`${M}12%`);
    expect(formatPercent(-1.25, { locale: "en-US", ratio: false, digits: 2 })).toBe(`${M}1.25%`);
  });

  it("no formatter leaves a hyphen-minus in any of the kit's seven locales", () => {
    for (const locale of LOCALES) {
      for (const text of [
        formatNumber(-1234.5, { locale }),
        formatNumber(-12400, { locale, compact: true }),
        formatMoney(-1234.5, "CHF", { locale }),
        formatMoney(-1234.5, "EUR", { locale, currencyDisplay: "code" }),
        formatPercent(-0.125, { locale }),
      ]) {
        expect(text, `${locale}: ${text}`).not.toContain("-");
        expect(text, `${locale}: ${text}`).toContain(M);
      }
    }
  });

  it('`minus: "ascii"` gives U+002D, also where the locale itself writes U+2212', () => {
    expect(formatNumber(-1234.5, { locale: "en-US", minus: "ascii" })).toBe("-1,234.5");
    expect(formatMoney(-5, "CHF", { locale: "en", minus: "ascii" })).toBe("-CHF\u00A05.00");
    expect(formatPercent(-0.12, { locale: "en-US", minus: "ascii" })).toBe("-12%");
    // Swedish writes U+2212 on its own: ascii still turns it into a hyphen.
    expect(formatNumber(-1.5, { locale: "sv", minus: "ascii" })).toBe("-1,5");
    expect(formatNumber(-1.5, { locale: "sv" })).toBe(`${M}1,5`);
  });

  it("formatWithMinus touches the exponent's minus too, and leaves positives alone", () => {
    const sci = new Intl.NumberFormat("en", { notation: "scientific" });
    expect(formatWithMinus(sci, -0.00012)).toBe(`${M}1.2E${M}4`);
    expect(formatWithMinus(sci, -0.00012, "ascii")).toBe("-1.2E-4");
    expect(formatWithMinus(new Intl.NumberFormat("en"), 12)).toBe("12");
  });

  it("an export written with minus: \"ascii\" holds numbers a machine parses back", () => {
    const values = [-1234.5, -0.01, 0, 12.25, -98765.43];
    // A plain-number export (no grouping): Number() and the kit's own import read it.
    const cells = values.map((v) =>
      formatNumber(v, { locale: "en", minus: "ascii", options: { useGrouping: false } }),
    );
    expect(cells.map(Number)).toEqual(values);
    expect(cells.map(cellNumber)).toEqual(values);
    const csv = `amount;delta\n${values.map((_, i) => `${cells[i]};${cells[i]}`).join("\n")}`;
    expect(parseTable(csv, { decimal: "whole-text" }).rows).toEqual(values.map((v) => [v, v]));
    // A comma-decimal locale reads back through the unconditional cell rule.
    const de = values.map((v) =>
      formatNumber(v, { locale: "de-CH", minus: "ascii", options: { useGrouping: false } }),
    );
    expect(de.map(cellNumber)).toEqual(values);
    // The typographic default is what Number() would NOT read: the reason for the option.
    expect(Number(formatNumber(-1.5, { locale: "en" }))).toBeNaN();
  });
});
