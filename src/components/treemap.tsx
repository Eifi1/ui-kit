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
//
// Since 0.52 a node can hold `children`: a group, drawn as a labelled frame round its
// tiles (keksdose dev #642, shops by chain). Where every node is drawn is the map's own
// layout (treemap-layout.ts), not recharts': see "Groups: a frame round their tiles".
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentProps, ComponentPropsWithoutRef, KeyboardEvent, ReactElement, ReactNode } from "react";
import { Treemap as RechartsTreemap, useChartHeight, useChartWidth } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";
import { CHART_ROLES, PALETTE_HEX, PALETTE_SIZE, lerpHex, textOn } from "../theme/chart-palette";
import { resolveChartColor, useChartEdge, useEdgesInForce, type ChartEdges } from "./chart-edge";
import { parseHex } from "../theme/color";
import { dirOf, horizontalStep, type Direction } from "../lib/direction";
import { cn } from "../lib/cn";
import { useTextSize } from "../theme/text-size";
import { chartHeightProps, type ChartHeight } from "./chart-height";
import { formatWithMinus } from "../lib/minus";
import { useKitLabels, useKitLocale, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_TREEMAP_LABELS, type TreemapLabels } from "./treemap-labels";
import { groupBody, layoutTreemap, type Box, type Placed } from "./treemap-layout";

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
   *  {@link TreemapProps.nodeNote}. Names can collide; ids must not among a group's own
   *  nodes (or the top's). A group and a tile inside it may share one — chain 12 and shop
   *  12 from two tables — and `onNodeClick`'s `groups` tells them apart (0.52). */
  id: string;
  name: string;
  /** The tile's area. A node whose value is not a positive finite number is NOT
   *  drawn — an area cannot be negative, and recharts lays a negative size out as
   *  nonsense rather than refusing it. Saying so is the caller's job: a group that
   *  vanishes silently between two views of the same data is a bug report.
   *
   *  A GROUP's own `value` is not read: its area is its drawn children's together. Pass
   *  that sum — the field stays required so that every reader of a `TreemapNode[]` keeps
   *  a `number`. */
  value: number;
  /** Overrides the by-index palette colour for this tile — e.g. to paint every child
   *  in its parent group's colour, so the groups stay legible in one picture. A
   *  concrete `#rrggbb` or a bare `var(--chart-N)` keeps the label ink measured — so
   *  does `CHART_ROLES.other` (`var(--chart-muted)`), the colour for a "rest" bucket,
   *  which should not wrap round to a hue the reader matches to a real node;
   *  anything else (another var, a `color-mix()`) gets `currentColor` ink, because
   *  there is nothing to measure — set `labelColor` then.
   *
   *  On a group, the colour of every tile inside it that sets none (0.52): keksdose's
   *  "hue = chain" is a `fill` per chain. A group left without one takes the ramp by its
   *  index, as a tile does, and hands that down; its frame is drawn in the page's own
   *  colours whatever it is. */
  fill?: string;
  /** The label's ink, for a `fill` the kit cannot measure (a `var()` or `color-mix()`):
   *  keksdose's recency plot fills with `color-mix(in srgb, var(--chart-1) N%,
   *  transparent)`, where `currentColor` put dark page text on full-strength indigo
   *  (~1.5:1). Wins over the measured ink when given. A tile that takes its group's
   *  `fill` takes the group's `labelColor` with it; one with a `fill` of its own, or one
   *  that `shade` turns into another colour, is measured again. */
  labelColor?: string;
  /**
   * The tile's colour strength, 0–1 (0.52): its `fill` mixed into the card's colour
   * (`--bg-surface`) as a concrete hex, `1` the full hue. For a second, ordered quantity
   * on top of the hue — keksdose's recency steps (1, 0.78, 0.55) over the chain's hue —
   * without a `color-mix()`: the result is measured like any hex, so the label ink stays
   * automatic and no `labelColor` is needed. keksdose found a tile under ~0.55 stops
   * reading as its hue and passes for the muted "other" (#642).
   *
   * Only a fill the kit can measure is shaded (a hex, a bare `var(--chart-N)` or another
   * bare token), and only on a page that declares `--bg-surface` as a hex; anything else
   * keeps its full hue. On a group, the default for its tiles, as `fill` is.
   */
  shade?: number;
  /**
   * Makes this node a GROUP (0.52, keksdose dev #642: "Is there already a distinction
   * between shop and chain?"): a labelled frame, its name in a band along the top, its
   * tiles laid out inside it by recharts' own nested layout. Groups nest. A group with
   * nothing drawable inside is not drawn; an empty array is a tile.
   *
   * The frame is in the page's colours (the well, `--bg-surface-2`, under
   * `--text-primary`, at least 7.4:1 in every preset and contrast), and under More
   * contrast it is outlined in `--chart-ink` as a pale tile is. Its band is drawn only
   * where the group has the room for it — see `TreemapCell`.
   */
  children?: readonly TreemapNode[];
}

/**
 * Everything a `<div>` takes reaches the chart's root (`ChartContainer`), so a test id
 * or a `data-tour` anchor can find it. `children` is the chart's own.
 *
 * The root is a `role="figure"` (0.52, refactor audit 2026-10-30, DSP-5): name it with
 * `aria-label` ("Spending by category"), and say what it shows with {@link
 * TreemapProps.description}.
 */
