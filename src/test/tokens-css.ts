import { oklchToRgb, rgbToOklch, type Rgb } from "../theme/color";
import { contrastStep } from "../theme/contrast-tokens";
import type { TokenSet } from "../theme/palette-presets";

/**
 * `tokens.css` read the way a browser paints it on `<html>`, for the colour audits
 * (theme/__tests__/tokens-css-audit.test.ts, the swipe tones' measurements).
 *
 * jsdom applies no stylesheet and resolves no `var()`, so a test that wants to know what
 * `--warning-contrast` on `--warning` measures in the Moss dark preset under More
 * contrast has to do the cascade itself. This is that cascade, deliberately small:
 * - the top-level `:root`, `.dark` and `:root, .dark` blocks, in source order (the same
 *   specificity, so the later one wins, as in the browser); `.dark` blocks only in dark;
 * - over them, what `applyTokenSet` writes inline for a token set, at either contrast
 *   level — or, for an app without a palette layer, what the mirror holds plus the same
 *   contrast step, which is the same values;
 * - the values the stylesheet uses: `#hex`, `rgb()`/`rgba()`, `transparent`, `var()`
 *   and `color-mix()` in `oklab` (opaque inputs, as `contrast-tokens.ts` mixes them) or
 *   `srgb` (which may mix toward `transparent`, giving a translucent colour).
 *
 * Anything else (a gradient, a length, a z-index) resolves to `null`: not a colour.
 */

/** A colour with its alpha, 0–1. Opaque unless a translucent token made it so. */
export interface Rgba extends Rgb {
  a: number;
}

export type ThemeMode = "light" | "dark";

/** Comments out first: half the stylesheet is prose, and it quotes token values. */
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** The top-level `selector { body }` pairs, braces nested inside at-rules skipped. */
function topLevelBlocks(css: string): Array<{ selector: string; body: string }> {
  const out: Array<{ selector: string; body: string }> = [];
  let depth = 0;
  let start = 0;
  let selectorStart = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        out.push({ selector: css.slice(selectorStart, start).trim(), body: css.slice(start + 1, i) });
        selectorStart = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      selectorStart = i + 1;
    }
  }
  return out;
}

const SELECTORS: Record<ThemeMode, string[]> = {
  light: [":root", ":root, .dark"],
  dark: [":root", ".dark", ":root, .dark"],
};

/** Every custom property the cascade on `<html>` sees in `mode`, later blocks winning. */
export function tokensCssDeclarations(css: string, mode: ThemeMode): Map<string, string> {
  const out = new Map<string, string>();
  for (const { selector, body } of topLevelBlocks(stripComments(css))) {
    if (!SELECTORS[mode].includes(selector.replace(/\s+/g, " "))) continue;
    for (const [, name, value] of body.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
      out.set(name, value.trim());
    }
  }
  return out;
}

/** The inline values `applyTokenSet` writes for `t`, stepped under More contrast. */
export function inlineTokens(t: TokenSet, more: boolean): Map<string, string> {
  const step = more ? contrastStep(t) : null;
  const out = new Map<string, string>([
    ["--bg-page", t.bgPage],
    ["--bg-surface", t.bgSurface],
    ["--bg-surface-2", t.bgSurface2],
    ["--border", step?.border ?? t.border],
    ["--text-primary", t.textPrimary],
    ["--text-secondary", step?.textSecondary ?? t.textSecondary],
    ["--text-muted", step?.textMuted ?? t.textMuted],
    ["--brand", t.brand],
    ["--brand-hover", t.brandHover],
    ["--brand-contrast", t.brandContrast],
    ["--money-income", t.moneyIncome],
    ["--money-expense", t.moneyExpense],
    ["--money-net", t.moneyNet],
    ["--money-neutral", t.moneyNeutral],
  ]);
  if (step) out.set("--text-placeholder", step.textPlaceholder);
  t.chart.forEach((c, i) => out.set(`--chart-${i + 1}`, c));
  return out;
}

function hexToRgba(hex: string): Rgba | null {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
}

