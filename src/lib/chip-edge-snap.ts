// Chip's edge snapping: the module-level engine (one ResizeObserver, one `resize`
// listener and one resolution query for every snapped chip on the page, and the state
// they share) and the hook a chip hangs it on. Moved out of components/chip.tsx as it
// was (MOD-9, refactor audit 2026-10); chip.tsx still exports `refreshChipEdges`.
import { useCallback, useLayoutEffect, useRef } from "react";

/* ── Edge snapping (fractional device-pixel ratios) ──────────────────────────
 *
 * WHY. At a device-pixel ratio of 1.25 (a 125 % Windows display, or 125 % browser
 * zoom) Chrome snaps a box to whole CSS pixels and only then scales it, so a 1px
 * border is 1.25 device pixels wide and starts at a quarter-pixel phase that depends
 * on where the edge lands. A chip's left edge follows whatever stands before it, its
 * right edge follows its own text, so the two land on unrelated phases: one rasterises
 * as a crisp pixel, the other as a two-pixel smear at half strength — and a 60 %-alpha
 * border (`--danger-border`) makes the smeared side read as a THINNER line (keksdose
 * dev #576).
 *
 * WHAT FIXES IT. The two edges rasterise as mirror images exactly when their device
 * positions sum to a whole number: `(2·left + width) · dpr` integral, `left` being the
 * edge's snapped CSS x. Rounding the WIDTH alone to the ratio's grid (4px at 1.25)
 * makes the phases EQUAL, which is not the same thing: measured with keksdose's
 * playwright harness across every left phase at 1.25, width-only rounding mirrored the
 * edges at two of the four phases and left the other two as lopsided as before (mean
 * peak asymmetry 16.5, worse than the unsnapped 10.9 a random width gets by luck); the
 * position-aware width below took it to 0 at every phase. Inset rings, whole-pixel
 * starts, compositing hints and fractional border widths were measured by keksdose
 * and do not help — Chrome rounds a sub-pixel border back up to 1px.
 *
 * So the fix needs the chip's position, which is why it is opt-in (`snapEdges`): it
 * reads layout. Cheaply — every snapped chip on the page shares one ResizeObserver,
 * one `resize` listener and one resolution media query, and a pass is batched into a
 * frame as read-all / write-all, not a forced layout per chip. At an integer ratio,
 * and at a half one (1.5, 2.5: grid 2 — measured symmetric already, both edges a
 * pixel and a half on the same pattern), there is nothing to fix and a pass
 * writes nothing.
 */

/** The smallest whole CSS-pixel count `n` with `n × dpr` whole — 4 at 1.25, 2 at 1.5,
 *  1 at an integer ratio. 0 for a ratio no step up to 4px fits (110 % zoom wants 10px;
 *  a chip growing by up to 9px is a layout change, not a hairline fix). */
function chipEdgeGrid(dpr: number): number {
  for (let n = 1; n <= 4; n++) if (Math.abs(n * dpr - Math.round(n * dpr)) < 1e-3) return n;
  return 0;
}

/**
 * The width (whole CSS px, at least `natural`) that mirrors a box's two edges at
 * `dpr`, for a box whose left edge sits at CSS x `left`. `natural` back when the ratio
 * needs nothing.
 */
function snappedChipEdgeWidth(natural: number, left: number, dpr: number): number {
  const n = chipEdgeGrid(dpr);
  if (n <= 2) return natural;
  const l = Math.round(left);
  // A hair under a whole pixel is that pixel: 59.999 is a 60px chip, not a 61px one.
  let w = Math.ceil(natural - 0.01);
  while ((((2 * l + w) % n) + n) % n !== 0) w++;
  return w;
}

const snapped = new Set<HTMLElement>();
/** The min-width each chip was given by a pass — so a pass only ever clears its own. */
const written = new WeakMap<HTMLElement, string>();
let snapFrame = 0;
let snapObserver: ResizeObserver | null = null;
let ratioQuery: MediaQueryList | null = null;

function clearOwn(el: HTMLElement) {
  const own = written.get(el);
  if (own !== undefined && el.style.minWidth === own) el.style.minWidth = "";
  written.delete(el);
}

/**
 * Re-snap every chip rendered with `snapEdges`, now. The kit already re-snaps when a
 * chip renders, resizes, or the window or the ratio changes; call this after moving
 * chips some other way (a side panel sliding in beside a table of status chips),
 * since a move is not something an observer can see.
 */
