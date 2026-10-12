// The English words of ./sessions-setting, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./sessions-setting re-exports them.

import type { SessionsLabels } from "./sessions-setting";

export const DEFAULT_SESSIONS_LABELS: SessionsLabels = {
  title: "Sessions",
  description: "Signed in on a device you no longer use, or don’t trust? Sign out everywhere.",
  signOutEverywhere: "Sign out everywhere…",
  signOutEverywherePrompt:
    "This ends every session, including this one: you will be signed out on this device too, and sign in again from here.",
  confirmSignOutEverywhere: "Sign out everywhere",
  list: "Where you’re signed in",
  loading: "Loading sessions…",
  empty: "No sessions to show.",
  current: "This device",
  unknownDevice: "Unknown device",
  lastActive: (when) => `Last active ${when}`,
  ip: (address) => `IP ${address}`,
  revoke: "Sign out",
  revokeItem: (device) => `Sign out ${device}`,
  failed: "That didn’t work. Please try again.",
};
