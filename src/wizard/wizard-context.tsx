import { createContext, useContext } from "react";
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
