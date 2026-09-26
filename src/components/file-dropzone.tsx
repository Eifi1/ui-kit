import { useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { Upload, X } from "lucide-react";
import { Button, IconButton, Spinner } from "./ui";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { useKitFileLabels, useKitLabels } from "../i18n/kit-labels";
import {
  DEFAULT_FILE_PICKER_LABELS,
  formatAccept,
  judgePick,
  screenFiles,
  summariseRejections,
} from "./file-button";
import type { FilePickHandler, FilePickerLabels, FileRejection } from "./file-button";
import { useDragTarget } from "../hooks/use-file-drop";
import { toast } from "./toast";

/**
 * Where a refused file's message goes.
 *
 *  - `"toast"` — a `sonner` toast (the 0.5 behaviour, kept as the default for a caller
 *    that handles nothing itself so no existing dropzone goes quiet on upgrade).
 *  - `"inline"` — under the drop target, in the danger colour, tied to it with
 *    `aria-describedby` (plus `data-invalid` for styling), and spoken through a live
 *    region. Cleared by the next accepted pick.
 *  - `"none"` — nothing visible; the caller shows it from `onReject` / `onInvalid`.
 *    Still spoken, so a host rendering it should not ALSO make it `role="alert"`.
 */
export type FileDropzoneRejectionFeedback = "toast" | "inline" | "none";

/** What a custom {@link FileDropzoneProps.renderBody} is handed. */
export interface FileDropzoneState {
  /** A file drag is over the zone right now. */
  dragOver: boolean;
  disabled: boolean;
  busy: boolean;
  /** What is chosen: `files` in multiple mode, `[file]` or `[]` in single mode. */
  files: readonly File[];
  /** The inline refusal, when `rejectionFeedback="inline"` has one to show. */
  error: string | null;
  /** Open the system picker — for a body that brings its own trigger (a second
   *  "Take photo" button). Does nothing while `disabled` or `busy`. */
  open: () => void;
  /** The resolved `filePicker` strings, so a custom body speaks the same language. */
  labels: FilePickerLabels;
}

/**
 * `onInvalid` is omitted from the `<div>` attributes and kept as this component's own.
 * The DOM event of that name belongs to form validation and takes a `FormEvent`; this
 * one takes the rejected `File`, and the kit's meaning is the one every caller already
 * writes. Everything else a `<div>` takes reaches the root — which carries
 * `role="group"` named by `dropLabel`, so that is also where an `aria-label` or an
 * `aria-describedby` belongs.
 *
 * Two modes. SINGLE (the default, and all of 0.5): `file` + `onFileSelected`. MULTIPLE
 * (`multiple`): `files` + `onFilesSelected`. They are optional rather than a union so
 * `FileDropzoneProps` stays an interface a caller can extend; a single-mode pick also
 * reaches `onFilesSelected` as a one-element array, so one handler can serve both.
 */
export interface FileDropzoneProps extends Omit<ComponentPropsWithoutRef<"div">, "onInvalid"> {
  /** Single mode: the chosen file, echoed with its size. */
  file?: File | null;
  /** Single mode: called with the accepted file. */
  onFileSelected?: (file: File) => void;
  /** Take several files per pick or drop. Without it a drop of several keeps the first. */
  multiple?: boolean;
  /** Multiple mode: the chosen files, listed in the zone. */
  files?: readonly File[];
  /** Every accepted file of one pick, in order. Never called with an empty array. */
  onFilesSelected?: (files: File[]) => void;
  /**
   * Show a remove button inside the zone once something is chosen (kastlan asked for
   * it: the only way to un-choose a file was to reload). Single mode: removes the file.
   * Multiple mode: a "remove all" button. The host clears its own state here — the
   * zone is controlled. Focus moves to the Browse button, and the removal is announced.
   */
  onClear?: () => void;
  /** Multiple mode: a remove button per listed file. */
  onRemove?: (file: File, index: number) => void;
  accept: string;
  /**
   * The caller's check. Optional since 0.6: without it the zone checks `accept` itself
   * (a drop ignores the dialog's filter). With it, `accept` is NOT re-checked — every
   * 0.5 caller's `isValid` is its own type check, and doubling it could refuse a file
   * the caller accepts (a `.zip` the OS labelled `application/octet-stream`).
   */
  isValid?: (file: File) => boolean;
  /** The message for an `isValid` refusal. Defaults to `labels.rejectedInvalid`. */
  invalidMessage?: string;
  /** Bytes; larger files are refused. */
  maxSize?: number;
  /** Multiple mode: files one pick may add. Pass what is LEFT for a running cap. */
  maxFiles?: number;
  /**
   * Called once per refused file. The 0.5 hook, kept as it was; {@link onReject}
   * carries the reason and the translated message as well.
   *
   * Its existence used to be what switched the toast off, and it still does (see
   * {@link rejectionFeedback}). The toast is the kit's `toast`, which loads `sonner`
   * lazily: it is an OPTIONAL peer, and a static import here once broke
   * `import { Button }` for every app without it (see `optional-peer-imports.test.tsx`).
   */
  onInvalid?: (file: File) => void;
  /** Every refused file of one pick, with its reason and message. */
  onReject?: (rejections: FileRejection[]) => void;
  /** The whole pick at once, before any of the above — return `false` to refuse all
   *  of it (see {@link FilePickHandler}). A refused pick selects nothing; its one
   *  message (`labels.rejectedPick`) goes where `rejectionFeedback` says. */
  onPick?: FilePickHandler;
  /** See {@link FileDropzoneRejectionFeedback}. Defaults to `"toast"` when neither
   *  `onInvalid` nor `onReject` is given, `"none"` when one is. */
  rejectionFeedback?: FileDropzoneRejectionFeedback;
  /** Per-instance overrides of the `filePicker` label namespace. */
  labels?: Partial<FilePickerLabels>;
  /** The dropzone's accessible name. A caller's own `aria-label` wins over it — see
   *  the root element below. Optional since 0.8, like the three below: each falls back
   *  to its `filePicker` string from `<UiKitProvider labels>`, then to English. They
   *  were required, so every call site passed four strings through `t()` by hand, and a
   *  zone nested in a kit component (the feedback form) had no call site to pass them. */
  dropLabel?: string;
  /** Default `filePicker.browse`. */
  browseLabel?: string;
  /** What the zone says while nothing is chosen. Default `filePicker.empty` /
   *  `emptyMultiple`. */
  emptyLabel?: string;
  /** The second line, e.g. what may be dropped. Default `filePicker.hint(accept)`. */
  hint?: string;
  /**
   * Not taking files: no drop, no picker, no remove buttons; `aria-disabled` on the
   * group. keksdose locks its invoice zone while another form holds unsaved changes,
   * and hand-rolled the whole zone to be able to (invoice-upload.tsx, "Locked").
   */
  disabled?: boolean;
  /**
   * Working on what it was given — an upload, an OCR pass. Inert like `disabled`, plus
   * `aria-busy`, a spinner in place of the upload icon, and `filePicker.busy` as the
   * text. The other half of why keksdose's invoice zone was hand-rolled.
   */
  busy?: boolean;
  /**
   * Replace the zone's body — the icon, the text and the chosen-file list — with your
   * own, given the zone's state: keksdose's spinner-plus-"uploading", its multi-shot
   * hint ("several photos are possible"), a second trigger for the camera.
   *
   * The Browse button, the inline error and the live regions stay: Browse is the
   * keyboard path, and a body that forgot it would leave the zone unreachable without
   * a pointer. A click on a control inside the body does not also open the picker.
   */
  renderBody?: (state: FileDropzoneState) => ReactNode;
  /** Extra classes for the dropzone's root. */
  className?: string;
}

/** Drag-and-drop file picker shared by the import wizards (YNAB zip, CAMT xml) and
 * kastlan's document forms. Refusals go to `onReject`/`onInvalid` and to
 * `rejectionFeedback`; the chosen file(s) are echoed with their size, otherwise
 * `emptyLabel` + `hint` describe what to drop. For a trigger with no drop area, see
 * `FileButton`. */
export function FileDropzone({
  file,
  onFileSelected,
  multiple,
  files,
  onFilesSelected,
  onClear,
  onRemove,
  accept,
  isValid,
  invalidMessage,
  maxSize,
  maxFiles,
  onInvalid,
  onReject,
  onPick,
  rejectionFeedback,
  labels: labelsProp,
  dropLabel: dropLabelProp,
  browseLabel: browseLabelProp,
  emptyLabel: emptyLabelProp,
  hint: hintProp,
  disabled,
  busy,
  renderBody,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedByProp,
  ...rest
}: FileDropzoneProps) {
  const [error, setError] = useState<string | null>(null);
  const inert = Boolean(disabled || busy);
  // State rather than a ref: `open` is handed to `renderBody` during render, and a
  // function that reads a ref there is exactly what the refs rule cannot prove safe.
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  // The size through the kit's `file.size` label (the provider's locale by default).
  // This was `${n / 1024} KB`: ASCII digits, an English unit, and a binary kilobyte
  // mislabelled as a decimal one, all in one template literal.
  const fileText = useKitFileLabels();
  const labels = useKitLabels("filePicker", DEFAULT_FILE_PICKER_LABELS, labelsProp);
  // Two regions, two urgencies: a pick or a removal is news, a refusal is a failure.
  // The echoed file name is only text in the zone, and text changing somewhere on the
  // page is not announced by itself.
  const status = useAnnounce();
  const alert = useAnnounce({ politeness: "assertive" });
  const feedback: FileDropzoneRejectionFeedback =
    rejectionFeedback ?? (onInvalid || onReject ? "none" : "toast");
  const dropLabel = dropLabelProp ?? labels.dropzone;
  const browseLabel = browseLabelProp ?? labels.browse;
  const emptyLabel = emptyLabelProp ?? (multiple ? labels.emptyMultiple : labels.empty);
  const hint = hintProp ?? labels.hint(formatAccept(accept));

  const acceptFiles = (list: ArrayLike<File> | null | undefined) => {
    if (inert || !list || list.length === 0) return;
    const all = Array.from(list);
    const picked = multiple ? all : all.slice(0, 1);
    const { accepted, rejected } = screenFiles(
      picked,
      {
        accept: isValid ? undefined : accept,
        maxSize,
        maxFiles: multiple ? maxFiles : undefined,
        isValid,
        invalidMessage,
      },
      labels,
      fileText.size,
    );
    const stands = judgePick(onPick, accepted, rejected);
    if (stands && accepted.length > 0) {
      setError(null);
      if (multiple) {
        onFilesSelected?.(accepted);
      } else {
        onFileSelected?.(accepted[0]);
        onFilesSelected?.(accepted);
      }
      status.announce(labels.selected(accepted.length, accepted[0].name));
    }
    if (!stands || rejected.length > 0) {
      for (const r of rejected) onInvalid?.(r.file);
      if (rejected.length > 0) onReject?.(rejected);
      const message = stands
        ? summariseRejections(rejected, labels)
        : labels.rejectedPick(picked.length);
      if (feedback === "toast") {
        // The kit's `toast`, which loads sonner (an optional peer) lazily, so an app
        // that never trips this never has to install it. Nothing downstream depends
        // on the toast having appeared. The toaster is a live region, so this path
        // does not announce a second time.
        toast.error(message);
      } else {
        if (feedback === "inline") setError(message);
        alert.announce(message);
      }
    }
  };

  // The remove buttons unmount with the file they removed, and focus would fall to
  // <body>. Browse is where the next action (pick again) starts.
  const afterRemoval = (message: string) => {
    browseRef.current?.focus();
    status.announce(message);
  };

  // The enter/leave counter lives in the shared hook: the boolean this was flickered
  // across every child of the zone in Safari, whose drag events carry no
  // `relatedTarget` to tell a move onto a child from a real leave.
  const { dropProps, isOver: dragOver } = useDragTarget<HTMLDivElement>({
    disabled: inert,
    onDropFiles: acceptFiles,
  });
  const open = () => {
    if (!inert) fileInput?.click();
  };

  const chosen: readonly File[] = multiple ? (files ?? []) : file ? [file] : [];
  const showError = feedback === "inline" && error !== null;
  const describedBy = cn(describedByProp, showError && errorId) || undefined;

  return (
    <>
      {/* A named group, NOT a `role="button"`. It was one, with real buttons (Browse,
          the remove buttons) inside it: nested interactive controls, which ARIA forbids
          because a button's children are presentational — a screen reader either read
          the zone as one opaque button or skipped the inner ones, and the zone was an
          extra Tab stop that did what Browse does. Now the keyboard path is Browse, a
          real button; the zone keeps its drop target and its click-anywhere for a
          pointer, which is a convenience on top of Browse rather than the only way in. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- the click is a pointer shortcut for Browse, see above */}
      <div
        // `...rest` first: every handler below is the drop gesture itself.
        {...rest}
        {...dropProps}
        // Pointer only; every control inside stops its own click from reaching here
        // (and one in a custom body is skipped below). The keyboard equivalent is the
        // Browse button, so no key handler belongs on a group.
        onClick={(e) => {
          if (fromControl(e)) return;
          open();
        }}
        role="group"
        // The DOM spelling wins over `dropLabel`, which stays the name for every caller
        // that passes no `aria-label` — i.e. all of them today. Standardising on
        // `aria-label` (audit §api-design) does not get to silently rename an existing
        // required prop.
        aria-label={ariaLabel ?? dropLabel}
        // No `aria-invalid`: ARIA does not allow it on `role="group"`. The message is
        // reached through the description instead, and spoken when it appears.
        aria-describedby={describedBy}
        data-invalid={showError || undefined}
        aria-disabled={disabled || undefined}
        aria-busy={busy || undefined}
        data-drag-over={dragOver || undefined}
        className={cn(
          // `relative` is load-bearing, not cosmetic. The file input below is `sr-only`,
          // which Tailwind implements as `position: absolute` — so without a positioned
          // ancestor its containing block is the INITIAL one, and it is laid out at its
          // own offset from the top of the document. Nothing looks wrong, because the
          // input is 1x1 and clipped; what breaks is the page height. On a long page
          // every escaped sr-only element extends `documentElement.scrollHeight` to its
          // own offset, which produces a second, whole-document scrollbar alongside the
          // app shell's own — one that scrolls past the end of the content into nothing.
          // Measured on the showcase: body 900px, document 47,919px.
          "relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
          // Three states out of two border tokens: the target rests on the plain
          // hairline, hover pulls it to `--border-strong`, and a live drag keeps that
          // border and adds the `--bg-active` wash on top — so "let go here" still reads
          // one step louder than "you are over it". A refusal shown inline takes the
          // danger border until the next good pick.
          // Inert zones keep the resting hairline and lose the hover pull: a border that
          // answers the pointer promises a drop the zone will refuse.
          disabled
            ? "cursor-not-allowed border-[var(--border)] opacity-60"
            : busy
              ? "cursor-progress border-[var(--border)]"
              : dragOver
                ? "cursor-pointer border-[var(--border-strong)] bg-[var(--bg-active)]"
                : showError
                  ? "cursor-pointer border-[var(--danger-border)]"
                  : "cursor-pointer border-[var(--border)] hover:border-[var(--border-strong)]",
          className,
        )}
      >
        {renderBody ? (
          renderBody({
            dragOver,
            disabled: Boolean(disabled),
            busy: Boolean(busy),
            files: chosen,
            error: showError ? error : null,
            open,
            labels,
          })
        ) : busy ? (
          <>
            {/* `label={null}`: the zone is `aria-busy` and the line below says the
                same in words; a spoken "Loading" would only run into it. */}
            <Spinner label={null} className="size-5" />
            <div className="text-sm text-[var(--text-secondary)]">{labels.busy}</div>
          </>
        ) : (
          <>
            <Upload aria-hidden className="size-5 text-[var(--text-muted)]" />
            {multiple && chosen.length > 0 ? (
              <ul className="flex w-full max-w-sm flex-col gap-1 text-start">
                {chosen.map((f, i) => (
                  <li
                    // Name + size + position: two files may share a name, and the index
                    // alone would re-key every row below a removal.
                    key={`${f.name}-${f.size}-${i}`}
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{f.name}</span>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">{fileText.size(f.size)}</span>
                    {onRemove && (
                      <IconButton
                        type="button"
                        size="sm"
                        disabled={inert}
                        aria-label={labels.remove(f.name)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(f, i);
                          afterRemoval(labels.removed(f.name));
                        }}
                      >
                        <X aria-hidden />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                  {/* `!multiple`: in multiple mode an empty `files` list is "nothing chosen",
                      whatever a stray `file` prop says — it used to show that file's name. */}
                  {!multiple && file ? <span className="font-medium">{file.name}</span> : emptyLabel}
                  {!multiple && file && onClear && (
                    <IconButton
                      type="button"
                      size="sm"
                      disabled={inert}
                      aria-label={labels.remove(file.name)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                        afterRemoval(labels.removed(file.name));
                      }}
                    >
                      <X aria-hidden />
                    </IconButton>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {file && !multiple ? fileText.size(file.size) : hint}
                </div>
              </>
            )}
          </>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            ref={browseRef}
            type="button"
            variant="secondary"
            disabled={inert}
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            {browseLabel}
          </Button>
          {multiple && chosen.length > 0 && onClear && (
            <Button
              type="button"
              variant="ghost"
              disabled={inert}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                afterRemoval(labels.cleared);
              }}
            >
              {labels.clearAll}
            </Button>
          )}
        </div>
        {showError && (
          <p id={errorId} className="text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        <input
          ref={setFileInput}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={inert}
          onChange={(e) => {
            // Copy, THEN reset: `files` is a live view of the value, and without the
            // reset picking the same file a second time fires no `change` at all —
            // the retry after a failed upload silently did nothing (kastlan).
            const picked = Array.from(e.currentTarget.files ?? []);
            e.currentTarget.value = "";
            acceptFiles(picked);
          }}
          // Clicks are forwarded here programmatically; one reaching the zone's own
          // handler again would open the dialog a second time.
          onClick={(e) => e.stopPropagation()}
          className="sr-only"
        />
      </div>
      {/* Outside the zone, where they have always been (the zone used to be a
          `role="button"`, whose content is presentational). `sr-only-fixed`, so they
          need no positioned ancestor. */}
      <span {...status.regionProps} />
      <span {...alert.regionProps} />
    </>
  );
}

/** A click that landed on a control inside the zone (a custom body's own button, a
 *  link in the hint) is that control's, not a request to open the picker. */
function fromControl(e: MouseEvent<HTMLElement>): boolean {
  const target = e.target as Element | null;
  const control = target?.closest?.("button, a[href], input, select, textarea, label, [role='button']");
  return Boolean(control && control !== e.currentTarget && e.currentTarget.contains(control));
}
