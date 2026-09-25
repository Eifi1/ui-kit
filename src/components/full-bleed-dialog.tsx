import { useRef } from "react";
import { createPortal } from "react-dom";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { useBackdropClose } from "./modal";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { useCloseTransition } from "../hooks/use-close-transition";
import { useFocusTrap } from "../hooks/use-focus-trap";

/**
 * Named and exported, because `ComponentProps<typeof FullBleedDialog>` was the only way
 * to say "the props of this" and five call sites across keksdose and kastlan had already
 * written one (audit §api-design).
 *
 * It extends the `<div>` attributes so a caller can reach the OUTER element — the one
 * carrying `role="dialog"`, and therefore the one an `aria-label`, an
 * `aria-describedby` or a `data-tour` anchor belongs on. {@link className} keeps going
 * to the panel inside it, which is what it has always meant here.
 */
export interface FullBleedDialogProps extends ComponentPropsWithoutRef<"div"> {
  open: boolean;
  /** The X, the backdrop (where one shows) and — unless {@link backCloses} is off —
   *  the platform Back gesture all call this. */
  onClose: () => void;
  /** What the header strip shows beside the close button. */
  header?: ReactNode;
  closeLabel: string;
  children: ReactNode;
  /**
   * Push a history entry so Back dismisses this dialog instead of navigating
   * (Keksdose feedback #172). On by default, because a full-screen form that ignores
   * the phone's universal "go back" gesture does not merely fail to close — the
   * navigation lands somewhere else with the form still notionally open.
   *
   * **Off for a caller whose open state is already in the URL.** The transactions
   * create card is `?action=new`, so Back already pops it through the router; a
   * sentinel on top of that would cost two presses to close one dialog. One owner of
   * the Back press, always.
   */
  backCloses?: boolean;
  /** Extra classes for the PANEL (not the backdrop). */
  className?: string;
  /**
   * A row pinned under the scrolling body — an Apply, a Save. Keksdose's `RangeSheet`
   * (reports/report-range-field.tsx) is a hand-rolled copy of this dialog for want of
   * exactly this slot: a date range picked on a phone is committed by a sticky Apply,
   * and a button at the end of the body scrolls away with the calendar.
   *
   * Outside the scroller, so it stays put without `position: sticky` (which would
   * need the body to be the scroll container of its own child and paint over the
   * last field); padded for the home indicator, since it is the panel's bottom edge.
   */
  footer?: ReactNode;
}

/**
 * The phone's full-screen dialog: a panel that covers the viewport edge to edge.
 *
 * Not {@link Modal}, and that is a decision rather than an omission. Keksdose feedback
 * #32: the inset panel #204 shipped left a strip of page showing beside it on a phone,
 * and tapping that strip dismissed a form mid-edit. With no backdrop exposed there is
 * nothing to mis-tap, so the X is the way out — `backdropClose` stays wired for any
 * layout that does leave a backdrop visible, and costs nothing where none is.
 *
 * ## Why it is a component
 *
 * It was markup inside `data-table.tsx`, where it is the phone's row EDITOR. Keksdose
 * live #307's follow-up needed the same shell for the transactions CREATE card —
 * *"Is the creation window of the tx still different than the edit window? Since the tx
 * list still appears below when scrolling down?"* — and the two answers to that are
 * either one component or two copies that drift. Every previous convergence in that app
 * drifted the moment a second surface was written beside the first, which is what
 * `field-layer-parity` exists to catch one layer down.
 *
 * So the panel, the header strip, the scrolling body, the body-scroll lock and the Back
 * handling are all here, once.
 *
 * ## What the caller still owns
 *
 * The HEADER's content, because the two callers name themselves differently: the row
 * editor shows the row's own first column, the create card a plain title. And `open`,
 * because who decides is the caller's business — see {@link backCloses}.
 */
