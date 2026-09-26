/** Internal (not exported from the package): the Tooltip's auto-portal check. The
 *  attribute name itself IS exported, as `CLIPS_ATTRIBUTE` from the tooltip module. */

/**
 * The explicit "this element clips or scrolls" marker. A container carrying it counts
 * as clipping whatever its computed `overflow` says.
 *
 * Why a marker as well as the computed style: the kit's containers get their
 * `overflow` from Tailwind classes, and jsdom computes no stylesheet — so under test
 * every scroller reads `overflow: visible`, the Tooltip stays in place, and its always-
 * mounted bubble shows up in the cell's text (keksdose 0.10: "CheckingChecking"). The
 * browser and the test then disagreed about where the bubble lives, and apps pinned
 * `portal` on every tooltip in a table to make them agree. The kit's own scrollers
 * (DataTable's body, Table's wrapper) carry the marker, so the answer is the same in
 * both; an app marks its own with `{ [CLIPS_ATTRIBUTE]: "" }` or a literal `data-clips`.
 */
export const CLIPS_ATTRIBUTE = "data-clips";

/** Whether anything between `el` and `<body>` clips or scrolls its content — the
 *  containers an absolutely positioned bubble would be cut off by, or would widen.
 *  Either the computed `overflow` says so or the element carries
 *  {@link CLIPS_ATTRIBUTE}. `<body>` and `<html>` are not counted: their `overflow`
 *  belongs to the viewport (a dialog's scroll lock sets it), and the viewport clips a
 *  portalled bubble just the same. */
export function hasClippingAncestor(el: Element | null): boolean {
  if (typeof window === "undefined" || !el) return false;
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) return false;
    if (node.hasAttribute(CLIPS_ATTRIBUTE)) return true;
    const style = window.getComputedStyle(node);
    if (style.overflowX !== "visible" || style.overflowY !== "visible") return true;
  }
  return false;
}
