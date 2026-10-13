// The English words of ./app-shell, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./app-shell re-exports them.

import type { AppShellMoreLabels } from "./app-shell";

export const DEFAULT_APP_SHELL_MORE_LABELS: AppShellMoreLabels = {
  more: "More",
  moreTitle: "More pages",
};
