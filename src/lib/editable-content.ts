/**
 * Internal (not exported from the package): the kit's one reading of "this is editable
 * content", for the five places that leave typed text alone — `useHotkey`'s typing check,
 * the tour's Enter and arrows (tour-overlay `ownsKey`), the bulk bar's arrows
 * (`ownsArrows`), the clipboard's minus (clipboard-minus `isEditable`) and the Lightbox's
 * paging keys.
 *
 * 0.54 wrote it for `useHotkey` (keksdose audit follow-up, 2026-11-01); the other three
 * read `isContentEditable` alone, or a `[contenteditable=""], [contenteditable="true"]`
 * selector beside it, and had the gap it closed (0.54 follow-up). The Lightbox's
 * `[contenteditable='true']` selector had it too (0.52 code review 2026-10-31, held to
 * 0.55). Here, so the five cannot drift, and in lib/ because it is DOM reading with no
 * component code: the
 * clipboard handler, which `UiKitProvider` loads on its own, must not bring a component
 * with it.
 */

/**
 * Whether `el` is editable content — `isContentEditable`, read from the attributes where
 * the engine has no such property. jsdom is one: there a hotkey fired while typing in a
 * contenteditable, the tour stepped on and the bulk bar took the caret's arrows, so no
 * test could show an editor keeping its keys, and an engine without the property would
 * do the same.
 *
 * The nearest element with a `contenteditable` that names a state decides: `""`,
 * `"true"` and `"plaintext-only"` edit, `"false"` does not — a `false` island inside an
 * editor (a mention chip) is not typed in. Any other value is the attribute's
 * invalid-value default, which inherits, so the search goes on to the next one up.
 * Keywords are case-insensitive. None at all: editable only in a `designMode` document.
 *
 * An `Element`, not only an `HTMLElement`: the clipboard asks about whatever node a
 * selection starts in, an SVG icon inside an editor included.
 */
export function isEditableContent(el: Element): boolean {
  const native = (el as { isContentEditable?: boolean }).isContentEditable;
  if (native !== undefined) return native;
  for (let at = el.closest("[contenteditable]"); at; at = at.parentElement?.closest("[contenteditable]") ?? null) {
    const state = (at.getAttribute("contenteditable") ?? "").toLowerCase();
    if (state === "" || state === "true" || state === "plaintext-only") return true;
    if (state === "false") return false;
  }
  return el.ownerDocument.designMode === "on";
}
