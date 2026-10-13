// The English words of ./month-picker, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./month-picker re-exports them.

import type { MonthPickerLabels } from "./month-picker";

/** The English starting point every override is merged onto. Exported (unlike the
 *  calendar's) because it is asked for by name: a host building its own translation
 *  table can spread it rather than re-typing four keys to change one. */
export const DEFAULT_MONTH_PICKER_LABELS: MonthPickerLabels = {
  previousYear: "Previous year",
  nextYear: "Next year",
  panel: "Choose a month",
  month: (monthYear) => monthYear,
  previousMonth: "Previous month",
  nextMonth: "Next month",
  today: "Today",
  yearPanel: "Choose a year",
  earlierYears: "Earlier years",
  laterYears: "Later years",
  thisYear: "This year",
};
