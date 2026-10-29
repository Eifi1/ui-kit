import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
 *     still exists rather than to nothing.
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

/**
 * Candidate tab stops, in DOM order — narrowed by {@link isTabStop} to the ones a Tab
 * really reaches.
 *
 * The selector is the one `Modal` used. On its own it was not enough (round 0.34
 * BUG-4): only the bare `[tabindex]` clause excluded `-1`, so a `button`, an `input` or
 * a link taken out of the tab order still counted. A panel that ends in a roving grid —
 * the calendar's days, the month grid, the picker sheet's rows, every one of them `-1`
 * but the active cell — then had a "last" stop no Tab ever reaches: Tab from the real
 * last stop was not wrapped and walked out of the open panel, and Shift+Tab from the
 * first landed on a cell that is not a stop at all.
 */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A stop the browser's own Tab would land on: in the tab order (`tabIndex` ≥ 0) and not
 * inside something `hidden` or `inert`. Removes only elements a native Tab never
 * reaches, so no correct order changes. `visibility: hidden` and closed `<details>` are
 * still not walked — they need layout, which this list has never read.
 */
const isTabStop = (el: HTMLElement): boolean => el.tabIndex >= 0 && !el.closest("[hidden],[inert]");

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
  /** Return focus to whatever had it before the trap engaged. Default `true`. */
  restoreFocus?: boolean;
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
  { active = true, restoreFocus = true, initialFocus = "container" }: FocusTrapOptions = {},
): void {
  // Latest-ref so a caller passing an inline `initialFocus` thunk — which every caller
  // will — does not tear the trap down and re-engage it on each render, stealing focus
  // back to the top of the panel mid-interaction. Written in a LAYOUT effect so that
  // the trap's cleanup, which runs after the layout effects of the same commit, reads
  // this render's `active` rather than the last one's — see the cleanup for why.
  const optsRef = useRef({ active, restoreFocus, initialFocus });
  useLayoutEffect(() => {
    optsRef.current = { active, restoreFocus, initialFocus };
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
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        // A tabbable inside a NESTED open overlay belongs to that overlay's trap, not
        // to this one — otherwise the outer list spans both panels and Tab from the
        // inner panel's last control wraps to the OUTER panel's first.
        (el) => isTabStop(el) && !inNestedTrap(el),
      );

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
      // `isConnected` is the whole point: restoring to a node that has been removed
      // sends focus to <body> and the user loses their place entirely. When the
      // original is gone, leave focus where the browser put it rather than moving it
      // somewhere arbitrary — a wrong guess is worse than no move.
      if (opener?.isConnected) (opener as HTMLElement).focus?.();
    };
  }, [active, containerRef, opener]);
}
