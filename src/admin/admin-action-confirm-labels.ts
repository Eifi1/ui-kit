// The English words of ./admin-action-confirm, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./admin-action-confirm
// re-exports them.

import type { AdminActionLabels } from "./admin-action-confirm";

export const DEFAULT_ADMIN_ACTION_LABELS: AdminActionLabels = {
  confirm: "Confirm",
  cancel: "Cancel",
  close: "Close",
  lastAdmin: "This is the last active administrator. Make someone else an administrator first.",
  self: "You can’t do this to your own account.",
  confirmationMismatch: "The address doesn’t match this account. Check which account you are on.",
  otherCompanies:
    "This account also belongs to other companies, so only the platform operator can do this. You can remove it from this company instead.",
  removeFromCompany: "Remove from company",
  failed: "That didn’t work. Please try again.",
};
