// The words of ./account-admin-sections' roster — their type and the English — in a module
// with no component code: the catalogues (src/i18n/kit-labels.tsx, defaults.ts) import them
// without the section, so neither the main barrel reaches react-query nor `en` loads the
// section (0.34, KS U8).

/** The `accountRoster` namespace: the roster section's own words — its actions, their
 *  questions and what each says once done. The refusals are `accountFailure`'s, the
 *  guards' `adminAction`'s, the columns' `userRoster`'s. */
export interface AccountRosterLabels {
  /** The search field's label. */
  search: string;
  /** Above the roster while the server's transport is the console. */
  consoleMail: string;
  /** Before a mail's link, shown while the transport is the console. */
  mailLink: (email: string) => string;
  /** The filter the overview's "Deletion requests" tile links to is on. */
  onlyDeletions: string;
  showEverybody: string;
  /** The column of what a reviewer reviews. */
  reviews: string;
  sendVerification: string;
  verificationSent: (email: string) => string;
  sendReset: string;
  resetSent: (email: string) => string;
  requirePasswordChange: string;
  requirePasswordChangeTitle: (name: string) => string;
  requirePasswordChangeBody: string;
  passwordChangeRequired: (email: string) => string;
  withdrawPasswordChange: string;
  passwordChangeWithdrawn: (email: string) => string;
  reviewer: string;
  reviewerTitle: (name: string) => string;
  /** `languages`: the codes, joined. */
  reviewerSet: (email: string, languages: string) => string;
  reviewerRemoved: (email: string) => string;
  /** The role change's confirm button. */
  changeRole: string;
  /** `role`: the role's word in the app's vocabulary. */
  roleTitle: (name: string, role: string) => string;
  roleBody: string;
  roleChanged: (email: string, role: string) => string;
  deactivate: string;
  deactivateTitle: (name: string) => string;
  deactivateBody: string;
  deactivated: (email: string) => string;
  reactivate: string;
  reactivateTitle: (name: string) => string;
  reactivated: (email: string) => string;
  /** Reactivating an account that asked to be deleted: the request goes with it. */
  cancelDeletion: string;
  cancelDeletionTitle: (name: string) => string;
  deletionCancelled: (email: string) => string;
  erase: string;
  eraseTitle: (name: string) => string;
  eraseBody: string;
  erased: (email: string) => string;
}

/** 0.64: the roster section's words — its actions, the question each asks and what it says
 *  once done. Kurvenschmiede's `admin.*` keys, which every app had in its own catalogue. */
export const DEFAULT_ACCOUNT_ROSTER_LABELS: AccountRosterLabels = {
  search: "Search accounts",
  consoleMail:
    "This server sends no mail: each one goes to its log. After a mail action, its link appears here to hand on.",
  mailLink: (email) => `The link for ${email}, to hand on:`,
  onlyDeletions: "Only the accounts that asked to be deleted.",
  showEverybody: "Show everybody",
  reviews: "Reviews",
  sendVerification: "Send the verification mail again",
  verificationSent: (email) => `Verification mail sent to ${email}.`,
  sendReset: "Send a password reset mail",
  resetSent: (email) => `Password reset mail sent to ${email}.`,
  requirePasswordChange: "Require a new password",
  requirePasswordChangeTitle: (name) => `Require a new password from ${name}?`,
  requirePasswordChangeBody: "At the next sign-in, the account must choose a new password before anything else.",
  passwordChangeRequired: (email) => `${email} must choose a new password at the next sign-in.`,
  withdrawPasswordChange: "Withdraw the new password requirement",
  passwordChangeWithdrawn: (email) => `${email} no longer has to choose a new password.`,
  reviewer: "Translation review",
  reviewerTitle: (name) => `What ${name} reviews`,
  reviewerSet: (email, languages) => `${email} now reviews: ${languages}.`,
  reviewerRemoved: (email) => `${email} no longer reviews translations.`,
  changeRole: "Change role",
  roleTitle: (name, role) => `Change the role of ${name} to “${role}”?`,
  roleBody: "What the account may do changes at once, on its next request.",
  roleChanged: (email, role) => `${email} now has the role “${role}”.`,
  deactivate: "Deactivate",
  deactivateTitle: (name) => `Deactivate ${name}?`,
  deactivateBody:
    "The account is signed out everywhere and can no longer sign in. Nothing is deleted, and it can be reactivated.",
  deactivated: (email) => `${email} is deactivated.`,
  reactivate: "Reactivate",
  reactivateTitle: (name) => `Reactivate ${name}?`,
  reactivated: (email) => `${email} is active again.`,
  cancelDeletion: "Cancel the deletion",
  cancelDeletionTitle: (name) => `Keep the account of ${name}?`,
  deletionCancelled: (email) => `${email} is kept and active again.`,
  erase: "Erase now",
  eraseTitle: (name) => `Erase the account of ${name} now?`,
  eraseBody: "The account and what it holds are erased for good. The log keeps its address only.",
  erased: (email) => `${email} is erased.`,
};
