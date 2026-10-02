/**
 * Phone numbers — E.164 in, grouped out — for kastlan's contacts, without a
 * libphonenumber dependency.
 *
 * kastlan stored whatever was typed ("079 …", "+41 (0)79 …", "0041 79 …") and could
 * neither dial nor de-duplicate it. What it needs is one canonical form to store —
 * E.164, "+41210000001" — and a readable one to show. libphonenumber gets both right
 * for every country, at ~150 kB of metadata in every app's bundle; the kit's apps are
 * Swiss and their neighbours, so this is **light per-country rules** for the six that
 * matter and a generic shape check for the rest:
 *
 *  - **CH, LI, DE, AT, FR, IT**: the national trunk prefix is dropped (a leading 0 —
 *    but NOT for Italy, whose fixed-line numbers keep their 0 after +39, and not for
 *    Liechtenstein, which has none), and the remaining national number has to be a
 *    plausible length for the country.
 *  - **Anything else** typed with its own "+" (or "00"): the digits, 8 to 15 in all,
 *    are taken as an E.164 number as they stand.
 *
 * **The limitation:** a plausible length is not a valid number. There is no check of
 * area codes or number ranges, so a well-formed number that does not exist passes, and
 * a German or Austrian number (whose area codes run from one to five digits) is
 * grouped only where the split is known (mobile prefixes, the largest cities) and
 * otherwise shown in one block. A number these rules cannot read is not an error —
 * {@link parsePhone} returns `null` and the field keeps the text as typed.
 */

/** The countries with their own rules. */
export type PhoneCountryCode = "CH" | "LI" | "DE" | "AT" | "FR" | "IT";

/** A country with rules, or `"other"`: a number typed with its own "+". */
export type PhoneCountry = PhoneCountryCode | "other";

interface CountryRule {
  /** The country calling code, without the "+". */
  dial: string;
  /** A national number starts with a trunk 0 that is dropped after the country code. */
  trunk: boolean;
  /** The national significant number itself may start with 0 (Italy's fixed lines). */
  zeroStart?: boolean;
  /** The national significant number's length, inclusive. */
  min: number;
  max: number;
  /** Groups for display, given the national significant number. */
  group: (nsn: string) => string[];
}

/** `nsn` cut into the given sizes; whatever is left is one last group. */
function cut(nsn: string, sizes: number[]): string[] {
  const out: string[] = [];
  let at = 0;
  for (const size of sizes) {
    if (at >= nsn.length) break;
    out.push(nsn.slice(at, at + size));
    at += size;
  }
  if (at < nsn.length) out.push(nsn.slice(at));
  return out;
}

const RULES: Record<PhoneCountryCode, CountryRule> = {
  // 9 digits, 2-3-2-2 ("21 000 00 01"); the 08xx/09xx service numbers 3-3-3.
  CH: {
    dial: "41",
    trunk: true,
    min: 9,
    max: 9,
    group: (n) => (/^[89]/.test(n) ? cut(n, [3, 3, 3]) : cut(n, [2, 3, 2, 2])),
  },
  // 7 digits, 3-2-2 ("100 00 01"), and 9 for some mobile ranges (3-3-3). No trunk prefix.
  LI: {
    dial: "423",
    trunk: false,
    min: 7,
    max: 9,
    group: (n) => (n.length === 7 ? cut(n, [3, 2, 2]) : n.length === 9 ? cut(n, [3, 3, 3]) : [n]),
  },
  // Area codes of two to five digits: only the mobile prefixes and the four
  // two-digit cities are split; anything else is one block rather than a wrong split.
  DE: {
    dial: "49",
    trunk: true,
    min: 6,
    max: 13,
    group: (n) =>
      /^15/.test(n)
        ? cut(n, [4])
        : /^1[67]/.test(n)
          ? cut(n, [3])
          : /^(30|40|69|89)/.test(n)
            ? cut(n, [2])
            : [n],
  },
  // Vienna is "1"; mobile numbers start 6xx; other area codes vary, so one block.
  AT: {
    dial: "43",
    trunk: true,
    min: 6,
    max: 13,
    group: (n) => (/^6/.test(n) ? cut(n, [3]) : /^1/.test(n) ? cut(n, [1]) : [n]),
  },
  // 9 digits, 1-2-2-2-2 ("1 99 00 00 01").
  FR: { dial: "33", trunk: true, min: 9, max: 9, group: (n) => cut(n, [1, 2, 2, 2, 2]) },
  // The 0 of a fixed line is part of the number ("+39 06 …"); mobiles start with 3.
  IT: {
    dial: "39",
    trunk: false,
    zeroStart: true,
    min: 6,
    max: 11,
    group: (n) => (/^3/.test(n) ? cut(n, [3, 3]) : /^0[26]/.test(n) ? cut(n, [2, 4]) : [n]),
  },
};

