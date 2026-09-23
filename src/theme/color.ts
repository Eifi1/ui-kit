/**
 * Colour maths for the palette system: sRGB ↔ OKLab ↔ OKLCH, WCAG contrast, gamut
 * clipping, and colour-vision-deficiency simulation.
 *
 * Dependency-free on purpose. This package already ships 48MB of runtime dependencies
 * for a 1.4MB library, and a colour-space conversion is forty lines of arithmetic that
 * will not change — importing culori or chroma-js to get it would be the largest
 * dependency in the kit, paid for by every consumer, to avoid writing down formulas
 * that were published once and are now fixed.
 *
 * **Why OKLCH rather than HSL.** HSL's "lightness" is not lightness: `hsl(60 100% 50%)`
 * (yellow) and `hsl(240 100% 50%)` (blue) claim the same 50% and differ by a factor of
 * about twelve in perceived brightness. Any scheme that derives a palette by holding HSL
 * lightness constant therefore produces a set that looks wildly uneven, and any scheme
 * that solves for contrast in HSL has to solve separately per hue. OKLab is built so a
 * given L means the same apparent lightness at every hue, which is what makes "same
 * lightness, different hue" a usable rule and what makes a contrast solve converge.
 *
 * Reference: Björn Ottosson, "A perceptual color space for image processing" (2020).
 */

export interface Rgb {
  /** 0–255. */
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  /** Perceptual lightness, 0–1. */
  l: number;
  /** Chroma, 0–~0.4 in sRGB. */
  c: number;
  /** Hue angle in degrees, 0–360. */
  h: number;
}

/* ── sRGB ─────────────────────────────────────────────────────────────────── */

