// The English words of ./complete-name-dialog, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./complete-name-dialog
// re-exports them.

import type { CompleteNameLabels } from "./complete-name-dialog";

export const DEFAULT_COMPLETE_NAME_LABELS: CompleteNameLabels = {
  title: "Complete your name",
  description: "First and last name are now asked for separately. Check what is filled in and add what is missing.",
  firstName: "First name",
  lastName: "Last name",
  save: "Save",
  later: "Later",
  failed: "Your name could not be saved. Please try again.",
};
