import { useMediaQuery } from "./use-media-query";
import { useTextSize } from "../theme/text-size";

/**
 * Breakpoints that follow the text size, in JS (docs/text-size-harmonization.md §3.3,
 * §10.4).
 *
 * A media query's rem resolves against the browser's default font size, not `<html>`'s,
 * so Tailwind's `md:` would stay at 48rem when the root grows. tokens.css therefore
 * redefines every breakpoint variant per text size — `md:` is 48rem at Normal, 60rem at
 * Large, 72rem at Extra large — and these hooks ask the same question with the same
 * numbers, so the CSS and the JS answer always agree: AppShell's `md:hidden` and its
 * `isMdUp`, DataTable's cards and its full-screen dialog, an app's sticky footer
 * (keksdose's must be the SAME `usePhoneLayout()` the dialog uses, §10.4).
 *
 * Width queries only. Pointer and display-mode queries stay `useMediaQuery` (§10.4).
 */

/** The breakpoints at Normal, in rem: Tailwind's five, and `3xl` (keksdose's
 *  `min-[2400px]`, §10.4). tokens.css multiplies each by the text size. */
export const BREAKPOINT_REM = { sm: 40, md: 48, lg: 64, xl: 80, "2xl": 96, "3xl": 150 } as const;

export type Breakpoint = keyof typeof BREAKPOINT_REM;

/** A breakpoint variant, spelled as in a class: `"md"` is `md:` (at least md), `"max-md"`
 *  is `max-md:` (below md). */
export type BreakpointVariant = Breakpoint | `max-${Breakpoint}`;

/**
 * The browser's own default font size in px — what a media query's rem means (the
 * initial `font-size: medium`, never `<html>`'s). 16 unless the person changed it, and 16
 * outside a browser. Read once: changing it takes a browser setting, after which the
 * page is reloaded in practice.
 */
let browserRemPx: number | null = null;
function readBrowserRemPx(): number {
  if (browserRemPx !== null) return browserRemPx;
  // Outside a browser (SSR): 16, uncached, so the client's first real read still counts.
  if (typeof document === "undefined" || !document.body) return 16;
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;font-size:medium";
  document.body.appendChild(probe);
  const px = Number.parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  // jsdom computes no font size ("medium" or nothing): the default it stands for.
  browserRemPx = px > 0 ? px : 16;
  return browserRemPx;
}

/**
 * How many CSS px one `rem` is at `scale` (`TEXT_SCALE` of the size in force): the
 * browser's own default font size times the text size — what `<html>`'s computed font
 * size is, by tokens.css. For the few lengths JS has to do arithmetic with: a popover's
 * width against the viewport edge, a chart constant (§3.1, §3.2). 16 × `scale` outside a
 * browser and in jsdom, which computes no default font size.
 */
export function remPx(scale = 1): number {
  return readBrowserRemPx() * scale;
}

/** {@link remPx} at the text size in force, re-rendering when it changes. */
export function useRemPx(): number {
  const { scale } = useTextSize();
  return remPx(scale);
}

/** A length in rem as the kit spells one in JS — `"18rem"` — where a prop also takes px
 *  as a plain number. */
export type RemLength = `${number}rem`;

/**
 * A `number | RemLength` in CSS px now: a number is px as given, `"18rem"` is 18 ×
 * `rootRemPx` (see {@link remPx}). `undefined` stays `undefined`.
 */
export function lengthPx(length: number | RemLength, rootRemPx: number): number;
export function lengthPx(length: number | RemLength | undefined, rootRemPx: number): number | undefined;
export function lengthPx(length: number | RemLength | undefined, rootRemPx: number): number | undefined {
  if (length === undefined) return undefined;
  return typeof length === "number" ? length : Number.parseFloat(length) * rootRemPx;
}

/**
 * The media query a breakpoint variant means at `scale` (`TEXT_SCALE` of the size in
 * force). `"md"` → `(min-width: 768px)` at Normal, `(min-width: 960px)` at Large;
 * `"max-md"` → `(max-width: 767px)` at Normal. In px, scaled by the browser's own
 * default font size as well, so a person who set 20 px in the browser gets 960 px for
 * `md` at Normal — as the CSS does.
 *
 * At Normal these are, character for character, the strings the kit queried before
 * (`PHONE_QUERY`, DataTable's `isMdUp`), so a test's `matchMedia` stub keeps working.
 * Like those, the pair is exact at whole-pixel widths; on a fractional viewport width
 * between the two (767.2 px at a 1.25 device-pixel ratio) neither matches, where the
 * CSS's `width < 48rem` says phone. Verified in Chromium at 700–1300 px × three sizes.
 */
export function breakpointQuery(variant: BreakpointVariant, scale = 1, remPx: number = readBrowserRemPx()): string {
  const max = variant.startsWith("max-");
  const name = (max ? variant.slice(4) : variant) as Breakpoint;
  const px = Math.round(BREAKPOINT_REM[name] * remPx * scale);
  return max ? `(max-width: ${px - 1}px)` : `(min-width: ${px}px)`;
}

/**
 * Whether the viewport matches a breakpoint variant at the text size in force — the JS
 * twin of the class: `useBreakpoint("md")` is true exactly where `md:` applies,
 * `useBreakpoint("max-sm")` where `max-sm:` does. `fallback` answers where there is no
 * `matchMedia` (SSR, jsdom).
 */
export function useBreakpoint(variant: BreakpointVariant, fallback = false): boolean {
  const { scale } = useTextSize();
  return useMediaQuery(breakpointQuery(variant, scale), fallback);
}

/**
 * The phone layout: below `md` at the text size in force — `max-md:` in CSS. The single
 * answer for "is this the phone layout" (§10.4): the kit's own sheets and cards use it,
 * and an app's phone checks must too, so a tablet at 150 % gets every phone treatment
 * at once or none of them. Replaces `useMediaQuery(PHONE_QUERY)`.
 */
export function usePhoneLayout(fallback = false): boolean {
  return useBreakpoint("max-md", fallback);
}
