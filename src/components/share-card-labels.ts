// The English words of ./share-card, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./share-card re-exports them.

import type { ShareCardLabels } from "./share-card";

export const DEFAULT_SHARE_CARD_LABELS: ShareCardLabels = {
  dialogTitle: "Share",
  close: "Close",
  email: "Email address",
  emailOptional: "Email address (optional)",
  emailPlaceholder: "name@example.com",
  invalidEmail: "Enter a complete email address.",
  role: "Role",
  roleOf: (name) => `Role of ${name}`,
  add: "Share",
  whoHasAccess: "Who has access",
  nobodyYet: "Nobody else has access yet.",
  pending: "Pending",
  openInvite: "Open invite link",
  copyLink: "Copy link",
  team: "Team",
  teamHint: (name) => `Everyone in ${name} gets access.`,
  remove: "Remove access",
  removeConfirm: (name) => `Remove access for ${name}?`,
  revokePending: "Withdraw invitation",
  revokePendingConfirm: (name) => `Withdraw the invitation for ${name}?`,
  failed: "That did not work. Please try again.",
  loading: "Loading…",
};
