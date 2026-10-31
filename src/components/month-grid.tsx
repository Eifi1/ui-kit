// The year's twelve months as a grid: what MonthPicker opens, and what DatePicker's month
// jump (JumpCalendar) swaps in for the days. One component since 0.52 (refactor audit
// 2026-10-30, DUP-11): the two were copies — the same keys, bounds and cells — and had
// drifted, only JumpCalendar's rows being the 44px touch target. Internal; not re-exported
// from the barrel.
import { useEffect, useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { pad } from "../lib/dates";
import { upperFirst } from "../lib/text-case";
import { FOCUS_RING_WIDTH } from "./focus-ring";

/** Months per row: a year is four rows of three. */
export const MONTH_COLUMNS = 3;

/** A "YYYY-MM" key as a count of months, and back: month arithmetic with no `Date`
 *  rollover to step around. */
export const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
export const keyOfIndex = (index: number) =>
  `${String(Math.floor(index / 12)).padStart(4, "0")}-${pad((index % 12) + 1)}`;
export const shiftKey = (key: string, delta: number) => keyOfIndex(monthIndex(key) + delta);
/** The 1st of a "YYYY-MM" month, for `Intl` to name. */
export const firstOfKey = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);

/** `key` pulled inside the bounds — where a grid opens when the value is outside them. */
export function clampKey(key: string, minKey: string | null, maxKey: string | null): string {
  if (minKey && key < minKey) return minKey;
  if (maxKey && key > maxKey) return maxKey;
  return key;
}

/**
 * Which of the year arrows over a grid on `active`'s year are dead: an arrow is, once
 * EVERY month of the year it leads to is out of bounds. The arrows are their owner's —
 * MonthPicker's sit around the year, JumpCalendar's double as its month arrows — and they
 * stay focusable either way (`aria-disabled`, refactor audit 2026-10-30, INP-4).
 */
export function yearArrowsBlocked(
  active: string,
  minKey: string | null,
  maxKey: string | null,
): { previous: boolean; next: boolean } {
  const year = Number(active.slice(0, 4));
  return {
    previous: Boolean(minKey && year - 1 < Number(minKey.slice(0, 4))),
    next: Boolean(maxKey && year + 1 > Number(maxKey.slice(0, 4))),
  };
}

