// The English words of ./register-form, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./register-form re-exports them.

import { englishRateLimited } from "./auth-errors";
import type { RegisterLabels } from "./register-form";

/** `Required`: every key, the 0.30 one included, has its English here. */
export const DEFAULT_REGISTER_LABELS: Required<RegisterLabels> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  emailTagUse: (address) => `Use ${address}`,
  emailTagHint:
    "Many providers deliver name+tag@… to the same inbox, so mail from this app is easy to filter and trace. Check yours does before you rely on it: you would sign in with the tagged address.",
  invitedEmailHint: "The address your invitation was sent to.",
  invitedTagNote: "The tagged address gets a confirmation mail of its own.",
  password: "Password",
  confirmPassword: "Repeat password",
  passwordMismatch: "The passwords don't match.",
  language: "Language",
  submit: "Create account",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
  emailTaken: "An account with this email address already exists.",
  registrationClosed: "New accounts are by invitation only. Ask the operator to invite your email address.",
  invitationInvalid: "This invitation link is not valid.",
  invitationExpired: "This invitation has expired. Ask for a new one.",
  failed: "Registration failed. Please try again.",
  rateLimited: englishRateLimited,
};
