import { useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useEscapeKey, useOutsideClick } from "../hooks/use-dismiss";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";

/** The panel's accessible name. A `role="dialog"` with no name announces as "dialog"
 *  and nothing else, which is worse than the unlabelled div it replaced — so it is a
 *  prop with an English default, like every other string this package renders. Callers
 *  should pass the control's own name ("Filter", "Choose a date"); the default is only
 *  there so an unmigrated call site is still named. */
export interface PopoverLabels {
  panel: string;
}

// Exported since the kit grew one label tree (`UiKitLabels`, src/i18n): the complete
// English reference a translator works from has to be able to name every namespace.
export const DEFAULT_POPOVER_LABELS: PopoverLabels = {
  // "Pop-up", not "Popover": the panel's accessible name is read to USERS, and
  // "popover" is a developer's word for it (reported by keksdose, 0.5.0). Only a
  // bare Popover falls back to this — the kit's own pickers name their panels.
  panel: "Pop-up",
};

/**
 * Exported, and extending the `<div>` attributes, so a consumer wrapping this — which is
 * what `DateField` and `FilterPopover` in this very package do — can hand anything
 * through to the PANEL: a `data-tour` anchor for the kit's own guided tour, a test id,
 * an `aria-describedby`, or an `aria-label` naming this particular popover.
 *
 * `children` is omitted from those attributes rather than inherited: here it is a render
 * prop taking the panel's `close`, not a `ReactNode`, so the two cannot be reconciled.
 */
export interface PopoverProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  trigger: (state: { open: boolean; toggle: () => void; ref: RefObject<HTMLButtonElement | null> }) => ReactNode;
  children: (close: () => void) => ReactNode;
  width?: number;
  labels?: Partial<PopoverLabels>;
  /** Id for the panel, so a trigger wearing `role="combobox"` can `aria-controls` it.
   *  Required by ARIA on that role, and the panel is rendered here rather than by the
   *  caller, so the id has to come in from outside. */
  panelId?: string;
  /** Extra classes for the PANEL. The trigger is the caller's own element. */
  className?: string;
}

const POPOVER_WIDTH = 288;

/**
 * Portal-rendered popover anchored under its trigger button. The panel is fixed
 * to the viewport (so table/overflow ancestors can't clip it) and re-aligns on
 * scroll/resize; it closes on outside-click and Escape.
 *
 * ## Trapped, not merely focused — and why, because it is the closer call
 *
 * The audit's finding was that this panel *"portals out of the tab order with no role
 * and no focus move"*: Tab from the trigger went straight past the panel into the page
 * behind it, so the calendar, the calculator keypad and every column filter in the kit
 * were mouse-only. Two shapes fix that, and a popover is not automatically a dialog, so
 * this was chosen rather than inherited:
 *
 *  - **The light one** — move focus in on open, hand it back on close, and let Tab walk
 *    OUT of the panel into whatever follows the trigger. That is the right shape for a
 *    non-modal popover sitting inline in the document.
 *  - **The trap** — Tab cycles inside the panel; Escape and a click outside are the
 *    ways out. What is here.
 *
 * The deciding fact is the portal. This panel is rendered to the END of `<body>`, not
 * beside its trigger, so "let Tab walk out" does not mean "carry on from the trigger" —
 * it means land at the end of the document, several hundred controls from where the
 * user was. Tabbing out of it would be a worse place to arrive than the one the finding
 * complains about, and fixing that properly needs a sentinel-and-return dance that
 * nothing in this package has. The trap gets the user back to the trigger every time,
 * because `useFocusTrap` restores focus on close.
 *
 * And the panels this kit actually opens are self-contained: pick a date, tap out a
 * sum, narrow a column. Each of them commits and closes, and each already has two
 * documented ways out wired above — Escape and an outside press — so containment costs
 * a keyboard user nothing they had.
 *
 * **It stays non-modal in every other respect**, deliberately: no backdrop, no body
 * scroll lock, and no `aria-modal`, so the page behind is still readable by a screen
 * reader, still scrollable, and still clickable — clicking it is what dismisses this.
 * Only Tab is contained. A popover that took the page away as well would be a
 * {@link Modal}, and there is one of those.
 */
export function Popover({
  trigger,
  children,
  width = POPOVER_WIDTH,
  labels,
  panelId,
  className,
  style,
  "aria-label": ariaLabel,
  ...rest
}: PopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);
  // prop > `<UiKitProvider labels={{ popover }}>` > English. The provider's
  // `popover.panel` is only the last-resort name for a panel no caller named.
  const text = useKitLabels("popover", DEFAULT_POPOVER_LABELS, labels);

  // Align the panel's right edge to the trigger's and clamp it horizontally; the
  // hook owns the vertical half — below by default, flipped above (and height-capped)
  // when that is where the room is, e.g. once a mobile keyboard has eaten the bottom
  // of the screen (feedback #135). It re-measures on scroll/resize.
  const placement = useAnchoredPanel(triggerRef, open);
  const rect = placement.rect;
  const pos = rect
    ? {
        top: placement.top,
        left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
      }
    : null;

  useOutsideClick([triggerRef, panelRef], close, open);
  useEscapeKey(close, open);

  useFocusTrap(panelRef, {
    active: open && pos !== null,
    // The panel keeps a focus one of its own children has already taken. `FilterPopover`
    // autofocuses its text box on mount — that is what the press on "Filter" was FOR,
    // and it is a prop there precisely so the popover keeps it — and a trap that
    // unconditionally focused the container would take it straight back off again,
    // one effect later and invisibly.
    initialFocus: () => {
      const panel = panelRef.current;
      const active = document.activeElement;
      return panel?.contains(active) ? (active as HTMLElement) : panel;
    },
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    // `useEscapeKey` above listens on the document and still covers the case where
    // focus somehow is not in here. This handler is for the case that focus IS, which
    // is now the normal one — and it exists to STOP the key, because a popover opened
    // from inside a `Modal` (the calculator on an amount field is exactly that) would
    // otherwise have its Escape travel on up the React tree and close the dialog
    // underneath as well. Closing twice is harmless — `close` is a state setter, not a
    // caller's callback — so the two paths cannot double-fire anything.
    e.stopPropagation();
    close();
  };

  return (
    <>
      {trigger({ open, toggle, ref: triggerRef })}
      {open && pos &&
        createPortal(
          <div
            // `...rest` first: the role, the id the trigger's `aria-controls` points at,
            // the `tabIndex` the trap needs and the measured position are what make this
            // a popover, and a caller reaching for a `data-tour` anchor must not be able
            // to remove one of them by accident.
            {...rest}
            ref={panelRef}
            role="dialog"
            id={panelId}
            // The caller's own `aria-label` wins over {@link PopoverLabels.panel}, which
            // is the package's English fallback for an unnamed panel. Both name the same
            // element; the DOM spelling is the one being standardised on, so where both
            // are present it is the one that survives.
            aria-label={ariaLabel ?? text.panel}
            // Without it the panel cannot take focus at all, and the trap above would
            // silently do nothing on a panel whose children are not yet tabbable.
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
              // Merged over the caller's, never replaced by it: these four are measured
              // against the trigger every scroll and resize, and a panel that dropped
              // them would paint at the top-left of the viewport.
              ...style,
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width,
              maxHeight: placement.maxHeight,
            }}
            className={cn(
              "z-50 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3 shadow-lg outline-none",
              className,
            )}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}
