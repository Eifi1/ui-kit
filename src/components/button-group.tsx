import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";

// Every class below is spelled out in full rather than assembled from parts: the
// consumer's Tailwind build finds classes by scanning this package's source as text,
// and a class that exists only after a template literal runs is never generated.
//
// Each rule is written twice, once for a direct child and once for a `<button>` one
// level down. The second is for a Tooltip-wrapped IconButton — the map zoom's + and −
// both carry a tooltip — where the direct child is the tooltip's wrapper span and the
// button that draws the border and the corners sits inside it.
const JOINED_COMMON = cn(
  "inline-flex rounded-md border border-[var(--border)]",
  // The group draws the frame; each member gives up its own border, radius and shadow.
  "[&>*]:rounded-none [&>*]:border-0 [&>*]:shadow-none",
  "[&>*>button]:rounded-none [&>*>button]:border-0 [&>*>button]:shadow-none",
  "[&>*]:border-[var(--border)]",
  // A focused member rises above its neighbours so its ring is not painted over by
  // the next one's background.
  "[&>*]:relative [&>*:focus-within]:z-10",
);

const JOINED: Record<"horizontal" | "vertical", string> = {
  // Logical edges and corners throughout (`border-s`, `rounded-s-*`), so in RTL the
  // first member sits on the right with the right-hand corners rounded — the physical
  // pair would round the outside of the last button and square off the first.
  horizontal: cn(
    JOINED_COMMON,
    "flex-row items-stretch",
    "[&>*:not(:first-child)]:border-s",
    "[&>:first-child]:rounded-s-md [&>:last-child]:rounded-e-md",
    "[&>:first-child>button]:rounded-s-md [&>:last-child>button]:rounded-e-md",
  ),
  // The block axis is top-to-bottom in both reading directions, so top/bottom are
  // already the logical edges here.
  vertical: cn(
    JOINED_COMMON,
    "flex-col items-stretch",
    "[&>*:not(:first-child)]:border-t",
    "[&>:first-child]:rounded-t-md [&>:last-child]:rounded-b-md",
    "[&>:first-child>button]:rounded-t-md [&>:last-child>button]:rounded-b-md",
  ),
};

export interface ButtonGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "role"> {
  /** `horizontal` (default): side by side, in reading order. `vertical`: stacked —
   *  the map's zoom + over −. */
  orientation?: "horizontal" | "vertical";
}

/**
 * Adjacent `Button`s or `IconButton`s drawn as one joined control: a single frame,
 * hairline dividers between the members, rounded only at the outer corners.
 *
 * keksdose asked for it twice — "collapse all / expand all" above its category
 * tree, and the + and − of its map zoom — both hand-built with negative margins and
 * physical `rounded-l` / `rounded-r`, which came out inside-out under `dir="rtl"`.
 *
 * `role="group"` with a name: a reader then introduces the pair as "Zoom, group"
 * before reading "Zoom in", which is what tells a listener that the next button
 * belongs with this one. Pass `aria-label` (or `aria-labelledby`); a group with no
 * name is one more unlabelled wrapper. It is NOT a toolbar — it adds no arrow-key
 * roving, and every member keeps its own tab stop, as plain adjacent buttons do.
 * For one-of-many selection use `ToggleGroup`, which has the radio semantics.
 */
export function ButtonGroup({ orientation = "horizontal", className, ...rest }: ButtonGroupProps) {
  return (
    <div
      {...rest}
      role="group"
      data-orientation={orientation}
      className={cn(JOINED[orientation], className)}
    />
  );
}
