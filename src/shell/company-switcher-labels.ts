// The English words of ./company-switcher, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./company-switcher re-exports them.

import type { CompanySwitcherLabels } from "./company-switcher";

export const DEFAULT_COMPANY_SWITCHER_LABELS: CompanySwitcherLabels = {
  switchCompany: "Switch company",
  heading: "Companies",
  current: (name) => `Company: ${name}`,
  currentMark: "(current)",
  switching: "Switching company…",
};
