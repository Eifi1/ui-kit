// The date pickers' calendar with a month jump (`monthJump`, kastlan): MiniCalendar
// under a ‹ caption › whose caption opens a month grid. Moved out of date-picker.tsx as
// it was (MOD-9, refactor audit 2026-10); internal, both pickers reach it through
// `PanelCalendar`.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { monthKey, pad, parseIsoDate } from "../lib/dates";
import { useKitLabels } from "../i18n/kit-labels";
import { FOCUS_RING_WIDTH } from "./focus-ring";
import { DEFAULT_MINI_CALENDAR_LABELS, MiniCalendar, type MiniCalendarProps } from "./mini-calendar";
import { DEFAULT_MONTH_PICKER_LABELS } from "./month-picker";
import { claimEscape } from "../hooks/use-dismiss";

// ── Month jump (`monthJump`, kastlan) ─────────────────────────────────────

/** A "YYYY-MM" key as a count of months, and back: month arithmetic with no `Date`
 *  rollover to step around. */
const monthIndex = (key: string) => Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7)) - 1;
const keyOfIndex = (index: number) =>
  `${String(Math.floor(index / 12)).padStart(4, "0")}-${pad((index % 12) + 1)}`;
const shiftKey = (key: string, delta: number) => keyOfIndex(monthIndex(key) + delta);
/** The 1st of a "YYYY-MM" month, for `Intl` to name. */
const firstOfKey = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);

/** Upper-case the first letter only, as `MonthPicker` does: "julio de 2026" heads a
 *  panel as "Julio de 2026" — not "Julio De 2026", which CSS `capitalize` would write. */
const upperFirst = (text: string, locale: string | undefined) =>
  text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

/** Months per row of the month grid — `MonthPicker`'s 4×3. */
const MONTH_COLUMNS = 3;

/**
 * The month `MiniCalendar` opens on — the selection, or today, pulled inside the
 * bounds — worked out the way it does, so the caption drawn over a calendar that was
 * given no `month` names the month that calendar is showing.
 */
function openingMonth(from: string, to: string, lo: Date | null, hi: Date | null): string {
  const start = parseIsoDate(from) ?? parseIsoDate(to) ?? new Date();
  if (lo && start < lo) return monthKey(lo);
  if (hi && start > hi) return monthKey(hi);
  return monthKey(start);
}

export type PanelCalendarProps = Pick<
  MiniCalendarProps,
  "mode" | "from" | "to" | "locale" | "min" | "max" | "labels" | "onSelect" | "focusOnOpen"
> & {
  /** See {@link DatePickerBaseProps.monthJump}. */
  monthJump?: boolean;
};

/** The panel's calendar: the plain {@link MiniCalendar}, exactly as before — or, with
 *  `monthJump`, the same calendar under a caption that opens a month grid. */
export function PanelCalendar({ monthJump, ...calendar }: PanelCalendarProps) {
  return monthJump ? <JumpCalendar {...calendar} /> : <MiniCalendar {...calendar} />;
}

/** How the day grid is mounted: `key` remounts it, `month` is the month it follows
 *  (left out until the panel first moves, so it opens exactly where it always has), and
 *  `focus` is its `focusOnOpen`. */
interface DayGridMount {
  key: number;
  month?: string;
  focus: boolean;
}

/**
 * {@link MiniCalendar} with its navigation drawn here — ‹ caption › — so the caption can
 * be a button that swaps the days for a month grid ({@link DatePickerBaseProps.monthJump}).
 *
 * Built on the calendar's own `hideNavigation` / `month` / `onMonthChange`, not a fork
 * of it: the days, their keys, the range band and every announcement stay the
 * calendar's. What this keeps is `shown`, the month on screen, for the caption — fed by
 * the arrows here, by the calendar's `onMonthChange` (PageUp, arrowing off the edge),
 * and by the value, whose changes the calendar follows WITHOUT reporting them (a preset
 * in `commit="apply"` moves the grid to its start). That last one is mirrored below with
 * the calendar's own rule, and when it lands in another month the day grid is remounted
 * there rather than steered by `month`: a `month` that changes in the same render as the
 * value would win over the value's day, and the grid's tab stop would land on the
 * month's same-numbered day instead of the preset's start.
 *
 * The month grid is `MonthPicker`'s, redrawn here because that one is internal to its
 * file; same roles, keys and words (`monthPicker` labels).
 */
