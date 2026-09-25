import { useState } from "react";
import {
  FACING_SIDES,
  LegendColumn,
  LegendGroup,
  SeriesChart,
  STEP_DASH,
  SharedXZoom,
  StaticSeriesChart,
  ToggleLegend,
  axisBandWidth,
  facingAxes,
  facingBand,
  facingHeadingPad,
  mergeSeries,
  oneAxis,
  padBand,
  paddedDomain,
  paletteFor,
  seriesKey,
  soleSeriesColor,
  strokeDash,
  toggleHidden,
  zoomAxesFor,
} from "@eifi1/ui-kit";
import type { LegendEntry, SeriesChartAxis, SeriesChartSeries } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * SeriesChart — the measurement plot, with drag-to-zoom and a legend of switches.
 *
 * Every specimen below is a sweep of synthetic measurements, because that is what the
 * chart is for: a numeric abscissa, several channels that do not share a unit, and a
 * reader who wants to put a ruler on it. No colour is written here either — series take
 * the `--chart-N` ramp by position (or `paletteFor(i)` where two things must agree).
 */

// Module scope: an Intl formatter is expensive to construct, and these are stateless.
const ONE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });
const TWO = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });
const WHOLE = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** A steering sweep: travel out to one lock and back, with a load that lags it. */
const SWEEP = Array.from({ length: 121 }, (_, i) => {
  const t = i / 20;
  const position = 60 * Math.sin(t);
  return {
    x: t,
    position,
    velocity: 60 * Math.cos(t),
    load: 900 * Math.sin(t - 0.35) + 120 * Math.sin(5 * t),
    segment: Math.floor(t / 1.5),
  };
});

/** Five channels of one measurement, for the dash patterns. */
const ANGLES = Array.from({ length: 81 }, (_, i) => {
  const x = -40 + i;
  return {
    x,
    wheel: 0.9 * x,
    a: 0.6 * x + 4,
    b: 0.45 * x - 3,
    c: 0.3 * x + 8,
    d: 0.15 * x - 6,
  };
});

/** A hysteresis loop: out on one branch, back on the other, sampled on two grids. */
const LOOP = mergeSeries([
  {
    x: Array.from({ length: 41 }, (_, i) => -100 + i * 5),
    channels: { rising: Array.from({ length: 41 }, (_, i) => 8 * (-100 + i * 5) - 180) },
  },
  {
    x: Array.from({ length: 27 }, (_, i) => -100 + i * 7.7),
    channels: { falling: Array.from({ length: 27 }, (_, i) => 8 * (-100 + i * 7.7) + 180) },
  },
]);

/** A logger with two dropouts: the key is ABSENT in those rows, which is a hole. */
const LOGGED = Array.from({ length: 61 }, (_, i) => {
  const row: Record<string, number> = { x: i };
  const dropout = (i >= 18 && i <= 25) || (i >= 41 && i <= 44);
  if (!dropout) row.force = 400 + 260 * Math.sin(i / 7) + 40 * Math.sin(i / 1.3);
  return row;
});

/** A temperature log whose abscissa is keyed `t`, not the default `x`. */
const TEMPERATURE = Array.from({ length: 49 }, (_, i) => ({
  t: i * 0.25,
  temp: 20 + 3.5 * Math.sin(i / 6) + i * 0.05,
}));

/** Arabic strings for the chart family — every word the chart can say itself. */
const AR_LABELS = {
  resetZoom: "إعادة ضبط التكبير",
  zoomHint: "اسحب للتكبير، وانقر نقرًا مزدوجًا لإعادة الضبط.",
  empty: "لا توجد بيانات",
  legend: "السلاسل",
};

const show = (value: unknown) =>
  value === undefined ? "undefined" : typeof value === "string" ? `"${value}"` : JSON.stringify(value);

const SWEEP_X = {
  title: "Time (s)",
  format: (v: number) => TWO.format(v),
  label: (v: number) => `t = ${TWO.format(v)} s`,
};

