// The English words of ./delete-account-setting, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./delete-account-setting
// re-exports them.

import { englishRateLimited } from "../auth/auth-errors";
import type { DeleteAccountLabels } from "./delete-account-setting";

export const DEFAULT_DELETE_ACCOUNT_LABELS: DeleteAccountLabels = {
  title: "Delete account",
  afterDays: (days) =>
    days === 1
      ? "Your account is deactivated at once and erased for good 1 day later."
      : `Your account is deactivated at once and erased for good ${days} days later.`,
  operator: "Your account is deactivated at once, and an operator will erase it for good.",
  arm: "Delete account…",
  prompt: "You will be signed out on every device, and your account can no longer be used.",
  handOver: (count) =>
    count === 1
      ? "1 item others can see will pass to an administrator."
      : `${count} items others can see will pass to an administrator.`,
  confirm: "Delete my account",
  done: "Your account is deactivated. You are being signed out.",
  wrongPassword: "The password is incorrect.",
  confirmationMismatch: "This is not your account’s address.",
  lastAdmin: "You are the last administrator. Make someone else an administrator first.",
  lastAdminOf: (companies) =>
    `You are the last administrator of ${companies}. Make someone else an administrator there first.`,
  householdHasMembers:
    "Your household has other members, so the account can’t be deleted here. Please write to the operator.",
  rateLimited: englishRateLimited,
  failed: "Your account could not be deleted. Please try again.",
};
