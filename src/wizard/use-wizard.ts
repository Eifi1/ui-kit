/**
 * The multi-step wizard state machine: step index, completed/skipped sets,
 * per-step async validators, collected data, field errors, submit and the
 * cancel-confirm gate.
 *
 * Domain-free, and router-free on request. By default it mirrors the active step
 * to `?step=N`, so it must be mounted inside a react-router context — the same
 * requirement `DataTable` already carries. `urlSync: false` keeps the step in
 * memory and needs no router; `urlSync: { param }` renames the param. It only ever
 * WRITES that param (see the note on `initialStep` below for why it deliberately
 * does not read it back), and removes it when the wizard is left through the kit
 * (see `UseWizardOptions.urlSync`).
 *
 * The committing step is the last one unless a step says `commits: true`; the
 * steps after that one are post-commit steps (see `WizardStepConfig.commits`).
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useKitLabels } from "../i18n/kit-labels";
import { DEFAULT_WIZARD_LABELS } from "./types";
import { toast } from "../components/toast";
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
  isValidating: boolean;
  error: string | null;
  fieldErrors: FieldErrors;
  showCancelDialog: boolean;
  /** The step whose `onComplete` resolved, or null before any commit. */
  committedStepIndex: number | null;
}

/** Past the commit: the active step comes after the step that committed. Moves to
 *  that step or any before it are refused from here. */
function isAfterCommit(state: { currentStepIndex: number; committedStepIndex: number | null }) {
  return state.committedStepIndex !== null && state.currentStepIndex > state.committedStepIndex;
}

/** Whether `index` is on the far side of a commit the wizard has already moved past. */
function crossesCommit(
  state: { currentStepIndex: number; committedStepIndex: number | null },
  index: number,
) {
  return isAfterCommit(state) && index <= (state.committedStepIndex as number);
}

