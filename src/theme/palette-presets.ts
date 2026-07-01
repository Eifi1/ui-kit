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

import { PALETTE_HEX } from "./chart-palette";
import type { HeatStops } from "./chart-palette";

export interface TokenSet {
  // Backgrounds & chrome
  bgPage: string;
  bgSurface: string;
  bgSurface2: string;
  border: string;
  textPrimary: string;
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

// The shipped default — mirrored by the :root / .dark blocks in tokens.css.
// Combines the user's picks (feedback #307 rework): SOLAR-DUSK warm light + ZINC
// neutral dark. The light surfaces are deliberately a low-glare warm off-white
// (NOT pure white) at a dialled-down brightness — research on long-session light
// themes favours an off-white background + dark-grey (not pure-black) text to
// cut eye strain. The accents (indigo brand, teal/amber/violet money, Paul Tol
// Muted charts) are kept IDENTICAL across light & dark so the app has one
// identity even though the base surface hue differs by mode (warm vs neutral).
export const DEFAULT_PRESET: PalettePreset = {
  id: "default",
  name: "Default",
  blurb: "Warm low-glare light · neutral dark",
  light: {
    bgPage: "#e9e2d2", // warm dim sand — easier on the eyes than bright cream
    bgSurface: "#f4efe3", // warm off-white, gently elevated above the page
    bgSurface2: "#e2dac7",
    border: "#d9cfba",
    textPrimary: "#3a352b", // warm dark grey, not pure black
    brand: "#4f46e5",
    brandHover: "#4338ca",
    brandContrast: "#ffffff",
    moneyIncome: "#0f766e",
    moneyExpense: "#b45309",
    moneyNet: "#6d28d9",
    moneyNeutral: "#6b6253",
    chart: [...PALETTE_HEX.light],
    heat: {
      neutral: "#e2dac7",
      under: "#0f766e",
      over: "#b45309",
      seqLow: "#f4e6cb",
      seqHigh: "#b45309",
      empty: "rgba(148,163,184,0.14)",
    },
  },
  dark: {
    bgPage: "#0a0a0c", // zinc near-black
    bgSurface: "#18181b",
    bgSurface2: "#27272a",
    border: "#34343a",
    textPrimary: "#e8e8ea",
    brand: "#818cf8",
    brandHover: "#a5b4fc",
    brandContrast: "#1e1b4b",
    moneyIncome: "#2dd4bf",
    moneyExpense: "#fbbf24",
    moneyNet: "#a98fd6",
    moneyNeutral: "#a1a1aa",
    chart: [...PALETTE_HEX.dark],
    heat: {
      neutral: "#34343a",
      under: "#2dd4bf",
      over: "#fbbf24",
      seqLow: "#3a2410",
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
      brand: "#8b93f8",
      brandHover: "#aab1fb",
      brandContrast: "#16182b",
      moneyIncome: "#22c3b6",
      moneyExpense: "#fbbf24",
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
      brand: "#2c6979",
      brandHover: "#1f515f",
      brandContrast: "#ffffff",
      moneyIncome: "#0b6650",
      moneyExpense: "#9c6418",
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

export const PALETTES: PalettePreset[] = [DEFAULT_PRESET, ...ALTERNATIVE_PRESETS];

export function presetById(id: string): PalettePreset {
  return PALETTES.find((p) => p.id === id) ?? DEFAULT_PRESET;
}

// The CSS custom properties a preset writes onto <html>. Also used to clear the
// overrides when returning to the default.
export const TOKEN_VARS = [
  "--bg-page",
  "--bg-surface",
  "--bg-surface-2",
  "--border",
  "--text-primary",
  "--brand",
  "--brand-hover",
  "--brand-contrast",
  "--money-income",
  "--money-expense",
  "--money-net",
  "--money-neutral",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-7",
  "--chart-8",
  "--chart-9",
] as const;

/** Write a token set onto an element's inline style as CSS custom properties. */
export function applyTokenSet(el: HTMLElement, t: TokenSet): void {
  el.style.setProperty("--bg-page", t.bgPage);
  el.style.setProperty("--bg-surface", t.bgSurface);
  el.style.setProperty("--bg-surface-2", t.bgSurface2);
  el.style.setProperty("--border", t.border);
  el.style.setProperty("--text-primary", t.textPrimary);
  el.style.setProperty("--brand", t.brand);
  el.style.setProperty("--brand-hover", t.brandHover);
  el.style.setProperty("--brand-contrast", t.brandContrast);
  el.style.setProperty("--money-income", t.moneyIncome);
  el.style.setProperty("--money-expense", t.moneyExpense);
  el.style.setProperty("--money-net", t.moneyNet);
  el.style.setProperty("--money-neutral", t.moneyNeutral);
  t.chart.forEach((c, i) => el.style.setProperty(`--chart-${i + 1}`, c));
}

/** Remove all preset overrides so the tokens.css :root/.dark defaults take over. */
export function clearTokenSet(el: HTMLElement): void {
  for (const v of TOKEN_VARS) el.style.removeProperty(v);
}
