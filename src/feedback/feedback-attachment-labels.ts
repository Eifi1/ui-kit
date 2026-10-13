// The English words of ./feedback-attachment, in a module with no component code: the
// English catalogue (src/i18n/defaults.ts) imports them without the component, so `en`
// loads as one chunk like the other languages (0.34, KS U8). ./feedback-attachment
// re-exports them.

import type { FeedbackAttachmentFieldLabels } from "./feedback-attachment";

/**
 * English, in the feedback contract's wording since 0.27.0 (docs/feedback-harmonization.md
 * §4.2: keksdose's `feedback.*` keys are the canon, and the kit owns them now). Three
 * strings moved with it:
 *
 * - `attachmentAdd` "Attach image" → **"Add attachment"**: the field takes a PDF or a text
 *   log as well wherever the app passes `FEEDBACK_ATTACHMENT_ACCEPT` (keksdose feedback
 *   #87), and a button that says "image" over a picker that offers a PDF is wrong in one
 *   of the two places.
 * - `attachmentPaste` → keksdose's longer line, which says WHY one would paste — a region
 *   snip shows one corner rather than the whole page (Steering Design feedback #39).
 * - `attachmentLimit` for one: "remove **it**", as keksdose's `attachments_full_one`;
 *   "remove one" of a single file read oddly.
 */
export const DEFAULT_FEEDBACK_ATTACHMENT_LABELS: FeedbackAttachmentFieldLabels = {
  attachmentAdd: "Add attachment",
  attachmentCapture: "Capture screenshot",
  attachmentPaste: "…or paste a screenshot straight from the clipboard, so you can show one corner rather than the whole page.",
  attachmentRemove: "Remove attachment",
  attachmentList: "Attachments",
  attachmentScreenshot: "Screenshot",
  attachmentRemoveFile: (name) => `Remove ${name}`,
  attachmentLimit: (max) =>
    max === 1
      ? "Up to 1 attachment — remove it to add another."
      : `Up to ${max} attachments — remove one to add another.`,
  attachmentUploading: "Uploading…",
  attachmentUploadFailed: (name) => `“${name}” could not be uploaded`,
};
