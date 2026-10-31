// The English words of ./field-sync, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./field-sync re-exports them.

import type { FieldSyncLabels } from "./field-sync";

/** @deprecated 0.52 — none: no app uses the FieldSync family (MOD-5); removed in 0.53. */
export const DEFAULT_FIELD_SYNC_LABELS: FieldSyncLabels = {
  synced: "Saved",
  edited: "Unsaved changes",
  pending: "Saving…",
  error: "Could not save",
  retry: "Retry",
};
