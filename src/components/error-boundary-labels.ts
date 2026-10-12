// The English words of ./error-boundary, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./error-boundary re-exports them.

import type { ErrorBoundaryLabels } from "./error-boundary";

export const DEFAULT_ERROR_BOUNDARY_LABELS: ErrorBoundaryLabels = {
  title: "Something went wrong",
  message: "This part of the page could not be shown. Try again, or reload the page.",
  retry: "Try again",
  details: "Error details",
  reload: "Reload",
  updateTitle: "A new version is available",
  updateMessage: "Part of the app has changed since this page was loaded. Reload to get the new version.",
  offlineTitle: "You’re offline",
  offlineMessage: "This page could not be loaded without a connection. Reconnect, then reload the page.",
  copyReport: "Copy error report",
  reported: "This error has been reported automatically.",
  reportedAs: (reference) => `Reported as ${reference}`,
};
