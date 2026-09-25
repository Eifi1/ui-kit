import { useRef, useState } from "react";
import type { DragEvent, ReactElement } from "react";
import { useFilePicker } from "../components/file-button";
import type { UseFilePickerOptions } from "../components/file-button";

/**
 * Turn ANY element into a file drop target — kastlan's ask, for the document list of
 * a booking and the rows of its gantt, which are drop targets without being a
 * `FileDropzone` (a dashed box with a Browse button inside would be the wrong thing
 * to draw over a list).
 *
 * ```tsx
 * const { dropProps, isOver, element } = useFileDrop({ accept: ".pdf", multiple: true,
 *   maxSize: 10_000_000, onFiles: attach, onReject: ([r]) => setError(r.message) });
 * return <>{element}<ul {...dropProps} data-drop-over={isOver || undefined}>…</ul></>;
 * ```
 *
 * The screening is `useFilePicker`'s own — `accept` re-checked (a drop ignores the
 * dialog's filter), `maxSize`, `maxFiles`, `isValid`, `onPick` — so a file refused by
 * `FileButton` is refused here in the same words. It comes with `open()` as well, so
 * the same options can also back a "choose a file" menu item beside the drop target.
 */

/** `useFilePicker`'s options, minus `capture` (a camera does not take drops). */
export type UseFileDropOptions = Omit<UseFilePickerOptions, "capture">;

/** Spread onto the drop target. Four handlers, nothing else: the element keeps its
 *  own role, name and focus behaviour. */
export interface FileDropProps<E extends Element = Element> {
  onDragEnter: (e: DragEvent<E>) => void;
  onDragOver: (e: DragEvent<E>) => void;
  onDragLeave: (e: DragEvent<E>) => void;
  onDrop: (e: DragEvent<E>) => void;
}

export interface UseFileDropReturn<E extends Element = Element> {
  dropProps: FileDropProps<E>;
  /** A FILE drag is over the target (and it is not `disabled`). Style from this. */
  isOver: boolean;
  /** Open the system picker with the same options — from a click handler only. */
  open: () => void;
  /** Screen and deliver files that arrived another way (a paste). */
  take: (files: ArrayLike<File> | null | undefined) => void;
  /** The live region that speaks a refusal (and the picker's hidden input). Render it
   *  once, anywhere; without it a refusal reaches `onReject` but is not announced. */
  element: ReactElement;
}

/** Whether a drag carries files — a dragged link, text or a row of the page does not,
 *  and must not light the target up or be swallowed by it. */
export function dragHasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

/**
 * @internal The drag half on its own, shared with `FileDropzone`.
 *
 * `dragenter`/`dragleave` fire for every CHILD the pointer crosses: moving from the
 * target onto a label inside it is a leave of the target followed by an enter of the
 * label, which bubbles. A boolean flipped by each one flickers off and on across
 * every child, and `relatedTarget` — the usual fix — is `null` in Safari's drag
 * events. So this counts: +1 per enter, -1 per leave, over while above zero, and a
 * drop resets it (the drop replaces the leave that would have balanced the enter).
 *
 * A file drag stops propagating here, so a target nested in another (a row inside a
 * page-wide drop area) takes its own drop, and the outer one's count falls back to
 * zero while the pointer is over the inner one — only one of them lights up.
 */
export function useDragTarget<E extends Element = Element>({
  disabled,
  onDropFiles,
}: {
  disabled?: boolean;
  onDropFiles: (files: FileList | File[]) => void;
}): { dropProps: FileDropProps<E>; isOver: boolean } {
  const depth = useRef(0);
  const [over, setOver] = useState(false);

  const dropProps: FileDropProps<E> = {
    onDragEnter: (e) => {
      if (!dragHasFiles(e)) return;
      e.stopPropagation();
      e.preventDefault();
      depth.current += 1;
      if (!disabled) setOver(true);
    },
    onDragOver: (e) => {
      if (!dragHasFiles(e)) return;
      e.stopPropagation();
      // Always cancelled for a file drag, disabled or not: an uncancelled drop makes
      // the browser NAVIGATE to the file, which loses the page.
      e.preventDefault();
      e.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    onDragLeave: (e) => {
      if (!dragHasFiles(e)) return;
      e.stopPropagation();
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (e) => {
      if (!dragHasFiles(e)) return;
      e.stopPropagation();
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      if (!disabled) onDropFiles(e.dataTransfer.files);
    },
  };

  return { dropProps, isOver: over && !disabled };
}

export function useFileDrop<E extends Element = Element>(
  options: UseFileDropOptions,
): UseFileDropReturn<E> {
  const picker = useFilePicker(options);
  const { dropProps, isOver } = useDragTarget<E>({
    disabled: options.disabled,
    onDropFiles: picker.take,
  });
  return { dropProps, isOver, open: picker.open, take: picker.take, element: picker.element };
}
