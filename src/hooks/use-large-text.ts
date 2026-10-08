import { useTextSize } from "../theme/text-size";
import { useMediaQuery } from "./use-media-query";

/**
 * The two questions the kit's 0.32 behaviours ask (docs/text-size-harmonization.md §4,
 * §10.7–10.9), answered in one place so every part draws the line where the others do.
 *
 * Prefer CSS where it can: a class that differs at Large is a `large:` variant
 * (tokens.css), and a layout switch is a breakpoint, which already scales. These hooks
 * are for what CSS cannot decide — whether a tooltip is rendered at all, whether a label
 * becomes text, whether a row's actions collapse into a menu.
 */

/** Large or Extra large is in force (`<html data-text-size>`) — the JS twin of the
 *  `large:` variant. */
export function useLargeText(): boolean {
  return useTextSize().size !== "normal";
}

/**
 * The primary pointer is a finger (`pointer: coarse`): a hover never happens, so a
 * tooltip opens only on the taps that do nothing else. A pointer query, so it stays
 * `useMediaQuery` (§10.4). `false` without `matchMedia` (SSR, jsdom).
 */
export function useCoarsePointer(): boolean {
  return useMediaQuery("(pointer: coarse)", false);
}

/**
 * Whether a fact may NOT live only in a tooltip here (§4 "No fact only in a tooltip"):
 * at Large and Extra large, where the reader is the one who asked for bigger type, and
 * on a touch screen at every size, where a tooltip cannot be hovered open. Where this
 * is true the kit draws the fact in the layout — a `disabledReason` as a line under its
 * control, a FieldHint as the field's caption, a StatTile hint as text — and keeps the
 * bubble only where there is no room (a top bar, a dense row's inline actions).
 */
export function useInlineFacts(): boolean {
  const large = useLargeText();
  const coarse = useCoarsePointer();
  return large || coarse;
}
