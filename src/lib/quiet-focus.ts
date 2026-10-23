/**
 * Focus that is not a request to open anything (0.50.1, keksdose B1).
 *
 * A guided tour focuses a field step's first control on arrival (tours §11.8). The kit's
 * pickers that open their list on focus — Combobox (and the category pickers built on it),
 * Autocomplete, InlineEntityCombobox — opened it then too, and the list, a later layer
 * (§11.6), covered the tour card with its Next and "Leave empty".
 *
 * {@link focusQuietly} marks the element for the length of its synchronous `focus()` call;
 * a picker's `onFocus` asks {@link isQuietFocus} and, when it is, takes the focus without
 * opening. React dispatches `onFocus` inside the native `focusin`, which `focus()` fires
 * synchronously, so the mark is seen by exactly that focus and by no later one. A click or
 * Tab of the person's own opens as before; from a quiet focus, ArrowDown, typing or a click
 * opens the list.
 */
let quiet: Element | null = null;

/** `el.focus(options)`, telling the kit's open-on-focus pickers not to open. */
export function focusQuietly(el: HTMLElement, options?: FocusOptions): void {
  const before = quiet;
  quiet = el;
  try {
    el.focus(options);
  } finally {
    quiet = before;
  }
}

/** True while `el` is being focused by {@link focusQuietly}. */
export function isQuietFocus(el: Element): boolean {
  return quiet === el;
}
