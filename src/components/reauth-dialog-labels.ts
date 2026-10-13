// The English words of ./reauth-dialog, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./reauth-dialog re-exports them.

import type { ReauthDialogLabels } from "./reauth-dialog";

export const DEFAULT_REAUTH_DIALOG_LABELS: ReauthDialogLabels = {
  title: "Confirm it’s you",
  description: "Enter your current password to continue.",
  password: "Current password",
  submit: "Continue",
  cancel: "Cancel",
};
