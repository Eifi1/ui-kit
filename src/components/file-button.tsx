import { forwardRef, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, DragEvent, ReactElement, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { useKitFileLabels, useKitLabels } from "../i18n/kit-labels";
import { Button, Spinner } from "./ui";

/**
 * A button that opens the file picker — the shape all three apps kept writing by hand
 * as a `<Button>` plus a hidden `<input type="file">` plus a ref between them (seven
 * copies in keksdose, two each in kastlan and lenkbank).
 *
 * Every copy had to remember the same four things, and each one forgot at least one:
 *
 *  1. **Reset the input after every pick.** A file input fires `change` only when its
 *     value CHANGES, so picking the same file twice in a row — the retry after a failed
 *     upload, the second photo of the same receipt — did nothing at all, which reads as
 *     a broken button. `value = ""` after each pick; always, not per call site.
 *  2. **`type="button"`.** `<Button>` does not set it, and inside a form a bare button
 *     submits the form before the picker opens.
 *  3. **Check the file.** `accept` filters the DIALOG, not the result: the dialog's
 *     "All files" switch, a drop, and a mobile share sheet all hand over whatever the
 *     user chose. So `accept` is re-checked here, along with `maxSize`, `maxFiles` and
 *     an optional `isValid`.
 *  4. **Say no without a toast.** A rejection is reported through `onReject`, with a
 *     translated message per file, and spoken through a live region — the kit does not
 *     decide how an app surfaces errors (keksdose's proposal §1 asked for exactly that).
 *
 * The part that is not a button — the hidden input, the check, the announcement — is
 * {@link useFilePicker}, for the case where the thing that opens the picker is someone
 * else's control (a card's "Add" action, a menu item, a second button for the camera).
 */

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string the file pickers ({@link FileButton}, `FileDropzone`) render or speak.
 *  Messages are functions of the file name so a translation can put it anywhere. */
export interface FilePickerLabels {
  /** The file's type is not in `accept`. */
  rejectedType: (name: string) => string;
  /** The file is larger than `maxSize`; `maxSize` arrives formatted ("5 MB"). */
  rejectedSize: (name: string, maxSize: string) => string;
  /** The file was one too many for `maxFiles`. */
  rejectedCount: (name: string, maxFiles: number) => string;
  /** `isValid` said no and the caller gave no `invalidMessage`. */
  rejectedInvalid: (name: string) => string;
  /** Spoken instead of the per-file message when more than one file was refused. */
  rejectedMany: (count: number) => string;
  /** Spoken (and shown, on a dropzone) when `onPick` refused the WHOLE pick.
   *  Receives the number of files in it. */
  rejectedPick: (count: number) => string;
  /** Spoken after a pick the component itself echoes (the dropzone). */
  selected: (count: number, firstName: string) => string;
  /** The dropzone's remove button for one file. */
  remove: (name: string) => string;
  /** The dropzone's remove-everything button in `multiple` mode. */
  clearAll: string;
  /** Spoken after a remove / clear, since the button that was pressed is gone. */
  removed: (name: string) => string;
  cleared: string;
}

export const DEFAULT_FILE_PICKER_LABELS: FilePickerLabels = {
  rejectedType: (name) => `“${name}” is not a supported file type`,
  rejectedSize: (name, maxSize) => `“${name}” is larger than ${maxSize}`,
  rejectedCount: (name, maxFiles) =>
    `“${name}” was not added: at most ${maxFiles} ${maxFiles === 1 ? "file" : "files"}`,
  rejectedInvalid: (name) => `“${name}” cannot be used here`,
  rejectedMany: (count) => `${count} files were not added`,
  rejectedPick: (count) =>
    count === 1 ? "The file was not added" : `None of the ${count} files were added`,
  selected: (count, firstName) => (count === 1 ? `“${firstName}” selected` : `${count} files selected`),
  remove: (name) => `Remove “${name}”`,
  clearAll: "Remove all files",
  removed: (name) => `“${name}” removed`,
  cleared: "All files removed",
};

/* ── Screening ───────────────────────────────────────────────────────────── */

export type FileRejectionReason = "type" | "size" | "count" | "invalid";

/** One file the picker refused, and why. `message` is already translated (see
 *  {@link FilePickerLabels}, or the caller's `invalidMessage`), so a host that just
 *  wants to show it can render `rejections[0].message` as is. */
export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
  message: string;
}

