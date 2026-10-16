// The English words of ./feedback-menu, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./feedback-menu re-exports them.

import type { FeedbackMenuLabels } from "./feedback-menu";

export const DEFAULT_FEEDBACK_MENU_LABELS: FeedbackMenuLabels = {
  trigger: "Send feedback",
  myFeedback: "My feedback",
  viewFeedback: "View feedback",
  allFeedback: "All feedback",
  discussion: "Feedback discussion",
  inbox: "Feedback inbox",
};
