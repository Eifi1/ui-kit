import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_COLORS,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  paletteFor,
  useChart,
  toggleHidden,
} from "@eifi1/ui-kit";
import type { ChartConfig, ChartSeriesConfig } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, Swatch } from "../lib/section";

/**
 * Charts.
 *
 * The kit ships the SHELL only — container, tooltip, legend, and the palette helpers.
 * It does not re-export a single mark, so every specimen below imports `Bar`, `Line`
 * and `Pie` from `recharts` directly, exactly as a consuming app has to. That is
 * deliberate rather than an omission: recharts is an OPTIONAL peer dependency, and an
 * app that never draws a chart should never install 400KB of it.
 *
 * No colour is written as a literal anywhere in this file. A series names a key in
 * the `ChartConfig`; `ChartContainer` injects that key as a `--color-<key>` custom
 * property scoped to the one chart; the mark asks for `var(--color-revenue)`. The
 * config's own values come from `paletteFor()` / `CHART_COLORS`, which are themselves
 * CSS vars pointing at the token set. So a bar's fill survives two indirections and
 * still moves when the theme or the palette menu changes — which is the entire reason
 * this shell exists, and the thing a hardcoded `fill="#4f46e5"` would quietly break.
 */

// ── Formatters ───────────────────────────────────────────────────────────────
// Module scope on purpose: an Intl formatter is expensive to construct and these are
// stateless. Nothing here touches `window`, so the render test can mount the section.

const MONEY = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const COMPACT = new Intl.NumberFormat("en-GB", { notation: "compact" });

// Both halves must agree on UTC. `"2025-03-01T00:00:00Z"` is UTC midnight, and a
// formatter left on the viewer's zone would render it as 28 February for anyone west
// of Greenwich — a month label off by one, on a third of the planet, silently.
const MONTH_SHORT = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const MONTH_LONG = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** `"2025-03"` → `"Mar"`, for an axis tick. */
function shortMonth(period: string | number): string {
  return MONTH_SHORT.format(new Date(`${period}-01T00:00:00Z`));
}

/** `"2025-03"` → `"March 2025"`, for a tooltip heading, where there is room. */
function longMonth(period: string | number): string {
  return MONTH_LONG.format(new Date(`${period}-01T00:00:00Z`));
}

// ── Config ───────────────────────────────────────────────────────────────────

/**
 * Series → config, with the palette index derived from position rather than typed out
 * beside each series. `paletteFor` wraps at nine, so a tenth series silently reuses
 * the first colour; deriving it here at least keeps that fact in one place instead of
 * spread across nine hand-written `var(--chart-N)` strings that drift out of order.
 */
function configFor(series: readonly { key: string; label: string }[]): ChartConfig {
  return Object.fromEntries(
    series.map((s, i): [string, ChartSeriesConfig] => [
      s.key,
      { label: s.label, color: paletteFor(i) },
    ]),
  );
}

const BAR_SERIES = [
  { key: "revenue", label: "Revenue" },
  { key: "cost", label: "Cost of sales" },
  { key: "marketing", label: "Marketing" },
] as const;

const BAR_CONFIG = configFor(BAR_SERIES);

const BAR_DATA = [
  { period: "2025-01", revenue: 18240, cost: 11310, marketing: 3120 },
  { period: "2025-02", revenue: 19980, cost: 11840, marketing: 2870 },
  { period: "2025-03", revenue: 17460, cost: 12010, marketing: 3640 },
  { period: "2025-04", revenue: 22130, cost: 12980, marketing: 4210 },
  { period: "2025-05", revenue: 24780, cost: 13520, marketing: 3980 },
  { period: "2025-06", revenue: 23410, cost: 13190, marketing: 3450 },
];

/** The tallest bar across EVERY series, so the axis stays put when a series is off. */
const BAR_MAX = Math.max(
  ...BAR_DATA.flatMap((row) => BAR_SERIES.map((s) => Number(row[s.key as keyof typeof row]) || 0)),
);

/**
 * The line chart is keyed off `CHART_COLORS` rather than `paletteFor`, because these
 * three series are not interchangeable categories: income/expense/net carry meaning,
 * and the token set gives them a fixed teal/amber/violet the rest of the kit already
 * uses for money. Categorical data gets `paletteFor`; semantic data gets these.
 */
