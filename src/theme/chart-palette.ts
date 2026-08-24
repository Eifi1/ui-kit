// Chart colour system. Single source of truth lives in the design tokens
// (:root / .dark in tokens.css): brand = indigo, money = teal/amber/purple,
// chart-1..9 = Paul Tol "Muted" (CVD-safe across protan/deutan/tritan).
// Returning CSS vars here makes every Recharts series theme-aware for free — the
// SVG fill/stroke resolves --chart-N against the current light/dark token set.

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
// need concrete hex per theme. Keep these in sync with the tokens.
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
    neutral: "#f1f5f9", // slate-100
    under: "#0f766e", // teal-700
    over: "#b45309", // amber-700
    seqLow: "#fef3c7", // amber-100
    seqHigh: "#b45309", // amber-700
    empty: "rgba(148,163,184,0.14)",
  },
  dark: {
    neutral: "#334155", // slate-700
    under: "#2dd4bf", // teal-400
    over: "#fbbf24", // amber-400
    seqLow: "#3f2d10", // dim amber, sits just above slate-950
    seqHigh: "#fbbf24", // amber-400
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

/** Pick a legible text colour (near-black / near-white) for a solid hex fill,
    flipping by perceived luminance so cell/treemap labels keep contrast.

    A fill this cannot read gets `currentColor` — inherit, i.e. whatever the
    surrounding text already uses. That is the only answer that is right on both
    themes, because an unreadable fill is usually a translucent one (`HEATMAP_HEX.*
    .empty` is an `rgba()` string, and the variance heatmap does pass it here for any
    category with zero assigned and positive activity — a refund). Picking a constant
    instead is what produced the bug: `NaN > 0.6` is false, so the label came back
    near-white on a near-white cell and the figure was invisible. */
export function textOn(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "currentColor";
  const [r, g, b] = rgb;
  // Rec.601 luma; >0.6 → dark text, else light text.
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? "#1a1a1a" : "#f8fafc";
}

/** Mid-grey, for a stop {@link lerpHex} has to interpolate but cannot read. It has
 *  to return SOME valid colour, and a grey is the one that misleads least. */
const UNREADABLE: [number, number, number] = [0x80, 0x80, 0x80];

/**
 * `#rgb` or `#rrggbb` to components, or **null** when it is neither.
 *
 * This used to `parseInt` whatever it was given and hand the NaNs on, and both
 * callers propagated them silently: {@link lerpHex} produced the literal string
 * `"#nannannan"`, and {@link textOn} computed `NaN > 0.6 === false` and returned the
 * LIGHT label colour.
 *
 * That is not hypothetical — a non-hex value ships in this very module.
 * `HEATMAP_HEX.*.empty` is an `rgba(…)` string, and the variance heatmap paints a
 * figure on an `empty` cell whenever a category has zero assigned and positive
 * activity (a refund). On the light theme the cell is near-white and the label came
 * back near-white: the number was there, and unreadable.
 */
function parseHex(hex: string): [number, number, number] | null {
  const h = hex.startsWith("#") ? hex.slice(1) : hex;
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
