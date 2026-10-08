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
 */
const merge = extendTailwindMerge({ extend: { theme: { text: ["micro", "caption"] } } });

/** Merge class lists with Tailwind conflict resolution (later wins). */
export const cn = (...inputs: Parameters<typeof clsx>) => merge(clsx(inputs));