export interface TreemapProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  data: readonly TreemapNode[];
  /**
   * Formats a node's value in the tooltip. Handed the node's SHARE of what is drawn
   * (0–1) as a second argument, because a tile is read for how big it is relative to
   * the rest, and "€412.30" alone makes the reader estimate that ratio off the areas.
   * The share is `undefined` when the drawn total is not positive.
   *
   * A tile's accessible name (`labels.tile`, 0.52) says the value too: the formatter is
   * asked again with the share `undefined` — the name says the share itself — and its
   * text is used; markup is said as the bare number, and so is an answer that throws or
   * says "NaN" (a formatter that relies on the share being there).
   *
   * Default: the bare number through `Intl.NumberFormat` in the provider's locale (0.52,
   * DOC-10: before, the runtime's). A host with a currency passes this — the kit knows
   * none.
   */
  valueFormatter?: (value: number, share: number | undefined) => ReactNode;
  /**
   * What the map SHOWS, in a sentence — "Rent is three fifths of the month." — the
   * figure's accessible description (0.52, DSP-5). Not drawn; a caption the eye should
   * read too belongs in the page.
   */
  description?: string;
  /** Per-map strings over `<UiKitProvider labels={{ treemap }}>`. */
  labels?: LabelOverride<TreemapLabels>;
  /** Chart height: a CSS length (`"20rem"`, `"min(20rem, 50dvh)"`), a Tailwind class,
   *  or px. Default `"20rem"` — 320 px at Normal, growing with the text size like the
   *  labels in the tiles (0.32, docs/text-size-harmonization.md §10.10). */
  height?: ChartHeight;
  /**
   * A tile was activated — by click, or by Enter/Space on a focused tile. Setting this
   * makes every tile a `role="button"`.
   *
   * Either way every tile is reachable (0.52, DSP-5): ONE tab stop for the map, the
   * arrows (←/→ along the reading direction, ↓/↑), Home and End between tiles in the
   * order given, each named "name: value (share)" (`labels.tile`) — a `role="img"` to read
   * when nothing listens, as PieChart's slices. Before, a map nobody clicked was nothing
   * to a screen reader, and a clickable tile said its name alone, one tab stop each.
   *
   * In a map with groups (`TreemapNode.children`, 0.52) the walk is the data's own order,
   * depth first: a group's frame, then its tiles, then the next group. A frame is named
   * by `labels.group` ("Interspar, group: €1,240 (40%)"), a tile inside one by
   * `labels.inGroup` round its own name ("Rankweil: €412 (12%), in Interspar"). Only
   * tiles reach this callback (a frame reaches `onGroupClick`); a tile inside a group is
   * handed a third argument, the ids of its groups, outermost first. Optional in the type,
   * so a forwarder calling this with two arguments still type-checks — and absent for a
   * tile at the top, so a flat map calls it exactly as before.
   */
  onNodeClick?: (id: string, name: string, groups?: readonly string[]) => void;
  /**
   * A group's frame was activated — by click on its band or margin, or by Enter/Space on
   * the focused frame (0.52). Setting this makes every frame a `role="button"`; without it
   * a frame is a `role="img"`, still a stop of the map's keyboard so its total is heard.
   * `groups` as for {@link TreemapProps.onNodeClick}: the groups round this one, passed
   * only for a group inside another.
   */
  onGroupClick?: (id: string, name: string, groups?: readonly string[]) => void;
  /**
   * The node names are the user's own data (payees, not categories): the tile labels
   * and the whole tooltip bubble get `data-private`, the same attribute the kit's
   * `Tooltip redact` and `ChartTooltipContent`'s value cell carry, so the host's one
   * privacy rule reaches them. Off by default — a category name is a label of the app.
   *
   * Every tile is tagged as a whole too, clickable or not (0.52): its accessible name
   * (`labels.tile`) says the name and the value, in an attribute a host's redaction
   * reaches only through the tag.
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
   *
   * Asked for tiles only: a group's band holds its name and nothing else.
   */
  nodeNote?: (id: string) => string | undefined;
  /**
   * Draw at most this many tiles (the first N drawable nodes, in the order given —
   * sort first). Unbounded by default. A tile under ~44x20px has no room for a label,
   * and a map made of unlabelled rectangles answers nothing; around 24 is where the
   * smallest tile of a skewed series reaches that floor on a phone-width card. The
   * caller owns the "N more not shown" line, since it knows how many it passed.
   *
   * With groups, the tiles are counted across them in the order given, depth first; a
   * group left with none is not drawn, and a group's frame is not a tile.
   */
  maxTiles?: number;
  /**
   * The categorical ramp tiles take by index, as concrete hex. Default: the page's
   * live `--chart-1…8` tokens (see `useChartTokenHex`), cycled after eight like
   * `paletteFor` (0.49). Pass one when the host
   * already holds the active palette — e.g. `createPaletteStore`'s `useChartHex()` —
   * so a caller colouring a legend beside the map is guaranteed the same list.
   */
  colors?: readonly string[];
  /**
   * How tiles are parted (0.51.6, keksdose dev #642, Marcel: "The borders do not look
   * nice when changing from tile to tile. Can this be uniform black?" — and then, on the
   * contrast rule that would go with it: follow the contrast setting).
   *
   * - `"auto"` (default): `"uniform"` at Standard contrast, `"contrast"` while More
   *   contrast is in force (`<html data-contrast="more">`: the reader chose it, or chose
   *   System on a device that asks for more). Followed live.
   * - `"uniform"`: one 2px gutter in the page's ground colour (`--bg-page`, near-black
   *   in the dark theme) round every tile, and nothing else. Tiles always abut, so the
   *   gutter parts them; each tile is named by its label.
   * - `"contrast"`: the 0.49 rule. The gutter is the card's colour (`--bg-surface`),
   *   and a tile whose hue is under 3:1 against the card gets a 1px ink edge inside it
   *   (WCAG 1.4.11, `useChartEdge`). In the dark theme that ink is light, so some tiles
   *   carry a white outline and their neighbours none — the unevenness #642 saw, and
   *   the price of the edge for a reader who asked for it.
   */
  edges?: TreemapEdges;
}

/** {@link TreemapProps.edges}. The switch itself is chart-edge's `useEdgesInForce`,
 *  which SeriesChart's bars and areas follow too since 0.52 (DSP-18). */
export type TreemapEdges = ChartEdges;

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

const CHART_TOKENS = PALETTE_SIZE;

/** The resolved ramp, and after a `|` the card's colour, joined into ONE string so
 *  `useSyncExternalStore` compares a primitive: a fresh array per read would never be
 *  `Object.is`-equal to the last and would re-render forever. */
