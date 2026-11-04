import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { returnFocus, tabStops, tabStopsAround } from "../lib/focus-left";

/**
 * Keep keyboard focus inside an open overlay, and give it back when it closes.
 *
 * Extracted from `Modal`, which was the ONLY component in this package that did any of
 * this. Every other overlay — the full-bleed dialog a phone's row editor opens, the
 * picker sheet, the numpad, the tour card — declared `role="dialog" aria-modal="true"`
 * and then left focus on the page behind it. That is the worst of the two possible
 * bugs: assistive technology hides the page because of `aria-modal`, while the user's
 * focus is still down there in the part that is now hidden, so Tab walks through
 * controls the screen reader refuses to describe.
 *
 * What this does beyond Modal's original copy:
 *
 *   - **Recomputes the tabbable list on every Tab**, not once when the overlay opens.
 *     These panels have conditionally-rendered contents — a search box that appears
 *     once options load, a "clear" button that exists only while a filter is set — and
 *     a list captured at open time traps focus against elements that have since gone.
 *   - **Guards the restore target.** The element focused before opening may have left
 *     the DOM by the time the overlay closes (the row that owned the button was
 *     filtered away). Calling `.focus()` on a detached node silently drops focus to
 *     `<body>`, which for a keyboard user means losing their place in the page
 *     entirely. When the target is gone, focus falls back to the nearest thing that
 *     still exists rather than to nothing — the kit's one rule for it, lib/focus-left's
 *     `returnFocus` (0.52 code review 2026-10-31, held to 0.55; see the cleanup). Until
 *     then this said so and did not: a gone opener left the focus on `<body>`.
 *   - **Leaves an app's own autofocus alone** (0.33.1). React honours a child's
 *     `autoFocus` while it commits, and this hook's effect runs AFTER that commit, so
 *     focusing the container there took focus straight back off the field the app had
 *     asked for. See `initialFocus`.
 *   - **Nests.** An overlay can open another — a picker inside a dialog. Only the
 *     innermost trap handles a keystroke, and closing it hands control back to the one
 *     underneath. Innermost is decided by DOM containment rather than by mount order;
 *     see the note on `TRAP_ATTR` for why the obvious stack is wrong.
 *     `use-overlay-history.ts` reasons about the same nesting problem for the back
 *     button; this is the focus half of it.
 */

// The trap's reading of "a Tab lands here" is lib/focus-left's `tabStops` — the kit's one
// copy of the rule since the 0.52 code review (round 0.34 BUG-4's history is there).
// Re-exported where refactor audit 2026-10-30, DUP-9 put them, for a part that walks Tab
// over something that is not a trap (the tour's field + card ring).
export { firstTabStop, tabStops } from "../lib/focus-left";

/**
 * Marks a container whose trap is currently active.
 *
 * "Which trap is innermost?" is answered by DOM CONTAINMENT, not by mount order. The
 * obvious implementation — a module-level stack pushed in the effect — is wrong, and
 * wrong in a way that passes a casual reading: React runs CHILD effects before PARENT
 * effects, so a nested overlay pushes first and the outer one ends up on top of the
 * stack, claiming to be innermost. The outer trap then handles the keystroke and wraps
 * focus to its own first element, jumping the user out of the picker they had open.
 *
 * An attribute on the live DOM cannot disagree with the DOM.
 */
const TRAP_ATTR = "data-focus-trap";

export interface FocusTrapOptions {
  /** Trap only while this is true. Mount-time `true` is the common case. */
  active?: boolean;
  /**
   * Give the focus back as the trap is released — the kit's one rule, lib/focus-left's
   * `returnFocus` (0.52 code review 2026-10-31, held to 0.55): only a focus that was lost
   * or is still inside the container is moved; to the {@link opener}, else to what had
   * the focus as the trap engaged, else to the tab stops that stood around that, nearest
   * first; never to `<body>`. Default `true`.
   */
  restoreFocus?: boolean;
  /**
   * The control this overlay was opened from, when it knows it — its trigger. The focus
   * goes back there first, and to what had it as the trap engaged only when the trigger
   * cannot take it. Read as the trap is released. A Popover names its trigger: on Safari
   * (and Firefox on macOS) a click does not focus the button it lands on, so "what had the
   * focus" was the page, and the focus fell to `<body>` on close (0.55).
   */
  opener?: () => Element | null;
  /**
   * What to focus when the trap engages. Default is the container itself, which is
   * what `Modal` does and why: focusing the first FIELD pops the software keyboard on
   * a phone the moment a dialog opens, before the user has asked to type.
   * The container needs `tabIndex={-1}` for this to work.
   *
   * `"container"` and `"first"` both step aside when focus is ALREADY inside the
   * container, on something other than the container itself. That is a child the app
   * focused on purpose — an `autoFocus`, which React honours before this hook's effect
   * runs — and the keyboard it brings up is the one the user was promised. Moving focus
   * off it lost keksdose's create card its amount field the instant it got it, and on a
   * phone the numpad sheet with it, which shows only while the field is focused (live
   * #402). A function is the caller's explicit choice and is always followed.
   */
  initialFocus?: "container" | "first" | (() => HTMLElement | null);
}

