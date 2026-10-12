// The English words of ./accept-invitation, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./accept-invitation re-exports them.

import type { AcceptInvitationLabels } from "./accept-invitation";

export const DEFAULT_ACCEPT_INVITATION_LABELS: AcceptInvitationLabels = {
  title: "Accept invitation",
  accepting: "Joining…",
  accepted: "Invitation accepted.",
  joined: (name) => `You’ve joined ${name}.`,
  continue: "Continue",
  invalid: "Could not join with this link",
  expired: "This invitation has expired",
  noToken: "This link is missing its invite token.",
  askAgain: "Ask the person who invited you to send a new invitation.",
  signInFirst: "Sign in to accept this invitation",
  signInHint: "Use the account the invitation was sent to.",
  signIn: "Sign in",
  register: "Create account",
};
