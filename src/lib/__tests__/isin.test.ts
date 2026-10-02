import { describe, expect, it } from "vitest";
import { formatIsin, isValidIsin, isinCheckDigit } from "../isin";

/**
 * ISIN helpers (keksdose). Every ISIN here is SYNTHETIC: a prefix and a national number
 * of zeros with a single 1 (or a single letter), its check digit computed by the
 * module's own {@link isinCheckDigit} — and that helper pinned once against a check
 * digit worked out by hand, so the fixtures do not just agree with themselves.
 */

const make = (body: string) => `${body}${isinCheckDigit(body)}`;

const DIGITS = make("CH000000001");
const LETTER = make("XS00000000A");

describe("isinCheckDigit", () => {
  it("is the Luhn digit of the letter-expanded body", () => {
    // C=12 H=17 → 1217000000001; doubling from the right: 2+0+0+0+0+0+0+0+0+7+2+2+2 = 15 → 5.
    expect(isinCheckDigit("CH000000001")).toBe("5");
    // X=33 S=28 A=10 → 33280000000010 → 1.
    expect(isinCheckDigit("XS00000000A")).toBe("1");
  });
});

describe("isValidIsin", () => {
  it("accepts a valid ISIN, with letters in the national number too", () => {
    expect(isValidIsin(DIGITS)).toBe(true);
    expect(isValidIsin(LETTER)).toBe(true);
  });

  it("accepts spaces, hyphens and lower case", () => {
    expect(isValidIsin(` ${DIGITS.slice(0, 2).toLowerCase()} ${DIGITS.slice(2, 11)}-${DIGITS.slice(11)} `)).toBe(true);
  });

  it("refuses a wrong check digit and a changed character", () => {
    expect(isValidIsin(`${DIGITS.slice(0, 11)}${(Number(DIGITS[11]) + 1) % 10}`)).toBe(false);
    expect(isValidIsin(`${LETTER.slice(0, 10)}B${LETTER[11]}`)).toBe(false);
  });

  it("refuses the wrong shape", () => {
    expect(isValidIsin(DIGITS.slice(0, 11))).toBe(false);
    expect(isValidIsin(`${DIGITS}0`)).toBe(false);
    expect(isValidIsin(`1H${DIGITS.slice(2)}`)).toBe(false);
    expect(isValidIsin(`${DIGITS.slice(0, 11)}A`)).toBe(false);
    expect(isValidIsin("")).toBe(false);
  });
});

describe("formatIsin", () => {
  it("prints it unbroken and upper case", () => {
    expect(formatIsin(" ch 000000001-5 ")).toBe("CH0000000015");
    expect(formatIsin(DIGITS)).toBe(DIGITS);
  });
});
