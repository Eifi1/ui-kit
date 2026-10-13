// The English words of ./lightbox, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./lightbox re-exports them.

import type { LightboxLabels } from "./lightbox";

export const DEFAULT_LIGHTBOX_LABELS: LightboxLabels = {
  dialog: "Image viewer",
  close: "Close",
  previous: "Previous image",
  next: "Next image",
  counter: (index, count) => `${index} / ${count}`,
  position: (index, count) => `Image ${index} of ${count}`,
  download: "Download",
  zoom: "Zoom",
  noPreview: "No preview available for this file",
  openInNewTab: "Open in new tab",
};
