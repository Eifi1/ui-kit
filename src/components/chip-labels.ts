// The English words of ./chip, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./chip re-exports them.

import type { ChipInputLabels } from "./chip";

export const DEFAULT_CHIP_INPUT_LABELS: ChipInputLabels = {
  added: (v) => `${v} added`,
  removed: (v) => `${v} removed`,
  remove: "Remove",
  atLimit: (max) => `Limit of ${max} reached`,
  duplicate: (v) => `${v} is already in the list`,
};
