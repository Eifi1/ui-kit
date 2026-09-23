import { useEffect, useRef } from "react";

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
 *   - **Nests.** An overlay can open another — a picker inside a dialog. Only the
 *     innermost trap handles a keystroke, and closing it hands control back to the one
 *     underneath. Innermost is decided by DOM containment rather than by mount order;
 *     see the note on `TRAP_ATTR` for why the obvious stack is wrong.
 *     `use-overlay-history.ts` reasons about the same nesting problem for the back
 *     button; this is the focus half of it.
 */

/**
 * Tabbable descendants, in DOM order.
 *
 * Deliberately the same selector `Modal` used, rather than a more thorough one that
 * also walks `inert`, `visibility: hidden` and open `<details>`: this is the set that
 * has been in production across three apps, and widening it here would change which
 * element receives focus in overlays nobody asked me to change the behaviour of.
 */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

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
   */
  initialFocus?: "container" | "first" | (() => HTMLElement | null);
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  { active = true, restoreFocus = true, initialFocus = "container" }: FocusTrapOptions = {},
): void {
  // Latest-ref so a caller passing an inline `initialFocus` thunk — which every caller
  // will — does not tear the trap down and re-engage it on each render, stealing focus
  // back to the top of the panel mid-interaction.
  const optsRef = useRef({ restoreFocus, initialFocus });
  useEffect(() => {
    optsRef.current = { restoreFocus, initialFocus };
  });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    container.setAttribute(TRAP_ATTR, "");
    const previouslyFocused = document.activeElement as HTMLElement | null;

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
        (el) => !inNestedTrap(el),
      );

    const { initialFocus: how } = optsRef.current;
    if (typeof how === "function") {
      (how() ?? container).focus();
    } else if (how === "first") {
      (tabbables()[0] ?? container).focus();
    } else {
      container.focus();
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

      if (!optsRef.current.restoreFocus) return;
      // `isConnected` is the whole point: restoring to a node that has been removed
      // sends focus to <body> and the user loses their place entirely. When the
      // original is gone, leave focus where the browser put it rather than moving it
      // somewhere arbitrary — a wrong guess is worse than no move.
      if (previouslyFocused?.isConnected) previouslyFocused.focus?.();
    };
  }, [active, containerRef]);
}
