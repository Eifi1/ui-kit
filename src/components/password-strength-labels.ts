// The English words of ./password-strength, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./password-strength re-exports them.

import type { PasswordStrengthLabels } from "./password-strength";

export const DEFAULT_PASSWORD_STRENGTH_LABELS: PasswordStrengthLabels = {
  tooShort: "Too short",
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
  announcement: (level) => `Password strength: ${level}`,
  ruleLength: (minLength) => `At least ${minLength} characters`,
  ruleCase: "Upper and lower case",
  ruleDigit: "A number",
  ruleSymbol: "A symbol",
  optional: (rule) => `${rule} (optional)`,
  met: "Met:",
  notMet: "Not met:",
  tooLong: (maxBytes) =>
    `At most ${maxBytes} characters (accents and emoji count for more than one).`,
};
