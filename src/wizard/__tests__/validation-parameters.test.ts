import { describe, expect, it } from "vitest";
import { requiredFieldsValidator } from "../validation";

/**
 * A wrapper typed by the validator's own parameters still takes its fields (0.52 code
 * review, src/wizard/validation.ts). 0.52 widened the constraint from
 * `Record<string, unknown>` to `object` so a wizard's data may be an interface (API-2), and
 * `Parameters<typeof requiredFieldsValidator>` reads the constraint: `keyof object` is
 * `never`, so `{ key: "amount" }` stopped type-checking ("Type 'string' is not assignable
 * to type 'never'") — this suite's own helper was written so and had to change. The
 * constraint now erases to an indexable record, as the old one did. A type error here
 * fails `npm run typecheck`.
 */
const validate = (...args: Parameters<typeof requiredFieldsValidator>) => requiredFieldsValidator(...args);

interface Lease {
  tenant: string;
  rent: number | null;
}

describe("requiredFieldsValidator through Parameters<>", () => {
  it("takes a field list keyed by any name, as before 0.52", () => {
    expect(validate({ amount: "", note: "x" }, [{ key: "amount" }, { key: "note" }], "required")).toEqual({
      ok: false,
      errors: { amount: "required" },
    });
  });

  it("still takes an interface, and still refuses a key it does not have", () => {
    const lease: Lease = { tenant: "Ada", rent: null };
    expect(requiredFieldsValidator(lease, [{ key: "tenant" }, { key: "rent" }], "required")).toEqual({
      ok: false,
      errors: { rent: "required" },
    });
    // @ts-expect-error a key the interface does not have
    requiredFieldsValidator(lease, [{ key: "tennant" }], "required");
  });
});
