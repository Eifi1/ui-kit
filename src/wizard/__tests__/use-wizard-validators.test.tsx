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

describe("useWizard, when Next is pressed twice (0.7.0)", () => {
  const THREE = (validateTwo: () => boolean | Promise<boolean>, validateOne = () => true) => [
    { id: "one", label: "One", validate: validateOne },
    { id: "two", label: "Two", validate: validateTwo },
    { id: "three", label: "Three" },
  ];

  it("does not walk past the next step's validation on a double-click", async () => {
    // Both calls come from the same render, as two clicks before a re-render do: the
    // second closure still holds step 0. It used to validate step 0 again and advance
    // a second time — onto step 2, with step 1's validator never run.
    const validateTwo = vi.fn(() => false);
    const { result } = renderHook(() => useWizard({ steps: THREE(validateTwo), onValidationFailed: () => {} }), {
      wrapper: MemoryRouter,
    });
    const goNext = result.current.goNext;
    await act(async () => {
      await Promise.all([goNext(), goNext()]);
    });
    expect(result.current.currentStepIndex).toBe(1);
    expect(validateTwo).not.toHaveBeenCalled();
  });

  it("drops a second press that arrives after the first resolved but before a re-render", async () => {
    const validateTwo = vi.fn(() => false);
    const { result } = renderHook(() => useWizard({ steps: THREE(validateTwo), onValidationFailed: () => {} }), {
      wrapper: MemoryRouter,
    });
    const staleGoNext = result.current.goNext;
    await act(async () => {
      await staleGoNext();
      await staleGoNext();
    });
    expect(result.current.currentStepIndex).toBe(1);
  });

  it("ignores Next while an async validator is still running", async () => {
    let release!: (ok: boolean) => void;
    const validateOne = vi.fn(() => new Promise<boolean>((r) => (release = r)));
    const { result } = renderHook(
      () => useWizard({ steps: THREE(() => false, validateOne as never), onValidationFailed: () => {} }),
      { wrapper: MemoryRouter },
    );
    let first!: Promise<void>;
    act(() => {
      first = result.current.goNext();
    });
    await act(async () => {
      await result.current.goNext();
    });
    expect(validateOne).toHaveBeenCalledTimes(1);
    await act(async () => {
      release(true);
      await first;
    });
    expect(result.current.currentStepIndex).toBe(1);
  });

  it("calls onComplete once on a double-click on Finish", async () => {
    const onComplete = vi.fn(async () => {});
    const { result } = renderHook(
      () => useWizard({ steps: [{ id: "only", label: "Only", validate: async () => true }], onComplete }),
      { wrapper: MemoryRouter },
    );
    const finish = result.current.finish;
    await act(async () => {
      await Promise.all([finish(), finish()]);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("skips one step per double-clicked Skip", async () => {
    const { result } = renderHook(() => useWizard({ steps: THREE(() => true) }), { wrapper: MemoryRouter });
    const skip = result.current.skip;
    act(() => {
      skip();
      skip();
    });
    expect(result.current.currentStepIndex).toBe(1);
  });
});
