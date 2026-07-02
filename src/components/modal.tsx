import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Backdrop handlers that close only when a press starts AND ends on the
 * backdrop itself. A plain onClick fires on mouseup, so dragging a text
 * selection that starts inside the panel and releases over the backdrop would
 * dismiss the dialog (feedback #254) — and the reverse drag would too, since
 * click targets the common ancestor of the down/up elements.
 */
export function useBackdropClose(onClose: () => void) {
  const pressStartedOnBackdrop = useRef(false);
  return {
    onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => {
      pressStartedOnBackdrop.current = e.target === e.currentTarget;
    },
    onMouseUp: (e: ReactMouseEvent<HTMLDivElement>) => {
      const started = pressStartedOnBackdrop.current;
      pressStartedOnBackdrop.current = false;
      if (started && e.target === e.currentTarget) onClose();
    },
  };
}

// Tab-cycle target set: the interactive descendants the focus trap rotates
// through. Querying live (per keystroke) means dynamically rendered fields are
// included automatically.
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  /** Invoked on backdrop click and on Escape. */
  onClose: () => void;
  children: ReactNode;
  /** Panel max-width. */
  size?: "md" | "lg";
  /** Extra classes for the panel (e.g. `space-y-3` for form content spacing). */
  className?: string;
  /** id of the heading element, wired to `aria-labelledby`. */
  labelledBy?: string;
  /**
   * Extra key handling on the panel (e.g. Ctrl/Cmd+Enter to submit). Runs first;
   * if it calls `preventDefault()` the built-in Escape/Tab handling is skipped
   * for that event.
   */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Centered (bottom-sheet on mobile) modal dialog: dimmed backdrop, single
 * rounded panel. Owns the overlay mechanics that the hand-rolled dialogs each
 * re-implemented or lacked — backdrop-click + Escape to close, background
 * scroll lock (feedback #204), focus into the panel on open and back to the
 * trigger on close, a Tab focus trap, and `role="dialog"`/`aria-modal`.
 */
export function Modal({ onClose, children, size = "md", className, labelledBy, onKeyDown }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropClose = useBackdropClose(onClose);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the panel itself (not the first field) so opening doesn't pop the
    // mobile keyboard, while still moving focus into the dialog for keyboard and
    // screen-reader users.
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab within the dialog. Elements inside a portal'd panel (e.g. an open
    // dropdown) live outside this subtree, so this handler never fires for them
    // — they manage their own focus.
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusables || focusables.length === 0) {
      e.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Portal to <body> so the `fixed inset-0 z-50` overlay escapes whatever stacking
  // context its caller sits in. Rendered inline, a modal opened from e.g. the top
  // bar (a z-30 context) could paint BELOW a sibling z-30 sticky element like the
  // expanded transaction editor (feedback #320). The tour/command-palette overlays
  // already portal for the same reason.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
      {...backdropClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full rounded-lg border border-slate-200 bg-white shadow-sm outline-none dark:border-slate-800 dark:bg-slate-900",
          size === "lg" ? "max-w-lg" : "max-w-md",
          "p-4",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
