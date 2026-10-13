// The English words of ./progress-bar, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./progress-bar re-exports them.

import type { ProgressBarLabels } from "./progress-bar";

export const DEFAULT_PROGRESS_BAR_LABELS: ProgressBarLabels = {
  unlimited: "Unlimited",
  overLimit: (amount) => `${amount} over the limit`,
};
