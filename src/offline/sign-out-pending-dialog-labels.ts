// The English words of ./sign-out-pending-dialog, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component (0.34, KS U8).
// keksdose's reviewed words (nav.logout_queued_*, account-menu.tsx:247-317) are the canon.

import type { SignOutPendingDialogLabels } from "./sign-out-pending-dialog";

export const DEFAULT_SIGN_OUT_PENDING_DIALOG_LABELS: SignOutPendingDialogLabels = {
  title: "Some changes have not been saved to the server yet",
  lost: (count) =>
    count === 1
      ? "1 change is still waiting to sync. Logging out clears this device’s copy, and it is the only copy."
      : `${count} changes are still waiting to sync. Logging out clears this device’s copy, and it is the only copy.`,
  kept: (count) =>
    count === 1
      ? "1 change is still waiting to sync. It stays on this device for you and syncs the next time you log in here."
      : `${count} changes are still waiting to sync. They stay on this device for you and sync the next time you log in here.`,
  syncNow: "Sync now",
  signOutAnyway: "Log out anyway",
  discardWaiting: "Discard waiting changes",
  cancel: "Cancel",
};
