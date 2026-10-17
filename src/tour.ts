// `@eifi1/ui-kit/tour` — guided tours.
// A re-slicing of the main barrel, not a new API.
export * from "./tour/tour";
// 0.43.0: the tours page (docs/tours-harmonization.md §3, §8) — keksdose's catalogue, its
// card, the NEW and reset rules, device progress and the URL. `useTourUrlSync` and
// `useTourCatalogueUrlState` need react-router (a peer already, for /shell).
export { TourCatalogue, TourCatalogueCard, DEFAULT_TOUR_CATALOGUE_LABELS } from "./tour/tour-catalogue";
export type { TourCatalogueProps, TourCatalogueCardProps, TourCatalogueLabels } from "./tour/tour-catalogue";
export { isTourNew, isTourReset, isTourDone, doneCount, earnedPoints } from "./tour/tour-info";
export type { TourInfo, TourGroup, TourUpdate, TourCompletions } from "./tour/tour-info";
// 0.44.0: the writer outside a page (§9.2).
export { useTourProgress, resetTourProgress, completeTour } from "./tour/use-tour-progress";
export type { UseTourProgressOptions, TourProgress } from "./tour/use-tour-progress";
export { useTourUrlSync, useTourCatalogueUrlState } from "./tour/use-tour-url-sync";
export type { UseTourUrlSyncOptions, TourCatalogueFilter, TourStateFilter } from "./tour/use-tour-url-sync";
