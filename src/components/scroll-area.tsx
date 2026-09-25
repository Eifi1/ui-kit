import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, Ref, RefObject } from "react";
import { cn } from "../lib/cn";

/**
 * Whether `ref`'s element currently overflows its box — the one fact a scroll
 * container needs to decide whether it is a keyboard stop.
 *
 * Measured on every commit (cheap: two reads, and state is set only on a change) and
 * whenever the element or one of its direct children resizes, which covers both
 * "the panel got narrower" and "the rows arrived". Without `ResizeObserver` (jsdom,
 * very old engines) the per-commit measurement is what remains.
 *
 * Shared with {@link Table}'s overflow wrapper, which has the same obligation.
 */
export function useScrollOverflow(ref: RefObject<HTMLElement | null>): boolean {
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
    setOverflowing((prev) => (prev === next ? prev : next));
  }, [ref]);

  // No dependency list on purpose: content changes arrive as re-renders.
  useLayoutEffect(() => {
    measure();
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [ref, measure]);

  return overflowing;
}

/** Thin, token-coloured scrollbars. `scrollbar-width` / `scrollbar-color` are the
 *  standard (Firefox, Chrome 121+); the `::-webkit-scrollbar` rules are for Safari,
 *  which has neither. Where the standard pair applies, Chrome ignores the rest. */
export const THIN_SCROLLBAR_CLASS = cn(
  "[scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent]",
  "[&::-webkit-scrollbar]:size-2 [&::-webkit-scrollbar-track]:bg-transparent",
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--border-strong)]",
);

const AXIS = {
  vertical: "overflow-y-auto overflow-x-hidden",
  horizontal: "overflow-x-auto overflow-y-hidden",
  both: "overflow-auto",
} as const;

export interface ScrollAreaProps extends ComponentPropsWithoutRef<"div"> {
  /** Which way the content may scroll. Default `vertical`. */
  orientation?: keyof typeof AXIS;
  /**
   * The region's accessible name. With it (or `aria-labelledby`) the container is a
   * `role="region"` a reader can find and name; without it, it is a plain box.
   * Name every ScrollArea whose content can overflow: once it is a tab stop, a
   * reader announces it on focus, and an unnamed one is announced as nothing.
   */
  label?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A styled overflow container: a thin scrollbar in the kit's colours, a focus ring,
 * and the keyboard access a plain `overflow-auto` div does not have.
 *
 * kastlan used Radix's ScrollArea for this and nothing else from it. Radix draws a
 * custom scrollbar in JavaScript; the platform's own, thinned and coloured, costs no
 * script and keeps native momentum, overscroll and scrollbar-dragging behaviour.
 *
 * A container that scrolls but holds nothing focusable cannot be scrolled from the
 * keyboard at all — Tab jumps straight past it (WCAG 2.1.1). So while the content
 * overflows, the container itself is a tab stop (`tabIndex=0`), and arrow keys and
 * Page Up/Down scroll it natively. While nothing overflows it is not, so a short list
 * adds no empty stop to the tab order.
 */
export function ScrollArea({
  orientation = "vertical",
  label,
  className,
  ref,
  tabIndex,
  "aria-labelledby": labelledBy,
  ...rest
}: ScrollAreaProps) {
  const inner = useRef<HTMLDivElement | null>(null);
  const overflowing = useScrollOverflow(inner);
  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      inner.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  const named = label !== undefined || labelledBy !== undefined;

  return (
    <div
      {...rest}
      ref={setRef}
      role={named ? "region" : undefined}
      aria-label={label}
      aria-labelledby={labelledBy}
      tabIndex={tabIndex ?? (overflowing ? 0 : undefined)}
      data-overflowing={overflowing || undefined}
      data-orientation={orientation}
      className={cn(
        "relative min-h-0 min-w-0",
        AXIS[orientation],
        THIN_SCROLLBAR_CLASS,
        // An OUTLINE, inset: a ring is a box-shadow, which paints beneath the content —
        // a row with its own background would cover exactly the part of the ring that
        // says where focus is. An outline paints above it, and the negative offset
        // keeps it inside a parent that clips.
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand)]",
        className,
      )}
    />
  );
}
