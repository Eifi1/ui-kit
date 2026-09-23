import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { useAnnounce } from "../hooks/use-announce";
import { parseIsoDate, sameYmd, toLocalIso } from "../lib/dates";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";

/**
 * Every string this calendar can speak — the `miniCalendar` namespace of
 * `<UiKitProvider labels>`, overridable per instance through the `labels` prop. The
 * package carries no translation catalog (see the README), so the English defaults
 * below are a starting point and not a commitment. `previousMonth`/`nextMonth` were already props for the
 * reason the audit records: a German app reached this component through a bare
 * re-export and announced its two icon-only arrows in English on a page whose
 * `<html lang>` says `de`.
 *
 * The month caption is deliberately NOT here. It is produced by `Intl` from the
 * `locale` prop, so it is already in the user's language, and the grid takes its
 * accessible name from that element rather than from a string someone has to
 * translate a second time.
 *
 * The ones that interpolate a date are FUNCTIONS taking the formatted date, for the
 * reason `DataTableLabels` gives for its counted strings: a value glued into an
 * English template literal is untranslatable, and the grammar around a date moves
 * with it in most languages.
 */
export interface MiniCalendarLabels {
  previousMonth: string;
  nextMonth: string;
  /**
   * Accessible name of one day cell, given that day formatted in `locale`
   * ("Monday, 14 September 2026").
   *
   * The name has to carry the WHOLE date. The visible text of a cell is the day
   * number alone, and "14" on its own tells a screen-reader user nothing — not the
   * month they have arrowed into, not the year, not the weekday they are picking.
   */
  day: (date: string) => string;
  /** Range mode: what the NEXT click will set. Spoken after every click, and the
   *  grid's description while the panel is open. */
  chooseStart: string;
  chooseEnd: string;
  /** Range mode: spoken after the click that set the start. */
  startSelected: (date: string) => string;
  /** Range mode: spoken after the click that completed the range. */
  rangeSelected: (from: string, to: string) => string;
}

/** English defaults. Exported as the `miniCalendar` namespace of `UiKitLabels`
 *  (src/i18n), the complete reference a translation is written against. */
export const DEFAULT_MINI_CALENDAR_LABELS: MiniCalendarLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  day: (date) => date,
  chooseStart: "Choose a start date",
  chooseEnd: "Choose an end date",
  startSelected: (date) => `${date} selected as the start. Choose an end date.`,
  rangeSelected: (from, to) => `${from} to ${to} selected. Choose a start date to begin again.`,
};

/**
 * How a day is spoken. The weekday is in there on purpose: picking a date is very
 * often picking a *day of the week* ("the first Monday"), and a grid that makes you
 * count columns to find one is a grid you cannot use without sight.
 */
const DAY_NAME_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/**
 * `onSelect` is omitted from the `<div>` attributes and kept as this component's own:
 * the DOM event of that name is a text-selection event taking one argument, and this one
 * answers with the two ISO dates a range is made of. Everything else a `<div>` takes
 * passes through to the root, so a tour anchor or a test id can find the calendar —
 * before this, a closed prop list dropped both (audit §api-design).
 */
