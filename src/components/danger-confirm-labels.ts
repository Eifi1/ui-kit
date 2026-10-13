// The English words of ./danger-confirm, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./danger-confirm re-exports them.

import type { DangerConfirmLabels } from "./danger-confirm";

/** `satisfies` rather than a type annotation, so `DEFAULT_DANGER_CONFIRM_LABELS.phrase`
 *  stays callable for a caller that composes its own label from it. */
export const DEFAULT_DANGER_CONFIRM_LABELS = {
  arm: "Delete…",
  confirm: "Delete",
  cancel: "Cancel",
  prompt: "This cannot be undone.",
  password: "Password",
  phrase: (phrase: string) => `Type “${phrase}” to confirm`,
  acknowledge: "I have read what this does and want to continue.",
  needsPhrase: (phrase: string) => `Type “${phrase}” to confirm`,
  needsAcknowledge: "Tick the box to confirm",
  needsPassword: "Enter your password to confirm",
} satisfies DangerConfirmLabels;