/**
 * Does `file` satisfy an `accept` string, the way the browser's dialog reads it?
 * Comma-separated tokens: `.ext` (case-insensitive suffix of the name), `type/*`
 * (a MIME family) or an exact MIME type. An empty or absent `accept` takes anything.
 *
 * A file with no `type` — common for `.step`, `.dat`, anything the OS has no MIME
 * mapping for — can only match by extension, which is why lenkbank lists `.stp` AND
 * `model/step`: that is how `accept` has to be written for the dialog anyway.
 */
export function matchesAccept(file: File, accept: string | undefined): boolean {
  const tokens = (accept ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  // An EMPTY type is the browser saying "I don't know", not "it's something else": HEIC
  // photos on Windows without the codec arrive with `type === ""`. Refusing them
  // (0.6.0) refused iPhone photos the picker itself had just offered (keksdose). So a
  // missing type is inferred from the extension where that is unambiguous, and a file
  // whose type cannot be known at all is given the benefit of the doubt — nothing here
  // proves it does not match, and the server validates what it receives anyway.
  const type = (file.type || typeFromExtension(name) || "").toLowerCase();
  if (!type && !tokens.every((t) => t.startsWith("."))) return true;
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (!type) return false;
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/** MIME types for the extensions a browser most often leaves untyped. */
const EXTENSION_TYPES: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
};

function typeFromExtension(name: string): string | undefined {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? undefined : EXTENSION_TYPES[name.slice(dot + 1)];
}

/** What the pickers screen a pick with. All optional; nothing set accepts everything. */
export interface FileScreenOptions {
  accept?: string;
  /** Bytes. Larger files are refused with reason `"size"`. */
  maxSize?: number;
  /** How many files one pick may deliver. The rest are refused with reason `"count"`
   *  — first come, first kept. For a running cap ("at most 5 attachments") pass what
   *  is LEFT: `maxFiles={5 - attachments.length}`. */
  maxFiles?: number;
  /** The caller's own check, after `accept` and `maxSize`. */
  isValid?: (file: File) => boolean;
  /** The message for an `isValid` refusal; `labels.rejectedInvalid` otherwise. */
  invalidMessage?: string;
}

/** @internal Split a pick into the files that pass and the ones that do not. */
export function screenFiles(
  files: readonly File[],
  opts: FileScreenOptions,
  labels: FilePickerLabels,
  formatSize: (bytes: number) => string,
): { accepted: File[]; rejected: FileRejection[] } {
  const accepted: File[] = [];
  const rejected: FileRejection[] = [];
  for (const file of files) {
    let reason: FileRejectionReason | null = null;
    if (!matchesAccept(file, opts.accept)) reason = "type";
    else if (opts.maxSize !== undefined && file.size > opts.maxSize) reason = "size";
    else if (opts.isValid && !opts.isValid(file)) reason = "invalid";
    // Count last, and only against files that passed everything else: a refused
    // file should not use up one of the slots a good one could have had.
    else if (opts.maxFiles !== undefined && accepted.length >= opts.maxFiles) reason = "count";
    if (reason === null) {
      accepted.push(file);
      continue;
    }
    const message =
      reason === "type"
        ? labels.rejectedType(file.name)
        : reason === "size"
          ? labels.rejectedSize(file.name, formatSize(opts.maxSize ?? 0))
          : reason === "count"
            ? labels.rejectedCount(file.name, Math.max(0, opts.maxFiles ?? 0))
            : (opts.invalidMessage ?? labels.rejectedInvalid(file.name));
    rejected.push({ file, reason, message });
  }
  return { accepted, rejected };
}

/**
 * Judges a pick as a whole — keksdose's "refuse the pick if any file is bad", which
 * with `onFiles` + `onReject` alone had to be rebuilt from two calls in a microtask.
 *
 * Called ONCE per pick, after screening and before `onFiles` / `onReject`, with both
 * halves (either may be empty). Return `false` to refuse the whole pick: the accepted
 * files are not delivered, `onReject` still receives what screening refused, and one
 * sentence (`labels.rejectedPick`) is spoken for the pick instead of a per-file one.
 * Return nothing to let the pick through as usual.
 *
 * ```tsx
 * onPick={(ok, bad) => bad.length === 0 || false}  // all or nothing
 * ```
 */
export type FilePickHandler = (accepted: File[], rejected: FileRejection[]) => boolean | void;

/** @internal The shared tail of both pickers: run `onPick`, and say whether the pick
 *  stands. A pick with nothing accepted has nothing to refuse, so `false` there is
 *  treated as no verdict and the usual per-file messages are kept. */
export function judgePick(
  onPick: FilePickHandler | undefined,
  accepted: File[],
  rejected: FileRejection[],
): boolean {
  if (!onPick) return true;
  return onPick(accepted, rejected) !== false || accepted.length === 0;
}

/** One sentence for a whole batch of refusals: the file's own message for one, a
 *  count for several — reading out five sentences in a row helps nobody. */
export function summariseRejections(rejected: readonly FileRejection[], labels: FilePickerLabels): string {
  if (rejected.length === 0) return "";
  if (rejected.length === 1) return rejected[0].message;
  return labels.rejectedMany(rejected.length);
}

/* ── useFilePicker ───────────────────────────────────────────────────────── */

export interface UseFilePickerOptions extends FileScreenOptions {
  /** Let one pick deliver several files. Without it a drop of several keeps the first. */
  multiple?: boolean;
  /**
   * Ask a phone for its camera instead of the file chooser: `"environment"` is the
   * back camera, `"user"` the front. A HINT — desktop browsers ignore it, and Chrome
   * drops it when `multiple` is also set (a camera cannot deliver a list), which is why
   * keksdose's camera input has no `multiple`. Pass one or the other.
   */
  capture?: boolean | "user" | "environment";
  /** The files that passed, in pick order. Never called with an empty array.
   *  Optional since 0.7 for a caller that takes the pick through `onPick` alone. */
  onFiles?: (files: File[]) => void;
  /** See {@link FilePickHandler}: the whole pick at once, with the power to refuse it. */
  onPick?: FilePickHandler;
  /** The files that did not, with a translated message each. The refusals are also
   *  spoken through a live region, so this is for SHOWING them, not for a11y. */
  onReject?: (rejections: FileRejection[]) => void;
  /** `open()` and `take()` do nothing while set. */
  disabled?: boolean;
  /** Per-instance overrides of the `filePicker` label namespace. */
  labels?: Partial<FilePickerLabels>;
}

export interface UseFilePickerReturn {
  /** Open the system picker. Call it from a click handler — browsers only open a file
   *  dialog in response to a user gesture. */
  open: () => void;
  /** Screen and deliver files that arrived some other way — a drop, a paste. Honours
   *  `multiple` (only the first file without it) and every check. */
  take: (files: ArrayLike<File> | null | undefined) => void;
  /** The hidden input and the live region. Render it once, anywhere — it takes no
   *  space and needs no positioned ancestor. */
  element: ReactElement;
}

/**
 * The headless half of {@link FileButton}: a hidden file input you can open from any
 * control, with the reset, the screening and the announcement built in.
 *
 * ```tsx
 * const picker = useFilePicker({ accept: ".pdf", onFiles: ([f]) => upload(f) });
 * return <>{picker.element}<DetailTableCard onAdd={picker.open} … /></>;
 * ```
 */
export function useFilePicker({
  accept,
  multiple,
  capture,
  maxSize,
  maxFiles,
  isValid,
  invalidMessage,
  onFiles,
  onPick,
  onReject,
  disabled,
  labels: labelsProp,
}: UseFilePickerOptions): UseFilePickerReturn {
  const inputRef = useRef<HTMLInputElement>(null);
  const labels = useKitLabels("filePicker", DEFAULT_FILE_PICKER_LABELS, labelsProp);
  const fileText = useKitFileLabels();
  // Assertive: a refusal is a failure the user has to hear before they move on, and
  // it is the only thing this region ever says.
  const { announce, regionProps } = useAnnounce({ politeness: "assertive" });

  const take = (list: ArrayLike<File> | null | undefined) => {
    if (disabled || !list || list.length === 0) return;
    const all = Array.from(list);
    const files = multiple ? all : all.slice(0, 1);
    const { accepted, rejected } = screenFiles(
      files,
      // A single-file picker holds one file by definition; `maxFiles` is a multi-mode
      // cap and would only ever say "0" there if a caller passed it by mistake.
      { accept, maxSize, maxFiles: multiple ? maxFiles : undefined, isValid, invalidMessage },
      labels,
      fileText.size,
    );
    if (!judgePick(onPick, accepted, rejected)) {
      if (rejected.length > 0) onReject?.(rejected);
      announce(labels.rejectedPick(files.length));
      return;
    }
    if (accepted.length > 0) onFiles?.(accepted);
    if (rejected.length > 0) {
      onReject?.(rejected);
      announce(summariseRejections(rejected, labels));
    }
  };

  const element = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        disabled={disabled}
        // `hidden` (display: none), not `sr-only`: the control a user reaches is the
        // button, and a second, nameless tab stop for the same action is noise. A
        // display:none file input still opens on `.click()` in every current browser —
        // and, unlike `sr-only`, it cannot escape to the initial containing block and
        // stretch the page (see the note in `file-dropzone.tsx`).
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          // Copy BEFORE the reset: `files` is a live view of the input's value, and
          // clearing the value empties it.
          const picked = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          take(picked);
        }}
      />
      <span {...regionProps} />
    </>
  );

  return {
    open: () => {
      if (!disabled) inputRef.current?.click();
    },
    take,
    element,
  };
}