export interface MiniCalendarProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  from: string;
  to: string;
  /**
   * BCP 47 tag for the month caption, the weekday heads, the day numbers and the
   * spoken dates. Optional since the kit grew `<UiKitProvider locale>`: a calendar
   * NESTED in another kit component (the data table's date filter) has no call site
   * of its own to pass one at, so it reads the provider's. Without either, `Intl`
   * uses the runtime's default.
   */
  locale?: string;
  /**
   * The weekday the grid starts on, `0` = Sunday … `6` = Saturday (as `Date#getDay`).
   * Defaults to the LOCALE's first day — Monday in most of Europe, Sunday in the US,
   * Saturday in much of the Arab world — which is what the user's own wall calendar
   * does. It was hard-wired to Monday before, which is wrong for most of the people
   * who use a Sunday-first calendar and invisible to the people who wrote this one.
   */
  weekStartsOn?: WeekDay;
  onSelect: (from: string, to: string) => void;
  /** `"range"` (default) = two-click from→to; `"single"` = one click selects a
   *  single day (emitted as `onSelect(iso, iso)`). */
  mode?: "single" | "range";
  /** Optional inclusive ISO bounds; days outside `[min, max]` are disabled. */
  min?: string;
  max?: string;
  /** User-facing strings; see {@link MiniCalendarLabels}. */
  labels?: Partial<MiniCalendarLabels>;
  /**
   * Take focus to the day the grid opens on — the selected one, or today — when this
   * calendar mounts. For a panel that opened BECAUSE the user asked to pick a date:
   * landing them on the day they are editing is the difference between one arrow key
   * and a hunt through 42 cells.
   *
   * Off by default, and not called `autoFocus`, because it is not the same promise as
   * the DOM attribute of that name: a calendar rendered INLINE (the data-table's
   * column filter draws one above its from/to inputs) must not take the page's focus
   * merely by existing.
   */
  focusOnOpen?: boolean;
  /** Extra classes for the calendar's root. */
  className?: string;
}

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The first day of the week in `locale`, as a `Date#getDay` index.
 *
 * `Intl.Locale#getWeekInfo()` is the standard spelling; V8 shipped it first as the
 * `weekInfo` accessor, and Firefox has neither yet — hence both reads and a Monday
 * fallback, which is ISO 8601 and what this grid did unconditionally before. Its
 * `firstDay` counts 1 = Monday … 7 = Sunday, so `% 7` maps it onto `getDay`.
 */
function localeWeekStart(locale: string | undefined): WeekDay {
  try {
    const tag = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
    const loc = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay;
    if (typeof firstDay === "number") return (firstDay % 7) as WeekDay;
  } catch {
    // A malformed tag throws from `Intl.Locale`; the calendar still has to render.
  }
  return 1;
}

/** Where `d` sits in a week that starts on `weekStart` (the first column = 0). */
const weekdayIndex = (d: Date, weekStart: WeekDay) => (d.getDay() - weekStart + 7) % 7;

/** Move `d` by whole months, keeping the day of the month where the target has one.
 *  `setMonth` alone ROLLS OVER — 31 January + 1 month is 3 March — which would skip
 *  February entirely for anyone paging through the year with PageDown. */
function stepMonths(d: Date, months: number): Date {
  const day = d.getDate();
  const out = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastOfTarget = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, lastOfTarget));
  return out;
}

/**
 * Month-grid range picker used by the data-table date filter. Click once to set
 * the start (and clear the end), click again to set the end; clicking with a
 * full range already selected starts over. The week starts where the locale's does
 * (or at `weekStartsOn`), and every label comes from `Intl` in that locale.
 * In `single` mode each click selects one day. Days outside `min`/`max` (when
 * given) are disabled.
 *
 * **It is a grid, in the APG sense** (audit §a11y, "MiniCalendar is unusable with a
 * keyboard or screen reader"). Before this it was 42 buttons in a `grid-cols-7` div:
 * every one of them in the tab order, none of them saying which date it was, and no
 * way to reach next month without a mouse. Now the month is a `role="grid"` of rows
 * and `gridcell`s, exactly one day is tabbable (the roving tabindex), and the arrows
 * walk the calendar the way the pattern says — day, week, month — crossing into the
 * neighbouring month by MOVING the grid rather than stopping at its edge.
 *
 * Out-of-range days are `aria-disabled` rather than `disabled`, which is the APG
 * guidance and not a shortcut: a `disabled` button cannot be focused, so a bounded
 * month would have holes that the roving tabindex falls into. They stay reachable and
 * readable, and the click handler is what refuses them.
 */
