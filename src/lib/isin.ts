/**
 * ISIN helpers — ISO 6166 — for keksdose, whose securities holdings are keyed by ISIN
 * and whose import and edit forms checked only the shape (two letters, ten
 * characters): a mistyped ISIN saved happily and then matched no price feed.
 *
 * An ISIN is twelve characters: a two-letter prefix (the issuing country, or a
 * supranational code such as `XS`), nine letters or digits (the national number) and
 * one check digit. The check digit is the Luhn digit of the first eleven characters
 * with every letter expanded to two digits (A = 10 … Z = 35) — which is all that is
 * checked here. Whether the prefix is an assigned code, and whether the security
 * exists, is a lookup, not a checksum.
 */

/** Letters to their two-digit numbers (A = 10 … Z = 35), digits as they are. */
function expandLetters(value: string): string {
  return value.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
}

/** The Luhn sum of `digits` with the RIGHTMOST digit doubled first — the shape of the
 *  sum when a check digit is about to be appended. */
function luhnSum(digits: string, doubleRightmost: boolean): number {
  let sum = 0;
  let double = doubleRightmost;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum;
}

/**
 * The ISIN as it is printed: upper case, unbroken (ISO 6166 has no grouping), with
 * the spaces and hyphens a paste from a broker's statement carries dropped.
 */
export function formatIsin(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * The check digit for the first eleven characters of an ISIN (prefix and national
 * number). For BUILDING one — a test fixture, a demo — rather than checking it.
 */
export function isinCheckDigit(body: string): string {
  const sum = luhnSum(expandLetters(formatIsin(body)), true);
  return String((10 - (sum % 10)) % 10);
}

/**
 * Whether `value` is a valid ISIN: two letters, nine letters or digits, one digit,
 * and a matching Luhn check digit over the letter-expanded form. Spaces, hyphens and
 * lower case are fine (see {@link formatIsin}).
 */
export function isValidIsin(value: string): boolean {
  const isin = formatIsin(value);
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) return false;
  return luhnSum(expandLetters(isin), false) % 10 === 0;
}
