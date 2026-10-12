import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, told about the kit's own font sizes (docs/text-size-harmonization.md
 * §3.2): `text-micro` and `text-caption` are `@theme` sizes in tokens.css, which
 * tailwind-merge cannot see. Unknown, a `text-<word>` is taken for a COLOUR, so
 * `cn("text-caption text-[var(--text-muted)]")` dropped the size — the later colour
 * "won" over it — and `cn("text-xs", "text-caption")` kept both sizes. Registered as
 * sizes, they merge like `text-xs`: a later size replaces an earlier one, a colour sits
 * beside them.
 *
 * The same for the focus frame's width (0.34, refactor audit DOC-7): `ring-focus` and
 * `outline-focus` are `@theme inline` WIDTHS, and unknown, a `ring-<word>` is taken for a
 * colour — so `cn(FOCUS_RING, "focus-visible:ring-strong")` dropped the width and the
 * ring was gone. Registered as widths, they merge like `ring-2` / `outline-2`, as the
 * arbitrary `length:` widths they replaced did. (No class is spelt out here: an app's
 * Tailwind scans the built source maps too, and would generate it.)
 */
const merge = extendTailwindMerge({
  extend: {
    theme: { text: ["micro", "caption"] },
    classGroups: { "ring-w": [{ ring: ["focus"] }], "outline-w": [{ outline: ["focus"] }] },
  },
});

/** Merge class lists with Tailwind conflict resolution (later wins). */
export const cn = (...inputs: Parameters<typeof clsx>) => merge(clsx(inputs));
