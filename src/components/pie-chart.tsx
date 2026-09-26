// A part-to-whole chart: a donut (or a full pie), one slice per category, its ANGLE
// the category's share of what is drawn. Lifted out of kastlan, where the dashboard's
// occupancy card and the reports' maintenance card each drew a recharts `<Pie>` by
// hand inside the kit's `ChartContainer` — with a legend that could not switch
// anything, slices a keyboard could not reach, and colours from a local hex list.
//
// It uses the kit's own chart shell (`ChartContainer`, `ChartTooltipContent`) and
// ramp (`paletteFor`), so it re-skins with the palette like every other chart, and the
// kit's own legends (`ToggleLegend`, `StaticLegend`).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { Pie, PieChart as RechartsPieChart, Sector } from "recharts";
import type { PieLabelRenderProps, PieSectorShapeProps } from "recharts";
import { cn } from "../lib/cn";
import { horizontalStep } from "../lib/direction";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { paletteFor } from "../theme/chart-palette";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";
import { DEFAULT_PIE_CHART_LABELS, type PieChartLabels } from "./pie-chart-labels";
import { StaticLegend, ToggleLegend, toggleHidden, type LegendEntry } from "./toggle-legend";

/** One slice. */
export interface PieChartSlice {
  /** Stable key, handed back by {@link PieChartProps.onSliceClick} and used by the
   *  legend's hidden set. Labels can collide; keys must not. */
  key: string;
  /** What the slice is called — in the legend, the tooltip and its accessible name. */
  label: string;
  /**
   * The slice's size. A value that is not a positive finite number — `null` for a
   * figure that is missing, a zero, a negative — is NOT drawn and not in the legend:
   * an angle cannot be negative, and a zero-degree slice is one a pointer and a
   * keyboard would both stop on to find nothing.
   */
  value: number | null | undefined;
  /** Overrides the by-index palette colour (`paletteFor(i)`, `i` the slice's index in
   *  `data` AS GIVEN) — a status that has a colour of its own. Any CSS colour. */
  color?: string;
}

/**
 * Everything a `<div>` takes reaches the chart's root, so a test id or a `data-tour`
 * anchor can find it. `children` is the chart's own.
 */
export interface PieChartProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  data: readonly PieChartSlice[];
  /** `"donut"` (default) leaves a hole with the total in it; `"pie"` is the full disc. */
  variant?: "donut" | "pie";
  /** Height of the plot in px (the legend is under it). Default 300. */
  height?: number;
  /** How a value is written in the tooltip, the slice's name, a `"value"` slice label
   *  and the donut's total. Default: `Intl.NumberFormat` in `locale`. */
  formatValue?: (value: number) => string;
  /**
   * What is written beside each slice: its share (`"percent"`, the default), its
   * value, or nothing. Only on slices of at least {@link minLabelShare} — a label on a
   * sliver sits on its neighbour's. The figure is in the tooltip and the slice's name
   * either way.
   */
  sliceLabels?: "percent" | "value" | "none";
  /** The smallest share (0–1) that gets a slice label. Default 0.04. */
  minLabelShare?: number;
  /** Draw the donut's centre: {@link centerLabel} over {@link centerValue}. Default
   *  `true`; ignored for `variant="pie"`, which has no centre to draw in. */
  center?: boolean;
  /** The caption in the donut's centre. Default: `labels.total`. */
  centerLabel?: ReactNode;
  /** The figure in the donut's centre. Default: the drawn total through `formatValue`. */
  centerValue?: ReactNode;
  /**
   * The legend under the chart. `"toggle"` (default): each entry is a switch that
   * takes its slice off the chart, and the percentages are then of what is left —
   * the shares always read "of this picture". `"static"`: a key with nothing to press.
   */
  legend?: "toggle" | "static" | "none";
  /** The slices switched off, for a caller that owns the set (a URL, a saved view).
   *  Left out, the chart keeps its own. */
  hiddenSlices?: ReadonlySet<string>;
  /** Called with the new hidden set whenever the legend switches a slice. */
  onHiddenSlicesChange?: (hidden: ReadonlySet<string>) => void;
  /** A slice was activated — by click, or Enter/Space on a focused slice. Makes each
   *  slice a `role="button"`. */
  onSliceClick?: (key: string, slice: PieChartSlice) => void;
  /**
   * Tag every figure ON SCREEN `data-private` — the tooltip bubble, the centre and
   * `"value"` slice labels — so the host's demo-mode rule blurs it. A percentage alone
   * reveals no amount, so `"percent"` labels stay readable, and the slices themselves
   * are not tagged: a blurred ring is no picture at all.
   */
  redact?: boolean;
  /** What to show with nothing to draw. Default: `labels.empty`. */
  empty?: ReactNode;
  /** BCP 47 tag for the numbers and percentages. Default: the provider's. */
  locale?: string;
  labels?: Partial<PieChartLabels>;
}

