/**
 * Reading direction, as the DOM has it — internal, not exported from the barrel.
 *
 * The kit lays itself out with logical classes (`ps-*`, `end-*`, `text-start`), which
 * need no JavaScript. These helpers are for the two things CSS cannot do:
 *
 * - **Arrow keys.** ←/→ mean previous/next in LTR and the reverse in RTL. Resolve the
 *   key through {@link horizontalStep} instead of comparing to "ArrowRight".
 * - **Portals.** A panel portalled to `document.body` leaves the subtree whose `dir`
 *   it inherited. Read the anchor's direction with {@link dirOf} and put it on the
 *   portalled root, and position it from the anchor's START edge, not `rect.left`.
 */

export type Direction = "ltr" | "rtl";

/** The effective direction at `el`: its nearest `[dir]` ancestor (or itself), else the
 *  document's, else LTR. Attribute-based on purpose — jsdom computes no `direction`. */
export function dirOf(el: Element | null | undefined): Direction {
  const source =
    el?.closest("[dir]") ??
    (typeof document !== "undefined" ? document.documentElement : null);
  return source?.getAttribute("dir") === "rtl" ? "rtl" : "ltr";
}

export function isRtl(el: Element | null | undefined): boolean {
  return dirOf(el) === "rtl";
}

/**
 * +1 for a key that moves FORWARD along the reading direction, -1 for backward, 0 for
 * any other key. ArrowRight is forward in LTR and backward in RTL.
 */
export function horizontalStep(key: string, el: Element | null | undefined): 1 | -1 | 0 {
  if (key !== "ArrowRight" && key !== "ArrowLeft") return 0;
  const forward = (key === "ArrowRight") !== isRtl(el);
  return forward ? 1 : -1;
}
