// The English words of ./swatch-picker, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./swatch-picker re-exports them.

import type { SwatchPickerLabels } from "./swatch-picker";

export const DEFAULT_SWATCH_PICKER_LABELS: SwatchPickerLabels = {
  none: "No colour",
  mixed: "Mixed: the selected items have different colours",
};
