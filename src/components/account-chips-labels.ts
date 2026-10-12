// The English words of ./account-chips, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./account-chips re-exports them.

import type { AccountStateLabels } from "./account-chips";

export const DEFAULT_ACCOUNT_STATE_LABELS = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
  registered: "Registered",
  unverified: "Unverified",
  passwordChange: "Must change password",
  deletion: "Deletion requested",
  deletionOn: (date: string) => `Deletion on ${date}`,
} satisfies Required<AccountStateLabels>;
