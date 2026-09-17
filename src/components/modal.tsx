import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { useCloseTransition } from "../hooks/use-close-transition";

/**
 * Drag the panel by its top strip, in pointer space (dev#460).
 *
 * Deliberately not a library and not persisted: the offset is component state that
 * dies with the dialog. It starts only on a press that lands on the panel's own
 * chrome — never on a field, a button or a link, which is what keeps "drag to select
 * text in the textarea" working. Above `md` only: below it the panel is a
 * full-width bottom sheet with nothing beside it to uncover.
 */
function useDragOffset(enabled: boolean) {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const from = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onPointerMove = (e: PointerEvent) => {
    const start = from.current;
    if (!start) return;
    setOffset({ x: start.ox + e.clientX - start.x, y: start.oy + e.clientY - start.y });
  };
  const onPointerUp = () => {
    from.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  return {
    style: offset ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined,
    onPointerDown: !enabled
      ? undefined
      : (e: ReactPointerEvent<HTMLDivElement>) => {
          if (e.button !== 0 || window.innerWidth < 768) return;
          const target = e.target as HTMLElement;
          // Only the panel itself and its non-interactive chrome start a drag; a
          // press inside any control belongs to that control.
          if (target.closest("input,textarea,select,button,a,[role='button']")) return;
          from.current = { x: e.clientX, y: e.clientY, ox: offset?.x ?? 0, oy: offset?.y ?? 0 };
          window.addEventListener("pointermove", onPointerMove);
          window.addEventListener("pointerup", onPointerUp);
        },
  };
}

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
  /**
   * Panel max-width: `md` (28rem), `lg` (32rem), `xl` (48rem).
   *
   * `xl` exists because two callers had already written `className="max-w-3xl"` to
   * reach it — the payee backfill's preview table and the price-merge dialog, both
   * of which hold a list and several fields rather than one question. A caller
   * patching a missing size IS the signal that the size is missing, and a
   * hand-written width in a `className` is a width nothing else can line up with.
   *
   * The panel is `w-full` under every one of them, so the cap only bites once the
   * viewport is wider than it: on a phone all three are the same full-width bottom
   * sheet. Nothing here may introduce a `min-w-*`, which is what would break that.
   */
  size?: "md" | "lg" | "xl";
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
  /**
   * Drop the backdrop's mobile margin so the panel can reach the screen edges
   * (a full-screen sheet on phones). The panel still needs its own
   * `h-[100dvh] max-w-full rounded-none` classes via `className` to fill it; the
   * desktop `md:p-4` margin is kept. Defaults to false (padded on all sizes).
   */
  fullBleed?: boolean;
  /**
   * Let the user drag the panel out of the way by its top edge (Keksdose feedback
   * dev#460: *"Make the feedback dialog draggable so I can see behind it if it
   * blocks something."*).
   *
   * Opt-in, because it only makes sense for a dialog whose content is ABOUT the page
   * behind it — the feedback composer is the case, an ordinary form is not, and a
   * draggable panel that has nothing to reveal is a control that can only get lost.
   *
   * Pointer-only by design: it is a "move this out of the way" gesture, not a layout
   * choice worth persisting, and the position resets when the dialog closes. On a
   * phone the panel is a bottom sheet the width of the screen, so dragging is
   * suppressed there — there is nothing beside it to see.
   */
  draggable?: boolean;
}

/**
 * Centered (bottom-sheet on mobile) modal dialog: dimmed backdrop, single
 * rounded panel. Owns the overlay mechanics that the hand-rolled dialogs each
 * re-implemented or lacked — backdrop-click + Escape to close, the platform Back
 * gesture (Keksdose feedback #172), background scroll lock (feedback #204), focus
 * into the panel on open and back to the trigger on close, a Tab focus trap, and
 * `role="dialog"`/`aria-modal`.
 */
export function Modal({
  onClose,
  children,
  size = "md",
  className,
  labelledBy,
  onKeyDown,
  fullBleed,
  draggable,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDragOffset(Boolean(draggable));
  // The panel lowers itself before the caller unmounts it (live #320 rework). Every
  // dismissal below goes through `requestClose`; `onClose` still does the closing, one
  // animation later. A caller that closes the dialog ITSELF — after a save, say —
  // unmounts with no exit, which is the documented limit of this.
  const { closing, requestClose } = useCloseTransition(onClose);
  const backdropClose = useBackdropClose(requestClose);
  // Back means the same as Escape here. On a phone Escape doesn't exist, so without
  // this the only way out of a dialog is finding its close button — and Back, the
  // gesture everyone reaches for, navigated the page underneath instead (#172).
  // Mounted only while open, hence the constant `true`.
  useOverlayHistory(true, requestClose);

  // Mounted only while open, hence the constant `true`. Through the shared hook and
  // not by hand: this component's own save/restore copy was one half of the pair that
  // left the page permanently unscrollable when a dialog containing an open sheet was
  // closed — see the note in use-body-scroll-lock.ts.
  useBodyScrollLock(true);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the panel itself (not the first field) so opening doesn't pop the
    // mobile keyboard, while still moving focus into the dialog for keyboard and
    // screen-reader users.
    panelRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
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
      className={cn(
        // Live #320. The panel below rises only where it is bottom-anchored: from md up
        // it is centred, and a centred box sliding up from off-screen reads as a
        // different component arriving rather than as the same one settling.
        closing ? "animate-overlay-out" : "animate-overlay",
        "fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center",
        fullBleed ? "p-0 md:p-4" : "p-4",
      )}
      {...backdropClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onPointerDown={drag.onPointerDown}
        style={drag.style}
        className={cn(
          closing ? "animate-sheet-out md:animate-none" : "animate-sheet md:animate-none",
          "w-full rounded-lg border border-slate-200 bg-white shadow-sm outline-none dark:border-slate-800 dark:bg-slate-900",
          { md: "max-w-md", lg: "max-w-lg", xl: "max-w-3xl" }[size],
          // A panel taller than the screen has to scroll ITSELF. The backdrop is
          // `fixed inset-0` and the body is scroll-locked while a dialog is open, so
          // without this the overflow simply had nowhere to go: on a phone the panel
          // is bottom-anchored, so it grew UPWARD past the top edge and the part that
          // went past it could not be reached by any gesture (Keksdose live #254, on
          // the price-merge dialog — but it was every dialog with more than a screen
          // of content). `max-h-full` resolves against the backdrop's content box,
          // which is the viewport minus its own padding, so the panel stops exactly
          // where the screen does; `overscroll-contain` keeps the fling inside it.
          //
          // Three callers had already patched themselves with `max-h-[90vh]` +
          // an inner scroller. Those still win — `cn` is tailwind-merge — and this is
          // the default they should not have needed.
          "max-h-full overflow-y-auto overscroll-contain",
          "p-4",
          // The grab affordance sits on the panel's own top strip: a drag handle of
          // its own would be one more control in a dialog that is mostly one field.
          draggable && "md:[&>*:first-child]:cursor-grab",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
