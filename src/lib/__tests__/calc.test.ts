import {
  commitExpression,
  evaluateExpression,
  formatResult,
  isBareAmount,
  looksLikeExpression,
  sanitizeLive,
  splitLeadingSign,
} from "../calc";

/**
 * Characterisation suite for the arithmetic evaluator behind every numeric field
 * (refactor plan 2026-08-24, U-1b).
 *
 * The comments in `calc.ts` name eight specific field reports — #201, #334, #144,
 * #103, #9 — each of them a decision somebody made deliberately and nothing pinned.
 * These are the assertions those comments were always describing.
 */

describe("evaluateExpression", () => {
  it("evaluates the field's own examples", () => {
    expect(evaluateExpression("12.50+3.20")).toBe(15.7);
    expect(evaluateExpression("100/3")).toBeCloseTo(33.3333333, 6);
  });

  it("honours precedence and left-associativity", () => {
    expect(evaluateExpression("2+3*4")).toBe(14);
    expect(evaluateExpression("(2+3)*4")).toBe(20);
    expect(evaluateExpression("100-10-10")).toBe(80);
    expect(evaluateExpression("100/10/2")).toBe(5);
  });

  it("accepts the on-screen keypad glyphs and comma decimals", () => {
    expect(evaluateExpression("6×7")).toBe(42);
    expect(evaluateExpression("84÷2")).toBe(42);
    expect(evaluateExpression("50−8")).toBe(42);
    expect(evaluateExpression("1,5+1,5")).toBe(3);
  });

  it("resolves unary minus, including the doubled form", () => {
    expect(evaluateExpression("-42")).toBe(-42);
    expect(evaluateExpression("-42−−50")).toBe(8);
    expect(evaluateExpression("-(2+3)")).toBe(-5);
  });

  it("returns null rather than a wrong number for malformed input", () => {
    expect(evaluateExpression("")).toBeNull();
    expect(evaluateExpression("12+")).toBeNull();
    expect(evaluateExpression("1.2.3")).toBeNull();
    expect(evaluateExpression("(2+3")).toBeNull();
    expect(evaluateExpression("2+3)")).toBeNull();
    expect(evaluateExpression("12 34")).toBeNull();
    expect(evaluateExpression("abc")).toBeNull();
  });

  it("treats division by zero as invalid, not Infinity", () => {
    expect(evaluateExpression("1/0")).toBeNull();
    expect(evaluateExpression("1/(2-2)")).toBeNull();
  });

  it("never runs what it is given (the grammar is closed)", () => {
    expect(evaluateExpression("process.exit(1)")).toBeNull();
    expect(evaluateExpression("1;2")).toBeNull();
    expect(evaluateExpression("2**3")).toBeNull(); // '**' parses as two operators
  });
});

describe("looksLikeExpression", () => {
  it("says no to a plain number, including a negative one", () => {
    expect(looksLikeExpression("42")).toBe(false);
    expect(looksLikeExpression("-5")).toBe(false);
    expect(looksLikeExpression("0,5")).toBe(false);
    expect(looksLikeExpression("")).toBe(false);
  });

  it("says yes to arithmetic, on-screen glyphs included", () => {
    expect(looksLikeExpression("12+5")).toBe(true);
    expect(looksLikeExpression("-42−−50")).toBe(true); // the case the glyph set was widened for
    expect(looksLikeExpression("6×7")).toBe(true);
    expect(looksLikeExpression("(2)")).toBe(true);
  });
});

describe("formatResult", () => {
  it("trims binary float noise", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
    expect(formatResult(100 / 3)).toBe("33.3333333333");
  });

  it("is empty for the non-finite", () => {
    expect(formatResult(NaN)).toBe("");
    expect(formatResult(Infinity)).toBe("");
  });

  it("stays inside the grammar its own consumers can read back (U-2)", () => {
    // The invariant the finding reduces to: whatever formatResult renders, the
    // commit path must read back unchanged. `Number.prototype.toString` switches to
    // exponent notation below 1e-6 and at/above 1e21, and neither `tokenize` nor
    // `sanitizeLive` accepts the letter `e` — so before the fix "1e-7" was recommitted
    // as "17" and 9.99e+23 as "9.9999999999823".
    for (const n of [
      1e-7, 3.3333333333e-10, 9.99999999998e23, 1e21, 5e-9, -1e-7, -9.99e23, 1e-6, 1e20,
    ]) {
      const rendered = formatResult(n);
      expect(rendered).not.toMatch(/e/i);
      expect(commitExpression(rendered)).toBe(rendered);
    }
  });

  it("does not lose an ordinary money figure to the fix", () => {
    expect(formatResult(15.7)).toBe("15.7");
    expect(formatResult(-3.5)).toBe("-3.5");
    expect(formatResult(0)).toBe("0");
    expect(formatResult(1234.56)).toBe("1234.56");
  });
});

