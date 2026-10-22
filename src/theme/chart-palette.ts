// Chart colour system. Single source of truth lives in the design tokens
// (:root / .dark in tokens.css): brand = indigo, money = teal/amber/purple,
// chart-1..8 = anyplot's "Imprint" hues (https://anyplot.ai/palette, 0.49 — Paul Tol
// "Muted" before, still selectable as the `paul-tol` preset).
// Returning CSS vars here makes every Recharts series theme-aware for free — the
// SVG fill/stroke resolves --chart-N against the current light/dark token set.

import { contrast, parseHex as parseRgbHex } from "./color";

/** How many categorical slots `paletteFor` cycles through: anyplot's eight hues. Amber,
 *  anyplot's ninth colour, is a semantic warning anchor and not a series slot. A preset
 *  that carries more hues (Paul Tol's nine) still writes them as `--chart-N`, but the
 *  by-index ramp wraps after eight, so the same series keeps the same colour whichever
 *  preset is active. */
export const PALETTE_SIZE = 8;

/** anyplot's colour-vision-deficiency-optimal order over the eight slots — the order
 *  that keeps the FIRST n series furthest apart under protan/deutan/tritan simulation.
 *  An option (`paletteFor(i, { order: "cvd" })`), not the default: the default order is
 *  anyplot's own slot order, so series 1 is always the green. */
export const CVD_ORDER = [0, 1, 7, 6, 4, 5, 2, 3] as const;

export interface PaletteForOptions {
  /** `"slot"` (default): anyplot's slot order. `"cvd"`: {@link CVD_ORDER}. */
  order?: "slot" | "cvd";
}

/** CVD-safe categorical colour for series `index`, as a theme-aware CSS var.
 *
 *  The first series is always slot 0 (`--chart-1`, anyplot's green), and the ramp
 *  wraps after {@link PALETTE_SIZE}.
 *
 *  Wraps in both directions, the way `strokeDash` does: JS `%` keeps the sign,
 *  so `-1 % 8` is `-1` and the plain formula named `--chart-0`, a token that does not
 *  exist — a series with no stroke at all. A fractional index is truncated, and one
 *  that is not a number (NaN, ±Infinity — an `indexOf` miss divided by something)
 *  takes the first colour rather than `var(--chart-NaN)`. */
