// The English words of ./floating-panel, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./floating-panel re-exports them.

import type { FloatingPanelLabels } from "./floating-panel";

export const DEFAULT_FLOATING_PANEL_LABELS: FloatingPanelLabels = {
  close: "Close",
  badge: (count) => `${count} new`,
};
