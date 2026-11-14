// The English words of ./account-failure, in a module with no code beyond them: the English
// catalogue (src/i18n/defaults.ts) imports them without the function, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./account-failure re-exports them.

import { englishRateLimited } from "../auth/auth-errors-labels";
import type { AccountFailureLabels } from "./account-failure";

/** 0.63: what `describeAccountFailure` says, in English. The older codes keep the words the
 *  kit's forms already use for them (`signIn`, `register`, `emailChange`, `deleteAccount`,
 *  `adminAction`), so a refusal reads the same on a form and in a toast. */
export const DEFAULT_ACCOUNT_FAILURE_LABELS: AccountFailureLabels = {
  codes: {
    invalid_credentials: "The email or password is incorrect.",
    registration_closed: "New accounts are by invitation only. Ask the operator to invite your email address.",
    email_taken: "An account with this email address already exists.",
    invitation_invalid: "This invitation link is not valid.",
    invitation_expired: "This invitation has expired. Ask for a new one.",
    token_invalid: "This link is invalid or has expired.",
    token_expired: "This link has expired. Ask for a new one.",
    account_inactive: "This account is deactivated.",
    session_ended: "Your session has ended. Please sign in again.",
    not_signed_in: "You are not signed in. Please sign in.",
    admin_required: "Only an administrator can do this.",
    password_unchanged: "The new password is the same as the current one. Choose another.",
    password_change_not_required: "This account no longer needs a new password. Please sign in.",
    email_unchanged: "This is already your address.",
    email_change_not_pending: "No address change is waiting.",
    mail_not_sent: "The email could not be sent. Please try again later.",
    passkey_refused: "Passkey sign-in failed.",
    passkey_registration_refused: "The passkey could not be added. Please try again.",
    passkey_not_found: "This passkey no longer exists.",
    session_not_found: "This session has already ended.",
    invitation_not_found: "This invitation no longer exists.",
    invitation_closed: "This invitation has already been accepted or revoked.",
    invitation_scope_invalid: "The selection for this invitation is not available.",
    last_admin: "This is the last active administrator. Make someone else an administrator first.",
    self_action: "You can’t do this to your own account.",
    other_companies:
      "This account also belongs to other companies, so only the platform operator can do this. You can remove it from this company instead.",
    household_has_members:
      "Your household has other members, so the account can’t be deleted here. Please write to the operator.",
    confirmation_required: "Please confirm this first.",
    confirmation_mismatch: "This is not your account’s address.",
    password_incorrect: "The password is incorrect.",
    demo_refused: "The demo can’t do this.",
    user_not_found: "This account no longer exists.",
    role_not_grantable: "This role can’t be given here.",
    reviewer_is_admin: "An administrator can’t also be a reviewer. Change the role first.",
    email_already_verified: "This address is already confirmed.",
    deletion_not_requested: "This account hasn’t asked to be deleted, or it is still active.",
    two_factor_invalid:
      "That code isn’t right, or it was used already. Enter the code your authenticator app shows now.",
    two_factor_unavailable:
      "Two-factor sign-in is unavailable on this server right now. Your authenticator app is fine. Please try again later.",
    two_factor_not_pending: "No setup is waiting for a code. Start the setup again.",
  },
  offline: "Can’t reach the server. Check your connection and try again.",
  timeout: "The server took too long to answer. Please try again.",
  server: "Something went wrong on the server. Please try again later.",
  rateLimited: englishRateLimited,
  failed: "That didn’t work. Please try again.",
};
