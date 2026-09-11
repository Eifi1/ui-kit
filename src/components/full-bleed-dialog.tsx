import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/cn";
import { useBackdropClose } from "./modal";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";

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
}: {
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
}) {
  const backdropClose = useBackdropClose(onClose);
  // The page behind must not scroll or jump under the overlay (feedback #204).
  useBodyScrollLock(open);
  useOverlayHistory(open && backCloses, onClose);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      {...backdropClose}
    >
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden bg-white shadow-xl dark:bg-slate-900",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
          <div className="min-w-0 font-medium">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1 shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>
        {/* px-3, not px-4: every pixel of chrome here is width the form fields lose
            on a phone (feedback #32). The body is the only thing that scrolls, so the
            header stays put and the page underneath cannot move at all. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
