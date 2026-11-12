// The English words of ./swipe-setting, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./swipe-setting re-exports them.

import type { SwipeSettingLabels } from "./swipe-setting";

/** keksdose's Settings → Interaction words (`settings.swipe_*`), which the card came from. */
export const DEFAULT_SWIPE_SETTING_LABELS: SwipeSettingLabels = {
  title: "Swipe gestures",
  description: "How list rows respond to a horizontal drag — by touch, or by dragging with the mouse.",
  surfacePicker: "Which list",
  surfaces: {
    feedback: "Feedback",
    translationReview: "Translations",
  },
  right: "Swipe right",
  left: "Swipe left",
  primary: "Short swipe",
  secondary: "Long swipe",
  none: "— none —",
  nextStatus: "Next status",
  help: "A short drag commits the first action; dragging further commits the second. An action a given row can't perform is skipped, so the next one moves up.",
  saveDefault: "Set as my defaults",
  reset: "Reset to defaults",
  resetMine: "Back to my defaults",
  defaultSaved: "Reset now goes back to the defaults you saved.",
  resetShipped: "Restore the shipped defaults",
  keywords: "swipe gesture drag left right short long rows lists",
};
