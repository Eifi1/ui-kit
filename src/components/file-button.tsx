import { useId, useState } from "react";
import type { ComponentPropsWithoutRef, DragEvent, ReactNode, Ref } from "react";
import { cn } from "../lib/cn";
import { hasContent } from "../lib/presence";
import { useKitLabels } from "../i18n/kit-labels";
import { Button, Spinner } from "./ui";
import { Tooltip } from "./tooltip";
import { useCommitReason, type CommitScope } from "./write-lock";
import { DEFAULT_FILE_PICKER_LABELS } from "../hooks/use-file-picker-labels";
import { useFilePicker, type UseFilePickerOptions } from "../hooks/use-file-picker";

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

// The picker's words, its screening and `useFilePicker` live in hooks/use-file-picker
// since 0.34 (MOD-8, refactor audit 2026-10): useFileDrop is built on the hook, and a hook
// importing a component module was a folder-level back-edge. Re-exported here, so every
// import of them from this module keeps working.
export { DEFAULT_FILE_PICKER_LABELS };
export {
  formatAccept,
  judgePick,
  matchesAccept,
  screenFiles,
  summariseRejections,
  useFilePicker,
} from "../hooks/use-file-picker";
export type {
  FilePickHandler,
  FilePickerLabels,
  FileRejection,
  FileRejectionReason,
  FileScreenOptions,
  UseFilePickerOptions,
  UseFilePickerReturn,
} from "../hooks/use-file-picker";

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
  /**
   * Show what was picked beside the button: the file's name, or "3 files selected"
   * (`filePicker.selected`) for several — a native `<input type="file">` says this,
   * and a bare button that takes a file and says nothing leaves the user to trust it.
   * The read-out is a polite live region and describes the button, so it is heard
   * when it changes and again on focus. It holds the last ACCEPTED pick: a refused
   * file leaves it as it was. Off by default, so the button's layout is unchanged.
   */
  showFileName?: boolean;
  /**
   * Why picking is not available — {@link Button}'s `disabledReason`, with the picker's
   * half added (keksdose K3): the button is `aria-disabled` but stays focusable, the
   * reason is in the kit Tooltip and its description, a click opens no picker, and a
   * `droppable` button takes no drop (the drag is still cancelled, so the browser does
   * not navigate to the file). Wins over `disabled`, as on Button.
   */
  disabledReason?: ReactNode;
  /**
   * This pick COMMITS — an upload that starts on pick, an attachment saved at once.
   * Under a locked {@link WriteLockProvider} it takes the `disabledReason` path with
   * the lock's reason (which wins over one of its own). No provider, or an unlocked
   * one: no effect. A picker that only fills a form the user saves later is not a
   * commit, and is left live — the form's Save carries the lock.
   */
  commit?: CommitScope;
  /** The `<button>`. A React 19 ref prop since 0.34 (MOD-4, refactor audit 2026-10); it
   *  was `forwardRef`. */
  ref?: Ref<HTMLButtonElement>;
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
export function FileButton({
  ref,
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
  showFileName = false,
  disabled,
  disabledReason: ownDisabledReason,
  commit,
  children,
  className,
  onClick,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  ...rest
}: FileButtonProps) {
  const disabledReason = useCommitReason(commit, ownDisabledReason);
  const locked = hasContent(disabledReason);
  const inert = Boolean(disabled || pending);
  // What takes no files: busy, disabled, or locked with a reason. Kept apart from
  // `inert`, which is what reaches the button's NATIVE `disabled` — a locked button
  // stays focusable (Button's `disabledReason` path), so `locked` must not get there.
  const refusing = inert || locked;
  const [picked, setPicked] = useState<readonly File[]>([]);
  const pickedId = useId();
  const pickerLabels = useKitLabels("filePicker", DEFAULT_FILE_PICKER_LABELS, labels);
  const picker = useFilePicker({
    accept,
    multiple,
    capture,
    maxSize,
    maxFiles,
    isValid,
    invalidMessage,
    onFiles: showFileName
      ? (files) => {
          setPicked(files);
          onFiles?.(files);
        }
      : onFiles,
    onPick,
    onReject,
    labels,
    disabled: refusing,
  });
  const pickedText =
    picked.length === 0 ? "" : picked.length === 1 ? picked[0].name : pickerLabels.selected(picked.length, picked[0].name);
  const [dragOver, setDragOver] = useState(false);

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  // Only when `droppable`: otherwise the caller's own handlers are passed untouched.
  const dropHandlers = droppable
    ? {
        onDragEnter: (e: DragEvent<HTMLButtonElement>) => {
          onDragEnter?.(e);
          if (!hasFiles(e)) return;
          e.preventDefault();
          if (!refusing) setDragOver(true);
        },
        onDragOver: (e: DragEvent<HTMLButtonElement>) => {
          onDragOver?.(e);
          if (!hasFiles(e)) return;
          // Always cancel for a file drag, busy or not: an uncancelled drop makes the
          // browser NAVIGATE to the file, which loses the page.
          e.preventDefault();
          e.dataTransfer.dropEffect = refusing ? "none" : "copy";
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

  const button = (
    <Button
      {...rest}
      {...refProp}
      {...dropHandlers}
      type="button"
      disabled={inert}
      // Resolved here rather than passed on as `commit`: the picker above has to know
      // it is locked too, and one resolution keeps the two from disagreeing.
      disabledReason={locked ? disabledReason : undefined}
      aria-busy={pending || undefined}
      aria-describedby={
        showFileName && pickedText
          ? [rest["aria-describedby"], pickedId].filter(Boolean).join(" ")
          : rest["aria-describedby"]
      }
      data-drag-over={dragOver || undefined}
      className={cn(
        // A live drag gets the focus ring's colour as a ring: "let go here", in the
        // same vocabulary the button already uses for "you are here".
        dragOver && "ring-2 ring-brand",
        // Beside a long file name it is the NAME that gives way, never the button.
        showFileName && "shrink-0",
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
  );

  if (!showFileName) {
    return (
      <>
        {button}
        {picker.element}
      </>
    );
  }
  return (
    // One inline row, so the name sits beside the button wherever the button sits; the
    // name truncates rather than pushing the row wider (at Normal: from Large up it wraps,
    // `truncate-until-large`, text size §10.17), and the full list is in the
    // kit's own Tooltip — not a native `title` (0.16.0 shipped one: the one-tooltip rule
    // since keksdose dev#523, and a title never opens on touch). Lazy, so the closed
    // bubble adds nothing to the read-out's text.
    <span className="inline-flex max-w-full min-w-0 items-center gap-2">
      {button}
      {/* The live region is the OUTER span and never remounts: a Tooltip with an empty
          label renders no wrapper, so wrapping the region itself would swap its element
          the moment the first file arrives — and a fresh live region may not announce. */}
      <span
        id={pickedId}
        aria-live="polite"
        data-slot="file-button-name"
        className="flex min-w-0 text-sm text-secondary"
      >
        <Tooltip label={picked.map((f) => f.name).join(", ")} lazy className="min-w-0">
          <span className="block truncate-until-large">{pickedText}</span>
        </Tooltip>
      </span>
      {picker.element}
    </span>
  );
}
