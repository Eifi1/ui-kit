import { useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode, Ref, RefObject } from "react";
import { createPortal } from "react-dom";
import { anchoredInline, useAnchoredPanel, viewportSize } from "../hooks/use-anchored-panel";
import { runOwnKeyDown, takeEscape, useDismissLayer, useOutsideClick } from "../hooks/use-dismiss";
import { useFocusTrap } from "../hooks/use-focus-trap";
import { lengthPx, useRemPx, type RemLength } from "../hooks/use-breakpoint";
import { cn } from "../lib/cn";
import { dirOf } from "../lib/direction";
import type { Direction } from "../lib/direction";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_POPOVER_LABELS } from "./popover-labels";
// From ../lib/refs, not field-parts (round 0.36): field-parts renders a HelpPopover for a
// field's `help`, so importing from there would close a cycle, as it did for Tooltip.
import { mergeRefs } from "../lib/refs";

/** The panel's accessible name. A `role="dialog"` with no name announces as "dialog"
 *  and nothing else, which is worse than the unlabelled div it replaced — so it is a
 *  prop with an English default, like every other string this package renders. Callers
 *  should pass the control's own name ("Filter", "Choose a date"); the default is only
 *  there so an unmigrated call site is still named. */
export interface PopoverLabels {
  panel: string;
}

// Defined in ./popover-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_POPOVER_LABELS };

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
  /**
   * The panel's width: `"18rem"` (the default) grows with the text size — the panel
   * holds text, and a 288 px calendar at 150 % cut its own month off (0.32,
   * docs/text-size-harmonization.md §3.2). A plain number is px, fixed, as before.
   * Either way the panel is never wider than the viewport less 8 px a side: 18rem is
   * 432 px at Extra large, more than a 360 px phone has.
   */
  width?: number | RemLength;
  labels?: LabelOverride<PopoverLabels>;
  /** Id for the panel, so a trigger wearing `role="combobox"` can `aria-controls` it.
   *  Required by ARIA on that role, and the panel is rendered here rather than by the
   *  caller, so the id has to come in from outside. */
  panelId?: string;
  /** Extra classes for the PANEL. The trigger is the caller's own element. */
  className?: string;
  /** The PANEL, while it is open — where the rest of the props go (0.34, API-2, refactor
   *  audit 2026-10). Merged with the panel's own ref (focus trap, outside click), so
   *  neither loses it. The trigger is the caller's own element, ref and all. */
  ref?: Ref<HTMLDivElement>;
}

/** 288 px at Normal, in rem so it follows the text size (§3.2). */
const POPOVER_WIDTH: RemLength = "18rem";

