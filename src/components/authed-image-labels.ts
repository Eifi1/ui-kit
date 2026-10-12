// The English words of ./authed-image, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./authed-image re-exports them.

import type { AuthedImageLabels } from "./authed-image";

export const DEFAULT_AUTHED_IMAGE_LABELS: AuthedImageLabels = {
  loading: "Loading image…",
  loadError: "Image couldn’t be loaded",
  failedImage: (alt) => `${alt}: image couldn’t be loaded`,
};
