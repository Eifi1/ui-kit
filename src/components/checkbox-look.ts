// The kit's checkbox box as a look, in one place (0.58): Checkbox paints it on its native
// `<input>`, and a checkable ListItem draws it as a span at the start of its row (the row
// itself is the checkbox there, so a second control inside it would be nested). Both read
// these, so a row's box cannot drift from a Checkbox's. Internal: not in any barrel.

/** The box: 1rem (16px at Normal), so it grows with the text, on the surface colour. */
export const CHECKBOX_BOX_CLASS = "size-4 shrink-0 rounded border border-strong bg-surface shadow-sm transition-colors";

/** Checked or mixed: the brand fill under the tick or the dash. */
export const CHECKBOX_BOX_ON_CLASS = "border-brand bg-brand";

/** The tick or the dash, drawn over the fill (stroke width 3, as Checkbox draws them). */
export const CHECKBOX_GLYPH_CLASS = "size-3 text-brand-contrast";
