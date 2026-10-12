// The English words of ./sign-in-form, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./sign-in-form re-exports them.

import { englishRateLimited } from "./auth-errors";
import type { SignInLabels } from "./sign-in-form";

/** `Required`: every key, the 0.30 ones included, has its English here. */
export const DEFAULT_SIGN_IN_LABELS: Required<SignInLabels> = {
  email: "Email",
  password: "Password",
  submit: "Sign in",
  passkey: "Sign in with a passkey",
  forgotPassword: "Forgot your password?",
  noAccount: "No account yet?",
  register: "Create account",
  invalidCredentials: "The email or password is incorrect.",
  failed: "Sign-in failed. Please try again.",
  passkeyFailed: "Passkey sign-in failed.",
  deactivatedHint: "Account deactivated? Write to {contact}.",
  tagHint: (taggedAddress) => `Signed up with ${taggedAddress}? Use that address.`,
  twoFactorTitle: "Two-factor authentication",
  twoFactorIntro: "Enter the code your authenticator app shows.",
  code: "2FA code",
  verify: "Verify",
  codeInvalid: "Invalid 2FA code.",
  setPasswordTitle: "Choose a new password",
  setPasswordIntro: "A new password was requested for this account. Choose one and you are straight back in.",
  newPassword: "New password",
  confirmPassword: "Repeat new password",
  passwordMismatch: "The passwords don't match.",
  setPasswordSubmit: "Set password and sign in",
  setPasswordFailed: "The password could not be set.",
  expired: "This sign-in has expired. Please sign in again.",
  backToSignIn: "Back to sign in",
  useRecoveryCode: "Use a backup code",
  useAuthenticatorCode: "Use your authenticator app",
  recoveryCode: "Backup code",
  recoveryIntro: "Enter one of the backup codes you saved when you turned on two-factor authentication.",
  recoveryCodeHint: (length) => `${length} letters and digits. Dashes and spaces don’t matter.`,
  recoveryCodeInvalid: "This backup code is not valid, or it has been used already.",
  rateLimited: englishRateLimited,
  requestAccess: "Request access",
};
