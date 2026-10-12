// The English words of ./row-actions, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./row-actions re-exports them.

import type { RowActionsLabels } from "./row-actions";

export const DEFAULT_ROW_ACTIONS_LABELS: RowActionsLabels = {
  actions: "Actions",
  actionsFor: (name) => `Actions for ${name}`,
};
