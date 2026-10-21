import { useState } from "react";
import type { MouseEvent } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "../components/button";
import { toast } from "../components/toast";
import type { AuthedFetcher } from "../hooks/use-authed-src";
import { useKitLabels } from "../i18n/kit-labels";
import { filenameFromDisposition, saveBlob } from "../lib/download";
import { attachmentName } from "./feedback-record";
import { DEFAULT_FEEDBACK_DETAIL_LABELS } from "./feedback-row-detail-labels";

// Internal (not in the `./feedback` entry): the row detail's download button and its
// plain fetch, shared since 0.47 with ./feedback-entry-file's inline entry files.

/** The bytes behind a fetcher's answer — a `Blob` as it is, a `Response` checked. */
async function toBlob(answer: Blob | Response): Promise<Blob> {
  if (typeof Response !== "undefined" && answer instanceof Response) {
    if (!answer.ok) throw new Error(`HTTP ${answer.status}`);
    return answer.blob();
  }
  return answer as Blob;
}

/** No fetcher: the browser's own `fetch`, with the cookies a same-origin app uses. */
export const plainFeedbackFetch: AuthedFetcher = (url, { signal }) =>
  fetch(url, { signal, credentials: "same-origin" });

/**
 * A PDF or a text log (keksdose `FeedbackFileDownload`, dev #578): the bytes sit behind
 * an authenticated route that serves them as `attachment`, never inline (§3.5), so a
 * plain link would be a 401 the moment it was opened. Fetched through the app's
 * fetcher and saved with {@link saveBlob}; a failure says so in a toast.
 *
 * Saved under the name the server gives it when the fetcher answers with a `Response`
 * (server-kit's `content_disposition` puts the uploader's own name in `filename*`), and
 * under the URL's last segment — the name on the button — when it answers with a bare
 * `Blob`, which has no headers to ask. Words: `feedbackDetail.download` /
 * `downloadFailed`.
 */
export function FeedbackAttachmentDownload({ url, fetcher }: { url: string; fetcher: AuthedFetcher }) {
  const labels = useKitLabels("feedbackDetail", DEFAULT_FEEDBACK_DETAIL_LABELS);
  const [busy, setBusy] = useState(false);
  const name = attachmentName(url);
  const download = async (event: MouseEvent) => {
    // The row around the detail may toggle on a click.
    event.stopPropagation();
    setBusy(true);
    try {
      const answer = await fetcher(url, { signal: new AbortController().signal });
      const blob = await toBlob(answer);
      const saveAs =
        typeof Response !== "undefined" && answer instanceof Response
          ? filenameFromDisposition(answer.headers.get("Content-Disposition"), name)
          : name;
      saveBlob(blob, saveAs);
    } catch {
      toast.error(labels.downloadFailed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      pending={busy}
      onClick={(event) => void download(event)}
      aria-label={labels.download(name)}
      className="max-w-full"
    >
      <FileText className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 max-w-[14rem] truncate-until-large">{name}</span>
      <Download className="size-3.5 shrink-0" aria-hidden />
    </Button>
  );
}
