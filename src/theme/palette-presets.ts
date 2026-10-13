// Appearance presets — the single source of truth for the "palette switcher"
// (feedback #307). Each preset is a full set of design-token values for BOTH
// light and dark, covering the page/surface backgrounds, the brand accent, the
// semantic money trio and the 9-colour categorical chart palette, plus the
// heatmap stops. A preset is applied at runtime by writing these as CSS custom
// properties onto <html> (see palette-store.ts), which instantly re-skins every
// token-driven surface and chart. The two heatmaps and the treemap interpolate
// concrete hex in JS, so they read the same values from here via the hooks in
// palette-store.
//
// The default preset here mirrors the :root/.dark blocks in tokens.css exactly. The
// five hand-picked alternatives of #307 (`ALTERNATIVE_PRESETS`, a reference bank that
// `presetById` never resolved) were removed in 0.35 (refactor audit 2026-10, API-6c;
// deprecated in 0.34): `PALETTES` is what an app offers, and `derivePalette` makes a
// palette of its own.

import type { HeatStops } from "./chart-palette";
import { contrastStep, rememberTokenSet } from "./contrast-tokens";

export interface TokenSet {
  // Backgrounds & chrome
  bgPage: string;
  bgSurface: string;
  bgSurface2: string;
  border: string;
  textPrimary: string;
  // The two quieter text roles. Derived per preset by blending `textPrimary` toward
  // that preset's own surfaces until the contrast against the WORST of bgPage /
  // bgSurface / bgSurface2 hits 7:1 and 4.8:1 — so both clear WCAG AA for normal text
  // (4.5:1) on every surface they can land on, and both inherit the preset's warmth
  // instead of importing a cool grey from Tailwind's palette.
  textSecondary: string;
  textMuted: string;
  // Interactive brand accent
  brand: string;
  brandHover: string;
  brandContrast: string;
  // Semantic money (never red/green — CVD-safe, paired with +/- cues elsewhere)
  moneyIncome: string;
  moneyExpense: string;
  moneyNet: string;
  moneyNeutral: string;
  // Categorical chart series (Paul Tol "Muted" by default — CVD-safe), exactly 9
  chart: string[];
  // Heatmap interpolation stops (variance diverging + spending sequential)
  heat: HeatStops;
}

export interface PalettePreset {
  id: string;
  name: string;
  blurb: string;
  light: TokenSet;
  dark: TokenSet;
}

