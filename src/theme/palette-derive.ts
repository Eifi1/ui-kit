import type { ThemeMode } from "./theme-store";
import type { TokenSet } from "./palette-presets";
import type { HeatStops } from "./chart-palette";
import {
  contrast,
  deltaE,
  toHex,
  hexToOklch,
  oklchToHex,
  parseHex,
  rgbToOklch,
  simulateCvd,
  solveLightness,
} from "./color";
import type { CvdType, Oklch } from "./color";

/**
 * Build a whole palette from one brand colour, plus any number of colours pinned by
 * hand, with every contrast ratio SOLVED rather than chosen and then hoped for.
 *
 * The presets this package shipped were assembled by eye and annotated with the ratios
 * they were believed to hold — `tokens.css` records "7.0:1 and 4.8:1", and
 * `palette-presets.ts` records "2.67:1 … lifted they clear it at 3.30:1". Nothing
 * computed any of them, and the audit found four of the nine default light chart hues
 * below the 3:1 that WCAG 1.4.11 requires of a graphical object. A comment is not a
 * test. Everything here is derived to a target and then measured, and
 * {@link auditPalette} returns the measurements so a caller can refuse a palette that
 * does not hold up.
 *
 * WHAT IS DERIVED AND WHAT IS NOT. The UI palette and the CATEGORICAL CHART RAMP solve
 * different problems and are deliberately kept apart. A UI colour needs contrast against
 * one known surface and carries a fixed meaning; a chart colour needs to stay separable
 * from eight unknown siblings, at roughly equal salience, with no implied order.
 * Optimising a set for one makes it worse at the other, which is why `deriveTokenSet`
 * leaves `chart` alone unless you explicitly ask for {@link deriveChartRamp}.
 */

/* ── Inputs ───────────────────────────────────────────────────────────────── */

/** A role whose hue may be pinned by the caller instead of chosen by the deriver. */
export type AnchorRole = "brand" | "accent" | "danger" | "warning" | "success" | "info";

export type PaletteAnchors = { brand: string } & Partial<Record<Exclude<AnchorRole, "brand">, string>>;

export interface DeriveOptions {
  anchors: PaletteAnchors;
  mode: ThemeMode;
  /**
   * How strongly the surfaces carry the brand's hue, 0–1 of the maximum useful tint.
   * 0 gives neutral greys; the shipped default is a visible warmth, because a page that
   * is very slightly the brand's hue reads as considered where a pure grey reads as
   * unstyled. Above ~0.5 the surfaces start competing with the content.
   */
  surfaceTint?: number;
  /** Contrast targets for the three text roles against the WORST surface. */
  textContrast?: { primary?: number; secondary?: number; muted?: number };
}

/* ── Outputs ──────────────────────────────────────────────────────────────── */

/** The semantic layer, which lives in tokens.css rather than in `TokenSet`. */
export interface SemanticTokens {
  danger: string;
  dangerHover: string;
  dangerContrast: string;
  dangerBorder: string;
  dangerBg: string;
  warning: string;
  warningBorder: string;
  warningBg: string;
  info: string;
  infoBorder: string;
  infoBg: string;
  success: string;
  successBorder: string;
  successBg: string;
  /** Present only when a `accent` (secondary brand) anchor was supplied. */
  accent?: string;
  accentContrast?: string;
  accentBg?: string;
}

export interface ContrastCheck {
  /** e.g. "textMuted on bgPage". */
  pair: string;
  ratio: number;
  /** What WCAG asks of this pair. */
  required: number;
  /** Which rule the requirement comes from, for a reader who wants to argue with it. */
  rule: string;
  passes: boolean;
}

export interface ContrastReport {
  checks: ContrastCheck[];
  failures: ContrastCheck[];
  passes: boolean;
}

export interface DerivedPalette {
  tokens: TokenSet;
  semantic: SemanticTokens;
  audit: ContrastReport;
  /** Compromises the deriver had to make, in plain words. Never silent. */
  warnings: string[];
}

/* ── The hue homes ────────────────────────────────────────────────────────── */

/**
 * Where each semantic role wants to sit, and how far it may be pushed.
 *
 * A semantic colour is a convention before it is an aesthetic: danger is red because
 * every other interface the user has ever used made it red, and a "danger" button in
 * the brand's teal is a worse button however well it matches. So each role has a home
 * hue and a narrow licence to move — enough to get out of the brand's way when the
 * brand happens to live in the same neighbourhood, not enough to stop meaning what it
 * means. If it cannot get far enough, that is a warning, not a silent compromise.
 */
