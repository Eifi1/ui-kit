import {
  contrast,
  hexToOklch,
  luminance,
  oklchToHex,
  oklchToRgb,
  parseHex,
  rgbToOklch,
  solveLightness,
  toHex,
} from "./color";
import type { TokenSet } from "./palette-presets";

/**
 * The "More contrast" step on a token set (docs/text-size-harmonization.md §5, §10.5).
 * INTERNAL — `applyTokenSet` and the contrast layer share it; it is not re-exported.
 *
 * The step happens HERE, in JS, because the tokens it changes are written inline on
 * `<html>` by `applyTokenSet`: an inline value beats any `[data-contrast=more]` rule and
 * any `@media (prefers-contrast: more)` block, so a stylesheet cannot do it (§10.5, the
 * keksdose review). `--text-placeholder` is a CSS-derived token, and it is written inline
 * here too rather than redefined per attribute in tokens.css.
 *
 * What moves (§5):
 * - `--text-muted` becomes the set's `--text-secondary`;
 * - `--text-secondary` moves halfway to `--text-primary`;
 * - `--text-placeholder` becomes the set's `--text-muted` (4.6–5.5:1 on every shipped
 *   preset, where the CSS formula gives 2.4–2.8:1) — the order primary > secondary >
 *   muted > placeholder survives the step;
 * - `--border` moves toward `--text-primary` until it clears 3:1 against the worst of the
 *   three surfaces (WCAG 1.4.11, a field's boundary), and never less far than
 *   `--border-strong`'s 45 % — so every border is at least as strong as a "strong" one was.
 *   `--border-strong` stays derived in tokens.css and grows with it;
 * - in a LIGHT set only (0.36, docs/colour-roles-harmonization.md §13): the well
 *   (`--bg-surface-2`) becomes {@link WELL_INK_MORE} of `--text-primary` mixed into the
 *   card, and each of the four money colours that falls under 4.5:1 on that well is
 *   solved darker at its own hue and chroma. The border above is solved against the
 *   stepped well. A dark set's well stands 1.11–1.13:1 from its card already, and its
 *   money has no room: nothing of it steps.
 *
 * What does NOT move here, because it is not inline: the light status, hue and field-sync
 * literals and `--bg-active` step in tokens.css's `:root[data-contrast="more"]:not(.dark)`
 * block, solved over these stepped wells.
 */

/** The custom properties a contrast step writes. The last five only for a light set. */
export const CONTRAST_STEPPED_VARS = [
  "--text-secondary",
  "--text-muted",
  "--text-placeholder",
  "--border",
  "--bg-surface-2",
  "--money-income",
  "--money-expense",
  "--money-net",
  "--money-neutral",
] as const;

/** The light well under More contrast and the money that reads on it (§13.4). */
export interface WellStep {
  bgSurface2: string;
  moneyIncome: string;
  moneyExpense: string;
  moneyNet: string;
  moneyNeutral: string;
}

export interface ContrastStep {
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;
  border: string;
  /** The stepped well and money, or null for a dark set (which does not step them). */
  well: WellStep | null;
}

interface Lab {
  l: number;
  a: number;
  b: number;
}

function toLab(hex: string): Lab | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const { l, c, h } = rgbToOklch(rgb);
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

/** `color-mix(in oklab, a p, b)` as a hex — the same formula tokens.css's derived roles
 *  use, so a stepped value sits where the stylesheet would have put it. A colour that is
 *  not hex (a consumer's own token set) comes back unmixed. The deriver mixes with it
 *  too (`--bg-hover`, `--brand-muted`, `--brand-bg`, `--brand-bg-hover`). */
export function mix(a: string, b: string, p: number): string {
  const A = toLab(a);
  const B = toLab(b);
  if (!A || !B) return a;
  const l = A.l * p + B.l * (1 - p);
  const x = A.a * p + B.a * (1 - p);
  const y = A.b * p + B.b * (1 - p);
  const c = Math.hypot(x, y);
  const h = c < 1e-6 ? 0 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return toHex(oklchToRgb({ l, c, h }));
}

