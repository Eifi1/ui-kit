import type { ReactNode } from "react";

export type FieldErrors = Record<string, string>;

export type ValidateResult = boolean | { ok: boolean; errors?: FieldErrors };

export interface WizardStepConfig {
  /** Unique step identifier. */
  id: string;
  /**
   * What the step is called in the indicator.
   *
   * A `ReactNode`, not a translation key: the engine never resolves strings.
   * An app with i18n maps its own keys at the `useWizard` call — the same split
   * `TourStep` and `DataTableLabels` already use.
   */
  label: ReactNode;
  /** Whether the step can be skipped. */
  optional?: boolean;
  /**
   * Validation gate before advancing.
   * - Return `true` / `false` to just block.
   * - Return `{ ok: false, errors: { fieldName: "message" } }` to also surface
   *   per-field error messages via `wizard.fieldErrors`.
   */
  validate?: () => ValidateResult | Promise<ValidateResult>;
  /**
   * The forward button's label on THIS step, in place of `labels.next` — "Analyse",
   * "Import", "Send code". On the committing step (see {@link commits}) it labels
   * Finish instead of `labels.finish`; `labels.submitting` still replaces it while
   * the commit runs. Like `label`, a node the app has already translated.
   */
  nextLabel?: ReactNode;
  /**
   * This step's forward button COMMITS: it runs `onComplete` (via `finish`) instead
   * of just advancing. Without the flag the last step commits, as it always has.
   *
   * Flag a step before the last and every step after it becomes a post-commit step —
   * an import's "here is what happened, set up recurring rules?" page:
   *  - a successful `onComplete` advances onto the next step (a failed one stays, with
   *    `wizard.error`, exactly like a last-step Finish);
   *  - from there Back, the indicator and `goBack`/`goToStep` cannot cross back over
   *    the commit, and Cancel is hidden — there is nothing left to discard;
   *  - the last post-commit step's button is Done, which calls `onDone` (and is not
   *    shown when there is no `onDone`: the step then carries its own way out).
   *
   * Only the FIRST flagged step counts. Steps after it may still validate, skip and
   * use `nextLabel` like any other.
   */
  commits?: boolean;
}

/**
 * Where the active step lives. `true` (the default) mirrors it to `?step=N` through
 * react-router, as every wizard before 0.8 did; `{ param }` renames that param (two
 * wizards on one page, or a page that already uses `step`); `false` keeps it in
 * memory only and needs no router at all.
 *
 * Read once, at mount: switching it on a mounted wizard has no effect.
 */
export type WizardUrlSync = boolean | { param?: string };

export interface UseWizardOptions<TData extends Record<string, unknown>> {
  steps: WizardStepConfig[];
  initialData?: Partial<TData>;
  onComplete?: (data: TData) => void | Promise<void>;
  onCancel?: () => void;
  /**
   * Leave the wizard BACKWARDS: when given, Back is shown on the first step too and
   * calls this — keksdose's import panel, whose first step's Back returns to the
   * dropzone the file came from. No confirm dialog: going back is not discarding.
   */
  onExit?: () => void;
  /**
   * The Done button on the last step after a committing step (see
   * {@link WizardStepConfig.commits}). Without it no Done button is rendered, and the
   * post-commit step is expected to carry its own way out.
   */
  onDone?: () => void;
  /**
   * Whether the chrome offers Cancel at all. Default `true`. `false` hides the button
   * (`wizard.canCancel` is false); `wizard.cancel()` still works if the app calls it.
   */
  cancellable?: boolean;
  /**
   * Whether Cancel asks first ("Discard this form?"). Default `true`. `false` makes
   * `cancel()` call `onCancel` straight away — for a wizard that has nothing to lose
   * yet, or one whose data is kept elsewhere.
   */
  confirmCancel?: boolean;
  /**
   * Mirror the active step to the URL. Default `true` (`?step=N`, needs a router).
   * See {@link WizardUrlSync}.
   *
   * The param is WRITTEN only, never read back (see the note in `use-wizard.ts`). It
   * is removed again when the wizard is left through the kit: a confirmed Cancel,
   * `onExit` from the first step's Back, and Done — each before the app's callback
   * runs, so an app that navigates away navigates from a clean URL. It is NOT removed
   * after `onComplete` on a last step: an app navigating away there would otherwise
   * be pulled back by the kit's own URL write. An app that stays on the page after a
   * final Finish drops the param itself, or uses `urlSync: false`.
   */
  urlSync?: WizardUrlSync;
  /**
   * Shown when a step blocks with no per-field detail — an RHF step surfacing
   * its own inline messages, say — so the user learns why the wizard did not
   * advance. Falls back to `wizard.missingRequired` from the {@link UiKitProvider},
   * then to English.
   */
  missingRequiredMessage?: string;
  /**
   * How to surface {@link missingRequiredMessage}. Defaults to the kit's `toast.error`
   * (sonner, an optional peer, is loaded only when a toast is shown). Pass your own to
   * route it somewhere else, or to a no-op to silence it.
   */
  onValidationFailed?: (message: string) => void;
}

export type StepStatus = "upcoming" | "active" | "completed" | "skipped";

