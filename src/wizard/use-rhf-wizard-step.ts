import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { ValidateResult } from "./types";
import { useWizardContext } from "./wizard-context";

/**
 * Registers a plain (non-RHF) validator for the mounted step via the wizard
 * context — the manual-validation counterpart to {@link useRhfWizardStep}, for
 * steps that gate on their own state (e.g. a hand-managed list) instead of a
 * react-hook-form. Replaces the `registerValidate` prop + page `useRef` bridge.
 * `validate` is read through a ref so the effect registers exactly once.
 */
export function useWizardStepValidate(
  validate: () => ValidateResult | Promise<ValidateResult>,
): void {
  const { registerStepValidate } = useWizardContext();
  const ref = useRef(validate);
  useEffect(() => {
    ref.current = validate;
  });
  useEffect(
    () => registerStepValidate(() => ref.current()),
    [registerStepValidate],
  );
}

/**
 * Bridges a react-hook-form step to the wizard's Next gate. Registers a
 * validator that runs `form.handleSubmit`: on success it pushes the parsed
 * values through `onValid` (the step's `onUpdate`) and lets the wizard advance;
 * on failure RHF shows its own inline `<FormMessage>` errors and the wizard
 * blocks. Replaces the hand-rolled `handleSubmit → Promise` / `safeParse +
 * trigger` bridge + `registerValidate` prop each RHF step repeated (fe-10).
 *
 * `onValid` is read through a ref so the effect registers exactly once (callers
 * commonly pass an inline `(v) => onUpdate(v)`), which also fixes the two steps
 * that previously registered during render.
 */
export function useRhfWizardStep<
  TFieldValues extends FieldValues,
  TContext = unknown,
  TTransformed extends FieldValues = TFieldValues,
>(
  form: UseFormReturn<TFieldValues, TContext, TTransformed>,
  onValid: (values: TTransformed) => void,
): void {
  const { registerStepValidate } = useWizardContext();
  const onValidRef = useRef(onValid);
  useEffect(() => {
    onValidRef.current = onValid;
  });

  useEffect(() => {
    return registerStepValidate(
      () =>
        new Promise<boolean>((resolve) => {
          void form.handleSubmit(
            (values) => {
              onValidRef.current(values);
              resolve(true);
            },
            () => resolve(false),
          )();
        }),
    );
  }, [registerStepValidate, form]);
}

/**
 * Lets a step DISABLE the wizard's Next/Skip buttons while `blocked` is true
 * (e.g. tenant shares != 100%). Distinct from {@link useWizardStepValidate},
 * which only blocks on click and toasts; this greys the button out. Resets the
 * gate on unmount so the next step starts unblocked.
 */
export function useWizardNextGate(blocked: boolean): void {
  const { setNextBlocked } = useWizardContext();
  useEffect(() => {
    setNextBlocked(blocked);
    return () => setNextBlocked(false);
  }, [blocked, setNextBlocked]);
}