export function SeriesChartDemo() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [hiddenAngles, setHiddenAngles] = useState<ReadonlySet<string>>(new Set(["d"]));
  const [hiddenTemp, setHiddenTemp] = useState<ReadonlySet<string>>(new Set());
  const [bridged, setBridged] = useState(false);

  const channels: (SeriesChartSeries & { unit: string })[] = [
    { key: "position", label: "Position", axis: "mm", unit: "mm", color: paletteFor(0) },
    { key: "velocity", label: "Velocity", axis: "vel", unit: "mm/s", color: paletteFor(2) },
    { key: "load", label: "Rack load", axis: "n", unit: "N", color: paletteFor(6) },
    { key: "segment", label: "Segment", axis: "seg", unit: "", color: paletteFor(4), step: true },
  ];
  const shown = channels.filter((c) => !hidden.has(c.key));
  const axes: SeriesChartAxis[] = [
    { id: "mm", title: "Position (mm)", color: paletteFor(0), format: (v) => WHOLE.format(v) },
    { id: "vel", title: "Velocity (mm/s)", hide: true },
    { id: "n", title: "Load (N)", orientation: "right", width: 56, color: paletteFor(6), format: (v) => WHOLE.format(v) },
    { id: "seg", title: "Segment", hide: true },
  ];
  const legend: LegendEntry[] = channels.map((c) => ({
    key: c.key,
    label: c.unit ? `${c.label} (${c.unit})` : c.label,
    color: c.color!,
    marker: c.step ? "stroke" : "swatch",
    dash: c.step ? 1 : undefined,
  }));

  const angleKeys = ["wheel", "a", "b", "c", "d"] as const;
  const angleNames = ["Wheel angle", "Bearing A", "Bearing B", "Bearing C", "Bearing D"];
  const angleLegend: LegendEntry[] = angleKeys.map((key, i) => ({
    key,
    label: angleNames[i],
    color: paletteFor(0),
    marker: "stroke",
    dash: i,
  }));

  return (
    <>
      <Note>
        <strong>Needs <code className="font-mono">recharts</code></strong>, like everything behind{" "}
        <code className="font-mono">@eifi1/ui-kit/chart</code>. Drag across a plot to zoom: a roughly
        square selection zooms both axes, a long thin one only its own (the other refits to what is
        inside). Double-click or press <em>Reset zoom</em> to go back — the button is a real button,
        so Tab reaches it.
      </Note>

      <Example
        label="SeriesChart — an axis per unit, and a legend of switches"
        hint="hidden axes still scale their lines; switch channels off and the page does not reflow"
      >
        <SeriesChart
          rows={SWEEP}
          series={shown}
          axes={axes}
          x={SWEEP_X}
          valueFormat={(v) => ONE.format(v)}
          animationMs={180}
          empty={<p className="text-xs text-[var(--text-muted)]">Every channel is switched off.</p>}
        />
        <ToggleLegend
          entries={legend}
          hidden={hidden}
          onToggle={(key) => setHidden(toggleHidden(hidden, key))}
        />
      </Example>

      <Example
        label="SeriesChart — five strokes for five channels"
        hint="the colour says which measurement, the dash says which channel; the legend stands beside the chart from sm up and under it on a phone"
      >
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <SeriesChart
              rows={ANGLES}
              series={angleKeys
                .filter((key) => !hiddenAngles.has(key))
                .map((key) => ({
                  key,
                  label: angleNames[angleKeys.indexOf(key)],
                  color: paletteFor(0),
                  dash: angleKeys.indexOf(key),
                }))}
              axes={oneAxis((v) => WHOLE.format(v), "Angle (°)")}
              x={{ title: "Rack travel (mm)", format: (v) => WHOLE.format(v) }}
              valueFormat={(v) => `${ONE.format(v)}°`}
              height="h-64"
            />
          </div>
          <LegendColumn className="sm:w-40">
            <LegendGroup title="Channel">
              <ToggleLegend
                orientation="vertical"
                entries={angleLegend}
                hidden={hiddenAngles}
                onToggle={(key) => setHiddenAngles(toggleHidden(hiddenAngles, key))}
              />
            </LegendGroup>
          </LegendColumn>
        </div>
      </Example>

      <Example
        label="SharedXZoom — one x window for a stack"
        hint="drag either chart; both follow, each refitting its own y. Only the bottom one prints the abscissa"
      >
        <SharedXZoom>
          <div className="space-y-1">
            <SeriesChart
              rows={SWEEP}
              series={[{ key: "position", label: "Position" }]}
              axes={oneAxis((v) => WHOLE.format(v), "Position (mm)", 56)}
              x={{ ...SWEEP_X, title: "", ticks: false }}
              valueFormat={(v) => `${ONE.format(v)} mm`}
              height="h-40"
            />
            <SeriesChart
              rows={SWEEP}
              series={[{ key: "load", label: "Rack load", color: paletteFor(6) }]}
              axes={oneAxis((v) => WHOLE.format(v), "Load (N)", 56)}
              x={SWEEP_X}
              valueFormat={(v) => `${WHOLE.format(v)} N`}
              height="h-48"
            />
          </div>
        </SharedXZoom>
      </Example>

      <Example
        label="SeriesChart — spans close a loop, connectNulls bridges two grids"
        hint="two branches sampled at different spacings, merged on the abscissa itself — never interpolated"
      >
        <SeriesChart
          rows={LOOP}
          series={[
            { key: "rising", label: "Out-stroke" },
            { key: "falling", label: "Return", dashed: true },
          ]}
          spans={[
            { key: "left-turn", x: -100, from: -980, to: -620 },
            { key: "right-turn", x: 100, from: 620, to: 980 },
          ]}
          connectNulls
          axes={oneAxis((v) => WHOLE.format(v), "Force (N)", 56)}
          x={{ title: "Deflection (mm)", format: (v) => WHOLE.format(v) }}
          valueFormat={(v) => `${WHOLE.format(v)} N`}
          height="h-64"
        />
      </Example>

      <Example
        label="facingAxes — a mirrored pair"
        hint="ticks on the outside, the quantity named once, both plots the same width; side by side from md up, stacked on a phone"
      >
        <SharedXZoom>
          <div className="grid gap-4 md:grid-cols-2">
            {FACING_SIDES.map((side) => (
              <section key={side} className="min-w-0">
                <h4
                  className="mb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]"
                  style={facingHeadingPad(side)}
                >
                  {side === "left" ? "Left side" : "Right side"}
                </h4>
                <SeriesChart
                  rows={SWEEP.map((row) => ({ x: row.x, load: side === "left" ? row.load : -row.load * 0.93 }))}
                  series={[{ key: "load", label: "Tie-rod load", color: paletteFor(side === "left" ? 1 : 7) }]}
                  axes={facingAxes({ side, title: "Load (N)", format: (v) => WHOLE.format(v), domain: [-1100, 1100] })}
                  x={SWEEP_X}
                  valueFormat={(v) => `${WHOLE.format(v)} N`}
                  height="h-56"
                />
              </section>
            ))}
          </div>
        </SharedXZoom>
      </Example>

      <Example label="SeriesChart — nothing to draw" hint="the empty state keeps the chart's height, so nothing under it moves">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 font-mono text-[11px] text-[var(--text-muted)]">empty omitted: the label</p>
            <div className="rounded border border-dashed border-[var(--border)]">
              <SeriesChart rows={[]} series={[]} height="h-32" />
            </div>
          </div>
          <div>
            <p className="mb-1 font-mono text-[11px] text-[var(--text-muted)]">empty=&#123;null&#125;: nothing, same height</p>
            <div className="rounded border border-dashed border-[var(--border)]">
              <SeriesChart rows={[]} series={[]} height="h-32" empty={null} />
            </div>
          </div>
        </div>
      </Example>

      <Example
        label="StaticSeriesChart — holes, coloured spans, no zoom"
        hint="the same picture without the drag layer; toggle connectNulls to bridge the two dropouts"
      >
        <button
          type="button"
          aria-pressed={bridged}
          onClick={() => setBridged((b) => !b)}
          className="mb-2 rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        >
          connectNulls: {String(bridged)}
        </button>
        <StaticSeriesChart
          rows={LOGGED}
          series={[{ key: "force", label: "Clamp force", axis: "n", color: paletteFor(2) }]}
          axes={[{ id: "n", title: "Force (N)", format: (v) => WHOLE.format(v), width: 44 }]}
          x={{ title: "Sample", format: (v) => WHOLE.format(v) }}
          valueFormat={(v) => `${WHOLE.format(v)} N`}
          connectNulls={bridged}
          spans={[
            { key: "limit-a", axis: "n", x: 10, from: 150, to: 700, color: paletteFor(6) },
            { key: "limit-b", axis: "n", x: 50, from: 150, to: 700, color: paletteFor(6) },
          ]}
          height="h-56"
          className="[&_.recharts-cartesian-grid_line]:[stroke-dasharray:2_3]"
        />
        <div className="mt-3">
          <Note>
            A missing key is a hole: without <code className="font-mono">connectNulls</code> the line
            stops and restarts, which is the honest picture of a logger that dropped out. The two
            spans are drawn on the named axis <code className="font-mono">n</code> in their own{" "}
            <code className="font-mono">color</code> (default: <code className="font-mono">--text-muted</code>).{" "}
            <code className="font-mono">StaticSeriesChart</code> is for a thumbnail, a print view, or
            a chart wrapped in the consumer&apos;s own interaction; <code className="font-mono">className</code>{" "}
            reaches its <code className="font-mono">ChartContainer</code>.
          </Note>
        </div>
      </Example>

      <Example
        label="SeriesChart — labels, locale and right-to-left"
        hint="locale ar-EG formats the default ticks; drag to zoom and the reset button sits at the logical end (top left here)"
      >
        <div dir="rtl" lang="ar">
          <SeriesChart
            rows={TEMPERATURE}
            series={
              hiddenTemp.has("temp")
                ? []
                : [{ key: "temp", label: "درجة الحرارة", color: paletteFor(3) }]
            }
            axes={oneAxis(undefined, "درجة الحرارة (°م)")}
            x={{ key: "t", title: "الزمن (ث)" }}
            locale="ar-EG"
            labels={AR_LABELS}
            height="h-56"
          />
          <ToggleLegend
            entries={[{ key: "temp", label: "درجة الحرارة", color: paletteFor(3) }]}
            hidden={hiddenTemp}
            onToggle={(key) => setHiddenTemp(toggleHidden(hiddenTemp, key))}
            showSingle
            labels={AR_LABELS}
          />
        </div>
        <div className="mt-3">
          <Note>
            <code className="font-mono">labels</code> overrides the{" "}
            <code className="font-mono">seriesChart</code> namespace per chart:{" "}
            <code className="font-mono">resetZoom</code> is the button,{" "}
            <code className="font-mono">zoomHint</code> the drag surface&apos;s accessible name,{" "}
            <code className="font-mono">empty</code> what shows when you switch the one series off, and{" "}
            <code className="font-mono">legend</code> the legend group&apos;s accessible name. The plot
            itself stays left-to-right — an abscissa is a number line, not text. The rows are keyed{" "}
            <code className="font-mono">t</code> (<code className="font-mono">x.key</code>), and{" "}
            <code className="font-mono">showSingle</code> keeps a one-entry legend, because it is the
            only switch that brings the series back.
          </Note>
        </div>
      </Example>

      <Example
        label="Series chart helpers"
        hint="the geometry, key and zoom arithmetic the charts above are built from — all exported"
      >
        <OutTable
          rows={[
            ['seriesKey("left side", 3)', show(seriesKey("left side", 3))],
            ['seriesKey(3, "a")', show(seriesKey(3, "a"))],
            ["paddedDomain([0, 10])", show(paddedDomain([0, 10]))],
            ["paddedDomain([5, 5])", show(paddedDomain([5, 5]))],
            ["padBand(1, 0)", show(padBand(1, 0))],
            ["axisBandWidth(undefined, true)", show(axisBandWidth(undefined, true))],
            ["facingBand(56)", show(facingBand(56))],
            [
              'soleSeriesColor({ id: "y", color }, [one series])',
              show(soleSeriesColor({ id: "y", color: paletteFor(0) }, [{}])),
            ],
            [
              'soleSeriesColor({ id: "y", color }, [two series])',
              show(soleSeriesColor({ id: "y", color: paletteFor(0) }, [{}, {}])),
            ],
            ["strokeDash(3)", show(strokeDash(3))],
            ["strokeDash(5)  // wraps", show(strokeDash(5))],
            ["STEP_DASH", show(STEP_DASH)],
            ["zoomAxesFor(150, 40, 300, 100)", show(zoomAxesFor(150, 40, 300, 100))],
            ["zoomAxesFor(240, 10, 300, 100)", show(zoomAxesFor(240, 10, 300, 100))],
            ["zoomAxesFor(3, 1, 300, 100)", show(zoomAxesFor(3, 1, 300, 100))],
          ]}
        />
      </Example>
    </>
  );
}
