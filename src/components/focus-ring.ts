/**
 * The kit's focus frame (§5): a brand ring `--focus-ring-width` wide — 2 px, 3 px under
 * More contrast (tokens.css) — on keyboard focus only. ONE frame instead of the hundred
 * spelled-out `focus-visible:ring-2` copies, so the contrast setting can thicken all of
 * them at once. Compose with `ring-inset` or `ring-offset-*` where a component needs it.
 */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-[length:var(--focus-ring-width)] focus-visible:ring-[var(--brand)]";

/** Just the width of {@link FOCUS_RING}, for a ring in another colour (a danger control's,
 *  `--brand-contrast` on a filled button): `cn(FOCUS_RING_WIDTH, "focus-visible:ring-[var(--danger)]")`. */
export const FOCUS_RING_WIDTH = "focus-visible:ring-[length:var(--focus-ring-width)]";
