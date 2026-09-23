import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  CHART_COLORS,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Treemap,
  cn,
  paletteFor,
  useAnnounce,
} from "@eifi1/ui-kit";
import type { ChartConfig, TreemapNode } from "@eifi1/ui-kit";
import { Example, Note, Stage } from "../lib/section";
import { useChartHex } from "../stores";

/**
 * Chart drilldowns — the pattern keksdose's reports use, on fixture data.
 *
 * The shape is the same in both specimens:
 *  - the drill state is a PATH (the ids chosen so far), never a copy of the data, so
 *    every level is derived from one fixture and the levels cannot disagree;
 *  - a breadcrumb of real buttons walks back up, plus an "Up" and a "Reset";
 *  - the chart sits in a wrapper KEYED by the path, so a level change remounts it and
 *    the kit's `.animate-drill` class plays its ease-in instead of the bars snapping;
 *  - the title (and, on the bar chart, the legend) says which level is on screen;
 *  - the change is announced through `useAnnounce`, and focus that the remount would
 *    have dropped on <body> is put back on the level's title.
 *
 * keksdose keeps the path in the URL (`?group=`), so the browser's Back button drills
 * up and a drilled view can be shared. The showcase keeps it in component state: this
 * page's hash is the router's, and two demos writing query params would fight.
 */

// ── Formatters ───────────────────────────────────────────────────────────────

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const COMPACT = new Intl.NumberFormat("en-GB", { notation: "compact" });
const PERCENT = new Intl.NumberFormat("en-GB", {
  style: "percent",
  maximumFractionDigits: 1,
});
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});
const MONTH_LONG = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortMonth = (period: string) => MONTH_SHORT.format(new Date(`${period}-01T00:00:00Z`));
const longMonth = (period: string) => MONTH_LONG.format(new Date(`${period}-01T00:00:00Z`));
const moneyAndShare = (v: number, share: number | undefined) =>
  share == null ? MONEY.format(v) : `${MONEY.format(v)} · ${PERCENT.format(share)}`;

// ── Fixture: a household budget ─────────────────────────────────────────────
//
// Groups → categories → payees, and a monthly amount per category. Payee amounts are
// SPLIT from the category's month by fixed weights (the last payee takes the rounding
// remainder), so every level sums exactly to the level above it — a drilldown whose
// parts do not add up to the bar you clicked teaches the reader to distrust it.

interface Category {
  id: string;
  name: string;
  /** Typical monthly spend. */
  base: number;
  /** Relative month-to-month swing; 0 for a fixed bill. */
  swing: number;
  payees: ReadonlyArray<readonly [name: string, weight: number]>;
}

interface Group {
  id: string;
  name: string;
  categories: Category[];
}

