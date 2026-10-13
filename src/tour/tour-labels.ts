// The English words of ./tour, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./tour re-exports them.

import type { TourLabels } from "./tour";

export const DEFAULT_TOUR_LABELS: TourLabels = {
  next: "Next",
  back: "Back",
  skip: "Skip",
  done: "Done",
  awaitClickHint: "Click the highlighted element to continue",
  step: (c, t) => `${c} / ${t}`,
};
