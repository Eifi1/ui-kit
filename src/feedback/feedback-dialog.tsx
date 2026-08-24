import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Camera, FileText, Paperclip, X } from "lucide-react";
import { Button, Input, PHONE_QUERY, Select, Textarea } from "../components/ui";
import { Modal } from "../components/modal";
import { useMediaQuery } from "../hooks/use-media-query";

export interface FeedbackCategoryOption {
  value: string;
  label: string;
}

export interface FeedbackDialogLabels {
  title: string;
  category: string;
  subject: string;
  body: string;
  attachment: string;
  attachmentAdd: string;
  /** Label for the "capture screenshot" button. Optional — falls back to an English default. */
  attachmentCapture?: string;
  /** The line under the attachment buttons saying a screenshot can be pasted
   *  straight in. Optional — falls back to an English default. */
  attachmentPaste?: string;
  attachmentRemove: string;
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

const DEFAULT_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

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
  attachmentAccept = DEFAULT_ACCEPT,
  maxAttachmentBytes = DEFAULT_MAX_BYTES,
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
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery(PHONE_QUERY, false);

  // Reset the form whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setAttachment(null);
      setCapturing(false);
    }
  }, [open]);

  // Object-URL preview lifecycle (create on change, revoke on cleanup).
  useEffect(() => {
    if (!attachment) {
      setAttachmentPreview(null);
      return;
    }
    const url = URL.createObjectURL(attachment);
    setAttachmentPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  const pickAttachment = (file: File | undefined | null) => {
    if (!file) return;
    if (!attachmentAccept.includes(file.type)) {
      onAttachmentError?.("type");
      return;
    }
    if (file.size > maxAttachmentBytes) {
      onAttachmentError?.("size");
      return;
    }
    setAttachment(file);
  };

  // The paste handler is registered once per opening rather than per render, so
  // it reads `pickAttachment` — which closes over props that change identity on
  // every render — out of a ref rather than out of its own dependency list.
  const pick = useRef(pickAttachment);
  useEffect(() => {
    pick.current = pickAttachment;
  });

  // On `document`, not on the panel: the Modal focuses its own panel on open and
  // traps Tab inside it, so while this dialog is up every paste in the page is
  // meant for it — including the one made with nothing in particular focused,
  // which never reaches a React `onPaste` on a child.
  useEffect(() => {
    if (!open) return;
    const onPaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const image = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
      const file = image?.getAsFile();
      if (!file) return;
      // Only once there IS an image: a paste of text into the body must stay a
      // paste of text, and a clipboard holding both is a copy whose text half is
      // what the field was focused for.
      event.preventDefault();
      // Clipboard images arrive named "image.png" at best and unnamed at worst,
      // and the name is what the inbox shows beside the thumbnail. A name that
      // says where it came from is more use than the browser's.
      pick.current(new File([file], pastedName(file.type), { type: file.type }));
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open]);

  const captureScreenshot = async () => {
    if (!onCaptureScreenshot || capturing) return;
    setCapturing(true);
    try {
      const file = await onCaptureScreenshot();
      if (file) pickAttachment(file);
    } finally {
      setCapturing(false);
    }
  };

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
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {labels.attachment}
      </div>
      {attachment ? (
        <div className="flex items-start gap-2">
          {attachment.type.startsWith("image/") && attachmentPreview ? (
            <img
              src={attachmentPreview}
              alt={attachment.name}
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
            <div className="truncate text-sm text-slate-700 dark:text-slate-200">{attachment.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{Math.round(attachment.size / 1024)} KB</div>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
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
              <Button type="button" variant="secondary" onClick={() => void captureScreenshot()} disabled={capturing}>
                <Camera className="size-4" /> {capturing ? "…" : (labels.attachmentCapture ?? "Capture screenshot")}
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
        accept={attachmentAccept.join(",")}
        className="sr-only"
        onChange={(e) => {
          pickAttachment(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
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
          <div className="text-xs text-slate-400 dark:text-slate-500">{labels.submitHint}</div>
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

/** What a pasted image is called once it is an attachment.
 *
 *  The extension is read off the mime type rather than assumed to be `.png`:
 *  Safari puts TIFF on the clipboard and a file called `pasted.png` that is not
 *  a PNG is one the receiving end opens wrong. */
function pastedName(type: string): string {
  const subtype = type.split("/")[1] ?? "png";
  // `image/svg+xml` and friends carry a suffix that is not part of the
  // extension, and none of them are in the accepted list anyway.
  return `pasted.${subtype.split("+")[0]}`;
}