function readChartTokens(): string {
  const root = document.documentElement;
  const fallback = root.classList.contains("dark") ? PALETTE_HEX.dark : PALETTE_HEX.light;
  const style = getComputedStyle(root);
  const ramp = Array.from({ length: CHART_TOKENS }, (_, i) => {
    const v = style.getPropertyValue(`--chart-${i + 1}`).trim();
    // An unresolved token (a host that never loaded tokens.css, a test DOM) falls
    // back to the built-in ramp for the current theme rather than to no colour.
    return parseHex(v) ? v : fallback[i];
  }).join(",");
  // The card, which `TreemapNode.shade` mixes a hue into (0.52). No fallback: a page that
  // declares no `--bg-surface` hex leaves nothing to mix into, and the tile keeps its hue.
  const card = style.getPropertyValue("--bg-surface").trim();
  return `${ramp}|${parseHex(card) ? card : ""}`;
}

function subscribeChartTokens(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
  return () => observer.disconnect();
}

const SERVER_TOKENS = `${PALETTE_HEX.light.join(",")}|`;

interface ChartTokens {
  ramp: readonly string[];
  /** `--bg-surface` as hex, or null when the page declares none. */
  card: string | null;
}

function useChartTokenHex(): ChartTokens {
  const joined = useSyncExternalStore(subscribeChartTokens, readChartTokens, () => SERVER_TOKENS);
  // One object per reading, not per render: the map's nodes are memoised on it.
  return useMemo(() => {
    const [ramp = "", card = ""] = joined.split("|");
    return { ramp: ramp.split(","), card: card || null };
  }, [joined]);
}

const CHART_TOKEN_REF = /^var\(\s*--chart-(\d+)\s*\)$/;

/**
 * The hex a tile fill measures as: the fill itself when it is hex, the live token when
 * it is a bare `var(--chart-N)` (what `paletteFor` returns), otherwise null. Without
 * the token case a hand-built recharts map coloured with the kit's own `paletteFor`
 * got `currentColor` ink — dark page text on dark indigo in the light theme.
 */
function measurableFill(fill: string, tokens: readonly string[]): string | null {
  if (parseHex(fill)) return fill;
  const m = CHART_TOKEN_REF.exec(fill.trim());
  const hex = m ? tokens[Number(m[1]) - 1] : undefined;
  if (hex && parseHex(hex)) return hex;
  // Any other bare token the page declares — `var(--chart-muted)` for a rest bucket,
  // `var(--chart-9)`, a money colour — read off <html> as it resolves.
  if (typeof document === "undefined") return null;
  return resolveChartColor(fill, getComputedStyle(document.documentElement));
}

// ── What a tile reads from its map ───────────────────────────────────────
//
// 0.52 (refactor audit 2026-10-30, DSP-22): every tile resolved the token ramp, the ink
// edge and the edge rule itself — three stores, each with a MutationObserver on <html>, so
// 72 on keksdose's 24-tile maps, and up to 29 custom properties re-read on every render of
// every tile. `Treemap` resolves them once and hands them down here; a TreemapCell drawn
// in a caller's own recharts `<Treemap>` has no map above it and resolves its own.

interface TileContext {
  tokens: readonly string[];
  edgeFor: (fill: string | undefined) => string | undefined;
  edges: "uniform" | "contrast";
  /** The map's keyboard (DSP-5): absent for a standalone cell. */
  keys?: TileKeys;
  /** Where every node is drawn in a chart of this size (see "Groups"), by path: absent
   *  for a standalone cell, which draws where recharts laid it. */
  layout?: (width: number, height: number, scale: number) => ReadonlyMap<string, Placed>;
  /** The pointer is on the node drawn at `box`: where the map's tooltip stands. */
  hover?: (box: Box) => void;
}

/**
 * Keyed by a node's PATH (`MapNode.path`), not its id: a group and a tile may share an id
 * — chain 12 and shop 12 come from two tables — and keyed by id the map had two tab stops,
 * the frame said the tile's name and the arrows stuck (0.52 code review of treemap.tsx,
 * finding 3).
 */
interface TileKeys {
  /** A tile's or a group's accessible name (`labels.tile`, `labels.group`). */
  name: (path: string) => string | undefined;
  onFocus: (path: string) => void;
  /** A node's element as it mounts (and `null` as it goes): the map sets its `tabindex` and
   *  gives it back the focus its previous element held (see the map's keyboard). */
  register: (path: string, element: SVGGElement | null) => void;
  /** Moves focus for an arrow, Home or End pressed on node `path`; `false` for any other key. */
  move: (path: string, event: KeyboardEvent<SVGGElement>) => boolean;
}

const TreemapTiles = createContext<TileContext | null>(null);

// ── Groups: a frame round their tiles ─────────────────────────────────────
//
// 0.52 (keksdose dev #642). A group is a frame with its name in a band along the top, its
// tiles inside it. recharts lays nested data out edge to edge, with no room for a band, so
// the map lays it out ITSELF (treemap-layout.ts): squarified as recharts does it, each
// group given its frame's area on top of its tiles' — so a tile's area stays its share of
// the picture in any group (0.52 code review of treemap.tsx, finding 1) — and computed up
// front from the drawn nodes and the chart's size, which every cell reads by its path.
// Before, a group's cell made the room during render and left it in a module cache for its
// children's cells, which held only while recharts rendered a group before its children
// (finding 8). recharts still renders each node's cell, and its tooltip; the map stands the
// tooltip at the tile as drawn (`TreemapTooltip`), since recharts' own anchor is the centre
// of the rectangle IT laid out.

// ── Tile ──────────────────────────────────────────────────────────────────

