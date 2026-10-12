// The English words of ./feedback-dialog, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./feedback-dialog re-exports them.

import type { FeedbackDialogTextLabels } from "./feedback-dialog";

/**
 * English. The feedback contract's wording (docs/feedback-harmonization.md §4.2, 0.27.0):
 * "Send", not keksdose's "Save", and the body asks "What happened?" (Marcel's two calls);
 * the rest is keksdose's. Since 0.27.0 `attachment`, the single-mode heading, is keksdose's
 * `feedback.attachment` **"Attachment"** (it said "Screenshot" over a button that says "Add
 * attachment" and a picker that may offer a PDF), and `submitHint` is keksdose's
 * **"Ctrl+Enter to send"** — "⌘ Enter to send" on Apple platforms, where the old
 * "Ctrl/⌘ + Enter" made every reader parse both. The `attachments="multiple"` heading is
 * `feedbackAttachment.attachmentList` ("Attachments") and did not change.
 */
export const DEFAULT_FEEDBACK_DIALOG_LABELS: FeedbackDialogTextLabels = {
  title: "Send feedback",
  category: "Category",
  subject: "Subject",
  body: "What happened?",
  bodyOptional: "What happened? (optional)",
  attachment: "Attachment",
  // The modifier as `form.submitShortcut` writes it: "⌘ Enter" on Apple, "Ctrl+Enter" elsewhere.
  submitHint: (apple) => (apple ? "⌘ Enter to send" : "Ctrl+Enter to send"),
  cancel: "Cancel",
  save: "Send",
};
