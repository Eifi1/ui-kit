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
}

export interface UseWizardOptions<TData extends Record<string, unknown>> {
  steps: WizardStepConfig[];
  initialData?: Partial<TData>;
  onComplete?: (data: TData) => void | Promise<void>;
  onCancel?: () => void;
  /**
   * Shown when a step blocks with no per-field detail — an RHF step surfacing
   * its own inline messages, say — so the user learns why the wizard did not
   * advance. Falls back to an English default.
   */
  missingRequiredMessage?: string;
  /**
   * How to surface {@link missingRequiredMessage}. Defaults to a `sonner` toast
   * (an optional peer, imported only when this actually fires). Pass your own to
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
  /** True once every step before the last has been completed or skipped. */
  canFinish: boolean;
  goNext: () => Promise<void>;
  goBack: () => void;
  goToStep: (index: number) => void;
  skip: () => void;
  cancel: () => void;
  finish: () => Promise<void>;
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
  /** Which step the section's edit button jumps back to. */
  stepIndex: number;
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
}

export const DEFAULT_WIZARD_LABELS: WizardLabels = {
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
};

export function resolveWizardLabels(labels?: Partial<WizardLabels>): WizardLabels {
  return labels ? { ...DEFAULT_WIZARD_LABELS, ...labels } : DEFAULT_WIZARD_LABELS;
}