/** Whatever has focus right now; nothing on the server, where there is no document. */
function focusedElement(): Element | null {
  return typeof document === "undefined" ? null : document.activeElement;
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  { active = true, restoreFocus = true, initialFocus = "container", opener: namedOpener }: FocusTrapOptions = {},
): void {
  // Latest-ref so a caller passing an inline `initialFocus` thunk — which every caller
  // will — does not tear the trap down and re-engage it on each render, stealing focus
  // back to the top of the panel mid-interaction. Written in a LAYOUT effect so that
  // the trap's cleanup, which runs after the layout effects of the same commit, reads
  // this render's `active` rather than the last one's — see the cleanup for why.
  const optsRef = useRef({ active, restoreFocus, initialFocus, opener: namedOpener });
  useLayoutEffect(() => {
    optsRef.current = { active, restoreFocus, initialFocus, opener: namedOpener };
  });

  // Where focus was BEFORE the trap engaged: the element it is given back to on close.
  //
  // Read DURING the render that turns the trap on, and that timing is the point. React
  // honours a child's `autoFocus` while it commits that render, before any effect runs,
  // so the effect below asking `document.activeElement` would get the child, inside the
  // overlay. Restoring to that on close aimed focus at the dialog that was closing —
  // already out of the DOM, so focus fell to <body> rather than going back to the
  // button that opened it.
  //
  // State adjusted during render (the pattern `Modal` uses for `open`) rather than a
  // ref written there: set once per opening and cleared on release, so a re-render
  // while open cannot replace it with something inside, and StrictMode's second render
  // and second effect both see the same element. `undefined` means "not captured";
  // `null` is a capture that found nothing.
  const [opener, setOpener] = useState<Element | null | undefined>(undefined);
  if (active && opener === undefined) setOpener(focusedElement());
  else if (!active && opener !== undefined) setOpener(undefined);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    container.setAttribute(TRAP_ATTR, "");

    /** Is `node` inside a trap nested within this one? */
    const inNestedTrap = (node: Element | null) => {
      if (!node) return false;
      const owner = node.closest(`[${TRAP_ATTR}]`);
      return owner !== null && owner !== container;
    };

    const tabbables = () =>
      tabStops(container, { includeSelf: false }).filter(
        // A tabbable inside a NESTED open overlay belongs to that overlay's trap, not
        // to this one — otherwise the outer list spans both panels and Tab from the
        // inner panel's last control wraps to the OUTER panel's first.
        (el) => !inNestedTrap(el),
      );

    // Where the focus goes if the opener has left by the release (the row that owned it
    // was filtered away, deleted from the dialog it opened): the stops that stood around
    // it, nearest first — after it, then before — as AlertBanner's × reads them. Read
    // NOW, while the opener still has a place in the page to measure from; held by this
    // closure only, so it goes with the trap. Three a side: one that takes the focus is
    // all that is wanted.
    const around: HTMLElement[] = [];
    if (optsRef.current.restoreFocus && opener instanceof Element && opener.isConnected && opener !== document.body) {
      const { after, before } = tabStopsAround(opener, 3);
      for (const stop of [...after, ...before]) if (!container.contains(stop)) around.push(stop);
    }

    const { initialFocus: how } = optsRef.current;
    const focused = document.activeElement;
    // A child that already has focus was given it on purpose — see `initialFocus`.
    const childHasFocus = focused !== container && container.contains(focused);
    if (typeof how === "function") {
      (how() ?? container).focus();
    } else if (!childHasFocus) {
      (how === "first" ? (tabbables()[0] ?? container) : container).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      // Only the innermost trap acts. The event bubbles through every ancestor
      // container, so without this an outer dialog and an inner picker both handle one
      // Tab and fight over where focus lands.
      if (inNestedTrap(document.activeElement)) return;

      // Recomputed per keystroke — see the note at the top of this file.
      const items = tabbables();
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || activeEl === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // On the container, not the document: a portalled child panel (an open dropdown
    // rendered to <body>) is outside this subtree and manages its own focus, which is
    // the behaviour Modal's comment describes and consumers already depend on.
    container.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      container.removeAttribute(TRAP_ATTR);

      // Only when the trap is really being released: the container has left the page,
      // or `active` has turned false. StrictMode runs this cleanup once more right after
      // mounting, with the overlay still up, and then the effect again — and React does
      // not re-apply `autoFocus` for that second run. Restoring here would pull focus
      // out of the autofocused field for good: live #402 again, in development.
      if (container.isConnected && optsRef.current.active) return;
      if (!optsRef.current.restoreFocus) return;
      // The kit's one rule (lib/focus-left `returnFocus`; 0.52 code review 2026-10-31,
      // held to 0.55), in this, the releasing commit. Only a focus that fell with the
      // panel, or is still in one on its way out, is moved: an app's own `focus()` in
      // `onClose` is kept, where this used to put the opener over it. Then the named
      // trigger, what had the focus as the trap engaged, and the stops that stood around
      // that — where a gone opener used to leave the focus on <body> ("a wrong guess is
      // worse than no move"; the header promised the nearest thing that still exists).
      // `isConnected` and the focus are checked for each, as restoring to a removed or a
      // disabled node is the drop to <body> this guards against.
      const named = optsRef.current.opener?.();
      returnFocus({
        opener: named ?? opener,
        fallback: [named ? opener : null, ...around],
        closing: container.isConnected ? container : null,
      });
    };
  }, [active, containerRef, opener]);
}
