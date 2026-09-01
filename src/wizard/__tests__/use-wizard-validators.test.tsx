import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { useWizard } from "../use-wizard";

/**
 * A step validator that THROWS must still say something.
 *
 * `runStepValidators` used to end its loop with a bare `} catch { return false; }`,
 * which blocked Next while skipping the `if (!ok)` block below it — the only thing
 * that reports a failure, and whose own comment is "say something anyway, so the user
 * is not left with a Next button that silently does nothing". A validator whose
 * request rejected therefore produced exactly that: no field errors, no toast,
 * `onValidationFailed` never called, and nothing logged.
 */
const STEPS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
];

describe("useWizard, when a step validator throws", () => {
  it("reports it and stays on the step, rather than failing silently", async () => {
    const onValidationFailed = vi.fn();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(
      () =>
        useWizard({
          steps: [{ ...STEPS[0], validate: async () => { throw new Error("boom"); } }, STEPS[1]],
          onValidationFailed,
        }),
      // `useWizard` mirrors its step into the URL, so it needs a router above it.
      { wrapper: MemoryRouter },
    );

    await act(async () => {
      await result.current.goNext();
    });

    expect(result.current.currentStepIndex).toBe(0);
    expect(onValidationFailed).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("still advances when every validator passes", async () => {
    const { result } = renderHook(
      () => useWizard({ steps: [{ ...STEPS[0], validate: async () => true }, STEPS[1]] }),
      { wrapper: MemoryRouter },
    );
    await act(async () => {
      await result.current.goNext();
    });
    expect(result.current.currentStepIndex).toBe(1);
  });
});
