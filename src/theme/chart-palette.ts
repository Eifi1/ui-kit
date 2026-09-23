// Chart colour system. Single source of truth lives in the design tokens
// (:root / .dark in tokens.css): brand = indigo, money = teal/amber/purple,
// chart-1..9 = Paul Tol "Muted" (CVD-safe across protan/deutan/tritan).
// Returning CSS vars here makes every Recharts series theme-aware for free — the
// SVG fill/stroke resolves --chart-N against the current light/dark token set.

import { contrast, parseHex as parseRgbHex } from "./color";

const PALETTE_SIZE = 9;

/** CVD-safe categorical colour for series `index`, as a theme-aware CSS var. */
export function paletteFor(index: number): string {
  return `var(--chart-${(index % PALETTE_SIZE) + 1})`;
}

/** Semantic money colours, theme-aware via tokens. Pair with +/- and arrow
    cues at the call site so colour is never the only signal (CVD). */
export const CHART_COLORS = {
  income: "var(--money-income)",
  expense: "var(--money-expense)",
  net: "var(--money-net)",
  assigned: "var(--brand)",
  activity: "var(--money-expense)",
} as const;

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
export const PALETTE_HEX = {
  light: ["#332288", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499"],
  dark: ["#7e72d6", "#9fd8f2", "#5fc4b0", "#3fa45f", "#bfbf5e", "#e8dda0", "#e08c9a", "#c25a78", "#cc78be"],
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
    heatmap stops, per theme. Teal = under/good, amber = over/spend = bad. */
export const HEATMAP_HEX = {
  light: {
    neutral: "#f1e7d2", // the cream surface itself, not a cool grey
    under: "#0b6650", // DEFAULT_PRESET.light.moneyIncome
    over: "#9c6418", // DEFAULT_PRESET.light.moneyExpense, warmed to the page
    seqLow: "#f6ecd0",
    seqHigh: "#9c6418",
    empty: "rgba(148,163,184,0.14)",
  },
  dark: {
    neutral: "#363a5a", // one step above --border on the indigo-noir surface
    under: "#22c3b6", // DEFAULT_PRESET.dark.moneyIncome
    // Brighter than dark.moneyExpense (#e4b035) on purpose: a gradient endpoint is
    // meant to be the loudest thing in its scale, and it is a fill, not a figure.
    over: "#fbbf24",
    seqLow: "#3a2c14", // dim amber, sits just above the page
    seqHigh: "#fbbf24",
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
