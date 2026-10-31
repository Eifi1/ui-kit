import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useWizard } from "../use-wizard";
import { requiredFieldsValidator } from "../validation";

/**
 * A wizard's data may be an `interface` (0.52, refactor audit 2026-10-30, API-2).
 *
 * The generics were `TData extends Record<string, unknown>`, which an interface fails: it
 * has no index signature. kastlan gave its 13 wizard data interfaces one to get past it,
 * and with it every key became legal — `data.typo` read as `unknown`, a misspelt field in
 * `updateData` passed. `TData extends object` takes the interface as it is. The
 * `@ts-expect-error` lines are the point: the type check fails if a typo type-checks again.
 */
interface LeaseData {
  tenant: string;
  rent: number | null;
}

const STEPS = [
  { id: "tenant", label: "Tenant" },
  { id: "rent", label: "Rent" },
];

describe("a wizard over an interface", () => {
  it("takes the interface as its data, and checks its keys", () => {
    const { result } = renderHook(() =>
      useWizard<LeaseData>({ steps: STEPS, initialData: { tenant: "", rent: null }, urlSync: false }),
    );
    act(() => result.current.updateData({ tenant: "Ada" }));
    expect(result.current.data).toEqual({ tenant: "Ada", rent: null });

    // For the type check only, never run: under `Record<string, unknown>` both compiled.
    const misspelt = () => {
      // @ts-expect-error a misspelt key is an error, not a new field
      result.current.updateData({ tennant: "Ada" });
      // @ts-expect-error and so is reading one
      return result.current.data.tennant;
    };
    expect(misspelt).toBeTypeOf("function");
  });

  it("requiredFieldsValidator takes it too, keyed by its own names", () => {
    const data: LeaseData = { tenant: "", rent: 1200 };
    expect(requiredFieldsValidator(data, [{ key: "tenant" }, { key: "rent" }], "required")).toEqual({
      ok: false,
      errors: { tenant: "required" },
    });
    // @ts-expect-error a key the interface does not have
    requiredFieldsValidator(data, [{ key: "tennant" }], "required");
  });

  it("requiredFieldsValidator takes a field list held `as const` (API-7)", () => {
    const fields = [{ key: "tenant" }, { key: "rent", message: "Rent?" }] as const;
    expect(requiredFieldsValidator<LeaseData>({ tenant: "Ada", rent: null }, fields, "required")).toEqual({
      ok: false,
      errors: { rent: "Rent?" },
    });
  });
});