/** `#rgb` or `#rrggbb` → components, or null when it is neither. */
export function parseHex(hex: string): Rgb | null {
  const h = hex.trim().replace(/^#/, "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** sRGB 0–255 → linear-light 0–1. The transfer function, not a gamma of 2.2. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(channel: number): number {
  const c = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
  return c * 255;
}

/* ── OKLab / OKLCH ────────────────────────────────────────────────────────── */

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(A * A + B * B);
  // Hue is meaningless at zero chroma; 0 keeps it stable rather than NaN-adjacent.
  const h = c < 1e-6 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** OKLCH → sRGB, WITHOUT gamut clipping. May return components outside 0–255. */
function oklchToRgbRaw({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return {
    r: fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

function inGamut({ r, g, b }: Rgb): boolean {
  const ok = (v: number) => v >= -0.5 && v <= 255.5;
  return ok(r) && ok(g) && ok(b);
}

/**
 * OKLCH → sRGB, reducing CHROMA until the colour fits.
 *
 * Clamping the channels instead — the obvious approach — shifts hue and lightness
 * together and unpredictably: a saturated blue that overflows clips to a different blue
 * that is also lighter. Holding L and h and giving up chroma keeps the colour
 * recognisably the one that was asked for, which matters when the whole point is to
 * derive a family at a fixed lightness.
 */
export function oklchToRgb(target: Oklch): Rgb {
  const direct = oklchToRgbRaw(target);
  if (inGamut(direct)) return direct;

  let lo = 0;
  let hi = target.c;
  // 20 halvings resolves chroma to ~4e-7, far below a perceptible step.
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgbRaw({ ...target, c: mid }))) lo = mid;
    else hi = mid;
  }
  return oklchToRgbRaw({ ...target, c: lo });
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = parseHex(hex);
  return rgb ? rgbToOklch(rgb) : null;
}

export function oklchToHex(lch: Oklch): string {
  return toHex(oklchToRgb(lch));
}

/* ── WCAG contrast ────────────────────────────────────────────────────────── */

/** WCAG 2.x relative luminance. */
export function luminance(rgb: Rgb): number {
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/** WCAG 2.x contrast ratio, 1–21. Order-independent. */
export function contrast(a: Rgb | string, b: Rgb | string): number {
  const ra = typeof a === "string" ? parseHex(a) : a;
  const rb = typeof b === "string" ? parseHex(b) : b;
  if (!ra || !rb) return 1;
  const la = luminance(ra);
  const lb = luminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The lightness at hue `h`, chroma `c` that hits `target` contrast against `against`.
 *
 * Binary search rather than algebra: OKLab lightness does not map to WCAG luminance in
 * closed form, and it is not even monotonic in the general case once gamut clipping
 * starts reducing chroma. It IS monotonic over the half-range we search — away from the
 * background — which is why the direction is chosen first.
 *
 * Returns the best lightness found. If the target is unreachable at this hue and chroma
 * (a saturated yellow cannot make 7:1 against white at any lightness without going grey)
 * it returns the extreme end, and the caller should check the contrast it actually got
 * rather than assuming success — `deriveTokenSet` does exactly that.
 */
export function solveLightness(
  target: number,
  against: Rgb,
  h: number,
  c: number,
  direction: "lighter" | "darker",
): number {
  // The half-range on the far side of the background from where we are heading.
  // Going darker, that is [0, backgroundL]; going lighter, [backgroundL, 1]. Contrast is
  // monotonic across each of those halves, which is what makes a binary search valid —
  // it is NOT monotonic across the whole 0..1 range, because it turns around at the
  // background's own lightness.
  const bgL = rgbToOklch(against).l;
  let lo = direction === "darker" ? 0 : bgL;
  let hi = direction === "darker" ? bgL : 1;

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const got = contrast(oklchToRgb({ l: mid, c, h }), against);
    // Moving AWAY from the background raises contrast; which way that is depends on
    // whether we are going lighter or darker.
    if (got < target) {
      if (direction === "darker") hi = mid;
      else lo = mid;
    } else if (direction === "darker") lo = mid;
    else hi = mid;
  }
  return direction === "darker" ? lo : hi;
}

/* ── Colour-vision deficiency ─────────────────────────────────────────────── */

export type CvdType = "protanopia" | "deuteranopia" | "tritanopia";

/**
 * Brettel/Viénot-style dichromat simulation in linear RGB.
 *
 * An approximation, and a well-established one. It is here so the kit can FAIL a
 * categorical ramp that two of its series become indistinguishable under, rather than
 * asserting CVD-safety in a comment the way `chart-palette.ts` did — the audit found
 * four of the nine default light chart hues below the 3:1 they were claimed to hold.
 */
const CVD_MATRIX: Record<CvdType, number[][]> = {
  protanopia: [
    [0.1705, 0.8295, 0],
    [0.1705, 0.8295, 0],
    [-0.0045, 0.0045, 1],
  ],
  deuteranopia: [
    [0.33066, 0.66934, 0],
    [0.33066, 0.66934, 0],
    [-0.02785, 0.02785, 1],
  ],
  tritanopia: [
    [1, 0.1273, -0.1273],
    [0, 0.8739, 0.1261],
    [0, 0.8739, 0.1261],
  ],
};

export function simulateCvd(rgb: Rgb, type: CvdType): Rgb {
  const m = CVD_MATRIX[type];
  const [r, g, b] = [toLinear(rgb.r), toLinear(rgb.g), toLinear(rgb.b)];
  return {
    r: fromLinear(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    g: fromLinear(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    b: fromLinear(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  };
}

/**
 * Perceptual distance in OKLab, which is what that space is FOR: a Euclidean distance
 * in OKLab corresponds far more closely to "how different do these look" than one in
 * sRGB, where the same numeric gap is obvious among greens and invisible among blues.
 */
export function deltaE(a: Rgb, b: Rgb): number {
  const A = rgbToOklch(a);
  const B = rgbToOklch(b);
  const aA = A.c * Math.cos((A.h * Math.PI) / 180);
  const aB = A.c * Math.sin((A.h * Math.PI) / 180);
  const bA = B.c * Math.cos((B.h * Math.PI) / 180);
  const bB = B.c * Math.sin((B.h * Math.PI) / 180);
  return Math.hypot(A.l - B.l, aA - bA, aB - bB);
}
