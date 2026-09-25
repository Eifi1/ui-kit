import { useRef, useState } from "react";
import {
  Button,
  SeriesChart,
  ToggleGroup,
  ToggleLegend,
  defaultZoomAxes,
  seriesLegendEntries,
  toggleHidden,
  visibleSeries,
} from "@eifi1/ui-kit";
import type {
  SeriesChartHit,
  SeriesChartPoint,
  SeriesChartSeries,
  ZoomAxesSetting,
} from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * SERIES CHART — BARS, AREAS & TIME. The 0.8.0 half of the series chart: per-series
 * `type` and `stack`, a category or time abscissa, references and markers, per-point
 * dots, stroke weight, curve and fill, clicks, the zoom a chart's marks imply, and the
 * two helpers that keep a legend's colours still while series are switched off.
 *
 * The data is money over months and a price over irregular days — keksdose's reports,
 * which is what these marks were built for. Every row is fixed rather than derived from
 * today, so the page is the same page whenever it is opened. No colour is written
 * except where a series must be a meaning (income, expense) rather than a position.
 */

const EUR = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const EUR2 = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const WHOLE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });

/** A year of a household's months, keyed by the ISO period — the caller's own value. */
const MONTHS = [
  ["2026-01", 3100, -2480],
  ["2026-02", 3100, -2710],
  ["2026-03", 3350, -3620],
  ["2026-04", 3100, -2390],
  ["2026-05", 3100, -2950],
  ["2026-06", 4600, -3010],
  ["2026-07", 3100, -3880],
  ["2026-08", 3100, -2240],
  ["2026-09", 3150, -2560],
].map(([period, income, expense]) => ({
  period,
  income: income as number,
  expense: expense as number,
  net: (income as number) + (expense as number),
}));

const monthLabel = (period: unknown) => {
  const [y, m] = String(period).split("-").map(Number);
  return MONTH.format(new Date(y, m - 1, 1));
};

const MONEY_AXIS = [{ id: "y", title: "EUR", format: (v: number) => WHOLE.format(v) }];

function GroupedBars() {
  const [hit, setHit] = useState<SeriesChartHit | null>(null);
  return (
    <Example
      label="Bars, grouped, with a line over them — and onPointClick"
      hint="type: 'bar' without a stack stands side by side in each slot; x.type: 'category' is one slot per row"
    >
      <SeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period", format: (_, tick) => monthLabel(tick.value), title: "Month" }}
        axes={MONEY_AXIS}
        series={[
          { key: "income", label: "Income", type: "bar", color: "var(--money-income)" },
          { key: "expense", label: "Expenses", type: "bar", color: "var(--money-expense)" },
          { key: "net", label: "Net", color: "var(--money-net)", strokeWidth: 2.5, dot: true },
        ]}
        valueFormat={(v) => EUR.format(v)}
        onPointClick={setHit}
      />
      <OutTable
        rows={[
          ["onPointClick → index", hit ? String(hit.index) : "—"],
          ["→ x (the caller's category)", hit ? JSON.stringify(hit.x) : "—"],
          ["→ key (on a bar only)", hit ? String(hit.key ?? "undefined — the slot, not a bar") : "—"],
          ["→ row.net", hit ? EUR.format(Number(hit.row.net)) : "—"],
        ]}
      />
      <div className="mt-3">
        <Note>
          Click a bar and the hit names its series; click between bars and it names only the slot —
          the period a drilldown opens. The axis carrying bars always includes zero, and the
          expenses hang below it. There is no drag layer: a chart with bars defaults to{" "}
          <code className="font-mono">zoomAxes: &quot;none&quot;</code>, because every bar chart in the
          apps is clicked, and a drag layer would swallow the clicks. The tick labels come from{" "}
          <code className="font-mono">format(slot, tick)</code>, whose <code className="font-mono">tick.value</code>{" "}
          is the row&apos;s own <code className="font-mono">&quot;2026-03&quot;</code>.
        </Note>
      </div>
    </Example>
  );
}

const SPENDING = MONTHS.map((m, i) => ({
  period: m.period,
  housing: 1180,
  food: 420 + ((i * 37) % 90),
  transport: 160 + ((i * 53) % 120),
  leisure: 140 + ((i * 71) % 260),
}));
const CATEGORY_KEYS = ["housing", "food", "transport", "leisure"] as const;
const CATEGORY_NAMES: Record<(typeof CATEGORY_KEYS)[number], string> = {
  housing: "Housing",
  food: "Food",
  transport: "Transport",
  leisure: "Leisure",
};