/* ── FileButton ──────────────────────────────────────────────────────────── */

type ButtonOwnProps = ComponentPropsWithoutRef<typeof Button>;

export interface FileButtonProps
  extends Omit<UseFilePickerOptions, "disabled">,
    // `onDrop` & co. stay the caller's own when `droppable` is off; `type` is fixed to
    // "button" (see 2. above) — a file trigger never submits a form.
    Omit<ButtonOwnProps, "type" | "children" | "accept" | "capture" | "multiple"> {
  /** The button's content — usually an icon and a word. It is the accessible name. */
  children: ReactNode;
  /** Busy: disabled, `aria-busy`, and a spinner before the content — for "uploading". */
  pending?: boolean;
  /** Also accept files dropped ON the button (lenkbank's "drop onto the button").
   *  Off by default: a button that silently takes drops is a surprise on a page that
   *  has a real drop target elsewhere. */
  droppable?: boolean;
}

/**
 * {@link useFilePicker} behind a {@link Button}: `variant` and every other button prop
 * pass through, and the ref is the `<button>` (so `ref.current.click()` opens the
 * picker from elsewhere too).
 *
 * ```tsx
 * <FileButton accept="image/*,application/pdf" capture="environment" variant="secondary"
 *   maxSize={10_000_000} onFiles={([f]) => upload(f)} onReject={([r]) => setError(r.message)}>
 *   <Camera aria-hidden /> Photograph receipt
 * </FileButton>
 * ```
 */
