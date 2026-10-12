/**
 * Decimal rounding, half away from zero — the one copy behind {@link roundToCurrency}
 * and AmountInput's settle (BUG-11, refactor audit 2026-10).
 *
 * Package-private — not re-exported from the barrel; `format.ts` and `calc.ts` are
 * re-exported wholesale, so a helper there would become API.
 *
 * WHY THE STRING SHIFT. `Math.round(1.005 * 100)` is 100, because 1.005 is 1.00499…
 * in binary. Shifting the decimal point in the number's SHORTEST spelling instead
 * ("1.005e2" is exactly 100.5) rounds the figure a person typed. Both helpers did that
 * by gluing `e${digits}` onto `String(n)` — but `String(n)` is itself in exponent form
 * below 1e-6 and at or above 1e21, and "5.55e-17e2" is NaN: `roundToCurrency(0.1 + 0.2
 * - 0.3, "EUR")` was NaN, and AmountInput blanked a typed "0.0000001" on blur (U-2's
 * class, 2026-08-24). {@link shiftDecimal} moves the exponent the string already has.
 */

/** `value × 10^by`, by moving the exponent of its shortest spelling ("1.005" → "1.005e2",
 *  "5.55e-17" → "5.55e-15"), so no binary multiplication creeps in. */
function shiftDecimal(value: number, by: number): number {
  const [mantissa, exponent = "0"] = String(value).split("e");
  return Number(`${mantissa}e${Number(exponent) + by}`);
}

/**
 * `n` rounded to `digits` decimals, half away from zero, in decimal arithmetic:
 * 1.005 → 1.01, -2.5 at 0 → -3. Never NaN for a finite `n`, and never -0 — `formatMoney`
 * prints -0 as "-0,00 €", so a negative that rounds away comes back as 0. A non-finite
 * `n` comes back unchanged.
 */
export function roundHalfAway(n: number, digits: number): number {
  if (!Number.isFinite(n)) return n;
  const abs = Math.abs(n);
  // Every double from 2^53 up is a whole number already, and scaling one near
  // Number.MAX_VALUE up would overflow to Infinity.
  const magnitude = abs >= 2 ** 53 ? abs : shiftDecimal(Math.round(shiftDecimal(abs, digits)), -digits);
  // The sign goes back on after rounding, so `|| 0` must see the signed result.
  return (n < 0 ? -magnitude : magnitude) || 0;
}
