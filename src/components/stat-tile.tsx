import { isValidElement, useId, useLayoutEffect, useState } from "react";
import type { ComponentPropsWithoutRef, CSSProperties, ReactElement, ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { Card, FieldHint } from "./ui";
import { Sparkline } from "./sparkline";
import { Tooltip } from "./tooltip";
// The kit's one placeholder look, so a loading tile and the Skeleton list beside it
// shimmer as one surface — and both stop under `prefers-reduced-motion`, which this
// tile's private copy of the string did not.
import { SKELETON_CLASS } from "./skeleton";

/**
 * The words a stat tile speaks. The delta's arrow is an icon, and an icon is not a
 * sentence: a screen reader gets the direction (and, under `goodDirection`, the
 * verdict) as words, and a sighted reader who cannot tell the two delta colours apart
 * still has the arrow — neither judgement rides on colour alone.
 */
export interface StatTileLabels {
  /** The delta, rising. `amount` is already formatted and unsigned. */
  increase: (amount: string) => string;
  decrease: (amount: string) => string;
  unchanged: string;
  /** Wraps the direction sentence when `goodDirection` says the change is good. */
  better: (change: string) => string;
  worse: (change: string) => string;
  /** Spoken in place of a missing value (the tile shows a dash). */
  noValue: string;
  /** Spoken while `loading`. */
  loading: string;
}

export const DEFAULT_STAT_TILE_LABELS: StatTileLabels = {
  increase: (amount) => `Up ${amount}`,
  decrease: (amount) => `Down ${amount}`,
  unchanged: "No change",
  better: (change) => `${change} (better)`,
  worse: (change) => `${change} (worse)`,
  noValue: "No data",
  loading: "Loading…",
};

/**
 * What colours a figure. Token-backed like everything else in the kit.
 *
 *  - `income` / `expense` / `net` — the money trio (teal / amber / violet, CVD-safe).
 *  - `signed` — a money figure read by its own sign: above zero `income`, below zero
 *    `expense`, exactly zero neutral (a zero balance is neither news). Needs a NUMBER
 *    value; a pre-formatted string cannot be read and stays neutral.
 *  - `success` / `warning` / `danger` / `info` — a threshold verdict ("phase margin
 *    below 30°"). Say it in the hint or description as well; colour alone is not one.
 */
export type StatTileTone =
  | "neutral"
  | "brand"
  | "income"
  | "expense"
  | "net"
  | "signed"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONE_CLASS: Record<Exclude<StatTileTone, "signed">, string> = {
  neutral: "text-[var(--text-primary)]",
  brand: "text-[var(--brand)]",
  income: "text-[var(--money-income)]",
  expense: "text-[var(--money-expense)]",
  net: "text-[var(--money-net)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  info: "text-[var(--info)]",
};

function toneClass(tone: StatTileTone, value: unknown): string {
  if (tone !== "signed") return TONE_CLASS[tone];
  if (typeof value !== "number" || value === 0) return TONE_CLASS.neutral;
  return value < 0 ? TONE_CLASS.expense : TONE_CLASS.income;
}

/** A change since the previous period. A bare number is shorthand for `{ value }`. */
export interface StatTileDelta {
  /** Signed: above zero is "up". */
  value: number;
  /** `"value"` (default) formats it like the headline — same currency, same
   *  notation. `"percent"` reads it as a RATIO: `0.12` is shown as 12 %. */
  unit?: "value" | "percent";
  /** What it is measured against, shown after it: "vs last month". */
  label?: ReactNode;
}

/** A smaller figure under the headline — a prior period, a projection, a split. */
export interface StatTileSubValue {
  label: ReactNode;
  /** A number is formatted like the headline; anything else is rendered as given. */
  value: ReactNode;
  /** Defaults to the tile's own `tone`, read per figure (so a `signed` tile shows a
   *  teal September above an amber August). Sub-values are always the muted weight
   *  of their tone: they are history, and must not outshout the figure above them.
   *
   *  `"none"` leaves the figure untinted — the row's own muted text, like its label —
   *  even on a toned tile: keksdose's report KpiCard (reports/charts/kpi-card.tsx),
   *  whose `negative` convention tints only a figure below zero and leaves the rest
   *  plain. (`"neutral"` is not that: it is the headline's full text colour, at the
   *  sub-value's 75 %.) */
  tone?: StatTileTone | "none";
}

/** What {@link StatTileProps.renderLink} is handed. Spread it onto your router's
 *  link: the class is what stretches the link over the whole tile. */
export interface StatTileLinkProps {
  href: string;
  className: string;
  "aria-describedby": string;
  children: ReactNode;
}

export interface StatTileProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "onClick"> {
  /** What is measured. Also the tile's accessible name when it is a link/button. */
  label: ReactNode;
  /**
   * The headline. A number is formatted with `Intl.NumberFormat` in the kit's locale
   * (see `currency`, `compact`, `numberFormat`, `format`); a string or element is
   * rendered as given. `null`/`undefined` shows a dash and says "No data".
   */
  value?: ReactNode;
  /** ISO 4217 code — formats a number value (and a `"value"` delta, and numeric
   *  sub-values) as money. */
  currency?: string;
  /** Compact notation: 12 400 → "12K". */
  compact?: boolean;
  /** Any further `Intl.NumberFormat` options, merged over the two above. */
  numberFormat?: Intl.NumberFormatOptions;
  /** Formats every NUMBER the tile shows, replacing the `Intl` default outright. */
  format?: (value: number) => string;
  locale?: string;
  /** A short unit after the value that `Intl` has no name for: "ms", "dB", "Hz". */
  unit?: ReactNode;
  /** The period the headline belongs to, shown to its left ("SEP"). */
  valueLabel?: ReactNode;
  tone?: StatTileTone;
  delta?: number | StatTileDelta;
  /** Which way is good news. Unset, the delta is stated and not judged (users up and
   *  cost up are the same arrow); set, it is coloured and its sentence says so. */
  goodDirection?: "up" | "down";
  /** The explanation behind a "?" beside the label (a {@link FieldHint}) — hidden
   *  until asked for, so it is for what a reader MIGHT want to know ("excludes
   *  transfers between your own accounts"). For a line everyone should read, use
   *  {@link StatTileProps.description} instead. */
  hint?: string;
  /**
   * Keep the label to ONE line, cut with an ellipsis, and show the whole of it in a
   * {@link Tooltip} on hover and focus — but only while it is actually cut, so a
   * label that fits shows no bubble repeating itself. keksdose's admin MetricTile
   * wall: twenty tiles whose German labels ("Aktive Abonnements (30 Tage)") wrapped
   * onto two or three lines and pushed each tile's figure to a different height.
   *
   * The label element keeps the FULL text — the ellipsis is paint — so it is still
   * the tile's accessible name (and the stretched link's, on a link tile) exactly as
   * without this. Off by default: a wrapping label is what every existing tile does,
   * and a tile standing alone has room to.
   *
   * This is the tooltip: pass the label as a plain STRING rather than wrapping it in
   * your own `<Tooltip>` for the full text (keksdose's admin metrics-panel.tsx:134
   * does, from before this prop). A wrapped label shows a bubble even when nothing is
   * cut, and nests its trigger inside this one's.
   */
  truncateLabel?: boolean;
  /**
   * The tile's name as plain text, for the places that need a string rather than a
   * node — today the {@link StatTileProps.trend} sparkline's accessible name. Only
   * needed when `label` is not a string AND its text cannot be read from it: a label
   * element's text children are found on their own (a `<Tooltip label="…">Spend
   * </Tooltip>` label still names its sparkline "Spend"), an icon or a formatted
   * message component's are not.
   */
  name?: string;
  /** A visible line under the value: "Last 12 months", "3 estates / 9 buildings" —
   *  always shown, so it is for what every reader needs. An explanation only some
   *  will want belongs in {@link StatTileProps.hint}, the "?" beside the label. */
  description?: ReactNode;
  /**
   * One figure that belongs WITH the headline rather than under it: keksdose's
   * "Projected €1,850" under a to-date "€420" (KpiCard, feedback #51), which it
   * currently smuggles into `description` with hand-set margins so the prior-month
   * sub-values do not come between the two. It is drawn directly under the value
   * (before the delta, the description and the sparkline) as a sub-value row, with
   * only a hair of space above it.
   *
   * A slot of its own rather than a placement switch for `subValues`: the history
   * rows (last month, last year) should stay at the bottom where they are, and moving
   * the whole list up to bring one row with it would put them between the headline
   * and its delta. Same shape as a sub-value, so the `tone` rules are the same.
   * Withheld while `loading`, like the sub-values.
   */
  projection?: StatTileSubValue;
  subValues?: StatTileSubValue[];
  /** Shorthand for a fluid {@link Sparkline} named after the tile and speaking in
   *  the tile's number format. The name is the label's text; see
   *  {@link StatTileProps.name} for a label that has none. */
  trend?: ReadonlyArray<number | null | undefined>;
  /** A custom sparkline (or any small graphic) in the same place. Wins over `trend`. */
  sparkline?: ReactNode;
  /** A decorative icon at the top end of the tile. */
  icon?: ReactNode;
  /** Anything below the rest — a progress bar, a link row. */
  footer?: ReactNode;
  /** Tag every figure `data-private`, so the host's demo-mode rule blurs it — the
   *  same attribute `Tooltip redact` and the chart tooltip's value cell carry. */
  sensitive?: boolean;
  /** Skeleton in place of the value; delta, sub-values and trend are withheld. */
  loading?: boolean;
  /** `"sm"` for dense grids (a metrics wall); `"md"` the default KPI. */
  size?: "sm" | "md";
  /** Makes the tile a link. See {@link renderLink} for a router. */
  href?: string;
  /** Renders the link for `href` — pass your router's `<Link>` here, since a plain
   *  `<a>` reloads a single-page app. Default: `<a>`. */
  renderLink?: (props: StatTileLinkProps) => ReactElement;
  /** Makes the tile a button (ignored when `href` is given). */
  onClick?: () => void;
  labels?: Partial<StatTileLabels>;
}

// One formatter per option set: a metrics wall is twenty of these.
const formatters = new Map<string, Intl.NumberFormat>();
function numberFormatter(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options);
    formatters.set(key, f);
  }
  return f;
}

