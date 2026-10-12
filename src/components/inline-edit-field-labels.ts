// The English words of ./inline-edit-field, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./inline-edit-field re-exports them.

import type { InlineEditLabels } from "./inline-edit-field";

export const DEFAULT_INLINE_EDIT_LABELS: InlineEditLabels = {
  edit: (label) => `Edit ${label}`,
  failed: "The change could not be saved.",
  empty: "Empty",
};
