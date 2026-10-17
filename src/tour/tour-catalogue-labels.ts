// The English words of `TourCatalogue` and `TourCatalogueCard` (docs/tours-harmonization.md
// §3), in a module with no component code, like every `*-labels.ts` (0.34, KS U8).
// keksdose's reviewed words (tour.* in its en.json) where it had them.

/** The `tourCatalogue` namespace. Counts arrive as numbers, dates already formatted. */
export interface TourCatalogueLabels {
  /** The search box's name. */
  searchLabel: string;
  searchPlaceholder: string;
  /** The group select's name (keksdose: "Topic"). */
  groupLabel: string;
  /** The select's first option, with the count the other filters leave. */
  groupAll: (count: number) => string;
  /** A group's option: its title and its count. */
  groupOption: (group: string, count: number) => string;
  /** The all / to do / done toggle's name. */
  stateLabel: string;
  stateAll: (count: number) => string;
  stateTodo: (count: number) => string;
  stateDone: (count: number) => string;
  /** Under the filter bar while a filter is on. */
  showing: (shown: number, total: number) => string;
  noMatches: string;
  noMatchesHint: string;
  clearFilters: string;
  /** The NEW pill. */
  badgeNew: string;
  /** The pill on a tour reset by an update (§8). */
  badgeUpdated: string;
  /** A reset tour's line: the update's day (formatted) and its reason (§8); `reason` is
   *  left out when the tour's update carries none. */
  resetOn: (date: string, reason?: string) => string;
  /** The points chip. */
  points: (count: number) => string;
  steps: (count: number) => string;
  /** The duration, in minutes. */
  duration: (minutes: number) => string;
  /** Completed, with the day (formatted). */
  completedOn: (date: string) => string;
  /** Completed without a date (kastlan's old id list, §6.2). */
  completed: string;
  /** Not taken yet — the state icon, for a reader. */
  notCompleted: string;
  markUndone: string;
  start: string;
  replay: string;
}

export const DEFAULT_TOUR_CATALOGUE_LABELS: TourCatalogueLabels = {
  searchLabel: "Search tours",
  searchPlaceholder: "Search tours…",
  groupLabel: "Topic",
  groupAll: (count) => `All topics (${count})`,
  groupOption: (group, count) => `${group} (${count})`,
  stateLabel: "Filter tours",
  stateAll: (count) => `All (${count})`,
  stateTodo: (count) => `To do (${count})`,
  stateDone: (count) => `Completed (${count})`,
  showing: (shown, total) => `Showing ${shown} of ${total} tours`,
  noMatches: "No tour matches",
  noMatchesHint: "Try another word, or clear the filters.",
  clearFilters: "Clear filters",
  badgeNew: "New",
  badgeUpdated: "Updated",
  resetOn: (date, reason) => (reason ? `Reset on ${date}: ${reason}` : `Reset on ${date}`),
  points: (count) => `+${count} pts`,
  steps: (count) => (count === 1 ? "1 step" : `${count} steps`),
  duration: (minutes) => `About ${minutes} min`,
  completedOn: (date) => `Completed on ${date}`,
  completed: "Completed",
  notCompleted: "Not completed",
  markUndone: "Mark as not done",
  start: "Start",
  replay: "Replay",
};