// The headline sizes are keyed on the TILE's width (it is a @container), not the
// viewport: a grid beside a sidebar makes tiles narrowest exactly where a viewport
// breakpoint would hand them the larger font. `sm` is keksdose's compact headline,
// sized so a worst-case "CHF 123,456.78" still fits a 320px phone's 2-up tiles.
const VALUE_TEXT = {
  md: "text-xl @[13rem]:text-2xl",
  sm: "text-xs @[8.5rem]:text-sm @[13rem]:text-base",
} as const;
const PADDING = { md: "p-3 sm:p-4", sm: "px-2.5 py-2" } as const;

/**
 * The KPI card: a label, one number, and optionally how it moved, what it is made of
 * and which way it has been going.
 *
 * Replaces keksdose's `KpiCard` and admin `Tile`, lenkbank's metrics tiles and
 * kastlan's `KpiCard` — the same card four times, with four answers to the same
 * questions (how a currency is formatted, whether a delta is judged, what happens to
 * the figures in demo mode).
 *
 * Interactive tiles use a STRETCHED link: the label is the `<a>`/`<button>`, and its
 * `::after` covers the card. Making the card itself the link would nest the hint's
 * `<button>` inside it, which is invalid HTML and an unreachable control; this way
 * the hint sits above the overlay and stays its own tab stop. The link's name is the
 * label, and it is described by the value and the delta.
 */
