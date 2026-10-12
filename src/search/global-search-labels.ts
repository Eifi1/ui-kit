// The English words of ./global-search, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./global-search re-exports them.

import type { GlobalSearchLabels } from "./global-search";

export const DEFAULT_GLOBAL_SEARCH_LABELS: GlobalSearchLabels = {
  trigger: "Search",
  placeholder: "Search or jump to…",
  shortcut: (keys) => `Search (${keys})`,
  suggestions: "Try",
  results: "Results",
};
