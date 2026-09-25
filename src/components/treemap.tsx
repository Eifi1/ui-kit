// A tile chart ("treemap"): one rectangle per node, its AREA the node's share of what
// is drawn. Lifted out of keksdose's reports, where five cards drew it (spending by
// group and by category, net worth by account and by type, allocation, payees, food
// groups) — every domain word is gone and every string it could print is a prop.
//
// It uses the kit's own chart shell (`ChartContainer`, `ChartTooltipContent`) and the
// kit's own ink rule (`textOn`), so it re-skins with the palette like every other
// chart. The one thing it cannot take from a CSS var is the tile colour: the label ink
// is MEASURED against the fill, and a `var(--chart-3)` string measures as nothing — see
// `useChartTokenHex` below for how the concrete hex is found instead.
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentProps, ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from "react";
import { Treemap as RechartsTreemap } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";
import { PALETTE_HEX, textOn } from "../theme/chart-palette";
import { parseHex } from "../theme/color";
import { dirOf, type Direction } from "../lib/direction";

/**
 * One tile.
 *
 * `value`, not keksdose's `total`: a treemap's areas are not always money (keksdose
 * already sizes one by transaction COUNT), and `value` is the word every other chart
 * in recharts uses for the number a mark is sized by. Migrating is a rename at the
 * mapping step — `{ id, name, value: row.total }`.
 */
export interface TreemapNode {
  /** Stable key, handed back by {@link TreemapProps.onNodeClick} and
   *  {@link TreemapProps.nodeNote}. Names can collide; ids must not. */
  id: string;
  name: string;
  /** The tile's area. A node whose value is not a positive finite number is NOT
   *  drawn — an area cannot be negative, and recharts lays a negative size out as
   *  nonsense rather than refusing it. Saying so is the caller's job: a group that
   *  vanishes silently between two views of the same data is a bug report. */
  value: number;
  /** Overrides the by-index palette colour for this tile — e.g. to paint every child
   *  in its parent group's colour, so the groups stay legible in one picture. A
   *  concrete `#rrggbb` keeps the label ink measured; anything else (a CSS var) gets
   *  `currentColor` ink, because there is nothing to measure — set `labelColor` then. */
  fill?: string;
  /** The label's ink, for a `fill` the kit cannot measure (a `var()` or `color-mix()`):
   *  keksdose's recency plot fills with `color-mix(in srgb, var(--chart-1) N%,
   *  transparent)`, where `currentColor` put dark page text on full-strength indigo
   *  (~1.5:1). Wins over the measured ink when given. */
  labelColor?: string;
}

/**
 * Everything a `<div>` takes reaches the chart's root (`ChartContainer`), so a test id
 * or a `data-tour` anchor can find it. `children` is the chart's own.
 */
export interface TreemapProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  data: TreemapNode[];
  /**
   * Formats a node's value in the tooltip. Handed the node's SHARE of what is drawn
   * (0–1) as a second argument, because a tile is read for how big it is relative to
   * the rest, and "€412.30" alone makes the reader estimate that ratio off the areas.
   * The share is `undefined` when the drawn total is not positive.
   *
   * Default: the bare number through `Intl.NumberFormat` in the runtime's locale. A
   * host that has a currency or a locale passes this — the kit knows neither.
   */
  valueFormatter?: (value: number, share: number | undefined) => ReactNode;
  /** Chart height in px. Default 320. */
  height?: number;
  /** A tile was activated — by click, or by Enter/Space on a focused tile. Setting
   *  this makes every tile a focusable `role="button"` named by its node name. */
  onNodeClick?: (id: string, name: string) => void;
  /**
   * The node names are the user's own data (payees, not categories): the tile labels
   * and the whole tooltip bubble get `data-private`, the same attribute the kit's
   * `Tooltip redact` and `ChartTooltipContent`'s value cell carry, so the host's one
   * privacy rule reaches them. Off by default — a category name is a label of the app.
   */
  redactNames?: boolean;
  /**
   * A second, smaller line under a tile's label — one extra figure per node that the
   * name cannot carry (a year-on-year `+12%`, `new`). Return `undefined` for a node
   * with nothing to add. Never tagged `data-private`: a ratio reveals no amount.
   *
   * ON THE TILE rather than in the tooltip, for two reasons. The tooltip identifies a
   * node by name or by raw value, so a per-node note would be keyed on an amount (two
   * nodes of equal size would swap notes). And a tooltip is a pointer affordance: a
   * phone never hovers, so a figure that only exists on hover does not exist there.
   */
  nodeNote?: (id: string) => string | undefined;
  /**
   * Draw at most this many tiles (the first N drawable nodes, in the order given —
   * sort first). Unbounded by default. A tile under ~44x20px has no room for a label,
   * and a map made of unlabelled rectangles answers nothing; around 24 is where the
   * smallest tile of a skewed series reaches that floor on a phone-width card. The
   * caller owns the "N more not shown" line, since it knows how many it passed.
   */
  maxTiles?: number;
  /**
   * The categorical ramp tiles take by index, as concrete hex. Default: the page's
   * live `--chart-1…9` tokens (see `useChartTokenHex`). Pass one when the host
   * already holds the active palette — e.g. `createPaletteStore`'s `useChartHex()` —
   * so a caller colouring a legend beside the map is guaranteed the same list.
   */
  colors?: readonly string[];
}

