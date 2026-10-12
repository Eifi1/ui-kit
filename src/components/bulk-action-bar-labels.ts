// The English words of ./bulk-action-bar, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./bulk-action-bar re-exports them.

import type { BulkActionBarLabels } from "./bulk-action-bar";

export const DEFAULT_BULK_ACTION_BAR_LABELS: BulkActionBarLabels = {
  selected: (count) => `${count} selected`,
  clear: "Clear selection",
  cleared: "Selection cleared",
};
