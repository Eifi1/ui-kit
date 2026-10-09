import { contrast, oklchToRgb, parseHex, rgbToOklch, toHex } from "./color";
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
 *   `--border-strong` stays derived in tokens.css and grows with it.
 */

/** The custom properties a contrast step writes. */
export const CONTRAST_STEPPED_VARS = ["--text-secondary", "--text-muted", "--text-placeholder", "--border"] as const;

export interface ContrastStep {
  textSecondary: string;
  textMuted: string;
  textPlaceholder: string;
  border: string;
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
 *  too (`--bg-hover`, `--brand-muted`, `--brand-bg`). */
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

/** WCAG 1.4.11 for a component's boundary. */
const BORDER_TARGET = 3;
/** `--border-strong` in tokens.css: 55 % border, 45 % text. */
const BORDER_STRONG_SHARE = 0.45;

function worstContrast(color: string, t: TokenSet): number {
  return Math.min(contrast(color, t.bgPage), contrast(color, t.bgSurface), contrast(color, t.bgSurface2));
}

function steppedBorder(t: TokenSet): string {
  // The share of `--text-primary` in the border: at least --border-strong's, more until
  // 3:1. Monotonic in the share (the mix walks from the border to the text, away from
  // every surface), so a bisection finds the least that clears it.
  let lo = BORDER_STRONG_SHARE;
  if (worstContrast(mix(t.border, t.textPrimary, 1 - lo), t) >= BORDER_TARGET) return mix(t.border, t.textPrimary, 1 - lo);
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (worstContrast(mix(t.border, t.textPrimary, 1 - mid), t) >= BORDER_TARGET) hi = mid;
    else lo = mid;
  }
  return mix(t.border, t.textPrimary, 1 - hi);
}

/** The four stepped values for `t`. Pure. */
export function contrastStep(t: TokenSet): ContrastStep {
  return {
    textSecondary: mix(t.textSecondary, t.textPrimary, 0.5),
    textMuted: t.textSecondary,
    textPlaceholder: t.textMuted,
    border: steppedBorder(t),
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