type WizardAction<TData> =
  // `from` is the step the move was decided ON. A move whose step is no longer the
  // current one is stale — see `goNext` — and is dropped rather than applied relative
  // to wherever the wizard has got to since.
  | { type: "GO_NEXT"; from: number }
  | { type: "GO_BACK" }
  | { type: "GO_TO_STEP"; index: number }
  | { type: "SKIP"; from: number }
  | { type: "UPDATE_DATA"; partial: Partial<TData> }
  | { type: "COMMITTED"; from: number }
  | { type: "SET_SUBMITTING"; value: boolean }
  | { type: "SET_VALIDATING"; value: boolean }
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
        if (action.from !== state.currentStepIndex) return state;
        const completed = new Set(state.completedSteps);
        completed.add(state.currentStepIndex);
        const nextIndex = Math.min(state.currentStepIndex + 1, stepCount - 1);
        return { ...state, currentStepIndex: nextIndex, completedSteps: completed, fieldErrors: {} };
      }
      case "GO_BACK": {
        const prevIndex = Math.max(state.currentStepIndex - 1, 0);
        if (crossesCommit(state, prevIndex)) return state;
        return { ...state, currentStepIndex: prevIndex, fieldErrors: {} };
      }
      case "GO_TO_STEP": {
        if (action.index < 0 || action.index >= stepCount) return state;
        if (crossesCommit(state, action.index)) return state;
        if (!state.completedSteps.has(action.index) && action.index > state.currentStepIndex) {
          return state;
        }
        return { ...state, currentStepIndex: action.index };
      }
      case "SKIP": {
        if (action.from !== state.currentStepIndex) return state;
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
      case "COMMITTED": {
        // Recorded whatever step committed, so `wizard.committed` reads true after any
        // successful Finish. Only a commit with steps after it MOVES: the default
        // last-step commit stays where it is and looks exactly as it did before 0.8.
        const committed = { ...state, committedStepIndex: action.from };
        if (action.from !== state.currentStepIndex || action.from >= stepCount - 1) {
          return committed;
        }
        const completed = new Set(state.completedSteps);
        completed.add(action.from);
        return {
          ...committed,
          currentStepIndex: action.from + 1,
          completedSteps: completed,
          fieldErrors: {},
        };
      }
      case "SET_SUBMITTING":
        return { ...state, isSubmitting: action.value };
      case "SET_VALIDATING":
        return { ...state, isValidating: action.value };
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
  const {
    steps,
    initialData,
    onComplete,
    onCancel,
    onExit,
    onDone,
    cancellable = true,
    confirmCancel: askBeforeCancel = true,
    urlSync = true,
    missingRequiredMessage,
    onValidationFailed,
  } = options;
  const stepsRef = useRef<WizardStepConfig[]>(steps);
  stepsRef.current = steps;
  // A hook, not a component, but it produces two sentences of its own — the
  // "fill in the required fields" toast and the fallback submit error — and both
  // reach the user. So it reads the provider like any component does; only the two
  // strings are depended on below, so the callbacks stay stable across renders.
  // The `??` is for the type only: both keys are optional on `WizardLabels` (see
  // there), and the merge never replaces a default with `undefined`.
  const wizardLabels = useKitLabels("wizard", DEFAULT_WIZARD_LABELS, {
    missingRequired: missingRequiredMessage,
  });
  const missingRequired = wizardLabels.missingRequired ?? DEFAULT_WIZARD_LABELS.missingRequired;
  const genericError = wizardLabels.genericError ?? DEFAULT_WIZARD_LABELS.genericError;

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

  // Chosen once, at mount: a hook may not be called conditionally, but it may be
  // chosen once and then called unconditionally on every render — which is what
  // makes `urlSync: false` work with no router above the wizard at all.
  const [useStepUrl] = useState(() => (urlSync === false ? useNoStepUrl : useSearchParamStepUrl));
  const [urlParam] = useState(() =>
    typeof urlSync === "object" && urlSync.param ? urlSync.param : "step",
  );
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
    isValidating: false,
    error: null,
    fieldErrors: {},
    showCancelDialog: false,
    committedStepIndex: null,
  });

  // A mounted step can DISABLE forward navigation (Next/Skip) while its own
  // state is invalid (e.g. tenant shares != 100%). Defaults to false, so
  // wizards that never call setNextBlocked behave exactly as before.
  const [nextBlocked, setNextBlockedState] = useState(false);
  const setNextBlocked = useCallback(
    (blocked: boolean) => setNextBlockedState(blocked),
    [],
  );

  // Sync step index to URL (a no-op under `urlSync: false`). `clearStepUrl` drops
  // the param when the wizard is left through the kit, and stops the sync writing
  // it back.
  const clearStepUrl = useStepUrl(urlParam, state.currentStepIndex);

  // `steps`, not `stepsRef.current`: during render the two are the same array, and
  // reading a ref in render is what the hooks linter (rightly) objects to.
  const currentStep = steps[state.currentStepIndex];
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === steps.length - 1;
  // The step whose forward button commits: the first one flagged `commits`, else the
  // last — which is every wizard written before the flag existed.
  const flagged = steps.findIndex((s) => s.commits);
  const commitStepIndex = flagged === -1 ? steps.length - 1 : flagged;
  const isCommitStep = state.currentStepIndex === commitStepIndex;
  const afterCommit = isAfterCommit(state);
  // Finish is only valid once every step before the committing one has actually
  // been walked through (completed or skipped). Guards against a restored/last-step
  // index submitting a payload built from empty defaults.
  const canFinish = steps.every(
    (_, index) =>
      index >= commitStepIndex ||
      state.completedSteps.has(index) ||
      state.skippedSteps.has(index),
  );
  const canGoBack =
    (!isFirstStep || onExit !== undefined) &&
    !crossesCommit(state, state.currentStepIndex - 1);
  const canCancel = cancellable && !afterCommit;
  const canDone = isLastStep && afterCommit && onDone !== undefined;

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
    } catch (err) {
      // FALL THROUGH, do not return. A bare `return false` here blocked Next while
      // skipping the `if (!ok)` block below — the only thing that shows a message,
      // and whose own comment is "say something anyway, so the user is not left with
      // a Next button that silently does nothing". So a validator that threw (an
      // async one whose request rejected, a null dereference in a field rule)
      // produced exactly the outcome that block was written to prevent: no field
      // errors, no toast, `onValidationFailed` never called, nothing in the console.
      //
      // The step still must not advance; `ok = false` is what says so. Whatever
      // partial `errors` the loop had collected before the throw are kept — they are
      // real, and an empty set is what routes this to the generic message.
      console.error("[wizard] a step validator threw", err);
      ok = false;
    }
    if (!ok) {
      dispatch({ type: "SET_FIELD_ERRORS", errors });
      if (Object.keys(errors).length === 0) {
        // No per-field detail (e.g. an RHF step surfacing its own inline
        // message) — say something anyway, so the user is not left with a Next
        // button that silently does nothing.
        const message = missingRequired;
        if (onValidationFailed) {
          onValidationFailed(message);
        } else {
          // The kit's `toast` loads sonner (an optional peer) lazily, so an app
          // that never trips this never has to install it.
          toast.error(message);
        }
      }
      return false;
    }
    return true;
  }, [state.currentStepIndex, missingRequired, onValidationFailed]);

  /**
   * One forward move at a time. A double-click on Next used to validate the CURRENT
   * step twice and then advance twice — the second GO_NEXT landing on a step whose
   * own validators never ran, so a required field two steps in could be walked past.
   * Two layers, because either alone leaves a gap:
   *
   *  - this ref refuses a second `goNext`/`skip`/`finish` while one is in flight,
   *    which covers an async validator (a server check) of any length;
   *  - the `from` on each action drops a move decided on a step that is no longer
   *    current, which covers the click that arrives after the first move resolved
   *    but before React re-rendered — its closure still holds the old step index.
   */
  const advancingRef = useRef(false);

  const goNext = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const from = state.currentStepIndex;
    // Pending state for the chrome (spinner, aria-busy). The ref above is still what
    // refuses the second click: state would only be seen after a re-render.
    dispatch({ type: "SET_VALIDATING", value: true });
    try {
      if (await runStepValidators()) {
        dispatch({ type: "GO_NEXT", from });
      }
    } finally {
      dispatch({ type: "SET_VALIDATING", value: false });
      advancingRef.current = false;
    }
  }, [runStepValidators, state.currentStepIndex]);

  // Read by `goBack`, which must not move while `onComplete` runs: the commit was
  // decided on the data of the step the user is on, and Back mid-commit would show a
  // step whose edits can no longer reach it. The chrome disables the button too; this
  // covers an app calling `goBack` itself.
  const submittingRef = useRef(false);

  const goBack = useCallback(() => {
    if (submittingRef.current) return;
    if (state.currentStepIndex === 0 && onExit) {
      clearStepUrl();
      onExit();
      return;
    }
    // On step 0 with no `onExit` this stays the no-op move (clearing field errors) it
    // always was.
    dispatch({ type: "GO_BACK" });
  }, [state.currentStepIndex, onExit, clearStepUrl]);

  const goToStep = useCallback((index: number) => {
    dispatch({ type: "GO_TO_STEP", index });
  }, []);

  const canGoToStep = useCallback(
    (index: number) =>
      index >= 0 &&
      index < steps.length &&
      (index <= state.currentStepIndex || state.completedSteps.has(index)) &&
      !crossesCommit(state, index),
    [steps.length, state],
  );

  const skip = useCallback(() => {
    // Not while Next is validating: the skip would land first and the pending GO_NEXT
    // would then be stale anyway — but the user asked for one move, not a race.
    if (advancingRef.current) return;
    dispatch({ type: "SKIP", from: state.currentStepIndex });
  }, [state.currentStepIndex]);

  const confirmCancel = useCallback(() => {
    dispatch({ type: "SHOW_CANCEL_DIALOG", show: false });
    clearStepUrl();
    onCancel?.();
  }, [onCancel, clearStepUrl]);

  const cancel = useCallback(() => {
    if (!askBeforeCancel) {
      confirmCancel();
      return;
    }
    dispatch({ type: "SHOW_CANCEL_DIALOG", show: true });
  }, [askBeforeCancel, confirmCancel]);

  const done = useCallback(() => {
    clearStepUrl();
    onDone?.();
  }, [onDone, clearStepUrl]);

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
    // A commit with steps after it happens once: those steps exist because the
    // data has been written. (A last-step commit keeps its old behaviour — the app
    // may retry Finish after `onComplete` resolved, as it always could.)
    if (commitStepIndex < steps.length - 1 && state.committedStepIndex !== null) return;
    // The same re-entry guard as `goNext`: a double-click on Finish would otherwise
    // validate twice and call `onComplete` twice — `isSubmitting` is only set once
    // validation has passed, too late to stop the second click.
    if (advancingRef.current) return;
    advancingRef.current = true;
    const from = state.currentStepIndex;
    try {
      // Validate the (possibly form-bearing) committing step before submitting,
      // matching the Next gate — review-only steps register no validators and pass
      // through.
      dispatch({ type: "SET_VALIDATING", value: true });
      let valid: boolean;
      try {
        valid = await runStepValidators();
      } finally {
        dispatch({ type: "SET_VALIDATING", value: false });
      }
      if (!valid) return;
      submittingRef.current = true;
      dispatch({ type: "SET_SUBMITTING", value: true });
      dispatch({ type: "SET_ERROR", error: null });
      try {
        await onComplete(state.data);
        dispatch({ type: "COMMITTED", from });
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : genericError;
        dispatch({ type: "SET_ERROR", error: message });
      } finally {
        submittingRef.current = false;
        dispatch({ type: "SET_SUBMITTING", value: false });
      }
    } finally {
      advancingRef.current = false;
    }
  }, [
    onComplete,
    canFinish,
    commitStepIndex,
    steps.length,
    state.committedStepIndex,
    state.currentStepIndex,
    state.data,
    runStepValidators,
    genericError,
  ]);

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
    steps,
    isFirstStep,
    isLastStep,
    canFinish,
    commitStepIndex,
    isCommitStep,
    committed: state.committedStepIndex !== null,
    canGoBack,
    canCancel,
    canDone,
    canGoToStep,
    goNext,
    goBack,
    goToStep,
    skip,
    cancel,
    finish,
    done,
    registerStepValidate,
    nextBlocked,
    setNextBlocked,
    stepStatus,
    completedSteps: state.completedSteps,
    data: state.data,
    updateData,
    isSubmitting: state.isSubmitting,
    isValidating: state.isValidating,
    error: state.error,
    clearError,
    fieldErrors: state.fieldErrors,
    clearFieldErrors,
    showCancelDialog: state.showCancelDialog,
    confirmCancel,
    dismissCancel,
  };
}

/**
 * `urlSync: true` / `{ param }`: mirror the active step to `?<param>=N`, and hand back
 * the function that removes it again. Once removed it stays removed — the sync effect
 * re-runs whenever react-router hands out a new setter (every search change), and
 * without the latch it would write the param straight back after the exit cleared it.
 */
function useSearchParamStepUrl(param: string, index: number): () => void {
  const [, setUrlParams] = useSearchParams();
  const leftRef = useRef(false);
  useEffect(() => {
    if (leftRef.current) return;
    setUrlParams((prev) => {
      prev.set(param, String(index));
      return prev;
    }, { replace: true });
  }, [param, index, setUrlParams]);
  return useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    setUrlParams((prev) => {
      prev.delete(param);
      return prev;
    }, { replace: true });
  }, [param, setUrlParams]);
}

/** `urlSync: false`: the step lives in the reducer only. Touches no router context. */
function useNoStepUrl(_param: string, _index: number): () => void {
  return noop;
}

function noop() {}
