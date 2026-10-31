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
  const source = el?.closest("[dir]") ?? (typeof document !== "undefined" ? document.documentElement : null);
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

/**
 * Where a key moves the focus in a list with ONE tab stop (a roving tabindex): the index
 * to focus from `at` among `count` items, or `undefined` for a key that moves nothing.
 * ←/→ along `dir` — → is next in `ltr` and previous in `rtl` — ↓/↑ as next and previous,
 * Home and End to the ends. With `wrap`, past the last is the first and before the first
 * the last (a ring: PieChart's slices); without, the ends hold (a plane: Treemap's tiles).
 *
 * The charts each mapped the keys themselves, and differently at the ends (0.52 code
 * review of treemap.tsx, finding 9); the end rule is now a word at the call.
 *
 * `dir` and not an element to read it off (0.52 code review, deep, charts, findings 1 and
 * 14): a list in the page's flow takes the page's (`dirOf(el)`), but a plot is laid out
 * left to right in any page (see `ChartContainer`) and passes `"ltr"` — read off the
 * element, Treemap's → walked an RTL page's tiles backwards, against the picture.
 */
export function rovingTarget(
  key: string,
  dir: Direction,
  at: number,
  count: number,
  wrap: boolean,
): number | undefined {
  const physical = key === "ArrowRight" ? 1 : key === "ArrowLeft" ? -1 : 0;
  const step = dir === "rtl" ? -physical : physical;
  const to = step
    ? at + step
    : key === "ArrowDown"
      ? at + 1
      : key === "ArrowUp"
        ? at - 1
        : key === "Home"
          ? 0
          : key === "End"
            ? count - 1
            : undefined;
  if (to === undefined || count <= 0) return undefined;
  return wrap ? ((to % count) + count) % count : Math.max(0, Math.min(count - 1, to));
}
