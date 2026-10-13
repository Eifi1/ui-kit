import { describe, expect, it } from "vitest";
import { CURRENCIES, CURRENCY_COUNTRIES } from "../currencies";
import { CURRENCIES as FROM_SELECT, getCurrency } from "../components/currency-select";
import { CURRENCIES as FROM_OPTION_LIST } from "../components/currency-option-list";

/**
 * `@eifi1/ui-kit/currencies` (0.35, keksdose's 0.34 report): the currencies the pickers
 * offer as plain data, and `CURRENCY_COUNTRIES`, the flag each one paints — what keksdose's
 * flag-icons subset is built from. Its purity (it imports nothing) is
 * packaging-contract.test.ts's; its loading in plain Node, scripts/verify-package.mjs's.
 */
describe("@eifi1/ui-kit/currencies", () => {
  it("maps each currency code to the lowercase country flag-icons names its flag by", () => {
    expect(CURRENCY_COUNTRIES.CHF).toBe("ch");
    expect(CURRENCY_COUNTRIES.EUR).toBe("eu");
    expect(CURRENCY_COUNTRIES.USD).toBe("us");
    expect(CURRENCY_COUNTRIES.GBP).toBe("gb");
    for (const country of Object.values(CURRENCY_COUNTRIES)) expect(country).toMatch(/^[a-z]{2}$/);
  });

  it("is derived from CURRENCIES, so the two cannot drift", () => {
    expect(Object.keys(CURRENCY_COUNTRIES)).toEqual(CURRENCIES.map((c) => c.code));
    for (const c of CURRENCIES) expect(CURRENCY_COUNTRIES[c.code]).toBe(c.country);
    // Every currency the kit ships has a flag; a currency without one is the blank box
    // the app's subset would ship.
    expect(CURRENCIES.length).toBeGreaterThan(20);
  });

  it("is the very array the pickers read, under every name it had before", () => {
    expect(FROM_SELECT).toBe(CURRENCIES);
    expect(FROM_OPTION_LIST).toBe(CURRENCIES);
    expect(getCurrency("chf")?.country).toBe(CURRENCY_COUNTRIES.CHF);
  });
});