const GROUPS: Group[] = [
  {
    id: "housing",
    name: "Housing",
    categories: [
      {
        id: "rent",
        name: "Rent",
        base: 1050,
        swing: 0,
        payees: [["Riverside Lettings", 1]],
      },
      {
        id: "council",
        name: "Council tax",
        base: 152,
        swing: 0,
        payees: [["City Council", 1]],
      },
      {
        id: "insurance",
        name: "Home insurance",
        base: 38,
        swing: 0,
        payees: [["Harbour Mutual", 1]],
      },
    ],
  },
  {
    id: "food",
    name: "Food",
    categories: [
      {
        id: "groceries",
        name: "Groceries",
        base: 390,
        swing: 0.14,
        payees: [
          ["Greenway Foods", 0.58],
          ["Farmers' market", 0.16],
          ["Corner Bakery", 0.12],
          ["Late-night shop", 0.14],
        ],
      },
      {
        id: "eating-out",
        name: "Eating out",
        base: 120,
        swing: 0.35,
        payees: [
          ["Pizzeria Roma", 0.4],
          ["Noodle Bar", 0.35],
          ["Café Aurora", 0.25],
        ],
      },
    ],
  },
  {
    id: "transport",
    name: "Transport",
    categories: [
      {
        id: "rail",
        name: "Rail",
        base: 124,
        swing: 0.08,
        payees: [
          ["Northern Rail", 0.82],
          ["City Bikes", 0.18],
        ],
      },
      {
        id: "fuel",
        name: "Fuel",
        base: 64,
        swing: 0.3,
        payees: [
          ["Station Road Garage", 0.7],
          ["Motorway services", 0.3],
        ],
      },
    ],
  },
  {
    id: "bills",
    name: "Bills",
    categories: [
      {
        id: "energy",
        name: "Energy",
        base: 140,
        swing: 0.25,
        payees: [["Brightside Energy", 1]],
      },
      {
        id: "broadband",
        name: "Broadband",
        base: 35,
        swing: 0,
        payees: [["Fibrely", 1]],
      },
      {
        id: "mobile",
        name: "Mobile",
        base: 18,
        swing: 0,
        payees: [["Tello", 1]],
      },
    ],
  },
  {
    id: "leisure",
    name: "Leisure",
    categories: [
      {
        id: "streaming",
        name: "Streaming",
        base: 22,
        swing: 0,
        payees: [
          ["StreamFlix", 0.55],
          ["Tunebox", 0.45],
        ],
      },
      {
        id: "cinema",
        name: "Cinema",
        base: 24,
        swing: 0.6,
        payees: [["Odeon Riverside", 1]],
      },
      {
        id: "books",
        name: "Books",
        base: 30,
        swing: 0.45,
        payees: [
          ["Chapter & Verse", 0.6],
          ["Charity bookshop", 0.4],
        ],
      },
    ],
  },
  {
    id: "health",
    name: "Health",
    categories: [
      {
        id: "gym",
        name: "Gym",
        base: 30,
        swing: 0,
        payees: [["PureMotion Gym", 1]],
      },
      {
        id: "pharmacy",
        name: "Pharmacy",
        base: 20,
        swing: 0.5,
        payees: [
          ["High Street Chemist", 0.7],
          ["Online pharmacy", 0.3],
        ],
      },
    ],
  },
];

const MONTHS = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"] as const;
const RANGE_LABEL = "January–June 2025";

const CATEGORIES = GROUPS.flatMap((g, groupIndex) =>
  g.categories.map((c, i) => ({
    ...c,
    group: g,
    groupIndex,
    seed: groupIndex * 3 + i,
  })),
);
type FlatCategory = (typeof CATEGORIES)[number];

/** A deterministic curve, not `Math.random()`: a specimen that redraws differently on
 *  every mount cannot be compared against the same page five minutes ago. */
function monthAmount(c: FlatCategory, monthIndex: number): number {
  return Math.round(c.base * (1 + c.swing * Math.sin(monthIndex * 1.3 + c.seed)));
}

/** Split `total` by the payee weights; the last payee absorbs the rounding. */
function splitPayees(c: FlatCategory, total: number): TreemapNode[] {
  let left = total;
  return c.payees.map(([name, weight], i) => {
    const value = i === c.payees.length - 1 ? left : Math.round(total * weight);
    left -= value;
    return { id: `${c.id}:${name}`, name, value };
  });
}

function categoryTotal(c: FlatCategory, months: readonly number[]): number {
  return months.reduce((sum, m) => sum + monthAmount(c, m), 0);
}

const ALL_MONTHS = MONTHS.map((_, i) => i);
const byValueDesc = (a: { value: number }, b: { value: number }) => b.value - a.value;

// ── Shared chrome ───────────────────────────────────────────────────────────

interface Crumb {
  label: string;
  /** Absent on the last crumb, the level on screen — it is where you are, not a link. */
  onSelect?: () => void;
}

