// The English words of ./forgot-password-form, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./forgot-password-form
// re-exports them.

import { englishRateLimited } from "./auth-errors";
import type { ForgotPasswordLabels } from "./forgot-password-form";

/** `Required`: every key, the 0.30 one included, has its English here. */
export const DEFAULT_FORGOT_PASSWORD_LABELS: Required<ForgotPasswordLabels> = {
  title: "Forgot password",
  intro: "Enter your account’s email address. We’ll send you a link to choose a new password.",
  email: "Email",
  submit: "Send the link",
  sent: (email) => `If an account exists for ${email}, the link is on its way.`,
  sentHint: "The link is valid for one hour and works exactly once. Check your spam folder too.",
  backToSignIn: "Back to sign in",
  error: "The request failed. Please try again later.",
  rateLimited: englishRateLimited,
};