// The shipped default (feedback #328): SOLAR-DUSK warm light + INDIGO-NOIR deep
// dark surfaces — the two curated presets the user picked per mode — but with a
// SINGLE unified brand accent (indigo) across both modes rather than each
// preset's own accent (the user asked for the brand accent to stay the same).
// So the light block is Solar Dusk with its teal brand overridden to indigo, and
// the dark block is Indigo Noir (already indigo). The money trio
// (income/expense/net) drives the chart bars and stays palette-driven so those
// semantic colours adapt to each mode's contrast (best practice — feedback #328).
export const DEFAULT_PRESET: PalettePreset = {
  id: "default",
  name: "Default",
  blurb: "Solar-dusk light · indigo-noir dark",
  light: {
    // Solar Dusk (light) surfaces, with the brand unified to indigo (see above).
    bgPage: "#ede3cf",
    bgSurface: "#f6ecd9",
    // The well is the page in light (0.33, k26): #f3ead6 stood 1.02:1 from the card it
    // is inset in. Every light preset does the same; see SURFACE_L in palette-derive.ts.
    bgSurface2: "#ede3cf",
    border: "#e2d6bd",
    textPrimary: "#463f33",
    textSecondary: "#50493c",
    textMuted: "#696153",
    brand: "#4f46e5",
    brandHover: "#4338ca",
    brandContrast: "#ffffff",
    moneyIncome: "#0b6650",
    moneyExpense: "#905902",
    moneyNet: "#7a4fa3",
    moneyNeutral: "#6b6453",
    chart: ["#332288", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499"],
    heat: {
      neutral: "#f1e7d2",
      under: "#0b6650",
      over: "#9c6418",
      seqLow: "#f6ecd0",
      seqHigh: "#9c6418",
      empty: "rgba(148,163,184,0.14)",
    },
  },
  dark: {
    // Indigo Noir (dark)
    bgPage: "#0e0f1c",
    bgSurface: "#181a2c",
    bgSurface2: "#21243a",
    border: "#2e3252",
    textPrimary: "#e6e8f4",
    textSecondary: "#adafbe",
    textMuted: "#8d90a0",
    brand: "#8b93f8",
    brandHover: "#aab1fb",
    brandContrast: "#16182b",
    moneyIncome: "#22c3b6",
    // Amber-400 (#fbbf24) sat at OKLab L 0.84 while every other dark token lives
    // at 0.68–0.74, so outflows outshouted the inflows they are paired with. Same
    // hue and chroma, pulled to L 0.785 (dev#434). The heat stops below keep the
    // brighter amber on purpose: a gradient endpoint is meant to be the loudest
    // thing in its scale, and it is a fill, not a figure.
    moneyExpense: "#e4b035",
    moneyNet: "#b39aef",
    moneyNeutral: "#9aa1bd",
    chart: ["#7e72d6", "#9fd8f2", "#5fc4b0", "#3fa45f", "#bfbf5e", "#e8dda0", "#e08c9a", "#c25a78", "#cc78be"],
    heat: {
      neutral: "#363a5a",
      under: "#22c3b6",
      over: "#fbbf24",
      seqLow: "#3a2c14",
      seqHigh: "#fbbf24",
      empty: "rgba(148,163,184,0.10)",
    },
  },
};

// ── "Imprint" chart hues (feedback #119) ──────────────────────────────────────
// anyplot's categorical palette (https://anyplot.ai/palette), by a colleague of
// Marcel's. 8 hues + an amber semantic anchor, derived from Wong 2011 by a
// Petroff-style max-min ΔE search in CAM02-UCS with Machado 2009 CVD simulation —
// the same lineage as our default Paul Tol "Muted", one generation on, and tuned
// for exactly the warm cream paper our light theme uses.
//
// This preset is DEFAULT_PRESET with ONLY the 9 categorical chart hues swapped;
// surfaces, brand and the semantic money trio stay put, because those were their
// own deliberate decisions (#307/#328) and are not what the palette is for. The
// heatmap stops likewise stay teal/amber: they encode under/over, and imprint's
// own diverging ramp is red↔blue, which would fight the money semantics.
//
// Measured on our surfaces (CIEDE2000, Machado severity-100, 8 like-for-like
// slots on the cream light surface #f6ecd9) — neither palette dominates:
//   Paul Tol Muted  min-contrast 1.38 · worst-CVD ΔE00 11.8 · normal ΔE00 16.1
//   imprint         min-contrast 1.95 · worst-CVD ΔE00  7.2 · normal ΔE00 22.2
// i.e. imprint is punchier and has no near-invisible pale slot (Tol's #88ccee
// sits at 1.5:1 on cream), while Tol separates better under colour-vision
// deficiency. So this ships as a CHOICE, not as a new default.
//
// The dark set keeps imprint's hues verbatim except matte-red and rose, whose
// lightness is lifted (oklch L 0.50→0.55) because verbatim they land at 2.67:1
// and 2.76:1 on our deep-indigo dark surface — under WCAG 2.1 SC 1.4.11's 3:1
// non-text minimum. Lifted they clear it at 3.30:1 / 3.28:1. anyplot documents
// the same shortfall on their own dark ground and answers it with a stroke halo;
// lifting keeps the fix in the token layer instead of every chart component.
const IMPRINT_HUES_LIGHT = [
  "#009E73", // brand green   — first series
  "#C475FD", // lavender      — creative
  "#4467A3", // blue          — cool / info
  "#BD8233", // ochre         — earth / commodity
  "#AE3030", // matte red     — bad / loss / error
  "#2ABCCD", // cyan          — sky / tech-cool
  "#954477", // rose          — wellness / health
  "#99B314", // lime          — growth / nature
  "#DDCC77", // amber         — anyplot's semantic anchor, used here as slot 9
];
const IMPRINT_HUES_DARK = [
  "#009E73",
  "#C475FD",
  "#4467A3",
  "#BD8233",
  "#BF413E", // matte red, L-lifted for our dark surface
  "#2ABCCD",
  "#A25083", // rose, L-lifted for our dark surface
  "#99B314",
  "#DDCC77",
];

export const IMPRINT_PRESET: PalettePreset = {
  id: "imprint",
  name: "Imprint",
  blurb: "Colourblind-safe chart hues by anyplot.ai",
  light: { ...DEFAULT_PRESET.light, chart: IMPRINT_HUES_LIGHT },
  dark: { ...DEFAULT_PRESET.dark, chart: IMPRINT_HUES_DARK },
};

// The full-theme switcher from #307 stayed retired (feedback #328) — the default
// is still the single source of truth for surfaces, brand and money (its five
// alternatives are gone, see the header). What IS selectable is
// the categorical chart ramp (feedback #119), so these two presets are the live
// set; presetById falls back to the default for any stale persisted id.
/**
 * The categorical chart ramp, shared by every derived preset below.
 *
 * Paul Tol's "Muted" set, unchanged, and deliberately NOT re-derived per preset. A
 * categorical ramp solves a different problem from a UI palette — separability among
 * nine unknown siblings, rather than contrast against one known surface — and a set
 * optimised against real dichromat confusion lines beats one spaced evenly by formula.
 * `auditChartRamp` in palette-derive.ts measures it: 0.059 minimum separation in the
 * light variant, which is the number MIN_SEPARATION was calibrated under.
 *
 * It pays for that in contrast: four of the nine light hues sit below the 3:1 WCAG
 * 1.4.11 asks of a filled shape. That is not fixable by darkening them — see
 * SINGLE_LIGHTNESS_MAX_SERIES — so a chart with more than four series must carry a
 * second channel (a direct label, a pattern, a legend adjacent to the mark).
 */
const PAUL_TOL = {
  light: DEFAULT_PRESET.light.chart,
  dark: DEFAULT_PRESET.dark.chart,
} as const;

/**
 * Presets DERIVED rather than picked, by `derivePalette` from one brand colour each.
 *
 * Every text role here was solved to a contrast target against the worst of the three
 * surfaces it can land on, every semantic colour against both the page and its own badge
 * tint, and the whole set is re-checked by `__tests__/palette-audit.test.ts` ("derived
 * presets") — which re-runs the deriver and fails if these committed values drift from
 * what it now produces.
 *
 * They are committed rather than derived at import because deriving eight token sets
 * costs ~34ms, and charging every consumer that at startup for palettes most of them
 * will never select is the wrong trade. The test is what keeps the two in agreement.
 *
 * Regenerated in 0.34 (round 0.34 BUG-8): the solve now measures the hex it ships rather
 * than the float before rounding, and the audit no longer lets a hex pair pass 0.05 under
 * its threshold. 52 values moved one step (66 counting the heat stops that repeat them);
 * Contrast's neutrals lost half their slate tint, its brand having half the chroma at
 * which the neutrals carry a hue in full.
 */
export const DERIVED_PRESETS: PalettePreset[] = [
  {
    id: "ink",
    name: "Ink",
    blurb: "Cool blue-grey ground · solved for AAA body text",
    light: {
      bgPage: "#dce2ef",
      bgSurface: "#e6edfa",
      bgSurface2: "#dce2ef",
      border: "#b0bace",
      textPrimary: "#2e3139",
      textSecondary: "#454850",
      textMuted: "#5f636c",
      brand: "#2f5fd0",
      brandHover: "#1f4cbc",
      brandContrast: "#ffffff",
      moneyIncome: "#00725f",
      moneyExpense: "#8e5900",
      moneyNet: "#7356a2",
      moneyNeutral: "#61646c",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#dce2ef",
        under: "#00725f",
        over: "#8e5900",
        seqLow: "#fee3c5",
        seqHigh: "#8e5900",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#090d15",
      bgSurface: "#131720",
      bgSurface2: "#1d212b",
      border: "#363e4f",
      textPrimary: "#c8ccd6",
      textSecondary: "#a7abb5",
      textMuted: "#858a92",
      brand: "#3466d7",
      brandHover: "#2353c3",
      brandContrast: "#ffffff",
      moneyIncome: "#009a80",
      moneyExpense: "#b77b29",
      moneyNet: "#9679c9",
      moneyNeutral: "#a1a5ac",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#1d212b",
        under: "#009a80",
        over: "#b77b29",
        seqLow: "#331f05",
        seqHigh: "#b77b29",
        empty: "rgba(160,170,190,0.10)",
      },
    },
  },
  {
    id: "moss",
    name: "Moss",
    blurb: "Green ground · solved for AAA body text",
    light: {
      bgPage: "#d8e6dd",
      bgSurface: "#e3f1e8",
      bgSurface2: "#d8e6dd",
      border: "#abbfb2",
      textPrimary: "#2c332e",
      textSecondary: "#424b45",
      textMuted: "#5d6660",
      brand: "#2f7a52",
      brandHover: "#196842",
      brandContrast: "#ffffff",
      moneyIncome: "#00725f",
      moneyExpense: "#8e5900",
      moneyNet: "#7356a2",
      moneyNeutral: "#5f6662",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#d8e6dd",
        under: "#00725f",
        over: "#8e5900",
        seqLow: "#fee3c5",
        seqHigh: "#8e5900",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#060f0a",
      bgSurface: "#101a14",
      bgSurface2: "#1a241e",
      border: "#314337",
      textPrimary: "#c6cfc9",
      textSecondary: "#a5aea8",
      textMuted: "#838c86",
      brand: "#317b53",
      brandHover: "#1c6943",
      brandContrast: "#ffffff",
      moneyIncome: "#009a80",
      moneyExpense: "#b87c2a",
      moneyNet: "#977ac9",
      moneyNeutral: "#9fa7a2",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#1a241e",
        under: "#009a80",
        over: "#b87c2a",
        seqLow: "#331f05",
        seqHigh: "#b87c2a",
        empty: "rgba(160,170,190,0.10)",
      },
    },
  },
  {
    id: "plum",
    name: "Plum",
    blurb: "Violet ground · solved for AAA body text",
    light: {
      bgPage: "#e7dfea",
      bgSurface: "#f2e9f5",
      bgSurface2: "#e7dfea",
      border: "#c2b5c6",
      textPrimary: "#352f36",
      textSecondary: "#4c464e",
      textMuted: "#676169",
      brand: "#7b3f8f",
      brandHover: "#692d7d",
      brandContrast: "#ffffff",
      moneyIncome: "#00715e",
      moneyExpense: "#8d5800",
      moneyNet: "#7355a2",
      moneyNeutral: "#676269",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#e7dfea",
        under: "#00715e",
        over: "#8d5800",
        seqLow: "#fee3c5",
        seqHigh: "#8d5800",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#100b12",
      bgSurface: "#1b151d",
      bgSurface2: "#251f27",
      border: "#453b48",
      textPrimary: "#d0cad2",
      textSecondary: "#afa9b1",
      textMuted: "#8d8790",
      brand: "#9154a6",
      brandHover: "#7f4293",
      brandContrast: "#ffffff",
      moneyIncome: "#009980",
      moneyExpense: "#b77b29",
      moneyNet: "#9679c9",
      moneyNeutral: "#a8a2aa",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#251f27",
        under: "#009980",
        over: "#b77b29",
        seqLow: "#331f05",
        seqHigh: "#b77b29",
        empty: "rgba(160,170,190,0.10)",
      },
    },
  },
  {
    id: "contrast",
    name: "High contrast",
    blurb: "Near-neutral ground · text solved to 13:1 / 8.5:1 / 5.5:1",
    light: {
      bgPage: "#e1e2e3",
      bgSurface: "#ecedee",
      bgSurface2: "#e1e2e3",
      border: "#b8babc",
      textPrimary: "#1b1d21",
      textSecondary: "#3a3c40",
      textMuted: "#55585c",
      brand: "#1f2937",
      brandHover: "#111b28",
      brandContrast: "#ffffff",
      moneyIncome: "#00715e",
      moneyExpense: "#8d5800",
      moneyNet: "#7255a1",
      moneyNeutral: "#616467",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#e1e2e3",
        under: "#00715e",
        over: "#8d5800",
        seqLow: "#fee3c5",
        seqHigh: "#8d5800",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#0c0d0e",
      bgSurface: "#171718",
      bgSurface2: "#212122",
      border: "#3d3e3f",
      textPrimary: "#e4e8ec",
      textSecondary: "#b9bdc1",
      textMuted: "#95979c",
      brand: "#556c8e",
      brandHover: "#455b7c",
      brandContrast: "#ffffff",
      moneyIncome: "#009a80",
      moneyExpense: "#b77b29",
      moneyNet: "#9679c9",
      moneyNeutral: "#a2a5a8",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#212122",
        under: "#009a80",
        over: "#b77b29",
        seqLow: "#331f05",
        seqHigh: "#b77b29",
        empty: "rgba(160,170,190,0.10)",
      },
    },
  },
];

