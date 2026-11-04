// The English words of ./field-parts' FieldSuggestion, in a module with no component code:
// the English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./field-parts re-exports them.

import type { FieldSuggestionLabels } from "./field-parts";

export const DEFAULT_FIELD_SUGGESTION_LABELS: FieldSuggestionLabels = {
  suggested: "Suggested",
  clear: "Clear",
  clearName: (field) => (field ? `Clear the suggestion for “${field}”` : "Clear the suggestion"),
};
