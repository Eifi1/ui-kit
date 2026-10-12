// The English words of ./toast, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./toast re-exports them.

import type { ToastLabels } from "./toast";

export const DEFAULT_TOAST_LABELS: ToastLabels = {
  close: "Close notification",
  notifications: "Notifications",
  undo: "Undo",
  redo: "Redo",
};
