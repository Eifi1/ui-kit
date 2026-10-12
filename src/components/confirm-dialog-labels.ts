// The English words of ./confirm-dialog, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./confirm-dialog re-exports them.

import type { ConfirmDialogLabels } from "./confirm-dialog";

/** `satisfies` rather than a type annotation, so `.typed` stays known-callable for a
 *  caller composing its own label from it. */
export const DEFAULT_CONFIRM_DIALOG_LABELS = {
  confirm: "Confirm",
  cancel: "Cancel",
  typed: (text: string) => `Type “${text}” to confirm`,
} satisfies ConfirmDialogLabels;
