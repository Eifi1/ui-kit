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
 *
 * `md` is also the heading over a CHART COLUMN (lenkbank P9): the small label centred
 * over each of a pair of facing charts, or over each column of a small-multiples grid.
 * There the label names a plot, not a section of the page, so `sm` (12px, the page's
 * section heading) out-ranks the card title above it, and `xs` (10px, a legend's
 * title) sinks below the axis ticks it sits beside. Rule of thumb: `xs` inside a
 * control (legend, menu), `md` over a figure or a plot, `sm` over a block of page
 * content.
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

/**
 * `plain` (default): the label alone, as above.
 *
 * `band` (0.13, keksdose F5): the label on a full-width `surface-2` bar with a bottom
 * border — the day-group header of keksdose's mobile transaction list
 * (mobile-transaction-list.tsx:171), which separates one day's rows from the next.
 * Its type is kept as keksdose drew it — `font-medium` in the SECONDARY text colour,
 * not the plain label's semibold muted — so adopting the kit does not restyle a live
 * list: the bar already sets the label apart, and needs no extra weight. The padding (`px-4 py-2`) lines the text up with a
 * `ListItem density="comfortable"` row below it; override it with `className` for a
 * list at another density. A sticky header is the caller's: add `sticky top-0`.
 */
export type SectionLabelVariant = "plain" | "band";

/** The band's own type and box, per size — spelled out rather than merged over
 *  {@link SECTION_LABEL_CLASS}, so the result does not hang on tailwind-merge telling
 *  a font-size `text-[…]` from a colour `text-[var(…)]`. */
const SECTION_LABEL_BAND_CLASS: Record<SectionLabelSize, string> = {
  xs: "text-[10px]",
  md: "text-[11px]",
  sm: "text-xs",
};
const BAND =
  "block border-b border-[var(--border)] bg-[var(--bg-surface-2)] px-4 py-2 font-medium uppercase tracking-wide text-[var(--text-secondary)]";

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
  /** `band` draws the label on a `surface-2` bar with a bottom border — a list's group
   *  header. See {@link SectionLabelVariant}. */
  variant?: SectionLabelVariant;
  children: ReactNode;
}

/**
 * A section's small uppercase label. lenkbank spells
 * `text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400`
 * on every `<h3>` of its control page and more; keksdose's budget switcher writes the
 * 10px version on a menu row. One component, the token colour, and the level chosen
 * where the outline is known.
 */
export function SectionLabel({
  as = "h3",
  size = "sm",
  variant = "plain",
  className,
  children,
  ...rest
}: SectionLabelProps) {
  const Tag = as as ElementType;
  const type = variant === "band" ? cn(SECTION_LABEL_BAND_CLASS[size], BAND) : SECTION_LABEL_CLASS[size];
  return (
    <Tag {...rest} className={cn(type, className)}>
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