export const FileButton = forwardRef<HTMLButtonElement, FileButtonProps>(function FileButton(
  {
    accept,
    multiple,
    capture,
    maxSize,
    maxFiles,
    isValid,
    invalidMessage,
    onFiles,
    onPick,
    onReject,
    labels,
    pending,
    droppable,
    disabled,
    children,
    className,
    onClick,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    ...rest
  },
  ref,
) {
  const inert = Boolean(disabled || pending);
  const picker = useFilePicker({
    accept,
    multiple,
    capture,
    maxSize,
    maxFiles,
    isValid,
    invalidMessage,
    onFiles,
    onPick,
    onReject,
    labels,
    disabled: inert,
  });
  const [dragOver, setDragOver] = useState(false);

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  // Only when `droppable`: otherwise the caller's own handlers are passed untouched.
  const dropHandlers = droppable
    ? {
        onDragEnter: (e: DragEvent<HTMLButtonElement>) => {
          onDragEnter?.(e);
          if (!hasFiles(e)) return;
          e.preventDefault();
          if (!inert) setDragOver(true);
        },
        onDragOver: (e: DragEvent<HTMLButtonElement>) => {
          onDragOver?.(e);
          if (!hasFiles(e)) return;
          // Always cancel for a file drag, busy or not: an uncancelled drop makes the
          // browser NAVIGATE to the file, which loses the page.
          e.preventDefault();
          e.dataTransfer.dropEffect = inert ? "none" : "copy";
        },
        onDragLeave: (e: DragEvent<HTMLButtonElement>) => {
          onDragLeave?.(e);
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDragOver(false);
        },
        onDrop: (e: DragEvent<HTMLButtonElement>) => {
          onDrop?.(e);
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDragOver(false);
          picker.take(e.dataTransfer.files);
        },
      }
    : { onDragEnter, onDragOver, onDragLeave, onDrop };

  // `Button` is a plain function component; under React 19 `ref` is an ordinary prop
  // and reaches the `<button>` through its `...rest`. Its props type just does not
  // declare it, hence the widening here rather than a second button implementation.
  const refProp = { ref } as { ref?: Ref<HTMLButtonElement> };

  return (
    <>
      <Button
        {...rest}
        {...refProp}
        {...dropHandlers}
        type="button"
        disabled={inert}
        aria-busy={pending || undefined}
        data-drag-over={dragOver || undefined}
        className={cn(
          // A live drag gets the focus ring's colour as a ring: "let go here", in the
          // same vocabulary the button already uses for "you are here".
          dragOver && "ring-2 ring-[var(--brand)]",
          className,
        )}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) picker.open();
        }}
      >
        {/* `label={null}`: the spinner is decoration here — `aria-busy` says the same
            thing on the button, and a spoken "Loading" would run into its name. */}
        {pending && <Spinner label={null} className="size-4" />}
        {children}
      </Button>
      {picker.element}
    </>
  );
});
FileButton.displayName = "FileButton";