/**
 * `--bg-hover` in tokens.css: this share of `--text-primary` mixed into `--bg-surface`.
 *
 * 5.5 %, down from 7 % in 0.33 (docs/colour-roles-harmonization.md §12.10): a hovered row
 * on a card is the darkest fill (in dark, the lightest) that text sits on, and at 7 % the
 * light status colours, the money colours and Ink/Moss/Plum's muted text fell to
 * 4.25–4.49:1 on it. The status literals are fixed, the same in every preset, so the
 * hover moved instead: text wins over the hover's step. At 5.5 % the step from the card
 * is still 1.09–1.13:1, above the 1.08:1 the kit's hover rule asks (§12.2). The deriver
 * solves the money colours against this fill, and tokens-css-audit.test.ts measures
 * every text role on it in every shipped preset, so the two cannot part.
 */
export const HOVER_INK = 0.055;

/** The card's hover fill (`--bg-hover`) for `t`, as tokens.css mixes it. */
export function hoverFill(t: Pick<TokenSet, "textPrimary" | "bgSurface">): string {
  return mix(t.textPrimary, t.bgSurface, HOVER_INK);
}

/**
 * The light well under More contrast: this share of `--text-primary` mixed into the card,
 * `--bg-hover`'s formula at a larger share (0.36, docs/colour-roles-harmonization.md §13).
 *
 * In light the well is the page (§5.3), 1.09–1.11:1 from the card. At 10 % it stands
 * 1.19–1.24:1 from it, about twice that. The rule it is held to: **the stepped well stands
 * at least 1.17:1 from the card**, two of the hover rule's 1.08 steps; 9 % is the least
 * that clears it in every shipped preset, with no room. The step cannot ship alone: on a
 * 10 % well money, status and two hues read 4.07–4.28:1, so the money is solved with it
 * here and the status and hue literals in tokens.css.
 */
export const WELL_INK_MORE = 0.1;

/** The least the stepped light well stands from the card (§13.3, decision 2). */
export const WELL_STEP_MIN = 1.17;

/** True when `t` is a light set: its body ink darker than its card. */
function isLightSet(t: Pick<TokenSet, "textPrimary" | "bgSurface">): boolean | null {
  const ink = parseHex(t.textPrimary);
  const card = parseHex(t.bgSurface);
  if (!ink || !card) return null;
  return luminance(ink) < luminance(card);
}

/** Money as text: WCAG 1.4.3 AA. */
const MONEY_TARGET = 4.5;

/** `color` as it is when it clears 4.5:1 on `well`, else solved darker at its own hue and
 *  chroma until it does — measured on the hex (`solveLightness`). */
function moneyOn(color: string, well: string): string {
  if (contrast(color, well) >= MONEY_TARGET) return color;
  const lch = hexToOklch(color);
  const bg = parseHex(well);
  if (!lch || !bg) return color;
  const l = solveLightness(MONEY_TARGET, bg, lch.h, lch.c, "darker");
  return oklchToHex({ l, c: lch.c, h: lch.h });
}

/** The light well under More contrast for `t`, or null for a dark set (or one whose ink or
 *  card is not hex, which cannot be mixed). The deriver solves the brand against it. */
export function steppedWellFill(t: Pick<TokenSet, "textPrimary" | "bgSurface">): string | null {
  return isLightSet(t) ? mix(t.textPrimary, t.bgSurface, WELL_INK_MORE) : null;
}

/** The stepped well and money of a light set, or null (see {@link steppedWellFill}). */
function wellStep(t: TokenSet): WellStep | null {
  const well = steppedWellFill(t);
  if (!well) return null;
  return {
    bgSurface2: well,
    moneyIncome: moneyOn(t.moneyIncome, well),
    moneyExpense: moneyOn(t.moneyExpense, well),
    moneyNet: moneyOn(t.moneyNet, well),
    moneyNeutral: moneyOn(t.moneyNeutral, well),
  };
}

