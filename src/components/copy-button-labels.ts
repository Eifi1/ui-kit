// The English words of ./copy-button, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./copy-button re-exports them.

import type { CopyButtonLabels } from "./copy-button";

export const DEFAULT_COPY_BUTTON_LABELS: CopyButtonLabels = {
  copy: "Copy",
  copied: "Copied",
  failed: "Couldn’t copy",
  copiedAnnouncement: "Copied to clipboard",
  failedAnnouncement: "Couldn’t copy to the clipboard",
};
