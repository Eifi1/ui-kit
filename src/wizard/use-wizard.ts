/**
 * The multi-step wizard state machine: step index, completed/skipped sets,
 * per-step async validators, collected data, field errors, submit and the
 * cancel-confirm gate.
 *
 * Domain-free, but NOT router-free: it mirrors the active step to `?step=N`, so
 * it must be mounted inside a react-router context — the same requirement
 * `DataTable` already carries. It only ever WRITES that param (see the note on
 * `initialStep` below for why it deliberately does not read it back).
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import type {
  FieldErrors,
  StepStatus,
  UseWizardOptions,
  UseWizardReturn,
  ValidateResult,
  WizardStepConfig,
} from "./types";

interface WizardState<TData> {
  currentStepIndex: number;
  completedSteps: Set<number>;
  skippedSteps: Set<number>;
  data: TData;
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: FieldErrors;
  showCancelDialog: boolean;
}

type WizardAction<TData> =
  | { type: "GO_NEXT" }
  | { type: "GO_BACK" }
  | { type: "GO_TO_STEP"; index: number }
  | { type: "SKIP" }
  | { type: "UPDATE_DATA"; partial: Partial<TData> }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_FIELD_ERRORS"; errors: FieldErrors }
  | { type: "SHOW_CANCEL_DIALOG"; show: boolean };

function createReducer<TData>(stepCount: number) {
  return function reducer(
    state: WizardState<TData>,
    action: WizardAction<TData>,
  ): WizardState<TData> {
    switch (action.type) {
      case "GO_NEXT": {
        const completed = new Set(state.completedSteps);
        completed.add(state.currentStepIndex);
        const nextIndex = Math.min(state.currentStepIndex + 1, stepCount - 1);
        return { ...state, currentStepIndex: nextIndex, completedSteps: completed, fieldErrors: {} };
      }
      case "GO_BACK": {
        const prevIndex = Math.max(state.currentStepIndex - 1, 0);
        return { ...state, currentStepIndex: prevIndex, fieldErrors: {} };
      }
      case "GO_TO_STEP": {
        if (action.index < 0 || action.index >= stepCount) return state;
        if (!state.completedSteps.has(action.index) && action.index > state.currentStepIndex) {
          return state;
        }
        return { ...state, currentStepIndex: action.index };
      }
      case "SKIP": {
        const skipped = new Set(state.skippedSteps);
        skipped.add(state.currentStepIndex);
        const nextIndex = Math.min(state.currentStepIndex + 1, stepCount - 1);
        return { ...state, currentStepIndex: nextIndex, skippedSteps: skipped };
      }
      case "UPDATE_DATA": {
        // Clear error for any field that is now being edited (so typing makes
        // the red message disappear).
        const nextErrors = { ...state.fieldErrors };
        for (const key of Object.keys(action.partial)) {
          delete nextErrors[key];
        }
        return { ...state, data: { ...state.data, ...action.partial }, fieldErrors: nextErrors };
      }
      case "SET_SUBMITTING":
        return { ...state, isSubmitting: action.value };
      case "SET_ERROR":
        return { ...state, error: action.error };
      case "SET_FIELD_ERRORS":
        return { ...state, fieldErrors: action.errors };
      case "SHOW_CANCEL_DIALOG":
        return { ...state, showCancelDialog: action.show };
      default:
        return state;
    }
  };
}

export function useWizard<TData extends Record<string, unknown>>(
  options: UseWizardOptions<TData>,
): UseWizardReturn<TData> {
  const { steps, initialData, onComplete, onCancel, missingRequiredMessage, onValidationFailed } =
    options;
  const stepsRef = useRef<WizardStepConfig[]>(steps);
  stepsRef.current = steps;

  // Validators registered by the CURRENT step's mounted components (RHF steps
  // register via `useRhfWizardStep` through the wizard context). Only the active
  // step's validators are present — each unregisters on unmount. `goNext` and
  // `finish` run them (via `runStepValidators`) alongside the step config's own
  // `validate`.
  const validatorsRef = useRef(
    new Map<symbol, () => ValidateResult | Promise<ValidateResult>>(),
  );
  const registerStepValidate = useCallback(
    (fn: () => ValidateResult | Promise<ValidateResult>) => {
      const token = Symbol();
      validatorsRef.current.set(token, fn);
      return () => {
        validatorsRef.current.delete(token);
      };
    },
    [],
  );

  const [, setUrlParams] = useSearchParams();
  // The wizard's entered `data` and `completedSteps` are NOT persisted across a
  // reload / deep-link (the reducer re-inits to empty defaults on every mount).
  // Restoring a later step index from `?step=N` would therefore leave the wizard
  // on (or past) the last step with an EMPTY data set, letting Finish submit an
  // empty payload. Always start at step 0 so a reload re-runs the wizard from a
  // valid state instead of losing the entered data silently.
  const initialStep = 0;

  const reducer = createReducer<TData>(steps.length);
  const [state, dispatch] = useReducer(reducer, {
    currentStepIndex: initialStep,
    completedSteps: new Set<number>(),
    skippedSteps: new Set<number>(),
    data: (initialData ?? {}) as TData,
    isSubmitting: false,
    error: null,
    fieldErrors: {},
    showCancelDialog: false,
  });

  // A mounted step can DISABLE forward navigation (Next/Skip) while its own
  // state is invalid (e.g. tenant shares != 100%). Defaults to false, so
  // wizards that never call setNextBlocked behave exactly as before.
  const [nextBlocked, setNextBlockedState] = useState(false);
  const setNextBlocked = useCallback(
    (blocked: boolean) => setNextBlockedState(blocked),
    [],
  );

  // Sync step index to URL
  useEffect(() => {
    setUrlParams((prev) => {
      prev.set("step", String(state.currentStepIndex));
      return prev;
    }, { replace: true });
  }, [state.currentStepIndex, setUrlParams]);

  const currentStep = stepsRef.current[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === stepsRef.current.length - 1;
  // Finish is only valid once every step before the last has actually been
  // walked through (completed or skipped). Guards against a restored/last-step
  // index submitting a payload built from empty defaults.
  const canFinish = stepsRef.current.every(
    (_, index) =>
      index === stepsRef.current.length - 1 ||
      state.completedSteps.has(index) ||
      state.skippedSteps.has(index),
  );

  // Runs the active step's config `validate` plus every validator its mounted
  // components registered (RHF steps via useRhfWizardStep), AND-combining the
  // results and merging any per-field errors. Returns `true` when the step
  // passes (or registered no validators). Shared by `goNext` and `finish` so a
  // form-bearing last step is validated (and its values flushed) on Finish too.
  const runStepValidators = useCallback(async (): Promise<boolean> => {
    const step = stepsRef.current[state.currentStepIndex];
    const validators = [...validatorsRef.current.values()];
    if (step.validate) validators.push(step.validate);
    if (validators.length === 0) return true;
    let ok = true;
    let errors: FieldErrors = {};
    try {
      for (const validate of validators) {
        const result = await validate();
        const vOk = typeof result === "boolean" ? result : result.ok;
        if (!vOk) {
          ok = false;
          if (typeof result !== "boolean" && result.errors) {
            errors = { ...errors, ...result.errors };
          }
        }
      }
    } catch {
      return false;
    }
    if (!ok) {
      dispatch({ type: "SET_FIELD_ERRORS", errors });
      if (Object.keys(errors).length === 0) {
        // No per-field detail (e.g. an RHF step surfacing its own inline
        // message) — say something anyway, so the user is not left with a Next
        // button that silently does nothing.
        const message = missingRequiredMessage ?? "Please fill in all required fields.";
        if (onValidationFailed) {
          onValidationFailed(message);
        } else {
          // sonner is an optional peer: imported here, on the failure path only,
          // so an app that never trips this never has to install it.
          const { toast } = await import("sonner");
          toast.error(message);
        }
      }
      return false;
    }
    return true;
  }, [state.currentStepIndex, missingRequiredMessage, onValidationFailed]);

  const goNext = useCallback(async () => {
    if (await runStepValidators()) {
      dispatch({ type: "GO_NEXT" });
    }
  }, [runStepValidators]);

  const goBack = useCallback(() => {
    dispatch({ type: "GO_BACK" });
  }, []);

  const goToStep = useCallback((index: number) => {
    dispatch({ type: "GO_TO_STEP", index });
  }, []);

  const skip = useCallback(() => {
    dispatch({ type: "SKIP" });
  }, []);

  const cancel = useCallback(() => {
    dispatch({ type: "SHOW_CANCEL_DIALOG", show: true });
  }, []);

  const confirmCancel = useCallback(() => {
    dispatch({ type: "SHOW_CANCEL_DIALOG", show: false });
    onCancel?.();
  }, [onCancel]);

  const dismissCancel = useCallback(() => {
    dispatch({ type: "SHOW_CANCEL_DIALOG", show: false });
  }, []);

  const updateData = useCallback((partial: Partial<TData>) => {
    dispatch({ type: "UPDATE_DATA", partial });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", error: null });
  }, []);

  const clearFieldErrors = useCallback(() => {
    dispatch({ type: "SET_FIELD_ERRORS", errors: {} });
  }, []);

  const finish = useCallback(async () => {
    if (!onComplete || !canFinish) return;
    // Validate the (possibly form-bearing) last step before submitting, matching
    // the Next gate — review-only steps register no validators and pass through.
    if (!(await runStepValidators())) return;
    dispatch({ type: "SET_SUBMITTING", value: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      await onComplete(state.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      dispatch({ type: "SET_ERROR", error: message });
    } finally {
      dispatch({ type: "SET_SUBMITTING", value: false });
    }
  }, [onComplete, canFinish, state.data, runStepValidators]);

  const stepStatus = useCallback(
    (index: number): StepStatus => {
      if (index === state.currentStepIndex) return "active";
      if (state.skippedSteps.has(index)) return "skipped";
      if (state.completedSteps.has(index)) return "completed";
      return "upcoming";
    },
    [state.currentStepIndex, state.completedSteps, state.skippedSteps],
  );

  return {
    currentStepIndex: state.currentStepIndex,
    currentStep,
    steps: stepsRef.current,
    isFirstStep,
    isLastStep,
    canFinish,
    goNext,
    goBack,
    goToStep,
    skip,
    cancel,
    finish,
    registerStepValidate,
    nextBlocked,
    setNextBlocked,
    stepStatus,
    completedSteps: state.completedSteps,
    data: state.data,
    updateData,
    isSubmitting: state.isSubmitting,
    error: state.error,
    clearError,
    fieldErrors: state.fieldErrors,
    clearFieldErrors,
    showCancelDialog: state.showCancelDialog,
    confirmCancel,
    dismissCancel,
  };
}