const HUE_HOME: Record<Exclude<AnchorRole, "brand" | "accent">, { hue: number; slack: number }> = {
  danger: { hue: 27, slack: 14 },
  warning: { hue: 75, slack: 16 },
  success: { hue: 150, slack: 20 },
  info: { hue: 240, slack: 22 },
};

/** Circular distance between two hue angles, 0–180. */
function hueGap(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Nudge `home` within `slack` to maximise the distance from every taken hue.
 *
 * Sampled rather than solved: the objective is a min-of-distances over a handful of
 * points on a short arc, which is piecewise-linear with kinks wherever the nearest
 * neighbour changes. Gradient methods stall on those kinks; 2° steps over a ±22° arc is
 * 23 evaluations of some trigonometry and cannot stall.
 */
function placeHue(home: number, slack: number, taken: number[]): number {
  let best = home;
  let bestGap = Math.min(...taken.map((t) => hueGap(home, t)), 360);
  for (let d = -slack; d <= slack; d += 2) {
    const h = (home + d + 360) % 360;
    const gap = Math.min(...taken.map((t) => hueGap(h, t)), 360);
    // Ties go to the hue nearest home: a role should move only as far as it must.
    if (gap > bestGap + 1e-9) {
      best = h;
      bestGap = gap;
    }
  }
  return best;
}

/* ── Derivation ───────────────────────────────────────────────────────────── */

const SURFACE_L = {
  // Light: the PAGE is slightly darker than the cards on it, so a card reads as raised
  // without needing a shadow to say so. Matches the shipped presets' relationship.
  light: { page: 0.912, surface: 0.945, surface2: 0.929 },
  dark: { page: 0.158, surface: 0.206, surface2: 0.249 },
} as const;

/**
 * What a hairline has to clear against the surface it divides.
 *
 * WCAG has nothing to say here — a decorative border is not a graphical object that
 * conveys information — so this is a house rule, and it is deliberately low. A border
 * that clears 3:1 is a RULE, not a hairline: it draws the eye to the box instead of to
 * what is in it. 1.5:1 is the point at which the edge is reliably findable without
 * becoming part of the composition.
 */
const BORDER_CONTRAST = 1.5;

/** The most tint a surface can carry before it stops reading as a neutral ground. */
const MAX_SURFACE_CHROMA = 0.034;

function surfaceSet(hue: number, mode: ThemeMode, tint: number) {
  const c = MAX_SURFACE_CHROMA * Math.max(0, Math.min(1, tint));
  const L = SURFACE_L[mode];
  const bgPage = oklchToHex({ l: L.page, c, h: hue });
  const bgSurface = oklchToHex({ l: L.surface, c, h: hue });
  const bgSurface2 = oklchToHex({ l: L.surface2, c, h: hue });
  // Solved, not guessed: a fixed lightness that looks right against a pale warm ground
  // disappears against a deep cold one, and both are reachable from the same `hue`
  // input. The border carries a little more chroma than the surfaces because at these
  // lightnesses a perfectly neutral hairline on a tinted ground reads as a wrong grey.
  const borderChroma = c * 1.6;
  // Solved against the surface the hairline is HARDEST to see on, not against one of
  // the three. Solving against `bgSurface` alone left it at 1.36:1 on `bgPage`, so the
  // target and the audit disagreed about the same border.
  const hardest = [bgPage, bgSurface, bgSurface2].reduce((a, b) =>
    contrast(a, mode === "light" ? "#000000" : "#ffffff") <
    contrast(b, mode === "light" ? "#000000" : "#ffffff")
      ? a
      : b,
  );
  const borderL = solveLightness(
    BORDER_CONTRAST,
    parseHex(hardest)!,
    hue,
    borderChroma,
    mode === "light" ? "darker" : "lighter",
  );
  return {
    bgPage,
    bgSurface,
    bgSurface2,
    border: oklchToHex({ l: borderL, c: borderChroma, h: hue }),
  };
}

/** Solve a colour at this hue that clears `target` against `against`, keeping chroma. */
function solveAgainst(hue: number, chroma: number, target: number, against: string, mode: ThemeMode): string {
  const bg = parseHex(against)!;
  const l = solveLightness(target, bg, hue, chroma, mode === "light" ? "darker" : "lighter");
  return oklchToHex({ l, c: chroma, h: hue });
}

/** Whichever of near-white / near-black reads better ON `fill`. */
function contrastOn(fill: string): string {
  const light = "#ffffff";
  const dark = "#12100e";
  return contrast(fill, light) >= contrast(fill, dark) ? light : dark;
}

/** A soft tint of `hue` sitting on the surface — a badge fill, not a button fill. */
function tintOn(hue: number, chroma: number, surface: string, mode: ThemeMode): string {
  const s = hexToOklch(surface)!;
  // Toward the colour, but only far enough to be seen: these back TEXT of the same hue,
  // and a strong tint leaves the text nowhere to go.
  const l = mode === "light" ? s.l - 0.055 : s.l + 0.055;
  return oklchToHex({ l, c: Math.min(chroma * 0.45, 0.06), h: hue });
}

export function derivePalette({
  anchors,
  mode,
  surfaceTint = 0.55,
  textContrast,
}: DeriveOptions): DerivedPalette {
  const warnings: string[] = [];
  const brand = hexToOklch(anchors.brand);
  if (!brand) {
    throw new Error(
      `derivePalette: brand "${anchors.brand}" is not a #rgb or #rrggbb colour. ` +
        `Anchors must be hex — a named colour or an rgba() string cannot be converted.`,
    );
  }

  const targets = { primary: 10, secondary: 7, muted: 4.6, ...textContrast };

  // ── Surfaces, from the brand's hue.
  const surfaces = surfaceSet(brand.h, mode, surfaceTint);
  // Every text role is solved against the WORST of the three, so a token is legible
  // wherever it lands. Solving against `bgSurface` alone is the mistake that makes a
  // muted label fail on the page background it also sits on.
  const worstSurface = [surfaces.bgPage, surfaces.bgSurface, surfaces.bgSurface2].reduce((a, b) =>
    contrast(a, mode === "light" ? "#000000" : "#ffffff") <
    contrast(b, mode === "light" ? "#000000" : "#ffffff")
      ? a
      : b,
  );

  // ── Text. A trace of the brand hue keeps the greys from reading cold on a warm page.
  const textChroma = 0.014;
  const textPrimary = solveAgainst(brand.h, textChroma, targets.primary, worstSurface, mode);
  const textSecondary = solveAgainst(brand.h, textChroma, targets.secondary, worstSurface, mode);
  const textMuted = solveAgainst(brand.h, textChroma, targets.muted, worstSurface, mode);

  // ── Brand. Keep the hue the caller asked for; move only the lightness, and only as
  // far as 3:1 against the worst surface — WCAG 1.4.11, since a brand-filled control is
  // a graphical object whose boundary has to be perceivable.
  const brandChroma = Math.max(brand.c, 0.06);
  const brandRatio = contrast(anchors.brand, worstSurface);
  // NORMALISED, never the caller's raw string. `parseHex` accepts "4f46e5" and "#abc",
  // and passing either through unchanged put a value in the TokenSet that is not a CSS
  // colour — it then fails silently at paint time, three layers from here.
  const brandHex =
    brandRatio >= 3
      ? toHex(parseHex(anchors.brand)!)
      : solveAgainst(brand.h, brandChroma, 3, worstSurface, mode);
  if (brandRatio < 3) {
    warnings.push(
      `brand ${anchors.brand} sits at ${brandRatio.toFixed(2)}:1 against the ${mode} surfaces, ` +
        `below the 3:1 WCAG 1.4.11 asks of a control boundary. Lightness was adjusted to ` +
        `${brandHex}; hue and chroma are unchanged.`,
    );
  }
  const brandLch = hexToOklch(brandHex)!;
  const brandHover = oklchToHex({
    ...brandLch,
    // Hover moves AWAY from the page in both themes: darker on light, lighter on dark.
    l: mode === "light" ? brandLch.l - 0.06 : brandLch.l + 0.06,
  });
  const brandContrast = contrastOn(brandHex);
  const onBrand = contrast(brandHex, brandContrast);
  if (onBrand < 4.5) {
    warnings.push(
      `text on the brand fill reaches only ${onBrand.toFixed(2)}:1 (needs 4.5:1). ` +
        `A mid-lightness, high-chroma brand cannot carry legible text at any ink; ` +
        `use it as an accent and keep primary buttons on a darker or lighter variant.`,
    );
  }

  // ── Semantic roles. Anchors are honoured exactly; the rest are placed away from the
  // brand and from each other, within each role's licence to move.
  const taken: number[] = [brandLch.h];
  const accentLch = anchors.accent ? hexToOklch(anchors.accent) : null;
  if (anchors.accent && !accentLch) {
    warnings.push(`accent "${anchors.accent}" is not a hex colour and was ignored.`);
  }
  if (accentLch) taken.push(accentLch.h);

  const semanticHue = {} as Record<Exclude<AnchorRole, "brand" | "accent">, number>;
  const semanticChroma = {} as Record<Exclude<AnchorRole, "brand" | "accent">, number>;
  for (const role of ["danger", "warning", "success", "info"] as const) {
    const pinned = anchors[role] ? hexToOklch(anchors[role]!) : null;
    if (anchors[role] && !pinned) {
      warnings.push(`${role} "${anchors[role]}" is not a hex colour and was ignored.`);
    }
    const home = HUE_HOME[role];
    const hue = pinned ? pinned.h : placeHue(home.hue, home.slack, taken);
    if (!pinned) {
      const gap = Math.min(...taken.map((t) => hueGap(hue, t)));
      if (gap < 20) {
        warnings.push(
          `${role} could only reach ${gap.toFixed(0)}° from the nearest pinned hue, which is ` +
            `too close to tell apart at a glance. Pin ${role} explicitly, or move the brand.`,
        );
      }
    }
    semanticHue[role] = hue;
    semanticChroma[role] = pinned ? Math.max(pinned.c, 0.08) : 0.13;
    taken.push(hue);
  }

  /**
   * A semantic colour has two jobs and therefore two backgrounds: plain text on the
   * page, and the label inside its own tinted badge. The badge is the harder of the
   * two — it is a step toward the colour — so solving only against the surface produced
   * a badge at 4.1:1 while the loose text passed, which is the failure mode that is
   * hardest to notice because nine tenths of the uses look fine.
   */
  const sem = (role: Exclude<AnchorRole, "brand" | "accent">) => {
    const hue = semanticHue[role];
    const chroma = semanticChroma[role];
    const bg = tintOn(hue, chroma, surfaces.bgSurface, mode);
    const onSurface = solveLightness(
      4.5,
      parseHex(worstSurface)!,
      hue,
      chroma,
      mode === "light" ? "darker" : "lighter",
    );
    const onTint = solveLightness(
      4.5,
      parseHex(bg)!,
      hue,
      chroma,
      mode === "light" ? "darker" : "lighter",
    );
    const l = mode === "light" ? Math.min(onSurface, onTint) : Math.max(onSurface, onTint);
    return oklchToHex({ l, c: chroma, h: hue });
  };

  const danger = sem("danger");
  const dangerLch = hexToOklch(danger)!;
  const semantic: SemanticTokens = {
    danger,
    dangerHover: oklchToHex({
      ...dangerLch,
      l: mode === "light" ? dangerLch.l - 0.06 : dangerLch.l + 0.06,
    }),
    dangerContrast: contrastOn(danger),
    dangerBorder: oklchToHex({
      l: mode === "light" ? dangerLch.l + 0.22 : dangerLch.l - 0.22,
      c: semanticChroma.danger,
      h: semanticHue.danger,
    }),
    dangerBg: tintOn(semanticHue.danger, semanticChroma.danger, surfaces.bgSurface, mode),
    warning: sem("warning"),
    warningBorder: oklchToHex({
      l: mode === "light" ? 0.82 : 0.44,
      c: semanticChroma.warning,
      h: semanticHue.warning,
    }),
    warningBg: tintOn(semanticHue.warning, semanticChroma.warning, surfaces.bgSurface, mode),
    info: sem("info"),
    infoBorder: oklchToHex({
      l: mode === "light" ? 0.8 : 0.45,
      c: semanticChroma.info,
      h: semanticHue.info,
    }),
    infoBg: tintOn(semanticHue.info, semanticChroma.info, surfaces.bgSurface, mode),
    success: sem("success"),
    successBorder: oklchToHex({
      l: mode === "light" ? 0.81 : 0.45,
      c: semanticChroma.success,
      h: semanticHue.success,
    }),
    successBg: tintOn(semanticHue.success, semanticChroma.success, surfaces.bgSurface, mode),
  };

  if (accentLch) {
    const accent = solveAgainst(accentLch.h, Math.max(accentLch.c, 0.06), 3, worstSurface, mode);
    semantic.accent = accent;
    semantic.accentContrast = contrastOn(accent);
    semantic.accentBg = tintOn(accentLch.h, Math.max(accentLch.c, 0.06), surfaces.bgSurface, mode);
  }

  // ── Money. A THIRD system again: these are data colours with fixed meanings, and the
  // one rule that outranks everything is that income and expense must never be the
  // red/green pair — which is why the shipped presets use teal/amber/violet. Derived
  // here at fixed hues rather than from the brand, for the same reason `--danger` is:
  // a consumer who rebrands does not thereby change what "money out" looks like.
  const money = (hue: number, target: number) => solveAgainst(hue, 0.12, target, worstSurface, mode);
  const moneyIncome = money(175, 4.5);
  const moneyExpense = money(70, 4.5);
  const moneyNet = money(300, 4.5);
  const moneyNeutral = oklchToHex({ l: mode === "light" ? 0.52 : 0.72, c: 0.012, h: brand.h });

  const tokens: TokenSet = {
    ...surfaces,
    textPrimary,
    textSecondary,
    textMuted,
    brand: brandHex,
    brandHover,
    brandContrast,
    moneyIncome,
    moneyExpense,
    moneyNet,
    moneyNeutral,
    // Left alone. See the note at the top of this file about why the categorical ramp is
    // not derived from the brand unless the caller asks.
    //
    // ⚠️ EMPTY, not absent: a caller who hands this straight to `applyTokenSet` keeps
    // whatever `--chart-1…9` were already on the element. That is deliberate — the ramp
    // is a separate decision and clearing it would leave charts unpainted — but it means
    // a derived palette applied over another preset is a MIX until you also supply a
    // ramp. `deriveChartRamp` is how you supply one.
    chart: [],
    heat: deriveHeat(moneyIncome, moneyExpense, surfaces, mode),
  };

  return { tokens, semantic, audit: auditPalette(tokens, semantic), warnings };
}

/**
 * Heatmap stops, reusing the money pair.
 *
 * `under` is the good direction and `over` the bad one, at the SAME hues as
 * `moneyIncome`/`moneyExpense` — so a heatmap cell and the figure printed beside it
 * agree about which way is which, rather than each inventing its own convention.
 */
function deriveHeat(
  income: string,
  expense: string,
  surfaces: { bgSurface2: string },
  mode: ThemeMode,
): HeatStops {
  const exp = hexToOklch(expense)!;
  return {
    neutral: surfaces.bgSurface2,
    under: income,
    over: expense,
    seqLow: oklchToHex({ l: mode === "light" ? 0.93 : 0.26, c: 0.05, h: exp.h }),
    seqHigh: expense,
    empty: mode === "light" ? "rgba(120,110,95,0.14)" : "rgba(160,170,190,0.10)",
  };
}

/* ── Audit ────────────────────────────────────────────────────────────────── */

/**
 * Measure every pair that has a requirement, and say which ones fail.
 *
 * This is the part the shipped presets were missing. `derivePalette` runs it on the way
 * out, and the preset test runs it over everything the package ships, so a palette that
 * does not hold up cannot be merged with a comment claiming that it does.
 */
export function auditPalette(t: TokenSet, semantic?: SemanticTokens): ContrastReport {
  const checks: ContrastCheck[] = [];
  const surfaces: Array<[string, string]> = [
    ["bgPage", t.bgPage],
    ["bgSurface", t.bgSurface],
    ["bgSurface2", t.bgSurface2],
  ];

  const add = (pair: string, fg: string, bg: string, required: number, rule: string) => {
    const ratio = contrast(fg, bg);
    checks.push({ pair, ratio, required, rule, passes: ratio >= required - 0.05 });
  };

  for (const [name, bg] of surfaces) {
    add(`textPrimary on ${name}`, t.textPrimary, bg, 7, "WCAG 1.4.6 AAA body text");
    add(`textSecondary on ${name}`, t.textSecondary, bg, 4.5, "WCAG 1.4.3 AA body text");
    add(`textMuted on ${name}`, t.textMuted, bg, 4.5, "WCAG 1.4.3 AA body text");
    add(`brand on ${name}`, t.brand, bg, 3, "WCAG 1.4.11 graphical object");
    add(`border on ${name}`, t.border, bg, 1.1, "house rule: a hairline must be findable");
    for (const [key, hex] of [
      ["moneyIncome", t.moneyIncome],
      ["moneyExpense", t.moneyExpense],
      ["moneyNet", t.moneyNet],
    ] as const) {
      add(`${key} on ${name}`, hex, bg, 4.5, "WCAG 1.4.3 — these are rendered as TEXT");
    }
  }

  add("brandContrast on brand", t.brandContrast, t.brand, 4.5, "WCAG 1.4.3 AA body text");

  if (semantic) {
    for (const [name, fg] of [
      ["danger", semantic.danger],
      ["warning", semantic.warning],
      ["info", semantic.info],
      ["success", semantic.success],
    ] as const) {
      add(`${name} on bgSurface`, fg, t.bgSurface, 4.5, "WCAG 1.4.3 — rendered as text");
    }
    add("danger on dangerBg", semantic.danger, semantic.dangerBg, 4.5, "WCAG 1.4.3 — badge text");
    add("warning on warningBg", semantic.warning, semantic.warningBg, 4.5, "WCAG 1.4.3 — badge text");
    add("info on infoBg", semantic.info, semantic.infoBg, 4.5, "WCAG 1.4.3 — badge text");
    add("success on successBg", semantic.success, semantic.successBg, 4.5, "WCAG 1.4.3 — badge text");
    add(
      "dangerContrast on danger",
      semantic.dangerContrast,
      semantic.danger,
      4.5,
      "WCAG 1.4.3 AA body text",
    );
  }

  const failures = checks.filter((c) => !c.passes);
  return { checks, failures, passes: failures.length === 0 };
}

/* ── Categorical chart ramp ───────────────────────────────────────────────── */

export interface ChartRampReport {
  colors: string[];
  /** Series pairs that are too close under normal vision or any simulated CVD. */
  collisions: Array<{ a: number; b: number; under: "normal" | CvdType; distance: number }>;
  /** Series that do not clear 3:1 against a surface they may be drawn on. */
  lowContrast: Array<{ index: number; surface: string; ratio: number }>;
  /** The worst pairwise separation, across normal vision and all three dichromacies. */
  minSeparation: number;
  /** The worst contrast any series reaches against any surface it was measured on. */
  minContrast: number;
  passes: boolean;
}

/**
 * The floor for pairwise separation in OKLab, across normal vision and each dichromacy.
 *
 * CALIBRATED, not chosen. Paul Tol's "Muted" set — which this package ships and which is
 * a well-regarded CVD-safe palette — bottoms out at 0.059 in its light variant and 0.032
 * in the lightened dark one. A threshold above 0.059 would fail a palette that is known
 * to work, which is worse than having no check at all: an audit that cries wolf gets
 * switched off. 0.05 sits just under the known-good case.
 */
const MIN_SEPARATION = 0.05;

/**
 * **The categorical trade-off, measured.** At a SINGLE lightness, the most series that
 * can satisfy both the 3:1 fill contrast of WCAG 1.4.11 and {@link MIN_SEPARATION} under
 * dichromacy is FOUR. Searched exhaustively over starting hue and lightness:
 *
 *   n=4  best separation 0.065  — both satisfiable
 *   n=5  best separation 0.041  — not satisfiable
 *   n=9  best separation 0.015  — not satisfiable
 *
 * The reason is structural: dichromacy collapses the red-green axis, so hue alone stops
 * distinguishing colours once you need more than a handful, and the remaining channel is
 * LIGHTNESS — the very thing a uniform-contrast ramp holds constant. Paul Tol's set
 * varies lightness deliberately and pays for it in contrast; that is not an oversight in
 * their palette, it is the only currency left.
 *
 * So above four series this deriver varies lightness too, and reports what it gave up
 * rather than pretending both constraints were met.
 *
 * NOTE ON WHAT THIS BOUND IS. It describes the PROBLEM, not a guarantee about
 * {@link deriveChartRamp}. That function fixes lightness and starts the hue wheel at the
 * brand's own hue rather than searching for the best start, so it reaches the bound only
 * where the brand happens to sit well: sweeping 72 brand hues against the default light
 * surfaces, 7 of 72 produced a passing 4-series ramp (12 of 72 on dark), and none passed
 * at 5 or 9. Read the report it returns; do not assume a pass.
 */
const SINGLE_LIGHTNESS_MAX_SERIES = 4;

/**
 * A categorical ramp of `count` hues, evenly spaced and equal in perceived lightness,
 * then MEASURED for separability — including under each dichromacy.
 *
 * Offered but not used by default, and the distinction matters. Evenly spaced hues at
 * one lightness are a reasonable generic answer; Paul Tol's "Muted" set, which this
 * package ships, is a better specific one, because it was optimised against real
 * confusion lines rather than derived from a formula. So this exists for a consumer who
 * wants their charts to follow their brand and is willing to read the report — not as
 * a silent upgrade to the default.
 */
export function deriveChartRamp(
  brandHex: string,
  mode: ThemeMode,
  surfaces: string[],
  count = 9,
): ChartRampReport {
  const brand = hexToOklch(brandHex) ?? { l: 0.6, c: 0.12, h: 264 };
  const base = mode === "light" ? 0.58 : 0.74;
  const c = Math.max(0.09, Math.min(brand.c, 0.15));
  // Up to four series, one lightness: a scale that varies lightness implies rank, and a
  // categorical one must not. Beyond four, lightness is the only channel left that
  // survives dichromacy — see SINGLE_LIGHTNESS_MAX_SERIES — so it alternates in a
  // three-step cycle, which keeps ADJACENT series (the ones a legend puts side by side)
  // at different lightnesses as well as different hues.
  const vary = count > SINGLE_LIGHTNESS_MAX_SERIES;
  const offsets = [0, mode === "light" ? -0.1 : 0.1, mode === "light" ? 0.08 : -0.08];
  const colors = Array.from({ length: count }, (_, i) =>
    oklchToHex({
      l: vary ? base + offsets[i % offsets.length] : base,
      c,
      h: (brand.h + (360 / count) * i) % 360,
    }),
  );

  return measureRamp(colors, surfaces);
}

/** Audit a ramp somebody else chose — the shipped Paul Tol set, say. */
export function auditChartRamp(colors: string[], surfaces: string[]): ChartRampReport {
  return measureRamp(colors, surfaces);
}

function measureRamp(colors: string[], surfaces: string[]): ChartRampReport {
  const collisions: ChartRampReport["collisions"] = [];
  const rgbs = colors.map((hex) => parseHex(hex)).filter((v): v is NonNullable<typeof v> => !!v);
  let minSeparation = Infinity;
  for (let i = 0; i < rgbs.length; i++) {
    for (let j = i + 1; j < rgbs.length; j++) {
      const normal = deltaE(rgbs[i], rgbs[j]);
      minSeparation = Math.min(minSeparation, normal);
      if (normal < MIN_SEPARATION) {
        collisions.push({ a: i, b: j, under: "normal", distance: normal });
      }
      for (const type of ["protanopia", "deuteranopia", "tritanopia"] as const) {
        const d = deltaE(simulateCvd(rgbs[i], type), simulateCvd(rgbs[j], type));
        minSeparation = Math.min(minSeparation, d);
        if (d < MIN_SEPARATION) collisions.push({ a: i, b: j, under: type, distance: d });
      }
    }
  }

  const lowContrast: ChartRampReport["lowContrast"] = [];
  let minContrast = Infinity;
  colors.forEach((hex, index) => {
    for (const surface of surfaces) {
      const ratio = contrast(hex, surface);
      minContrast = Math.min(minContrast, ratio);
      // WCAG 1.4.11: a graphical object carrying meaning needs 3:1 against what is
      // adjacent to it. A bar the same value as the card behind it has no boundary.
      if (ratio < 3) lowContrast.push({ index, surface, ratio });
    }
  });

  return {
    colors,
    collisions,
    lowContrast,
    minSeparation: Number.isFinite(minSeparation) ? minSeparation : 0,
    minContrast: Number.isFinite(minContrast) ? minContrast : 0,
    passes: collisions.length === 0 && lowContrast.length === 0,
  };
}

/** Convenience: the OKLCH of a hex, for a caller inspecting an anchor. */
export function describe(hex: string): Oklch | null {
  const rgb = parseHex(hex);
  return rgb ? rgbToOklch(rgb) : null;
}
