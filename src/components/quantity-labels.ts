// The English words of ./quantity-input's QuantityInput and QuantityField, in a module with
// no component code: the English catalogue (src/i18n/defaults.ts) imports them without the
// component, so `en` loads as one chunk like the other languages (0.34, KS U8).
// ./quantity-input re-exports them.

import type { QuantityLabels } from "./quantity-input";

export const DEFAULT_QUANTITY_LABELS: QuantityLabels = {
  pcs: "pcs",
  unit: (field) => (field ? `Unit for “${field}”` : "Unit"),
  suggested: "Suggested",
  takeSuggestion: (quantity) => `Use ${quantity}`,
};
