// The English words of ./ui, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./ui re-exports them.

import type { CharacterCountLabels, PasswordRevealLabels } from "./field-base";
import type { TabsLabels } from "./tabs";

export const DEFAULT_PASSWORD_REVEAL_LABELS: PasswordRevealLabels = {
  show: "Show password",
  hide: "Hide password",
};

export const DEFAULT_CHARACTER_COUNT_LABELS: CharacterCountLabels = {
  count: (used, max) => `${used} of ${max} characters`,
  remaining: (left) => (left === 1 ? "1 character left" : `${left} characters left`),
  limitReached: "Character limit reached",
};

export const DEFAULT_TABS_LABELS: TabsLabels = {
  add: "Add tab",
  remove: (tab) => `Remove ${tab}`,
  more: "More tabs",
  backToFirst: "Back to the first tab",
};
