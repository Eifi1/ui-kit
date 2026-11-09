/**
 * Focus that is not a request to open anything (0.50.1, keksdose B1; public since 0.58).
 *
 * A guided tour focuses a field step's first control on arrival (tours §11.8). The kit's
 * pickers that open their list on focus — Combobox (and the category pickers built on it),
 * Autocomplete, InlineEntityCombobox — opened it then too, and the list, a later layer
 * (§11.6), covered the tour card with its Next and "Leave empty". LineItems' Add did the same
 * to the new row's first field, on a phone with the full-screen sheet (keksdose live #495).
 *
 * {@link focusQuietly} marks the element for the length of its synchronous `focus()` call;
 * a picker's `onFocus` asks {@link isQuietFocus} and, when it is, takes the focus without
 * opening. React dispatches `onFocus` inside the native `focusin`, which `focus()` fires
 * synchronously, so the mark is seen by exactly that focus and by no later one. A click or
 * Tab of the person's own opens as before; from a quiet focus, ArrowDown, typing or a click
 * opens the list.
 *
 * Both are public (0.58): an app that moves the focus itself — into a row it just added, a
 * field a step points at — calls `focusQuietly`, and an app's OWN control that opens on
 * focus asks `isQuietFocus` in its `onFocus`, so the kit's quiet moves (a tour's arrival,
 * LineItems' Add) reach it too. The mark is the one module's, so the two must come from the
 * same copy of the kit.
 */
let quiet: Element | null = null;

/**
 * `el.focus(options)`, telling the kit's open-on-focus pickers (and any control that asks
 * {@link isQuietFocus}) not to open. Everything else about the focus is a plain one: the
 * element's own `onFocus` runs, `:focus-visible` follows the browser's rule, and a text
 * field still raises a phone's keyboard where the browser would.
 *
 * ```ts
 * // After adding a line, into its first field — a picker there stays shut.
 * focusQuietly(row.querySelector("input")!);
 * ```
 */
export function focusQuietly(el: HTMLElement, options?: FocusOptions): void {
  const before = quiet;
  quiet = el;
  try {
    el.focus(options);
  } finally {
    quiet = before;
  }
}

/**
 * True while `el` is being focused by {@link focusQuietly}. Ask it in an `onFocus` that
 * would open something, with the element the focus landed on (`e.currentTarget` on the
 * control itself, `e.target` in a wrapper's handler):
 *
 * ```tsx
 * onFocus={(e) => { if (!isQuietFocus(e.currentTarget)) setOpen(true); }}
 * ```
 */
export function isQuietFocus(el: Element): boolean {
  return quiet === el;
}