/** The gap the panel keeps from either edge of the viewport, in px. */
const EDGE = 8;

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
  onKeyDown: onKeyDownProp,
  ref,
  ...rest
}: PopoverProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const setPanel = useMemo(() => mergeRefs(panelRef, ref), [ref]);
  const [open, setOpen] = useState(false);
  // The trigger's reading direction, read when it is pressed. The panel is portalled to
  // <body>, out of any `dir="rtl"` subtree the trigger sits in, so without carrying it
  // across a right-to-left calendar or filter rendered left-to-right.
  const [dir, setDir] = useState<Direction>("ltr");
  const close = () => setOpen(false);
  const toggle = () => {
    setDir(dirOf(triggerRef.current));
    setOpen((v) => !v);
  };
  // prop > `<UiKitProvider labels={{ popover }}>` > English. The provider's
  // `popover.panel` is only the last-resort name for a panel no caller named.
  const text = useKitLabels("popover", DEFAULT_POPOVER_LABELS, labels);

  // Align the panel's END edge to the trigger's — right in LTR, left in RTL; it was
  // always `rect.right`, so an RTL panel hung off the wrong side — and clamp it
  // horizontally; the
  // hook owns the vertical half — below by default, flipped above (and height-capped)
  // when that is where the room is, e.g. once a mobile keyboard has eaten the bottom
  // of the screen (feedback #135). It re-measures on scroll/resize.
  const placement = useAnchoredPanel(triggerRef, open);
  const rect = placement.rect;
  // In px for the arithmetic below, at the text size in force; capped at the glass — the
  // root's client width, not `innerWidth`, which on a phone is the layout viewport grown
  // by whatever overflows (live #381, Wave 2 DUP-7).
  const remPx = useRemPx();
  const glass = rect ? viewportSize().width : 0;
  const panelWidth = rect ? Math.min(lengthPx(width, remPx), Math.max(0, glass - 2 * EDGE)) : 0;
  const pos = rect
    ? {
        // Flipped above, the panel hangs from its bottom edge, so one shorter than its
        // cap still meets the trigger (keksdose K1); the edge not in use is cleared.
        top: placement.above ? undefined : placement.top,
        bottom: placement.above ? placement.bottom : undefined,
        left: anchoredInline(rect, panelWidth, { dir, align: "end", edge: EDGE, viewportWidth: glass }).left,
      }
    : null;

  // A press in a list opened from inside — a CurrencySelect's, a combobox's, another
  // popover's — reaches the panel through the React tree and is inside (dev#623).
  const markInside = useOutsideClick([triggerRef, panelRef], close, open);
  // A layer on the Escape stack while open (Wave 2, DUP-1): a list opened inside closes
  // first, and the dialog this popover sits in only after it — the calculator on an
  // amount field in a Modal is exactly that.
  const layer = useDismissLayer(open, close);

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
    // A caller's own handler first (0.32.2: RowActions stops Enter / Space at the panel);
    // it used to be dropped, overwritten by this one. A `preventDefault()` on Escape
    // there keeps the popover open — the owner's claim, as on the dialogs. And as there,
    // the handler sees Escape only while this popover is the layer on top: a tooltip or a
    // menu open over it takes that press first (round 0.35 R2, the dialogs' rule).
    runOwnKeyDown(e, onKeyDownProp, layer);
    // Focus is in here, the normal case: the key is handed to the top layer and STOPPED,
    // so it does not travel on up the React tree to a dialog around the popover.
    takeEscape(e);
  };

  return (
    <>
      {trigger({ open, toggle, ref: triggerRef })}
      {open && pos &&
        createPortal(
          /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the
             dialog container, per the APG dialog pattern: `onKeyDown` is Escape-to-close for
             whatever inside it holds focus. */
          <div
            // `...rest` first: the role, the id the trigger's `aria-controls` points at,
            // the `tabIndex` the trap needs and the measured position are what make this
            // a popover, and a caller reaching for a `data-tour` anchor must not be able
            // to remove one of them by accident.
            {...rest}
            ref={setPanel}
            // A kit layer, for the tour's layer order (0.50, docs/tours-harmonization.md §11.6).
            data-kit-layer=""
            role="dialog"
            id={panelId}
            // The caller's own `aria-label` wins over {@link PopoverLabels.panel}, which
            // is the package's English fallback for an unnamed panel. Both name the same
            // element; the DOM spelling is the one being standardised on, so where both
            // are present it is the one that survives.
            aria-label={ariaLabel ?? text.panel}
            dir={rest.dir ?? dir}
            // Without it the panel cannot take focus at all, and the trap above would
            // silently do nothing on a panel whose children are not yet tabbable.
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onPointerDownCapture={(e) => {
              rest.onPointerDownCapture?.(e);
              markInside(e);
            }}
            style={{
              // Merged over the caller's, never replaced by it: these are measured
              // against the trigger every scroll and resize, and a panel that dropped
              // them would paint at the top-left of the viewport.
              ...style,
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: panelWidth,
              maxHeight: placement.maxHeight,
            }}
            className={cn(
              "z-50 overflow-y-auto rounded-md border border-subtle bg-surface p-3 shadow-lg outline-none",
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
