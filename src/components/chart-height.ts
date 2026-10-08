import type { CSSProperties } from "react";

/**
 * A chart's height as the kit's charts take it (docs/text-size-harmonization.md §10.10):
 *
 * - a CSS length — `"20rem"`, `"min(20rem, 60dvh)"`, `"clamp(14rem, 40vh, 28rem)"` —
 *   set inline, so a height can grow with the text size AND stop at the screen: scaled
 *   px would make a 480 px chart 720 px at Extra large, more than a phone shows;
 * - a Tailwind class (`"h-72"`, `"h-64 md:h-80"`), as before;
 * - a number of px, set inline, as before — kept for the callers that hold their height
 *   as a number, but it does not follow the text size.
 */
export type ChartHeight = string | number;

/** A number with an optional unit, or one of the CSS functions a length is written with.
 *  A Tailwind class never starts with a digit or `min(`, so the two cannot be confused. */
const CSS_LENGTH = /^(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:%|[a-z]+)?|(?:min|max|clamp|calc|var)\(.*\))$/i;

/** Whether a string `height` is a CSS length rather than a class. */
export function isCssLength(value: string): boolean {
  return CSS_LENGTH.test(value.trim());
}

/** The class or the inline style a {@link ChartHeight} becomes — one of the two, or
 *  neither for `undefined`. */
export function chartHeightProps(height: ChartHeight | undefined): { className?: string; style?: CSSProperties } {
  if (height === undefined) return {};
  if (typeof height === "number") return { style: { height } };
  return isCssLength(height) ? { style: { height: height.trim() } } : { className: height };
}
