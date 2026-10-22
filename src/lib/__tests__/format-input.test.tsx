import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { formatMoney, formatNumber, formatPercent, useKitFormat } from "../format";

// 0.49 KIT-2: a missing value is not an invalid one. Numeric strings — what a Decimal
// field arrives as from a Python API ("1850.00") — are figures; null/undefined print
// `empty` quietly; anything else prints `empty` too, but a development build says so,
// once per call site.
const M = "−";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function devBuild() {
  vi.stubEnv("VITEST", "");
  vi.stubEnv("DEV", true);
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("numeric input (KIT-2)", () => {
  it("formats a number and a numeric string alike", () => {
    expect(formatMoney(1850, "CHF", { locale: "en" })).toBe("CHF 1,850.00");
    expect(formatMoney("1850.00", "CHF", { locale: "en" })).toBe("CHF 1,850.00");
    expect(formatNumber("1234.5", { locale: "en-US" })).toBe("1,234.5");
    expect(formatPercent("0.125", { locale: "en-US" })).toBe("12.5%");
  });

  it("formats a negative string with the typographic minus", () => {
    expect(formatNumber("-12.5", { locale: "en-US" })).toBe(`${M}12.5`);
    expect(formatMoney("-12.5", "CHF", { locale: "de-CH" })).toBe(`CHF${M}12.50`);
  });

  it("formats 0 and \"0\" as zero, never as the dash", () => {
    expect(formatMoney(0, "CHF", { locale: "en", currencyDisplay: "code" })).toBe("CHF 0.00");
    expect(formatMoney("0", "CHF", { locale: "en", currencyDisplay: "code" })).toBe("CHF 0.00");
    expect(formatMoney("0.00", "CHF", { locale: "en", currencyDisplay: "code" })).toBe("CHF 0.00");
    expect(formatNumber(0)).not.toBe("—");
    // A negative zero is zero: no minus in front of it.
    expect(formatNumber(-0, { locale: "en" })).toBe("0");
    expect(formatMoney("-0.00", "CHF", { locale: "en", currencyDisplay: "code" })).toBe("CHF 0.00");
  });

  it("prints `empty` for null and undefined, without a word", () => {
    const warn = devBuild();
    expect(formatMoney(null, "CHF")).toBe("—");
    expect(formatMoney(undefined, "CHF", { empty: "n/a" })).toBe("n/a");
    expect(formatNumber(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(warn).not.toHaveBeenCalled();
  });

  it("prints `empty` for an invalid value: a non-numeric string, an object, NaN, Infinity", () => {
    for (const bad of ["abc", "", "12,50", "1e", {}, [], Number.NaN, Infinity, -Infinity, true]) {
      expect(formatMoney(bad as never, "CHF"), String(bad)).toBe("—");
      expect(formatNumber(bad as never, { empty: "" }), String(bad)).toBe("");
      expect(formatPercent(bad as never), String(bad)).toBe("—");
    }
  });

  it("warns in a development build, once per call site, naming the value and its type", () => {
    const warn = devBuild();
    for (let i = 0; i < 3; i++) formatMoney("abc", "CHF");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/formatMoney/);
    expect(String(warn.mock.calls[0][0])).toMatch(/"abc"/);
    expect(String(warn.mock.calls[0][0])).toMatch(/string/);
    // Another call site warns on its own.
    formatNumber({} as never);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(String(warn.mock.calls[1][0])).toMatch(/object/);
    formatPercent(Number.NaN);
    expect(String(warn.mock.calls[2][0])).toMatch(/NaN/);
  });

  it("warns through useKitFormat too", () => {
    const warn = devBuild();
    const { result } = renderHook(() => useKitFormat("en"));
    expect(result.current.formatMoney("1850.00", "CHF")).toBe("CHF 1,850.00");
    expect(result.current.formatMoney("n/a", "CHF")).toBe("—");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("stays quiet in a production build and under the test runner", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITEST", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(formatMoney("abc", "CHF")).toBe("—");
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITEST", "true");
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(warn).not.toHaveBeenCalled();
  });

  it("formats a decimal string past double precision as its nearest double (no big-decimal)", () => {
    // "12345678901234.56789" has 19 significant digits; a double holds ~15–17. The
    // figure is printed at the currency's two decimals, which a double this size still
    // carries correctly — only digits past ~16 would be lost.
    expect(formatMoney("12345678901234.56789", "CHF", { locale: "en", currencyDisplay: "code" })).toBe(
      "CHF 12,345,678,901,234.57",
    );
  });
});