// ── The categorical ramp, as concrete hex ──────────────────────────────────
//
// The label ink is measured against the tile's fill, so the fill has to be a colour
// and not a reference to one. keksdose read it from its palette STORE, which is an
// app object the kit cannot import. What the kit does own is the token layer: whether
// a palette arrives through `applyTokenSet` (inline properties on <html>) or through
// tokens.css (`:root` / `.dark`), the resolved `--chart-N` on <html> is the colour
// every other chart on the page is being painted with. So that is what is read, and
// re-read whenever <html>'s class or style changes — which is exactly when a theme
// toggle or a palette switch lands.

const CHART_TOKENS = 9;

/** The resolved ramp, joined into ONE string so `useSyncExternalStore` compares a
 *  primitive: a fresh array per read would never be `Object.is`-equal to the last and
 *  would re-render forever. */
function readChartTokens(): string {
  const root = document.documentElement;
  const fallback = root.classList.contains("dark") ? PALETTE_HEX.dark : PALETTE_HEX.light;
  const style = getComputedStyle(root);
  return Array.from({ length: CHART_TOKENS }, (_, i) => {
    const v = style.getPropertyValue(`--chart-${i + 1}`).trim();
    // An unresolved token (a host that never loaded tokens.css, a test DOM) falls
    // back to the built-in ramp for the current theme rather than to no colour.
    return parseHex(v) ? v : fallback[i];
  }).join(",");
}

function subscribeChartTokens(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  return () => observer.disconnect();
}

const SERVER_TOKENS = PALETTE_HEX.light.join(",");

function useChartTokenHex(): string[] {
  const joined = useSyncExternalStore(subscribeChartTokens, readChartTokens, () => SERVER_TOKENS);
  return joined.split(",");
}

// ── Tile ──────────────────────────────────────────────────────────────────

const LABEL_FONT_SIZE = 12;
/** The optional second line, a step down from the name so the tile reads name-first. */
const NOTE_FONT_SIZE = 11;

/**
 * Fit a label to its tile: the text itself when it fits, an ellipsised head when it
 * does not, `null` when not even three characters would. Without this a long name ran
 * on across its neighbours and collided with THEIR labels. 0.58em is the average
 * advance of a UI sans at this weight; it only needs to be close, since the tile keeps
 * 6px of padding either side. The full name stays in the tooltip.
 */
export function fitLabel(name: string, boxWidth: number, fontSize: number): string | null {
  const max = Math.floor((boxWidth - 12) / (fontSize * 0.58));
  if (max < 3) return null;
  return name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;
}

/** What recharts hands a `content` element for each node, plus the three options the
 *  chart forwards. Everything optional because recharts clones the element it was
 *  given and fills the geometry in — the element as written carries only the options. */
export interface TreemapCellProps {
  depth?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
  /** See {@link TreemapNode.labelColor}; recharts hands each node's fields to its cell. */
  labelColor?: string;
  id?: string;
  onNodeClick?: (id: string, name: string) => void;
  redactNames?: boolean;
  nodeNote?: (id: string) => string | undefined;
  /** The page's reading direction, which `Treemap` reads off its own root. In `rtl`
   *  the label stands in the tile's top RIGHT corner and is shaped right-to-left, so a
   *  clipped name ends in its ellipsis on the reading end. Default `ltr`. */
  dir?: Direction;
}

