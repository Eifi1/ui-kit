import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Input, PHONE_QUERY, Select, Textarea } from "../components/ui";
import type { ButtonSize, ButtonVariant } from "../components/ui";
import { Modal } from "../components/modal";
import { useMediaQuery } from "../hooks/use-media-query";
import { useKitLabels } from "../i18n/kit-labels";
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_FEEDBACK_ATTACHMENT_LABELS,
  DEFAULT_MAX_ATTACHMENT_BYTES,
  FeedbackAttachmentField,
  type FeedbackAttachmentError,
  type FeedbackAttachmentErrorInfo,
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
  /** `multiple` mode (0.15.5): the chip list's accessible name — and, in
   *  `<FeedbackDialog attachments="multiple">`, the heading over it (0.16.0). Optional,
   *  as are the keys below — they fall back to the provider's `feedbackAttachment`,
   *  then English. */
  attachmentList?: string;
  /** `multiple` mode (0.16.0): the screenshot slot's chip title, in place of its file name. */
  attachmentScreenshot?: string;
  /** `multiple` mode: one chip's remove button, given the file's name. */
  attachmentRemoveFile?: (name: string) => string;
  /** `multiple` mode: the line shown once `max` files are attached. */
  attachmentLimit?: (max: number) => string;
  /** `refs` mode (0.22.0): the second line of a chip whose upload is still running. */
  attachmentUploading?: string;
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
  /** @deprecated since 0.16.0 — use `attachmentList`, the one key for the heading and
   *  the chip list it names. Still honoured: set, it wins over the provider's
   *  `attachmentList` (but not over an `attachmentList` passed beside it). */
  attachments?: string;
}

/**
 * The dialog's own strings — the `feedbackDialog` namespace of `<UiKitProvider
 * labels>` (0.12.0). The attachment keys are not repeated here: they are the
 * `feedbackAttachment` namespace's, which the field inside already reads.
 *
 * Before, every key was required at the call site, so each app restated ten strings
 * wherever it mounted the dialog (kastlan feedback-button.tsx built the object inline).
 */
export interface FeedbackDialogTextLabels {
  title: string;
  category: string;
  subject: string;
  body: string;
  /** The body's label when `requireBody={false}`: "What happened? (optional)".
   *  Optional, so a complete `UiKitLabels` typed before 0.14.2 still compiles. */
  bodyOptional?: string;
  /** The heading over the attachment buttons. */
  attachment: string;
  /** The line beside the buttons naming the shortcut. */
  submitHint: string;
  cancel: string;
  save: string;
  /** @deprecated since 0.16.0 — use `feedbackAttachment.attachmentList`. It and this
   *  key were two names for one heading ("Attachments" over the chips that list names
   *  "Attachments"), and a catalogue that translated one left the other English. Still
   *  honoured when set: it wins over `feedbackAttachment.attachmentList`. */
  attachments?: string;
}

/**
 * English. Already the feedback contract's wording (docs/feedback-harmonization.md §4.2,
 * 0.27.0) — "Send", not keksdose's "Save", and the body asks "What happened?" — except
 * `attachment`, the single-mode heading, which said "Screenshot" over a button that now
 * says "Add attachment" and a picker that may offer a PDF: since 0.27.0 it is keksdose's
 * `feedback.attachment`, **"Attachment"**. The `attachments="multiple"` heading is
 * `feedbackAttachment.attachmentList` ("Attachments") and did not change.
 */
export const DEFAULT_FEEDBACK_DIALOG_LABELS: FeedbackDialogTextLabels = {
  title: "Send feedback",
  category: "Category",
  subject: "Subject",
  body: "What happened?",
  bodyOptional: "What happened? (optional)",
  attachment: "Attachment",
  // No `attachments`: the multiple-mode heading is `feedbackAttachment.attachmentList`,
  // and a default here would shadow a provider that translated only that one.
  submitHint: "Ctrl/⌘ + Enter to send",
  cancel: "Cancel",
  save: "Send",
};

export interface FeedbackSubmission {
  title: string;
  body: string;
  category: string;
  attachment: File | null;
}

/**
 * What `onSubmit` gets under `attachments="multiple"` (0.15.5): the screenshot and
 * the picked/pasted files apart, because an app files them differently — keksdose
 * attaches the screenshot to the report and the photos as its evidence list. No
 * `attachment`: there is no one file it could name.
 */
