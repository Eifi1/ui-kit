// The English words of ./country-select, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./country-select re-exports them.

import type { CountrySelectLabels } from "./country-select";

export const DEFAULT_COUNTRY_SELECT_LABELS: CountrySelectLabels = {
  country: "Country",
  search: "Search country",
  others: "Other countries",
};