/** The drill path as a breadcrumb of real buttons, plus Up and Reset. */
function DrillBar({ crumbs, label }: { crumbs: Crumb[]; label: string }) {
  const up = crumbs.length > 1 ? crumbs[crumbs.length - 2]?.onSelect : undefined;
  const reset = crumbs.length > 1 ? crumbs[0]?.onSelect : undefined;
  const control =
    "rounded px-1.5 py-0.5 text-[var(--brand)] hover:bg-[var(--bg-hover)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--brand)] disabled:cursor-default disabled:text-[var(--text-muted)] disabled:no-underline disabled:hover:bg-transparent";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <nav aria-label={label}>
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <span aria-hidden className="text-[var(--text-muted)]">
                  ›
                </span>
              )}
              {c.onSelect ? (
                <button type="button" onClick={c.onSelect} className={control}>
                  {c.label}
                </button>
              ) : (
                <span aria-current="page" className="px-1.5 font-medium text-[var(--text-primary)]">
                  {c.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex items-center gap-1">
        <button type="button" onClick={up} disabled={!up} className={control}>
          ↑ Up
        </button>
        <button type="button" onClick={reset} disabled={!reset} className={control}>
          Reset
        </button>
      </div>
    </div>
  );
}

/**
 * The level's heading, and where focus goes when a level change removed the element
 * that had it (a tile, a crumb that is now the current one). Only when focus WAS lost:
 * a keyboard user drilling through the bar chart keeps focus on the chart.
 */
function useDrillFocus(pathKey: string) {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const active = document.activeElement;
    if (!active || active === document.body || !rootRef.current?.contains(active)) {
      titleRef.current?.focus();
    }
  }, [pathKey]);
  return { rootRef, titleRef };
}

