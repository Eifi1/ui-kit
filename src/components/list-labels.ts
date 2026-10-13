// The English words of ./list, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./list re-exports them.

import type { ListLabels } from "./list";

export const DEFAULT_LIST_LABELS: ListLabels = {
  unread: "Unread",
  opensInNewTab: "opens in a new tab",
};
