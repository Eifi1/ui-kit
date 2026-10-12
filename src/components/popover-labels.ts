// The English words of ./popover, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./popover re-exports them.

import type { PopoverLabels } from "./popover";

// Exported since the kit grew one label tree (`UiKitLabels`, src/i18n): the complete
// English reference a translator works from has to be able to name every namespace.
export const DEFAULT_POPOVER_LABELS: PopoverLabels = {
  // "Pop-up", not "Popover": the panel's accessible name is read to USERS, and
  // "popover" is a developer's word for it (reported by keksdose, 0.5.0). Only a
  // bare Popover falls back to this — the kit's own pickers name their panels.
  panel: "Pop-up",
};