function LevelTitle({
  titleRef,
  children,
  sub,
}: {
  titleRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
  sub: ReactNode;
}) {
  return (
    <div>
      <h4
        ref={titleRef}
        tabIndex={-1}
        className="rounded text-sm font-semibold text-[var(--text-primary)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
      >
        {children}
      </h4>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

// ── 1. Bar chart: months → categories → payees ─────────────────────────────

interface BarPath {
  month?: number;
  category?: string;
}

interface BarRow {
  key: string;
  label: string;
  value: number;
  /** The bar's paint, a config colour (`var(--color-<key>)`). On the row rather than
   *  only on the Cell because the tooltip reads its swatch from the datum's `fill`. */
  fill: string;
}

function BarDrilldown() {
  const [path, setPath] = useState<BarPath>({});
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const { announce, regionProps } = useAnnounce();
  const pathKey = `${path.month ?? "all"}/${path.category ?? ""}`;
  const { rootRef, titleRef } = useDrillFocus(pathKey);
  const readoutId = useId();

  const category = CATEGORIES.find((c) => c.id === path.category);
  const monthLabel = path.month != null ? longMonth(MONTHS[path.month]!) : "";

  // Each level derives its rows, title, config and legend from the path alone.
  let rows: BarRow[];
  let title: string;
  let sub: string;
  let config: ChartConfig;
  let horizontal = false;
  if (path.month == null) {
    rows = MONTHS.map((m, i) => ({
      key: m,
      label: shortMonth(m),
      value: CATEGORIES.reduce((s, c) => s + monthAmount(c, i), 0),
      fill: "var(--color-spent)",
    }));
    title = "Monthly spending";
    sub = `${RANGE_LABEL} · click a month to see where it went`;
    config = { spent: { label: "Spent", color: CHART_COLORS.expense } };
  } else if (!category) {
    const month = path.month;
    rows = CATEGORIES.map((c) => ({
      key: c.id,
      label: c.name,
      value: monthAmount(c, month),
      fill: `var(--color-${c.group.id})`,
    })).sort(byValueDesc);
    title = `${monthLabel} by category`;
    sub = "Coloured by group · click a category for its payees";
    config = Object.fromEntries(
      GROUPS.map((g, i) => [g.id, { label: g.name, color: paletteFor(i) }]),
    );
    horizontal = true;
  } else {
    const month = path.month;
    rows = splitPayees(category, monthAmount(category, month))
      .map((p) => ({
        key: p.id,
        label: p.name,
        value: p.value,
        fill: `var(--color-${category.group.id})`,
      }))
      .sort(byValueDesc);
    title = `${category.name} in ${monthLabel} by payee`;
    sub = "Payees are the last level";
    config = {
      [category.group.id]: {
        label: category.name,
        color: paletteFor(category.groupIndex),
      },
    };
    horizontal = true;
  }
  const terminal = category != null;
  const activeIndex = Math.min(active, rows.length - 1);

  function go(next: BarPath, message: string) {
    setPath(next);
    setActive(0);
    announce(message);
  }
  const toTop = () => go({}, "Showing monthly spending.");
  const toMonth = (month: number) =>
    go({ month }, `Showing ${longMonth(MONTHS[month]!)} by category, ${CATEGORIES.length} bars.`);

  function drill(index: number) {
    const row = rows[index];
    if (!row || terminal) return;
    if (path.month == null) {
      toMonth(index);
    } else {
      const c = CATEGORIES.find((x) => x.id === row.key)!;
      go(
        { month: path.month, category: row.key },
        `Showing ${c.name} in ${monthLabel} by payee, ${c.payees.length} ${c.payees.length === 1 ? "bar" : "bars"}.`,
      );
    }
  }
  function up() {
    if (path.category != null && path.month != null) toMonth(path.month);
    else if (path.month != null) toTop();
  }

  // One tab stop for the whole chart, arrows between bars: the bars are SVG paths
  // recharts renders without any keyboard handling of their own, and a tab stop per
  // bar would make the page behind a 15-bar chart 15 presses further away.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = rows.length - 1;
    const move = (i: number) => {
      e.preventDefault();
      setActive(Math.max(0, Math.min(last, i)));
    };
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        return move(activeIndex + 1);
      case "ArrowLeft":
      case "ArrowUp":
        return move(activeIndex - 1);
      case "Home":
        return move(0);
      case "End":
        return move(last);
      case "Enter":
      case " ":
        e.preventDefault();
        return drill(activeIndex);
      case "Backspace":
      case "Escape":
        if (path.month != null) {
          e.preventDefault();
          up();
        }
        return;
    }
  }

  const crumbs: Crumb[] = [
    { label: "All months", onSelect: path.month != null ? toTop : undefined },
  ];
  if (path.month != null) {
    const month = path.month;
    crumbs.push({
      label: monthLabel,
      onSelect: category ? () => toMonth(month) : undefined,
    });
  }
  if (category) crumbs.push({ label: category.name });

  const current = rows[activeIndex];
  const valueAxis = {
    tickLine: false,
    axisLine: false,
    tickFormatter: (v: number) => COMPACT.format(v),
  } as const;
  // The legend is the level's CONFIG, not recharts' idea of it: one `<Bar>` is one
  // series to recharts, but the category level is coloured by six groups. So the
  // payload is handed straight to the kit's legend, which labels it from the config.
  const legendPayload = Object.keys(config).map((k) => ({ dataKey: k }));

  return (
    <div ref={rootRef} className="space-y-3">
      <div {...regionProps} />
      <DrillBar crumbs={crumbs} label="Bar chart drill path" />
      <LevelTitle titleRef={titleRef} sub={sub}>
        {title}
      </LevelTitle>
      {/* A composite widget of our own making: the bars are SVG paths with no keyboard
          handling, so the chart is ONE tab stop and the arrow keys move between them.
          `application`, not `group`: a screen reader in browse mode keeps the arrow keys
          for itself, and they are this chart's whole keyboard interface. jsx-a11y does
          not count `application` as interactive, hence the two disables. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="application"
        aria-roledescription="bar chart"
        aria-label={`${title}. ${rows.length} bars. Arrow keys move between bars${terminal ? "" : ", Enter opens one"}${path.month != null ? ", Escape goes up a level" : ""}.`}
        aria-describedby={readoutId}
        onKeyDown={onKeyDown}
        // Only a KEYBOARD focus shows the bar outline: a mouse click lands focus here
        // too, and an outline on a bar the pointer is not on would read as a selection.
        onFocus={(e) => setFocused(e.currentTarget.matches(":focus-visible"))}
        onBlur={() => setFocused(false)}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        {/* Keyed by the path: a new level is a new chart, and the remount is what
            replays `.animate-drill`. */}
        <div key={pathKey} className="animate-drill">
          <ChartContainer
            config={config}
            style={{
              height: horizontal ? Math.max(200, rows.length * 26 + 40) : 288,
            }}
          >
            <BarChart
              data={rows}
              layout={horizontal ? "vertical" : "horizontal"}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              // recharts' own keyboard layer would be a second tab stop inside ours.
              accessibilityLayer={false}
              // On the CHART, not the <Bar>: the whole band under the tooltip cursor is the
              // target, so a £9 bar a few pixels long is as easy to hit as the rent.
              onClick={(state) => {
                if (state.activeTooltipIndex != null) drill(Number(state.activeTooltipIndex));
              }}
              style={{ cursor: terminal ? undefined : "pointer" }}
            >
              <CartesianGrid vertical={horizontal} horizontal={!horizontal} strokeDasharray="3 3" />
              {horizontal ? (
                <>
                  <XAxis type="number" {...valueAxis} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={132}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                  />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis width={44} {...valueAxis} />
                </>
              )}
              <ChartTooltip
                content={<ChartTooltipContent valueFormatter={(v) => MONEY.format(v)} />}
              />
              <ChartLegend content={() => <ChartLegendContent payload={legendPayload} />} />
              <Bar dataKey="value" name="Spent" radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}>
                {rows.map((r, i) => (
                  <Cell
                    key={r.key}
                    fill={r.fill}
                    // The keyboard's "you are here": an outline on the focused bar, drawn
                    // only while the chart has focus so a mouse user never sees it.
                    stroke={focused && i === activeIndex ? "var(--text-primary)" : undefined}
                    strokeWidth={focused && i === activeIndex ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>
      <p
        id={readoutId}
        aria-live="polite"
        className={cn("min-h-4 text-xs text-[var(--text-secondary)]", !focused && "invisible")}
      >
        {current &&
          `${current.label}: ${MONEY.format(current.value)}${terminal ? "" : " — Enter to open"}`}
      </p>
    </div>
  );
}

// ── 2. Treemap: groups → categories → payees ───────────────────────────────

interface TilePath {
  group?: string;
  category?: string;
}

function TreemapDrilldown() {
  const [path, setPath] = useState<TilePath>({});
  const { announce, regionProps } = useAnnounce();
  const pathKey = `${path.group ?? "all"}/${path.category ?? ""}`;
  const { rootRef, titleRef } = useDrillFocus(pathKey);
  // Concrete hex for the active palette, as keksdose's `useChartHex()`: a child tile
  // painted in its group's colour gets label ink MEASURED against that colour, which a
  // `var(--chart-N)` fill cannot (the kit falls back to currentColor for those).
  const pal = useChartHex();

  const groupIndex = GROUPS.findIndex((g) => g.id === path.group);
  const group = GROUPS[groupIndex];
  const category = group
    ? CATEGORIES.find((c) => c.id === path.category && c.group === group)
    : undefined;
  const groupFill = pal[groupIndex % pal.length];

  let data: TreemapNode[];
  let title: string;
  let onNodeClick: ((id: string, name: string) => void) | undefined;
  if (!group) {
    // Groups keep their DECLARED order (not re-sorted), so group N is `--chart-N` here
    // and in the bar chart's legend above.
    data = GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      value: CATEGORIES.filter((c) => c.group === g).reduce(
        (s, c) => s + categoryTotal(c, ALL_MONTHS),
        0,
      ),
    }));
    title = "Spending by group";
    onNodeClick = (id, name) => {
      const n = GROUPS.find((g) => g.id === id)!.categories.length;
      setPath({ group: id });
      announce(`Showing ${name}, ${n} ${n === 1 ? "category" : "categories"}.`);
    };
  } else if (!category) {
    data = CATEGORIES.filter((c) => c.group === group)
      .map((c) => ({
        id: c.id,
        name: c.name,
        value: categoryTotal(c, ALL_MONTHS),
        fill: groupFill,
      }))
      .sort(byValueDesc);
    title = `${group.name} by category`;
    onNodeClick = (id, name) => {
      const n = CATEGORIES.find((c) => c.id === id)!.payees.length;
      setPath({ group: group.id, category: id });
      announce(`Showing ${name} by payee, ${n} ${n === 1 ? "payee" : "payees"}.`);
    };
  } else {
    data = splitPayees(category, categoryTotal(category, ALL_MONTHS))
      .map((p) => ({ ...p, fill: groupFill }))
      .sort(byValueDesc);
    title = `${category.name} by payee`;
    // Terminal level: no onNodeClick, so the tiles are not buttons promising an action.
    onNodeClick = undefined;
  }

  const toTop = () => {
    setPath({});
    announce("Showing spending by group.");
  };
  const toGroup = (g: Group) => {
    setPath({ group: g.id });
    announce(`Showing ${g.name} by category.`);
  };

  const crumbs: Crumb[] = [{ label: "All groups", onSelect: group ? toTop : undefined }];
  if (group)
    crumbs.push({
      label: group.name,
      onSelect: category ? () => toGroup(group) : undefined,
    });
  if (category) crumbs.push({ label: category.name });

  return (
    // Escape walks up one level from anywhere inside the example — a tile, a crumb. A
    // delegated listener on a plain container: the controls it serves are the tiles and
    // buttons inside, each already focusable on its own.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={rootRef}
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !group) return;
        e.preventDefault();
        if (category) toGroup(group);
        else toTop();
      }}
    >
      <div {...regionProps} />
      <DrillBar crumbs={crumbs} label="Treemap drill path" />
      <LevelTitle
        titleRef={titleRef}
        sub={`${RANGE_LABEL}${onNodeClick ? " · click or press Enter on a tile to open it" : " · payees are the last level"}`}
      >
        {title}
      </LevelTitle>
      <div key={pathKey} className="animate-drill">
        <Treemap
          data={data}
          colors={pal}
          valueFormatter={moneyAndShare}
          height={320}
          onNodeClick={onNodeClick}
          // Payees are the user's own data; category and group names are the app's.
          redactNames={category != null}
        />
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

