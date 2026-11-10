// The English words of ./feedback-table, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./feedback-table re-exports them.

import type { FeedbackPageLabels } from "./feedback-table";

export const DEFAULT_FEEDBACK_PAGE_LABELS: FeedbackPageLabels = {
  title: "Feedback inbox",
  myTitle: "My feedback",
  columnId: "#",
  columnDate: "Date",
  columnCategory: "Category",
  columnSubject: "Subject",
  columnUser: "User",
  columnEmail: "Email",
  columnUrl: "URL",
  columnStatus: "Status",
  columnResolved: "Resolved",
  openPage: "Open page",
  empty: "None",
  deletedUser: "<deleted user>",
  userFallback: (id) => `user #${id}`,
  environment: (environment) => String(environment ?? "").toUpperCase(),
  reworkChip: (count) => (count === 1 ? "Rework" : `Rework ×${count}`),
  awaitingFilter: "Only what is waiting for you",
  phoneActions: "Feedback actions",
  bulkStatus: "Set status",
  bulkCategory: "Set category",
  bulkVisibility: "Visibility",
  bulkPublicOn: "Visible to others",
  bulkPublicOff: "Not visible to others",
  bulkChanged: (count, value) => (count === 1 ? `Set 1 report to “${value}”` : `Set ${count} reports to “${value}”`),
  bulkFailed: (count) =>
    count === 1
      ? "1 report could not be changed and stays selected."
      : `${count} reports could not be changed and stay selected.`,
  bulkRestored: (count) => (count === 1 ? "1 report is back as it was" : `${count} reports are back as they were`),
  bulkRestoreFailed: (count) =>
    count === 1 ? "1 report could not be put back." : `${count} reports could not be put back.`,
  focusIds: (count) => (count === 1 ? "Only this report" : `Only these ${count} reports`),
};
