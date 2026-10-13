// The English words of ./calendar-heatmap, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./calendar-heatmap re-exports them.

import type { CalendarHeatmapLabels } from "./calendar-heatmap";

/** English defaults, exported as the `calendarHeatmap` namespace of `UiKitLabels`. */
export const DEFAULT_CALENDAR_HEATMAP_LABELS: CalendarHeatmapLabels = {
  grid: "Daily values",
  day: (date, value) => `${date}: ${value}`,
  less: "Less",
  more: "More",
  truncated: (count) =>
    `Showing the most recent days; ${count} earlier ${count === 1 ? "day is" : "days are"} not shown.`,
};
