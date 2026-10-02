import { describe, expect, it } from "vitest";
import {
  IBAN_LENGTHS,
  compactIban,
  formatIban,
  ibanCheckDigits,
  ibanProblem,
  isQrIban,
  isValidIban,
} from "../iban";

/**
 * IBAN helpers (kastlan, keksdose). Every IBAN here is SYNTHETIC: a country code and an
 * account part of zeros with a single 1, its check digits computed by the module's own
 * {@link ibanCheckDigits} — and that helper checked against an independent BigInt
 * mod-97, so the fixtures do not just agree with themselves.
 */

const make = (country: string, bban: string) => `${country}${ibanCheckDigits(country, bban)}${bban}`;

/** ISO 13616 by the book, with BigInt: rearrange, expand letters, mod 97 must be 1. */
const referenceValid = (iban: string) => {
  const digits = `${iban.slice(4)}${iban.slice(0, 4)}`.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return BigInt(digits) % 97n === 1n;
};

const CH = make("CH", `${"0".repeat(16)}1`);
const CH_QR = make("CH", `30000${"0".repeat(11)}1`);
const DE = make("DE", `${"0".repeat(17)}1`);

describe("ibanCheckDigits", () => {
  it("computes digits an independent mod-97 accepts", () => {
    for (const iban of [CH, CH_QR, DE]) expect(referenceValid(iban)).toBe(true);
  });

  it("pads to two digits", () => {
    expect(ibanCheckDigits("CH", `${"0".repeat(16)}1`)).toMatch(/^\d{2}$/);
  });
});

describe("compactIban / formatIban", () => {
  it("drops spaces, non-breaking spaces, hyphens and dots, upper-cases", () => {
    const messy = `${CH.slice(0, 4).toLowerCase()} ${CH.slice(4, 8)}\u00a0${CH.slice(8, 12)}-${CH.slice(12, 16)}.${CH.slice(16)}`;
    expect(compactIban(messy)).toBe(CH);
  });

  it("drops the paper format's IBAN label, but not the word on its own", () => {
    expect(compactIban(`IBAN ${formatIban(CH)}`)).toBe(CH);
    expect(compactIban("IBAN")).toBe("IBAN");
    expect(compactIban("IBANC")).toBe("IBANC");
  });

  it("groups in fours with the remainder last", () => {
    expect(formatIban(CH)).toBe(`${CH.slice(0, 4)} 0000 0000 0000 0000 1`);
    expect(formatIban(DE)).toBe(`${DE.slice(0, 4)} 0000 0000 0000 0000 01`);
    expect(formatIban(formatIban(CH))).toBe(formatIban(CH));
    expect(formatIban("ch")).toBe("CH");
    expect(formatIban("")).toBe("");
  });
});

describe("isValidIban / ibanProblem", () => {
  it("accepts a valid IBAN, compact or grouped, any case", () => {
    expect(isValidIban(CH)).toBe(true);
    expect(isValidIban(formatIban(DE).toLowerCase())).toBe(true);
    expect(ibanProblem(CH)).toBeNull();
  });

  it("refuses a changed digit and a swapped pair as a checksum problem", () => {
    const changed = `${CH.slice(0, -1)}2`;
    // The last two characters are "01": swapped, "10".
    const swapped = `${CH.slice(0, 19)}${CH[20]}${CH[19]}`;
    expect(ibanProblem(changed)).toBe("checksum");
    expect(ibanProblem(swapped)).toBe("checksum");
  });

  it("checks the length for the country", () => {
    expect(ibanProblem(CH.slice(0, -1))).toBe("length");
    expect(ibanProblem(`${CH}0`)).toBe("length");
    // A Swiss code on a German length is not Swiss.
    expect(ibanProblem(`CH${DE.slice(2)}`)).toBe("length");
  });

  it("refuses a country that issues no IBANs, and a broken start", () => {
    expect(ibanProblem(`XX00${"0".repeat(17)}`)).toBe("country");
    expect(ibanProblem(`12${CH.slice(2)}`)).toBe("format");
    expect(ibanProblem(`CHA${CH.slice(3)}`)).toBe("format");
    expect(ibanProblem("")).toBe("format");
  });

  it("refuses check digits 00, 01 and 99 even where the remainder would pass", () => {
    // Find an account part whose check digits come out as 98: 01 ≡ 98 (mod 97), so
    // the remainder test alone would take 01 there too.
    let bban = "";
    for (let n = 1; n < 10_000; n++) {
      const candidate = String(n).padStart(17, "0");
      if (ibanCheckDigits("CH", candidate) === "98") {
        bban = candidate;
        break;
      }
    }
    expect(bban).not.toBe("");
    expect(isValidIban(`CH98${bban}`)).toBe(true);
    expect(referenceValid(`CH01${bban}`)).toBe(true);
    expect(ibanProblem(`CH01${bban}`)).toBe("checksum");
    expect(ibanProblem(`CH00${bban}`)).toBe("checksum");
    expect(ibanProblem(`CH99${bban}`)).toBe("checksum");
  });

  it("applies the kind: qr needs a QR-IBAN, plain refuses one", () => {
    expect(ibanProblem(CH, "qr")).toBe("qrRequired");
    expect(ibanProblem(DE, "qr")).toBe("qrRequired");
    expect(ibanProblem(CH_QR, "qr")).toBeNull();
    expect(ibanProblem(CH_QR, "plain")).toBe("qrNotAllowed");
    expect(ibanProblem(CH, "plain")).toBeNull();
    expect(ibanProblem(CH_QR, "any")).toBeNull();
    // An invalid value reports what is wrong with it first, whatever the kind.
    expect(ibanProblem(CH.slice(0, -1), "qr")).toBe("length");
  });

  it("has a registry length for every country, all within ISO 13616's 15–34", () => {
    for (const [country, length] of Object.entries(IBAN_LENGTHS)) {
      expect(country).toMatch(/^[A-Z]{2}$/);
      expect(length).toBeGreaterThanOrEqual(15);
      expect(length).toBeLessThanOrEqual(34);
    }
    expect(IBAN_LENGTHS.CH).toBe(21);
    expect(IBAN_LENGTHS.LI).toBe(21);
    expect(IBAN_LENGTHS.DE).toBe(22);
  });
});

describe("isQrIban", () => {
  const withIid = (country: string, iid: string) => make(country, `${iid}${"0".repeat(11)}1`);

  it("is a valid CH or LI IBAN whose institution id is 30000–31999", () => {
    expect(isQrIban(CH_QR)).toBe(true);
    expect(isQrIban(formatIban(CH_QR))).toBe(true);
    expect(isQrIban(withIid("LI", "31999"))).toBe(true);
    expect(isQrIban(withIid("CH", "29999"))).toBe(false);
    expect(isQrIban(withIid("CH", "32000"))).toBe(false);
    expect(isQrIban(CH)).toBe(false);
  });

  it("is never a QR-IBAN when invalid, or outside CH/LI", () => {
    expect(isQrIban(`${CH_QR.slice(0, -1)}2`)).toBe(false);
    expect(isQrIban(make("DE", `30000${"0".repeat(12)}1`))).toBe(false);
  });
});
