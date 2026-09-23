// shadcn/ui chart kit — vendored (MIT) and adapted for this app:
//  - Recharts 3 instead of 2
//  - the original keys its styling off shadcn theme tokens (--muted-foreground,
//    --border, bg-background …). This app has no shadcn token layer, so those
//    are mapped onto this kit's own tokens (--text-muted, --border, --bg-surface
//    …), which follow the active palette preset and flip with the theme by
//    themselves — hence no `dark:` variants anywhere below.
// The value on show is the *structure*: config-driven colors injected as CSS
// vars, muted axis/grid styling, and a polished tooltip/legend — the things
// that make shadcn charts read as "designed" rather than "default Recharts".
import { createContext, useContext, useId, useRef } from "react";
import type { ComponentProps, CSSProperties, ReactNode, RefObject } from "react";
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "../lib/cn";

export interface ChartSeriesConfig {
  label: ReactNode;
  color: string;
}

export type ChartConfig = Record<string, ChartSeriesConfig>;

const ChartContext = createContext<ChartConfig | null>(null);

export function useChart(): ChartConfig {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within a <ChartContainer />");
  return ctx;
}

interface ChartContainerProps extends ComponentProps<"div"> {
  config: ChartConfig;
  children: ComponentProps<typeof ResponsiveContainer>["children"];
}

