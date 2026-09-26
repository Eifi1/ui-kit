import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { cn } from "../lib/cn";
import { dirOf, horizontalStep } from "../lib/direction";
import { addMonthsClamped, localeWeekStart, parseIsoDate, toLocalIso } from "../lib/dates";
import { useKitLabels, useKitLocale, useKitWeekStart } from "../i18n/kit-labels";
import { Tooltip } from "./tooltip";
import type { WeekDay } from "./mini-calendar";

/**
 * Every string the heatmap speaks — the `calendarHeatmap` namespace of
 * `<UiKitProvider labels>`, overridable per instance through `labels`. Dates and
 * values arrive already formatted (in `locale`, and through `formatValue`), so the
 * functions only arrange them.
 */
export interface CalendarHeatmapLabels {
  /** Accessible name of the grid. */
  grid: string;
  /**
   * One day: its accessible name, and the tooltip unless `tooltip` is given. `date`
   * is the whole date in `locale` ("Monday, 14 September 2026"), `value` the day's
   * figure through `formatValue`.
   */
  day: (date: string, value: string) => string;
  /** The two ends of the legend's scale. */
  less: string;
  more: string;
  /** `maxDays` cut the window: how many of its earliest days are not drawn. */
  truncated: (count: number) => string;
}

/** English defaults, exported as the `calendarHeatmap` namespace of `UiKitLabels`. */
export const DEFAULT_CALENDAR_HEATMAP_LABELS: CalendarHeatmapLabels = {
  grid: "Daily values",
  day: (date, value) => `${date}: ${value}`,
  less: "Less",
  more: "More",
  truncated: (count) =>
    `Showing the most recent days; ${count} earlier ${count === 1 ? "day is" : "days are"} not shown.`,
};

/** One day's figure. Several entries for one date are added up. */
export interface CalendarHeatmapDatum {
  /** "YYYY-MM-DD". */
  date: string;
  value: number;
}

/** What `tooltip` is told about the day under the pointer. */
export interface CalendarHeatmapDay {
  iso: string;
  date: Date;
  /** The day's figure; `0` when `data` has no entry for it (see `hasData`). */
  value: number;
  hasData: boolean;
  /** `0` = empty … `levels` = the busiest. */
  level: number;
  /** The whole date in `locale`. */
  formattedDate: string;
  /** `value` through `formatValue`. */
  formattedValue: string;
}

/**
 * `onSelect` is omitted from the `<div>` attributes for the reason `MiniCalendar` gives:
 * the DOM event of that name is a text-selection event, and this one answers with a date.
 */
export interface CalendarHeatmapProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  data: readonly CalendarHeatmapDatum[];
  /** The window, inclusive, as "YYYY-MM-DD". */
  from: string;
  to: string;
  /**
   * `"weeks"` (default): the contribution-graph shape — one COLUMN per week, the
   * weekdays down the side, month names along the top; a year fits in ~53 small
   * squares and scrolls sideways where it does not. `"month"`: a 7-column calendar
   * with day numbers in large square cells, for a single month on a phone (switch on
   * `useMediaQuery` and narrow `from`/`to` to the month).
   */
  layout?: "weeks" | "month";
  /** The day shown as selected ("YYYY-MM-DD"). */
  selected?: string;
  /** Makes each day a button: a click (or Enter/Space) selects it — a drill-down into
   *  that day's rows, a day panel. Without it the days are focusable but inert. */
  onSelect?: (iso: string) => void;
  /** How a value is written in the tooltip and the day's name. Default: `Intl.NumberFormat`
   *  in `locale`. Pass a currency formatter for money. */
  formatValue?: (value: number) => string;
  /** Tooltip content for a day. Default: `labels.day(date, value)`. */
  tooltip?: (day: CalendarHeatmapDay) => ReactNode;
  /**
   * Tag each tooltip `data-private`, so the host's demo-mode rule blurs it (the
   * attribute `Tooltip redact` and `StatTile sensitive` carry). ON by default: a heatmap
   * is almost always the user's own figures, and a missing tag is silent — the grid
   * looks anonymous and the bubble spells the amount out on hover.
   */
  sensitive?: boolean;
  /** The value that reaches the top of the scale. Default: the largest value ON SCREEN,
   *  so a peak outside the window does not wash the drawn days out to empty. */
  max?: number;
  /** How many non-empty intensity steps. Default 4. */
  levels?: number;
  /** The scale's colour, as any CSS colour. Default `var(--brand)`; each step is this
   *  mixed into `--bg-surface`, so the ramp follows the theme. */
  color?: string;
  /**
   * The most days to draw. A longer window keeps its LATEST `maxDays` and says how many
   * it left out (`labels.truncated`) rather than silently ending. Default: no cap.
   */
  maxDays?: number;
  /** Draw the Less … More legend. Default `true`. */
  legend?: boolean;
  /** BCP 47 tag for the dates, month and weekday names and numbers. */
  locale?: string;
  /** `0` = Sunday … `6` = Saturday. Default: the provider's, else the locale's. */
  weekStartsOn?: WeekDay;
  labels?: Partial<CalendarHeatmapLabels>;
  className?: string;
}

