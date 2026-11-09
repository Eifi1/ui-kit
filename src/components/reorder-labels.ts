// The English words of ./reorder's useReorder, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the hook, so `en` loads as
// one chunk like the other languages (0.34, KS U8). ./reorder re-exports them.

import type { ReorderLabels } from "./reorder";

export const DEFAULT_REORDER_LABELS: ReorderLabels = {
  moveUp: "Move up",
  moveDown: "Move down",
  atTop: "Already at the top",
  atBottom: "Already at the bottom",
  moved: (position, total) => `Moved to position ${position} of ${total}`,
};
