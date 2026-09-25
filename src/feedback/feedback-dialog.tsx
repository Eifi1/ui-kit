import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, Input, PHONE_QUERY, Select, Textarea } from "../components/ui";
import { Modal } from "../components/modal";
import { useMediaQuery } from "../hooks/use-media-query";
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_MAX_ATTACHMENT_BYTES,
  FeedbackAttachmentField,
} from "./feedback-attachment";

export interface FeedbackCategoryOption {
  value: string;
  label: string;
}

export interface FeedbackAttachmentLabels {
  /** The heading over the field. Optional: a note editor puts the buttons
   *  straight under its textarea, where a second heading is noise. */
  attachment?: string;
  attachmentAdd: string;
  /** Label for the "capture screenshot" button. Optional — falls back to the provider's
   *  `feedbackAttachment.attachmentCapture`, then English. */
  attachmentCapture?: string;
  /** The line under the attachment buttons saying a screenshot can be pasted
   *  straight in. Optional — falls back to the provider's `feedbackAttachment`, then English. */
  attachmentPaste?: string;
  attachmentRemove: string;
}

export interface FeedbackDialogLabels extends FeedbackAttachmentLabels {
  title: string;
  category: string;
  subject: string;
  body: string;
  attachment: string;
  submitHint: string;
  cancel: string;
  save: string;
}

export interface FeedbackSubmission {
  title: string;
  body: string;
  category: string;
  attachment: File | null;
}

/**
 * The generic feedback form dialog: category + subject + body + an optional image
 * attachment, with Ctrl/Cmd+Enter to submit. Domain-free — the app supplies the
 * category options, labels and an `onSubmit` that talks to its own backend, plus
 * an optional `contextSlot` for app-specific context (user, current URL, …).
 *
 * **A screenshot can be pasted straight in.** Ctrl/Cmd+V anywhere in the dialog
 * takes an image off the clipboard and makes it the attachment, through the same
 * validation and the same preview as the file picker. It is the gesture the two
 * ways in did not cover: `onCaptureScreenshot` snapshots the *whole* app view,
 * and the file picker needs a file — so somebody who wanted to show one panel,
 * or one region of one, had to save a crop to disk first and then find it again
 * (Steering Design feedback #39). The clipboard is where a region snip already
 * is on every platform.
 */
export function FeedbackDialog({
  open,
  onClose,
  categories,
  category,
  onCategoryChange,
  labels,
  onSubmit,
  submitting = false,
  contextSlot,
  attachmentAccept = DEFAULT_ATTACHMENT_ACCEPT,
  maxAttachmentBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
  onAttachmentError,
  onCaptureScreenshot,
}: {
  open: boolean;
  onClose: () => void;
  categories: FeedbackCategoryOption[];
  category: string;
  onCategoryChange: (value: string) => void;
  labels: FeedbackDialogLabels;
  onSubmit: (data: FeedbackSubmission) => void | Promise<void>;
  submitting?: boolean;
  contextSlot?: ReactNode;
  attachmentAccept?: string[];
  maxAttachmentBytes?: number;
  onAttachmentError?: (kind: "type" | "size") => void;
  /**
   * Optional: capture a screenshot of the underlying app view and return it as a
   * File. When provided, a "Capture screenshot" button is shown next to "Add
   * attachment"; the returned file is fed through the same validation + preview.
   */
  onCaptureScreenshot?: () => Promise<File | null>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const isMobile = useMediaQuery(PHONE_QUERY, false);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setAttachment(null);
    }
  }, [open]);

  const canSubmit = !!title && !!body && !submitting;
  const trySubmit = () => {
    if (canSubmit) void onSubmit({ title, body, category, attachment });
  };

  if (!open) return null;

  const categoryField = (
    <Select label={labels.category} value={category} onChange={(e) => onCategoryChange(e.target.value)}>
      {categories.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </Select>
  );
  // On a phone the subject leads as a heading rather than as the second of two
  // identical boxes under a select (Keksdose feedback #179). `variant="display"`
  // is a no-op above the phone breakpoint, so the desktop dialog is unchanged.
  const subjectField = (
    <Input label={labels.subject} value={title} onChange={(e) => setTitle(e.target.value)} variant="display" />
  );
  const bodyField = (
    <Textarea rows={5} label={labels.body} value={body} onChange={(e) => setBody(e.target.value)} />
  );
  const attachmentField = (
    <FeedbackAttachmentField
      value={attachment}
      onChange={setAttachment}
      labels={labels}
      accept={attachmentAccept}
      maxBytes={maxAttachmentBytes}
      onError={onAttachmentError}
      onCaptureScreenshot={onCaptureScreenshot}
      // On `document`, not on the panel: the Modal focuses its own panel on open
      // and traps Tab inside it, so while this dialog is up every paste in the
      // page is meant for it — including the one made with nothing in
      // particular focused, which never reaches a React `onPaste` on a child.
      documentPaste={open}
    />
  );

  return (
    <Modal
      onClose={onClose}
      // The one dialog whose subject is the page behind it (Keksdose dev#460: "Make
      // the feedback dialog draggable so I can see behind it if it blocks
      // something") — you are describing what is under it while you type.
      draggable
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          trySubmit();
        }
      }}
    >
      {/* Also the drag handle: pressing anywhere on the panel's own chrome moves it,
          and the heading is the strip a user reaches for. */}
      <h2 className="mb-3 text-lg font-semibold">{labels.title}</h2>
      <div className="space-y-3">
        {isMobile ? (
          // Phone shape, the same reasoning as the transaction editor's (#177):
          // the desktop order is the DATA MODEL's order — category, then subject,
          // then body — but nobody opens this dialog to pick a category. What they
          // came to do is say the thing, so that leads; the classification and the
          // evidence follow, a tier down.
          <>
            {subjectField}
            {bodyField}
            <div className="space-y-3 border-t border-[var(--border)] pt-3">
              {categoryField}
              {attachmentField}
              {contextSlot}
            </div>
          </>
        ) : (
          <>
            {categoryField}
            {subjectField}
            {bodyField}
            {attachmentField}
            {contextSlot}
          </>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-[var(--text-placeholder)]">{labels.submitHint}</div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {labels.cancel}
            </Button>
            <Button onClick={trySubmit} disabled={!canSubmit}>
              {labels.save}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
