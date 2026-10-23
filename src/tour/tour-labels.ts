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
  awaitInputHint: "Enter a value in the highlighted field to continue",
  step: (c, t) => `${c} / ${t}`,
  // 0.50: guided form tours (docs/tours-harmonization.md §11).
  leaveEmpty: "Leave empty",
  optional: "Optional",
  gateHint: "Fill in the highlighted field to continue",
  gateReady: "Ready. Press Next or Enter to continue.",
  awaitGateHint: "Save to continue",
  awaitGateRefused: "That wasn’t saved yet. Check the form and try again.",
  backToStep: (title) => `Back to “${title}”`,
};