/**
 * One tile. Exported so a caller drawing its own recharts `<Treemap>` gets the same
 * label rules.
 *
 * recharts' default cell inherits the chart-level `stroke`, an SVG presentation
 * attribute that lands on the `<svg>` root and cascades into the label — so the glyphs
 * were painted with a 1px outline ON TOP of themselves, which reads as blur. This cell
 * draws its own label with a halo in the TILE colour painted BEHIND the fill
 * (`paint-order: stroke`), which defeats any inherited stroke and keeps the text solid
 * where it overlaps a lighter or darker part of its own tile.
 */
export function TreemapCell({
  depth,
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name,
  fill,
  labelColor,
  id,
  onNodeClick,
  redactNames,
  nodeNote,
  dir = "ltr",
}: TreemapCellProps) {
  // Depth 0 is recharts' synthetic root, which spans the whole chart.
  if (!depth) return null;
  // Whole pixels: a rect on a half pixel renders its edge across two half-lit
  // columns, and the text baseline inherits that blur.
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(width);
  const ph = Math.round(height);
  const tileFill = fill ?? "var(--chart-1)";
  const ink = labelColor ?? textOn(tileFill);
  // Below ~44x20 there is no room for a readable word, so no label at all rather than
  // a one-letter stub bleeding over the tile edge.
  const label = pw >= 44 && ph >= 20 ? fitLabel(name ?? "", pw, LABEL_FONT_SIZE) : null;
  // Only under a label that is itself drawn — a stray "+12%" on an unnamed rectangle
  // names nothing — and only where a second baseline fits: the note's baseline sits
  // 29px down and an 11px glyph hangs ~2px below it, so 36 leaves the same ~5px under
  // the note that the label keeps under itself at the 20px floor.
  const rawNote = id != null && nodeNote ? nodeNote(id) : undefined;
  const note =
    label != null && rawNote != null && ph >= 36 ? fitLabel(rawNote, pw, NOTE_FONT_SIZE) : null;
  // The label's START edge, 6px in from the tile's. The tiles themselves are laid out
  // physically (the plot is not mirrored, see `ChartContainer`) and the chart's SVG is
  // pinned `ltr`, so the direction is set on each <text> explicitly: `start` is then
  // the right end in RTL, and the label grows leftwards from the tile's right edge.
  const textX = dir === "rtl" ? px + pw - 6 : px + 6;
  const activate = id != null && onNodeClick ? () => onNodeClick(id, name ?? "") : undefined;
  const onKeyDown = activate
    ? (e: KeyboardEvent<SVGGElement>) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        activate();
      }
    : undefined;
  return (
    <g
      onClick={activate}
      onKeyDown={onKeyDown}
      // A clickable tile is a button to a keyboard and a screen reader too; the
      // drilldown it opens was mouse-only in the app this came from. Named by the node
      // name, which is also why the group carries `data-private` under `redactNames`.
      role={activate ? "button" : undefined}
      tabIndex={activate ? 0 : undefined}
      aria-label={activate ? name : undefined}
      data-private={activate && redactNames ? "" : undefined}
      cursor={activate ? "pointer" : undefined}
      // CSS beats a presentation attribute, so this recolours the rect's own stroke
      // for as long as the tile has keyboard focus.
      className={activate ? "outline-none [&:focus-visible>rect]:stroke-[var(--brand)]" : undefined}
    >
      {/* The 2px gutter is the card showing through, not a white grid — on a dark
          surface white lines glare harder than the tiles. */}
      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        fill={tileFill}
        stroke="var(--bg-surface)"
        strokeWidth={2}
        rx={3}
      />
      {label != null && (
        <text
          // A plain attribute, so the host's `[data-private]` rule reaches an SVG
          // <text> exactly as it reaches a table cell.
          data-private={redactNames ? "" : undefined}
          x={textX}
          y={py + 15}
          direction={dir}
          fill={ink}
          stroke={tileFill}
          strokeWidth={2.5}
          strokeLinejoin="round"
          paintOrder="stroke"
          fontSize={LABEL_FONT_SIZE}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {label}
        </text>
      )}
      {note != null && (
        <text
          x={textX}
          y={py + 29}
          direction={dir}
          fill={ink}
          fillOpacity={0.85}
          stroke={tileFill}
          strokeWidth={2.5}
          strokeLinejoin="round"
          paintOrder="stroke"
          fontSize={NOTE_FONT_SIZE}
          fontWeight={500}
          style={{ pointerEvents: "none" }}
        >
          {note}
        </text>
      )}
    </g>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────

// Nodes carry their own `fill`, and `ChartTooltipContent` falls back to it for the
// swatch, so no series config is needed.
const TREEMAP_CONFIG: ChartConfig = {};

/**
 * The shared tooltip with the whole bubble tagged `data-private`, for names that are
 * the user's own data.
 *
 * The bubble, not just the name: `ChartTooltipContent` prints the name either from
 * `item.name` or from a config `label`, and only the config route could be tagged — but
 * a config entry keyed by a payee name is not a CSS identifier, and `ChartStyle` would
 * (rightly) refuse it. The bubble holds the name and the value, and the value cell is
 * already `data-private`, so tagging the wrapper hides nothing extra.
 *
 * recharts CLONES the `content` element to inject `active`/`payload`, so this has to BE
 * that element — a `<div>` wrapped around `<ChartTooltipContent />` in the JSX would
 * take those props itself and hand the tooltip nothing.
 */
function RedactedTooltipContent(props: ComponentProps<typeof ChartTooltipContent>) {
  return (
    <div data-private>
      <ChartTooltipContent {...props} />
    </div>
  );
}

const DEFAULT_NUMBER = new Intl.NumberFormat();

/**
 * Tile chart: one rectangle per {@link TreemapNode}, sized by `value`, coloured by
 * index from the chart ramp (or by the node's own `fill`), labelled in whichever of the
 * kit's two inks measures better against it. Hover shows the name and the formatted
 * value; `onNodeClick` turns the tiles into buttons.
 *
 * Renders nothing when no node has a positive value — an empty box is a hole in the
 * card, and the caller's own sentence is the better answer there.
 *
 * Needs `recharts`, like everything behind `@eifi1/ui-kit/chart`.
 */
export function Treemap({
  data,
  valueFormatter,
  height = 320,
  onNodeClick,
  redactNames = false,
  nodeNote,
  maxTiles,
  colors,
  style,
  ...rest
}: TreemapProps) {
  const tokenHex = useChartTokenHex();
  // Read off the DOM after mount: the `dir` a treemap sits under is an ancestor's
  // attribute, and SVG text anchoring cannot follow it by CSS (see TreemapCell). Again
  // on new data, because a map that had nothing to draw rendered no root to read.
  const rootRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<Direction>("ltr");
  useLayoutEffect(() => {
    setDir(dirOf(rootRef.current));
  }, [data]);
  const ramp = colors && colors.length > 0 ? colors : tokenHex;
  // Coloured by index into `data` AS GIVEN, before anything is dropped: a caller
  // painting a legend or a second map from the same list must land on the same hue
  // for the same row, and filtering first would shift every colour after a gap.
  const nodes = data
    .map((d, idx) => ({
      id: d.id,
      name: d.name,
      size: d.value,
      fill: d.fill ?? ramp[idx % ramp.length],
      // recharts hands each node's fields to its cell; a field left out of this map
      // never reaches `TreemapCell` (0.8.0 shipped `labelColor` without it — keksdose).
      labelColor: d.labelColor,
    }))
    .filter((n) => Number.isFinite(n.size) && n.size > 0)
    .slice(0, maxTiles ?? undefined);
  if (nodes.length === 0) return null;

  // The share is of what is DRAWN, so it always reads as "of this picture".
  const total = nodes.reduce((acc, n) => acc + n.size, 0);
  const format = (v: number): ReactNode => {
    const share = total > 0 ? v / total : undefined;
    return valueFormatter ? valueFormatter(v, share) : DEFAULT_NUMBER.format(v);
  };
  const Content = redactNames ? RedactedTooltipContent : ChartTooltipContent;
  return (
    <ChartContainer {...rest} ref={rootRef} config={TREEMAP_CONFIG} style={{ ...style, height }}>
      {/* No chart-level `stroke`: recharts spreads it onto the <svg> root, from where
          it inherits into every label (see TreemapCell). Each cell strokes its own rect. */}
      <RechartsTreemap
        data={nodes}
        dataKey="size"
        fill="var(--chart-1)"
        isAnimationActive={false}
        content={
          <TreemapCell onNodeClick={onNodeClick} redactNames={redactNames} nodeNote={nodeNote} dir={dir} />
        }
      >
        <ChartTooltip content={<Content hideLabel valueFormatter={format} />} />
      </RechartsTreemap>
    </ChartContainer>
  );
}
