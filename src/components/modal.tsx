import { createContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { useBodyScrollLock } from "../hooks/use-body-scroll-lock";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { OVERLAY_EXIT_MS, prefersReducedMotion, useCloseTransition } from "../hooks/use-close-transition";

/**
 * Drag the panel by its top strip, in pointer space (dev#460).
 *
 * Deliberately not a library and not persisted: the offset is component state that
 * dies with the dialog. It starts only on a press that lands on the panel's own
 * chrome — never on a field, a button or a link, which is what keeps "drag to select
 * text in the textarea" working. Above `md` only: below it the panel is a
 * full-width bottom sheet with nothing beside it to uncover.
 *
 * The whole gesture stays on the PANEL — captured pointer, React handlers — rather than
 * on `window`. The first shape of this added `pointermove`/`pointerup` to `window` from
 * inside the `pointerdown` handler and took them off again from the `pointerup` handler,
 * so the teardown ran only if the gesture ended: React never sees a listener added from
 * an event handler, and an unmount mid-drag left a live `pointermove` on `window` for
 * the life of the page, pinning this hook's state with it. The one caller that enables
 * dragging is the feedback composer, which closes ITSELF on submit — a Ctrl+Enter sent
 * with the pointer still down is exactly that order of events, once per drag.
 */
function useDragOffset(enabled: boolean) {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const from = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const endDrag = () => {
    from.current = null;
  };

  return {
    /** Back to where the panel opens. A `Modal` with an `open` prop outlives its own
     *  closes, so "the position resets when the dialog closes" needs saying. */
    reset: () => setOffset(null),
    style: offset ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined,
    handlers: !enabled
      ? undefined
      : {
          onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.button !== 0 || window.innerWidth < 768) return;
            const target = e.target as HTMLElement;
            // Only the panel itself and its non-interactive chrome start a drag; a
            // press inside any control belongs to that control.
            if (target.closest("input,textarea,select,button,a,[role='button']")) return;
            from.current = { x: e.clientX, y: e.clientY, ox: offset?.x ?? 0, oy: offset?.y ?? 0 };
            try {
              // Capture is what lets the handlers live on the panel: every later
              // pointer event for this pointer retargets here, so the drag keeps
              // working once the pointer outruns the panel's own box — which it always
              // does, since the panel moves out from under it.
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // jsdom implements no pointer capture, and a browser throws
              // NotFoundError for a pointerId that is already gone. Neither is worth
              // refusing the drag: uncaptured, the panel still gets the moves that
              // land on it.
            }
          },
          onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
            const start = from.current;
            if (!start) return;
            setOffset({ x: start.ox + e.clientX - start.x, y: start.oy + e.clientY - start.y });
          },
          onPointerUp: endDrag,
          // A cancel (the browser taking the pointer for a scroll or a gesture) and a
          // lost capture both mean no `pointerup` is coming. Without them the drag would
          // stay "live" and the next move over the panel would jump it.
          onPointerCancel: endDrag,
          onLostPointerCapture: endDrag,
        },
  };
}

/**
 * The panel's own ANIMATED dismissal, for chrome rendered inside it. `DialogFrame`'s X
 * and its `actions(close)` read this, so a Cancel or an X lowers the panel exactly the
 * way Escape does — calling `onClose` from inside unmounts with no exit, which is the
 * documented limit of {@link useCloseTransition}. `null` outside a `Modal`.
 */
export const ModalCloseContext = createContext<(() => void) | null>(null);

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
/**
 * `extends ComponentPropsWithoutRef<"div">` so anything a `<div>` takes reaches the
 * PANEL — the element with `role="dialog"`, which is the one a consumer means. That is
 * where a `data-tour` anchor, a test id, an `aria-describedby` or an `aria-label` has
 * to land; before this, a closed prop list dropped all four silently (audit §api-design).
 */
export interface ModalProps extends Omit<ComponentPropsWithoutRef<"div">, "role"> {
  /** Invoked on backdrop click and on Escape. */
  onClose: () => void;
  /**
   * Who decides whether the dialog is up, when the caller wants to keep it MOUNTED.
   *
   * Left out, the dialog is open for as long as it is mounted — `{open && <Modal/>}`,
   * which is every caller before this prop and stays exactly as it was. That idiom has
   * one blind spot: a close the CALLER decides on (a save that succeeded, a
   * `setOpen(false)` from outside) unmounts the panel on the spot, with no exit,
   * because there is nothing left to animate. kastlan's `FormModal` was nothing but an
   * `if (!open) return null` gate in front of this.
   *
   * Passed, the component stays mounted while closed and renders nothing, and a flip
   * to `false` plays the same exit a dismissal does before the panel goes. The focus
   * trap, the scroll lock and the Back-gesture history entry are held only while
   * `open` is true — they are released the moment it turns false, so focus is back on
   * the trigger while the panel is still lowering. A dismissal (Escape, the backdrop,
   * Back, the frame's X) animates first and then calls `onClose`; the `false` that
   * comes back from it is not animated a second time.
   *
   * The body is unmounted once the exit has finished, as it is today, so a form inside
   * still starts fresh on the next open.
   */
  open?: boolean;
  /** `"alertdialog"` for a dialog that interrupts to ask a question the user must
   *  answer (a confirmation) — screen readers announce it with more urgency. Only the
   *  two dialog roles are allowed: the panel stays modal either way. */
  role?: "dialog" | "alertdialog";
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
  open,
  children,
  size = "md",
  className,
  labelledBy,
  onKeyDown,
  fullBleed,
  draggable,
  style,
  role = "dialog",
  ...rest
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDragOffset(Boolean(draggable));
  // Without `open`, mounted means open — the constant `true` every hook below used to
  // be given. With it, `open` itself.
  const active = open ?? true;

