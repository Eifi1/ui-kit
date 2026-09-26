import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "../lib/cn";

/* ── SectionLabel ─────────────────────────────────────────────────────────── */

/**
 * `xs` is 10px — the size `LegendGroup`'s title and the top-bar menus' heading row draw;
 * `sm` (default) is 12px — the size `StatTile`'s label and lenkbank's section headings
 * (control-page.tsx:119/123/127) draw. Two sizes because the label sits either inside a
 * dense panel (a legend, a menu) or above a block of page content, and one size looked
 * wrong in the other place.
 *
 * `md` (0.11.0) is 11px, the rung between them: keksdose's budget-summary card labels
 * its figures ("Assigned", "Activity", "Upcoming", "Available" —
 * budget-summary-card:258/264/286/297) and its support thread its day divider and a message's meta line
 * (support-thread:153/223) at `text-[11px]` by hand — 10px read as a footnote under a
 * figure that size, 12px competed with it. Named `md` rather than slotted in order
 * because `sm` was already the default and renaming it would move every caller.
 */
export type SectionLabelSize = "xs" | "md" | "sm";

/**
 * The small, uppercase, tracked, muted label — as a class string, per size.
 *
 * Exported because `LegendGroup` and `StatTile` already draw it inline, and a class a
 * caller has to position itself (a `<th>`, a `<legend>`, a menu `<li>`) is better
 * reached as a string than wrapped in a component that only takes a `className`. The
 * uppercase is CSS, so a screen reader reads the text as written: write it in normal
 * case.
 */
export const SECTION_LABEL_CLASS: Record<SectionLabelSize, string> = {
  xs: "text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
  md: "text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
  sm: "text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]",
};

type SectionLabelElement = "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "legend";

export interface SectionLabelProps extends ComponentPropsWithoutRef<"h3"> {
  /**
   * The element — which is the heading LEVEL, and so is the caller's to pick: the kit
   * cannot know where in the outline the label sits. Default `h3`, which is what
   * lenkbank's control page writes under its `h2` card title. Pass `span` or `p` for a
   * label that is not a heading at all (a legend group's title).
   */
  as?: SectionLabelElement;
  size?: SectionLabelSize;
  children: ReactNode;
}

/**
 * A section's small uppercase label. lenkbank spells
 * `text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400`
 * on every `<h3>` of its control page and more; keksdose's budget switcher writes the
 * 10px version on a menu row. One component, the token colour, and the level chosen
 * where the outline is known.
 */
export function SectionLabel({ as = "h3", size = "sm", className, children, ...rest }: SectionLabelProps) {
  const Tag = as as ElementType;
  return (
    <Tag {...rest} className={cn(SECTION_LABEL_CLASS[size], className)}>
      {children}
    </Tag>
  );
}

/* ── Caption ──────────────────────────────────────────────────────────────── */

/**
 * The caption type as a class string: 11px, snug, muted. lenkbank's `CAPTION`
 * (shared/ui/caption.ts:23) — written out 31 times before it was a constant — as a
 * token colour rather than `slate-500 dark:slate-400`, so it follows the palette.
 * Exported for the same reason lenkbank's is a string: every caller positions it
 * differently (`mt-1`, `self-end pb-2`, `border-t`), and what must be one thing is the
 * type, not the box.
 */
export const CAPTION_CLASS = "text-[11px] leading-snug text-[var(--text-muted)]";

export interface CaptionProps extends ComponentPropsWithoutRef<"p"> {
  /** Default `p`; `span` for a caption inside a line of other content. */
  as?: "p" | "span" | "div";
  children: ReactNode;
}

/**
 * The small grey sentence under a field, a table or a button — prose ABOUT the thing
 * above it. Not `FieldHint`, which hides behind a field label's "?" so a paragraph does
 * not make one field taller than its neighbour (lenkbank feedback #27).
 */
export function Caption({ as = "p", className, children, ...rest }: CaptionProps) {
  const Tag = as as ElementType;
  return (
    <Tag {...rest} className={cn(CAPTION_CLASS, className)}>
      {children}
    </Tag>
  );
}
