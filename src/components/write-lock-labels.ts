// The English words of ./write-lock, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./write-lock re-exports them.

import type { WriteLockLabels } from "./write-lock";

export const DEFAULT_WRITE_LOCK_LABELS: WriteLockLabels = {
  reason: "You can view this but not change it.",
  offline: "Needs a connection.",
};
