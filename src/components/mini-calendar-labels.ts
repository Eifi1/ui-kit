// The English words of ./mini-calendar, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./mini-calendar re-exports them.

import type { MiniCalendarLabels } from "./mini-calendar";

/** English defaults. Exported as the `miniCalendar` namespace of `UiKitLabels`
 *  (src/i18n), the complete reference a translation is written against. */
export const DEFAULT_MINI_CALENDAR_LABELS: MiniCalendarLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  day: (date) => date,
  chooseStart: "Choose a start date",
  chooseEnd: "Choose an end date",
  startSelected: (date) => `${date} selected as the start. Choose an end date.`,
  rangeSelected: (from, to) => `${from} to ${to} selected. Choose a start date to begin again.`,
};