function Stacks() {
  const [mark, setMark] = useState<"bar" | "area">("area");
  return (
    <Example
      label="Stacked bars and stacked areas"
      hint="series with the same `stack` sit on top of each other, and the axis fits their SUM"
    >
      <Row className="mb-3">
        <ToggleGroup<"bar" | "area">
          aria-label="Mark"
          value={mark}
          onChange={setMark}
          options={[
            { value: "area", label: "area" },
            { value: "bar", label: "bar" },
          ]}
        />
      </Row>
      <SeriesChart
        rows={SPENDING}
        x={{ type: "category", key: "period", format: (_, tick) => monthLabel(tick.value) }}
        axes={MONEY_AXIS}
        series={CATEGORY_KEYS.map((key) => ({ key, label: CATEGORY_NAMES[key], type: mark, stack: "spend" }))}
        valueFormat={(v) => EUR.format(v)}
      />
      <div className="mt-3">
        <Note>
          The stacked areas are drawn at <code className="font-mono">fillOpacity</code> 0.55 by default
          (0.2 for a lone area) so the layers stay tellable apart where they meet. An area chart zooms
          along x only — drag across a few months and the y axis refits to them, still from zero; the
          same data as bars does not zoom at all. Switching the mark keeps each category&apos;s colour,
          because the colours are by position in <code className="font-mono">series</code>.
        </Note>
      </div>
    </Example>
  );
}

/** A price sampled when somebody shopped — irregular days, which is what a time axis is for. */
const PRICES = [
  ["2026-01-08", 1.29],
  ["2026-01-22", 1.29],
  ["2026-02-03", 1.35],
  ["2026-02-27", 1.39],
  ["2026-03-06", 1.39],
  ["2026-04-18", 1.49],
  ["2026-05-02", 1.45],
  ["2026-05-30", 1.52],
  ["2026-07-11", 1.55],
  ["2026-08-01", 1.49],
  ["2026-08-29", 1.59],
  ["2026-09-19", 1.62],
].map(([day, price]) => ({ day: day as string, price: price as number, average: 1.42 }));

/** The last sample carried on at the last quarter's pace — a projection, joined to the
 *  measured line at today's row so the two meet. */
const TIME_ROWS = [
  ...PRICES.map((r) => (r.day === "2026-09-19" ? { ...r, projected: r.price } : r)),
  { day: "2026-10-31", projected: 1.69 },
  { day: "2026-12-31", projected: 1.79 },
];

/** A buy on a cheap day, a switch of shop on a dear one — a dot drawn per point. */
const EVENTS: Record<string, "buy" | "switch"> = { "2026-01-22": "buy", "2026-08-01": "buy", "2026-05-30": "switch" };

function eventDot(point: SeriesChartPoint) {
  const kind = EVENTS[String(point.row.day)];
  if (!kind) return true; // the default ring
  return kind === "buy" ? (
    <path
      d={`M${point.cx},${point.cy - 7} l6,10 h-12 z`}
      fill="var(--success)"
      stroke="var(--bg-surface)"
      strokeWidth={1}
    />
  ) : (
    <rect x={point.cx - 5} y={point.cy - 5} width={10} height={10} fill="var(--warning)" stroke="var(--bg-surface)" strokeWidth={1} />
  );
}

