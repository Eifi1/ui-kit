// shadcn/ui chart kit — vendored (MIT) and adapted for this app:
//  - Recharts 3 instead of 2
//  - the original keys its styling off shadcn theme tokens (--muted-foreground,
//    --border, bg-background …). This app has no shadcn token layer, so those
//    are mapped to the existing slate palette + class-based `dark:` variants.
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
  const chartId = `chart-${(id ?? uid).replace(/:/g, "")}`;
  return (
    <ChartContext.Provider value={config}>
      <div
        data-chart={chartId}
        className={cn(
          // touch-pan-y lets a vertical finger drag still scroll the page while
          // a horizontal drag is handed to recharts for tooltip scrubbing,
          // instead of the page scrolling underneath the gesture (feedback #292).
          "flex w-full touch-pan-y justify-center text-xs",
          // muted axis labels + gridlines, light and dark
          "[&_.recharts-cartesian-axis-tick_text]:fill-slate-500 dark:[&_.recharts-cartesian-axis-tick_text]:fill-slate-400",
          "[&_.recharts-cartesian-grid_line]:stroke-slate-200/70 dark:[&_.recharts-cartesian-grid_line]:stroke-slate-700/60",
          // hairline hover cursor instead of the heavy default
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-300 dark:[&_.recharts-curve.recharts-tooltip-cursor]:stroke-slate-600",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-slate-100 dark:[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-slate-800",
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

// Inject each series colour as a `--color-<key>` custom property scoped to this
// chart, so chart JSX can refer to `var(--color-total)` and the legend/tooltip
// stay in sync from one source of truth.
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, c]) => c.color);
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

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  indicator?: "dot" | "line";
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => ReactNode;
  valueFormatter?: (value: number) => string;
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
      className="min-w-[9rem] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      {!hideLabel && label != null && (
        <div className="mb-1.5 font-medium text-slate-900 dark:text-slate-100">
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
          const color = series?.color ?? item.color ?? fill ?? "#64748b";
          const name = series?.label ?? nm ?? cfgKey;
          const raw = typeof item.value === "string" ? Number(item.value) : (item.value ?? 0);
          return (
            <div key={`${cfgKey}-${i}`} className="flex items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-[2px]",
                  indicator === "dot" ? "h-2.5 w-2.5 rounded-full" : "h-2.5 w-1",
                )}
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-500 dark:text-slate-400">{name}</span>
              <span data-private className="ml-auto font-mono font-medium tabular-nums text-slate-900 dark:text-slate-100">
                {valueFormatter ? valueFormatter(raw) : raw}
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
  activeKey?: string | null;
}

export function ChartLegendContent({ payload, onItemClick, activeKey }: ChartLegendContentProps) {
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
        const dimmed = activeKey != null && activeKey !== cfgKey;
        return (
          <button
            key={`${cfgKey}-${i}`}
            type="button"
            onClick={onItemClick ? () => onItemClick(cfgKey) : undefined}
            className={cn(
              "flex items-center gap-1.5 text-slate-600 transition-opacity dark:text-slate-300",
              onItemClick && "cursor-pointer hover:opacity-80",
              !onItemClick && "cursor-default",
              dimmed && "opacity-40",
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: color } as CSSProperties}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