/**
 * `--brand-muted` in tokens.css: this share of `--brand` mixed into `--text-primary`.
 *
 * 62 %, down from 70 % in 0.33 (docs/colour-roles-harmonization.md §12.11): the brand as
 * text sits on its soft chip HOVERED too (`--brand-bg-hover` — ButtonGroupLink's current
 * page, a selected day), and at 70 % it read 4.08–4.42:1 there in Default and Moss light
 * and in Ink, Moss, Plum and Contrast dark. The brand could not move instead: the dark
 * brands would have flipped their white label to the dark ink. Nor could the chip's hover
 * lighten: by the time the text cleared 4.5:1 the hover sat 1.00:1 from the chip it
 * hovers. So the text moves toward the ink, as `--bg-hover` moved for its text.
 */
export const BRAND_MUTED_SHARE = 0.62;
/** `--brand-bg` and `--brand-bg-hover` in tokens.css: these shares of `--brand` mixed
 *  into `--bg-surface`. */
export const BRAND_BG_SHARE = 0.14;
export const BRAND_BG_HOVER_SHARE = 0.24;

/** `--brand-muted`, `--brand-bg` and `--brand-bg-hover` for `t`, as tokens.css mixes them.
 *  tokens-css-audit.test.ts holds the three shares equal to the stylesheet's. */
export function brandSoft(t: Pick<TokenSet, "brand" | "textPrimary" | "bgSurface">): {
  brandMuted: string;
  brandBg: string;
  brandBgHover: string;
} {
  return {
    brandMuted: mix(t.brand, t.textPrimary, BRAND_MUTED_SHARE),
    brandBg: mix(t.brand, t.bgSurface, BRAND_BG_SHARE),
    brandBgHover: mix(t.brand, t.bgSurface, BRAND_BG_HOVER_SHARE),
  };
}

/** WCAG 1.4.11 for a component's boundary. */
const BORDER_TARGET = 3;
/** `--border-strong` in tokens.css: 55 % border, 45 % text. */
const BORDER_STRONG_SHARE = 0.45;

/** The worst of the three surfaces; `well`, when the step has one, in place of the set's. */
function worstContrast(color: string, t: TokenSet, well: string): number {
  return Math.min(contrast(color, t.bgPage), contrast(color, t.bgSurface), contrast(color, well));
}

function steppedBorder(t: TokenSet, well: WellStep | null): string {
  // The share of `--text-primary` in the border: at least --border-strong's, more until
  // 3:1. Monotonic in the share (the mix walks from the border to the text, away from
  // every surface), so a bisection finds the least that clears it. Against the stepped
  // light well (§13.4), which is the darkest surface under More contrast.
  const surface2 = well?.bgSurface2 ?? t.bgSurface2;
  let lo = BORDER_STRONG_SHARE;
  if (worstContrast(mix(t.border, t.textPrimary, 1 - lo), t, surface2) >= BORDER_TARGET)
    return mix(t.border, t.textPrimary, 1 - lo);
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (worstContrast(mix(t.border, t.textPrimary, 1 - mid), t, surface2) >= BORDER_TARGET) hi = mid;
    else lo = mid;
  }
  return mix(t.border, t.textPrimary, 1 - hi);
}

/** The stepped values for `t`: the four text and line tokens, and for a light set the
 *  well and money (`well`, null in dark). Pure. */
export function contrastStep(t: TokenSet): ContrastStep {
  const well = wellStep(t);
  return {
    textSecondary: mix(t.textSecondary, t.textPrimary, 0.5),
    textMuted: t.textSecondary,
    textPlaceholder: t.textMuted,
    border: steppedBorder(t, well),
    well,
  };
}

/* ── The token set last written to an element ───────────────────────────── */

const lastWritten = new WeakMap<HTMLElement, TokenSet>();

/** Remember the set `applyTokenSet` wrote, so a contrast change can re-apply it. */
export function rememberTokenSet(el: HTMLElement, t: TokenSet): void {
  lastWritten.set(el, t);
}

/** The set `applyTokenSet` last wrote to `el`, or undefined when nothing did — an app
 *  without the palette layer, whose base tokens come from tokens.css. */
export function rememberedTokenSet(el: HTMLElement): TokenSet | undefined {
  return lastWritten.get(el);
}
