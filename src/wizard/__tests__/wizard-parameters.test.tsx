import { render, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { StepperNav } from "../stepper-nav";
import type { UseWizardOptions, WizardStepConfig } from "../types";
import { useWizard } from "../use-wizard";

/**
 * The wizard's generics as an app's wrappers read them (0.52 code review, after
 * src/wizard/validation.ts). 0.52 widened `TData` from `Record<string, unknown>` to `object`
 * so a wizard's data may be an interface (API-2); `Parameters<typeof useWizard>` and
 * `ReturnType<typeof useWizard>` read the constraint, and `object` has no keys: a wrapper's
 * `onComplete: (data) => data.amount` or a prop typed `ReturnType<typeof useWizard>` that
 * reads `wizard.data.amount` stopped type-checking. The constraint now reads as an indexable
 * record there, as 0.51's did, and still takes an interface. A type error here fails
 * `npm run typecheck`.
 */
const STEPS: WizardStepConfig[] = [
  { id: "who", label: "Who" },
  { id: "rent", label: "Rent" },
];

interface Lease {
  tenant: string;
  rent: number | null;
}

/** A wrapper typed by the hook's own parameters, as an app's thin `useAppWizard` is. */
const useAppWizard = (...args: Parameters<typeof useWizard>) => useWizard(...args);

/** A panel whose prop is the hook's return type, without type arguments. */
const amountOf = (wizard: ReturnType<typeof useWizard>) => wizard.data.amount;

/** A StepperNav wrapper typed by its own props. */
function AppStepperNav(props: Parameters<typeof StepperNav>[0]) {
  return <StepperNav {...props} />;
}

describe("useWizard and StepperNav through Parameters<> and ReturnType<>", () => {
  it("lets a wrapper read and write the data by any key, as before 0.52", () => {
    const { result } = renderHook(() =>
      useAppWizard({
        steps: STEPS,
        initialData: { amount: 3 },
        urlSync: false,
        onComplete: (data) => void data.amount,
      }),
    );
    expect(amountOf(result.current)).toBe(3);
    const { container } = render(
      <AppStepperNav wizard={result.current}>
        <p>{amountOf(result.current) as number}</p>
      </AppStepperNav>,
      { wrapper: MemoryRouter },
    );
    expect(container.textContent).toContain("Who");
  });

  it("still takes an interface, and still refuses a key it does not have", () => {
    const options: UseWizardOptions<Lease> = { steps: STEPS, initialData: { tenant: "Ada" }, urlSync: false };
    const { result } = renderHook(() => useWizard<Lease>(options));
    expect(result.current.data.tenant).toBe("Ada");
    // @ts-expect-error a key the interface does not have
    void (() => result.current.updateData({ tennant: "Bo" }));
    // @ts-expect-error a key the interface does not have, in the initial data
    const misspelt: UseWizardOptions<Lease> = { steps: STEPS, initialData: { tennant: "Ada" } };
    expect(misspelt.steps).toBe(STEPS);
    // The instantiation expressions kastlan writes: `ReturnType<typeof useWizard<Data>>`.
    const typed: ReturnType<typeof useWizard<Lease>> = result.current;
    const { container } = render(
      <StepperNav<Lease> wizard={typed}>
        <p>{typed.data.tenant}</p>
      </StepperNav>,
      { wrapper: MemoryRouter },
    );
    expect(container.textContent).toContain("Rent");
  });
});
