// The English words of ./zoomable-image, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./zoomable-image re-exports them.

import type { ZoomableImageLabels } from "./zoomable-image";

export const DEFAULT_ZOOMABLE_IMAGE_LABELS: ZoomableImageLabels = {
  viewer: (alt) => (alt ? `Zoomable image: ${alt}` : "Zoomable image"),
  hint: "Press + or − to zoom and 0 to fit the width.",
  controls: "Zoom",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fit: "Fit to width",
  level: (percent) => `Zoom ${percent}%`,
  fitted: "Fitted to width",
};