/** Whole cents inside the window on show — refined on every zoom, never a 1/2/5 ladder. */
function centTicks([low, high]: [number, number]): number[] {
  const span = high - low;
  const step = span > 0.4 ? 0.1 : span > 0.15 ? 0.05 : 0.01;
  const out: number[] = [];
  for (let v = Math.ceil(low / step) * step; v <= high + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function TimeAxis() {
  return (
    <Example
      label="A time axis — dots, references, markers, tickValues, curve and stroke weight"
      hint="x.type: 'time' places each row by WHEN it was, so twelve irregular samples keep their gaps"
    >
      <SeriesChart
        rows={TIME_ROWS}
        x={{ type: "time", key: "day", title: "Day of purchase" }}
        axes={[
          {
            id: "y",
            title: "Price per litre (EUR)",
            format: (v) => EUR2.format(v),
            tickValues: centTicks,
            width: 64,
          },
        ]}
        series={[
          { key: "price", label: "Milk, 1 l", strokeWidth: 2.5, dot: eventDot, curve: "linear" },
          { key: "projected", label: "Projection", dashed: true, curve: "linear", strokeWidth: 1.5 },
          { key: "average", label: "Average", step: true, strokeWidth: 1.5 },
        ]}
        valueFormat={(v) => EUR2.format(v)}
        references={[
          { key: "cap", value: 1.75, label: "Price cap", tone: "danger" },
          { key: "vat", axis: "x", value: "2026-07-01", label: "VAT change", tone: "info", dash: 2 },
        ]}
        markers={[
          { key: "now", x: "2026-09-19", y: 1.62, label: "today €1.62" },
          { key: "cap-hit", x: "2026-12-31", y: 1.79, label: "over the cap", tone: "danger", r: 6 },
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">dot</code> as a function draws per point: the green triangles are
          buys and the amber square a change of shop — any SVG node at <code className="font-mono">cx</code>/
          <code className="font-mono">cy</code> — and every other sample returns{" "}
          <code className="font-mono">true</code> for the default ring. The price is{" "}
          <code className="font-mono">strokeWidth: 2.5</code>, the projection and the step average it is
          read against 1.5. The projection is{" "}
          <code className="font-mono">curve: &quot;linear&quot;</code>, because a monotone curve would dress an
          extrapolation up as data. The two <code className="font-mono">references</code> are a threshold
          on the price axis (widening the fitted band to show it) and a date down the x axis; the{" "}
          <code className="font-mono">markers</code> are two single labelled points. The y{" "}
          <code className="font-mono">tickValues</code> is a function of the window, so a zoom refines the
          cent grid — drag a box around the spring prices.
        </Note>
      </div>
    </Example>
  );
}

const EVERY_OTHER_MONTH = MONTHS.filter((_, i) => i % 2 === 0).map((m) => m.period);

function CategoryTicks() {
  return (
    <Example
      label="x.tickValues on a category axis"
      hint="label only the categories asked for; the slots stay one per row"
    >
      <SeriesChart
        rows={MONTHS}
        x={{
          type: "category",
          key: "period",
          tickValues: EVERY_OTHER_MONTH,
          format: (_, tick) => monthLabel(tick.value),
          label: (_, tick) => `Month ${String(tick.value)}`,
        }}
        axes={[{ id: "y", title: "Net (EUR)", format: (v) => WHOLE.format(v), tickValues: [-500, 0, 500, 1000, 1500] }]}
        series={[{ key: "net", label: "Net", type: "area", color: "var(--money-net)", fillOpacity: 0.35 }]}
        height="h-56"
        valueFormat={(v) => EUR.format(v)}
      />
      <div className="mt-3">
        <Note>
          Only January, March, May, July and September are labelled, from{" "}
          <code className="font-mono">tickValues</code> in the axis&apos; own terms (the ISO periods); the
          tooltip heading comes from <code className="font-mono">x.label</code>. The y ticks are a fixed
          list. A lone area is drawn at 0.2 by default — this one says{" "}
          <code className="font-mono">fillOpacity: 0.35</code>.
        </Note>
      </div>
    </Example>
  );
}

const DAILY = Array.from({ length: 60 }, (_, i) => ({
  day: `D${i + 1}`,
  count: 20 + ((i * 37) % 23) + (i % 7 === 5 || i % 7 === 6 ? -12 : 0),
}));
const ZOOM_OPTIONS: { value: ZoomAxesSetting | "default"; label: string }[] = [
  { value: "default", label: "default" },
  { value: "x", label: "x" },
  { value: "none", label: "none" },
];

function ZoomAxesDemo() {
  const [zoom, setZoom] = useState<ZoomAxesSetting | "default">("x");
  const [clicked, setClicked] = useState<string>("—");
  const series: SeriesChartSeries[] = [{ key: "count", label: "Bookings", type: "bar" }];
  return (
    <Example
      label="zoomAxes — sixty bars that opt back into a zoom"
      hint="default is read off the marks: lines both, areas x, bars none"
    >
      <Row className="mb-3">
        <ToggleGroup<ZoomAxesSetting | "default"> aria-label="zoomAxes" value={zoom} onChange={setZoom} options={ZOOM_OPTIONS} />
        <span className="font-mono text-xs text-[var(--text-muted)]">clicked: {clicked}</span>
      </Row>
      <SeriesChart
        rows={DAILY}
        x={{ type: "category", key: "day" }}
        axes={[{ id: "y", title: "Bookings", format: (v) => WHOLE.format(v) }]}
        series={series}
        zoomAxes={zoom === "default" ? undefined : zoom}
        onPointClick={(hit) => setClicked(`${String(hit.x)}${hit.key ? ` (${hit.key})` : ""}`)}
        height="h-56"
      />
      <OutTable
        rows={[
          ['defaultZoomAxes([{ type: "line" }])', defaultZoomAxes([{ type: "line" }])],
          ['defaultZoomAxes([{ type: "area" }])', defaultZoomAxes([{ type: "area" }])],
          ['defaultZoomAxes([{ type: "bar" }, { type: "area" }])', defaultZoomAxes([{ type: "bar" }, { type: "area" }])],
        ]}
      />
      <div className="mt-3">
        <Note>
          With <code className="font-mono">zoomAxes=&quot;x&quot;</code> a drag across the bars picks a
          stretch of days — the axis ticks whole slots and the bars at the edge are clipped — and a
          click still reports, but the slot rather than the bar, since the drag layer lies over them.
          On <code className="font-mono">default</code> (none, for bars) and{" "}
          <code className="font-mono">none</code> there is nothing to drag and a click on a bar names it.
          An axis carrying bars never takes a dragged y window: it refits from zero.
        </Note>
      </div>
    </Example>
  );
}

const LEGEND_SERIES: SeriesChartSeries[] = [
  { key: "housing", label: "Housing", type: "bar", stack: "s" },
  { key: "food", label: "Food", type: "bar", stack: "s" },
  { key: "transport", label: "Transport", type: "bar", stack: "s" },
  { key: "leisure", label: "Leisure", type: "bar", stack: "s" },
  { key: "budget", label: "Budget", dashed: true },
];

function StableLegend() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [naive, setNaive] = useState(false);
  const rows = SPENDING.map((r) => ({ ...r, budget: 2150 }));
  const shown = naive ? LEGEND_SERIES.filter((s) => !hidden.has(s.key)) : visibleSeries(LEGEND_SERIES, hidden);
  return (
    <Example
      label="visibleSeries / seriesLegendEntries — colours that hold still"
      hint="resolve the colours on the FULL list, then filter; switch Housing off and compare"
    >
      <Row className="mb-3">
        <Button variant={naive ? "secondary" : "brand"} onClick={() => setNaive(false)}>
          visibleSeries(series, hidden)
        </Button>
        <Button variant={naive ? "brand" : "secondary"} onClick={() => setNaive(true)}>
          series.filter(…) — the bug
        </Button>
      </Row>
      <SeriesChart
        rows={rows}
        x={{ type: "category", key: "period", format: (_, tick) => monthLabel(tick.value) }}
        axes={MONEY_AXIS}
        series={shown}
        valueFormat={(v) => EUR.format(v)}
        height="h-60"
      />
      <ToggleLegend
        entries={seriesLegendEntries(LEGEND_SERIES)}
        hidden={hidden}
        onToggle={(key) => setHidden(toggleHidden(hidden, key))}
      />
      <div className="mt-3">
        <Note>
          A series with no <code className="font-mono">color</code> takes{" "}
          <code className="font-mono">paletteFor(its position)</code>. Hand the chart a filtered list and
          every later series moves up a position and repaints in its neighbour&apos;s colour — with the
          second button, switch Housing off and Food turns Housing&apos;s colour while its legend swatch
          stays put. <code className="font-mono">visibleSeries</code> settles the colours first;{" "}
          <code className="font-mono">seriesLegendEntries</code> builds the legend from the same rule, a
          swatch for a bar or an area and a dashed stroke for the dashed budget line.
        </Note>
      </div>
    </Example>
  );
}


/* ── late 0.8.0 additions ───────────────────────────────────────────────── */

const LONG_CATEGORIES = [
  "Groceries & household",
  "Rent and service charges",
  "Public transport passes",
  "Energy (electricity, gas)",
  "Insurance premiums",
  "Eating out & takeaway",
  "Health and pharmacy",
  "Subscriptions & software",
  "Gifts and donations",
  "Clothing & shoes",
  "Travel and holidays",
  "Education & courses",
].map((name, i) => ({ name, budget: 200 + ((i * 97) % 400), spent: 150 + ((i * 131) % 480) }));

/** Weeks 1–12: an integer abscissa the chart now ticks in whole numbers on its own. */
const WEEKS = Array.from({ length: 12 }, (_, i) => ({
  x: i + 1,
  orders: 40 + ((i * 17) % 23),
  target: 50,
}));

const WEEK_SERIES: SeriesChartSeries[] = [
  { key: "orders", label: "Orders", activeDot: false, dot: true },
  { key: "target", label: "Target", dash: "4 3", strokeWidth: 1.5 },
];

function LateAdditions() {
  const scroller = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(-45);
  const [integer, setInteger] = useState<"auto" | "off">("auto");
  return (
    <Example
      label="Tilted category ticks, a tooltip bounded by its scroller, whole-number ticks, a custom dash"
      hint="x.tickAngle · tooltip.boundary · height in px · x.integerTicks · dash: '4 3' · activeDot: false"
    >
      <Row className="mb-2 text-xs text-[var(--text-secondary)]">
        <span>x.tickAngle</span>
        <ToggleGroup<"0" | "-30" | "-45">
          aria-label="Tick angle"
          value={String(angle) as "0" | "-30" | "-45"}
          onChange={(v) => setAngle(Number(v))}
          options={[
            { value: "0", label: "0" },
            { value: "-30", label: "−30" },
            { value: "-45", label: "−45" },
          ]}
        />
      </Row>
      <div ref={scroller} className="overflow-x-auto rounded-md border border-[var(--border)]">
        <div style={{ minWidth: LONG_CATEGORIES.length * 90 }}>
          <SeriesChart
            rows={LONG_CATEGORIES}
            x={{ type: "category", key: "name", tickAngle: angle }}
            axes={MONEY_AXIS}
            series={[
              { key: "budget", label: "Budget", type: "bar", color: "var(--text-muted)", fillOpacity: 0.35 },
              { key: "spent", label: "Spent", type: "bar", color: "var(--money-expense)" },
            ]}
            valueFormat={(v) => EUR.format(v)}
            height={340}
            tooltip={{ boundary: scroller, allowEscapeViewBox: { x: true } }}
          />
        </div>
      </div>
      <Row className="mb-2 mt-5 text-xs text-[var(--text-secondary)]">
        <span>x.integerTicks</span>
        <ToggleGroup<"auto" | "off">
          aria-label="Integer ticks"
          value={integer}
          onChange={setInteger}
          options={[
            { value: "auto", label: "auto (whole weeks)" },
            { value: "off", label: "false" },
          ]}
        />
      </Row>
      <SeriesChart
        rows={WEEKS}
        x={{ title: "Week", integerTicks: integer === "off" ? false : undefined }}
        axes={[{ id: "y", title: "Orders", format: (v) => WHOLE.format(v) }]}
        series={WEEK_SERIES}
        height={220}
      />
      <ToggleLegend entries={seriesLegendEntries(WEEK_SERIES)} hidden={new Set()} onToggle={() => undefined} />
      <div className="mt-3">
        <Note>
          The twelve category names are long, so the ticks are tilted by{" "}
          <code className="font-mono">x.tickAngle</code> and the chart reserves the band they need. The
          chart is wider than the card and scrolls sideways; <code className="font-mono">tooltip.boundary</code>{" "}
          is the scroll wrapper, so near its visible right edge the tooltip flips to the left of the cursor
          instead of hiding past the edge you have not scrolled to (and{" "}
          <code className="font-mono">allowEscapeViewBox</code> lets it leave the plot box).{" "}
          <code className="font-mono">height</code> is a number of pixels here (340, 220) rather than a
          Tailwind class. The week chart&apos;s abscissa is all whole numbers, so it ticks whole weeks
          without being told; <code className="font-mono">integerTicks: false</code> brings back the
          fractional ladder (7.5, 12.5 …) and <code className="font-mono">true</code> would force whole ticks.
          The target is <code className="font-mono">dash: &quot;4 3&quot;</code>, a custom dash array the
          legend draws too, and the orders line has <code className="font-mono">activeDot: false</code>: its
          ringed samples stay as they are under the pointer, with no enlarged hover dot.
        </Note>
      </div>
    </Example>
  );
}

export function SeriesChartMarks() {
  return (
    <>
      <Note>
        <strong>Needs <code className="font-mono">recharts</code></strong>, like every chart. The first
        page, &ldquo;Series chart&rdquo;, has the numeric measurement plots, the zoom and the axis helpers;
        this one has what 0.8.0 added for money and time.
      </Note>
      <GroupedBars />
      <Stacks />
      <TimeAxis />
      <CategoryTicks />
      <ZoomAxesDemo />
      <StableLegend />
      <LateAdditions />
    </>
  );
}