export function StatTile({
  label,
  value,
  currency,
  compact = false,
  numberFormat,
  format,
  locale,
  unit,
  valueLabel,
  tone = "neutral",
  delta,
  goodDirection,
  hint,
  truncateLabel = false,
  name,
  description,
  projection,
  subValues,
  trend,
  sparkline,
  icon,
  footer,
  sensitive = false,
  loading = false,
  size = "md",
  href,
  renderLink,
  onClick,
  labels,
  className,
  ...rest
}: StatTileProps) {
  const text = useKitLabels("statTile", DEFAULT_STAT_TILE_LABELS, labels);
  const [labelEl, setLabelEl] = useState<HTMLElement | null>(null);
  const labelCut = useIsTruncated(truncateLabel ? labelEl : null);
  const kitLocale = useKitLocale(locale);
  const id = useId();
  const valueId = `${id}-value`;
  const deltaId = `${id}-delta`;
  const priv = sensitive ? "" : undefined;

  const fmt =
    format ??
    ((n: number) =>
      numberFormatter(kitLocale, {
        ...(currency ? { style: "currency", currency } : null),
        ...(compact ? { notation: "compact" } : null),
        ...numberFormat,
      }).format(n));
  const show = (v: ReactNode) => (typeof v === "number" ? fmt(v) : v);

  const d = typeof delta === "number" ? { value: delta } : delta;
  const hasValue = value !== null && value !== undefined && value !== "";
  const labelText = name ?? plainText(label);

  // ── The label, which is also the link/button when the tile is interactive ──
  const stretched = cn(
    "text-start uppercase tracking-wide",
    "after:absolute after:inset-0 after:rounded-lg after:content-['']",
    "focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--brand)]",
  );
  const describedBy = d ? `${valueId} ${deltaId}` : valueId;
  let labelNode: ReactNode = label;
  if (href !== undefined) {
    const linkProps: StatTileLinkProps = {
      href,
      className: stretched,
      "aria-describedby": describedBy,
      children: label,
    };
    labelNode = renderLink ? (
      renderLink(linkProps)
    ) : (
      <a href={href} className={stretched} aria-describedby={describedBy}>
        {label}
      </a>
    );
  } else if (onClick) {
    labelNode = (
      <button type="button" onClick={onClick} aria-describedby={describedBy} className={stretched}>
        {label}
      </button>
    );
  }
  const interactive = href !== undefined || onClick !== undefined;

  // ── Delta ──
  let deltaNode: ReactNode = null;
  if (d && !loading && Number.isFinite(d.value)) {
    const magnitude = Math.abs(d.value);
    const amount =
      d.unit === "percent"
        ? numberFormatter(kitLocale, { style: "percent", maximumFractionDigits: 1 }).format(magnitude)
        : fmt(magnitude);
    const dir = d.value > 0 ? "up" : d.value < 0 ? "down" : "flat";
    const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
    let spoken = dir === "up" ? text.increase(amount) : dir === "down" ? text.decrease(amount) : text.unchanged;
    let deltaTone = "text-[var(--text-muted)]";
    if (goodDirection && dir !== "flat") {
      const good = dir === goodDirection;
      spoken = good ? text.better(spoken) : text.worse(spoken);
      deltaTone = good ? "text-[var(--success)]" : "text-[var(--danger)]";
    }
    deltaNode = (
      // `relative`: the containing block for the sr-only sentence (see the
      // sr-only-containment test for what an escaped one does to the page).
      <div className="relative mt-1 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums">
        <span id={deltaId} data-private={priv} className={cn("inline-flex items-center gap-0.5 font-medium", deltaTone)}>
          <Icon className="size-3 shrink-0" aria-hidden />
          <span aria-hidden>{dir === "flat" ? null : amount}</span>
          <span className="sr-only">{spoken}</span>
        </span>
        {d.label != null && <span className="text-[var(--text-muted)]">{d.label}</span>}
      </div>
    );
  }

  // ── Headline ──
  const valueClass = cn(
    "whitespace-nowrap font-semibold tabular-nums",
    VALUE_TEXT[size],
    toneClass(tone, value),
  );
  const headline = loading ? (
    <span id={valueId} className="relative block py-0.5">
      <span aria-hidden className={cn(SKELETON_CLASS, "block h-6 w-24 max-w-full")} />
      <span className="sr-only">{text.loading}</span>
    </span>
  ) : hasValue ? (
    <span id={valueId} data-private={priv} className={cn(valueClass, valueLabel != null && "ms-auto")}>
      {show(value)}
      {unit != null && (
        <span className="ms-1 text-[0.7em] font-medium text-[var(--text-muted)]">{unit}</span>
      )}
    </span>
  ) : (
    <span id={valueId} className={cn("relative", valueClass, "text-[var(--text-muted)]")}>
      <span aria-hidden>—</span>
      <span className="sr-only">{text.noValue}</span>
    </span>
  );

  const graphic =
    loading ? null : sparkline ??
      (trend && (
        <Sparkline
          data={trend}
          fluid
          height={size === "sm" ? 20 : 28}
          label={labelText}
          formatValue={fmt}
          locale={kitLocale}
          tone={tone === "signed" ? "signed" : tone === "neutral" ? "chart" : tone}
          data-private={priv}
        />
      ));

  return (
    <Card
      {...rest}
      aria-busy={loading || undefined}
      className={cn(
        // @container: the headline sizes read the tile's width. relative: the stretched
        // link's overlay. overflow-hidden: at pathological widths a figure clips inside
        // the border instead of painting over the neighbouring tile.
        "@container relative flex min-w-0 flex-col overflow-hidden",
        PADDING[size],
        interactive && "transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 break-words text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {truncateLabel && labelCut ? (
            // Portalled: the tile is `overflow-hidden`, and a bubble inside it would be
            // clipped by the very box whose edge cut the label.
            <Tooltip label={label} side="top" portal className="flex min-w-0">
              <span ref={setLabelEl} className="block min-w-0 truncate">
                {labelNode}
              </span>
            </Tooltip>
          ) : (
            <span ref={setLabelEl} className={cn("min-w-0", truncateLabel && "block truncate")}>
              {labelNode}
            </span>
          )}
          {/* Above the stretched link's overlay, so it stays hoverable and focusable. */}
          {hint && <FieldHint label={hint} side="top" className="relative z-10 shrink-0" />}
        </div>
        {icon != null && (
          <span aria-hidden className="shrink-0 text-[var(--text-muted)] [&_svg]:size-4">
            {icon}
          </span>
        )}
      </div>

      {valueLabel != null ? (
        // Period-left / value-right, matching the sub-rows below it. flex-wrap lets a
        // too-long amount drop to its own end-aligned line instead of overflowing.
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="shrink-0 text-xs uppercase tracking-wide text-[var(--text-muted)]">{valueLabel}</span>
          {headline}
        </div>
      ) : (
        <div className="mt-1">{headline}</div>
      )}

      {!loading && projection && (
        <dl className="mt-0.5">
          <FigureRow figure={projection} tileTone={tone} show={show} priv={priv} />
        </dl>
      )}

      {deltaNode}
      {description != null && <div className="mt-1 text-xs text-[var(--text-muted)]">{description}</div>}
      {graphic && <div className="mt-2">{graphic}</div>}

      {!loading && subValues && subValues.length > 0 && (
        <dl className="mt-1.5 space-y-0.5">
          {subValues.map((sv, i) => (
            <FigureRow key={i} figure={sv} tileTone={tone} show={show} priv={priv} />
          ))}
        </dl>
      )}

      {footer != null && <div className="mt-2">{footer}</div>}
    </Card>
  );
}

