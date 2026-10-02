import { cn } from "../lib/cn";
import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type RefObject } from "react";
import { Camera, FileText, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { Button, Spinner } from "../components/ui";
import { useKitFileLabels, useKitLabels } from "../i18n/kit-labels";
import type { FeedbackAttachmentLabels } from "./feedback-dialog";

export const DEFAULT_ATTACHMENT_ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
/** How many files `<FeedbackAttachmentField multiple>` takes when `max` is not given
 *  (0.15.5). Five photos of one problem is already a lot to look through; a report
 *  that needs more is a conversation, which the thread is for. */
export const DEFAULT_MAX_ATTACHMENTS = 5;

/**
 * The field's own strings — the `feedbackAttachment` namespace of `<UiKitProvider
 * labels>`. The keys are {@link FeedbackAttachmentLabels}' own, so the `labels` prop
 * (and a whole `FeedbackDialogLabels` handed down by the dialog) merges over them
 * one to one. The optional heading, `attachment`, stays a prop: a note editor puts
 * the buttons straight under its textarea and wants none.
 *
 * Before 0.7.0 the two optional keys fell back to hard-coded English, so a German app
 * that relied on its provider got "Capture screenshot" under a German form.
 *
 * The three keys added in 0.15.5 for `multiple` mode are optional, so a complete
 * `UiKitLabels` typed before it still compiles; they fall back to English. So is
 * `attachmentScreenshot` (0.16.0).
 */
export interface FeedbackAttachmentFieldLabels {
  attachmentAdd: string;
  attachmentCapture: string;
  attachmentPaste: string;
  attachmentRemove: string;
  /** `multiple` mode: the accessible name of the list of chosen files — and, since
   *  0.16.0, the heading `<FeedbackDialog attachments="multiple">` puts over it. */
  attachmentList?: string;
  /** `multiple` mode (0.16.0): what the screenshot slot's chip is called — "Screenshot"
   *  rather than the capture's file name ("screenshot.webp"), which says nothing a
   *  reporter chose. The file name stays as the chip's second line. */
  attachmentScreenshot?: string;
  /** `multiple` mode: one chip's remove button — "Remove photo.jpg". Named per file,
   *  because five buttons all called "Remove attachment" say nothing about which. */
  attachmentRemoveFile?: (name: string) => string;
  /** `multiple` mode: the line shown in place of the add buttons once `max` is reached. */
  attachmentLimit?: (max: number) => string;
  /** `refs` mode (0.22.0, keksdose K16): the second line of a chip whose upload is still
   *  running, where an uploaded one shows its size — "Uploading…". Optional, like the
   *  keys above, so a `UiKitLabels` typed before it still compiles. */
  attachmentUploading?: string;
}

export const DEFAULT_FEEDBACK_ATTACHMENT_LABELS: FeedbackAttachmentFieldLabels = {
  attachmentAdd: "Attach image",
  attachmentCapture: "Capture screenshot",
  attachmentPaste: "…or paste a screenshot from the clipboard.",
  attachmentRemove: "Remove attachment",
  attachmentList: "Attachments",
  attachmentScreenshot: "Screenshot",
  attachmentRemoveFile: (name) => `Remove ${name}`,
  attachmentLimit: (max) =>
    `Up to ${max} ${max === 1 ? "attachment" : "attachments"} — remove one to add another.`,
  attachmentUploading: "Uploading…",
};

/** Why a file was turned away. `"count"` only ever comes from `multiple` (and `refs`)
 *  mode: more files arrived at once than `max` left room for, and the surplus was
 *  dropped. */
export type FeedbackAttachmentError = "type" | "size" | "count";

/** `refs` mode's reasons: {@link FeedbackAttachmentError}, or `"upload"` — `onUpload`
 *  rejected, and what it rejected with is `onError`'s second argument. A type of its
 *  own so a host's exhaustive switch over the File modes' reasons stays exhaustive. */
export type FeedbackAttachmentRefsError = FeedbackAttachmentError | "upload";

/**
 * One uploaded attachment in `refs` mode: what the host's upload answered with. `key`
 * identifies it (a storage key, an upload id) and is what a remove goes by; `name` is
 * what the chip says. `size` (bytes) and `type` (mime) are optional — given, the chip
 * shows the size and an image icon or a file icon accordingly.
 */
export interface FeedbackAttachmentRef {
  key: string;
  name: string;
  size?: number;
  type?: string;
}

interface FeedbackAttachmentFieldBaseProps {
  /** Prop > `<UiKitProvider labels={{ feedbackAttachment }}>` > English. Optional
   *  since 0.7.0; `attachment` (the heading) is only ever read from here. */
  labels?: Partial<FeedbackAttachmentLabels> & Pick<Partial<FeedbackAttachmentFieldLabels>, "attachmentUploading">;
  accept?: string[];
  maxBytes?: number;
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
}

/** One file: choosing a second means removing the first. The field's only mode until 0.15.5. */
export interface FeedbackAttachmentFieldSingleProps extends FeedbackAttachmentFieldBaseProps {
  multiple?: false;
  refs?: false;
  value: File | null;
  onChange: (file: File | null) => void;
  onError?: (kind: "type" | "size") => void;
  // Multiple-mode props, refused here: without `multiple` they would be silently ignored.
  max?: never;
  screenshot?: never;
  onScreenshotChange?: never;
}

/**
 * Several files (0.15.5, keksdose dev#578: "pasted two photos, the second overwrote
 * the first"). Every way in ADDS — a pick of several files, a paste, a capture — up to
 * `max`, and each file is a removable chip.
 */
export interface FeedbackAttachmentFieldMultipleProps extends FeedbackAttachmentFieldBaseProps {
  multiple: true;
  refs?: false;
  value: File[];
  onChange: (files: File[]) => void;
  /** How many files `value` may hold. Default {@link DEFAULT_MAX_ATTACHMENTS} (5). The
   *  add buttons and the paste hint are offered only while there is room. */
  max?: number;
  /** Per file: a rejected one is reported and the others are still added. */
  onError?: (kind: FeedbackAttachmentError) => void;
  /**
   * A separate slot for THE screenshot, outside `value` and `max`. Given
   * `onScreenshotChange`, what `onCaptureScreenshot` returns lands here instead of in
   * `value`, shown as the first chip, and the capture button is offered only while the
   * slot is empty — a second snapshot of the same view is not more evidence. This is
   * how `<FeedbackDialog attachments="multiple">` keeps the screenshot apart from the
   * photos; a form built from the parts can do the same.
   */
  screenshot?: File | null;
  onScreenshotChange?: (file: File | null) => void;
}

/**
 * Uploaded on pick (0.22.0, keksdose K16). keksdose's support chat uploads each file
 * the moment it is chosen and sends the message with the REFS the uploads answered —
 * a 10 MB screenshot is refused while the reporter is still typing, not when they
 * press Send — so its `AttachmentPicker` could not use this field, whose value is
 * `File`s held until the form is submitted. Here the value is
 * {@link FeedbackAttachmentRef}s: every way in (pick, paste, capture) validates the
 * file as the other modes do, then hands it to `onUpload` and shows a chip with a
 * spinner until it answers; the ref it resolves to joins `value` through `onChange`.
 * A rejection drops the chip and reports `onError("upload", error)`. A chip is removed
 * BY KEY: `onChange` gets the list without it, and `onRemove` the key, for a host that
 * deletes the upload on the server too.
 *
 * Uploads still running count against `max`, so five picks in quick succession cannot
 * overshoot it; they are not in `value` until they land, so a send that reads `value`
 * sends only what has arrived — hold Send back while {@link onUploadingChange} says
 * an upload is running. Several files upload side by side and join in the order they
 * finish. The File modes are unchanged.
 */
export interface FeedbackAttachmentFieldRefsProps extends FeedbackAttachmentFieldBaseProps {
  refs: true;
  multiple?: never;
  value: FeedbackAttachmentRef[];
  onChange: (refs: FeedbackAttachmentRef[]) => void;
  /** Upload one file; resolve to its ref, or reject to refuse it. Called once per
   *  accepted file, the moment it is chosen. */
  onUpload: (file: File) => Promise<FeedbackAttachmentRef>;
  /** A chip was removed — after `onChange` — with its ref's key. */
  onRemove?: (key: string) => void;
  /** Whether any upload is running: `true` when the first starts, `false` when the
   *  last settles — for the host's Send, which should wait. */
  onUploadingChange?: (uploading: boolean) => void;
  /** How many refs `value` may hold, uploads in flight included. Default
   *  {@link DEFAULT_MAX_ATTACHMENTS} (5). */
  max?: number;
  /** Per file. `"upload"` carries what `onUpload` rejected with. */
  onError?: (kind: FeedbackAttachmentRefsError, error?: unknown) => void;
  screenshot?: never;
  onScreenshotChange?: never;
}

export type FeedbackAttachmentFieldProps =
  | FeedbackAttachmentFieldSingleProps
  | FeedbackAttachmentFieldMultipleProps
  | FeedbackAttachmentFieldRefsProps;

/**
 * Picking one picture: the file dialog, a capture of the app view, or a paste.
 * With `multiple`, picking several (see {@link FeedbackAttachmentFieldMultipleProps}).
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
export function FeedbackAttachmentField(props: FeedbackAttachmentFieldProps) {
  // One component per mode rather than one with branches: the modes hold different
  // state (one preview vs. one per chip vs. uploads in flight), and a hook order that
  // depends on a prop is a crash the day a caller flips it.
  if (props.refs) return <RefsField {...props} />;
  return props.multiple ? <MultipleField {...props} /> : <SingleField {...props} />;
}

function SingleField({
  value,
  onChange,
  labels: labelsProp,
  accept = DEFAULT_ATTACHMENT_ACCEPT,
  maxBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
  onError,
  onCaptureScreenshot,
  documentPaste = false,
  pasteFrom,
  className,
}: FeedbackAttachmentFieldSingleProps) {
  // The object URL is keyed to the file it was made for, so a stale one (from the
  // previous file, or after `value` is cleared) is never shown — no reset needed.
  const [previewFor, setPreviewFor] = useState<{ file: File; url: string } | null>(null);
  const preview = value && previewFor?.file === value ? previewFor.url : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  // `file.size` from `<UiKitProvider labels>`, formatted in its locale — see FileDropzone.
  const fileText = useKitFileLabels();
  const text = useKitLabels("feedbackAttachment", DEFAULT_FEEDBACK_ATTACHMENT_LABELS, labelsProp);

  // Object-URL preview lifecycle (create on change, revoke on cleanup).
  useEffect(() => {
    if (!value) return;
    const url = URL.createObjectURL(value);
    // The URL is an external resource that must be created and revoked in step
    // with the effect (a render-time `createObjectURL` would leak, and StrictMode's
    // remount would revoke a memoised one out from under the <img>).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- publishing an external resource's handle
    setPreviewFor({ file: value, url });
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const pick = (file: File | undefined | null) => {
    if (!file) return;
    const problem = rejection(file, accept, maxBytes);
    if (problem) {
      onError?.(problem);
      return;
    }
    onChange(file);
  };

  const onPaste = usePaste(
    (images) => {
      // Clipboard images arrive named "image.png" at best and unnamed at worst,
      // and the name is what the inbox shows beside the thumbnail. A name that
      // says where it came from is more use than the browser's.
      const file = images[0];
      pick(new File([file], pastedName(file.type), { type: file.type }));
    },
    documentPaste,
    pasteFrom,
  );

  return (
    <div
      // `relative` for the same reason as FileDropzone: the `sr-only` file input below
      // is `position: absolute`, and without a positioned ancestor it is laid out
      // against the initial containing block — extending the DOCUMENT height to its own
      // offset and producing a phantom second scrollbar on any long page.
      className={cn("relative", className)}
      onPaste={onPaste}
    >
      <Heading text={labelsProp?.attachment} />
      {value ? (
        <div className="flex items-start gap-2">
          {value.type.startsWith("image/") && preview ? (
            <img
              src={preview}
              alt={value.name}
              className="h-20 w-20 rounded border border-[var(--border)] object-cover"
            />
          ) : (
            // Non-image attachments (PDF, text) can't preview as an <img>, so
            // show a neutral file tile with the name/size beside it instead.
            <div className="flex h-20 w-20 items-center justify-center rounded border border-[var(--border)] text-[var(--text-placeholder)]">
              <FileText className="size-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm text-[var(--text-secondary)]">{value.name}</div>
            <div className="text-xs text-[var(--text-muted)]">
              {fileText.size(value.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={text.attachmentRemove}
            className="rounded p-1.5 text-[var(--text-placeholder)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-4" /> {text.attachmentAdd}
            </Button>
            {onCaptureScreenshot && (
              <CaptureButton capture={onCaptureScreenshot} onFile={pick} label={text.attachmentCapture} />
            )}
          </div>
          {/* Said out loud, because a gesture with no affordance is a gesture
              nobody finds. */}
          <p className="text-xs text-[var(--text-muted)]">
            {text.attachmentPaste}
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

