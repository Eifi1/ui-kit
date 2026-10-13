// The English words of ./stat-tile, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./stat-tile re-exports them.

import type { StatTileLabels } from "./stat-tile";

export const DEFAULT_STAT_TILE_LABELS: StatTileLabels = {
  increase: (amount) => `Up ${amount}`,
  decrease: (amount) => `Down ${amount}`,
  unchanged: "No change",
  better: (change) => `${change} (better)`,
  worse: (change) => `${change} (worse)`,
  noValue: "No data",
  loading: "Loading…",
};