/** One label/value row of a `<dl>`: a sub-value, or the projection. */
function FigureRow({
  figure,
  tileTone,
  show,
  priv,
}: {
  figure: StatTileSubValue;
  tileTone: StatTileTone;
  show: (v: ReactNode) => ReactNode;
  priv: "" | undefined;
}) {
  const own = figure.tone ?? (tileTone === "neutral" ? undefined : tileTone);
  const svTone = own === "none" ? undefined : own;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-xs tabular-nums text-[var(--text-muted)]">
      <dt className="uppercase tracking-wide">{figure.label}</dt>
      <dd
        data-private={priv}
        className={cn("ms-auto whitespace-nowrap", svTone && [toneClass(svTone, figure.value), "opacity-75"])}
      >
        {show(figure.value)}
      </dd>
    </div>
  );
}

/**
 * The text of a label node, for the sparkline's name: a string or number as is, an
 * element by its children, recursively. A `<Tooltip label="…">Spend</Tooltip>` label
 * yields "Spend" — the text the reader sees, not the bubble's. `undefined` when there
 * is no text to find (an icon), so the sparkline falls back to its unnamed summary.
 */
function plainText(node: ReactNode): string | undefined {
  const walk = (n: ReactNode): string => {
    if (typeof n === "string" || typeof n === "number") return String(n);
    if (Array.isArray(n)) return n.map(walk).join("");
    if (isValidElement<{ children?: ReactNode }>(n)) return walk(n.props.children);
    return "";
  };
  const text = walk(node).replace(/\s+/g, " ").trim();
  return text === "" ? undefined : text;
}