const DAY_NAME_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/** The empty day: a wash of the text colour, like `--bg-hover`, so it reads as a cell
 *  on both themes without claiming any value. */
const EMPTY_FILL = "color-mix(in oklab, var(--text-primary) 8%, var(--bg-surface))";

const weekdayIndex = (d: Date, weekStart: WeekDay) => (d.getDay() - weekStart + 7) % 7;

/** The step a value falls on: 0 for nothing, else 1…levels by its share of `max`. */
export function heatmapLevel(value: number, max: number, levels: number): number {
  if (!(value > 0) || !(max > 0) || levels < 1) return 0;
  return Math.min(levels, Math.max(1, Math.ceil((value / max) * levels)));
}

/** How much of `color` a step mixes into the surface: 20% for the first step, 100% for
 *  the last — the floor keeps the smallest value visibly apart from an empty day. */
function levelPercent(level: number, levels: number): number {
  if (levels <= 1) return 100;
  return Math.round(20 + (80 * (level - 1)) / (levels - 1));
}

function levelFill(level: number, levels: number, color: string): string {
  if (level === 0) return EMPTY_FILL;
  return `color-mix(in oklab, ${color} ${levelPercent(level, levels)}%, var(--bg-surface))`;
}

/**
 * Days as a grid of shaded squares — how much happened on each, at a glance
 * (a contribution graph, a spending calendar).
 *
 * **Every day is a cell you can reach.** The grid is a `role="grid"` with ONE tab
 * stop (the roving tabindex, as in `MiniCalendar`); the arrows move by the grid's own
 * geometry — in `"weeks"` ↑/↓ are the previous/next day and ←/→ a week, in `"month"`
 * the other way round, mirrored in RTL — PageUp/PageDown move a month and Home/End go
 * to the window's first/last day. Each cell is named with its whole date AND its value,
 * because the colour is not something a screen reader can say, and carries
 * `data-day="YYYY-MM-DD"` as its identity for tests and for the host.
 *
 * The tooltip is portalled (a year of squares always sits in a sideways scroller) and
 * `data-private` unless `sensitive={false}`. Cell size in `"weeks"` is the CSS variable
 * `--heatmap-cell` (default `0.75rem`): `style={{ "--heatmap-cell": "1rem" }}`.
 */