export interface FeedbackMultipleSubmission {
  title: string;
  body: string;
  category: string;
  /** What `onCaptureScreenshot` returned, or `null` — at most one. */
  screenshot: File | null;
  /** Picked and pasted files, in the order they were added; at most `maxAttachments`. */
  attachments: File[];
}

interface FeedbackDialogBaseProps {
  open: boolean;
  onClose: () => void;
  categories: FeedbackCategoryOption[];
  category: string;
  onCategoryChange: (value: string) => void;
  /** Prop > `<UiKitProvider labels={{ feedbackDialog, feedbackAttachment }}>` >
   *  English. Optional since 0.12.0; a whole `FeedbackDialogLabels` still fits. */
  labels?: Partial<FeedbackDialogLabels>;
  submitting?: boolean;
  contextSlot?: ReactNode;
  attachmentAccept?: string[];
  maxAttachmentBytes?: number;
  /**
   * Optional: capture a screenshot of the underlying app view and return it as a
   * File. When provided, a "Capture screenshot" button is shown next to "Add
   * attachment"; the returned file is fed through the same validation + preview.
   */
  onCaptureScreenshot?: () => Promise<File | null>;
  /**
   * `false`: a report with only a subject can be sent, and the body's label says it is
   * optional (`bodyOptional`, unless `labels.body` is passed). Default `true`, the
   * dialog's behaviour until 0.14.2 (keksdose K1: its backend takes title-only reports).
   */
  requireBody?: boolean;
  /**
   * The attachment field's add and capture buttons: its `buttonVariant` (0.25.0),
   * Button's own `variant`. Default `"secondary"`, the look they always had.
   *
   * The field took `buttonVariant` / `buttonSize` in 0.24.0 (keksdose's support chat),
   * but the dialog builds its field itself and passed neither, so a host that wanted
   * quieter buttons here — a dialog that already ends in a row of Cancel / Send — had
   * no way to say so short of rebuilding the dialog. Named after the dialog's other
   * attachment options (`attachmentAccept`, `onAttachmentError`) and handed through
   * unchanged, in both `attachments` modes.
   */
  attachmentButtonVariant?: ButtonVariant;
  /** The attachment field's `buttonSize` (0.25.0) — with {@link attachmentButtonVariant}.
   *  Default `"md"`; `"sm"` draws the paperclip and camera at 14px. */
  attachmentButtonSize?: ButtonSize;
}

/** One attachment — a screenshot, a picked or a pasted image; a second replaces
 *  nothing, it has to wait for the first to be removed. The default. */
export interface FeedbackDialogSingleProps extends FeedbackDialogBaseProps {
  attachments?: "single";
  onSubmit: (data: FeedbackSubmission) => void | Promise<void>;
  /** `info` (0.23.0) names the refused file and the limit — see
   *  {@link FeedbackAttachmentErrorInfo}. */
  onAttachmentError?: (kind: "type" | "size", info: FeedbackAttachmentErrorInfo) => void;
  /** Multiple mode only — refused here rather than silently ignored. */
  maxAttachments?: never;
}

/**
 * One screenshot plus up to `maxAttachments` picked or pasted files (0.15.5, keksdose
 * dev#578: "pasted two photos, the second overwrote the first"). The capture button is
 * offered while there is no screenshot yet; the add button while there is room.
 */
export interface FeedbackDialogMultipleProps extends FeedbackDialogBaseProps {
  attachments: "multiple";
  /** Default `DEFAULT_MAX_ATTACHMENTS` (5). The screenshot does not count. */
  maxAttachments?: number;
  onSubmit: (data: FeedbackMultipleSubmission) => void | Promise<void>;
  /** `"count"`: more files arrived at once than there was room for; the surplus was
   *  dropped. `info` (0.23.0) names the refused file(s) and the limit. */
  onAttachmentError?: (kind: FeedbackAttachmentError, info: FeedbackAttachmentErrorInfo) => void;
}

