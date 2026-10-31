// The English words of ./feedback-row-detail, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./feedback-row-detail
// re-exports them.

import type { FeedbackDetailLabels } from "./feedback-row-detail";

export const DEFAULT_FEEDBACK_DETAIL_LABELS: FeedbackDetailLabels = {
  subject: "Subject",
  body: "Description",
  edit: "Edit",
  editDescription: "Edit description",
  save: "Save",
  cancel: "Cancel",
  url: "URL",
  copyUrl: "Copy URL",
  attachment: "Attachment",
  download: (name) => `Download ${name}`,
  downloadFailed: "The attachment could not be downloaded.",
  outcome: "Outcome",
  replies: "Replies",
  resolvedAt: (date) => `Resolved: ${date}`,
  // The outcome editor's three words, read by nothing since 0.38 and "kept for one
  // release" for 13 minors: no tag, so the deprecations test never listed them (refactor
  // audit 2026-10-30, DOC-9). Deprecated on `FeedbackDetailLabels`, the type an app reads
  // them through — a tag on these keys reached no reader (0.52 code review). The keys
  // leave the type and all seven catalogues in 0.53.
  outcomeAdd: "Add outcome",
  outcomeUpdate: "Update",
  outcomePlaceholder: "What was done, decided, or why this won't be addressed.",
  rework: "Rework",
  reworkTitle: "Send for rework",
  reworkSend: "Send rework",
  reworkPlaceholder: "What still needs refinement? Any new constraints or change of direction.",
  reworkUploadFailed: "The file could not be uploaded. The rework was not sent.",
  status: "Status",
  note: "Note",
};
