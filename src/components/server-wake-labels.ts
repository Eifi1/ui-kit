// The English words of ./server-wake, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./server-wake re-exports them.

import type { ServerWakeLabels } from "./server-wake";

export const DEFAULT_SERVER_WAKE_LABELS: ServerWakeLabels = {
  slow: "Still loading — this is taking longer than usual.",
  waking: (appName) =>
    `The server goes to sleep when nobody is using ${appName ?? "the app"}, so the first request after a break has to start it again. That can take a moment — nothing is lost, the page fills in by itself.`,
};
