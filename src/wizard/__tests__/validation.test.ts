import { describe, expect, it } from "vitest";
import { requiredFieldsValidator } from "../validation";
import type { FieldErrors } from "../types";

/** `ValidateResult` is `boolean | {ok, errors}`; this helper always returns the object
 *  form, so the tests read it as one rather than narrowing at every call. */
const check = (...args: Parameters<typeof requiredFieldsValidator>) =>
  requiredFieldsValidator(...args) as { ok: boolean; errors?: FieldErrors };

/**
 * The fold of the `const errors = {}; if (!data.x) errors.x = required; …` block that
 * every single-file entity wizard had reimplemented. It shipped untested, which for a
 * VALIDATOR is the worst place to have no coverage: a validator that returns `ok: true`
 * for everything looks exactly like a form with nothing wrong in it.
 */
describe("requiredFieldsValidator", () => {
  const MSG = "required";

  it("passes when every required field is present", () => {
    expect(
      check({ name: "Giro", currency: "EUR" }, [{ key: "name" }], MSG),
    ).toEqual({ ok: true, errors: {} });
  });

  it("names every missing field, not just the first", () => {
    const r = check(
      { name: "", currency: null },
      [{ key: "name" }, { key: "currency" }],
      MSG,
    );
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual({ name: MSG, currency: MSG });
  });

  it("treats whitespace as absent, because a form full of spaces is an empty form", () => {
    const r = check({ name: "   " }, [{ key: "name" }], MSG);
    expect(r).toEqual({ ok: false, errors: { name: MSG } });
  });

  // A non-string is checked for null-ness, not truthiness: an id of 0 and an amount of
  // 0 are values somebody chose, and a `!v` default would have rejected both.
  it("accepts a falsy value that is not null", () => {
    expect(check({ amount: 0 }, [{ key: "amount" }], MSG).ok).toBe(true);
    expect(check({ flag: false }, [{ key: "flag" }], MSG).ok).toBe(true);
    expect(check({ id: null }, [{ key: "id" }], MSG).ok).toBe(false);
  });

  it("runs a custom predicate instead, with the whole record in hand", () => {
    const fields = [
      { key: "amount" as const, valid: (v: unknown) => Number(v) > 0, message: "must be positive" },
    ];
    expect(check({ amount: 0 }, fields, MSG)).toEqual({
      ok: false,
      errors: { amount: "must be positive" },
    });
    expect(check({ amount: 5 }, fields, MSG).ok).toBe(true);

    // The second argument is the whole record, which is what makes cross-field rules
    // ("to must differ from from") expressible without a second validator.
    const cross = [
      {
        key: "to" as const,
        valid: (v: unknown, data: Record<string, unknown>) => v !== data.from,
        message: "same account",
      },
    ];
    expect(check({ from: "a", to: "a" }, cross, MSG).ok).toBe(false);
    expect(check({ from: "a", to: "b" }, cross, MSG).ok).toBe(true);
  });

  it("falls back to the shared message when a field carries none", () => {
    const r = check(
      { a: "", b: "" },
      [{ key: "a" }, { key: "b", message: "b is special" }],
      MSG,
    );
    expect(r.errors).toEqual({ a: MSG, b: "b is special" });
  });
});
