import { useId, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Upload, X } from "lucide-react";
import { Button, IconButton } from "./ui";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { useKitFileLabels, useKitLabels } from "../i18n/kit-labels";
import { DEFAULT_FILE_PICKER_LABELS, screenFiles, summariseRejections } from "./file-button";
import type { FilePickerLabels, FileRejection } from "./file-button";

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

/**
 * `onInvalid` is omitted from the `<div>` attributes and kept as this component's own.
 * The DOM event of that name belongs to form validation and takes a `FormEvent`; this
 * one takes the rejected `File`, and the kit's meaning is the one every caller already
 * writes. Everything else a `<div>` takes reaches the root — which carries
 * `role="button"`, so that is also where an `aria-label` or an `aria-describedby`
 * belongs.
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
   * zone is controlled. Focus returns to the zone, and the removal is announced.
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
   * {@link rejectionFeedback}). The toast is a dynamic `import("sonner")` on the
   * failure path only: `sonner` is an OPTIONAL peer, and a static import here once
   * broke `import { Button }` for every app without it (see
   * `optional-peer-imports.test.tsx`).
   */
  onInvalid?: (file: File) => void;
  /** Every refused file of one pick, with its reason and message. */
  onReject?: (rejections: FileRejection[]) => void;
  /** See {@link FileDropzoneRejectionFeedback}. Defaults to `"toast"` when neither
   *  `onInvalid` nor `onReject` is given, `"none"` when one is. */
  rejectionFeedback?: FileDropzoneRejectionFeedback;
  /** Per-instance overrides of the `filePicker` label namespace. */
  labels?: Partial<FilePickerLabels>;
  /** The dropzone's accessible name, and the instruction shown on it. A caller's own
   *  `aria-label` wins over it — see the root element below. */
  dropLabel: string;
  browseLabel: string;
  emptyLabel: string;
  hint: string;
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
  rejectionFeedback,
  labels: labelsProp,
  dropLabel,
  browseLabel,
  emptyLabel,
  hint,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedByProp,
  ...rest
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const errorId = useId();
  // The size through the kit's `file.size` label (the provider's locale by default).
  // This was `${n / 1024} KB`: ASCII digits, an English unit, and a binary kilobyte
  // mislabelled as a decimal one, all in one template literal.
  const fileText = useKitFileLabels();
  const labels = useKitLabels("filePicker", DEFAULT_FILE_PICKER_LABELS, labelsProp);
  // Two regions, two urgencies: a pick or a removal is news, a refusal is a failure.
  // Both are needed because nothing inside a `role="button"` is read out — its
  // children are presentational — so the echoed file name never reaches a screen
  // reader on its own.
  const status = useAnnounce();
  const alert = useAnnounce({ politeness: "assertive" });
  const feedback: FileDropzoneRejectionFeedback =
    rejectionFeedback ?? (onInvalid || onReject ? "none" : "toast");

  const acceptFiles = (list: ArrayLike<File> | null | undefined) => {
    if (!list || list.length === 0) return;
    const all = Array.from(list);
    const { accepted, rejected } = screenFiles(
      multiple ? all : all.slice(0, 1),
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
    if (accepted.length > 0) {
      setError(null);
      if (multiple) {
        onFilesSelected?.(accepted);
      } else {
        onFileSelected?.(accepted[0]);
        onFilesSelected?.(accepted);
      }
      status.announce(labels.selected(accepted.length, accepted[0].name));
    }
    if (rejected.length > 0) {
      for (const r of rejected) onInvalid?.(r.file);
      onReject?.(rejected);
      const message = summariseRejections(rejected, labels);
      if (feedback === "toast") {
        // sonner is an optional peer: imported here, on the failure path only, so an
        // app that never trips this never has to install it. Not awaited — nothing
        // downstream depends on the toast having appeared, and the handlers that
        // reach this are DOM events. sonner's own toaster is a live region, so this
        // path does not announce a second time.
        void import("sonner").then(({ toast }) => toast.error(message));
      } else {
        if (feedback === "inline") setError(message);
        alert.announce(message);
      }
    }
  };

  // The remove buttons unmount with the file they removed, and focus would fall to
  // <body>. The zone is where the next action (pick again) starts.
  const afterRemoval = (message: string) => {
    rootRef.current?.focus();
    status.announce(message);
  };

  const chosen: readonly File[] = multiple ? (files ?? []) : file ? [file] : [];
  const showError = feedback === "inline" && error !== null;
  const describedBy = cn(describedByProp, showError && errorId) || undefined;

  return (
    <>
      <div
        // `...rest` first: every handler below is the drop gesture itself, and the
        // `role`/`tabIndex` pair is what makes this div operable by keyboard at all.
        {...rest}
        ref={rootRef}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.types.includes("Files")) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          if (!dragOver && e.dataTransfer.types.includes("Files")) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          acceptFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          // Only the zone's OWN keys. A remove button inside it is a real button, and
          // Enter on it bubbling up here would open the picker instead of removing.
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        // The DOM spelling wins over `dropLabel`, which stays the name for every caller
        // that passes no `aria-label` — i.e. all of them today. Standardising on
        // `aria-label` (audit §api-design) does not get to silently rename an existing
        // required prop.
        aria-label={ariaLabel ?? dropLabel}
        // No `aria-invalid`: ARIA does not allow it on `role="button"`. The message is
        // reached through the description instead, and spoken when it appears.
        aria-describedby={describedBy}
        data-invalid={showError || undefined}
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
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
          // Three states out of two border tokens: the target rests on the plain
          // hairline, hover pulls it to `--border-strong`, and a live drag keeps that
          // border and adds the `--bg-active` wash on top — so "let go here" still reads
          // one step louder than "you are over it". A refusal shown inline takes the
          // danger border until the next good pick.
          dragOver
            ? "border-[var(--border-strong)] bg-[var(--bg-active)]"
            : showError
              ? "border-[var(--danger-border)]"
              : "border-[var(--border)] hover:border-[var(--border-strong)]",
          className,
        )}
      >
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
              {file ? <span className="font-medium">{file.name}</span> : emptyLabel}
              {!multiple && file && onClear && (
                <IconButton
                  type="button"
                  size="sm"
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
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {browseLabel}
          </Button>
          {multiple && chosen.length > 0 && onClear && (
            <Button
              type="button"
              variant="ghost"
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
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
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
      {/* Outside the zone: a live region inside a `role="button"` is inside
          presentational content, and screen readers are not consistent about
          reading those. `sr-only-fixed`, so they need no positioned ancestor. */}
      <span {...status.regionProps} />
      <span {...alert.regionProps} />
    </>
  );
}
