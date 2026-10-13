// The English words of ./sparkline, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./sparkline re-exports them.

import type { SparklineLabels } from "./sparkline";

export const DEFAULT_SPARKLINE_LABELS: SparklineLabels = {
  rising: (first, last) => `Rising from ${first} to ${last}`,
  falling: (first, last) => `Falling from ${first} to ${last}`,
  flat: (value) => `Unchanged at ${value}`,
  single: (value) => `One value: ${value}`,
  noData: "No data",
  named: (name, summary) => `${name}: ${summary}`,
};
