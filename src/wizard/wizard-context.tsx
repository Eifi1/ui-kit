import { createContext, useContext, useEffect, useRef } from "react";
import type { ValidateResult } from "./types";

export interface WizardContextValue {
  /**
   * Register a validator for the currently-mounted step. Returns an unregister
   * fn (call it in a useEffect cleanup). `goNext` runs every registered
   * validator for the active step (plus the step config's own `validate`),
   * AND-combining the results — this replaces the per-page `useRef` +
   * `validate: () => ref.current?.()` bridge each RHF step used to wire.
   */
  registerStepValidate: (
    fn: () => ValidateResult | Promise<ValidateResult>,
  ) => () => void;
  /** Lets the mounted step disable Next/Skip (e.g. invalid tenant shares). */
  setNextBlocked: (blocked: boolean) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export const WizardContextProvider = WizardContext.Provider;

export function useWizardContext(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizardContext must be used within a <StepperNav>");
  }
  return ctx;
}

/**
 * The wizard context, or `null` outside a `<StepperNav>`. For a hook that registers
 * with the wizard when there is one and works without it — `useRhfWizardStep` in
 * `@eifi1/ui-kit/rhf`, whose returned `validate` a custom nav can call itself.
 */
export function useOptionalWizardContext(): WizardContextValue | null {
  return useContext(WizardContext);
}

/**
 * Registers a plain validator for the mounted step — the counterpart to
 * `useRhfWizardStep` (in `@eifi1/ui-kit/rhf`) for a step that gates on its own state
 * (a hand-managed list of lines, a sum that has to balance) rather than a form.
 *
 * ```tsx
 * useWizardStepValidate(() => ({ ok: lines.length >= 2, errors: { lines: t("…") } }));
 * ```
 *
 * Next (and Finish) run it with the step's other validators; a `false` or a result
 * with `ok: false` keeps the wizard where it is. `validate` is read through a ref, so
 * an inline closure over the latest state registers exactly once. Throws outside a
 * `<StepperNav>`, like {@link useWizardContext}: a validator with nothing to run it is
 * a bug to hear about.
 */
export function useWizardStepValidate(
  validate: () => ValidateResult | Promise<ValidateResult>,
): void {
  const { registerStepValidate } = useWizardContext();
  const ref = useRef(validate);
  useEffect(() => {
    ref.current = validate;
  });
  useEffect(() => registerStepValidate(() => ref.current()), [registerStepValidate]);
}

/**
 * Disables the wizard's Next and Skip while `blocked` holds (tenant shares that do not
 * add up to 100 %). Unlike {@link useWizardStepValidate}, which answers a click, this
 * greys the button out before one. The gate is lifted again when the step unmounts, so
 * the next step starts unblocked.
 */
export function useWizardNextGate(blocked: boolean): void {
  const { setNextBlocked } = useWizardContext();
  useEffect(() => {
    setNextBlocked(blocked);
    return () => setNextBlocked(false);
  }, [blocked, setNextBlocked]);
}
