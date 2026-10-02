/**
 * IBAN helpers — ISO 13616 — for kastlan (supplier and customer bank details, the
 * Swiss QR-bill) and keksdose (the accounts behind a household's transfers).
 *
 * Both apps validated an IBAN the same partial way: a regex for the shape, sometimes a
 * mod-97, never the per-country length — so a Swiss IBAN with a digit missing passed
 * as long as the shorter string happened to sum right, and "CH" followed by 22
 * characters (a German length) was accepted as Swiss. And kastlan's QR-bill needs a
 * second distinction neither had: a **QR-IBAN** (the institution id at positions 5–9 is
 * 30000–31999) is the only account a QR-bill with a QR reference can be paid to, and it
 * cannot receive an ordinary transfer — so a regular IBAN typed where a QR-IBAN is
 * needed, or the other way round, is a payment that bounces weeks later.
 *
 * Everything here works on the **electronic format** (no spaces, upper case), which is
 * what to store; {@link formatIban} is the paper format, which is what to show.
 *
 * Validation is the registry's two rules, nothing more: the length for the country and
 * the mod-97 check digits. It does not check each country's BBAN layout (which places
 * hold letters), nor whether the bank exists — a checksum catches a typo, not a closed
 * account.
 */

/**
 * The IBAN length for each country in the SWIFT IBAN Registry (2025 edition) — the
 * whole string, country code and check digits included.
 *
 * A country that is not in the table does not issue IBANs, so {@link isValidIban}
 * refuses it ("XX" is a typo, not an exotic bank). Territories that use another
 * country's code (Åland under FI, Guernsey under GB, the French overseas departments
 * under FR) are covered by that code, as the registry lists them.
 */
export const IBAN_LENGTHS: Readonly<Record<string, number>> = Object.freeze({
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BI: 27,
  BR: 29, BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DJ: 27, DK: 18, DO: 28,
  EE: 20, EG: 29, ES: 24, FI: 18, FK: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23,
  GL: 18, GR: 27, GT: 28, HN: 28, HR: 21, HU: 28, IE: 22, IL: 23, IQ: 23, IS: 26,
  IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LC: 32, LI: 21, LT: 20, LU: 20, LV: 21,
  LY: 25, MC: 27, MD: 24, ME: 22, MK: 19, MN: 20, MR: 27, MT: 31, MU: 30, NI: 28,
  NL: 18, NO: 15, OM: 23, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22,
  RU: 33, SA: 24, SC: 31, SD: 18, SE: 24, SI: 19, SK: 24, SM: 27, SO: 23, ST: 25,
  SV: 28, TL: 23, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20, YE: 30,
});

/**
 * Which kind of IBAN a field accepts. `"any"`: every valid IBAN. `"qr"`: only a
 * QR-IBAN (a QR-bill with a QR reference — kastlan's payment slips). `"plain"`: every
 * valid IBAN EXCEPT a QR-IBAN (an account for ordinary transfers, which a QR-IBAN
 * cannot receive).
 */
export type IbanKind = "qr" | "plain" | "any";

/**
 * Why a value is not the IBAN a field wants, most fundamental first:
 *
 *  - `"format"` — it does not start with a two-letter country code and two digits;
 *  - `"country"` — the first two letters are not a country in {@link IBAN_LENGTHS};
 *  - `"length"` — the wrong number of characters for that country;
 *  - `"checksum"` — the mod-97 check digits do not match (a typo, a swapped pair);
 *  - `"qrRequired"` — a valid IBAN, but not a QR-IBAN where `kind="qr"` needs one;
 *  - `"qrNotAllowed"` — a valid QR-IBAN where `kind="plain"` refuses one.
 */
export type IbanProblem = "format" | "country" | "length" | "checksum" | "qrRequired" | "qrNotAllowed";

/**
 * The electronic format: every character that is not a letter or a digit dropped, the
 * letters in upper case. Spaces, non-breaking spaces, hyphens and dots — what a paste
 * from an invoice, a PDF or an e-banking screen carries — all go.
 *
 * A leading `"IBAN"` (the paper format's label: "IBAN CH56 …") is dropped too, but only
 * in front of a country code and check digits, so typing the word does not make it
 * vanish under the caret.
 */