export function ChartDrilldowns() {
  return (
    <>
      <Example
        label="Drilldown — bar chart"
        hint="months → categories → payees; click a bar, or focus the chart and use the arrow keys + Enter"
      >
        <Stage>
          <div data-stage="wide">
            <BarDrilldown />
          </div>
        </Stage>
        <Note>
          The drill state is a path (<code className="font-mono">{"{ month, category }"}</code>),
          and every level — rows, title, colours, legend — is derived from it. The chart is wrapped
          in <code className="font-mono">{'<div key={path} className="animate-drill">'}</code>, so a
          new level is a remount and eases in. Recharts bars have no keyboard handling of their own:
          the chart is one tab stop, the arrow keys move an outline between bars (the value is read
          out below the chart), Enter or Space opens the bar, Escape or Backspace goes up.
        </Note>
      </Example>

      <Example
        label="Drilldown — tile chart"
        hint="groups → categories → payees; onNodeClick makes every tile a focusable button"
      >
        <Stage>
          <div data-stage="wide">
            <TreemapDrilldown />
          </div>
        </Stage>
        <Note>
          With <code className="font-mono">onNodeClick</code> each tile is a{" "}
          <code className="font-mono">role=&quot;button&quot;</code> in the tab order, named by its
          node name: Tab to a tile, Enter or Space to open it, Escape to go up. The payee level
          passes no <code className="font-mono">onNodeClick</code>, so its tiles are not buttons,
          and sets <code className="font-mono">redactNames</code>, because payees are the
          user&apos;s data. Children are painted in their group&apos;s colour as concrete hex from{" "}
          <code className="font-mono">useChartHex()</code>, so the label ink is still measured. The
          breadcrumb&apos;s last crumb is the current level (
          <code className="font-mono">aria-current=&quot;page&quot;</code>), not a button; a level
          change is announced politely, and when it removed the element that had focus, focus moves
          to the new level&apos;s title.
        </Note>
      </Example>
    </>
  );
}
