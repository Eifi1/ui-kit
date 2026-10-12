// The English words of ./phone-input, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./phone-input re-exports them.

import type { PhoneInputLabels } from "./phone-input";

export const DEFAULT_PHONE_INPUT_LABELS: PhoneInputLabels = {
  countryCode: "Country code",
  other: "Other",
};