/** The country calling codes with rules, "+" left off: `{ CH: "41", … }`. */
export const PHONE_DIAL_CODES: Readonly<Record<PhoneCountryCode, string>> = Object.freeze({
  CH: RULES.CH.dial,
  LI: RULES.LI.dial,
  DE: RULES.DE.dial,
  AT: RULES.AT.dial,
  FR: RULES.FR.dial,
  IT: RULES.IT.dial,
});

/** The countries with rules, in the order a picker offers them by default. */
export const PHONE_COUNTRIES: readonly PhoneCountryCode[] = Object.freeze(["CH", "LI", "DE", "AT", "FR", "IT"]);

/** Longest dial code first, so "+423" is Liechtenstein before anything shorter. */
const BY_DIAL = [...PHONE_COUNTRIES].sort((a, b) => RULES[b].dial.length - RULES[a].dial.length);

/** What {@link parsePhone} reads out of a number. */
export interface ParsedPhone {
  /** The number in E.164: "+", the country code, the national number. */
  e164: string;
  /** The country whose rules read it, or `null` for a generic "+…" number. */
  country: PhoneCountryCode | null;
  /** The national significant number — the digits after the country code. For a
   *  generic number, every digit after the "+" (the country code is not split off). */
  national: string;
}

/** A national significant number that passes `rule`, or `null`. */
function national(digits: string, rule: CountryRule): string | null {
  const nsn = rule.trunk && digits.startsWith("0") ? digits.slice(1) : digits;
  // A national number starts with 0 only where 0 is part of it (Italy's fixed lines).
  if (nsn.startsWith("0") && !rule.zeroStart) return null;
  if (nsn.length < rule.min || nsn.length > rule.max) return null;
  return nsn;
}

/**
 * Read a typed number. With a leading "+" or "00" the number carries its own country
 * code — one of the six with rules, or any other (8–15 digits in all, the E.164
 * limit). Without one it is a national number of `country` (default `"CH"`), its
 * trunk 0 optional; with `country="other"` a number without "+" cannot be read.
 *
 * Spaces, hyphens, dots, slashes and parentheses are ignored ("(030) 1234567"), and
 * so is the "(0)" of "+41 (0)21 …". Anything else — a letter, an extension ("ext. 12"), a note —
 * and the result is `null`: the text is not a number these rules can read, and a field
 * keeps it as it is rather than guess.
 */
export function parsePhone(input: string, country: PhoneCountry = "CH"): ParsedPhone | null {
  const text = input.trim();
  if (text === "" || !/^\+?[\d\s().\-/]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  let international = text.startsWith("+");
  if (!international && digits.startsWith("00")) {
    international = true;
    digits = digits.slice(2);
  }
  if (international) {
    // "+41 (0)21 …": the bracketed trunk prefix written for callers inside the country.
    digits = text.replace(/\(\s*0\s*\)/g, "").replace(/\D/g, "").replace(/^00/, "");
    if (digits.startsWith("0")) return null;
    const known = BY_DIAL.find((c) => digits.startsWith(RULES[c].dial));
    if (known) {
      const rule = RULES[known];
      const nsn = national(digits.slice(rule.dial.length), rule);
      return nsn === null ? null : { e164: `+${rule.dial}${nsn}`, country: known, national: nsn };
    }
    if (digits.length < 8 || digits.length > 15) return null;
    return { e164: `+${digits}`, country: null, national: digits };
  }
  if (country === "other") return null;
  const rule = RULES[country];
  const nsn = national(digits, rule);
  return nsn === null ? null : { e164: `+${rule.dial}${nsn}`, country, national: nsn };
}

/** The national number grouped by its country's rules ("21 000 00 01"). */
export function formatNationalPhone(nsn: string, country: PhoneCountryCode): string {
  return RULES[country].group(nsn).join(" ");
}

/**
 * A number for display: an E.164 number (or anything {@link parsePhone} reads with a
 * "+") grouped by its country's rules — "+41 21 000 00 01" — and a generic one as
 * "+" and its digits. Anything it cannot read comes back exactly as it went in, so a
 * list of contacts can format every row without first sorting out the free text.
 */
export function formatPhone(value: string): string {
  const parsed = value.trim().startsWith("+") ? parsePhone(value, "other") : null;
  if (!parsed) return value;
  if (!parsed.country) return parsed.e164;
  return `+${RULES[parsed.country].dial} ${formatNationalPhone(parsed.national, parsed.country)}`;
}

/** Whether `value` is in E.164 shape: "+" and 8–15 digits, nothing else. Shape only —
 *  what {@link PhoneInput} emits for every number it could read. */
export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
