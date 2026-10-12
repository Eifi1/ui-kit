// The English words of ./reset-password-form, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./reset-password-form
// re-exports them.

import { englishRateLimited } from "./auth-errors";
import type { ResetPasswordLabels } from "./reset-password-form";

/** `Required`: every key, the 0.30 one included, has its English here. */
export const DEFAULT_RESET_PASSWORD_LABELS: Required<ResetPasswordLabels> = {
  title: "Choose a new password",
  checking: "Checking the link…",
  intro: (email) => `You’re setting a new password for ${email}.`,
  newPassword: "New password",
  confirmPassword: "Repeat new password",
  mismatch: "The passwords don’t match.",
  submit: "Save password",
  failed: "The password could not be changed.",
  noToken: "This link is incomplete.",
  invalid: "This link is invalid or has expired.",
  invalidHint: "Links are valid for one hour and work only once. Just request a new one.",
  requestNew: "Request a new link",
  success: "Your password has been changed. You can sign in with it now.",
  sessionsEnded: "Signed-in devices were signed out — you’ll need to sign in again there.",
  signIn: "Go to sign in",
  rateLimited: englishRateLimited,
};