/** A slice as drawn: only the ones with a positive value, in `data` order. */
interface DrawnSlice {
  slice: PieChartSlice;
  value: number;
  color: string;
  /** Of what is drawn, 0–1. */
  share: number;
}

// Slices carry their own `fill`, and `ChartTooltipContent` falls back to it for the
// swatch, so no series config is needed — and none is wanted, because a config key is a
// CSS identifier and a slice key is the caller's data (see `ChartStyle`).
const PIE_CONFIG: ChartConfig = {};

const RADIAN = Math.PI / 180;

/** The shared tooltip with the bubble tagged `data-private` — see the treemap's
 *  `RedactedTooltipContent` for why it has to BE the element recharts clones. */
function RedactedTooltipContent(props: ComponentProps<typeof ChartTooltipContent>) {
  return (
    <div data-private>
      <ChartTooltipContent {...props} />
    </div>
  );
}

/**
 * Part-to-whole chart: a donut (or `variant="pie"`), one slice per
 * {@link PieChartSlice}, coloured from the chart ramp by index.
 *
 * **Every slice is reachable from the keyboard.** The slices are ONE tab stop (a roving
 * tabindex, as in the kit's grids): ←/→ and ↑/↓ step to the next and previous slice —
 * clockwise from twelve o'clock, the order of the legend — with ←/→ following the
 * reading direction in RTL; Home/End go to the first and last. Each slice is named
 * "Label: value (xx%)" (`labels.slice`), because a colour and an angle are nothing a
 * screen reader can say, and focusing one reads it out in the donut's centre. With
 * `onSliceClick`, Enter and Space activate it as a click does.
 *
 * The legend switches slices off (`legend="toggle"`); the percentages are always of
 * what is drawn. The plot is not mirrored in RTL (see `ChartContainer`); the legend
 * and the centre follow the page.
 *
 * With nothing to draw it says so (`empty`) rather than drawing an empty box.
 *
 * Needs `recharts`, like everything behind `@eifi1/ui-kit/chart`.
 */
