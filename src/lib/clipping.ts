/** Internal (not exported from the package): the Tooltip's auto-portal check. */

/** Whether anything between `el` and `<body>` clips or scrolls its content — the
 *  containers an absolutely positioned bubble would be cut off by, or would widen.
 *  `<body>` and `<html>` are not counted: their `overflow` belongs to the viewport (a
 *  dialog's scroll lock sets it), and the viewport clips a portalled bubble just the
 *  same. */
export function hasClippingAncestor(el: Element | null): boolean {
  if (typeof window === "undefined" || !el) return false;
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) return false;
    const style = window.getComputedStyle(node);
    if (style.overflowX !== "visible" || style.overflowY !== "visible") return true;
  }
  return false;
}
