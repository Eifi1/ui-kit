// The English words of ./feedback-context, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./feedback-context re-exports them.

import type { FeedbackContextLabels } from "./feedback-context";

export const DEFAULT_FEEDBACK_CONTEXT_LABELS: FeedbackContextLabels = {
  user: "User",
  attachUrl: "Attach current page URL",
};
