// The English words of `TourGuideButton` (docs/tours-harmonization.md §11), in a module with
// no component code, like every `*-labels.ts` (0.34, KS U8).

/** The `tourGuide` namespace: the form's "Guide me". */
export interface TourGuideLabels {
  /** The button's text. */
  label: string;
  /** Its accessible description. */
  description: string;
}

export const DEFAULT_TOUR_GUIDE_LABELS: TourGuideLabels = {
  label: "Guide me",
  description: "Walks you through this form, field by field",
};
