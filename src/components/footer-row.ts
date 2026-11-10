// What a dialog's footer row does with a FormActions in it (0.59, keksdose live #496), in one
// place: DialogFrame's actions row and FullBleedDialog's and PickerSheet's footers are each a
// wrapping row aligned to its end, and each reads this. Internal: not in any barrel.

/**
 * A `FormActions` that is the footer's own item fills the footer.
 *
 * The footer is a `flex-wrap justify-end` row, so its items take their own width, and a
 * FormActions took the width of its buttons. STACKED (the phone layout at Large and Extra
 * large, or `stack="phone"`) its column of full-width buttons was only as wide as the widest
 * of them and stood at the footer's end edge — keksdose's shopping-list suggestion dialog wrote
 * `className="w-full"` for it. As a row, `destructive` and `start` could not reach the start:
 * `between` spread the buttons inside a box no wider than they were, so "Delete" stood beside
 * Cancel (keksdose's reconcile dialog, `w-full` by hand too).
 *
 * As a row it `grow`s: it takes what the line has left, so something of the caller's before it
 * keeps its place on the line, and Save stays at the end (FormActions' own `justify-end`).
 * Stacked it is `basis-full`: a line of its own, the footer's whole width. Child selectors on
 * the row's own `data-slot` and `data-stacked`, so the footer neither clones nor re-classes
 * the caller's element; a FormActions inside a wrapper of the caller's is the caller's layout.
 * In the footer, not in FormActions' `placement="dialog"`: a FormActions under a heading in a
 * caller's own `justify-between` row (`placement="dialog"` for its missing `pt-4`) must not
 * push the heading aside, and a footer's FormActions without the placement fills it too.
 */
export const FOOTER_FORM_ACTIONS =
  "[&>[data-slot=form-actions]]:grow [&>[data-slot=form-actions][data-stacked]]:basis-full";
