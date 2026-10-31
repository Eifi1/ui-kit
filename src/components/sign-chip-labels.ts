// The English words of ./sign-chip, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./sign-chip re-exports them.

import type { SignChipLabels } from "./sign-chip";

/** @deprecated 0.52 — a `Chip` of your own, as keksdose's DirectionToggle is (MOD-5); removed in 0.53. */
export const DEFAULT_SIGN_CHIP_LABELS: SignChipLabels = {
  outflow: "Outflow",
  inflow: "Inflow",
  direction: (current, next) => `Direction: ${current} — switch to ${next}`,
  switchTo: (next) => `Switch to ${next}`,
};
