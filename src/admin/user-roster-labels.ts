// The English words of ./user-roster, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./user-roster re-exports them.

import type { UserRosterLabels } from "./user-roster";

export const DEFAULT_USER_ROSTER_LABELS: UserRosterLabels = {
  name: "Name",
  email: "Email",
  role: "Role",
  state: "State",
  created: "Created",
  lastLogin: "Last login",
  never: "Never",
  actions: "Actions",
  actionsFor: (name) => `Actions for ${name}`,
};
