// The English words of ./signed-amount, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./signed-amount re-exports them.

import type { SignedAmountLabels } from "./signed-amount";

export const DEFAULT_SIGNED_AMOUNT_LABELS: SignedAmountLabels = {
  positive: (amount) => `plus ${amount}`,
  negative: (amount) => `minus ${amount}`,
};
