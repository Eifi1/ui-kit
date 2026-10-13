import { toast } from "../components/toast";
import { captureAppScreenshot } from "./feedback-capture";
import { FeedbackContextBox, feedbackContext, type FeedbackSubmitter } from "./feedback-context";
import { FeedbackDialog, type FeedbackMultipleSubmission } from "./feedback-dialog";
import { useFeedbackCategoryLabels, useFeedbackToastLabels } from "./feedback-labels";
import {
  DEFAULT_MAX_ATTACHMENTS,
  FEEDBACK_ATTACHMENT_ACCEPT,
  FEEDBACK_PICKABLE_CATEGORIES,
  type FeedbackContext,
  type FeedbackEnvironment,
} from "./feedback-record";
import type { FeedbackCategory } from "./feedback-vocabulary";

/**
 * The open half of `useFeedbackSubmit`: the dialog it draws, with the context box and
 * everything that only exists while somebody is filing a report.
 *
 * A module of its own so it can load LATE (0.34, MOD-1 of the refactor audit 2026-10).
 * Every app mounts the hook in its top bar; this — the attachment field, the modal, the
 * context box, the capture — was ~11 kB gzip of each app's entry chunk, for a dialog most
 * sessions never open. feedback-submit.tsx reaches it only through a literal relative
 * `import()`, so the library build keeps it a module of its own (`bundle: false`) and an
 * app's bundler makes it a chunk of its own.
 *
 * Internal, and not in the barrel: nothing but that `import()` should reach it. The hook
 * keeps the state — open, category, the URL and whether it goes along, the send in
 * flight — and this draws it.
 */

/** What `useFeedbackSubmit` hands its lazily loaded dialog. */
export interface FeedbackSubmitDialogProps {
  onClose: () => void;
  category: FeedbackCategory;
  onCategoryChange: (category: FeedbackCategory) => void;
  submitting: boolean;
  /** The form, and the `context` built from the same values the box showed. */
  onSubmit: (data: FeedbackMultipleSubmission, context: FeedbackContext) => void | Promise<void>;
  user?: FeedbackSubmitter | null;
  /** `location.href` when the dialog opened. */
  url: string;
  attachUrl: boolean;
  onAttachUrlChange: (attachUrl: boolean) => void;
  environment?: FeedbackEnvironment | (string & {});
  version?: string;
  /** `UseFeedbackSubmitOptions.capture`, as the app passed it. */
  capture?: false | (() => Promise<File | null>);
}

/** `FeedbackDialog` as `useFeedbackSubmit` settles it — see the hook for what it settles. */
export function FeedbackSubmitDialog({
  onClose,
  category,
  onCategoryChange,
  submitting,
  onSubmit,
  user,
  url,
  attachUrl,
  onAttachUrlChange,
  environment,
  version,
  capture,
}: FeedbackSubmitDialogProps) {
  const toastText = useFeedbackToastLabels();
  const categoryLabels = useFeedbackCategoryLabels();

  const onCaptureScreenshot =
    capture === false
      ? undefined
      : async () => {
          try {
            return await (capture ?? (() => captureAppScreenshot()))();
          } catch {
            toast.error(toastText.captureFailed);
            return null;
          }
        };

  return (
    <FeedbackDialog
      open
      onClose={onClose}
      categories={FEEDBACK_PICKABLE_CATEGORIES.map((value) => ({ value, label: categoryLabels[value] }))}
      category={category}
      onCategoryChange={(value) => onCategoryChange(value as FeedbackCategory)}
      submitting={submitting}
      attachments="multiple"
      maxAttachments={DEFAULT_MAX_ATTACHMENTS}
      requireBody={false}
      attachmentAccept={FEEDBACK_ATTACHMENT_ACCEPT}
      onAttachmentError={(kind, info) =>
        toast.error(
          kind === "type"
            ? toastText.attachmentUnsupported
            : kind === "size"
              ? toastText.attachmentTooLarge
              : // More files at once than there was room for: the surplus was dropped, the
                // rest kept. The count is how many fit, as keksdose says it.
                toastText.attachmentTooMany(info.max ?? DEFAULT_MAX_ATTACHMENTS),
        )
      }
      onCaptureScreenshot={onCaptureScreenshot}
      // The context is read off the very values the box below shows (§3.2).
      onSubmit={(data) => onSubmit(data, feedbackContext({ user, attachUrl, url, environment, version }))}
      contextSlot={<FeedbackContextBox user={user} url={url} attachUrl={attachUrl} onAttachUrlChange={onAttachUrlChange} />}
    />
  );
}