export function CalendarHeatmap({
  data,
  from,
  to,
  layout = "weeks",
  selected,
  onSelect,
  formatValue: formatValueProp,
  tooltip,
  sensitive = true,
  max: maxProp,
  levels = 4,
  color = "var(--brand)",
  maxDays,
  legend = true,
  locale: localeProp,
  weekStartsOn,
  labels: labelsProp,
  className,
  "aria-label": ariaLabel,
  ...rest
}: CalendarHeatmapProps) {
  const labels = useKitLabels("calendarHeatmap", DEFAULT_CALENDAR_HEATMAP_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const providerWeekStart = useKitWeekStart();
  const weekStart: WeekDay = weekStartsOn ?? providerWeekStart ?? localeWeekStart(locale);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatValue = formatValueProp ?? ((v: number) => numberFormat.format(v));

  const values = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data) m.set(p.date, (m.get(p.date) ?? 0) + p.value);
    return m;
  }, [data]);

  // The window, trimmed from the FRONT: the days a person looks for are the recent
  // ones, and a cap that kept the oldest would end the calendar before today.
  const { days, dropped } = useMemo(() => {
    const start = parseIsoDate(from);
    const end = parseIsoDate(to);
    const list: Date[] = [];
    if (!start || !end || end < start) return { days: list, dropped: 0 };
    const cursor = new Date(end);
    const cap = maxDays && maxDays > 0 ? maxDays : Infinity;
    while (cursor >= start && list.length < cap) {
      list.unshift(new Date(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
    const first = list[0];
    const trimmed = first ? Math.round((first.getTime() - start.getTime()) / 86_400_000) : 0;
    return { days: list, dropped: Math.max(0, trimmed) };
  }, [from, to, maxDays]);

  const firstIso = days.length ? toLocalIso(days[0]) : "";
  const lastIso = days.length ? toLocalIso(days[days.length - 1]) : "";

  const max = useMemo(() => {
    if (maxProp !== undefined) return maxProp;
    let m = 0;
    for (const d of days) m = Math.max(m, values.get(toLocalIso(d)) ?? 0);
    return m;
  }, [maxProp, days, values]);

  const clampIso = (iso: string) => (iso < firstIso ? firstIso : iso > lastIso ? lastIso : iso);

  // The roving tab stop: the selected day, else the latest one.
  const [activeState, setActiveIso] = useState(() => selected || lastIso);
  const [lastSelected, setLastSelected] = useState(selected);
  if (lastSelected !== selected) {
    setLastSelected(selected);
    if (selected) setActiveIso(selected);
  }
  const activeIso = days.length ? clampIso(activeState || lastIso) : "";

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const iso = pendingFocus.current;
    if (!iso) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${iso}"]`)?.focus();
  });

  // Open the sideways scroller on the latest weeks, not the oldest. In RTL the end is
  // on the left, where browsers count scrollLeft down from 0.
  //
  // And KEEP it there while the box changes size — a sidebar or a contents rail that
  // appears after mount narrows the scroller, which leaves scrollLeft where it was and
  // so shows older weeks than it opened on. The pin holds only while the view sits at
  // the end: a user who scrolls back through the year unpins it, and a resize then
  // leaves their position alone. (Scrolling back to the end pins it again.)
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || layout !== "weeks") return;
    const toEnd = () => {
      el.scrollLeft = dirOf(el) === "rtl" ? -el.scrollWidth : el.scrollWidth;
    };
    toEnd();
    if (typeof ResizeObserver === "undefined") return;
    // |scrollLeft| covers both directions: 0 → max in LTR, 0 → -max in RTL.
    let pinned = true;
    const onScroll = () => {
      pinned = Math.abs(el.scrollLeft) >= el.scrollWidth - el.clientWidth - 1;
    };
    const ro = new ResizeObserver(() => {
      if (pinned) toEnd();
    });
    el.addEventListener("scroll", onScroll, { passive: true });
    ro.observe(el);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, [layout, firstIso, lastIso]);

  const formatDay = (d: Date) => d.toLocaleDateString(locale, DAY_NAME_FORMAT);

  const weekdayLabels = useMemo(() => {
    const ref = new Date(2024, 0, 7 + weekStart); // 7 January 2024 was a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ref);
      d.setDate(ref.getDate() + i);
      return {
        short: d.toLocaleDateString(locale, { weekday: "short" }),
        long: d.toLocaleDateString(locale, { weekday: "long" }),
      };
    });
  }, [locale, weekStart]);

  const lead = days.length ? weekdayIndex(days[0], weekStart) : 0;
  const weekCount = Math.ceil((lead + days.length) / 7);
  /** The day at position `i` of the week-aligned sequence (blanks before the first). */
  const dayAt = (i: number): Date | null => (i >= lead && i - lead < days.length ? days[i - lead] : null);

  const move = (e: KeyboardEvent<HTMLElement>) => {
    const current = parseIsoDate(activeIso);
    if (!current) return;
    const next = new Date(current);
    const step = horizontalStep(e.key, e.currentTarget);
    // In "weeks" a row is a weekday, so sideways is a week and up/down is a day.
    const across = layout === "weeks" ? 7 : 1;
    const down = layout === "weeks" ? 1 : 7;
    switch (step ? "horizontal" : e.key) {
      case "horizontal":
        next.setDate(next.getDate() + step * across);
        break;
      case "ArrowUp":
        next.setDate(next.getDate() - down);
        break;
      case "ArrowDown":
        next.setDate(next.getDate() + down);
        break;
      case "PageUp":
        next.setTime(addMonthsClamped(next, -1).getTime());
        break;
      case "PageDown":
        next.setTime(addMonthsClamped(next, 1).getTime());
        break;
      case "Home":
        next.setTime(days[0].getTime());
        break;
      case "End":
        next.setTime(days[days.length - 1].getTime());
        break;
      default:
        return;
    }
    e.preventDefault();
    const iso = clampIso(toLocalIso(next));
    if (iso === activeIso) return;
    pendingFocus.current = iso;
    setActiveIso(iso);
  };

  const legendLevels = Array.from({ length: levels + 1 }, (_, l) => l);

  const cell = (d: Date, wrapClass: string, cellClass: string, withNumber: boolean) => {
    const iso = toLocalIso(d);
    const raw = values.get(iso);
    const value = raw ?? 0;
    const level = heatmapLevel(value, max, levels);
    const fill = levelFill(level, levels, color);
    const formattedDate = formatDay(d);
    const formattedValue = formatValue(value);
    const name = labels.day(formattedDate, formattedValue);
    const label = tooltip
      ? tooltip({ iso, date: d, value, hasData: raw !== undefined, level, formattedDate, formattedValue })
      : name;
    const isSelected = selected === iso;
    // Light text once the fill is the stronger half of the mix — `--bg-surface` is the
    // colour the scale is mixed INTO, so it is the one that contrasts with its far end
    // on either theme.
    const strong = level > 0 && levelPercent(level, levels) >= 45;
    const shared = {
      role: "gridcell",
      "data-day": iso,
      "data-level": level,
      tabIndex: iso === activeIso ? 0 : -1,
      "aria-label": name,
      "aria-selected": onSelect ? isSelected : undefined,
      onKeyDown: move,
      onFocus: () => {
        if (iso !== activeIso) setActiveIso(iso);
      },
      style: { background: fill, color: strong ? "var(--bg-surface)" : "var(--text-primary)" },
      className: cn(
        cellClass,
        isSelected && "ring-2 ring-[var(--text-primary)]",
        onSelect && "cursor-pointer hover:ring-1 hover:ring-[var(--brand)]",
      ),
    } as const;
    const inner = withNumber ? (
      <span aria-hidden className="text-[11px] leading-none tabular-nums">
        {numberFormat.format(d.getDate())}
      </span>
    ) : null;
    return (
      <Tooltip key={iso} label={label} portal redact={sensitive} role="none" className={wrapClass}>
        {onSelect ? (
          <button type="button" {...shared} onClick={() => onSelect(iso)}>
            {inner}
          </button>
        ) : (
          <div {...shared}>{inner}</div>
        )}
      </Tooltip>
    );
  };

  const gridName = ariaLabel ?? labels.grid;
  let body: ReactNode;
  if (layout === "weeks") {
    const columns = { gridTemplateColumns: `var(--heatmap-label, 2rem) repeat(${weekCount}, var(--heatmap-cell, 0.75rem))` } as CSSProperties;
    const cellSize = "size-[var(--heatmap-cell,0.75rem)]";
    // A month's name over the first column that holds its 1st — or over the first
    // column, when the window opens far enough before the next month for it to fit.
    const monthLabels = Array.from({ length: weekCount }, (_, w) => {
      for (let r = 0; r < 7; r++) {
        const d = dayAt(w * 7 + r);
        if (d && (d.getDate() === 1 || (w === 0 && r === lead && d.getDate() <= 14))) {
          return d.toLocaleDateString(locale, { month: "short" });
        }
      }
      return "";
    });
    body = (
      <div ref={scrollerRef} className="overflow-x-auto pb-1">
        <div ref={gridRef} role="grid" aria-label={gridName} className="inline-grid gap-0.5">
          {/* Decoration: every cell's name already carries its month. */}
          <div aria-hidden className="grid gap-0.5 text-[10px] leading-3 text-[var(--text-muted)]" style={columns}>
            <span />
            {monthLabels.map((m, w) => (
              <span key={w} className="overflow-visible whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, r) => (
            <div key={r} role="row" className="grid gap-0.5" style={columns}>
              <div
                role="rowheader"
                aria-label={weekdayLabels[r].long}
                className="overflow-hidden pe-1 text-[10px] leading-3 text-[var(--text-muted)]"
              >
                {/* Every other weekday, as a contribution graph does: seven labels
                    at this size are a smear. The name is there for all seven. */}
                {r % 2 === 1 ? weekdayLabels[r].short : ""}
              </div>
              {Array.from({ length: weekCount }, (_, w) => {
                const d = dayAt(w * 7 + r);
                return d ? (
                  cell(d, cellSize, cn(cellSize, "block rounded-sm"), false)
                ) : (
                  <div key={`pad-${w}`} role="gridcell" className={cellSize} />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const rows = Array.from({ length: weekCount }, (_, w) => w);
    body = (
      <div ref={gridRef} role="grid" aria-label={gridName} className="grid gap-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((w, i) => (
            <div
              key={i}
              role="columnheader"
              aria-label={w.long}
              className="pb-0.5 text-center text-[10px] uppercase tracking-wide text-[var(--text-muted)]"
            >
              {w.short}
            </div>
          ))}
        </div>
        {rows.map((w) => (
          <div key={w} role="row" className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, c) => {
              const d = dayAt(w * 7 + c);
              return d ? (
                cell(d, "aspect-square w-full", "flex h-full w-full items-center justify-center rounded", true)
              ) : (
                <div key={`pad-${c}`} role="gridcell" className="aspect-square" />
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div {...rest} className={cn("min-w-0", className)}>
      {dropped > 0 && (
        <div className="mb-2 text-xs text-[var(--text-muted)]">{labels.truncated(dropped)}</div>
      )}
      {body}
      {legend && (
        <div aria-hidden className="mt-2 flex items-center justify-end gap-1 text-[10px] text-[var(--text-muted)]">
          <span className="me-0.5">{labels.less}</span>
          {legendLevels.map((l) => (
            <span
              key={l}
              data-legend-level={l}
              className="size-2.5 rounded-sm"
              style={{ background: levelFill(l, levels, color) }}
            />
          ))}
          <span className="ms-0.5">{labels.more}</span>
        </div>
      )}
    </div>
  );
}
