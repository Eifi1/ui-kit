// `@eifi1/ui-kit/currencies` — the currencies the kit's pickers offer, as plain data
// (0.34.1, keksdose's 0.34 report).
//
// This module imports NOTHING: no React, no stylesheet, no other kit module. That is the
// entry's whole promise, because an app's BUILD reads it in Node — keksdose's Vite plugin
// builds its flag-icons subset from these country codes while Vite loads its config. Until
// 0.34.1 that plugin parsed the `country` literals out of dist/components/currency-select.js;
// 0.34 moved the list into the picker's option list and 91 of its test files failed at
// load. A file inside dist/ is not something the kit promises; an entry is.
// packaging-contract.test.ts pins the purity, scripts/verify-package.mjs the load in Node.
//
// CurrencySelect, AmountInput's currency chip and NumberInput's code detection read this
// same array (components/currency-option-list re-exports it, and currency-select as it
// always has), so the list the pickers show and the flags an app ships cannot drift.

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  /** ISO 3166-1 alpha-2 country code (lowercase) used by flag-icons. */
  country: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", name: "Euro", symbol: "€", country: "eu" },
  { code: "USD", name: "US Dollar", symbol: "$", country: "us" },
  { code: "GBP", name: "British Pound", symbol: "£", country: "gb" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", country: "ch" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", country: "jp" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", country: "ca" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", country: "au" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", country: "nz" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", country: "se" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", country: "no" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", country: "dk" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", country: "pl" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", country: "cz" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", country: "hu" },
  { code: "RON", name: "Romanian Leu", symbol: "lei", country: "ro" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", country: "bg" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", country: "tr" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", country: "ru" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", country: "cn" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", country: "hk" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", country: "sg" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", country: "in" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", country: "br" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", country: "mx" },
  { code: "ZAR", name: "South African Rand", symbol: "R", country: "za" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", country: "il" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", country: "ae" },
];

/**
 * Each currency code → the flag the kit paints for it: the lowercase ISO 3166-1 alpha-2
 * code flag-icons names it by (`fi-ch`, `flags/4x3/ch.svg`). `CHF` → `"ch"`, `EUR` →
 * `"eu"` (flag-icons has the EU's flag under that code).
 *
 * Derived from {@link CURRENCIES}, so a currency the pickers gain is a flag here too. An
 * app that ships only the flags it renders builds its subset from these values:
 *
 * ```ts
 * // vite.config.ts — plain Node, no DOM
 * import { CURRENCY_COUNTRIES } from "@eifi1/ui-kit/currencies";
 * const flags = new Set(Object.values(CURRENCY_COUNTRIES));
 * ```
 */
export const CURRENCY_COUNTRIES: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c.country]),
);
