// The English words of ./field-base, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./field-base re-exports them.
//
// Until 0.52 they shared ui-labels.ts with the tabs' words, named after the ui.tsx that
// 0.34 split up (MOD-7, refactor audit 2026-10-30): one labels module per component now,
// as every other `*-labels.ts` is.

import type { CharacterCountLabels, PasswordRevealLabels } from "./field-base";

export const DEFAULT_PASSWORD_REVEAL_LABELS: PasswordRevealLabels = {
  show: "Show password",
  hide: "Hide password",
};

export const DEFAULT_CHARACTER_COUNT_LABELS: CharacterCountLabels = {
  count: (used, max) => `${used} of ${max} characters`,
  remaining: (left) => (left === 1 ? "1 character left" : `${left} characters left`),
  limitReached: "Character limit reached",
};