export function ChartContainer({ id, className, children, config, ...props }: ChartContainerProps) {
  const uid = useId();
  // The id is pasted into an UNQUOTED `[data-chart=…]` selector below, so it has to be
  // a CSS identifier: one stray space or `#` and the browser discards the whole rule,
  // taking every series colour with it — silently, because an invalid rule is not an
  // error anywhere. `useId()` gives `:r0:`, and a consumer-supplied id gives whatever
  // they typed, so both are filtered rather than just the colons.
  const chartId = `chart-${(id ?? uid).replace(/[^A-Za-z0-9_-]/g, "")}`;
  return (
    <ChartContext.Provider value={config}>
      <div
        data-chart={chartId}
        className={cn(
          // touch-pan-y lets a vertical finger drag still scroll the page while
          // a horizontal drag is handed to recharts for tooltip scrubbing,
          // instead of the page scrolling underneath the gesture (feedback #292).
          "flex w-full touch-pan-y justify-center text-xs",
          // muted axis labels + gridlines; one class each, since the tokens
          // already carry the light/dark values
          "[&_.recharts-cartesian-axis-tick_text]:fill-[var(--text-muted)]",
          "[&_.recharts-cartesian-grid_line]:stroke-[var(--border)]/70",
          // hairline hover cursor instead of the heavy default
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--border-strong)]",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--bg-hover)]",
          // kill the focus outlines & white sector strokes Recharts adds
          "[&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/**
 * A config key, which becomes the tail of a custom-property NAME.
 *
 * `dangerouslySetInnerHTML` means what it says: nothing below is escaped by React, and
 * a `ChartConfig` is not necessarily written by hand — kastlan builds one from category
 * rows in its database, so these keys are user data. A key containing `}` closes this
 * rule, and whatever follows it in that key becomes a NEW rule — one that applies to
 * the whole document rather than to this one chart.
 */
const CSS_IDENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * A config colour, which becomes a declaration VALUE.
 *
 * Every form a palette actually produces: both hex spellings, the functional notations
 * — with the argument list restricted to the characters those functions can legally
 * contain, so no `;`, no `}` and no nested `url(` — and `var(--token)`, which is what
 * this kit's own `paletteFor`/`CHART_COLORS` return. `var()`'s optional FALLBACK is
 * deliberately not accepted: its second argument is an arbitrary value, i.e. the same
 * hole in a shape that looks safe.
 */
const CSS_COLOR =
  /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|(?:rgba?|hsla?)\([0-9A-Za-z.,%/ -]*\)|var\(--[A-Za-z0-9_-]+\))$/;

// Inject each series colour as a `--color-<key>` custom property scoped to this
// chart, so chart JSX can refer to `var(--color-total)` and the legend/tooltip
// stay in sync from one source of truth.
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([key, c]) => {
    if (!c.color) return false;
    // Skipping the entry costs that one series its `var(--color-…)` and leaves the rest
    // of the chart painted; emitting it unchecked costs the page. The warning is so the
    // consumer finds out from their console rather than from a colourless bar.
    if (!CSS_IDENT.test(key)) {
      console.warn(`[ui-kit] chart config key is not a CSS identifier, skipped: ${key}`);
      return false;
    }
    if (!CSS_COLOR.test(c.color)) {
      console.warn(`[ui-kit] chart config colour for "${key}" is not a colour, skipped: ${c.color}`);
      return false;
    }
    return true;
  });
  if (!entries.length) return null;
  const css = `[data-chart=${id}] {\n${entries
    .map(([key, c]) => `  --color-${key}: ${c.color};`)
    .join("\n")}\n}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export const ChartTooltip = RechartsTooltip;
export const ChartLegend = RechartsLegend;

interface TooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

/**
 * What a series has no value for at this point: a gap in a history, a projection that
 * has not happened yet, a field that did not exist at an earlier capture.
 *
 * An em dash rather than an empty cell, so the row still lines up with its siblings and
 * the reader can see that the series WAS asked and had nothing, rather than wondering
 * whether it was dropped. It is a mark, not a word, so there is nothing here to
 * translate and no label prop to resolve; a caller who wants words passes
 * `formatValue`, which is handed the `undefined` and decides.
 */
const NO_VALUE = "—";

/**
 * The number this payload item carries, or `undefined` when it carries none.
 *
 * This was `item.value ?? 0`, so every one of the absences above printed a confident
 * "0" that appears nowhere in the data — a fabricated figure in a tooltip, which is the
 * one place a reader goes to check an exact number. keksdose found it and wrapped the
 * component rather than trust it. `""` and a non-numeric string are the same absence
 * spelled differently (recharts hands a string value straight through from the data),
 * and are answered the same way.
 */
function tooltipValue(value: number | string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : undefined;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  indicator?: "dot" | "line";
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => ReactNode;
  /** Formats one series' value for display. NOT called when the series has no value at
   *  this point — {@link ChartTooltipContentProps.formatValue} is the one that is. */
  valueFormatter?: (value: number) => ReactNode;
  /** Formats one series' value INCLUDING its absence: handed `undefined` for a gap, a
   *  projection that has not happened yet, or a field that did not exist at an earlier
   *  capture, and whatever it returns is rendered as-is. Only the caller knows whether
   *  that absence reads as a dash, a "not yet" or a genuine zero, so this is how it
   *  says. Supplying it wins over `valueFormatter` for every value.
   *
   *  It sits NEXT to `valueFormatter` rather than widening it because that prop's
   *  parameter is contextually typed at every call site there is — `(v) => money(v)` —
   *  so widening it to `number | undefined` is a compile error in all three consuming
   *  apps, which is a breaking change this module does not get to make by itself. */
  formatValue?: (value: number | undefined) => ReactNode;
  /** Cursor position within the chart, injected by recharts. Used with
   *  {@link boundaryRef} to decide whether to flip the tooltip. */
  coordinate?: { x?: number; y?: number };
  /** When set, the tooltip flips to the LEFT of the cursor if it would otherwise
   *  spill past the right edge of this (usually horizontally-scrolling) container
   *  — e.g. a wide chart whose rightmost bars sat off-screen (feedback #77). */
  boundaryRef?: RefObject<HTMLElement | null>;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "dot",
  hideLabel = false,
  labelFormatter,
  valueFormatter,
  formatValue,
  coordinate,
  boundaryRef,
}: ChartTooltipContentProps) {
  const config = useChart();
  const tipRef = useRef<HTMLDivElement>(null);
  if (!active || !payload?.length) return null;
  // Recharts anchors the tooltip at coordinate.x inside the full (scrolled) chart
  // width; subtract the container's scrollLeft to get its on-screen x, then flip
  // left if the tooltip's own width would run past the visible right edge.
  let flip = false;
  const boundary = boundaryRef?.current;
  if (boundary && coordinate?.x != null) {
    const visibleX = coordinate.x - boundary.scrollLeft;
    const tipWidth = tipRef.current?.offsetWidth ?? 160;
    flip = visibleX + tipWidth + 12 > boundary.clientWidth;
  }
  return (
    <div
      ref={tipRef}
      style={boundaryRef ? { transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" } : undefined}
      className="min-w-[9rem] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-2 text-xs shadow-xl"
    >
      {!hideLabel && label != null && (
        <div className="mb-1.5 font-medium text-[var(--text-primary)]">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, i) => {
          // Bars/lines/areas identify a series by dataKey; pies/treemaps key off
          // `name` (the nameKey value). Prefer whichever the config knows.
          const dk = item.dataKey != null ? String(item.dataKey) : undefined;
          const nm = item.name != null ? String(item.name) : undefined;
          const cfgKey = dk && config[dk] ? dk : nm && config[nm] ? nm : (dk ?? nm ?? String(i));
          const series = config[cfgKey];
          const fill = typeof item.payload?.fill === "string" ? item.payload.fill : undefined;
          // The data point's own `fill` before recharts' `item.color`: a treemap tile,
          // or a bar with a per-cell colour, IS the colour the reader is pointing at,
          // while `item.color` is the series-wide one — every tile's swatch came out
          // `--chart-1` whatever colour the tile was.
          const color = series?.color ?? fill ?? item.color ?? "#64748b";
          const name = series?.label ?? nm ?? cfgKey;
          const raw = tooltipValue(item.value);
          let shown: ReactNode;
          if (formatValue) shown = formatValue(raw);
          else if (raw == null) shown = NO_VALUE;
          else shown = valueFormatter ? valueFormatter(raw) : raw;
          return (
            <div key={`${cfgKey}-${i}`} className="flex items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-[2px]",
                  indicator === "dot" ? "h-2.5 w-2.5 rounded-full" : "h-2.5 w-1",
                )}
                style={{ backgroundColor: color }}
              />
              <span className="text-[var(--text-muted)]">{name}</span>
              <span data-private className="ml-auto font-mono font-medium tabular-nums text-[var(--text-primary)]">
                {shown}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LegendPayloadItem {
  value?: string;
  dataKey?: string | number;
  color?: string;
}

interface ChartLegendContentProps {
  payload?: LegendPayloadItem[];
  onItemClick?: (key: string) => void;
  /**
   * TOGGLE mode (recommended): the series currently switched off. Each entry is a
   * toggle button — pressed while its series is shown — and a hidden one is drawn
   * faded with its label struck through. Several can be off at once; pair with
   * `toggleHidden(hidden, key)` in `onItemClick` and `hide` on the chart's series.
   */
  hiddenKeys?: ReadonlySet<string> | readonly string[];
  /**
   * ISOLATE mode: the one series shown in full, every other entry dimmed. Kept for
   * the charts built on it; a legend where each entry switches its own series is
   * what readers expect from a legend, so prefer `hiddenKeys`.
   */
  activeKey?: string | null;
}

export function ChartLegendContent({
  payload,
  onItemClick,
  hiddenKeys,
  activeKey,
}: ChartLegendContentProps) {
  const hidden = hiddenKeys ? new Set(hiddenKeys) : null;
  const config = useChart();
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3">
      {payload.map((item, i) => {
        const dk = item.dataKey != null ? String(item.dataKey) : undefined;
        const vv = item.value != null ? String(item.value) : undefined;
        const cfgKey = dk && config[dk] ? dk : vv && config[vv] ? vv : (dk ?? vv ?? String(i));
        const series = config[cfgKey];
        const color = series?.color ?? item.color ?? "#64748b";
        const label = series?.label ?? vv ?? cfgKey;
        const off = hidden?.has(cfgKey) ?? false;
        const dimmed = off || (activeKey != null && activeKey !== cfgKey);
        const className = cn(
          "flex items-center gap-1.5 text-[var(--text-secondary)] transition-opacity",
          onItemClick ? "cursor-pointer hover:opacity-80" : "cursor-default",
          dimmed && "opacity-40",
        );
        const swatch = (
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: color } as CSSProperties}
          />
        );
        // A legend with no `onItemClick` is a KEY, not a control — and that is every
        // legend in kastlan, where this rendered N focusable buttons per chart that did
        // nothing when activated. A keyboard user paid the tab stops for all of them,
        // and a screen reader announced each one as a button, promising an action there
        // was none of. The interactive branch is unchanged.
        return onItemClick ? (
          <button
            key={`${cfgKey}-${i}`}
            type="button"
            onClick={() => onItemClick(cfgKey)}
            // Toggles report their state: in toggle mode pressed = the series is shown;
            // in isolate mode pressed = the isolated one. With neither supplied the
            // legend knows nothing about state, and a pressed="false" it cannot vouch
            // for would lie — so it says nothing.
            aria-pressed={
              hidden ? !off : activeKey === undefined ? undefined : activeKey === cfgKey
            }
            className={className}
          >
            {swatch}
            <span className={cn(off && "line-through")}>{label}</span>
          </button>
        ) : (
          <span key={`${cfgKey}-${i}`} className={className}>
            {swatch}
            {label}
          </span>
        );
      })}
    </div>
  );
}
