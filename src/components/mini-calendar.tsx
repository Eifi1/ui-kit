import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";
import { parseIsoDate, sameYmd, toLocalIso } from "../lib/dates";

export interface MiniCalendarProps {
  from: string;
  to: string;
  locale: string;
  onSelect: (from: string, to: string) => void;
  /** `"range"` (default) = two-click from→to; `"single"` = one click selects a
   *  single day (emitted as `onSelect(iso, iso)`). */
  mode?: "single" | "range";
  /** Optional inclusive ISO bounds; days outside `[min, max]` are disabled. */
  min?: string;
  max?: string;
  /** Screen-reader names for the two month arrows. The package carries no
   *  translation catalog (see the README), so every user-facing string is a prop
   *  with an English default — these two were the exception, and a German app
   *  reached this component through a bare re-export and announced them in
   *  English on a page whose `<html lang>` says `de`. */
  labels?: { previousMonth?: string; nextMonth?: string };
}

/**
 * Month-grid range picker used by the data-table date filter. Click once to set
 * the start (and clear the end), click again to set the end; clicking with a
 * full range already selected starts over. Monday-first, locale-aware labels.
 * In `single` mode each click selects one day. Days outside `min`/`max` (when
 * given) are disabled.
 */
export function MiniCalendar({
  from,
  to,
  locale,
  onSelect,
  mode = "range",
  min,
  max,
  labels,
}: MiniCalendarProps) {
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  const minDate = min ? parseIsoDate(min) : null;
  const maxDate = max ? parseIsoDate(max) : null;
  const isDisabled = (d: Date) => Boolean((minDate && d < minDate) || (maxDate && d > maxDate));
  const initial = fromDate ?? toDate ?? new Date();
  const [view, setView] = useState<{ year: number; month: number }>({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [lastKey, setLastKey] = useState(`${from}|${to}`);
  const currentKey = `${from}|${to}`;
  if (currentKey !== lastKey) {
    setLastKey(currentKey);
    const next = parseIsoDate(from) ?? parseIsoDate(to);
    if (next && (next.getFullYear() !== view.year || next.getMonth() !== view.month)) {
      setView({ year: next.getFullYear(), month: next.getMonth() });
    }
  }

  const firstOfMonth = new Date(view.year, view.month, 1);
  const lastOfMonth = new Date(view.year, view.month + 1, 0);
  // Monday-first grid
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastOfMonth.getDate(); d++) cells.push(new Date(view.year, view.month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = firstOfMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });

  // Monday..Sunday short weekday labels via locale
  const weekdayLabels = useMemo(() => {
    const ref = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "narrow" });
    });
  }, [locale]);

  const move = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleClick = (d: Date) => {
    const iso = toLocalIso(d);
    if (mode === "single") {
      onSelect(iso, iso);
      return;
    }
    const f = parseIsoDate(from);
    const tt = parseIsoDate(to);
    if (!f || (f && tt)) {
      // start a new selection
      onSelect(iso, "");
      return;
    }
    // f set, tt empty
    if (d < f) {
      onSelect(iso, toLocalIso(f));
    } else {
      onSelect(toLocalIso(f), iso);
    }
  };

  const today = new Date();
  const inRange = (d: Date) => {
    if (!fromDate || !toDate) return false;
    return d >= fromDate && d <= toDate;
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label={labels?.previousMonth ?? "Previous month"}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-xs font-medium capitalize text-slate-700 dark:text-slate-200">{monthLabel}</div>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label={labels?.nextMonth ?? "Next month"}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-slate-400 dark:text-slate-500">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="py-0.5">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-7" />;
          const disabled = isDisabled(d);
          const isStart = !disabled && fromDate && sameYmd(d, fromDate);
          const isEnd = !disabled && toDate && sameYmd(d, toDate);
          const isToday = sameYmd(d, today);
          const isInRange = !disabled && inRange(d) && !isStart && !isEnd;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(d)}
              className={cn(
                "h-7 text-xs rounded transition-colors",
                disabled
                  ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                  : isStart || isEnd
                    ? "bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
                    : isInRange
                      ? "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                isToday && !isStart && !isEnd && !isInRange && !disabled && "ring-1 ring-inset ring-slate-300 dark:ring-slate-600",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