/** The name's size in px at Normal; a tile draws it × the text size's scale (§10.10), and
 *  every distance below that is measured in lines grows with it. */
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
  /** Called with `groups` as its third argument when the cell has any; see
   *  {@link TreemapProps.onNodeClick}. */
  onNodeClick?: (id: string, name: string, groups?: readonly string[]) => void;
  /** A group's cell's click; see {@link TreemapProps.onGroupClick}. */
  onGroupClick?: (id: string, name: string, groups?: readonly string[]) => void;
  /** The ids of the groups round the node, outermost first. `Treemap` puts it on every
   *  node it hands recharts; a cell drawn in a caller's own map has it if the data does. */
  groups?: readonly string[];
  /** The node's place in the tree, which `Treemap` puts on every node it hands recharts:
   *  its key in the map's keyboard, where an id may repeat between a group and a tile. */
  path?: string;
  /** Filled in by recharts for a GROUP: the nodes laid out inside it. A cell with
   *  children draws a frame, not a tile (0.52). */
  children?: readonly object[] | null;
  redactNames?: boolean;
  nodeNote?: (id: string) => string | undefined;
  /** The page's reading direction, which `Treemap` reads off its own root. In `rtl`
   *  the label stands in the tile's top RIGHT corner and is shaped right-to-left, so a
   *  clipped name ends in its ellipsis on the reading end. Default `ltr`. */
  dir?: Direction;
  /** See {@link TreemapProps.edges}. Default `auto`. Read by a cell drawn on its own; a
   *  `Treemap` hands its tiles its own `edges`. */
  edges?: TreemapEdges;
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
 *
 * Inside a `Treemap` it is one stop of the map's keyboard, named with its value and
 * share (0.52); drawn on its own it is a stop only as a button (`onNodeClick`), named by
 * `name`.
 *
 * A node with `children` is a GROUP (0.52): the cell draws a frame in the well's colour
 * (`--bg-surface-2`), with the group's name in a band along its top where the group has
 * the room (61px at Normal, treemap-layout's `BODY_SHARE`). Inside a `Treemap` its tiles are laid out
 * in the frame's body; in a caller's own nested recharts `<Treemap>` they are drawn where
 * recharts lays them, over the frame — only `Treemap` makes the room.
 */
export function TreemapCell(props: TreemapCellProps) {
  const map = useContext(TreemapTiles);
  return map ? <MapTile {...props} map={map} /> : <StandaloneTile {...props} />;
}

/** A cell inside a `Treemap`: drawn where the map's layout puts its node, read by path
 *  for the chart's size as recharts measured it. */
function MapTile(props: TreemapCellProps & { map: TileContext }) {
  const width = useChartWidth();
  const height = useChartHeight();
  const { scale } = useTextSize();
  const place =
    props.path !== undefined && width && height ? props.map.layout?.(width, height, scale).get(props.path) : undefined;
  return <Tile {...props} place={place} />;
}

/** A cell with no `Treemap` above it: it resolves what the map would have handed it. */
function StandaloneTile(props: TreemapCellProps) {
  const tokens = useChartTokenHex().ramp;
  const edgeFor = useChartEdge();
  const edges = useEdgesInForce(props.edges ?? "auto");
  const map = useMemo(() => ({ tokens, edgeFor, edges }), [tokens, edgeFor, edges]);
  return <Tile {...props} map={map} />;
}

function Tile({
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
  onGroupClick,
  groups,
  path,
  children,
  redactNames,
  nodeNote,
  dir = "ltr",
  map,
  place,
}: TreemapCellProps & { map: TileContext; place?: Placed }) {
  // Before the early return: a hook has to run on every render of the cell.
  const { scale } = useTextSize();
  const { tokens: tokenHex, edgeFor, edges, keys } = map;
  // Depth 0 is recharts' synthetic root, which spans the whole chart.
  if (!depth) return null;
  // Inside a Treemap, where the map's layout draws the node; on its own, where recharts
  // laid it out.
  const box = place?.box ?? { x, y, width, height };
  // Whole pixels: a rect on a half pixel renders its edge across two half-lit
  // columns, and the text baseline inherits that blur.
  const px = Math.round(box.x);
  const py = Math.round(box.y);
  const pw = Math.round(box.width);
  const ph = Math.round(box.height);
  const isGroup = children != null && children.length > 0;
  const group = !isGroup
    ? undefined
    : place?.body
      ? { banded: place.banded ?? false, body: place.body }
      : groupBody({ x: px, y: py, width: pw, height: ph }, scale);
  const tileFill = fill ?? "var(--chart-1)";
  const measured = measurableFill(tileFill, tokenHex);
  const ink = labelColor ?? (measured ? textOn(measured) : "currentColor");
  // `contrast`: a tile in a hue under 3:1 against the card gets a 1px ink edge inside
  // the gutter (WCAG 1.4.11, anyplot's rule); a hue that clears it stays bare.
  // `uniform`: no per-tile edge; every tile is parted by the same gutter.
  // A group's frame is the well, 1.09–1.24:1 from the card in every preset and contrast
  // (measured 0.52): under `contrast` it always takes the edge.
  const edge =
    edges !== "contrast" ? undefined : group ? CHART_ROLES.outline : measured ? edgeFor(measured) : undefined;
  // The halo only on an OPAQUE fill we could measure. A translucent fill (a
  // `color-mix(… transparent)`) composited twice — once as the tile, once as the halo
  // over it — draws a darker ring round every glyph, which read as doubled text on the
  // faded tiles. `none` still overrides the inherited chart `stroke`.
  const halo = measured ? tileFill : "none";
  // Below ~44x20 there is no room for a readable word, so no label at all rather than
  // a one-letter stub bleeding over the tile edge. A group's name only in its band.
  const labelSize = LABEL_FONT_SIZE * scale;
  const noteSize = NOTE_FONT_SIZE * scale;
  const label = group
    ? group.banded
      ? fitLabel(name ?? "", pw, labelSize)
      : null
    : pw >= 44 * scale && ph >= 20 * scale
      ? fitLabel(name ?? "", pw, labelSize)
      : null;
  // Only under a label that is itself drawn — a stray "+12%" on an unnamed rectangle
  // names nothing — and only where a second baseline fits: the note's baseline sits
  // 29px down and an 11px glyph hangs ~2px below it, so 36 leaves the same ~5px under
  // the note that the label keeps under itself at the 20px floor. Never in a band.
  const rawNote = !group && id != null && nodeNote ? nodeNote(id) : undefined;
  const note = label != null && rawNote != null && ph >= 36 * scale ? fitLabel(rawNote, pw, noteSize) : null;
  // The label's START edge, 6px in from the tile's. The tiles themselves are laid out
  // physically (the plot is not mirrored, see `ChartContainer`) and the chart's SVG is
  // pinned `ltr`, so the direction is set on each <text> explicitly: `start` is then
  // the right end in RTL, and the label grows leftwards from the tile's right edge.
  const textX = dir === "rtl" ? px + pw - 6 : px + 6;
  // A tile's click is `onNodeClick`, a frame's `onGroupClick`. The groups go along only
  // when there are any, so a flat map calls back exactly as it did before 0.52.
  const click = group ? onGroupClick : onNodeClick;
  const activate =
    id != null && click
      ? () => (groups && groups.length > 0 ? click(id, name ?? "", groups) : click(id, name ?? ""))
      : undefined;
  // Inside a Treemap every tile and frame is a stop of the map's one roving tab stop,
  // named with its value and share; a standalone cell is a stop of its own only when it
  // is a button.
  const roving = path != null && keys ? keys : undefined;
  const focusable = roving !== undefined || activate !== undefined;
  const onKeyDown = focusable
    ? (e: KeyboardEvent<SVGGElement>) => {
        if (roving?.move(path!, e)) {
          e.preventDefault();
          return;
        }
        if (!activate || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        activate();
      }
    : undefined;
  return (
    <g
      ref={roving ? refFor(roving.register, path!) : undefined}
      onClick={activate}
      onKeyDown={onKeyDown}
      onFocus={roving ? () => roving.onFocus(path!) : undefined}
      onMouseEnter={map.hover ? () => map.hover!({ x: px, y: py, width: pw, height: ph }) : undefined}
      // A clickable tile is a button to a keyboard and a screen reader too; the
      // drilldown it opens was mouse-only in the app this came from. Under `redactNames`
      // the group carries `data-private` whenever it carries a name, button or not: the
      // name says the node's name and value, and an untagged `aria-label` is read by a
      // session replay or a redaction keyed on `[data-private]` (0.52, code review of
      // feat/0.52.0 — DSP-5 named every tile, and this tagged only the buttons).
      role={activate ? "button" : roving ? "img" : undefined}
      // In a map, -1 as drawn: the map moves its one stop on the elements in place.
      tabIndex={roving ? -1 : activate ? 0 : undefined}
      aria-label={focusable ? (roving?.name(path!) ?? name) : undefined}
      data-private={focusable && redactNames ? "" : undefined}
      data-group={group ? "" : undefined}
      cursor={activate ? "pointer" : undefined}
      // CSS beats a presentation attribute, so this recolours the rect's own stroke
      // for as long as the tile has keyboard focus.
      className={focusable ? "outline-none [&:focus-visible>rect]:stroke-[var(--brand)]" : undefined}
    >
      {/* The 2px gutter: the page's ground (`uniform`, the same dark line round every
          tile in the dark theme) or the card showing through (`contrast`). Never a white
          grid: on a dark surface white lines glare harder than the tiles. A group's frame
          is the well, the inset surface: the page's own colour in light, a step up from
          it in dark, and never one of the hues its tiles are told apart by. */}
      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        fill={group ? "var(--bg-surface-2)" : tileFill}
        stroke={edges === "contrast" ? "var(--bg-surface)" : "var(--bg-page)"}
        strokeWidth={2}
        rx={3}
      />
      {edge && pw > 3 && ph > 3 && (
        <rect
          data-edge=""
          x={px + 1.5}
          y={py + 1.5}
          width={pw - 3}
          height={ph - 3}
          fill="none"
          stroke={edge}
          strokeWidth={1}
          rx={2}
          style={{ pointerEvents: "none" }}
        />
      )}
      {label != null &&
        (group ? (
          // The band's name: the page's text on the well, 8.2:1 at the least in every
          // preset, 7.4:1 under More contrast (measured 0.52) — no halo, nothing to
          // stand out from. `stroke="none"` against the inherited chart stroke.
          <text
            data-private={redactNames ? "" : undefined}
            x={textX}
            y={py + 14 * scale}
            direction={dir}
            fill="var(--text-primary)"
            stroke="none"
            fontSize={labelSize}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            {label}
          </text>
        ) : (
          <text
            // A plain attribute, so the host's `[data-private]` rule reaches an SVG
            // <text> exactly as it reaches a table cell.
            data-private={redactNames ? "" : undefined}
            x={textX}
            y={py + 15 * scale}
            direction={dir}
            fill={ink}
            stroke={halo}
            strokeWidth={2.5}
            strokeLinejoin="round"
            paintOrder="stroke"
            fontSize={labelSize}
            fontWeight={600}
            style={{ pointerEvents: "none" }}
          >
            {label}
          </text>
        ))}
      {note != null && (
        <text
          x={textX}
          y={py + 29 * scale}
          direction={dir}
          fill={ink}
          fillOpacity={0.85}
          stroke={halo}
          strokeWidth={2.5}
          strokeLinejoin="round"
          paintOrder="stroke"
          fontSize={noteSize}
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

/** Where the pointer last entered a node, as drawn: a store of one box, so that only the
 *  tooltip re-renders when it moves — not the map, nor (through recharts) every tile. */
interface Anchor {
  read: () => Box | null;
  subscribe: (onChange: () => void) => () => void;
  set: (box: Box) => void;
}

function createAnchor(): Anchor {
  let at: Box | null = null;
  const listeners = new Set<() => void>();
  return {
    read: () => at,
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    set: (box) => {
      if (at && at.x === box.x && at.y === box.y && at.width === box.width && at.height === box.height) return;
      at = box;
      listeners.forEach((onChange) => onChange());
    },
  };
}

/**
 * The map's tooltip, stood at the tile the pointer is on AS DRAWN. recharts anchors its
 * tooltip at the centre of the rectangle it laid the node out in, and since 0.52 the map
 * draws its nodes where its own layout puts them (see "Groups") — a tooltip anchored by
 * recharts could stand over a neighbour. It stands 10px off the tile's centre, towards the
 * chart's middle, so it does not run off the side the tile is on. `content` is the bubble,
 * as recharts' own `content`.
 */
function TreemapTooltip({ content, anchor }: { content: ReactElement; anchor: Anchor }) {
  const at = useSyncExternalStore(anchor.subscribe, anchor.read, anchor.read);
  const width = useChartWidth() ?? 0;
  const height = useChartHeight() ?? 0;
  if (!at) return <ChartTooltip content={content} />;
  const cx = at.x + at.width / 2;
  const cy = at.y + at.height / 2;
  const left = cx > width / 2;
  const up = cy > height / 2;
  return (
    <ChartTooltip
      content={content}
      position={{ x: cx + (left ? -10 : 10), y: cy + (up ? -10 : 10) }}
      // `translate` composes with the `transform` recharts sets for `position`.
      wrapperStyle={{ translate: `${left ? "-100%" : "0"} ${up ? "-100%" : "0"}` }}
    />
  );
}

/** What `Treemap` hands recharts per node: a tile, or a group with `children`. recharts
 *  hands each node's fields to its cell; a field left out of this never reaches
 *  `TreemapCell` (0.8.0 shipped `labelColor` without it — keksdose). A type, not an
 *  interface: recharts' `data` wants an index signature, which only an alias meets. */
type MapNode = {
  id: string;
  name: string;
  /** A tile's value; a group's, its drawn tiles' together. recharts sums a group again
   *  for its layout, and its tooltip reads this field. */
  size: number;
  fill: string;
  labelColor?: string;
  /** The ids of the groups round the node, outermost first. */
  groups: readonly string[];
  /** The node's key in the map's keyboard and names: its id and its groups' (see TileKeys). */
  path: string;
  children?: MapNode[];
};

/** What a group hands down to the tiles inside it that set none of their own. */
interface Paint {
  fill: string;
  labelColor?: string;
  shade?: number;
}

/**
 * `data` as drawn: tiles with a positive value, at most `maxTiles` of them in the order
 * given (depth first), and the groups that still hold any. `shaded` turns a fill and a
 * `shade` into the fill drawn.
 *
 * Coloured by index into `data` AS GIVEN, before anything is dropped: a caller painting a
 * legend or a second map from the same list must land on the same hue for the same row,
 * and filtering first would shift every colour after a gap. Below the top a node takes
 * its group's colour, so a group's tiles share one hue unless they set their own.
 */
function mapNodes(
  data: readonly TreemapNode[],
  ramp: readonly string[],
  maxTiles: number | undefined,
  shaded: (fill: string, shade: number | undefined) => string,
): MapNode[] {
  // Whole tiles, as `slice(0, maxTiles)` counted them up to 0.51: 2.5 draws 2 and NaN none
  // (0.52 code review of treemap.tsx, finding 4 — a bare counter drew 3, and every tile).
  let left = maxTiles === undefined ? Infinity : Number.isNaN(maxTiles) ? 0 : Math.floor(maxTiles);
  const walk = (list: readonly TreemapNode[], groups: readonly string[], paint: Paint | undefined): MapNode[] =>
    list.flatMap((d, idx): MapNode[] => {
      const fill = d.fill ?? paint?.fill ?? ramp[idx % ramp.length]!;
      // An inherited fill brings its ink along (a `color-mix()` group needs its
      // `labelColor`); a fill of the tile's own is measured again.
      const labelColor = d.labelColor ?? (d.fill === undefined ? paint?.labelColor : undefined);
      const shade = d.shade ?? paint?.shade;
      if (d.children && d.children.length > 0) {
        const children = walk(d.children, [...groups, d.id], { fill, labelColor, shade });
        if (children.length === 0) return [];
        const size = children.reduce((acc, c) => acc + c.size, 0);
        return [{ id: d.id, name: d.name, size, fill, groups, path: pathOf(groups, d.id), children }];
      }
      if (!(Number.isFinite(d.value) && d.value > 0) || left <= 0) return [];
      left -= 1;
      const drawn = shaded(fill, shade);
      // An ink the GROUP chose was chosen for the group's colour: once `shade` makes the
      // tile another hex, that hex is measured instead (0.52 code review of treemap.tsx,
      // finding 5 — white ink on a tile shaded almost to the card, ~1.3:1). The tile's
      // own `labelColor` still wins: the caller set it for this tile.
      const ink = d.labelColor ?? (drawn === fill ? labelColor : undefined);
      return [
        { id: d.id, name: d.name, size: d.value, fill: drawn, labelColor: ink, groups, path: pathOf(groups, d.id) },
      ];
    });
  return walk(data, [], undefined);
}

/** The last layout made for each drawn tree, by size and text size: a memo, not state — it
 *  is a pure function of its key, so whichever cell asks first, every cell gets the same. */
const LAYOUTS = new WeakMap<readonly MapNode[], { key: string; placed: ReadonlyMap<string, Placed> }>();

function layoutFor(nodes: readonly MapNode[], width: number, height: number, scale: number) {
  const key = `${width}x${height}@${scale}`;
  const last = LAYOUTS.get(nodes);
  if (last?.key === key) return last.placed;
  const placed = layoutTreemap(nodes, width, height, scale);
  LAYOUTS.set(nodes, { key, placed });
  return placed;
}

/** One ref callback per map and path, the same on every render: a new function each time
 *  makes React detach and attach the element on every render of the tile. */
const REFS = new WeakMap<TileKeys["register"], Map<string, (element: SVGGElement | null) => void>>();

function refFor(register: TileKeys["register"], path: string) {
  let byPath = REFS.get(register);
  if (!byPath) {
    byPath = new Map();
    REFS.set(register, byPath);
  }
  let ref = byPath.get(path);
  if (!ref) {
    ref = (element) => register(path, element);
    byPath.set(path, ref);
  }
  return ref;
}

/** A node's path: its groups' ids and its own, as JSON so that no id can fake a separator. */
const pathOf = (groups: readonly string[], id: string) => JSON.stringify([...groups, id]);

/** `nodes` in the order the keyboard walks them: each group, then what is inside it. */
function depthFirst(nodes: readonly MapNode[]): MapNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? depthFirst(n.children) : [])]);
}

/**
 * Tile chart: one rectangle per {@link TreemapNode}, sized by `value`, coloured by
 * index from the chart ramp (or by the node's own `fill`), labelled in whichever of the
 * kit's two inks measures better against it. Hover shows the name and the formatted
 * value; every tile is a keyboard stop named with its value and share (see
 * `onNodeClick`), and `onNodeClick` turns the tiles into buttons.
 *
 * A node with `children` is a group (0.52): a labelled frame with its tiles inside, in
 * its colour unless they set their own — see {@link TreemapNode.children}.
 *
 * Renders nothing when no node has a positive value — an empty box is a hole in the
 * card, and the caller's own sentence is the better answer there.
 *
 * Needs `recharts`, like everything behind `@eifi1/ui-kit/chart`.
 */
export function Treemap({
  data,
  valueFormatter,
  height = "20rem",
  onNodeClick,
  onGroupClick,
  redactNames = false,
  nodeNote,
  maxTiles,
  colors,
  edges = "auto",
  description,
  labels: labelsProp,
  style,
  ...rest
}: TreemapProps) {
  // Resolved once for every tile, which reads them from `TreemapTiles` (DSP-22).
  const { ramp: tokenHex, card } = useChartTokenHex();
  const edgeFor = useChartEdge();
  const edgesInForce = useEdgesInForce(edges);
  const labels = useKitLabels("treemap", DEFAULT_TREEMAP_LABELS, labelsProp);
  // The provider's locale (0.52, refactor audit 2026-10-30, DOC-10): this was the one
  // formatter default in the kit that took the runtime's.
  const locale = useKitLocale();
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percentFormats = useMemo(
    () => ({
      whole: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
      fine: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }),
    }),
    [locale],
  );
  // Read off the DOM after mount: the `dir` a treemap sits under is an ancestor's
  // attribute, and SVG text anchoring cannot follow it by CSS (see TreemapCell). Again
  // on new data, because a map that had nothing to draw rendered no root to read.
  const rootRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState<Direction>("ltr");
  useLayoutEffect(() => {
    setDir(dirOf(rootRef.current));
  }, [data]);
  const describedBy = useId();
  const ramp = colors && colors.length > 0 ? colors : tokenHex;
  // Memoised: moving the tab stop re-renders the map, and fresh nodes would re-lay it.
  const nodes = useMemo(
    () =>
      mapNodes(data, ramp, maxTiles, (fill, shade) => {
        // `shade` (0.52): the hue mixed into the card as a hex, so it is measured like
        // any other. A fill or a card it cannot read keeps the full hue.
        if (shade === undefined || !Number.isFinite(shade) || shade >= 1 || !card) return fill;
        const hex = measurableFill(fill, tokenHex);
        return hex ? lerpHex(card, hex, shade) : fill;
      }),
    [data, ramp, maxTiles, tokenHex, card],
  );
  // The keyboard walks groups and tiles alike, in the data's order (see `onNodeClick`).
  const order = useMemo(() => depthFirst(nodes), [nodes]);
  // The map's layout (see "Groups"), for the size recharts measured: each cell asks for it
  // by that size, and `layoutFor` makes it once per size and text size.
  const layout = useMemo(
    () => (width: number, height: number, scale: number) => layoutFor(nodes, width, height, scale),
    [nodes],
  );
  // Where the pointer is, for the tooltip to stand at (`TreemapTooltip`).
  const [anchor] = useState(createAnchor);

  // The keyboard (DSP-5): one tab stop for the map, moved between tiles in `order` as
  // PieChart's is between slices. The tiles are drawn by recharts, so they register
  // their element here rather than being looked up.
  //
  // The stop is moved on the elements IN PLACE, as PieChart moves its own, and never
  // reaches the tiles' context: kept there, every arrow-key step was a new context and
  // every tile drew again — layout, fitted labels, notes (0.52 code review of treemap.tsx,
  // finding 6). And recharts keys a node by where IT lays it out (`x-y-name`), so new data
  // or a resize remounts the focused node: its element leaves holding the focus, which
  // fell to <body> (finding 7). The path it held is kept, and its new element takes the
  // focus back as it mounts — or, if the node is gone, the stop does.
  const tiles = useRef(new Map<string, SVGGElement>());
  const orderRef = useRef(order);
  const stopRef = useRef<string | undefined>(undefined);
  const restoreRef = useRef<string | null>(null);
  /** The path holding the stop: the last one focused while it is drawn, else the first. */
  const stopOf = useCallback(() => {
    const drawn = orderRef.current;
    return drawn.some((n) => n.path === stopRef.current) ? stopRef.current : drawn[0]?.path;
  }, []);
  const applyStop = useCallback(() => {
    const at = stopOf();
    tiles.current.forEach((el, path) => el.setAttribute("tabindex", path === at ? "0" : "-1"));
    return at;
  }, [stopOf]);
  const register = useCallback(
    (path: string, element: SVGGElement | null) => {
      if (element) {
        tiles.current.set(path, element);
        element.setAttribute("tabindex", path === stopOf() ? "0" : "-1");
        if (restoreRef.current === path) {
          restoreRef.current = null;
          element.focus();
        }
        return;
      }
      // Detached before it is removed: still the focused element if it held the focus.
      if (tiles.current.get(path) === document.activeElement) restoreRef.current = path;
      tiles.current.delete(path);
    },
    [stopOf],
  );
  const onFocus = useCallback(
    (path: string) => {
      stopRef.current = path;
      applyStop();
    },
    [applyStop],
  );
  // New data: the order the stop is read against, the stop set again on what is drawn now,
  // and the focus of a node that is gone handed to the stop.
  useLayoutEffect(() => {
    orderRef.current = order;
    const at = applyStop();
    if (restoreRef.current === null) return;
    restoreRef.current = null;
    if (at) tiles.current.get(at)?.focus();
  }, [order, applyStop]);
  const move = useCallback((path: string, event: KeyboardEvent<SVGGElement>) => {
    const drawn = orderRef.current;
    const at = drawn.findIndex((n) => n.path === path);
    const step = horizontalStep(event.key, event.currentTarget);
    const to = step
      ? at + step
      : event.key === "ArrowDown"
        ? at + 1
        : event.key === "ArrowUp"
          ? at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? drawn.length - 1
              : undefined;
    if (at < 0 || to === undefined) return false;
    const target = drawn[Math.max(0, Math.min(drawn.length - 1, to))];
    if (target) tiles.current.get(target.path)?.focus();
    return true;
  }, []);

  // Everything below is memoised over what it reads (0.52, code review of feat/0.52.0). A
  // tile re-renders when its context or its recharts element changes, and recharts' map is
  // a PureComponent that redraws every node when `content` or its tooltip child is a new
  // element: built afresh per render, as they were, a page re-rendering the card or one
  // arrow-key step redrew every tile and ran `labels.tile` and two `Intl` formats per node
  // again — the cost DSP-22 had just taken out of the tiles.
  //
  // The share is of what is DRAWN, so it always reads as "of this picture" — a group's
  // and a tile's inside it alike.
  const total = useMemo(() => nodes.reduce((acc, n) => acc + n.size, 0), [nodes]);
  const format = useCallback(
    (v: number): ReactNode =>
      valueFormatter ? valueFormatter(v, total > 0 ? v / total : undefined) : formatWithMinus(numberFormat, v),
    [valueFormatter, total, numberFormat],
  );
  const names = useMemo(() => {
    // The caller's text when it gives text, asked with no share — the name says that
    // itself; a value it formats as markup is said as a number.
    //
    // Guarded (0.52 code review of treemap.tsx, finding 2): with anything drawn the share
    // was never `undefined` before DSP-5 asked for it here, so a formatter may lean on it —
    // `share!` printed "NaN%" into every name, `share.toFixed()` threw inside this memo and
    // took the whole chart down. Either way the name says the number instead.
    const valueText = (v: number) => {
      let out: ReactNode;
      try {
        out = valueFormatter?.(v, undefined);
      } catch {
        out = undefined;
      }
      const text = typeof out === "string" || typeof out === "number" ? String(out) : undefined;
      return text !== undefined && !text.includes("NaN") ? text : formatWithMinus(numberFormat, v);
    };
    // One decimal under 10 %, as PieChart: a tile of 0.4 % named "0%" says it is not there.
    const shareText = (share: number) => (share < 0.1 ? percentFormats.fine : percentFormats.whole).format(share);
    // A group's name by its path; a node's groups by theirs, its own path's prefixes.
    const groupName = new Map(order.filter((n) => n.children).map((n) => [n.path, n.name]));
    return new Map(
      order.map((n) => {
        const say = n.children ? labels.group : labels.tile;
        const own = say(n.name, valueText(n.size), shareText(total > 0 ? n.size / total : 0));
        // The innermost group first: "Rent: …, in Housing, in Fixed costs".
        const named = n.groups
          .map((g, i) => groupName.get(pathOf(n.groups.slice(0, i), g)) ?? g)
          .reduceRight((acc, group) => labels.inGroup(acc, group), own);
        return [n.path, named] as const;
      }),
    );
  }, [order, labels, valueFormatter, numberFormat, percentFormats, total]);
  const keys = useMemo<TileKeys>(
    () => ({ name: (path) => names.get(path), onFocus, register, move }),
    [names, onFocus, register, move],
  );
  const context = useMemo<TileContext>(
    () => ({ tokens: tokenHex, edgeFor, edges: edgesInForce, keys, layout, hover: anchor.set }),
    [tokenHex, edgeFor, edgesInForce, keys, layout, anchor],
  );
  const Content = redactNames ? RedactedTooltipContent : ChartTooltipContent;
  const cell = useMemo(
    () => (
      <TreemapCell
        onNodeClick={onNodeClick}
        onGroupClick={onGroupClick}
        redactNames={redactNames}
        nodeNote={nodeNote}
        dir={dir}
      />
    ),
    [onNodeClick, onGroupClick, redactNames, nodeNote, dir],
  );
  const tooltip = useMemo(
    () => <TreemapTooltip content={<Content hideLabel valueFormatter={format} />} anchor={anchor} />,
    [Content, format, anchor],
  );

  if (nodes.length === 0) return null;
  const box = chartHeightProps(height);
  const describedByProp = rest["aria-describedby"];
  return (
    // Round the container, not inside it: ResponsiveContainer sizes its ONE child, the chart.
    <TreemapTiles.Provider value={context}>
      <ChartContainer
        role="figure"
        {...rest}
        aria-describedby={description ? [describedByProp, describedBy].filter(Boolean).join(" ") : describedByProp}
        ref={rootRef}
        config={TREEMAP_CONFIG}
        className={cn(box.className, rest.className)}
        style={{ ...style, ...box.style }}
      >
        {/* No chart-level `stroke`: recharts spreads it onto the <svg> root, from where
            it inherits into every label (see TreemapCell). Each cell strokes its own rect. */}
        <RechartsTreemap data={nodes} dataKey="size" fill="var(--chart-1)" isAnimationActive={false} content={cell}>
          {tooltip}
        </RechartsTreemap>
      </ChartContainer>
      {description && (
        // Read through `aria-describedby`; `hidden`, so browse mode does not read it twice.
        <span id={describedBy} hidden>
          {description}
        </span>
      )}
    </TreemapTiles.Provider>
  );
}