export interface MonthGridProps {
  /** The month holding the tab stop, "YYYY-MM" — and with it the year on show. Its owner
   *  keeps it, because the owner's year arrows move it too. */
  active: string;
  /** The keys moved the tab stop; the grid moves the focus after it. */
  onActiveChange: (key: string) => void;
  /** A month inside the bounds was picked (a click, Enter, Space). */
  onPick: (key: string) => void;
  /** The selection, as months: a single month is both ends, and a range's months between
   *  them are its band. `null` for none. */
  from: string | null;
  to: string | null;
  minKey: string | null;
  maxKey: string | null;
  /** The month to ring as "now". */
  currentKey: string;
  locale: string | undefined;
  /** A cell's accessible name, given "August 2026" — `monthPicker.month`. */
  cellName: (monthYear: string) => string;
  /** The id of what names the grid: the year caption above it. */
  labelledBy: string;
  /** Escape in the grid. Left out, it travels on to the popover around it, which closes. */
  onEscape?: (e: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * A grid in the APG sense, like `MiniCalendar`'s days: one tab stop (the roving
 * tabindex), the arrows walk the months — left/right by one, up/down by a row of three —
 * and walking off either end of the year MOVES the year rather than stopping; Home/End
 * the row, PageUp/PageDown a year. Out-of-bounds months are `aria-disabled`, not
 * `disabled`, so the roving tab stop never falls into a hole. The focus lands on the tab
 * stop when the grid mounts: both owners mount it only when asked to pick a month.
 */
export function MonthGrid({
  active,
  onActiveChange,
  onPick,
  from,
  to,
  minKey,
  maxKey,
  currentKey,
  locale,
  cellName,
  labelledBy,
  onEscape,
}: MonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const year = Number(active.slice(0, 4));
  const outOfBounds = (key: string) => Boolean((minKey && key < minKey) || (maxKey && key > maxKey));

  // Short names for the cells — upper-cased the one way (DUP-11); MonthPicker's CSS
  // `capitalize` and JumpCalendar's `upperFirst` agreed only because "Aug" is one word —
  // and "Month YYYY" for their accessible names.
  const shortNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => upperFirst(fmt.format(new Date(2000, i, 1)), locale));
  }, [locale]);
  const longName = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);

  // Mounted to pick a month: land on it. In MonthPicker this runs before the popover's
  // focus trap (a child's effect fires first), which then keeps this focus.
  useEffect(() => {
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, []);

  // A month whose cell must take focus after the next commit. Arrowing across a year's
  // edge relabels the same twelve buttons, so the one to focus is a DIFFERENT button from
  // the one the key landed on.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-month="${key}"]`)?.focus();
  });

  const onCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      onEscape?.(e);
      return;
    }
    // Left and right are VISUAL directions: in a right-to-left panel the grid runs the
    // other way. The panel is portalled, but its owner puts the field's `dir` on it, so
    // the nearest `dir` is right.
    const step = horizontalStep(e.key, e.currentTarget);
    const col = (monthIndex(active) % 12) % MONTH_COLUMNS;
    let delta: number;
    switch (step ? "horizontal" : e.key) {
      case "horizontal":
        delta = step;
        break;
      case "ArrowUp":
        delta = -MONTH_COLUMNS;
        break;
      case "ArrowDown":
        delta = MONTH_COLUMNS;
        break;
      case "Home":
        delta = -col;
        break;
      case "End":
        delta = MONTH_COLUMNS - 1 - col;
        break;
      case "PageUp":
        delta = -12;
        break;
      case "PageDown":
        delta = 12;
        break;
      default:
        return;
    }
    // Before the no-op check: these keys also scroll the panel, and a month that cannot
    // move still must not move the page.
    e.preventDefault();
    if (delta === 0) return;
    const next = shiftKey(active, delta);
    pendingFocus.current = next;
    onActiveChange(next);
  };

  const low = from ?? to;
  const high = to ?? from;

  return (
    <div ref={gridRef} role="grid" aria-labelledby={labelledBy} className="grid gap-1">
      {Array.from({ length: 12 / MONTH_COLUMNS }, (_, row) => (
        <div key={row} role="row" className="grid grid-cols-3 gap-1">
          {Array.from({ length: MONTH_COLUMNS }, (_, c) => {
            const index = row * MONTH_COLUMNS + c;
            const key = keyOfIndex(year * 12 + index);
            const disabled = outOfBounds(key);
            const selected = low !== null && high !== null && key >= low && key <= high;
            const end = key === from || key === to;
            const current = key === currentKey;
            return (
              <button
                key={c}
                type="button"
                role="gridcell"
                data-month={key}
                tabIndex={key === active ? 0 : -1}
                aria-label={cellName(longName.format(firstOfKey(key)))}
                aria-selected={selected}
                aria-disabled={disabled || undefined}
                aria-current={current ? "date" : undefined}
                onClick={() => {
                  // The guard `disabled` would have been; see the component note.
                  if (!disabled) onPick(key);
                }}
                onKeyDown={onCellKeyDown}
                className={cn(
                  // 44px rows: the touch-target size, and four of them stand as tall as a
                  // month of days, so JumpCalendar's panel does not jump as its views swap.
                  "h-11 rounded px-1 text-sm tabular-nums transition-colors",
                  FOCUS_RING_WIDTH,
                  "focus-visible:outline-none focus-visible:ring-inset",
                  // A --brand ring on a --brand fill exists only in the DOM.
                  end && !disabled ? "focus-visible:ring-brand-contrast" : "focus-visible:ring-brand",
                  disabled
                    ? "cursor-not-allowed text-placeholder"
                    : end
                      ? "bg-brand text-brand-contrast hover:bg-brand-hover"
                      : selected
                        ? "bg-brand-soft font-medium text-brand-muted hover:bg-brand-soft-hover"
                        : "text-primary hover:bg-hover",
                  current && !selected && !disabled && "ring-1 ring-inset ring-strong",
                )}
              >
                {shortNames[index]}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
