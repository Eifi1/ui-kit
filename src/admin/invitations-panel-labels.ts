// The English words of ./invitations-panel, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./invitations-panel re-exports them.

import type { InvitationsLabels } from "./invitations-panel";

export const DEFAULT_INVITATIONS_LABELS: InvitationsLabels = {
  email: "Email address",
  invalidEmail: "Enter a complete email address.",
  role: "Role",
  scope: "Scope",
  scopeNone: "None",
  language: "Language of the invitation",
  note: "Note",
  invite: "Invite",
  listTitle: "Invitations",
  empty: "Nobody has been invited yet.",
  loading: "Loading…",
  status: { open: "Open", accepted: "Accepted", expired: "Expired", revoked: "Revoked" },
  sent: (date) => `Sent ${date}`,
  expires: (date) => `Expires ${date}`,
  invitedBy: (name) => `by ${name}`,
  resend: (email) => `Send ${email} a new link`,
  copyLink: "Copy invitation link",
  revoke: (email) => `Revoke the invitation for ${email}`,
  consoleHint:
    "Mail isn’t sent on this server — it is written to the server log. Copy each invitation link from here and pass it on yourself: it is shown only once.",
  linkReady: (email) => `The invitation link for ${email}, shown only this once:`,
  notSent: (email) => `${email} is invited, but the mail couldn’t be sent. Resend it.`,
  failed: "That didn’t work. Please try again.",
};