export function PieChart({
  data,
  variant = "donut",
  height = 300,
  formatValue: formatValueProp,
  sliceLabels = "percent",
  minLabelShare = 0.04,
  center = true,
  centerLabel,
  centerValue,
  legend = "toggle",
  hiddenSlices: hiddenProp,
  onHiddenSlicesChange,
  onSliceClick,
  redact = false,
  empty,
  locale: localeProp,
  labels: labelsProp,
  className,
  style,
  ...rest
}: PieChartProps) {
  const labels = useKitLabels("pieChart", DEFAULT_PIE_CHART_LABELS, labelsProp);
  const locale = useKitLocale(localeProp);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormats = useMemo(
    () => ({
      whole: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
      fine: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
    }),
    [locale],
  );
  // Memoised, like everything the sectors are drawn from: they must not be rebuilt on
  // this component's own re-renders (see `pie` below).
  const formatValue = useCallback(
    (v: number) => (formatValueProp ? formatValueProp(v) : numberFormat.format(v)),
    [formatValueProp, numberFormat],
  );
  // One decimal under 10 %, where rounding to whole percents starts to lie — a slice
  // of 0.4 % labelled "0%" says it is not there.
  const formatShare = useCallback(
    (share: number) => (share < 0.1 ? percentFormats.fine : percentFormats.whole).format(share),
    [percentFormats],
  );

  const [ownHidden, setOwnHidden] = useState<ReadonlySet<string>>(() => new Set());
  const hidden = hiddenProp ?? ownHidden;
  const toggle = (key: string) => {
    const next = toggleHidden(hidden, key);
    if (hiddenProp === undefined) setOwnHidden(next);
    onHiddenSlicesChange?.(next);
  };

  // Coloured by index into `data` AS GIVEN, before anything is dropped, so a slice
  // keeps its colour when a neighbour is switched off or has no value.
  const { drawable, drawn, total, pieData } = useMemo(() => {
    const drawable = data
      .map((slice, i) => ({ slice, value: slice.value, color: slice.color ?? paletteFor(i) }))
      .filter((d): d is { slice: PieChartSlice; value: number; color: string } =>
        typeof d.value === "number" && Number.isFinite(d.value) && d.value > 0,
      );
    const shown = drawable.filter((d) => !hidden.has(d.slice.key));
    const total = shown.reduce((acc, d) => acc + d.value, 0);
    const drawn: DrawnSlice[] = shown.map((d) => ({ ...d, share: total > 0 ? d.value / total : 0 }));
    const pieData = drawn.map((d) => ({
      key: d.slice.key,
      label: d.slice.label,
      value: d.value,
      fill: d.color,
    }));
    return { drawable, drawn, total, pieData };
  }, [data, hidden]);

  // The roving tab stop, and the slice that has focus (which the centre reads out).
  const [stop, setStop] = useState(0);
  const [focused, setFocused] = useState<number | undefined>(undefined);
  const current = Math.min(stop, Math.max(0, drawn.length - 1));
  const refs = useRef<(SVGGElement | null)[]>([]);
  const focusedSlice = focused !== undefined ? drawn[focused] : undefined;

  // Read through a ref: the sectors are drawn once per `data`, and a caller's inline
  // `onSliceClick` is a new function every render.
  const clickRef = useRef(onSliceClick);
  useLayoutEffect(() => {
    clickRef.current = onSliceClick;
  });
  const clickable = onSliceClick !== undefined;

  /**
   * One sector, wrapped in its keyboard stop. recharts renders it inside a layer of its
   * own that carries the pointer's hover and click, so those are untouched.
   *
   * Focus does NOT drive the recharts tooltip (`defaultIndex`), as it does in
   * `SeriesChart`: an active pie sector is re-parented into an extra layer, which
   * remounts this element and drops the focus it just took. The donut's centre is the
   * keyboard's read-out instead.
   */
  const shape = useCallback(
    (props: PieSectorShapeProps) => {
      const {
        index,
        isActive: _isActive,
        tabIndex: _tabIndex,
        animationElapsedTime: _elapsed,
        isAnimating: _animating,
        isEntrance: _entrance,
        ...sector
      } = props as PieSectorShapeProps & {
        animationElapsedTime?: number;
        isAnimating?: boolean;
        isEntrance?: boolean;
      };
      const d = drawn[index];
      if (!d) return <Sector {...sector} />;
      const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
        const step = horizontalStep(event.key, event.currentTarget);
        let target: number | undefined;
        if (step) target = index + step;
        else if (event.key === "ArrowDown") target = index + 1;
        else if (event.key === "ArrowUp") target = index - 1;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = drawn.length - 1;
        if (target !== undefined) {
          event.preventDefault();
          // Round the circle: past the last slice is the first, as the eye goes.
          refs.current[((target % drawn.length) + drawn.length) % drawn.length]?.focus();
        } else if (clickable && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          clickRef.current?.(d.slice.key, d.slice);
        }
      };
      return (
        <g
          ref={(node) => {
            refs.current[index] = node;
          }}
          role={clickable ? "button" : "img"}
          // The first slice until the effect below moves the stop.
          tabIndex={index === 0 ? 0 : -1}
          aria-label={labels.slice(d.slice.label, formatValue(d.value), formatShare(d.share))}
          data-slice={d.slice.key}
          onKeyDown={onKeyDown}
          onFocus={() => {
            setStop(index);
            setFocused(index);
          }}
          onBlur={() => setFocused(undefined)}
          // CSS beats a presentation attribute, so this recolours the sector's own
          // stroke for as long as it has keyboard focus.
          className="outline-none [&:focus-visible>path]:stroke-[var(--text-primary)]"
        >
          <Sector {...sector} />
        </g>
      );
    },
    [drawn, labels, formatValue, formatShare, clickable],
  );

  const label = useCallback(
    (props: PieLabelRenderProps) => {
      const d = drawn[props.index ?? -1];
      const cx = Number(props.cx);
      const cy = Number(props.cy);
      const radius = Number(props.outerRadius);
      const mid = Number(props.midAngle);
      if (!d || d.share < minLabelShare || ![cx, cy, radius, mid].every(Number.isFinite)) return null;
      const r = radius + 10;
      const x = cx + r * Math.cos(-mid * RADIAN);
      const y = cy + r * Math.sin(-mid * RADIAN);
      const isValue = sliceLabels === "value";
      return (
        <text
          x={x}
          y={y}
          textAnchor={x >= cx ? "start" : "end"}
          dominantBaseline="central"
          fontSize={11}
          fill="var(--text-secondary)"
          data-private={redact && isValue ? "" : undefined}
          style={{ pointerEvents: "none" }}
        >
          {isValue ? formatValue(d.value) : formatShare(d.share)}
        </text>
      );
    },
    [drawn, minLabelShare, sliceLabels, redact, formatValue, formatShare],
  );

  const withLabels = sliceLabels !== "none";
  // Room outside the ring for the labels, or the ring fills the box.
  const outer = withLabels ? 72 : 88;
  const inner = variant === "donut" ? Math.round(outer * 0.6) : 0;

  /**
   * The `<Pie>`, as ONE element for as long as what it draws is unchanged. recharts
   * keys its sectors by an animation id that is renewed whenever the Pie's props object
   * is — i.e. on every render of the Pie — so re-rendering it remounts every sector,
   * the one with focus included, which dropped the focus to <body> on the very state
   * update that focusing a slice makes. An unchanged element is one React does not
   * re-render, so the sectors stay put, and the roving tab stop is moved on them in
   * place (the effect below).
   */
  const pie = useMemo(
    () => (
      <Pie
        data={pieData}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="50%"
        outerRadius={`${outer}%`}
        innerRadius={`${inner}%`}
        startAngle={90}
        endAngle={-270}
        // The card showing through between the slices, as the treemap's gutter.
        stroke="var(--bg-surface)"
        strokeWidth={2}
        rootTabIndex={-1}
        isAnimationActive={false}
        shape={shape}
        label={withLabels ? label : false}
        labelLine={false}
        onClick={
          clickable
            ? (_entry: unknown, index: number) => {
                const d = drawn[index];
                if (d) clickRef.current?.(d.slice.key, d.slice);
              }
            : undefined
        }
      />
    ),
    [pieData, drawn, shape, label, withLabels, outer, inner, clickable],
  );

  // The roving tab stop, moved on the sectors in place (they are not re-rendered).
  useEffect(() => {
    refs.current.forEach((el, i) => el?.setAttribute("tabindex", i === current ? "0" : "-1"));
  });

  const legendEntries: LegendEntry[] = drawable.map((d) => ({
    key: d.slice.key,
    label: d.slice.label,
    color: d.color,
  }));

  const emptyBox = (
    <div
      className="flex items-center justify-center text-sm text-[var(--text-muted)]"
      style={{ height }}
    >
      {empty ?? labels.empty}
    </div>
  );

  // Nothing drawable at all: no chart, and no legend of switches for nothing.
  if (drawable.length === 0) {
    return (
      <div {...rest} className={cn("w-full", className)} style={style}>
        {emptyBox}
      </div>
    );
  }

  const Content = redact ? RedactedTooltipContent : ChartTooltipContent;

  return (
    <div {...rest} className={cn("w-full", className)} style={style}>
      {drawn.length === 0 ? (
        // Every slice switched off: the legend below is how they come back.
        emptyBox
      ) : (
        <div role="group" aria-label={labels.slices} className="relative" style={{ height }}>
          <ChartContainer
            config={PIE_CONFIG}
            className={cn("h-full", clickable && "[&_.recharts-pie-sector]:cursor-pointer")}
          >
            <RechartsPieChart accessibilityLayer={false}>
              <ChartTooltip
                content={
                  <Content
                    hideLabel
                    valueFormatter={(v) =>
                      `${formatValue(v)} (${formatShare(total > 0 ? v / total : 0)})`
                    }
                  />
                }
              />
              {pie}
            </RechartsPieChart>
          </ChartContainer>
          {variant === "donut" && center && (
            <div
              data-private={redact ? "" : undefined}
              // While a slice has keyboard focus the centre reads it out — the
              // keyboard's tooltip. Hidden from assistive technology then: the slice's
              // own name has just said the same.
              aria-hidden={focusedSlice ? true : undefined}
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
            >
              <span className="max-w-[40%] truncate text-xs text-[var(--text-muted)]">
                {focusedSlice ? focusedSlice.slice.label : (centerLabel ?? labels.total)}
              </span>
              <span className="max-w-[40%] truncate text-lg font-semibold tabular-nums text-[var(--text-primary)]">
                {focusedSlice ? formatValue(focusedSlice.value) : (centerValue ?? formatValue(total))}
              </span>
              {focusedSlice && (
                <span className="text-xs tabular-nums text-[var(--text-muted)]">
                  {formatShare(focusedSlice.share)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      {legend === "toggle" && (
        <ToggleLegend
          entries={legendEntries}
          hidden={hidden}
          onToggle={toggle}
          showSingle
          className="justify-center"
          labels={{ legend: labels.legend }}
        />
      )}
      {legend === "static" && (
        <StaticLegend entries={legendEntries} className="justify-center" aria-label={labels.legend} />
      )}
    </div>
  );
}
