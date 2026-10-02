import { describe, expect, it } from "vitest";
import { PHONE_COUNTRIES, PHONE_DIAL_CODES, formatNationalPhone, formatPhone, isE164, parsePhone } from "../phone";

/**
 * Phone helpers (kastlan). As few numbers as possible, all of them unassignable or in
 * ranges reserved for fiction: Swiss, German and Italian numbers whose subscriber part
 * is zeros with a single 1, Liechtenstein's 1xx short-code block, France's ARCEP
 * fiction block (01 99 00 …) and North America's 555-01xx.
 */

const CH_E164 = "+41210000001";

describe("parsePhone — the six countries with rules", () => {
  it("reads a Swiss number with or without its trunk 0, and with its own +", () => {
    for (const typed of ["021 000 00 01", "21 000 00 01", "+41 21 000 00 01", "0041 21 000 00 01", "+41 (0)21 000 00 01", "+41 021 000 00 01", "021/000.00-01"]) {
      expect(parsePhone(typed, "CH")?.e164, typed).toBe(CH_E164);
    }
    expect(parsePhone("021 000 00 01")).toEqual({ e164: CH_E164, country: "CH", national: "210000001" });
  });

  it("checks the length for the country", () => {
    expect(parsePhone("021 000 00", "CH")).toBeNull();
    expect(parsePhone("021 000 00 011", "CH")).toBeNull();
    expect(parsePhone("01 99 00 00 01", "FR")?.e164).toBe("+33199000001");
    expect(parsePhone("01 99 00 00", "FR")).toBeNull();
  });

  it("keeps Italy's leading 0, which is part of the number", () => {
    expect(parsePhone("06 0000 0001", "IT")?.e164).toBe("+390600000001");
    expect(parsePhone("+39 06 0000 0001", "CH")?.e164).toBe("+390600000001");
  });

  it("reads Germany's bracketed area code, and Liechtenstein, which has no trunk 0", () => {
    expect(parsePhone("(030) 0000001", "DE")?.e164).toBe("+49300000001");
    expect(parsePhone("+423 100 00 01", "CH")).toEqual({ e164: "+4231000001", country: "LI", national: "1000001" });
    expect(parsePhone("0100 00 01", "LI")).toBeNull();
  });

  it("refuses what is not a number rather than guess", () => {
    expect(parsePhone("021 000 00 01 ext. 2", "CH")).toBeNull();
    expect(parsePhone("reception", "CH")).toBeNull();
    expect(parsePhone("", "CH")).toBeNull();
    expect(parsePhone("+0 21 000 00 01", "CH")).toBeNull();
  });
});

describe("parsePhone — any other country, with its own +", () => {
  it("takes 8 to 15 digits as E.164", () => {
    expect(parsePhone("+1 202 555 0101", "CH")).toEqual({ e164: "+12025550101", country: null, national: "12025550101" });
    expect(parsePhone("+1 555 010", "CH")).toBeNull();
    expect(parsePhone("+1 202 555 0101 0000", "CH")?.e164).toBe("+120255501010000");
    expect(parsePhone("+1 202 555 0101 00000", "CH")).toBeNull();
  });

  it("cannot read a number without + under 'other'", () => {
    expect(parsePhone("202 555 0101", "other")).toBeNull();
  });
});

describe("formatPhone / formatNationalPhone", () => {
  it("groups by the country's rules", () => {
    expect(formatPhone(CH_E164)).toBe("+41 21 000 00 01");
    expect(formatPhone("+41800000001")).toBe("+41 800 000 001");
    expect(formatPhone("+33199000001")).toBe("+33 1 99 00 00 01");
    expect(formatPhone("+4231000001")).toBe("+423 100 00 01");
    expect(formatPhone("+49300000001")).toBe("+49 30 0000001");
    expect(formatPhone("+390600000001")).toBe("+39 06 0000 0001");
    expect(formatNationalPhone("210000001", "CH")).toBe("21 000 00 01");
  });

  it("shows a generic number as + and its digits, and free text exactly as it is", () => {
    expect(formatPhone("+12025550101")).toBe("+12025550101");
    expect(formatPhone("021 000 00 01 (office)")).toBe("021 000 00 01 (office)");
    expect(formatPhone("")).toBe("");
  });
});

describe("isE164 and the tables", () => {
  it("is + and 8–15 digits", () => {
    expect(isE164(CH_E164)).toBe(true);
    expect(isE164("+41 21 000 00 01")).toBe(false);
    expect(isE164("0210000001")).toBe(false);
    expect(isE164("+1234567")).toBe(false);
  });

  it("lists the six countries in order with their codes", () => {
    expect(PHONE_COUNTRIES).toEqual(["CH", "LI", "DE", "AT", "FR", "IT"]);
    expect(PHONE_DIAL_CODES).toEqual({ CH: "41", LI: "423", DE: "49", AT: "43", FR: "33", IT: "39" });
  });
});
