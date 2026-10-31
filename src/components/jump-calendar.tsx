// The date pickers' calendar with a month jump (`monthJump`, kastlan): MiniCalendar
// under a ‹ caption › whose caption opens a month grid. Moved out of date-picker.tsx as
// it was (MOD-9, refactor audit 2026-10); internal, both pickers reach it through
// `PanelCalendar`.
import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { monthKey, parseIsoDate } from "../lib/dates";
import { upperFirst } from "../lib/text-case";
import { useKitLabels } from "../i18n/kit-labels";
import { DEFAULT_MINI_CALENDAR_LABELS, MiniCalendar, type MiniCalendarProps } from "./mini-calendar";
import { DEFAULT_MONTH_PICKER_LABELS } from "./month-picker-labels";
import { MonthGrid, clampKey, firstOfKey, shiftKey, yearArrowsBlocked } from "./month-grid";
import { claimEscape } from "../hooks/use-dismiss";

// ── Month jump (`monthJump`, kastlan) ─────────────────────────────────────

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
 * under `apply` moves the grid to its start). That last one is mirrored below with
 * the calendar's own rule, and when it lands in another month the day grid is remounted
 * there rather than steered by `month`: a `month` that changes in the same render as the
 * value would win over the value's day, and the grid's tab stop would land on the
 * month's same-numbered day instead of the preset's start.
 *
 * The month grid is `MonthPicker`'s own {@link MonthGrid} (month-grid.tsx, one since
 * 0.52 — refactor audit 2026-10-30, DUP-11), with its words (`monthPicker` labels).
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

  const lo = min ? parseIsoDate(min) : null;
  const hi = max ? parseIsoDate(max) : null;
  const minKey = lo ? monthKey(lo) : null;
  const maxKey = hi ? monthKey(hi) : null;

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

  const showMonth = (key: string) => {
    setShown(key);
    // Follows by `month`: the calendar keeps the day of the month (clamped), and the
    // focus stays on the arrow being pressed.
    setDayGrid((d) => ({ ...d, month: key }));
  };
  const openMonths = () => {
    // The grid takes the focus onto this month as it mounts.
    setActive(clampKey(shown, minKey, maxKey));
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

  const year = Number(active.slice(0, 4));
  const yearBlocked = yearArrowsBlocked(active, minKey, maxKey);
  const prevBlocked = !inDays && yearBlocked.previous;
  const nextBlocked = !inDays && yearBlocked.next;

  const longName = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);
  const caption = inDays
    ? upperFirst(longName.format(firstOfKey(shown)), locale)
    : new Intl.DateTimeFormat(locale, { year: "numeric" }).format(new Date(year, 0, 1));

  // The selection, as months: both ends, and the months between (a range's band).
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const fromKey = fromDate ? monthKey(fromDate) : null;
  const toKey = toDate ? monthKey(toDate) : null;

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
            // Focus stays on the arrow being pressed — only the grid moves.
            if (inDays) showMonth(shiftKey(shown, -1));
            else if (!prevBlocked) setActive(shiftKey(active, -12));
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
          <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 text-muted", !inDays && "rotate-180")} />
        </button>
        <button
          type="button"
          aria-label={inDays ? calendarText.nextMonth : monthText.nextYear}
          aria-disabled={nextBlocked || undefined}
          onClick={() => {
            if (inDays) showMonth(shiftKey(shown, 1));
            else if (!nextBlocked) setActive(shiftKey(active, 12));
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
        <MonthGrid
          active={active}
          onActiveChange={setActive}
          onPick={pick}
          from={fromKey}
          to={toKey}
          minKey={minKey}
          maxKey={maxKey}
          currentKey={monthKey(new Date())}
          locale={locale}
          cellName={monthText.month}
          labelledBy={captionId}
          onEscape={escapeToDays}
        />
      )}
    </div>
  );
}
