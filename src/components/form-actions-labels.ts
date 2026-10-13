// The English words of ./form-actions, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./form-actions re-exports them.

import type { FormActionsLabels } from "./form-actions";

export const DEFAULT_FORM_ACTIONS_LABELS: FormActionsLabels = {
  save: "Save",
  cancel: "Cancel",
  submitShortcut: (apple) => (apple ? "⌘ Enter" : "Ctrl+Enter"),
};
