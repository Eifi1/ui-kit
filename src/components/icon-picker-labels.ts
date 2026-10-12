// The English words of ./icon-picker, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./icon-picker re-exports them.

import type { IconPickerLabels } from "./icon-picker";

export const DEFAULT_ICON_PICKER_LABELS: IconPickerLabels = {
  none: "No icon",
  mixed: "Mixed: the selected items have different icons",
  search: "Search icons",
  noResults: "No icons match",
  resultCount: (count) => (count === 1 ? "1 icon" : `${count} icons`),
};
