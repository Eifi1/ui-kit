// The English words of ./email-change-setting, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./email-change-setting
// re-exports them.

import { englishRateLimited } from "../auth/auth-errors-labels";
import type { EmailChangeLabels } from "./email-change-setting";

export const DEFAULT_EMAIL_CHANGE_LABELS: EmailChangeLabels = {
  title: "Email address",
  current: "Current address",
  newEmail: "New email address",
  password: "Current password",
  passwordHint: "Your address is how you sign in, so changing it takes your password.",
  emailTagUse: (address) => `Use ${address}`,
  emailTagHint:
    "Many providers deliver name+tag@… to the same inbox, so mail from this app is easy to filter and trace. Check yours does before you rely on it: you would sign in with the tagged address.",
  submit: "Change email address",
  sameAsCurrent: "This is already your address.",
  emailTaken: "An account with this email address already exists.",
  wrongPassword: "The password is incorrect.",
  pending: (newEmail) => `Confirm the link we sent to ${newEmail}.`,
  pendingHint: (currentEmail) => `Until you do, you keep signing in with ${currentEmail}. Check your spam folder too.`,
  resend: "Send the link again",
  resent: "We sent the link again.",
  cancel: "Cancel the change",
  confirmed: (email) => `Your email address is now ${email}.`,
  passkeyNote: "Your passkeys keep working. Your device may still list them under your old address.",
  rateLimited: englishRateLimited,
  failed: "That didn’t work. Please try again.",
};
