// The English words of ./description-list, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./description-list re-exports them.

import type { DescriptionListLabels } from "./description-list";

export const DEFAULT_DESCRIPTION_LIST_LABELS: DescriptionListLabels = {
  empty: "—",
};
