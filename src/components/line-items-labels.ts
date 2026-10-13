// The English words of ./line-items, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./line-items re-exports them.

import type { LineItemsLabels } from "./line-items";

export const DEFAULT_LINE_ITEMS_LABELS: LineItemsLabels = {
  add: "Add row",
  remove: (row) => `Remove row ${row}`,
  confirmRemove: (row) => `Remove row ${row}? Press again to confirm`,
  row: (row) => `Row ${row}`,
  cell: (column, row) => `${column}, row ${row}`,
  totals: "Total",
};
