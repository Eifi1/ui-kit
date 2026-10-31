// The English words of ./tabs, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./tabs re-exports them. (In ui-labels.ts with the
// field base's until 0.52, MOD-7.)

import type { TabsLabels } from "./tabs";

export const DEFAULT_TABS_LABELS: TabsLabels = {
  add: "Add tab",
  remove: (tab) => `Remove ${tab}`,
  more: "More tabs",
  previous: "Previous tabs",
};
