// The English words of ./role-select, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./role-select re-exports them.

import type { RoleSelectLabels } from "./role-select";

export const DEFAULT_ROLE_SELECT_LABELS: RoleSelectLabels = {
  label: "Role",
  rolesLegend: "Roles",
  roleOf: (name) => `Role of ${name}`,
  lockedLastAdmin: "The last active administrator keeps this role.",
  lockedSelf: "You can’t change your own role.",
  notForLastAdmin: "not for the last administrator",
  notForSelf: "not for your own account",
  unavailable: (role, reason) => `${role} (${reason})`,
};