export function refreshChipEdges(): void {
  if (snapFrame) {
    cancelAnimationFrame(snapFrame);
    snapFrame = 0;
  }
  if (typeof window === "undefined" || !snapped.size) return;
  const dpr = window.devicePixelRatio || 1;
  const els = [...snapped];
  // Write: back to the natural width, so what is read below is the chip, not our pin.
  for (const el of els) clearOwn(el);
  const n = chipEdgeGrid(dpr);
  if (n <= 2) return;
  // A chip whose own end decides where it starts (RTL, `justify-end`) moves when it
  // grows, so a pass re-reads what it wrote and steps on by a pixel until the edges
  // agree — `n` steps cover every residue. Each pass is ONE layout for every chip
  // together. A chip that never agrees (a centred one moves both edges at once) is
  // given its natural width back rather than kept wider for nothing.
  let pending = els;
  for (let pass = 0; pass <= n && pending.length; pass++) {
    const reads = pending.map((el) => {
      const r = el.getBoundingClientRect();
      // The text label (chip.tsx's CHIP_LABEL_TRUNCATE; `.truncate` before 0.33).
      const label = el.querySelector<HTMLElement>(".truncate-until-large");
      // Not laid out (a hidden ancestor, jsdom), or truncated at its container's edge,
      // where a wider chip would overflow: leave it alone. So too a label wrapped onto
      // a second line at Large (0.32.1): the chip is already as wide as its row lets it
      // be, and a min-width past that would push it over the edge just the same.
      if (!r.width || (label && (label.scrollWidth > label.clientWidth || labelWraps(label)))) return null;
      const width = Math.round(r.width * 64) / 64;
      const target = snappedChipEdgeWidth(width, r.left + window.scrollX, dpr);
      return target === width ? null : target;
    });
    const next: HTMLElement[] = [];
    pending.forEach((el, i) => {
      const target = reads[i];
      if (target == null) return;
      if (pass === n) {
        clearOwn(el);
        return;
      }
      const own = written.get(el);
      const value = `${pass > 0 && own !== undefined ? parseFloat(own) + 1 : target}px`;
      el.style.minWidth = value;
      written.set(el, value);
      next.push(el);
    });
    pending = next;
  }
}

/** Whether a chip's label runs to more than one line — taller than one and a half of
 *  its line height. A line height of `normal` (no number to compare) counts as one line. */
function labelWraps(label: HTMLElement): boolean {
  const line = Number.parseFloat(getComputedStyle(label).lineHeight);
  return line > 0 && label.clientHeight > 1.5 * line;
}

function scheduleChipEdges() {
  if (snapFrame || typeof requestAnimationFrame === "undefined") return;
  snapFrame = requestAnimationFrame(() => {
    snapFrame = 0;
    refreshChipEdges();
  });
}

/** The resolution query for the CURRENT ratio: it stops matching when the ratio
 *  changes (a window dragged to another display), which a `resize` need not fire. */
function watchRatio() {
  ratioQuery?.removeEventListener("change", onRatioChange);
  ratioQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      : null;
  ratioQuery?.addEventListener("change", onRatioChange);
}

function onRatioChange() {
  watchRatio();
  scheduleChipEdges();
}

function registerSnap(el: HTMLElement) {
  if (snapped.has(el)) return;
  if (!snapped.size) {
    if (typeof ResizeObserver !== "undefined") snapObserver = new ResizeObserver(scheduleChipEdges);
    window.addEventListener("resize", scheduleChipEdges);
    watchRatio();
  }
  snapped.add(el);
  snapObserver?.observe(el);
  scheduleChipEdges();
}

function unregisterSnap(el: HTMLElement) {
  if (!snapped.delete(el)) return;
  snapObserver?.unobserve(el);
  clearOwn(el);
  if (snapped.size) return;
  snapObserver?.disconnect();
  snapObserver = null;
  window.removeEventListener("resize", scheduleChipEdges);
  ratioQuery?.removeEventListener("change", onRatioChange);
  ratioQuery = null;
}

/** The ref a chip hangs on its visible pill, plus a re-snap after every render (its
 *  label or its neighbours may have changed). */
export function useSnapEdges(on: boolean) {
  const node = useRef<HTMLElement | null>(null);
  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (el === node.current) return;
      const prev = node.current;
      node.current = el;
      // React detaches and re-attaches a ref whose callback changed identity (a
      // consumer's inline ref) — the same element, a moment apart. Unregistering on
      // the detach would clear the pin and paint one frame unsnapped, so the drop
      // waits a microtask and is skipped if the element came straight back.
      if (prev) queueMicrotask(() => node.current !== prev && unregisterSnap(prev));
      if (el && on) registerSnap(el);
    },
    [on],
  );
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    if (on) {
      registerSnap(el);
      scheduleChipEdges();
    } else unregisterSnap(el);
  });
  return ref;
}
