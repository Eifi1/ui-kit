// The English words of the wizard, in a module with no other code: the English catalogue
// (src/i18n/defaults.ts) imports them as it imports every component's `*-labels.ts`.
// ./types re-exports them. Until 0.34 they sat in ./types, the rule's one exception
// outside the provider (round 0.34, DOC-6's sev-1 note).

import type { WizardLabels } from "./types";

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