export function MiniCalendar({
  from,
  to,
  locale: localeProp,
  weekStartsOn,
  onSelect,
  mode = "range",
  min,
  max,
  labels: labelsProp,
  focusOnOpen,
  className,
  ...rest
}: MiniCalendarProps) {
  const labels = useKitLabels("miniCalendar", DEFAULT_MINI_CALENDAR_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const weekStart = useMemo(
    () => weekStartsOn ?? localeWeekStart(locale),
    [weekStartsOn, locale],
  );
  // Day numbers through `Intl` too: `getDate()` is always ASCII digits, and a locale
  // that writes its own (Arabic, Persian, Bengali …) would get a grid of foreign
  // numerals under a caption in its own script.
  const dayNumber = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const minDate = min ? parseIsoDate(min) : null;
  const maxDate = max ? parseIsoDate(max) : null;
  const isDisabled = (d: Date) => Boolean((minDate && d < minDate) || (maxDate && d > maxDate));

  const gridRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const monthId = `${id}-month`;
  const hintId = `${id}-hint`;
  const { announce, regionProps } = useAnnounce();

  /**
   * The day that holds the tab order, and with it the visible month — one piece of
   * state, not two, because they cannot be allowed to disagree: a tabbable cell in a
   * month that is not on screen is a tab stop that focuses nothing.
   *
   * Starts on the selection, or on today when there is none, pulled inside `[min, max]`
   * so a bounded calendar opens on a day it will actually let you pick.
   */
  const [activeIso, setActiveIso] = useState(() => {
    const start = fromDate ?? toDate ?? new Date();
    if (minDate && start < minDate) return toLocalIso(minDate);
    if (maxDate && start > maxDate) return toLocalIso(maxDate);
    return toLocalIso(start);
  });

  // Follow the caller's value when it changes from outside (a preset, a cleared
  // filter, a form reset). Written as a render-phase adjustment rather than an effect
  // so the grid never paints one frame on the old month.
  const [lastValue, setLastValue] = useState({ from, to });
  if (lastValue.from !== from || lastValue.to !== to) {
    // Follow the end that actually CHANGED, not `from` unconditionally. Picking the
    // end of a range that spans months used to send the grid back to the start's
    // month — which with a roving tabindex means the cell the user just activated is
    // no longer rendered, and their focus goes with it to `<body>`.
    const changed = lastValue.from !== from ? from : to;
    setLastValue({ from, to });
    const next = parseIsoDate(changed) ?? fromDate ?? toDate;
    if (next && toLocalIso(next) !== activeIso) setActiveIso(toLocalIso(next));
  }

  const activeDate = parseIsoDate(activeIso) ?? new Date();
  const view = { year: activeDate.getFullYear(), month: activeDate.getMonth() };

  const firstOfMonth = new Date(view.year, view.month, 1);
  const lastOfMonth = new Date(view.year, view.month + 1, 0);
  // Leading blanks up to the first of the month, counted from the week's first day.
  const startWeekday = weekdayIndex(firstOfMonth, weekStart);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastOfMonth.getDate(); d++) cells.push(new Date(view.year, view.month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthLabel = firstOfMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });
  const formatDay = (d: Date) => d.toLocaleDateString(locale, DAY_NAME_FORMAT);

  // Weekday labels via locale, from the week's first day: the narrow one for the
  // column head, the long one as its accessible name — "M" is the same letter for
  // Monday, March and May, and a column header is the one place a screen reader
  // reads it on its own.
  const weekdayLabels = useMemo(() => {
    const ref = new Date(2024, 0, 7 + weekStart); // 7 January 2024 was a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      return {
        narrow: d.toLocaleDateString(locale, { weekday: "narrow" }),
        long: d.toLocaleDateString(locale, { weekday: "long" }),
      };
    });
  }, [locale, weekStart]);

  /**
   * A day whose cell has to take focus once it exists. Arrowing off the edge of the
   * month renders a different month, so the element to focus is not in the DOM at the
   * time the key is handled — it is one commit away.
   */
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const iso = pendingFocus.current;
    if (!iso) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-iso="${iso}"]`)?.focus();
  });

  // The roving tab stop is the day to open on, so there is nothing else to work out
  // here — it is already the selection, or today, pulled inside the bounds.
  useEffect(() => {
    if (!focusOnOpen) return;
    gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [focusOnOpen]);

  /** Move the roving tabindex, and the month with it when the day lands outside. */
  const moveTo = (d: Date, focus: boolean) => {
    const iso = toLocalIso(d);
    if (iso === activeIso) return;
    if (focus) pendingFocus.current = iso;
    setActiveIso(iso);
  };

  /**
   * On each day rather than once on the grid: the cell is where focus is, and a
   * container listening for keys it cannot itself receive is the shape
   * `jsx-a11y/interactive-supports-focus` objects to. One shared function, not a
   * closure per cell — it reads the active day from state, which is always the
   * focused one.
   */
  const onDayKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = new Date(activeDate);
    switch (e.key) {
      case "ArrowLeft":
        next.setDate(next.getDate() - 1);
        break;
      case "ArrowRight":
        next.setDate(next.getDate() + 1);
        break;
      case "ArrowUp":
        next.setDate(next.getDate() - 7);
        break;
      case "ArrowDown":
        next.setDate(next.getDate() + 7);
        break;
      case "Home":
        next.setDate(next.getDate() - weekdayIndex(next, weekStart));
        break;
      case "End":
        next.setDate(next.getDate() + (6 - weekdayIndex(next, weekStart)));
        break;
      // Shift+Page is the year step, as in the APG example. It is the only way to
      // reach a birth year without holding PageUp for four hundred keystrokes.
      case "PageUp":
        next.setTime(stepMonths(next, e.shiftKey ? -12 : -1).getTime());
        break;
      case "PageDown":
        next.setTime(stepMonths(next, e.shiftKey ? 12 : 1).getTime());
        break;
      default:
        return;
    }
    // Before the no-op check: every key above also scrolls the panel this calendar
    // usually sits in, and a day that cannot move still must not move the page.
    e.preventDefault();
    moveTo(next, true);
  };

  const moveMonth = (delta: number) => {
    // Focus stays on the arrow button the user is pressing — only the grid moves.
    moveTo(stepMonths(activeDate, delta), false);
  };

  const handleClick = (d: Date) => {
    // The guard that `disabled` used to be. Out-of-range days are focusable on
    // purpose (see the component note), so refusing the click is this function's job.
    if (isDisabled(d)) return;
    const iso = toLocalIso(d);
    // Keep the tab order on the day that was just activated even if the caller
    // ignores the selection — a controlled component may reject it, and the roving
    // tabindex is this component's own state, not an echo of the value.
    moveTo(d, false);
    if (mode === "single") {
      onSelect(iso, iso);
      return;
    }
    const f = parseIsoDate(from);
    const tt = parseIsoDate(to);
    if (!f || (f && tt)) {
      // start a new selection
      onSelect(iso, "");
      announce(labels.startSelected(formatDay(d)));
      return;
    }
    // f set, tt empty
    if (d < f) {
      onSelect(iso, toLocalIso(f));
      announce(labels.rangeSelected(formatDay(d), formatDay(f)));
    } else {
      onSelect(toLocalIso(f), iso);
      announce(labels.rangeSelected(formatDay(f), formatDay(d)));
    }
  };

  const today = new Date();
  const hasBand = Boolean(fromDate && toDate && !sameYmd(fromDate, toDate));
  const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const inRange = (d: Date) => {
    if (!fromDate || !toDate) return false;
    return d >= fromDate && d <= toDate;
  };

  // What the next click does. A range is two clicks and nothing on screen says which
  // one you are on — sighted users read it off the highlighted start.
  const awaitingEnd = Boolean(fromDate) && !toDate;
  const rangeHint = awaitingEnd ? labels.chooseEnd : labels.chooseStart;

  return (
    // The caller's classes come last, so tailwind-merge lets them win the way
    // `className` does everywhere else in the kit; `...rest` first, as in the rest of
    // this wave, so nothing from outside can take the grid's own wiring away.
    <div {...rest} className={cn("select-none", className)}>
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          aria-label={labels.previousMonth}
          className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronLeft className="size-4" />
        </button>
        {/* Named by this element rather than by a string of its own, and `aria-live`
            so paging months says which month you have landed on — the caption is the
            only thing on screen that changes when the grid moves, and the user
            pressing the arrow is not inside the grid to hear the cells change. */}
        <div
          id={monthId}
          aria-live="polite"
          className="text-xs font-medium capitalize text-[var(--text-secondary)]"
        >
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          aria-label={labels.nextMonth}
          className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={monthId}
        aria-describedby={mode === "range" ? hintId : undefined}
        className="grid gap-y-0.5"
      >
        <div
          role="row"
          className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-[var(--text-placeholder)]"
        >
          {weekdayLabels.map((w, i) => (
            <div key={i} role="columnheader" aria-label={w.long} className="py-0.5">
              {w.narrow}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          // No column gap: the days of a range join into ONE band. With a gap each day
          // was its own tinted box, and a selected fortnight read as fourteen chips.
          <div key={wi} role="row" className="grid grid-cols-7">
            {week.map((d, di) => {
              // The padding cells still have to BE cells, or the rows are ragged and
              // a screen reader's "column 3" stops meaning Wednesday.
              if (!d) return <div key={di} role="gridcell" className="h-8" />;
              const iso = toLocalIso(d);
              const disabled = isDisabled(d);
              const isStart = !disabled && fromDate && sameYmd(d, fromDate);
              const isEnd = !disabled && toDate && sameYmd(d, toDate);
              const isToday = sameYmd(d, today);
              const isInRange = !disabled && inRange(d) && !isStart && !isEnd;
              const isActive = iso === activeIso;
              // The band behind the day: full width between the ends, half width at an
              // end (so the round endpoint sits ON the band's tip), rounded where a row
              // or the month breaks it. Only when both ends exist and differ — a lone
              // start is a dot, not a band of one.
              const banded =
                hasBand && !disabled && (isStart || isEnd || isInRange);
              const lastOfMonth = d.getDate() === daysInMonth(d);
              const band = banded
                ? cn(
                    "pointer-events-none absolute inset-y-0 bg-[var(--brand-bg)]",
                    isStart ? "start-1/2 end-0" : isEnd ? "start-0 end-1/2" : "inset-x-0",
                    isInRange && (di === 0 || d.getDate() === 1) && "rounded-s-full",
                    isInRange && (di === 6 || lastOfMonth) && "rounded-e-full",
                    isStart && (di === 6 || lastOfMonth) && "hidden",
                    isEnd && (di === 0 || d.getDate() === 1) && "hidden",
                  )
                : null;
              return (
                <div key={di} role="none" className="relative flex h-8 items-center justify-center">
                {band && <span aria-hidden className={band} />}
                <button
                  key={di}
                  type="button"
                  role="gridcell"
                  data-iso={iso}
                  // The roving tabindex: ONE tab stop for the whole month. Every day
                  // being tabbable meant 31 stops between a date field and the next
                  // control, which is the same reason the pattern exists.
                  tabIndex={isActive ? 0 : -1}
                  aria-label={labels.day(formatDay(d))}
                  aria-selected={Boolean(isStart || isEnd || isInRange)}
                  aria-disabled={disabled || undefined}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => handleClick(d)}
                  onKeyDown={onDayKeyDown}
                  className={cn(
                    "relative size-8 rounded-full text-xs tabular-nums transition-colors",
                    // A grid you can walk with the keyboard needs to show where the
                    // keyboard IS. Inset because the cells sit half a pixel apart and
                    // an outset ring would be drawn over by its neighbours; the
                    // colour flips on the selected days for the reason the numpad's
                    // "Done" key does — a --brand ring on a --brand fill is a ring
                    // that exists only in the DOM.
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                    isStart || isEnd
                      ? "focus-visible:ring-[var(--brand-contrast)]"
                      : "focus-visible:ring-[var(--brand)]",
                    disabled
                      ? "cursor-not-allowed text-[var(--text-placeholder)]"
                      // The two selected states are the BRAND, not a fixed sky: the endpoints
                      // are the solid fill and the days between them its soft tint. Hardcoding
                      // them left an app that changed `--brand` with a calendar in the old
                      // colour (docs/module-audit-2026-09-22.md §theming). Both token pairs
                      // flip light/dark themselves, so there is no `dark:` partner to carry —
                      // one would override the token and bring the hardcoded hue back.
                      : isStart || isEnd
                        ? "bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]"
                        : isInRange
                          ? "font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-bg-hover)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                    isToday && !isStart && !isEnd && !isInRange && !disabled && "ring-1 ring-inset ring-[var(--border-strong)]",
                  )}
                >
                  {dayNumber.format(d.getDate())}
                </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* `sr-only-fixed`, not `sr-only`: this renders inside whatever panel a consumer
          opens it in, and there is no wrapper we can require to be `relative` — see
          the note on the class in tokens.css. */}
      {mode === "range" && (
        <span id={hintId} className="sr-only-fixed">
          {rangeHint}
        </span>
      )}
      <span {...regionProps} />
    </div>
  );
}