export type FeedbackDialogProps = FeedbackDialogSingleProps | FeedbackDialogMultipleProps;

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
 *
 * **`attachments="multiple"`** (0.15.5) takes several: every paste and pick adds a
 * chip, and `onSubmit` gets `{ screenshot, attachments }` ({@link
 * FeedbackMultipleSubmission}) instead of `attachment`. Opt-in, so a caller typed
 * against the one-file submission keeps compiling and behaving as before.
 */
export function FeedbackDialog(props: FeedbackDialogProps) {
  const {
    open,
    onClose,
    categories,
    category,
    onCategoryChange,
    labels: labelsProp,
    submitting = false,
    contextSlot,
    attachmentAccept = DEFAULT_ATTACHMENT_ACCEPT,
    maxAttachmentBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
    onCaptureScreenshot,
    requireBody = true,
    attachmentButtonVariant,
    attachmentButtonSize,
  } = props;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  // `attachments="multiple"` only: the capture, apart from the picked/pasted files.
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const isMobile = useMediaQuery(PHONE_QUERY, false);
  const labels = useKitLabels("feedbackDialog", DEFAULT_FEEDBACK_DIALOG_LABELS, labelsProp);
  const attachmentText = useKitLabels("feedbackAttachment", DEFAULT_FEEDBACK_ATTACHMENT_LABELS, labelsProp);
  // Under `multiple` the heading is `attachmentList` — a screenshot AND photos — which
  // also names the chip list beneath it: one string, so the two cannot disagree. The
  // deprecated `feedbackDialog.attachments` (prop or provider) still wins over the
  // provider's `attachmentList`, as it did before 0.16.0; an `attachmentList` prop wins
  // over both.
  const listHeading =
    labelsProp?.attachmentList ??
    labels.attachments ??
    attachmentText.attachmentList ??
    DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentList!;
  // The attachment field resolves its own keys from `feedbackAttachment`; it gets the
  // prop's (so a caller's `attachmentAdd` still wins) plus the resolved heading.
  const attachmentLabels =
    props.attachments === "multiple"
      ? { ...labelsProp, attachment: listHeading, attachmentList: listHeading }
      : { ...labelsProp, attachment: labels.attachment };

  // Reset the form whenever the dialog is (re)opened — during render, on the
  // closed-to-open transition, so the old draft never paints for a frame.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle("");
      setBody("");
      setAttachment(null);
      setScreenshot(null);
      setFiles([]);
    }
  }

  // Trimmed: a subject or body of spaces is empty (keksdose's API answers a blank title
  // with a 422, and a blank report is no report).
  const canSubmit = !!title.trim() && (!requireBody || !!body.trim()) && !submitting;
  const trySubmit = () => {
    if (!canSubmit) return;
    if (props.attachments === "multiple") {
      void props.onSubmit({ title, body, category, screenshot, attachments: files });
    } else {
      void props.onSubmit({ title, body, category, attachment });
    }
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
    <Textarea
      rows={5}
      label={requireBody ? labels.body : (labelsProp?.body ?? labels.bodyOptional ?? labels.body)}
      value={body}
      onChange={(e) => setBody(e.target.value)}
    />
  );
  const fieldProps = {
    labels: attachmentLabels,
    accept: attachmentAccept,
    maxBytes: maxAttachmentBytes,
    onCaptureScreenshot,
    // Left undefined they are the field's own defaults (secondary / md).
    buttonVariant: attachmentButtonVariant,
    buttonSize: attachmentButtonSize,
    // On `document`, not on the panel: the Modal focuses its own panel on open
    // and traps Tab inside it, so while this dialog is up every paste in the
    // page is meant for it — including the one made with nothing in
    // particular focused, which never reaches a React `onPaste` on a child.
    documentPaste: open,
  };
  const attachmentField =
    props.attachments === "multiple" ? (
      <FeedbackAttachmentField
        {...fieldProps}
        multiple
        value={files}
        onChange={setFiles}
        max={props.maxAttachments}
        // The capture goes to its own slot, so it is offered once and never crowds
        // out a photo; a paste is a photo (a region snip is chosen evidence, not "the
        // screenshot").
        screenshot={screenshot}
        onScreenshotChange={setScreenshot}
        onError={props.onAttachmentError}
      />
    ) : (
      <FeedbackAttachmentField
        {...fieldProps}
        value={attachment}
        onChange={setAttachment}
        onError={props.onAttachmentError}
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