export function paletteFor(index: number, options?: PaletteForOptions): string {
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  const position = ((i % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE;
  const slot = options?.order === "cvd" ? CVD_ORDER[position] : position;
  return `var(--chart-${slot + 1})`;
}

/** Semantic money colours, theme-aware via tokens. Pair with +/- and arrow
    cues at the call site so colour is never the only signal (CVD). */
export const CHART_COLORS = {
  income: "var(--money-income)",
  expense: "var(--money-expense)",
  net: "var(--money-net)",
  neutral: "var(--money-neutral)",
  assigned: "var(--brand)",
  activity: "var(--money-expense)",
  /** A generic total line — not money-coloured, the chart's neutral ink. */
  total: "var(--chart-ink)",
} as const;

/**
 * What a chart draws that is NOT a series (anyplot's roles, 0.49). Two inks, which are
 * the only chart colours that change between light and dark — the eight hues do not:
 *
 * - `other` / `rest` / `disabled` and confidence-`band` fills → the MUTED ink. A
 *   treemap's "rest" bucket or a pie's "Other" slice takes this instead of wrapping
 *   round to a hue the reader will match to a real series.
 * - `total` / `baseline` / `outline` → the neutral INK.
 */
export const CHART_ROLES = {
  other: "var(--chart-muted)",
  rest: "var(--chart-muted)",
  disabled: "var(--chart-muted)",
  band: "var(--chart-muted)",
  total: "var(--chart-ink)",
  baseline: "var(--chart-ink)",
  outline: "var(--chart-ink)",
} as const;

/** `--chart-ink` per theme, as hex (tokens.css holds the same two). */
export const CHART_INK_HEX = { light: "#1a1a17", dark: "#f0efe8" } as const;
/** `--chart-muted` per theme, as hex (tokens.css holds the same two). */
export const CHART_MUTED_HEX = { light: "#6b6a63", dark: "#a8a79f" } as const;

/** The 3:1 WCAG 1.4.11 asks of a filled graphical object against its surface. */
export const EDGE_MIN_CONTRAST = 3;

/**
 * The 1px edge a FILLED mark (a bar, an area, a treemap tile) needs, or `undefined`.
 *
 * anyplot's answer to hues that sit under 3:1 on the ground (cyan, lime, lavender, ochre
 * and green on cream; matte red and rose on the dark ground): outline the shape in ink,
 * so its boundary is legible while the fill keeps the hue that identifies the series.
 * Only those — a hue that clears 3:1 on every surface given stays unstroked, because an
 * outline on every bar is noise.
 *
 * `fill` must be a measurable `#rgb`/`#rrggbb`; `surfaces` are the grounds the mark can
 * sit on (the card and the page), and the WORST of them decides. Anything it cannot
 * measure gets no edge rather than a guessed one.
 */
export function chartEdge(
  fill: string,
  surfaces: readonly string[],
  ink: string = CHART_ROLES.outline,
): string | undefined {
  if (!parseRgbHex(fill)) return undefined;
  const measurable = surfaces.filter((s) => parseRgbHex(s));
  if (measurable.length === 0) return undefined;
  const worst = Math.min(...measurable.map((s) => contrast(fill, s)));
  return worst < EDGE_MIN_CONTRAST ? ink : undefined;
}

// ── Raw hex stops, by theme ────────────────────────────────────────────────
// The heatmaps interpolate colours in JS (CSS vars can't be lerped), so they
// need concrete hex per theme — i.e. the same colours DEFAULT_PRESET already
// holds, written down a second time.
//
// They are duplicated rather than imported because these two objects are the whole
// of the `@eifi1/ui-kit/chart` subpath's colour layer, and importing the preset bank
// would pull every preset's full token set into that chunk to read two of them. What
// keeps the copies together is `chart-palette.test.ts` — "has not drifted from
// DEFAULT_PRESET" — which is not optional: they HAD drifted, five of the six light
// heat stops, and the light `neutral` was still Tailwind's slate-100, a cool grey on
// the warm cream page this theme has used since #328.
//
// 0.49: the same eight hues in both themes — anyplot does not re-tune a hue for the dark
// ground, and neither does the kit any more; `chartEdge` outlines the two that fall
// under 3:1 there (matte red, rose) instead of lifting them into different colours.
const IMPRINT_HEX = ["#009e73", "#c475fd", "#4467a3", "#bd8233", "#ae3030", "#2abccd", "#954477", "#99b314"] as const;
export const PALETTE_HEX = {
  light: IMPRINT_HEX,
  dark: IMPRINT_HEX,
} as const;

/** A heatmap's interpolation stops for one theme. Open string fields so any
    palette preset (not just the built-in default) can supply its own stops. */
export interface HeatStops {
  neutral: string;
  under: string;
  over: string;
  seqLow: string;
  seqHigh: string;
  empty: string;
}

/** Diverging (variance: under←0→over) and sequential (spending intensity)
    heatmap stops, per theme — anyplot's scales (0.49). Sequential runs anyplot green →
    blue; diverging runs blue (under) ↔ paper/ink (0, the midpoint) ↔ matte red (over).
    The hues are the same in both themes; only the midpoint flips with the ground. */
export const HEATMAP_HEX = {
  light: {
    neutral: "#faf8f1", // anyplot's light paper — the diverging scale's 0
    under: "#4467a3",
    over: "#ae3030",
    seqLow: "#009e73",
    seqHigh: "#4467a3",
    empty: "rgba(148,163,184,0.14)",
  },
  dark: {
    neutral: "#1a1a17", // anyplot's ink — the diverging scale's 0 on the dark ground
    under: "#4467a3",
    over: "#ae3030",
    seqLow: "#009e73",
    seqHigh: "#4467a3",
    empty: "rgba(148,163,184,0.10)",
  },
} as const;

/** Linear interpolate two #rrggbb hexes; `t` in [0,1]. Returns #rrggbb. */
export function lerpHex(a: string, b: string, t: number): string {
  const pa = parseHex(a) ?? UNREADABLE;
  const pb = parseHex(b) ?? UNREADABLE;
  const c = (i: number) => Math.round(pa[i] + (pb[i] - pa[i]) * clamp01(t));
  return `#${[c(0), c(1), c(2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** The two inks a cell/treemap label can be set in. Near-black and near-white rather
    than #000/#fff: at full black-on-full-white the label stops looking like part of the
    same type system as the rest of the page. */
const INK_DARK = "#1a1a1a";
const INK_LIGHT = "#f8fafc";

/** Pick a legible text colour (near-black / near-white) for a solid hex fill, by
    MEASURING both against it and keeping the one that wins.

    This used to flip on Rec.601 luma > 0.6, which is a brightness heuristic and not a
    contrast measure — the two disagree on six of the eighteen default chart hues, a
    third of the ramp, and on each of those the label got the worse of the two inks.
    `#44aa99` is the plainest case: luma calls it dark, so it took white, which measures
    2.69:1 on it; near-black measures 6.18:1. keksdose measured this too and forked the
    function locally for its treemap, leaving its other two call sites on this one.

    A fill this cannot read gets `currentColor` — inherit, i.e. whatever the
    surrounding text already uses. That is the only answer that is right on both
    themes, because an unreadable fill is usually a translucent one (`HEATMAP_HEX.*
    .empty` is an `rgba()` string, and the variance heatmap does pass it here for any
    category with zero assigned and positive activity — a refund). Picking a constant
    instead is what produced the earlier bug: the unparsed fill fell through to the
    light ink, near-white on a near-white cell, and the figure was invisible. */
export function textOn(hex: string): string {
  const rgb = parseRgbHex(hex);
  if (!rgb) return "currentColor";
  // Ties go to the dark ink: at equal measured contrast it is the one that keeps a
  // small label looking like type rather than like a glow.
  return contrast(rgb, INK_DARK) >= contrast(rgb, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

/** Mid-grey, for a stop {@link lerpHex} has to interpolate but cannot read. It has
 *  to return SOME valid colour, and a grey is the one that misleads least. */
const UNREADABLE: [number, number, number] = [0x80, 0x80, 0x80];

/**
 * `#rgb` or `#rrggbb` to components, or **null** when it is neither.
 *
 * A tuple-shaped shim over `color.ts`'s parser, which is the same function and is
 * already the one `contrast` validates with — so {@link lerpHex} and {@link textOn}
 * cannot disagree about what counts as a colour.
 *
 * The **null** is the whole point of it. This used to `parseInt` whatever it was given
 * and hand the NaNs on, and both callers propagated them silently: {@link lerpHex}
 * produced the literal string `"#nannannan"`, and {@link textOn} fell through to the
 * LIGHT label colour.
 *
 * That is not hypothetical — a non-hex value ships in this very module.
 * `HEATMAP_HEX.*.empty` is an `rgba(…)` string, and the variance heatmap paints a
 * figure on an `empty` cell whenever a category has zero assigned and positive
 * activity (a refund). On the light theme the cell is near-white and the label came
 * back near-white: the number was there, and unreadable.
 */
function parseHex(hex: string): [number, number, number] | null {
  const rgb = parseRgbHex(hex);
  return rgb ? [rgb.r, rgb.g, rgb.b] : null;
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
