import { COUNTRY_CODES, countryName, normalizeCountryCode } from "../countries";

/**
 * The country data behind CountrySelect (kastlan, keksdose): codes shipped, names
 * asked of the runtime.
 */
describe("COUNTRY_CODES", () => {
  it("is the 249 officially assigned ISO 3166-1 alpha-2 codes, upper-case, unique, in code order", () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
    expect([...COUNTRY_CODES].sort()).toEqual(COUNTRY_CODES);
  });

  it("holds both apps' countries and leaves user-assigned codes to the app", () => {
    for (const code of ["CH", "LI", "DE", "AT", "FR", "IT", "ES", "NL", "BE", "PT", "PL", "SE", "DK", "FI", "GB", "IE"]) {
      expect(COUNTRY_CODES).toContain(code);
    }
    expect(COUNTRY_CODES).not.toContain("XK");
    expect(COUNTRY_CODES).not.toContain("UK");
    expect(COUNTRY_CODES).not.toContain("EU");
  });

  it("is frozen, so no consumer can edit the kit's list for every other one", () => {
    expect(Object.isFrozen(COUNTRY_CODES)).toBe(true);
  });

  it("every code has a name in the runtime", () => {
    for (const code of COUNTRY_CODES) expect(countryName(code)).not.toBe(code);
  });
});

describe("countryName", () => {
  it("names a code in the locale asked for", () => {
    expect(countryName("CH", "de-CH")).toBe("Schweiz");
    expect(countryName("AT", "de")).toBe("Österreich");
    expect(countryName("CH", "fr")).toBe("Suisse");
  });

  it("is English without a locale, whatever language the runtime is in", () => {
    expect(countryName("CH")).toBe("Switzerland");
  });

  it("takes the code in either case", () => {
    expect(countryName("ch", "en")).toBe("Switzerland");
  });

  it("falls back to the upper-cased code, never to nothing", () => {
    // Not a region subtag at all.
    expect(countryName("c1", "en")).toBe("C1");
    // A locale the runtime refuses.
    expect(countryName("CH", "not a locale!")).toBe("CH");
  });
});

describe("normalizeCountryCode", () => {
  it("upper-cases two letters and refuses everything else", () => {
    expect(normalizeCountryCode("ch")).toBe("CH");
    expect(normalizeCountryCode("XK")).toBe("XK");
    expect(normalizeCountryCode("CHE")).toBeUndefined();
    expect(normalizeCountryCode("C1")).toBeUndefined();
    expect(normalizeCountryCode("")).toBeUndefined();
    expect(normalizeCountryCode(null)).toBeUndefined();
    expect(normalizeCountryCode(undefined)).toBeUndefined();
  });
});
