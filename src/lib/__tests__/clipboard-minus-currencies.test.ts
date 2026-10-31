import { describe, expect, it } from "vitest";
import { asciiMinusInNumbers } from "../clipboard-minus";
import { formatMoney } from "../format";

/**
 * Every negative amount the kit prints leaves the clipboard with an ASCII minus (refactor
 * audit 2026-10-30, DSP-11).
 *
 * The copy handler (0.49 KIT-1b) looked past nothing, three capitals or one currency
 * symbol. English and Chinese write several currencies with letters in front of the
 * symbol — "−US$", "−CA$", "−A$", "−NZ$", "−HK$", "−R$", "−MX$", "−JP¥", "−CN¥" — and those
 * kept U+2212, so Excel pasted them as text: 35 of 351 at the default display, 136 of
 * 1428 with `narrowSymbol`. keksdose's signup offers USD, CAD, AUD, NZD and JPY, and its
 * English resolves to en-GB.
 */

const LOCALES = [
  "de-CH",
  "de-DE",
  "de",
  "en",
  "en-GB",
  "en-US",
  "en-AU",
  "en-CA",
  "fr",
  "fr-CH",
  "fr-CA",
  "it",
  "it-CH",
  "es",
  "pt-BR",
  "nl",
  "zh",
  "ja",
  "hu",
];

const CURRENCIES = [
  "CHF",
  "EUR",
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "HKD",
  "SGD",
  "NZD",
  "BRL",
  "MXN",
  "JPY",
  "CNY",
  "INR",
  "TWD",
  "ILS",
  "KRW",
  "PLN",
  "SEK",
  "NOK",
  "DKK",
  "CZK",
  "HUF",
  "TRY",
  "ZAR",
  "THB",
  "RUB",
];

const DISPLAYS = ["symbol", "narrowSymbol", "code", "name"] as const;

describe("asciiMinusInNumbers over the kit's own money", () => {
  it("leaves no U+2212 in front of any locale × currency × display", () => {
    const missed: string[] = [];
    for (const locale of LOCALES) {
      for (const currency of CURRENCIES) {
        for (const currencyDisplay of DISPLAYS) {
          const printed = formatMoney(-1234.5, currency, { locale, currencyDisplay });
          const copied = asciiMinusInNumbers(printed);
          if (copied.includes("−")) missed.push(`${locale} ${currency} ${currencyDisplay}: ${copied}`);
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it("still leaves a minus that is not before a number alone", () => {
    expect(asciiMinusInNumbers("a − b")).toBe("a − b");
    expect(asciiMinusInNumbers("x−y")).toBe("x−y");
    expect(asciiMinusInNumbers("Rent − deposit: −US$12")).toBe("Rent − deposit: -US$12");
  });
});
