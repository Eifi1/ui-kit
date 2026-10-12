// What the two TYPED comboboxes share — Combobox (free text) and InlineEntityCombobox
// (an option id): the portalled suggestion list, the focus-open guard against a mouse's
// back button, and the write lock's Enter. Moved out of combobox.tsx with the split of
// InlineEntityCombobox into its own module (MOD-9, refactor audit 2026-10), so neither
// imports the other. Internal: no name here is part of the package.
import { useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanel } from "../hooks/use-anchored-panel";
import { useAnchorDir } from "./use-anchor-dir";
import { SUGGESTION_LIST_CLASS, suggestionRowClass } from "./combobox-core";

// One look for both combobox flavors — the suggestion list and its rows
// must stay pixel-identical between the free-text and the id-keyed variant (and
// `Autocomplete`, which shares them from the core).
const LIST_CLASS = SUGGESTION_LIST_CLASS;

/**
 * "This focus came from a mouse button that is not the left one" — for the two
 * fields (Combobox, InlineEntityCombobox), which open their list ON FOCUS.
 *
 * Keksdose live #309 rework: *"When clicking the mouse back button now while hovering
 * one of the selects it opens the select as long as I am holding the button down and
 * closes select after releasing."* A mouse's BACK button focuses whatever it is
 * pressed over, exactly as the left one does — the browser only reserves the
 * NAVIGATION for itself — so a field that opens on focus opened a list for a gesture
 * that means "go back", and the release then navigated out from under it. Measured on
 * his own budget: `mousePressed button=back` over the transfer form's account field
 * left `aria-expanded=true`, and the release took the whole add card with it.
 *
 * The press is recorded and read by the focus that the SAME press causes: focus is
 * mousedown's default action, dispatched inside the same task, so the flag is always
 * read before the `setTimeout` below can drop it. And it is always dropped — a press
 * that focuses nothing (the pointer was over a disabled field, the button was
 * released elsewhere) must not leave a latch that swallows the next Tab.
 *
 * Only the OPEN is suppressed, never the navigation: Back still goes back, which is
 * the whole of what the button was pressed for.
 */
export function usePrimaryPressOnly() {
  const auxPress = useRef(false);
  return {
    onMouseDown: (e: { button: number }) => {
      if (e.button === 0) return;
      auxPress.current = true;
      setTimeout(() => {
        auxPress.current = false;
      }, 0);
    },
    /** True while handling the focus a non-primary press just caused. */
    fromAuxButton: () => auxPress.current,
  };
}

/**
 * The desktop suggestion list, PORTALLED and anchored to the field.
 *
 * It used to be an `absolute` `<ul>` inside the field's own wrapper, and that is
 * Keksdose live #295: *"Category select inside the list is not readable. Some sort
 * of z indexes issue?"*. It was not z-index — a stacking context can be out-ranked,
 * but `overflow` cannot be argued with. The receipt's line table sits in a card
 * carrying `overflow-clip`, so a list opened from the last visible row was cut off
 * at the card's edge: measured at 256px tall with 150px of it painted.
 *
 * Every other panel in this package already learned this — `DropdownPanel`'s
 * `anchorRef` form, the calculator popover, the tooltip — so this reuses the same
 * hook rather than inventing a second placement. What that buys beyond the clip:
 * the list flips above the field when there is no room below, and it caps its own
 * height against the VISIBLE viewport, which on a phone means the on-screen
 * keyboard (see {@link useAnchoredPanel}).
 *
 * `panelRef` is not optional plumbing. Portalled, the list is no longer a
 * descendant of the wrapper, so {@link useDropdown}'s outside-click test answers
 * "outside" for a click on the list itself — the first option a user picked would
 * close the dropdown having picked nothing.
 */
export function SuggestionList({
  id,
  anchorRef,
  panelRef,
  children,
}: {
  /** What the field's `aria-controls` names. */
  id: string;
  anchorRef: RefObject<HTMLElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { rect, top, bottom, maxHeight, above } = useAnchoredPanel(anchorRef, true, { preferredHeight: 256 });
  const dir = useAnchorDir(anchorRef, true);
  if (!rect) return null;
  return createPortal(
    <div
      ref={panelRef}
      // z-50, not the old z-30: the list is a child of <body> now, so it is
      // competing with the app's own overlays rather than with its own siblings.
      className="fixed z-50"
      // Portalled out of the form's `dir`; the field's is put back. The list is
      // exactly the field's width, so `left` places it in either direction.
      dir={dir}
      // Flipped above, the list hangs from its bottom edge: it filters as the user
      // types, and a short one placed by `top` floated above the field (keksdose K1).
      style={{ ...(above ? { bottom } : { top }), left: rect.left, width: rect.width }}
    >
      <ul id={id} role="listbox" data-clips="" className={LIST_CLASS} style={{ maxHeight }}>
        {children}
      </ul>
    </div>,
    document.body,
  );
}

export const rowClass = suggestionRowClass;

/**
 * The write lock on the two TYPED fields — {@link Button}'s `disabledReason`
 * path, for an input (keksdose G2).
 *
 * `readOnly` rather than `disabled`, as everywhere the kit locks a field: still focusable,
 * so the reason in the Tooltip reaches a keyboard; refusing keys, so nothing typed can
 * become a value; and FIELD_BASE paints a `[readonly]` field in the settled grey a
 * disabled one wears. No list opens, by focus, click, chevron or arrow — and Enter is
 * swallowed, so a locked field does not submit the form around it either (Select's
 * lock, `LOCKED_SELECT_KEYS`). Every other key is left alone: the arrows and Home/End
 * still move the caret through a long value someone is trying to read.
 */
export function lockedKeyDown(e: { key: string; preventDefault: () => void }) {
  if (e.key === "Enter") e.preventDefault();
}