export const PALETTES: PalettePreset[] = [DEFAULT_PRESET, IMPRINT_PRESET, ...DERIVED_PRESETS];

export function presetById(id: string): PalettePreset {
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PRESET;
}

/**
 * Write a token set onto an element's inline style as CSS custom properties.
 *
 * This is the only writer, and there is no un-writer: `presetById` falls back to
 * `DEFAULT_PRESET` and this then writes the full set, so returning to the default
 * APPLIES it rather than clearing anything. A `clearTokenSet` and the hand-kept
 * 24-name `TOKEN_VARS` list it looped over used to live here, both exported, both
 * called by nobody in either consumer — a second copy of these property names with
 * nothing comparing the two, so adding a token here and forgetting it there would
 * have been silent and only a dead function would have noticed. The list is gone;
 * the test beside this asserts instead that every field of a `TokenSet` reaches the
 * element, which is what that list was standing in for.
 *
 * **More contrast (0.32, docs/text-size-harmonization.md §5, §10.5).** With `contrast`
 * the text and border tokens are written one step stronger — in a light set the well and
 * the four money colours too (0.36, docs/colour-roles-harmonization.md §13) — and `--text-placeholder` —
 * otherwise derived in tokens.css — is written inline too; without it that inline
 * placeholder is removed again, so the stylesheet's formula applies. The step is made
 * HERE because these tokens are inline: no `[data-contrast=more]` rule could beat them.
 *
 * `contrast` defaults to the element's own `data-contrast="more"`, which the contrast
 * layer (`applyContrast`, `useApplyContrast`) sets first. That is how the palette and the
 * contrast cooperate without knowing each other: a palette change re-applies through
 * here and keeps the contrast, and a contrast change re-applies the set remembered here.
 */
