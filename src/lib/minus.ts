/**
 * The one minus sign (0.49, KIT-1). `Intl.NumberFormat` writes a negative with the
 * HYPHEN-MINUS (U+002D) in nearly every locale — en, de-CH, fr, it, es, hu, zh — and
 * with the typographic MINUS SIGN (U+2212) in a few (sv, fi). The kit prints U+2212
 * everywhere, as `SignedAmount` always has: it is as wide as "+" and the tabular
 * digits, so a column of signed figures lines up, and it does not break a line the way
 * a hyphen may.
 *
 * `"ascii"` is the other way round, for text a machine reads back — a CSV, the
 * clipboard: every minus becomes U+002D, whatever the locale wrote, so `Number()` and a
 * spreadsheet parse it.
 */
export type MinusStyle = "typographic" | "ascii";

/** U+2212 MINUS SIGN. */
export const TYPOGRAPHIC_MINUS = "\u2212";

/** The parts `formatToParts` writes a minus in (the exponent's, under `notation:
 *  "scientific"`, too). */
const MINUS_PARTS: ReadonlySet<string> = new Set(["minusSign", "exponentMinusSign"]);

/**
 * `formatter.format(value)` with every minus sign in `minus` style. Only the parts
 * `Intl` marks as a minus are touched — a hyphen inside a currency's name
 * ("Bosnia-Herzegovina convertible marks") stays — and only when the text holds the
 * other sign at all, so a positive figure costs no `formatToParts`.
 *
 * Public since 0.50 (the KIT-1 follow-up): an app that keeps its OWN `Intl.NumberFormat`
 * wrapper (a currency with app-specific digits, a quantity) calls it in place of
 * `formatter.format(value)`, so its negatives match the kit's "−". Where the wrapper only
 * re-states `formatMoney` / `formatNumber`, route it through those instead.
 *
 * @example
 *   const eur = new Intl.NumberFormat("en", { style: "currency", currency: "EUR" });
 *   formatWithMinus(eur, -150);          // "−€150.00"
 *   formatWithMinus(eur, -150, "ascii"); // "-€150.00", for a CSV
 */
export function formatWithMinus(
  formatter: Intl.NumberFormat,
  value: number,
  minus: MinusStyle = "typographic",
): string {
  const text = formatter.format(value);
  const [wanted, other] = minus === "ascii" ? ["-", TYPOGRAPHIC_MINUS] : [TYPOGRAPHIC_MINUS, "-"];
  if (!text.includes(other)) return text;
  return formatter
    .formatToParts(value)
    .map((part) => (MINUS_PARTS.has(part.type) ? wanted : part.value))
    .join("");
}