export interface UseWizardReturn<TData extends Record<string, unknown>> {
  // Navigation
  currentStepIndex: number;
  currentStep: WizardStepConfig;
  steps: WizardStepConfig[];
  isFirstStep: boolean;
  isLastStep: boolean;
  /** True once every step before the committing one (the last, unless a step is
   *  flagged `commits`) has been completed or skipped. */
  canFinish: boolean;
  /** The step whose forward button commits: the first `commits` step, else the last. */
  commitStepIndex: number;
  /** The active step is {@link commitStepIndex}: the chrome shows Finish, not Next. */
  isCommitStep: boolean;
  /** `onComplete` has resolved. Once the active step is past the committing one, Back
   *  cannot cross it and Cancel is hidden. */
  committed: boolean;
  /** Whether Back is offered here: not on the first step unless `onExit` was given,
   *  and never back across a commit. (Disabled, not hidden, while `isSubmitting`.) */
  canGoBack: boolean;
  /** Whether Cancel is offered: `cancellable`, and not after a commit. */
  canCancel: boolean;
  /** Whether Done is offered: the last step, past a commit, with an `onDone`. */
  canDone: boolean;
  /** Whether the indicator may jump to `index` — a completed/skipped/active step on
   *  the right side of any commit. `goToStep` refuses anything this rejects. */
  canGoToStep: (index: number) => boolean;
  goNext: () => Promise<void>;
  /** One step back — or, on the first step, `onExit`. Refused while submitting. */
  goBack: () => void;
  goToStep: (index: number) => void;
  skip: () => void;
  cancel: () => void;
  finish: () => Promise<void>;
  /** Leave after the post-commit steps: drops the URL param, then calls `onDone`. */
  done: () => void;
  /** Register a validator for the mounted step (used by useRhfWizardStep). */
  registerStepValidate: (
    fn: () => ValidateResult | Promise<ValidateResult>,
  ) => () => void;
  /** True when the mounted step has blocked forward navigation (Next/Skip disabled). */
  nextBlocked: boolean;
  /** Set by the active step (via useWizardNextGate) to disable/enable Next+Skip. */
  setNextBlocked: (blocked: boolean) => void;

  // Step state
  stepStatus: (index: number) => StepStatus;
  completedSteps: Set<number>;

  // Data
  data: TData;
  updateData: (partial: Partial<TData>) => void;

  // Loading / error
  isSubmitting: boolean;
  /** A `goNext`/`finish` is running the step's validators (an async server check,
   *  say). The chrome shows Next pending — spinner, `aria-busy`, disabled. */
  isValidating: boolean;
  error: string | null;
  clearError: () => void;

  // Per-field validation errors (populated by the last failed goNext)
  fieldErrors: FieldErrors;
  clearFieldErrors: () => void;

  // Cancel dialog
  showCancelDialog: boolean;
  confirmCancel: () => void;
  dismissCancel: () => void;
}

export interface SummaryItem {
  label: ReactNode;
  value: ReactNode;
}

export interface SummarySection {
  label: ReactNode;
  /**
   * Which step the section's edit button jumps back to. Leave it out for a section
   * that belongs to no step — file-level counts, a total — and the card has no edit
   * button, instead of borrowing one from whichever step it was parked under.
   */
  stepIndex?: number;
  items: SummaryItem[];
}

/**
 * Every string the wizard chrome shows. All optional with English defaults, so a
 * monolingual app can mount `StepperNav` bare; a translated app passes the whole
 * object once (typically from a thin app-side wrapper).
 */
export interface WizardLabels {
  cancel: string;
  back: string;
  next: string;
  skip: string;
  finish: string;
  /** Shown on Finish while `isSubmitting`. */
  submitting: string;
  /** `aria-label` for the step indicator's `<nav>`. */
  steps: string;
  /** The mobile "Step 2 of 5" line. */
  step: (current: number, total: number) => string;
  /** Heading of the cancel-confirmation dialog. */
  cancelTitle: string;
  /** Body of the cancel-confirmation dialog. */
  confirmCancel: string;
  /** Confirm button in the cancel dialog. */
  cancelConfirmLabel: string;
  /** Dismiss button in the cancel dialog ("keep editing"). */
  cancelDismissLabel: string;
  /** Heading above a {@link WizardSummary}. */
  reviewTitle: string;
  /** `aria-label` on a summary section's edit button. */
  edit: string;
  /**
   * Toasted (or handed to `onValidationFailed`) when a step blocks Next without
   * saying which field is at fault. `useWizard`'s `missingRequiredMessage` wins.
   *
   * This and `genericError` are OPTIONAL, unlike every key above, for the reason
   * `TwoFactorSettingLabels.qrAlt` is: apps annotate a full translation as
   * `const DE: WizardLabels = {…}`, and a new required key would be a compile error
   * in each of them on the next update. The defaults below always carry both.
   */
  missingRequired?: string;
  /** `wizard.error` when `onComplete` rejects with nothing readable — a thrown
   *  non-Error, or an Error whose message is empty. Optional: see above. */
  genericError?: string;
  /** The button on the last step after a committing step (`onDone`). Optional: see
   *  `missingRequired`. */
  done?: string;
}

/** Typed with the two optional keys made required, so code reading the defaults
 *  directly (the fallback in `useWizard`) needs no `!`. */
export const DEFAULT_WIZARD_LABELS: WizardLabels &
  Required<Pick<WizardLabels, "missingRequired" | "genericError" | "done">> = {
  cancel: "Cancel",
  back: "Back",
  next: "Next",
  skip: "Skip",
  finish: "Finish",
  submitting: "Creating…",
  steps: "Steps",
  step: (current, total) => `Step ${current} of ${total}`,
  cancelTitle: "Discard this form?",
  confirmCancel: "Your entries will be lost.",
  cancelConfirmLabel: "Discard",
  cancelDismissLabel: "Keep editing",
  reviewTitle: "Review",
  edit: "Edit",
  missingRequired: "Please fill in all required fields.",
  genericError: "An error occurred",
  done: "Done",
};

export function resolveWizardLabels(labels?: Partial<WizardLabels>): WizardLabels {
  return labels ? { ...DEFAULT_WIZARD_LABELS, ...labels } : DEFAULT_WIZARD_LABELS;
}