/** Split on commas that are not inside parentheses. */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function toLab({ r, g, b }: Rgb) {
  const { l, c, h } = rgbToOklch({ r, g, b });
  const rad = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) };
}

/** `color-mix(in oklab, a p, b)`, the formula `contrast-tokens.ts` uses. Opaque only. */
export function mixOklab(a: Rgba, b: Rgba, p: number): Rgba {
  const A = toLab(a);
  const B = toLab(b);
  const l = A.l * p + B.l * (1 - p);
  const x = A.a * p + B.a * (1 - p);
  const y = A.b * p + B.b * (1 - p);
  const c = Math.hypot(x, y);
  const h = c < 1e-6 ? 0 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const rgb = oklchToRgb({ l, c, h });
  return { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b), a: 1 };
}

/** `color-mix(in srgb, a p, b)`, premultiplied as CSS Color 5 specifies. */
export function mixSrgb(a: Rgba, b: Rgba, p: number): Rgba {
  const alpha = a.a * p + b.a * (1 - p);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const ch = (k: "r" | "g" | "b") => (a[k] * a.a * p + b[k] * b.a * (1 - p)) / alpha;
  return { r: ch("r"), g: ch("g"), b: ch("b"), a: alpha };
}

/** A translucent colour painted over an opaque one (sRGB "over", as browsers paint). */
export function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

/** The resolved tokens of one preset × mode × contrast level, by name. */
export class ResolvedTokens {
  private memo = new Map<string, Rgba | null>();
  constructor(private readonly values: Map<string, string>) {}

  /** The token's colour, or null when it is not a colour (or not declared). */
  get(name: string): Rgba | null {
    if (this.memo.has(name)) return this.memo.get(name)!;
    this.memo.set(name, null); // a cycle resolves to "not a colour", not a hang
    const raw = this.values.get(name);
    const value = raw == null ? null : this.evaluate(raw);
    this.memo.set(name, value);
    return value;
  }

  /** Like {@link get}, but throws for a name that is not a colour — an audit typo. */
  color(name: string): Rgba {
    const c = this.get(name);
    if (!c) throw new Error(`${name} does not resolve to a colour`);
    return c;
  }

  /** Every declared name. */
  names(): string[] {
    return [...this.values.keys()];
  }

  evaluate(value: string): Rgba | null {
    const v = value.trim();
    if (v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    if (v.startsWith("#")) return hexToRgba(v);
    let m = /^var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,(.*))?\)$/s.exec(v);
    if (m) return this.get(m[1]) ?? (m[2] != null ? this.evaluate(m[2]) : null);
    m = /^rgba?\(([^)]*)\)$/.exec(v);
    if (m) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    }
    m = /^color-mix\(\s*in\s+(oklab|srgb)\s*,(.*)\)$/s.exec(v);
    if (m) {
      const [first, second] = splitArgs(m[2]);
      const pa = /^(.*?)\s+([\d.]+)%$/s.exec(first);
      const pb = /^(.*?)\s+([\d.]+)%$/s.exec(second);
      const aExpr = pa ? pa[1] : first;
      const bExpr = pb ? pb[1] : second;
      const p = pa ? Number(pa[2]) / 100 : pb ? 1 - Number(pb[2]) / 100 : 0.5;
      const a = this.evaluate(aExpr);
      const b = this.evaluate(bExpr);
      if (!a || !b) return null;
      if (m[1] === "srgb") return mixSrgb(a, b, p);
      if (a.a < 1 || b.a < 1) throw new Error(`${value}: an oklab mix of a translucent colour`);
      return mixOklab(a, b, p);
    }
    return null;
  }
}

/**
 * What `tokens.css` paints on `<html>` for one token set, mode and contrast level.
 * `t` is the preset's set for that mode; `css` the stylesheet's text.
 */
export function resolveTokens(css: string, t: TokenSet, mode: ThemeMode, more: boolean): ResolvedTokens {
  const values = tokensCssDeclarations(css, mode);
  for (const [name, value] of inlineTokens(t, more)) values.set(name, value);
  return new ResolvedTokens(values);
}

/** `#rrggbb` of an opaque colour, for messages. */
export function hexOf({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}