export function applyTokenSet(
  el: HTMLElement,
  t: TokenSet,
  contrast: boolean = el.getAttribute("data-contrast") === "more",
): void {
  rememberTokenSet(el, t);
  const step = contrast ? contrastStep(t) : null;
  el.style.setProperty("--bg-page", t.bgPage);
  el.style.setProperty("--bg-surface", t.bgSurface);
  // The light well and money step under More contrast (0.36, colour-roles §13); in dark
  // and at Standard `well` is null and the set's own are written.
  el.style.setProperty("--bg-surface-2", step?.well?.bgSurface2 ?? t.bgSurface2);
  el.style.setProperty("--border", step?.border ?? t.border);
  el.style.setProperty("--text-primary", t.textPrimary);
  el.style.setProperty("--text-secondary", step?.textSecondary ?? t.textSecondary);
  el.style.setProperty("--text-muted", step?.textMuted ?? t.textMuted);
  if (step) el.style.setProperty("--text-placeholder", step.textPlaceholder);
  else el.style.removeProperty("--text-placeholder");
  el.style.setProperty("--brand", t.brand);
  el.style.setProperty("--brand-hover", t.brandHover);
  el.style.setProperty("--brand-contrast", t.brandContrast);
  el.style.setProperty("--money-income", step?.well?.moneyIncome ?? t.moneyIncome);
  el.style.setProperty("--money-expense", step?.well?.moneyExpense ?? t.moneyExpense);
  el.style.setProperty("--money-net", step?.well?.moneyNet ?? t.moneyNet);
  el.style.setProperty("--money-neutral", step?.well?.moneyNeutral ?? t.moneyNeutral);
  t.chart.forEach((c, i) => el.style.setProperty(`--chart-${i + 1}`, c));
}
