import { useEffect, useRef, useState, type RefObject } from "react";
import { Camera, FileText, Paperclip, X } from "lucide-react";
import { Button } from "../components/ui";
import type { FeedbackAttachmentLabels } from "./feedback-dialog";

export const DEFAULT_ATTACHMENT_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * Picking one picture: the file dialog, a capture of the app view, or a paste.
 *
 * Lifted out of {@link FeedbackDialog} so the *reply* half of the feature can
 * have it too (Steering Design feedback #128). A report is a conversation — it
 * is filed, it is answered, and the reporter sends it back saying that is not
 * what they meant — and the screenshot showing what they mean is taken at
 * whichever of those points they looked. Only the first of them had a way to
 * attach one, so everything after it had to be described in words.
 *
 * **Three ways in, and they are three because no one of them covers the others.**
 * The file dialog needs a file on disk; `onCaptureScreenshot` snapshots the
 * *whole* app view; and the clipboard is where a region snip already is on every
 * platform (Steering Design feedback #39). Somebody who wanted to show one panel
 * had to save a crop and then find it again.
 *
 * `documentPaste` and `pasteFrom` decide where the paste is listened for, and
 * it is a real choice rather than a flag with a default. A modal traps focus,
 * so while it is up every paste in the page is meant for it — including one
 * made with nothing in particular focused, which never reaches a React
 * `onPaste` on a child: that is `documentPaste`. An editor **inline on a
 * page** is not that: the page around it has its own fields, so it listens
 * within its own subtree and a paste elsewhere stays where it was aimed. But
 * "its own subtree" has to include the text box the paste is actually made in,
 * and that box is this field's *sibling*, not its child — a paste in it bubbles
 * to their common parent and never through here. `pasteFrom` is that parent
 * (Steering Design feedback #140): the element whose subtree is listened to,
 * handed in by whoever renders both the box and this field side by side.
 */
export function FeedbackAttachmentField({
  value,
  onChange,
  labels,
  accept = DEFAULT_ATTACHMENT_ACCEPT,
  maxBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
  onError,
  onCaptureScreenshot,
  documentPaste = false,
  pasteFrom,
  className,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  labels: FeedbackAttachmentLabels;
  accept?: string[];
  maxBytes?: number;
  onError?: (kind: "type" | "size") => void;
  /** Snapshot the app view behind this and return it as a File. A "Capture
   *  screenshot" button appears only when it is given. */
  onCaptureScreenshot?: () => Promise<File | null>;
  /** Listen for the paste on `document` rather than on this field's own
   *  subtree. For a modal, which owns the whole page while it is up. */
  documentPaste?: boolean;
  /** Listen for the paste within this element's subtree rather than this
   *  field's own — for a field standing *beside* the text box a paste is made
   *  in, whose common parent is where the event bubbles to. Ignored when
   *  `documentPaste` is set. */
  pasteFrom?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object-URL preview lifecycle (create on change, revoke on cleanup).
  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (file: File | undefined | null) => {
    if (!file) return;
    if (!accept.includes(file.type)) {
      onError?.("type");
      return;
    }
    if (file.size > maxBytes) {
      onError?.("size");
      return;
    }
    onChange(file);
  };

  // The paste handler is registered once rather than per render, so it reads
  // `pick` — which closes over props that change identity on every render — out
  // of a ref rather than out of its own dependency list.
  const latest = useRef(pick);
  useEffect(() => {
    latest.current = pick;
  });

  const takeImage = (clipboard: DataTransfer | null, stop: () => void) => {
    const items = Array.from(clipboard?.items ?? []);
    const image = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
    const file = image?.getAsFile();
    if (!file) return;
    // Only once there IS an image: a paste of text into a field must stay a
    // paste of text, and a clipboard holding both is a copy whose text half is
    // what the field was focused for.
    stop();
    // Clipboard images arrive named "image.png" at best and unnamed at worst,
    // and the name is what the inbox shows beside the thumbnail. A name that
    // says where it came from is more use than the browser's.
    latest.current(new File([file], pastedName(file.type), { type: file.type }));
  };

  // The element listened on, where it is not this field's own subtree: the
  // document for a modal, the given parent for an inline editor. Read inside
  // the effect rather than in render, because a ref's `current` is only set
  // once the parent has mounted — which it has by the time effects run.
  useEffect(() => {
    const target: EventTarget | null = documentPaste ? document : (pasteFrom?.current ?? null);
    if (!target) return;
    const onPaste = (event: Event) => {
      const clipboard = (event as ClipboardEvent).clipboardData;
      takeImage(clipboard, () => event.preventDefault());
    };
    target.addEventListener("paste", onPaste);
    return () => target.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- takeImage reads `latest`, which is a ref
  }, [documentPaste, pasteFrom]);
  const listensElsewhere = documentPaste || pasteFrom !== undefined;

  return (
    <div
      className={className}
      onPaste={
        listensElsewhere
          ? undefined
          : (event) => takeImage(event.clipboardData, () => event.preventDefault())
      }
    >
      {labels.attachment && (
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {labels.attachment}
        </div>
      )}
      {value ? (
        <div className="flex items-start gap-2">
          {value.type.startsWith("image/") && preview ? (
            <img
              src={preview}
              alt={value.name}
              className="h-20 w-20 rounded border border-slate-200 object-cover dark:border-slate-700"
            />
          ) : (
            // Non-image attachments (PDF, text) can't preview as an <img>, so
            // show a neutral file tile with the name/size beside it instead.
            <div className="flex h-20 w-20 items-center justify-center rounded border border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500">
              <FileText className="size-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-slate-700 dark:text-slate-200">{value.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {Math.round(value.size / 1024)} KB
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={labels.attachmentRemove}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-4" /> {labels.attachmentAdd}
            </Button>
            {onCaptureScreenshot && (
              <Button
                type="button"
                variant="secondary"
                disabled={capturing}
                onClick={() => {
                  if (capturing) return;
                  setCapturing(true);
                  void onCaptureScreenshot()
                    .then((file) => {
                      if (file) pick(file);
                    })
                    .finally(() => setCapturing(false));
                }}
              >
                <Camera className="size-4" />{" "}
                {capturing ? "…" : (labels.attachmentCapture ?? "Capture screenshot")}
              </Button>
            )}
          </div>
          {/* Said out loud, because a gesture with no affordance is a gesture
              nobody finds. */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {labels.attachmentPaste ?? "…or paste a screenshot from the clipboard."}
          </p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** What a pasted image is called once it is an attachment.
 *
 *  The extension is read off the mime type rather than assumed to be `.png`:
 *  Safari puts TIFF on the clipboard and a file called `pasted.png` that is not
 *  a PNG is one the receiving end opens wrong. */
export function pastedName(type: string): string {
  const subtype = type.split("/")[1] ?? "png";
  // `image/svg+xml` and friends carry a suffix that is not part of the
  // extension, and none of them are in the accepted list anyway.
  return `pasted.${subtype.split("+")[0]}`;
}