describe("commitExpression", () => {
  it("resolves an expression and normalises a plain number", () => {
    expect(commitExpression("12.50+3.20")).toBe("15.7");
    expect(commitExpression(" 42 ")).toBe("42");
    expect(commitExpression("1,5")).toBe("1.5");
  });

  it("cuts at the second dot rather than joining (#201)", () => {
    // "1.2.3" is not an expression (no operator), so it reaches the digits-only
    // fallback. CUT, not joined: with no keystroke to ignore, the shorter reading is
    // the one that cannot invent a bigger number.
    expect(commitExpression("1.2.3")).toBe("1.2");
  });

  it("keeps only a leading minus", () => {
    expect(commitExpression("-42")).toBe("-42");
    // Unparseable arithmetic falls to the digits-only clean, which drops non-leading
    // minuses: "4-2x" is 42, not 2. Reachable only from a value handed in from
    // elsewhere — sanitizeLive strips the "x" before this can ever be typed.
    expect(commitExpression("4-2x")).toBe("42");
  });

  it("falls back to a digits-only clean for half-typed arithmetic", () => {
    expect(commitExpression("12+")).toBe("12");
    expect(commitExpression("")).toBe("");
  });

  it("is idempotent — a second blur must not change a committed value", () => {
    for (const raw of ["12.50+3.20", "1,5", "-42", "1.2.3", "100/3", "12+", "0.1+0.2"]) {
      const once = commitExpression(raw);
      expect(commitExpression(once)).toBe(once);
    }
  });
});

describe("sanitizeLive", () => {
  it("normalises every comma, not just the first (the locale-decimal question)", () => {
    // The 2026-08-18 plan left a claim unfiled about a single-comma replace turning a
    // German "1.234,56" into NaN. It cannot reach the app from this control.
    expect(sanitizeLive("1.234,56")).toBe("1.23456");
    expect(sanitizeLive("1,5")).toBe("1.5");
    expect(sanitizeLive("1234,56")).toBe("1234.56");
  });

  it("drops stray characters but keeps a typed calculation alive", () => {
    expect(sanitizeLive("12a+5b")).toBe("12+5");
    expect(sanitizeLive("6×7")).toBe("6×7");
    expect(sanitizeLive("-")).toBe("-");
  });

  it("allows one dot per operand, not per string (#201)", () => {
    expect(sanitizeLive("1.5+2.5")).toBe("1.5+2.5");
    expect(sanitizeLive("1.2.3")).toBe("1.23"); // repeated '.' is a no-op keystroke
    expect(sanitizeLive("1..2")).toBe("1.2");
  });
});

describe("isBareAmount / splitLeadingSign", () => {
  it("recognises a bare unsigned amount", () => {
    expect(isBareAmount("42")).toBe(true);
    expect(isBareAmount("42.")).toBe(true);
    expect(isBareAmount(".5")).toBe(true);
    expect(isBareAmount("0,5")).toBe(true);
    expect(isBareAmount("")).toBe(false);
    expect(isBareAmount("-42")).toBe(false);
    expect(isBareAmount("12+5")).toBe(false);
  });

  it("splits a sign only in front of a bare amount", () => {
    expect(splitLeadingSign("-42")).toEqual({ sign: "-", rest: "42" });
    expect(splitLeadingSign("+42")).toEqual({ sign: "+", rest: "42" });
    expect(splitLeadingSign("-")).toEqual({ sign: "-", rest: "" });
    expect(splitLeadingSign("42")).toEqual({ sign: "", rest: "42" });
    // Arithmetic after the minus IS arithmetic — "-12+5" is -7, not -(12+5).
    expect(splitLeadingSign("-12+5")).toEqual({ sign: "", rest: "-12+5" });
  });
});
