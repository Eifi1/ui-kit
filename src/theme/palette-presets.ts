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
// The alternative presets below were designed + accessibility-vetted as a set
// (each is CVD-safe across protan/deutan/tritan, money is never red/green, and
// text/background contrast clears WCAG AA on both themes). To promote one to the
// app-wide default, copy its values into the :root/.dark blocks in tokens.css
// (the default preset here mirrors those exactly).

import type { HeatStops } from "./chart-palette";

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
    bgSurface2: "#f3ead6",
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

// Vetted alternatives to preview (CVD-safe, WCAG-AA on both themes).
export const ALTERNATIVE_PRESETS: PalettePreset[] = [
  {
    id: "warm-paper",
    name: "Warm Paper",
    blurb: "Cream paper · warm charcoal",
    light: {
      bgPage: "#ece5d6",
      bgSurface: "#f5efe3",
      bgSurface2: "#efe9dc",
      border: "#e2dcce",
      textPrimary: "#2b2622",
      textSecondary: "#4f4a44",
      textMuted: "#68625b",
      brand: "#9a5b34",
      brandHover: "#824827",
      brandContrast: "#fdf8f2",
      moneyIncome: "#0e7490",
      moneyExpense: "#8f3f0a",
      moneyNet: "#7c4dab",
      moneyNeutral: "#6b6258",
      chart: ["#332288", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499"],
      heat: {
        neutral: "#efe9dc",
        under: "#0e7490",
        over: "#b45309",
        seqLow: "#fbeed2",
        seqHigh: "#b45309",
        empty: "rgba(148,163,184,0.14)",
      },
    },
    dark: {
      bgPage: "#211e1a",
      bgSurface: "#2a2622",
      bgSurface2: "#322d27",
      border: "#3d372f",
      textPrimary: "#e8e2d6",
      textSecondary: "#bfb9af",
      textMuted: "#9e998f",
      brand: "#e0986a",
      brandHover: "#ecae85",
      brandContrast: "#2a1c10",
      moneyIncome: "#4dd4c4",
      moneyExpense: "#fbbf3a",
      moneyNet: "#bfa0e0",
      moneyNeutral: "#a39a8c",
      chart: ["#7e72d6", "#9fd8f2", "#5fc4b0", "#3fa45f", "#bfbf5e", "#e8dda0", "#e08c9a", "#cf6488", "#cc78be"],
      heat: {
        neutral: "#3a352e",
        under: "#4dd4c4",
        over: "#fbbf3a",
        seqLow: "#2c2014",
        seqHigh: "#fbbf3a",
        empty: "rgba(148,163,184,0.10)",
      },
    },
  },
  {
    id: "nord-frost",
    name: "Nord Frost",
    blurb: "Cool snow · polar night",
    light: {
      bgPage: "#e2e7ef",
      bgSurface: "#f0f3f8",
      bgSurface2: "#e1e6ee",
      border: "#d3dae6",
      textPrimary: "#2e3440",
      textSecondary: "#454b56",
      textMuted: "#5e636e",
      brand: "#3b6ea5",
      brandHover: "#305a86",
      brandContrast: "#ffffff",
      moneyIncome: "#0f8060",
      moneyExpense: "#b8431a",
      moneyNet: "#6b4fa0",
      moneyNeutral: "#5b6577",
      chart: ["#3a6ea5", "#56b6c2", "#2f7d4f", "#cdb52f", "#d05f7a", "#9a3f93", "#4d4bbf", "#dd6a2c", "#7a8aa8"],
      heat: {
        neutral: "#e1e6ee",
        under: "#0f8060",
        over: "#b8431a",
        seqLow: "#f0f3f7",
        seqHigh: "#a14708",
        empty: "rgba(148,163,184,0.14)",
      },
    },
    dark: {
      bgPage: "#242933",
      bgSurface: "#2e3440",
      bgSurface2: "#3b4252",
      border: "#434c5e",
      textPrimary: "#eceff4",
      textSecondary: "#d4d7de",
      textMuted: "#afb3bc",
      brand: "#88c0d0",
      brandHover: "#a3d4e0",
      brandContrast: "#1c2027",
      moneyIncome: "#4ecf9c",
      moneyExpense: "#e8a24f",
      moneyNet: "#caa0e0",
      moneyNeutral: "#9aa5b8",
      chart: ["#7fb4e6", "#5ec9d6", "#5cc483", "#dccb6b", "#e87e96", "#bd6fce", "#9389f2", "#ef8f4a", "#8693ad"],
      heat: {
        neutral: "#3b4252",
        under: "#4ecf9c",
        over: "#e8a24f",
        seqLow: "#33373f",
        seqHigh: "#e8a24f",
        empty: "rgba(148,163,184,0.10)",
      },
    },
  },
  {
    id: "indigo-noir",
    name: "Indigo Noir",
    blurb: "Crisp light · deep indigo",
    light: {
      bgPage: "#e8eaf2",
      bgSurface: "#f6f7fb",
      bgSurface2: "#eef1f8",
      border: "#dadfeb",
      textPrimary: "#1b1f2e",
      textSecondary: "#494d5a",
      textMuted: "#626572",
      brand: "#4338ca",
      brandHover: "#3730a3",
      brandContrast: "#ffffff",
      moneyIncome: "#0c6478",
      moneyExpense: "#b45309",
      moneyNet: "#7c3aed",
      moneyNeutral: "#5b6478",
      chart: ["#332288", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499"],
      heat: {
        neutral: "#eef1f7",
        under: "#0c6478",
        over: "#b45309",
        seqLow: "#fdeed4",
        seqHigh: "#b45309",
        empty: "rgba(148,163,184,0.14)",
      },
    },
    dark: {
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
      // Kept byte-identical to DEFAULT_PRESET.dark, which IS this preset (dev#434).
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
  },
  {
    id: "solar-dusk",
    name: "Solar Dusk",
    blurb: "Solarized warmth, easy on the eyes",
    light: {
      bgPage: "#ede3cf",
      bgSurface: "#f6ecd9",
      bgSurface2: "#f3ead6",
      border: "#e2d6bd",
      textPrimary: "#463f33",
      textSecondary: "#50493c",
      textMuted: "#696153",
      brand: "#2c6979",
      brandHover: "#1f515f",
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
      bgPage: "#0e1a1f",
      bgSurface: "#15272e",
      bgSurface2: "#1d333c",
      border: "#2a4750",
      textPrimary: "#d6cdb8",
      textSecondary: "#c2bdab",
      textMuted: "#9c9d91",
      brand: "#5fb8cc",
      brandHover: "#82cfe0",
      brandContrast: "#0a161a",
      moneyIncome: "#22b884",
      moneyExpense: "#f0b94e",
      moneyNet: "#bfa0e0",
      moneyNeutral: "#9aa3a0",
      chart: ["#7e72d6", "#9fd8f2", "#5fc4b0", "#3fa45f", "#bfbf5e", "#e8dda0", "#e08c9a", "#c25a78", "#c873c0"],
      heat: {
        neutral: "#26424b",
        under: "#22b884",
        over: "#f0b94e",
        seqLow: "#1f3138",
        seqHigh: "#f0b94e",
        empty: "rgba(148,163,184,0.10)",
      },
    },
  },
  {
    id: "zinc-mono",
    name: "Zinc Mono",
    blurb: "True-neutral chrome · data pops",
    light: {
      bgPage: "#ececec",
      bgSurface: "#f7f7f7",
      bgSurface2: "#f4f4f5",
      border: "#e4e4e7",
      textPrimary: "#18181b",
      textSecondary: "#4e4e50",
      textMuted: "#676769",
      brand: "#1d4ed8",
      brandHover: "#1e40af",
      brandContrast: "#ffffff",
      moneyIncome: "#0e7490",
      moneyExpense: "#cf4310",
      moneyNet: "#7c3aed",
      moneyNeutral: "#52525b",
      chart: ["#332288", "#88ccee", "#44aa99", "#117733", "#999933", "#ddcc77", "#cc6677", "#882255", "#aa4499"],
      heat: {
        neutral: "#f4f4f5",
        under: "#0e7490",
        over: "#cf4310",
        seqLow: "#fdeede",
        seqHigh: "#cf4310",
        empty: "rgba(148,163,184,0.14)",
      },
    },
    dark: {
      bgPage: "#09090b",
      bgSurface: "#18181b",
      bgSurface2: "#27272a",
      border: "#3f3f46",
      textPrimary: "#f4f4f5",
      textSecondary: "#b2b2b3",
      textMuted: "#929294",
      brand: "#60a5fa",
      brandHover: "#93c5fd",
      brandContrast: "#0b1220",
      moneyIncome: "#22d3ee",
      moneyExpense: "#f97316",
      moneyNet: "#c4b5fd",
      moneyNeutral: "#a1a1aa",
      chart: ["#7e72d6", "#9fd8f2", "#5fc4b0", "#3fa45f", "#bfbf5e", "#e8dda0", "#e08c9a", "#c25a78", "#cc78be"],
      heat: {
        neutral: "#3f3f46",
        under: "#22d3ee",
        over: "#f97316",
        seqLow: "#3a2410",
        seqHigh: "#f97316",
        empty: "rgba(148,163,184,0.10)",
      },
    },
  },
];

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
// is still the single source of truth for surfaces, brand and money, and
// ALTERNATIVE_PRESETS above remains a reference bank only. What IS selectable is
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
 * tint, and the whole set is re-checked by `derived-presets.test.ts` — which re-runs the
 * deriver and fails if these committed values drift from what it now produces.
 *
 * They are committed rather than derived at import because deriving eight token sets
 * costs ~34ms, and charging every consumer that at startup for palettes most of them
 * will never select is the wrong trade. The test is what keeps the two in agreement.
 */
export const DERIVED_PRESETS: PalettePreset[] = [
  {
    id: "ink",
    name: "Ink",
    blurb: "Cool blue-grey ground · solved for AAA body text",
    light: {
      bgPage: "#dce2ef",
      bgSurface: "#e6edfa",
      bgSurface2: "#e1e8f5",
      border: "#b0bace",
      textPrimary: "#2e3139",
      textSecondary: "#454950",
      textMuted: "#5f646c",
      brand: "#2f5fd0",
      brandHover: "#1f4cbc",
      brandContrast: "#ffffff",
      moneyIncome: "#00735f",
      moneyExpense: "#8e5900",
      moneyNet: "#7356a2",
      moneyNeutral: "#656970",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#e1e8f5",
        under: "#00735f",
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
      border: "#363e4e",
      textPrimary: "#c7ccd5",
      textSecondary: "#a7abb4",
      textMuted: "#858992",
      brand: "#3364d5",
      brandHover: "#4477ea",
      brandContrast: "#ffffff",
      moneyIncome: "#00997f",
      moneyExpense: "#b77b29",
      moneyNet: "#9679c9",
      moneyNeutral: "#a1a5ac",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#1d212b",
        under: "#00997f",
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
      bgSurface2: "#deece3",
      border: "#abbfb2",
      textPrimary: "#2c342e",
      textSecondary: "#434b45",
      textMuted: "#5d6660",
      brand: "#2f7a52",
      brandHover: "#196842",
      brandContrast: "#ffffff",
      moneyIncome: "#00735f",
      moneyExpense: "#8f5a00",
      moneyNet: "#7457a3",
      moneyNeutral: "#646b66",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#deece3",
        under: "#00735f",
        over: "#8f5a00",
        seqLow: "#fee3c4",
        seqHigh: "#8f5a00",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#060f0a",
      bgSurface: "#101a14",
      bgSurface2: "#1a241e",
      border: "#314237",
      textPrimary: "#c5cfc9",
      textSecondary: "#a4aea8",
      textMuted: "#838c86",
      brand: "#2f7a52",
      brandHover: "#428c63",
      brandContrast: "#ffffff",
      moneyIncome: "#009a80",
      moneyExpense: "#b87b2a",
      moneyNet: "#9779c9",
      moneyNeutral: "#9fa7a2",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#1a241e",
        under: "#009a80",
        over: "#b87b2a",
        seqLow: "#331f05",
        seqHigh: "#b87b2a",
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
      bgSurface2: "#ece4ef",
      border: "#c2b6c6",
      textPrimary: "#342f36",
      textSecondary: "#4c474e",
      textMuted: "#676169",
      brand: "#7b3f8f",
      brandHover: "#692d7d",
      brandContrast: "#ffffff",
      moneyIncome: "#00725e",
      moneyExpense: "#8e5900",
      moneyNet: "#7356a2",
      moneyNeutral: "#6c676e",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#ece4ef",
        under: "#00725e",
        over: "#8e5900",
        seqLow: "#fee3c5",
        seqHigh: "#8e5900",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#100b12",
      bgSurface: "#1b151d",
      bgSurface2: "#251f27",
      border: "#453a48",
      textPrimary: "#d0cad3",
      textSecondary: "#afa9b1",
      textMuted: "#8d878f",
      brand: "#8f52a4",
      brandHover: "#a264b7",
      brandContrast: "#ffffff",
      moneyIncome: "#00997f",
      moneyExpense: "#b77b29",
      moneyNet: "#9679c8",
      moneyNeutral: "#a8a2aa",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#251f27",
        under: "#00997f",
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
      bgPage: "#e0e2e5",
      bgSurface: "#ebedef",
      bgSurface2: "#e6e8ea",
      border: "#b7babe",
      textPrimary: "#191d24",
      textSecondary: "#373c44",
      textMuted: "#535860",
      brand: "#1f2937",
      brandHover: "#111b28",
      brandContrast: "#ffffff",
      moneyIncome: "#00735f",
      moneyExpense: "#8e5900",
      moneyNet: "#7456a2",
      moneyNeutral: "#656970",
      chart: PAUL_TOL.light,
      heat: {
        neutral: "#e6e8ea",
        under: "#00735f",
        over: "#8e5900",
        seqLow: "#fee3c5",
        seqHigh: "#8e5900",
        empty: "rgba(120,110,95,0.14)",
      },
    },
    dark: {
      bgPage: "#0c0d0f",
      bgSurface: "#161719",
      bgSurface2: "#202123",
      border: "#3c3e41",
      textPrimary: "#e1e7f0",
      textSecondary: "#b7bdc5",
      textMuted: "#9197a0",
      brand: "#546c8d",
      brandHover: "#657e9f",
      brandContrast: "#ffffff",
      moneyIncome: "#00997f",
      moneyExpense: "#b77b29",
      moneyNet: "#9679c8",
      moneyNeutral: "#a0a5ac",
      chart: PAUL_TOL.dark,
      heat: {
        neutral: "#202123",
        under: "#00997f",
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
 */
export function applyTokenSet(el: HTMLElement, t: TokenSet): void {
  el.style.setProperty("--bg-page", t.bgPage);
  el.style.setProperty("--bg-surface", t.bgSurface);
  el.style.setProperty("--bg-surface-2", t.bgSurface2);
  el.style.setProperty("--border", t.border);
  el.style.setProperty("--text-primary", t.textPrimary);
  el.style.setProperty("--text-secondary", t.textSecondary);
  el.style.setProperty("--text-muted", t.textMuted);
  el.style.setProperty("--brand", t.brand);
  el.style.setProperty("--brand-hover", t.brandHover);
  el.style.setProperty("--brand-contrast", t.brandContrast);
  el.style.setProperty("--money-income", t.moneyIncome);
  el.style.setProperty("--money-expense", t.moneyExpense);
  el.style.setProperty("--money-net", t.moneyNet);
  el.style.setProperty("--money-neutral", t.moneyNeutral);
  t.chart.forEach((c, i) => el.style.setProperty(`--chart-${i + 1}`, c));
}