/**
 * Whether `el`'s text is wider than its box — i.e. whether `truncate` is cutting it.
 * Re-measured whenever the box resizes (a grid reflowing, a translation loading), not
 * only on mount. Keyed on the ELEMENT (a callback ref), because wrapping the label in
 * its tooltip remounts it, and an observer on the old node would watch nothing.
 */
function useIsTruncated(el: HTMLElement | null): boolean {
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    // No reset while there is no node: between the unwrapped label unmounting and the
    // wrapped one mounting there is none, and a reset there would unwrap it again.
    if (!el) return;
    const measure = () => setCut(el.scrollWidth > el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return cut;
}

export interface StatTileGridProps extends ComponentPropsWithoutRef<"div"> {
  /** The narrowest a tile may get before the grid drops a column. The default fits
   *  two tiles on a 320px phone. */
  minTileWidth?: string;
}

/**
 * The row of tiles every dashboard in the three apps lays out by hand, each with its
 * own breakpoint ladder (`grid-cols-2 md:grid-cols-4 min-[2400px]:grid-cols-8` …).
 * Those ladders read the VIEWPORT and so ignored the sidebar: 6-up tiles at 155px in
 * the band where the sidebar was open. This fits as many columns as `minTileWidth`
 * allows in the space the grid actually has, and needs no breakpoint at all.
 */
export function StatTileGrid({ minTileWidth = "9rem", className, style, ...rest }: StatTileGridProps) {
  const columns: CSSProperties = {
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minTileWidth}), 1fr))`,
  };
  return <div {...rest} className={cn("grid gap-3", className)} style={{ ...columns, ...style }} />;
}