const CASHFLOW_CONFIG: ChartConfig = {
  income: { label: "Income", color: CHART_COLORS.income },
  expense: { label: "Expense", color: CHART_COLORS.expense },
  net: { label: "Net", color: CHART_COLORS.net },
};

const CASHFLOW_KEYS = ["income", "expense", "net"] as const;

// `net` is derived rather than typed, so the third line cannot disagree with the two
// it is the difference of — a demo dataset that fails its own arithmetic teaches the
// reader to distrust the chart.
const CASHFLOW_DATA = [
  { period: "2025-01", income: 4200, expense: 3180 },
  { period: "2025-02", income: 4310, expense: 3640 },
  { period: "2025-03", income: 3980, expense: 4120 },
  { period: "2025-04", income: 5140, expense: 3720 },
  { period: "2025-05", income: 4860, expense: 3910 },
  { period: "2025-06", income: 5320, expense: 4480 },
].map((m) => ({ ...m, net: m.income - m.expense }));

const SPEND = [
  { key: "groceries", label: "Groceries", amount: 412 },
  { key: "transport", label: "Transport", amount: 188 },
  { key: "utilities", label: "Utilities", amount: 144 },
  { key: "leisure", label: "Leisure", amount: 96 },
  { key: "health", label: "Health", amount: 61 },
];

const SPEND_CONFIG = configFor(SPEND);

const WIDE_CONFIG: ChartConfig = {
  revenue: { label: "Revenue", color: paletteFor(0) },
};

// Eighteen months, generated from a deterministic curve. Not `Math.random()`: a
// specimen that redraws differently on every mount cannot be compared against the
// same page five minutes ago, and would make a rendering regression invisible.
const WIDE_DATA = Array.from({ length: 18 }, (_, i) => ({
  period: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
  revenue: Math.round(14000 + 900 * Math.sin(i / 1.7) + 260 * i),
}));

// Actuals up to June, a projection from June on, and one month (March) whose capture
// never happened. Absent keys, not zeros: the tooltip's job is to say "nothing here".
const FORECAST_CONFIG: ChartConfig = {
  actual: { label: "Actual", color: paletteFor(0) },
  forecast: { label: "Forecast", color: paletteFor(1) },
};

const FORECAST_DATA: Array<{ period: string; actual?: number; forecast?: number }> = [
  { period: "2025-01", actual: 18240 },
  { period: "2025-02", actual: 19980 },
  { period: "2025-03" },
  { period: "2025-04", actual: 22130 },
  { period: "2025-05", actual: 24780 },
  { period: "2025-06", actual: 23410, forecast: 23410 },
  { period: "2025-07", forecast: 24600 },
  { period: "2025-08", forecast: 25300 },
  { period: "2025-09", forecast: 26100 },
];

// Two keys the shell has to refuse: one that is not a CSS identifier (a space), and a
// colour that is not a colour. Both are skipped with a console warning; the valid one
// keeps its paint.
const REFUSED_CONFIG: ChartConfig = {
  valid: { label: "valid key", color: paletteFor(0) },
  "bad key": { label: "key with a space", color: paletteFor(1) },
  badColour: { label: "url() colour", color: "url(#pattern)" },
};

const REFUSED_DATA = [
  { period: "2025-01", valid: 12, "bad key": 9, badColour: 7 },
  { period: "2025-02", valid: 14, "bad key": 11, badColour: 8 },
  { period: "2025-03", valid: 13, "bad key": 10, badColour: 9 },
];

/**
 * A legend written from scratch on top of `useChart`, which is the only way to show
 * what the hook is actually for: anything rendered inside a `ChartContainer` — custom
 * chrome, a tooltip of your own, this — can read the same config the marks were
 * coloured from, instead of being handed a second copy of the labels that drifts.
 *
 * Outside a container the hook throws rather than returning an empty config, so a
 * legend mounted in the wrong place fails loudly instead of rendering blank.
 */
function ConfigLegend() {
  const config = useChart();
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-xs">
      {Object.entries(config).map(([key, series]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: series.color }}
          />
          <span className="text-[var(--text-primary)]">{series.label}</span>
          <code className="font-mono text-[var(--text-muted)]">{key}</code>
        </span>
      ))}
    </div>
  );
}

