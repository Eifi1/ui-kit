// The English words of ./reviewer-scope-editor, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./reviewer-scope-editor
// re-exports them.

import type { ReviewerScopeLabels } from "./reviewer-scope-editor";

export const DEFAULT_REVIEWER_SCOPE_LABELS: ReviewerScopeLabels = {
  languages: "Languages",
  hint: "Tick the languages this person reviews.",
  none: "No language: saving takes the reviewer role away.",
  areas: "Limit to",
  legalOnly: "Only the legal pages",
  legalOnlyHint: "Imprint, Privacy Policy and Terms — for a lawyer rather than a native speaker.",
  failed: "The reviewer scope couldn’t be saved. Please try again.",
};
