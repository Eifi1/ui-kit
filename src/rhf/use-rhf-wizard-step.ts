/**
 * The bridge between a react-hook-form step and the wizard's Next gate.
 * `@eifi1/ui-kit/rhf`.
 *
 * ```tsx
 * function AddressStep({ onUpdate }: { onUpdate: (v: Address) => void }) {
 *   const form = useForm<Address>({ defaultValues });
 *   useRhfWizardStep(form, { onValid: onUpdate });
 *   return <Form {...form}>…</Form>;
 * }
 * ```
 *
 * Inside a `<StepperNav>` the hook registers the step's validator with the wizard, so
 * Next (and Finish on a form-bearing last step) runs it: on success the values go to
 * `onValid` and the wizard advances; on failure react-hook-form shows its own inline
 * `<FormMessage>`s, focuses the first field in error, and the wizard stays put — and,
 * since the result carries no per-field errors, says its "fill in the required
 * fields" line so the button did not seem to do nothing. It also RETURNS the
 * validator, for a nav of your own outside `<StepperNav>` (where there is no wizard
 * context to register with, so nothing is registered).
 *
 * Two modes:
 *
 *  - **The whole form** (no `fields`): `form.handleSubmit`, exactly as kastlan's
 *    `use-rhf-wizard-step.ts` — every rule and the resolver run, `onValid` receives
 *    the TRANSFORMED values (a zod `.transform()` included), and focus follows the
 *    form's own `shouldFocusError` (on by default).
 *  - **Some fields** (`fields: ["iban", "bic"]`): `form.trigger(fields)`, for a wizard
 *    that keeps one form across several steps, each of which validates only what it
 *    shows. The first of those fields in error is focused (`shouldFocus`; the control
 *    has to take `field.ref`), errors on fields of later steps are not raised, and
 *    `onValid` receives `form.getValues()` — the untransformed values, because a
 *    resolver's output is only produced for the whole form.
 *
 * Both callbacks are read through refs, so the validator is registered once per form
 * however the caller writes them (an inline `(v) => onUpdate(v)` is the usual case).
 *
 * The positional `useRhfWizardStep(form, onValid)` of the hook kastlan kept is the
 * whole-form mode, and still accepted.
 *
 * Why it lives here and not in `@eifi1/ui-kit/wizard`: it imports react-hook-form,
 * which only this entry may (see packaging-contract).
 */
import { useCallback, useEffect, useRef } from "react";
import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { useOptionalWizardContext } from "../wizard/wizard-context";

export type RhfWizardStepOptions<
  TFieldValues extends FieldValues,
  TTransformed = TFieldValues,
> =
  | {
      /** Validate only these fields — the step's share of a form that spans steps. */
      fields: readonly FieldPath<TFieldValues>[];
      /** Called with `form.getValues()` when the fields pass, before the wizard
       *  advances. */
      onValid?: (values: TFieldValues) => void;
    }
  | {
      /** Omitted: validate the whole form through `handleSubmit`. */
      fields?: undefined;
      /** Called with the form's (transformed) values when it passes, before the
       *  wizard advances. */
      onValid?: (values: TTransformed) => void;
    };

/**
 * Connects `form` to the wizard's step validation and returns the step's validator.
 * See the module note for the two modes.
 */
export function useRhfWizardStep<
  TFieldValues extends FieldValues,
  TContext = unknown,
  TTransformed = TFieldValues,
>(
  form: UseFormReturn<TFieldValues, TContext, TTransformed>,
  options?:
    | RhfWizardStepOptions<TFieldValues, TTransformed>
    | ((values: TTransformed) => void),
): () => Promise<boolean> {
  const opts = typeof options === "function" ? { onValid: options } : (options ?? {});
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const validate = useCallback(async (): Promise<boolean> => {
    const current = optsRef.current;
    if (current.fields) {
      const ok = await form.trigger([...current.fields], { shouldFocus: true });
      if (ok) current.onValid?.(form.getValues());
      return ok;
    }
    const onValid = current.onValid as ((values: TTransformed) => void) | undefined;
    let ok = false;
    await form.handleSubmit(
      (values) => {
        ok = true;
        onValid?.(values);
      },
      () => {
        ok = false;
      },
    )();
    return ok;
  }, [form]);

  const wizard = useOptionalWizardContext();
  const register = wizard?.registerStepValidate;
  useEffect(() => register?.(validate), [register, validate]);

  return validate;
}
