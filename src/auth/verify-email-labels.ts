// The English words of ./verify-email, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./verify-email re-exports them.

import { englishRateLimited } from "./auth-errors-labels";
import type { VerifyEmailLabels } from "./verify-email";

export const DEFAULT_VERIFY_EMAIL_LABELS: VerifyEmailLabels = {
  title: "Confirm your email address",
  verifying: "Confirming…",
  verified: "Your email address is confirmed.",
  continue: "Continue",
  invalid: "This confirmation link is not valid",
  expired: "This confirmation link has expired",
  noToken: "This link is missing its confirmation token.",
  invalidHint: "The link may have expired or already been used.",
  requestInApp: "You can request a new one from inside the app.",
  requestHere: "You can request a new one here.",
  resend: "Send again",
  resendIn: (seconds) => `Send again in ${seconds} s`,
  resent: "Confirmation email sent",
  resendError: "Could not send the confirmation email",
  rateLimited: englishRateLimited,
  banner: "Please confirm your email address.",
  dismiss: "Not now",
};