export function FullBleedDialog({
  open,
  onClose,
  header,
  closeLabel,
  children,
  backCloses = true,
  className,
  footer,
  onMouseDown,
  onMouseUp,
  onKeyDown,
  ...rest
}: FullBleedDialogProps) {
  // Every way OUT goes through `requestClose`, so the panel lowers itself before the
  // caller unmounts it (live #320 rework). `onClose` is still what finally runs — this
  // only delays it by the length of the animation.
  const { closing, requestClose } = useCloseTransition(onClose);
  const backdropClose = useBackdropClose(requestClose);
  // The page behind must not scroll or jump under the overlay (feedback #204).
  useBodyScrollLock(open);
  useOverlayHistory(open && backCloses, requestClose);

  const dialogRef = useRef<HTMLDivElement>(null);
  // The half of "modal" this dialog was only claiming. It has said
  // `aria-modal="true"` since it was extracted from `data-table.tsx`, which tells
  // assistive technology to hide everything outside it — while the user's focus stayed
  // on the row they tapped, in the part that is now hidden. Tab then walked them
  // through a table the screen reader would not describe, and on a phone this dialog
  // covers the whole screen, so there was nothing on screen to say where they were.
  //
  // `initialFocus` is left at the default — the dialog itself, not the first field.
  // This is the phone's row EDITOR and its first child is usually an input; focusing it
  // would pull the software keyboard up over half the form before the user has said
  // which field they came for. `Modal` made the same call for the same reason.
  useFocusTrap(dialogRef, { active: open });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The caller's handler first (keksdose's transaction-search keeps its list keys on
    // the dialog); a `preventDefault()` IN THAT HANDLER claims the key, Escape included.
    // Only there: a descendant's preventDefault does not count. A SearchField in the
    // header prevents Escape to stop Chromium clearing a type=search input, and in
    // 0.8.0 that silently stopped Escape from closing the dialog (keksdose).
    const preventedBefore = e.defaultPrevented;
    onKeyDown?.(e);
    const claimedByCaller = !preventedBefore && e.defaultPrevented;
    if (claimedByCaller || e.key !== "Escape") return;
    // On the panel, the way `Modal` does it, and NOT through `useEscapeKey`: this
    // dialog is the thing a `PickerSheet` opens on top of, and a document-level
    // listener cannot tell which of the two the user meant. One press would dismiss
    // the sheet AND throw away the edit behind it — Keksdose live #309 (*"Mouse Back
    // does not only close the select but also the whole edit or create dialog"*) on a
    // different key. The sheet's own handler stops the event here, so the innermost
    // overlay is the one that closes, which is only true because focus is now in it.
    e.stopPropagation();
    requestClose();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      // `animate-overlay` on the backdrop and `animate-sheet` on the panel (live #320):
      // the backdrop fades, the panel rises from the bottom edge it is anchored to.
      // Both are no-ops under prefers-reduced-motion — see tokens.css.
      //
      // …and the same two backwards while `closing`, which is the #320 rework. The
      // backdrop keeps taking pointer events on the way out: a tap during those 220ms
      // is a tap on a dialog that is leaving, and letting it through to the row
      // underneath would open a second one.
      //
      // `...rest` first, the dialog's own contract after it. A caller adding a
      // `data-tour` anchor must not be able to take away the role, the modality or the
      // `tabIndex` below by passing one of them too — this is the element the focus
      // trap holds, and each of those failures is invisible on screen.
      {...rest}
      className={cn(
        "fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 outline-none",
        closing ? "animate-overlay-out" : "animate-overlay",
      )}
      role="dialog"
      aria-modal="true"
      // `tabIndex={-1}` is what makes the line above more than a claim: without it the
      // container cannot take focus and `useFocusTrap` silently does nothing.
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      // COMPOSED with the backdrop's, not overridden by them. These two used to ride
      // `...rest` and then lose to `{...backdropClose}` spread after it, silently —
      // and the one caller about to pass one is keksdose's RangeSheet, whose
      // `onMouseDown={(e) => e.stopPropagation()}` is its dev#477 fix: a press in a
      // portalled sheet must not reach a document-level "outside click" listener,
      // which would unmount the day cell before its `click`. The caller's runs first;
      // the backdrop's still runs after it, since it is the same element.
      onMouseDown={(e) => {
        onMouseDown?.(e);
        backdropClose.onMouseDown(e);
      }}
      onMouseUp={(e) => {
        onMouseUp?.(e);
        backdropClose.onMouseUp(e);
      }}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden bg-[var(--bg-surface)] shadow-xl",
          closing ? "animate-sheet-out" : "animate-sheet",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3">
          <div className="min-w-0 flex-1 font-medium">{header}</div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={closeLabel}
            className="-me-1 shrink-0 rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <X className="size-5" />
          </button>
        </div>
        {/* px-3, not px-4: every pixel of chrome here is width the form fields lose
            on a phone (feedback #32). The body is the only thing that scrolls, so the
            header stays put and the page underneath cannot move at all. */}
        {/* `min-h-0` so it is the BODY that gives way to a footer, not the footer that
            is pushed off the bottom edge. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">{children}</div>
        {footer !== undefined && footer !== null && footer !== false && (
          <div
            data-full-bleed-footer=""
            className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-3 pt-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
