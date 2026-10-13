/**
 * The kit's focus frame (§5): a brand ring `--focus-ring-width` wide — 2 px, 3 px under
 * More contrast (tokens.css) — on keyboard focus only. ONE frame instead of the hundred
 * spelled-out `focus-visible:ring-2` copies, so the contrast setting can thicken all of
 * them at once. Compose with `ring-inset` or `ring-offset-surface` where a component needs it.
 *
 * The width is the `ring-focus` utility (tokens.css, 0.34): where this constant's variant
 * does not fit — a ring on an `after:` overlay, on links inside a footer, an outline on a
 * card — write `focus-visible:after:ring-focus` or `has-[:focus-visible]:outline-focus`
 * rather than spelling the width out.
 */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-brand";

/** Just the width of {@link FOCUS_RING}, for a ring in another colour (a danger control's,
 *  `--brand-contrast` on a filled button): `cn(FOCUS_RING_WIDTH, "focus-visible:ring-brand-contrast")`. */
export const FOCUS_RING_WIDTH = "focus-visible:ring-focus";
