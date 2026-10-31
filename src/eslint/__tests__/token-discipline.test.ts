// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hardcodedColours } from "../../../scripts/check-token-discipline.mjs";

/**
 * `npm run check:tokens`' palette ratchet, on the classes it missed (refactor audit
 * 2026-10-30, DOC-1, PROVEN by rebuilding its regex): Tailwind 4.3's four new palettes,
 * side borders, ring offsets and arbitrary colour values.
 */
describe("check:tokens counts", () => {
  it.each([
    // The palettes Tailwind 4.3 added, read from its theme.css.
    "text-mauve-500",
    "bg-olive-100",
    "border-mist-300",
    "hover:bg-taupe-200/50",
    // A side border and a ring offset.
    "border-t-slate-200",
    "md:border-x-red-500",
    "ring-offset-white",
    // Arbitrary values that are colours.
    "bg-[#64748b]",
    "[color:#fff]",
    "text-[rgb(0_0_0)]",
    "dark:bg-[oklch(0.5_0.1_200)]",
    "bg-[color-mix(in_oklab,#fff_10%,transparent)]",
    "fill-[hsl(200_50%_50%)]",
    "shadow-[0_1px_2px_rgb(255_0_0/0.5)]",
  ])("%s", (cls) => {
    expect(hardcodedColours(`const c = "p-2 ${cls}";`)).toHaveLength(1);
  });

  it("still counts what it counted, and a family's every shade", () => {
    expect(hardcodedColours('"text-slate-500 bg-red-50 dark:text-white border-neutral-200"')).toEqual([
      "text-slate-500",
      "bg-red-50",
      "dark:text-white",
      "border-neutral-200",
    ]);
  });

  it("leaves tokens, role utilities and the allowed decisions alone", () => {
    expect(
      hardcodedColours(
        [
          '"bg-[var(--bg-surface)] bg-[color-mix(in_oklab,var(--brand)_10%,transparent)] text-muted"',
          // The role utility `bg-neutral` and its foreground, not Tailwind's palette.
          '"bg-neutral text-neutral-contrast"',
          // A scrim, a hairline over a swatch, the brand accent.
          '"bg-black/40 ring-white/10 accent-[var(--brand)]"',
          // A mask reads alpha only; a black shadow at an alpha is a scrim's edge.
          '"after:[mask-image:linear-gradient(#000,transparent)] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"',
          // Not a colour: a url fragment, a size.
          '"bg-[url(#a)] w-[12px]"',
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});
