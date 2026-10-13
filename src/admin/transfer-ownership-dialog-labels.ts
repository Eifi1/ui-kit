// The English words of ./transfer-ownership-dialog, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./transfer-ownership-dialog
// re-exports them.

import type { TransferOwnershipLabels } from "./transfer-ownership-dialog";

export const DEFAULT_TRANSFER_OWNERSHIP_LABELS: TransferOwnershipLabels = {
  title: (name) => `Hand on ${name}’s work`,
  body: "Everything this account owns moves to the account you choose, in one step.",
  recipient: "Hand it to",
  choose: "Choose an account…",
  chooseFirst: "Choose who receives the work",
  confirm: "Hand it on",
  customer: "a customer",
  deactivated: "deactivated",
  self: "the same account",
  unavailable: (account, reason) => `${account} (${reason})`,
  noCandidates: "No other account can receive it.",
};
