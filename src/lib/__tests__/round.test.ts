import { describe, expect, it } from "vitest";
import { formatMoney, roundToCurrency } from "../format";
import { roundHalfAway } from "../round";

/**
 * BUG-11 (refactor audit 2026-10): both decimal-rounding helpers built
 * `` `${n}e${d}` `` from `String(n)`, which is itself in exponent form below 1e-6 and at
 * or above 1e21 — "5.55e-17e2" is NaN. `roundToCurrency(0.1 + 0.2 - 0.3, "EUR")` was
 * NaN (keksdose's FX row showed "NaN"), and `roundToCurrency(-0.004)` was -0, which
 * `formatMoney` printed as "-0,00 €". U-2's class (2026-08-24), in the two helpers that
 * audit did not touch.
 */

// Finite values across the whole double range, both signs, the audit's rows among them.
const SAMPLES: number[] = (() => {
  const named = [
    0,
    -0,
    0.1 + 0.2 - 0.3,
    5.55e-17,
    4e-7,
    9e-7,
    1e-6,
    0.004,
    0.005,
    1.005,
    2.5,
    93.4213,
    1e15,
    1e21,
    1.5e22,
    2 ** 53,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
  ];
  const sweep: number[] = [];
  for (let exponent = -320; exponent <= 308; exponent += 7) {
    for (const mantissa of [1, 1.005, 4.5, 5, 9.999]) sweep.push(Number(`${mantissa}e${exponent}`));
  }
  const all = [...named, ...sweep].filter(Number.isFinite);
  return [...all, ...all.map((n) => -n)];
})();

describe("roundToCurrency over the whole finite range", () => {
  it("never returns NaN, and never -0", () => {
    for (const digits of [0, 1, 2, 3, 4, 6]) {
      for (const value of SAMPLES) {
        const rounded = roundToCurrency(value, null, digits);
        expect({ value, digits, finite: Number.isFinite(rounded) }).toEqual({ value, digits, finite: true });
        expect({ value, digits, negativeZero: Object.is(rounded, -0) }).toEqual({ value, digits, negativeZero: false });
      }
    }
  });

  it("rounds to within half a minor unit", () => {
    for (const digits of [0, 2, 3]) {
      const half = 0.5 * 10 ** -digits;
      for (const value of SAMPLES) {
        const rounded = roundToCurrency(value, null, digits);
        // Relative slack for the large end, where a double has no fraction to round.
        expect(Math.abs(rounded - value)).toBeLessThanOrEqual(half + Math.abs(value) * Number.EPSILON);
      }
    }
  });

  it("answers the audit's rows", () => {
    expect(roundToCurrency(0.1 + 0.2 - 0.3, "EUR")).toBe(0);
    expect(roundToCurrency(5.55e-17, "EUR")).toBe(0);
    expect(roundToCurrency(4e-7, "EUR")).toBe(0);
    expect(roundToCurrency(1e21, "EUR")).toBe(1e21);
    expect(Object.is(roundToCurrency(-0.004, "EUR"), 0)).toBe(true);
    expect(roundToCurrency(1.005, "EUR")).toBe(1.01);
    expect(roundToCurrency(-1.005, "EUR")).toBe(-1.01);
  });

  it("rounds an exponent-form figure that does reach a minor unit", () => {
    // 9e-7 is "9e-7" as a string, and at six decimals it is one millionth, not nothing.
    expect(roundToCurrency(9e-7, null, 6)).toBe(0.000001);
    expect(roundToCurrency(4e-7, null, 6)).toBe(0);
  });

  it("prints a rounded-away negative as zero, not '-0,00 €'", () => {
    expect(formatMoney(roundToCurrency(-0.004, "EUR"), "EUR", { locale: "de-DE" })).not.toContain("-");
  });
});

describe("roundHalfAway", () => {
  it("rounds half away from zero, in decimal", () => {
    expect(roundHalfAway(2.5, 0)).toBe(3);
    expect(roundHalfAway(-2.5, 0)).toBe(-3);
    expect(roundHalfAway(1.005, 2)).toBe(1.01);
    expect(roundHalfAway(93.4213, 2)).toBe(93.42);
  });

  it("leaves the largest doubles whole, and non-finite input as it is", () => {
    expect(roundHalfAway(Number.MAX_VALUE, 2)).toBe(Number.MAX_VALUE);
    expect(roundHalfAway(-Number.MAX_VALUE, 2)).toBe(-Number.MAX_VALUE);
    expect(roundHalfAway(Infinity, 2)).toBe(Infinity);
    expect(roundHalfAway(Number.NaN, 2)).toBeNaN();
  });
});
