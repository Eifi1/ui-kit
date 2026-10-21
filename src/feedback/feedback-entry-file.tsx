import { useState } from "react";
import { AuthedImage } from "../components/authed-image";
import { toast } from "../components/toast";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { useKitLabels } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { DEFAULT_FEEDBACK_ATTACHMENT_LABELS, DEFAULT_MAX_ATTACHMENT_BYTES } from "./feedback-attachment";
import type { FeedbackNoteAttachment } from "./feedback-inbox";
import { useFeedbackToastLabels } from "./feedback-labels";
import { FeedbackAttachmentDownload, plainFeedbackFetch } from "./feedback-attachment-download";
import { FEEDBACK_ATTACHMENT_ACCEPT, isImageAttachment } from "./feedback-record";
import { DEFAULT_FEEDBACK_DETAIL_LABELS } from "./feedback-row-detail-labels";
import type { FeedbackComposerAttachment } from "./feedback-thread";

/**
 * One file of a conversation entry, and the upload behind an entry's composer
 * (docs/feedback-harmonization.md §12, round 0.47; keksdose run 82 R1, live #447).
 *
 * - {@link FeedbackEntryFile}: a picture drawn INLINE — a thumbnail fetched through the
 *   app's authenticated GET, a tap opens it full size in a tab — and any other file a
 *   download button, as the row detail's Attachment section draws them. The reply
 *   timeline, the rework entries and the comment thread all draw their file with it.
 * - {@link useFeedbackEntryUpload}: the rework note's one-file field (paste from the
 *   clipboard, capture, pick; the contract's types and 10 MB, §3.5) for a
 *   {@link ChatComposer}, and the upload that runs FIRST on send, so an entry never names
 *   a file that did not arrive.
 */

export interface FeedbackEntryFileProps {
  /** The entry's `attachment_url` — `/api/v1/feedback/attachments/<key>`. */
  url: string;
  /** The app's authenticated GET (`AuthedImage`'s): the attachment route wants the
   *  bearer token (§3.5). Left out, the browser's own fetch with same-origin cookies. */
  fetcher?: AuthedFetcher | null;
  className?: string;
}

/**
 * An entry's one file (§12): a picture (`png`, `jpg`, `webp`, `gif` — by the key's
 * extension, which the server minted from the sniffed bytes) as an inline thumbnail that
 * opens full size in a new tab (`AuthedImage`'s `link`: the `blob:` URL, never the API
 * path); anything else a download button. A picture that will not load falls back to the
 * download button, so a broken file still says it is there. `alt`:
 * `feedbackDetail.attachment`.
 */
export function FeedbackEntryFile({ url, fetcher, className }: FeedbackEntryFileProps) {
  const labels = useKitLabels("feedbackDetail", DEFAULT_FEEDBACK_DETAIL_LABELS);
  const fetchFile = fetcher ?? plainFeedbackFetch;
  return (
    <span className={cn("inline-block min-w-0 max-w-full", className)} data-feedback-entry-file={url}>
      {isImageAttachment(url) ? (
        <AuthedImage
          src={url}
          alt={labels.attachment}
          fetcher={fetchFile}
          link
          stopPropagation
          errorFallback={<FeedbackAttachmentDownload url={url} fetcher={fetchFile} />}
          wrapperClassName="inline-block max-w-full"
          className="max-h-40 max-w-full rounded border border-subtle"
        />
      ) : (
        <FeedbackAttachmentDownload url={url} fetcher={fetchFile} />
      )}
    </span>
  );
}

/* ── The composer's one file ──────────────────────────────────────────────── */

/** `POST /feedback/attachments` — the file, answered with its URL. */
export type FeedbackEntryUpload = (file: File) => Promise<string>;

export interface FeedbackEntryUploadOptions {
  /** The upload. Left out, the composer is text only. */
  onUpload?: FeedbackEntryUpload;
  /** The "Capture screenshot" button — the kit's `captureAppScreenshot` or the app's
   *  own. A rejection toasts `feedbackToast.captureFailed` and adds nothing. */
  onCaptureScreenshot?: () => Promise<File | null>;
  /** Over the field's defaults: the contract's types and 10 MB (§3.5), the
   *  `feedbackToast` refusals. The same object the rework section takes. */
  attachment?: Partial<FeedbackNoteAttachment>;
}

export interface FeedbackEntryUploadState {
  /** For {@link ChatComposer}'s `attachment`; `undefined` without `onUpload`. */
  composerAttachment: FeedbackComposerAttachment | undefined;
  /** Upload the picked file, if any: its URL, `undefined` for none. Rejects after a
   *  toast (`feedbackAttachment.attachmentUploadFailed`) when the upload fails — the
   *  send then stops and the composer keeps the draft and the file. */
  upload: (file: File | null) => Promise<string | undefined>;
  /** An upload is running — add it to the composer's `pending`. */
  uploading: boolean;
}

/**
 * The rework note's file field for a reply or a comment composer (§12): one file, added,
 * captured or pasted from the clipboard into the box, the contract's types and 10 MB; and
 * the upload, awaited before the entry is sent.
 */
export function useFeedbackEntryUpload({
  onUpload,
  onCaptureScreenshot,
  attachment,
}: FeedbackEntryUploadOptions): FeedbackEntryUploadState {
  const toasts = useFeedbackToastLabels();
  const fieldLabels = useKitLabels("feedbackAttachment", DEFAULT_FEEDBACK_ATTACHMENT_LABELS);
  const [uploading, setUploading] = useState(false);

  const capture = onCaptureScreenshot
    ? async () => {
        try {
          return await onCaptureScreenshot();
        } catch {
          toast.error(toasts.captureFailed);
          return null;
        }
      }
    : undefined;

  const composerAttachment: FeedbackComposerAttachment | undefined = onUpload
    ? {
        accept: FEEDBACK_ATTACHMENT_ACCEPT,
        maxBytes: DEFAULT_MAX_ATTACHMENT_BYTES,
        onError: (kind) => {
          toast.error(kind === "type" ? toasts.attachmentUnsupported : toasts.attachmentTooLarge);
        },
        onCaptureScreenshot: capture,
        buttonVariant: "ghost",
        buttonSize: "sm",
        ...attachment,
      }
    : undefined;

  const upload = async (file: File | null) => {
    if (!file || !onUpload) return undefined;
    setUploading(true);
    try {
      return await onUpload(file);
    } catch (error) {
      const failed = fieldLabels.attachmentUploadFailed ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentUploadFailed!;
      toast.error(failed(file.name));
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { composerAttachment, upload, uploading };
}