function MultipleField({
  value,
  onChange,
  max = DEFAULT_MAX_ATTACHMENTS,
  screenshot = null,
  onScreenshotChange,
  labels: labelsProp,
  accept = DEFAULT_ATTACHMENT_ACCEPT,
  maxBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
  onError,
  onCaptureScreenshot,
  documentPaste = false,
  pasteFrom,
  className,
}: FeedbackAttachmentFieldMultipleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileText = useKitFileLabels();
  const text = useKitLabels("feedbackAttachment", DEFAULT_FEEDBACK_ATTACHMENT_LABELS, labelsProp);
  const removeLabel = text.attachmentRemoveFile ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentRemoveFile!;
  const limitLabel = text.attachmentLimit ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentLimit!;
  const screenshotLabel = text.attachmentScreenshot ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentScreenshot!;

  // What an add or a remove builds on: the `value` prop, plus whatever this field has
  // already handed to `onChange` since the parent last rendered. The field is
  // controlled, so between an `onChange` and the re-render that brings it back, `value`
  // is stale — and two adds in that gap (two pastes, a paste and a pick, delivered by
  // native listeners whose updates React batches) each spread the SAME old list, and
  // the second dropped the first. Re-synced to the prop after every commit, so a
  // parent that refuses a change (or edits the list itself) is what wins.
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  const commit = (next: File[]) => {
    latest.current = next;
    onChange(next);
  };

  const hasSlot = onScreenshotChange !== undefined;
  const room = Math.max(0, max - value.length);
  // The screenshot slot is its own thing: it neither counts against `max` nor is
  // closed by it, so a full set of photos still leaves the capture on offer.
  const canCapture = !!onCaptureScreenshot && (hasSlot ? !screenshot : room > 0);

  const add = (incoming: File[], pasted = false) => {
    const current = latest.current;
    const accepted: File[] = [];
    const taken = new Set([...current, ...(screenshot ? [screenshot] : [])].map((f) => f.name));
    for (const raw of incoming) {
      const problem = rejection(raw, accept, maxBytes);
      if (problem) {
        onError?.(problem);
        continue;
      }
      // Two pastes are two files called "pasted.png", and a backend that stores by
      // name keeps one of them — the very loss this mode exists to end. A picked
      // file keeps its own name: it is the user's, and they may look for it.
      const file = pasted ? renamed(raw, uniqueName(pastedName(raw.type), taken)) : raw;
      taken.add(file.name);
      // The same File object twice is one file chosen twice, not two.
      if (!current.includes(file)) accepted.push(file);
    }
    if (accepted.length === 0) return;
    const space = Math.max(0, max - current.length);
    if (accepted.length > space) onError?.("count");
    const kept = accepted.slice(0, space);
    if (kept.length > 0) commit([...current, ...kept]);
  };

  const onPaste = usePaste((images) => add(images, true), documentPaste, pasteFrom);

  const capture = (file: File) => {
    if (!hasSlot) {
      add([file]);
      return;
    }
    const problem = rejection(file, accept, maxBytes);
    if (problem) onError?.(problem);
    else onScreenshotChange(file);
  };

  // Removing a chip removes the button that had focus. Focus goes to the chip that
  // took its place — the next one — and, when it was the last, to the first action
  // button (there is room again, so "Attach" is back), else to the chip before it.
  // Applied once the parent has re-rendered with the shorter list: the field is
  // controlled, and focusing before that would land on the chip being removed.
  const pendingFocus = useRef<number | null>(null);
  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const root = rootRef.current;
    if (!root) return;
    const removes = root.querySelectorAll<HTMLElement>("[data-attachment-remove]");
    const target =
      removes[index] ?? root.querySelector<HTMLElement>("[data-attachment-action]") ?? removes[index - 1];
    target?.focus();
  }, [value, screenshot]);

  const chips: Array<{ file: File; screenshot: boolean; name: string; remove: () => void }> = [
    ...(hasSlot && screenshot
      ? [{ file: screenshot, screenshot: true, name: screenshotLabel, remove: () => onScreenshotChange(null) }]
      : []),
    ...value.map((file) => ({
      file,
      screenshot: false,
      name: file.name,
      remove: () => commit(latest.current.filter((f) => f !== file)),
    })),
  ];

  return (
    <div ref={rootRef} className={cn("relative space-y-2", className)} onPaste={onPaste}>
      <Heading text={labelsProp?.attachment} className="mb-0" />
      {chips.length > 0 && (
        // One chip per row, full width: wrapped chips of name-dependent widths made a
        // ragged block in a 430px dialog, and a column keeps every name and remove
        // button in the same place — the next chip's button is right under the last.
        <ul aria-label={text.attachmentList} className="flex flex-col gap-2">
          {chips.map((chip, index) => (
            <li
              key={fileKey(chip.file)}
              className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1"
            >
              <ChipPreview file={chip.file} screenshot={chip.screenshot} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-[var(--text-secondary)]">{chip.name}</div>
                <div className="truncate text-xs text-[var(--text-muted)]">
                  {/* The screenshot's file name moves down here: still there for the
                      reporter who wants to know what will be sent, not its title. */}
                  {chip.screenshot ? `${chip.file.name} · ${fileText.size(chip.file.size)}` : fileText.size(chip.file.size)}
                </div>
              </div>
              <button
                type="button"
                data-attachment-remove=""
                onClick={() => {
                  pendingFocus.current = index;
                  chip.remove();
                }}
                aria-label={removeLabel(chip.name)}
                className="shrink-0 rounded p-1.5 text-[var(--text-placeholder)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(room > 0 || canCapture) && (
        <div className="flex flex-wrap gap-2">
          {room > 0 && (
            <Button
              type="button"
              variant="secondary"
              data-attachment-action=""
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" /> {text.attachmentAdd}
            </Button>
          )}
          {canCapture && onCaptureScreenshot && (
            <CaptureButton
              capture={onCaptureScreenshot}
              onFile={capture}
              label={text.attachmentCapture}
              data-attachment-action=""
            />
          )}
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)]">
        {room > 0 ? text.attachmentPaste : limitLabel(max)}
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple={room > 1}
        accept={accept.join(",")}
        className="sr-only"
        // Out of the tab order and the accessibility tree: the button above is
        // the way in, and a second, unlabelled "Choose files" stop is noise.
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** A file `refs` mode is uploading: its own id (a ref has no key yet), and the file. */
interface Upload {
  id: number;
  file: File;
}

let nextUploadId = 0;

function RefsField({
  value,
  onChange,
  onUpload,
  onRemove,
  onUploadingChange,
  max = DEFAULT_MAX_ATTACHMENTS,
  labels: labelsProp,
  accept = DEFAULT_ATTACHMENT_ACCEPT,
  maxBytes = DEFAULT_MAX_ATTACHMENT_BYTES,
  onError,
  onCaptureScreenshot,
  documentPaste = false,
  pasteFrom,
  className,
}: FeedbackAttachmentFieldRefsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileText = useKitFileLabels();
  const text = useKitLabels("feedbackAttachment", DEFAULT_FEEDBACK_ATTACHMENT_LABELS, labelsProp);
  const removeLabel = text.attachmentRemoveFile ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentRemoveFile!;
  const limitLabel = text.attachmentLimit ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentLimit!;
  const uploadingLabel = text.attachmentUploading ?? DEFAULT_FEEDBACK_ATTACHMENT_LABELS.attachmentUploading!;

  // As in `multiple` mode: `value` plus whatever has been handed to `onChange` since
  // the parent last rendered — two uploads landing in one tick must both survive.
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  const commit = (next: FeedbackAttachmentRef[]) => {
    latest.current = next;
    onChange(next);
  };

  const [uploads, setUploads] = useState<Upload[]>([]);
  // The uploads in flight, kept in a ref as well: `add` runs several times before a
  // render when files arrive together, and each must see the others — their count
  // against `max`, their names against a pasted image's.
  const inFlight = useRef<Upload[]>([]);
  // Unmounted (the dialog closed mid-upload): a late answer is not this field's to
  // commit, and setting state on it would be a no-op at best.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const uploadingChange = useRef(onUploadingChange);
  useEffect(() => {
    uploadingChange.current = onUploadingChange;
  });

  const room = Math.max(0, max - value.length - uploads.length);

  const start = (file: File) => {
    const upload: Upload = { id: nextUploadId++, file };
    inFlight.current = [...inFlight.current, upload];
    if (inFlight.current.length === 1) uploadingChange.current?.(true);
    setUploads(inFlight.current);
    const settle = () => {
      inFlight.current = inFlight.current.filter((u) => u.id !== upload.id);
      if (!mounted.current) return;
      setUploads(inFlight.current);
      if (inFlight.current.length === 0) uploadingChange.current?.(false);
    };
    let answer: Promise<FeedbackAttachmentRef>;
    try {
      answer = Promise.resolve(onUpload(file));
    } catch (error) {
      answer = Promise.reject(error);
    }
    answer.then(
      (ref) => {
        settle();
        if (mounted.current) commit([...latest.current, ref]);
      },
      (error: unknown) => {
        settle();
        if (mounted.current) onError?.("upload", error);
      },
    );
  };

  const add = (incoming: File[], pasted = false) => {
    let space = Math.max(0, max - latest.current.length - inFlight.current.length);
    const taken = new Set([...latest.current.map((r) => r.name), ...inFlight.current.map((u) => u.file.name)]);
    let dropped = false;
    for (const raw of incoming) {
      const problem = rejection(raw, accept, maxBytes);
      if (problem) {
        onError?.(problem);
        continue;
      }
      if (space === 0) {
        dropped = true;
        continue;
      }
      // Pasted images are all "image.png" to the clipboard; as in `multiple` mode,
      // each gets a name of its own before it is uploaded under it.
      const file = pasted ? renamed(raw, uniqueName(pastedName(raw.type), taken)) : raw;
      taken.add(file.name);
      space -= 1;
      start(file);
    }
    if (dropped) onError?.("count");
  };

  const onPaste = usePaste((images) => add(images, true), documentPaste, pasteFrom);

  // Focus after a remove, as in `multiple` mode: the next chip, else the first action.
  const pendingFocus = useRef<number | null>(null);
  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const root = rootRef.current;
    if (!root) return;
    const removes = root.querySelectorAll<HTMLElement>("[data-attachment-remove]");
    const target =
      removes[index] ?? root.querySelector<HTMLElement>("[data-attachment-action]") ?? removes[index - 1];
    target?.focus();
  }, [value]);

  const remove = (key: string, index: number) => {
    pendingFocus.current = index;
    commit(latest.current.filter((r) => r.key !== key));
    onRemove?.(key);
  };

  const hasChips = value.length > 0 || uploads.length > 0;

  return (
    <div ref={rootRef} className={cn("relative space-y-2", className)} onPaste={onPaste}>
      <Heading text={labelsProp?.attachment} className="mb-0" />
      {hasChips && (
        <ul aria-label={text.attachmentList} className="flex flex-col gap-2">
          {value.map((ref, index) => (
            <li
              key={`ref:${ref.key}`}
              className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1"
            >
              <RefGlyph type={ref.type} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-[var(--text-secondary)]">{ref.name}</div>
                {ref.size !== undefined && (
                  <div className="truncate text-xs text-[var(--text-muted)]">{fileText.size(ref.size)}</div>
                )}
              </div>
              <button
                type="button"
                data-attachment-remove=""
                onClick={() => remove(ref.key, index)}
                aria-label={removeLabel(ref.name)}
                className="shrink-0 rounded p-1.5 text-[var(--text-placeholder)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
          {uploads.map((upload) => (
            <li
              key={`upload:${upload.id}`}
              aria-busy="true"
              data-attachment-uploading=""
              className="flex min-w-0 items-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-1"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-placeholder)]">
                <Spinner label={null} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-[var(--text-secondary)]">{upload.file.name}</div>
                <div className="truncate text-xs text-[var(--text-muted)]">{uploadingLabel}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {room > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            data-attachment-action=""
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" /> {text.attachmentAdd}
          </Button>
          {onCaptureScreenshot && (
            <CaptureButton
              capture={onCaptureScreenshot}
              onFile={(file) => add([file])}
              label={text.attachmentCapture}
              data-attachment-action=""
            />
          )}
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)]">{room > 0 ? text.attachmentPaste : limitLabel(max)}</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple={room > 1}
        accept={accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** A ref chip's picture. The bytes are on the server, not here, so there is nothing to
 *  preview: an image glyph for an image `type`, a file glyph for anything else. */
function RefGlyph({ type }: { type?: string }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-placeholder)]">
      {type?.startsWith("image/") ? <ImageIcon aria-hidden className="size-6" /> : <FileText aria-hidden className="size-6" />}
    </span>
  );
}

function Heading({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  return (
    <div className={cn("mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]", className)}>
      {text}
    </div>
  );
}

function CaptureButton({
  capture,
  onFile,
  label,
  ...rest
}: {
  capture: () => Promise<File | null>;
  onFile: (file: File) => void;
  label: string;
  "data-attachment-action"?: string;
}) {
  const [capturing, setCapturing] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={capturing}
      {...rest}
      onClick={() => {
        if (capturing) return;
        setCapturing(true);
        void capture()
          .then((file) => {
            if (file) onFile(file);
          })
          .finally(() => setCapturing(false));
      }}
    >
      <Camera className="size-4" /> {capturing ? "…" : label}
    </Button>
  );
}

/** A chip's picture: the image itself, or a file glyph for anything that is not one.
 *  Decorative (`alt=""`) — the name stands beside it. Its own component so the object
 *  URL lives exactly as long as the chip: removing the chip unmounts it and revokes. */
function ChipPreview({ file, screenshot }: { file: File; screenshot: boolean }) {
  const isImage = file.type.startsWith("image/");
  const [previewFor, setPreviewFor] = useState<{ file: File; url: string } | null>(null);
  const url = previewFor?.file === file ? previewFor.url : null;
  useEffect(() => {
    if (!isImage) return;
    const next = URL.createObjectURL(file);
    // As in the single field: an external resource created and revoked with the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- publishing an external resource's handle
    setPreviewFor({ file, url: next });
    return () => URL.revokeObjectURL(next);
  }, [file, isImage]);

  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-surface-2)] text-[var(--text-placeholder)]">
      {isImage && url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <FileText aria-hidden className="size-6" />
      )}
      {screenshot && (
        // Marks the slot apart from the photos: it is why the capture button is gone.
        <span className="absolute bottom-0.5 end-0.5 rounded-sm bg-[var(--bg-surface)] p-0.5 text-[var(--text-secondary)]">
          <Camera aria-hidden className="size-3" />
        </span>
      )}
    </span>
  );
}

/** A stable React key per File object — the name is not one (two pastes, two
 *  "pasted.png" before renaming; the same photo picked from two folders). */
const fileKeys = new WeakMap<File, number>();
let nextFileKey = 0;
function fileKey(file: File): number {
  let key = fileKeys.get(file);
  if (key === undefined) {
    key = nextFileKey++;
    fileKeys.set(file, key);
  }
  return key;
}

function rejection(file: File, accept: string[], maxBytes: number): "type" | "size" | null {
  if (!accept.includes(file.type)) return "type";
  if (file.size > maxBytes) return "size";
  return null;
}

function renamed(file: File, name: string): File {
  return new File([file], name, { type: file.type });
}

/** `pasted.png`, then `pasted-2.png`, `pasted-3.png`… — the first name not in `taken`. */
function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let n = 2;
  while (taken.has(`${stem}-${n}${ext}`)) n++;
  return `${stem}-${n}${ext}`;
}

/**
 * The paste listener both modes share. `onImages` gets every image file on the
 * clipboard (the single field takes the first). It is registered once rather than per
 * render, so it reads the handler — which closes over props that change identity on
 * every render — out of a ref rather than out of its own dependency list. Returns the
 * `onPaste` for the field's root, or `undefined` when listening elsewhere.
 */
function usePaste(
  onImages: (images: File[]) => void,
  documentPaste: boolean,
  pasteFrom: RefObject<HTMLElement | null> | undefined,
) {
  const latest = useRef(onImages);
  useEffect(() => {
    latest.current = onImages;
  });

  // The element listened on, where it is not this field's own subtree: the
  // document for a modal, the given parent for an inline editor. Read inside
  // the effect rather than in render, because a ref's `current` is only set
  // once the parent has mounted — which it has by the time effects run.
  useEffect(() => {
    const target: EventTarget | null = documentPaste ? document : (pasteFrom?.current ?? null);
    if (!target) return;
    const onPaste = (event: Event) => {
      const clipboard = (event as ClipboardEvent).clipboardData;
      takeImages(clipboard, () => event.preventDefault(), latest.current);
    };
    target.addEventListener("paste", onPaste);
    return () => target.removeEventListener("paste", onPaste);
  }, [documentPaste, pasteFrom]);

  const listensElsewhere = documentPaste || pasteFrom !== undefined;
  return listensElsewhere
    ? undefined
    : (event: ReactClipboardEvent) => takeImages(event.clipboardData, () => event.preventDefault(), latest.current);
}

function takeImages(clipboard: DataTransfer | null, stop: () => void, onImages: (images: File[]) => void) {
  const images = Array.from(clipboard?.items ?? [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
  if (images.length === 0) return;
  // Only once there IS an image: a paste of text into a field must stay a
  // paste of text, and a clipboard holding both is a copy whose text half is
  // what the field was focused for.
  stop();
  onImages(images);
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