function JumpCalendar({
  from = "",
  to = "",
  mode = "range",
  locale,
  min,
  max,
  labels,
  onSelect,
  focusOnOpen,
}: Omit<PanelCalendarProps, "monthJump">) {
  // The month arrows say what they said when the calendar drew them; the month grid
  // says what `MonthPicker`'s says.
  const calendarText = useKitLabels("miniCalendar", DEFAULT_MINI_CALENDAR_LABELS, labels);
  const monthText = useKitLabels("monthPicker", DEFAULT_MONTH_PICKER_LABELS);
  const id = useId();
  const captionId = `${id}-caption`;
  const hintId = `${id}-hint`;
  const captionRef = useRef<HTMLButtonElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);

  const lo = min ? parseIsoDate(min) : null;
  const hi = max ? parseIsoDate(max) : null;
  const minKey = lo ? monthKey(lo) : null;
  const maxKey = hi ? monthKey(hi) : null;
  const outOfBounds = (key: string) => Boolean((minKey && key < minKey) || (maxKey && key > maxKey));
  const clampKey = (key: string) => (minKey && key < minKey ? minKey : maxKey && key > maxKey ? maxKey : key);

  const [view, setView] = useState<"days" | "months">("days");
  const [shown, setShown] = useState(() => openingMonth(from, to, lo, hi));
  const [dayGrid, setDayGrid] = useState<DayGridMount>(() => ({ key: 0, focus: Boolean(focusOnOpen) }));
  // The month holding the month grid's tab stop — and with it the year on show.
  const [active, setActive] = useState(shown);

  // The value moved from outside the day grid (a preset, a reset): follow the end that
  // changed, by the calendar's own rule, and remount the days there — see above. Also
  // what takes an open month grid back to the days when a preset is picked beside it.
  const [lastValue, setLastValue] = useState({ from, to });
  if (lastValue.from !== from || lastValue.to !== to) {
    const changed = lastValue.from !== from ? from : to;
    setLastValue({ from, to });
    const next = parseIsoDate(changed) ?? parseIsoDate(from) ?? parseIsoDate(to);
    const key = next ? monthKey(next) : null;
    if (key && (key !== shown || view === "months")) {
      setShown(key);
      setView("days");
      setDayGrid((d) => ({ key: d.key + 1, month: key, focus: false }));
    }
  }

  // A month cell that has to take focus once it exists: opening the grid, and arrowing
  // across a year's edge, which relabels the same twelve buttons.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    monthsRef.current?.querySelector<HTMLElement>(`[data-month="${key}"]`)?.focus();
  });

  const showMonth = (key: string) => {
    setShown(key);
    // Follows by `month`: the calendar keeps the day of the month (clamped), and the
    // focus stays on the arrow being pressed.
    setDayGrid((d) => ({ ...d, month: key }));
  };
  const openMonths = () => {
    const start = clampKey(shown);
    pendingFocus.current = start;
    setActive(start);
    setView("months");
  };
  const closeMonths = (focusCaption: boolean) => {
    setView("days");
    setDayGrid((d) => ({ ...d, month: shown, focus: false }));
    if (focusCaption) captionRef.current?.focus();
  };
  const pick = (key: string) => {
    setShown(key);
    setView("days");
    // Picked to go there: the focus goes with it, onto the days.
    setDayGrid((d) => ({ key: d.key + 1, month: key, focus: true }));
  };
  const moveActive = (key: string, focus: boolean) => {
    if (focus) pendingFocus.current = key;
    setActive(key);
  };

  const inDays = view === "days";
  // Escape in the month grid is "back", not "close": the month grid is a step INSIDE the
  // panel, and losing the half-made range to a key meant to undo that step would be the
  // worse surprise. Claimed on the kit's Escape stack (Wave 2, DUP-1) and stopped here,
  // so neither the popover nor the phone sheet nor a dialog around them closes.
  const escapeToDays = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || inDays) return;
    claimEscape(e);
    e.stopPropagation();
    closeMonths(true);
  };

  const onMonthKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") return escapeToDays(e);
    // Left and right are visual: the grid runs the other way in a right-to-left panel.
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
    // Before the no-op check: these keys also scroll the panel.
    e.preventDefault();
    if (delta !== 0) moveActive(shiftKey(active, delta), true);
  };

  const year = Number(active.slice(0, 4));
  // A year arrow is dead once every month of the year it leads to is out of bounds.
  const prevYearBlocked = Boolean(minKey && year - 1 < Number(minKey.slice(0, 4)));
  const nextYearBlocked = Boolean(maxKey && year + 1 > Number(maxKey.slice(0, 4)));
  const prevBlocked = !inDays && prevYearBlocked;
  const nextBlocked = !inDays && nextYearBlocked;

  const longName = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);
  const shortNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => upperFirst(fmt.format(new Date(2000, i, 1)), locale));
  }, [locale]);
  const caption = inDays
    ? upperFirst(longName.format(firstOfKey(shown)), locale)
    : new Intl.DateTimeFormat(locale, { year: "numeric" }).format(new Date(year, 0, 1));

  // The selection, as months: both ends, and the months between (a range's band).
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const fromKey = fromDate ? monthKey(fromDate) : null;
  const toKey = toDate ? monthKey(toDate) : null;
  const low = fromKey ?? toKey;
  const high = toKey ?? fromKey;
  const currentKey = monthKey(new Date());

  // Aria-disabled rather than disabled, like the day cells: a focused button that
  // turns `disabled` drops the focus to <body>, mid-panel.
  const arrow =
    "rounded p-1 text-muted hover:bg-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent";

  return (
    <div className="select-none">
      {/* The calendar's own row, redrawn: the same arrows in the same places. Each
          button stays mounted across the two views and changes what it steps, so a
          press never pulls the element out from under the pointer or the focus. */}
      <div className="flex items-center justify-between gap-1 pb-1">
        <button
          type="button"
          aria-label={inDays ? calendarText.previousMonth : monthText.previousYear}
          aria-disabled={prevBlocked || undefined}
          onClick={() => {
            if (inDays) showMonth(shiftKey(shown, -1));
            else if (!prevBlocked) moveActive(shiftKey(active, -12), false);
          }}
          onKeyDown={escapeToDays}
          className={arrow}
        >
          {/* Mirrored in RTL: "previous" points to the reading START, which is right. */}
          <ChevronLeft className="size-4 rtl:-scale-x-100" aria-hidden />
        </button>
        <button
          ref={captionRef}
          type="button"
          aria-expanded={!inDays}
          aria-describedby={inDays ? hintId : undefined}
          onClick={inDays ? openMonths : () => closeMonths(false)}
          onKeyDown={escapeToDays}
          className="inline-flex min-w-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-secondary hover:bg-hover"
        >
          {/* The name is the text, so it says what is on screen; `aria-live` because
              pressing an arrow leaves focus ON the arrow, and this is the only thing
              that says where it went. It also names the month grid. */}
          <span id={captionId} aria-live="polite" className="truncate">
            {caption}
          </span>
          <ChevronDown
            aria-hidden
            className={cn("size-3.5 shrink-0 text-muted", !inDays && "rotate-180")}
          />
        </button>
        <button
          type="button"
          aria-label={inDays ? calendarText.nextMonth : monthText.nextYear}
          aria-disabled={nextBlocked || undefined}
          onClick={() => {
            if (inDays) showMonth(shiftKey(shown, 1));
            else if (!nextBlocked) moveActive(shiftKey(active, 12), false);
          }}
          onKeyDown={escapeToDays}
          className={arrow}
        >
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
      {/* The caption's description — read through the reference, never on its own. */}
      <span id={hintId} hidden>
        {monthText.panel}
      </span>
      {inDays ? (
        <MiniCalendar
          key={dayGrid.key}
          mode={mode}
          from={from}
          to={to}
          locale={locale}
          min={min}
          max={max}
          labels={labels}
          onSelect={onSelect}
          focusOnOpen={dayGrid.focus}
          hideNavigation
          month={dayGrid.month}
          onMonthChange={showMonth}
        />
      ) : (
        <div ref={monthsRef} role="grid" aria-labelledby={captionId} className="grid gap-1">
          {Array.from({ length: 12 / MONTH_COLUMNS }, (_, row) => (
            <div key={row} role="row" className="grid grid-cols-3 gap-1">
              {Array.from({ length: MONTH_COLUMNS }, (_, c) => {
                const index = row * MONTH_COLUMNS + c;
                const key = keyOfIndex(year * 12 + index);
                const disabled = outOfBounds(key);
                const selected = low !== null && high !== null && key >= low && key <= high;
                const end = key === fromKey || key === toKey;
                const current = key === currentKey;
                return (
                  <button
                    key={c}
                    type="button"
                    role="gridcell"
                    data-month={key}
                    tabIndex={key === active ? 0 : -1}
                    aria-label={monthText.month(longName.format(firstOfKey(key)))}
                    aria-selected={selected}
                    aria-disabled={disabled || undefined}
                    aria-current={current ? "date" : undefined}
                    onClick={() => {
                      // The guard `disabled` would have been: out-of-bounds months stay
                      // focusable, so the roving tab stop never falls into a hole.
                      if (!disabled) pick(key);
                    }}
                    onKeyDown={onMonthKeyDown}
                    className={cn(
                      // 44px rows: the touch-target size, and four of them stand as tall
                      // as a month of days, so the panel does not jump as the views swap.
                      "h-11 rounded px-1 text-sm tabular-nums transition-colors",
                      FOCUS_RING_WIDTH,
                      "focus-visible:outline-none focus-visible:ring-inset",
                      // A --brand ring on a --brand fill exists only in the DOM.
                      end && !disabled ? "focus-visible:ring-[var(--brand-contrast)]" : "focus-visible:ring-brand",
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
      )}
    </div>
  );
}
