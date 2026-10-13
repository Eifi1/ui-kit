// The English words of ./image-grid, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./image-grid re-exports them.

import type { ImageGridLabels } from "./image-grid";

export const DEFAULT_IMAGE_GRID_LABELS: ImageGridLabels = {
  list: "Images",
  item: (index, count) => `Image ${index} of ${count}`,
  actions: (name) => `Actions for ${name}`,
};