export function compactIban(value: string): string {
  const compact = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return /^IBAN[A-Z]{2}\d{2}/.test(compact) ? compact.slice(4) : compact;
}

/**
 * The paper format: {@link compactIban}, then groups of four separated by a single
 * space ("CH09 0000 0000 0000 0000 1"). The last group is whatever is left over.
 */
export function formatIban(value: string): string {
  return compactIban(value).replace(/(.{4})(?=.)/g, "$1 ");
}

/** The remainder of a long digit string modulo 97, a few digits at a time so it never
 *  leaves the safe-integer range — ISO 7064 MOD 97-10 without a BigInt. */
function mod97(digits: string): number {
  let rest = 0;
  for (let i = 0; i < digits.length; i += 7) {
    rest = Number(`${rest}${digits.slice(i, i + 7)}`) % 97;
  }
  return rest;
}

/** Letters to their two-digit numbers (A = 10 … Z = 35), digits as they are. */
function expandLetters(value: string): string {
  return value.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
}

/**
 * The two check digits for a country code and a BBAN (the account part after them):
 * `98 − ((BBAN + country + "00") mod 97)`, letters expanded A = 10 … Z = 35.
 *
 * What an app needs to BUILD an IBAN — a test fixture, a demo, a migration that
 * assembles one from a clearing number and an account number — rather than to check
 * one. Both arguments are compacted first.
 */
export function ibanCheckDigits(country: string, bban: string): string {
  const rearranged = `${compactIban(bban)}${compactIban(country)}00`;
  const check = 98 - mod97(expandLetters(rearranged));
  return String(check).padStart(2, "0");
}

/**
 * The first thing wrong with `value` as an IBAN of `kind`, or `null` when it is one.
 * The value is compacted first, so the paper format is accepted. An empty value is
 * `"format"`: whether a field may be left empty is the form's rule, not the IBAN's.
 */
export function ibanProblem(value: string, kind: IbanKind = "any"): IbanProblem | null {
  const iban = compactIban(value);
  if (!/^[A-Z]{2}\d{2}/.test(iban)) return "format";
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected === undefined) return "country";
  if (iban.length !== expected) return "length";
  // 00, 01 and 99 are never computed (98 − r lies in 2…98), but 01 ≡ 98 mod 97 and
  // would otherwise pass the remainder test below — ISO 7064 rules them out.
  const check = iban.slice(2, 4);
  if (check === "00" || check === "01" || check === "99") return "checksum";
  if (mod97(expandLetters(`${iban.slice(4)}${iban.slice(0, 4)}`)) !== 1) return "checksum";
  if (kind === "any") return null;
  const qr = qrIid(iban);
  if (kind === "qr" && !qr) return "qrRequired";
  if (kind === "plain" && qr) return "qrNotAllowed";
  return null;
}

/**
 * Whether `value` is a valid IBAN: a registry country, that country's length, and
 * matching mod-97 check digits. Spaces and lower case are fine (see
 * {@link compactIban}); what to store is the compact form.
 */
export function isValidIban(value: string): boolean {
  return ibanProblem(value) === null;
}

/** A CH/LI IBAN whose institution id (positions 5–9) is in the QR range. Structure
 *  only — the caller has checked or will check the rest. */
function qrIid(iban: string): boolean {
  const country = iban.slice(0, 2);
  if (country !== "CH" && country !== "LI") return false;
  const iid = iban.slice(4, 9);
  if (!/^\d{5}$/.test(iid)) return false;
  const n = Number(iid);
  return n >= 30000 && n <= 31999;
}

/**
 * Whether `value` is a valid **QR-IBAN**: a valid Swiss or Liechtenstein IBAN whose
 * institution id — positions 5 to 9, the QR-IID — lies in 30000–31999 (SIX, Swiss
 * Implementation Guidelines for the QR-bill).
 *
 * The distinction is not cosmetic (kastlan): a QR-bill with a QR reference can only be
 * paid to a QR-IBAN, and a QR-IBAN can receive nothing else — so an app that prints
 * payment slips needs one, and an app that stores an account for ordinary transfers
 * must not take one.
 */
export function isQrIban(value: string): boolean {
  const iban = compactIban(value);
  return ibanProblem(iban) === null && qrIid(iban);
}
