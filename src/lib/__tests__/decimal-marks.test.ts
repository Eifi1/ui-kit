import { describe, expect, it } from "vitest";
import { normalizeTypedMarks, readTyped } from "../decimal-marks";

/**
 * The grouping rule every numeric field reads typed text with (keksdose G1, K5).
 *
 * BUG-6 (refactor audit 2026-10): in a "," locale the thousands shape was
 * `\d{1,3}(\.\d{3})+`, so "0.500" read as five hundred — a dot-habit typist writing
 * a half got a value a thousand times too large, in every amount and number field of
 * a German form. A group that starts with 0 is never thousands grouping.
 */
describe("normalizeTypedMarks in a comma locale", () => {
  it.each([
    // [typed, read as (dot-decimal)]
    ["0.500", "0.5"],
    ["0.250", "0.25"],
    ["0.125", "0.125"],
    ["1.500", "1500"],
    ["12.500", "12500"],
    ["999.000", "999000"],
    ["12.345.678", "12345678"],
    ["1.234,56", "1234.56"],
    ["1.5", "1.5"],
    ["0,500", "0.5"],
  ])("reads %s as %s", (typed, read) => {
    expect(Number(readTyped(typed, ","))).toBe(Number(read));
  });

  it("leaves a lone leading-zero dot in place for the live sanitising", () => {
    expect(normalizeTypedMarks("0.500", ",")).toBe("0.500");
    expect(normalizeTypedMarks("1.500", ",")).toBe("1500");
  });

  it("reads each operand of an expression on its own", () => {
    expect(normalizeTypedMarks("0.500+1.500", ",")).toBe("0.500+1500");
  });
});

describe("normalizeTypedMarks in a dot locale", () => {
  it("is untouched by the comma-locale rule", () => {
    expect(readTyped("0.500", ".")).toBe("0.500");
    expect(readTyped("1.500", ".")).toBe("1.500");
    expect(readTyped("1,234,567", ".")).toBe("1234567");
  });
});