  // Whether the last close came through `requestClose`, i.e. has ALREADY been
  // animated. Set in the same batch as the caller's `onClose`, so the render that sees
  // `open` turn false also sees this and does not lower the panel a second time.
  const [dismissed, setDismissed] = useState(false);
  // The exit of a close the caller decided on (only reachable with `open`). Adjusted
  // during render when `open` flips — `Collapse`'s pattern — so the very render that
  // closes it already paints the `-out` classes rather than a frame of nothing.
  const [exiting, setExiting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setDismissed(false);
    setExiting(open === false && prevOpen === true && !dismissed && !prefersReducedMotion());
    if (open) drag.reset();
  }
  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setExiting(false), OVERLAY_EXIT_MS);
    return () => clearTimeout(timer);
  }, [exiting]);

  // The panel lowers itself before the caller unmounts it (live #320 rework). Every
  // dismissal below goes through `requestClose`; `onClose` still does the closing, one
  // animation later. A caller that closes the dialog ITSELF — after a save, say —
  // unmounts with no exit unless it passes `open`, which is what that prop is for.
  const { closing, requestClose } = useCloseTransition(() => {
    setDismissed(true);
    onClose();
  });
  // A panel on its way out after `open` turned false is already closed: a press on
  // its fading backdrop must not report a second close.
  const backdropClose = useBackdropClose(active ? requestClose : () => {});
  // Back means the same as Escape here. On a phone Escape doesn't exist, so without
  // this the only way out of a dialog is finding its close button — and Back, the
  // gesture everyone reaches for, navigated the page underneath instead (#172).
  // Held only while open: a closed `open={false}` dialog must not own a history entry.
  useOverlayHistory(active, requestClose);

  // Through the shared hook and not by hand: this component's own save/restore copy
  // was one half of the pair that left the page permanently unscrollable when a dialog
  // containing an open sheet was closed — see the note in use-body-scroll-lock.ts.
  useBodyScrollLock(active);

  // Focus the panel itself (not the first field) so opening doesn't pop the mobile
  // keyboard, while still moving focus into the dialog for keyboard and screen-reader
  // users. Through the shared hook since this component is where it came from — the
  // hook adds per-keystroke recomputation, a guard on restoring to a detached node,
  // and nesting, none of which this copy had. Released when `open` turns false, which
  // hands focus back to the trigger while the panel is still on its way out.
  useFocusTrap(panelRef, { active, initialFocus: "container" });
  const leaving = closing || exiting;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      if (active) requestClose();
      return;
    }
    // Tab containment lives in useFocusTrap, which listens on the panel itself.
  };

  // Portal to <body> so the `fixed inset-0 z-50` overlay escapes whatever stacking
  // context its caller sits in. Rendered inline, a modal opened from e.g. the top
  // bar (a z-30 context) could paint BELOW a sibling z-30 sticky element like the
  // expanded transaction editor (feedback #320). The tour/command-palette overlays
  // already portal for the same reason.
  if (!active && !exiting) return null;
  return createPortal(
    <div
      // Out of the accessibility tree for the length of a caller-driven exit: focus is
      // already back on the page, and an `aria-modal` panel that is leaving would hide
      // that page from a screen reader for 220ms. Not `inert` — that would let a tap
      // fall through the fading backdrop to the row underneath.
      aria-hidden={exiting || undefined}
      className={cn(
        // Live #320. The panel below rises only where it is bottom-anchored: from md up
        // it is centred, and a centred box sliding up from off-screen reads as a
        // different component arriving rather than as the same one settling.
        leaving ? "animate-overlay-out" : "animate-overlay",
        "fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center",
        fullBleed ? "p-0 md:p-4" : "p-4",
      )}
      {...backdropClose}
    >
      <div
        // `...rest` FIRST, everything the dialog needs to be a dialog after it. A
        // wrapper that spreads its own props through to this one cannot then take away
        // the role, the modality or the `tabIndex={-1}` that `useFocusTrap` needs —
        // losing any of the three is silent, and the symptom (a dialog a screen reader
        // walks straight out of) shows up nowhere near the call site that caused it.
        {...rest}
        ref={panelRef}
        // Normalised at runtime too: an untyped caller's `role="presentation"` must not
        // take the dialog role away (props-passthrough pins that).
        role={role === "alertdialog" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        {...drag.handlers}
        // MERGED, not replaced: `drag.style` is undefined until a drag starts, so
        // assigning it outright would drop a caller's own `style` on every render but
        // the ones where the panel is being dragged.
        style={{ ...style, ...drag.style }}
        className={cn(
          leaving ? "animate-sheet-out md:animate-none" : "animate-sheet md:animate-none",
          "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm outline-none",
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
        <ModalCloseContext.Provider value={requestClose}>{children}</ModalCloseContext.Provider>
      </div>
    </div>,
    document.body,
  );
}