export function Charts() {
  // Per-chart legend state. Shared state would mean clicking "Revenue" on the bar
  // chart dimmed four slices of an unrelated pie.
  const [barHidden, setBarHidden] = useState<ReadonlySet<string>>(new Set());
  const [sliceHidden, setSliceHidden] = useState<ReadonlySet<string>>(new Set());
  // A switched-off slice stays IN the data at zero: a pie's legend is built from its
  // data, so filtering the row out would take its legend entry — the switch to bring
  // it back — with it. At zero it leaves the circle and the rest close up.
  const pieData = SPEND.map((s) => (sliceHidden.has(s.key) ? { ...s, amount: 0 } : s));
  const pieTotal = pieData.reduce((sum, s) => sum + s.amount, 0);
  const scroller = useRef<HTMLDivElement>(null);
  // Isolate mode: the ONE series in focus, or null for none.
  const [isolated, setIsolated] = useState<string | null>(null);
  // Read back what the container actually wrote, rather than restating the rule.
  const refusedRef = useRef<HTMLDivElement>(null);
  const [refusedAttr, setRefusedAttr] = useState<string | null>(null);
  useEffect(() => {
    setRefusedAttr(refusedRef.current?.querySelector("[data-chart]")?.getAttribute("data-chart") ?? null);
  }, []);

  return (
    <>
      <Note>
        <strong>Every <code className="font-mono">ChartContainer</code> needs an explicit
        height.</strong>{" "}
        It renders <code className="font-mono">ResponsiveContainer</code> at{" "}
        <code className="font-mono">height=&quot;100%&quot;</code> inside a div that sets width
        but no height, so a container without <code className="font-mono">h-64</code> (or an
        equivalent) resolves to 0px tall and paints nothing at all — no error, no warning in
        the page, just a gap. Every specimen below carries one.
      </Note>

      <Example
        label="Bar — grouped series, toggle legend"
        hint="each legend item switches its own series off and on; any number can be off"
      >
        <ChartContainer config={BAR_CONFIG} className="h-72">
          <BarChart data={BAR_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {/* Horizontal rules only: vertical gridlines on a categorical axis add ink
                without adding a reading the eye could not already take from the ticks. */}
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={shortMonth}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => COMPACT.format(v)}
              // Fixed to ALL series, shown or not: switching one off must not re-scale
              // the axis, or the bars that remain jump to a new height and the toggle
              // reads as a change in the data.
              domain={[0, BAR_MAX]}
            />
            <ChartTooltip
              // No `cursor` prop: the default highlight rectangle is what the container's
              // own `[&_.recharts-rectangle.recharts-tooltip-cursor]` rule restyles, and
              // turning it off would hide half of what the shell does.
              content={
                <ChartTooltipContent
                  labelFormatter={longMonth}
                  valueFormatter={(v) => MONEY.format(v)}
                />
              }
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  hiddenKeys={barHidden}
                  onItemClick={(key) => setBarHidden((h) => toggleHidden(h, key))}
                />
              }
            />
            {BAR_SERIES.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                // The whole point of the shell: the fill names the config key, and the
                // container has already written `--color-revenue: var(--chart-1)` onto
                // this chart's wrapper. Nothing here knows what colour it is.
                fill={`var(--color-${s.key})`}
                radius={[3, 3, 0, 0]}
                hide={barHidden.has(s.key)}
              />
            ))}
          </BarChart>
        </ChartContainer>
        <div className="mt-3">
          <Note>
            <code className="font-mono">ChartLegendContent hiddenKeys</code> draws a switched-off
            entry faded and struck through, and makes every entry a toggle button
            (<code className="font-mono">aria-pressed</code> = shown). Hiding the series itself is
            the chart&apos;s job (<code className="font-mono">hide</code>), and{" "}
            <code className="font-mono">toggleHidden(set, key)</code> is the one-line state update.
            The Y axis is pinned to every series, so a toggle never re-scales what remains, and a
            series drawn with <code className="font-mono">hide</code> leaves the tooltip too
            (<code className="font-mono">ChartTooltipContent includeHidden</code> keeps it). The
            legend resolves a series by <code className="font-mono">dataKey</code> first and falls
            back to the payload <code className="font-mono">value</code>, which is what lets the
            same component serve a bar chart (keyed by dataKey) and a pie (keyed by name).
          </Note>
        </div>
      </Example>

      <Example
        label="Line — semantic colours, custom legend via useChart"
        hint="the legend under this one is built from the hook, not from ChartLegendContent"
      >
        <ChartContainer config={CASHFLOW_CONFIG} className="h-64">
          <LineChart data={CASHFLOW_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={shortMonth}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => COMPACT.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  // `line` matches the mark: a dot indicator next to a line series reads
                  // as a scatter point. `dot` (the default) is right for bars and slices.
                  indicator="line"
                  labelFormatter={longMonth}
                  valueFormatter={(v) => MONEY.format(v)}
                />
              }
            />
            <ChartLegend content={<ConfigLegend />} />
            {CASHFLOW_KEYS.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                // Six points is few enough that the dots are information rather than
                // clutter; drop them past ~30 or the line disappears under its own marks.
                dot={{ r: 2.5 }}
                activeDot={{ r: 4.5 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
        <div className="mt-3">
          <Note>
            Colour is never the only signal in this kit&apos;s money charts — teal/amber/violet
            are CVD-safe against each other, but the sign and the label still have to carry the
            meaning. The nine <code className="font-mono">--chart-N</code> tokens behind{" "}
            <code className="font-mono">paletteFor</code> are Paul Tol&apos;s &ldquo;Muted&rdquo;
            set, chosen to survive protanopia, deuteranopia and tritanopia.
          </Note>
        </div>
      </Example>

      <Example
        label="Pie — a colour per slice, resolved by name"
        hint="a pie's tooltip and legend key off nameKey, not dataKey; the legend toggles slices"
      >
        <ChartContainer config={SPEND_CONFIG} className="h-72">
          <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  // A pie has no categorical axis, so recharts passes no `label` — the
                  // heading would be blank. `hideLabel` reclaims the row.
                  hideLabel
                  // Share of what is SHOWN: with slices off, the percentages still add
                  // up to the circle the reader is looking at.
                  valueFormatter={(v) =>
                    `${MONEY.format(v)} · ${Math.round((v / (pieTotal || 1)) * 100)}%`
                  }
                />
              }
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  hiddenKeys={sliceHidden}
                  onItemClick={(key) => setSliceHidden((h) => toggleHidden(h, key))}
                />
              }
            />
            <Pie
              data={pieData}
              dataKey="amount"
              // `nameKey` is what both the tooltip and the legend look the config up by,
              // so it must be the CONFIG KEY, not the human label. Point it at `label`
              // and every slice falls back to a grey dot and a raw string.
              nameKey="key"
              innerRadius="52%"
              outerRadius="82%"
              // The container blanks recharts' white sector stroke (`stroke='#fff'`), so
              // without a padding angle adjacent slices of similar hue merge into one
              // shape. This is the separation that replaces it.
              paddingAngle={2}
            >
              {SPEND.map((s) => (
                <Cell key={s.key} fill={`var(--color-${s.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </Example>

      <Example
        label="Wide chart — edge-aware tooltip"
        hint="scroll the chart sideways and hover the rightmost bars"
      >
        {/* `boundaryRef` wants the element that actually SCROLLS, not the chart. Recharts
            anchors the tooltip at a coordinate inside the full chart width; the shell
            subtracts this element's scrollLeft to get the on-screen x and flips the
            tooltip to the left of the cursor when it would otherwise spill past the
            visible right edge. Without it, the last three months' tooltips sit off-screen. */}
        <div ref={scroller} className="overflow-x-auto">
          <ChartContainer config={WIDE_CONFIG} className="h-56 min-w-[46rem]">
            <BarChart data={WIDE_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={shortMonth}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => COMPACT.format(v)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    boundaryRef={scroller}
                    labelFormatter={longMonth}
                    valueFormatter={(v) => MONEY.format(v)}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="mt-3">
          <Note>
            The flip measures the tooltip&apos;s own width on the render BEFORE it moves, so
            the first hover of a session uses a 160px guess. It is right from the second
            hover on, which is why the effect is invisible in practice and worth knowing
            about if you ever see one tooltip land half a centimetre wrong.
          </Note>
        </div>
      </Example>

      <Example
        label="Tooltip — a series with no value here"
        hint="hover March (a missed capture) or July (no actual yet); left: the default dash, right: formatValue"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(["default", "formatValue"] as const).map((mode) => (
            <div key={mode} className="min-w-0">
              <p className="mb-1 font-mono text-[11px] text-[var(--text-muted)]">
                {mode === "default" ? "valueFormatter only" : "formatValue"}
              </p>
              <ChartContainer config={FORECAST_CONFIG} className="h-56">
                <LineChart data={FORECAST_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={shortMonth}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(v: number) => COMPACT.format(v)}
                  />
                  <ChartTooltip
                    content={
                      mode === "default" ? (
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={longMonth}
                          valueFormatter={(v) => MONEY.format(v)}
                        />
                      ) : (
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={longMonth}
                          // Handed `undefined` for the absence, and wins over
                          // valueFormatter for every value — so it formats both.
                          formatValue={(v) => (v == null ? <em>none</em> : MONEY.format(v))}
                        />
                      )
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--color-actual)"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="var(--color-forecast)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 2.5 }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Note>
            A series with no value at a point prints <code className="font-mono">—</code>, never a
            made-up <code className="font-mono">0</code>; <code className="font-mono">valueFormatter</code>{" "}
            is not called for it. <code className="font-mono">formatValue</code> is handed the{" "}
            <code className="font-mono">undefined</code> and decides the wording itself. The kit&apos;s{" "}
            <code className="font-mono">ChartTooltip</code> defaults to{" "}
            <code className="font-mono">filterNull=&#123;false&#125;</code>, so the empty item reaches
            the content without any prop; series switched off with <code className="font-mono">hide</code>{" "}
            are still dropped by the content (pass <code className="font-mono">includeHidden</code> to
            keep them). Pass <code className="font-mono">filterNull</code> to get recharts&apos; old
            behaviour back. Side by side from <code className="font-mono">md</code> up, stacked on a phone.
          </Note>
        </div>
      </Example>

      <Example
        label="Right-to-left — the plot stays, the chrome follows"
        hint="the same bar chart under dir=rtl: axes and bars run left-to-right, legend and tooltip rows read from the right"
      >
        <div dir="rtl" lang="ar">
          <ChartContainer config={BAR_CONFIG} className="h-56">
            <BarChart data={BAR_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={shortMonth} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => COMPACT.format(v)}
                domain={[0, BAR_MAX]}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={longMonth} valueFormatter={(v) => MONEY.format(v)} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {BAR_SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ChartContainer>
        </div>
        <div className="mt-3">
          <Note>
            The plot is <em>not</em> mirrored: a time axis runs left-to-right in Arabic and Hebrew
            charts too, and the SVG is pinned to <code className="font-mono">direction: ltr</code> so
            the y-axis labels stay beside the axis instead of being drawn into the plot. The HTML
            around it follows the page: the tooltip&apos;s value column sits at the logical end
            (<code className="font-mono">ms-auto</code>) and the legend reads from the right. Its
            edge-flip also measures an RTL scroller correctly. Want a mirrored category axis? Pass{" "}
            <code className="font-mono">reversed</code> on your own <code className="font-mono">XAxis</code>.
          </Note>
        </div>
      </Example>

      <Example
        label="Legend — isolate one series (activeKey)"
        hint="click an entry to bring it forward and dim the rest; click it again to show all"
      >
        <ChartContainer config={CASHFLOW_CONFIG} className="h-60">
          <LineChart data={CASHFLOW_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={shortMonth}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => COMPACT.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={longMonth}
                  valueFormatter={(v) => MONEY.format(v)}
                />
              }
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  activeKey={isolated}
                  onItemClick={(key) => setIsolated((k) => (k === key ? null : key))}
                />
              }
            />
            {CASHFLOW_KEYS.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                // Dimming the marks is the chart's half of isolate mode, as `hide` is
                // for toggle mode: the legend only dims its own entries.
                strokeOpacity={isolated == null || isolated === key ? 1 : 0.2}
                strokeWidth={isolated === key ? 3 : 2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
          activeKey: {isolated ?? "null"}
        </p>
        <div className="mt-3">
          <Note>
            Isolate mode is kept for the charts built on it; a legend whose entries switch their own
            series (<code className="font-mono">hiddenKeys</code>, above) is what readers expect.
            Here <code className="font-mono">aria-pressed</code> marks the isolated entry. A legend
            with neither <code className="font-mono">hiddenKeys</code> nor{" "}
            <code className="font-mono">activeKey</code> leaves <code className="font-mono">aria-pressed</code>{" "}
            off, and one with no <code className="font-mono">onItemClick</code> is a plain key of
            spans rather than buttons (see the bar chart drilldown below).
          </Note>
        </div>
      </Example>

      <Example
        label="ChartContainer — config the shell refuses"
        hint="a key that is not a CSS identifier and a colour that is not a colour are skipped, with a console warning"
      >
        <div ref={refusedRef}>
          <ChartContainer id="Q2 sales #2" config={REFUSED_CONFIG} className="h-48">
            <BarChart data={REFUSED_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={shortMonth}
              />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={longMonth} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {Object.keys(REFUSED_CONFIG).map((key) => (
                <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ChartContainer>
        </div>
        <OutTable
          rows={[
            ['id="Q2 sales #2"', `data-chart="${refusedAttr ?? "…"}"`],
            ['"bad key"', "skipped — no --color-bad key, bar and legend swatch unpainted"],
            ['badColour: "url(#pattern)"', "skipped — no --color-badColour, bar and legend swatch unpainted"],
          ]}
        />
        <div className="mt-3">
          <Note>
            The config is written into a <code className="font-mono">&lt;style&gt;</code> unescaped,
            and a config can be built from user data, so each key must be a CSS identifier and each
            colour hex, <code className="font-mono">rgb/hsl()</code> or a bare{" "}
            <code className="font-mono">var(--token)</code>. A refused entry costs that one series its
            colour and nothing else — and the legend and tooltip swatches go through the same gate, the
            two refused entries show no colour in the key, exactly like their bars, instead of the
            colour the config asked for and the series was never painted in. The <code className="font-mono">id</code> (default:{" "}
            <code className="font-mono">useId()</code>) is stripped to a CSS identifier for the same
            reason. Build keys out of data with <code className="font-mono">seriesKey()</code>.
          </Note>
        </div>
      </Example>

      <Example
        label="Where the colours come from"
        hint="these swatches are painted by the same vars the charts above are"
      >
        <div className="space-y-4">
          <Row>
            {Object.entries(SPEND_CONFIG).map(([key, series]) => (
              <Swatch key={key} name={`--color-${key}`} value={series.color} />
            ))}
          </Row>
          <Row>
            {Object.entries(CASHFLOW_CONFIG).map(([key, series]) => (
              <Swatch key={key} name={`--color-${key}`} value={series.color} />
            ))}
          </Row>
          <OutTable
            rows={[
              ["paletteFor(0)", paletteFor(0)],
              ["paletteFor(8)", paletteFor(8)],
              // Nine colours, then it starts again — a tenth series is indistinguishable
              // from the first, so split the data before you reach for a tenth key.
              ["paletteFor(9)", `${paletteFor(9)}  // wraps`],
              ["paletteFor(-1)", `${paletteFor(-1)}  // wraps backwards`],
              ["paletteFor(2.7)", `${paletteFor(2.7)}  // truncated`],
              ["paletteFor(NaN)", `${paletteFor(NaN)}  // first colour, never --chart-NaN`],
              ["CHART_COLORS.income", CHART_COLORS.income],
              ["CHART_COLORS.assigned", CHART_COLORS.assigned],
            ]}
          />
        </div>
        <div className="mt-3">
          <Note>
            Both helpers return CSS <em>vars</em>, never hex. That is what makes a series
            theme-aware for nothing: the SVG fill resolves{" "}
            <code className="font-mono">--chart-4</code> against whichever token set is live,
            so switching the palette in the top bar recolours every chart on this page without
            React re-rendering a single mark. Code that needs real hex — a heatmap
            interpolating between stops — has to use{" "}
            <code className="font-mono">PALETTE_HEX</code> instead, and loses that for free.
          </Note>
        </div>
      </Example>

      <Note>
        The tooltip and legend bodies are painted with <code className="font-mono">--bg-surface</code>{" "}
        and <code className="font-mono">--border</code> like every other surface, so they follow
        the chosen palette as well as light/dark — switch it in the top bar while a tooltip is open.
      </Note>
    </>
  );
}
