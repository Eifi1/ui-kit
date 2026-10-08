import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { useAnchoredRect, type AnchorRect } from "./use-anchored-rect";
import { useTextSize } from "../theme/text-size";

/**
 * Vertical placement for a portalled, `position: fixed` panel anchored to a trigger.
 *
 * The problem it solves (feedback #135): on a phone, opening a picker focuses its
 * search box, the on-screen keyboard slides up, and a panel pinned below a trigger in
 * the lower half of the screen ends up entirely behind that keyboard — with nothing
 * the user can do about it, because `position: fixed` does not scroll.
 *
 * The keyboard is invisible to the usual measurements: on Android Chrome the LAYOUT
 * viewport (`window.innerHeight`, and the origin `getBoundingClientRect` and
 * `position: fixed` are relative to) does not shrink when it opens. Only
 * `visualViewport` reports the region actually on screen, so that is what this reads.
 */

/** The on-screen region, in layout-viewport coordinates. */
export interface ViewportBox {
  top: number;
  height: number;
}

/**
 * Whether the page is pinch-zoomed (docs/text-size-harmonization.md §10.2). A zoom
 * shrinks `visualViewport.height` exactly like an on-screen keyboard does, so every
 * reader below must tell the two apart — and while zoomed, the answer is "no keyboard":
 * following a zoomed viewport would drag a pinned row on every pan, magnified, and the
 * browser already scrolls a focused field into view. The epsilon absorbs a scale of
 * 1.0000001 that some engines report at rest.
 */
function isZoomed(vv: VisualViewport): boolean {
  return vv.scale > 1.001;
}

/** Below this the "keyboard" is rounding noise or a browser UI strip — `innerHeight` and
 *  `visualViewport.height` routinely disagree by a pixel or two — and nothing should move
 *  (keksdose's `MIN_KEYBOARD_PX`). */
const MIN_KEYBOARD_PX = 100;

export interface KeyboardInsetOptions {
  /** The smallest inset that counts as a keyboard. Default 100 px. */
  minimum?: number;
}

/**
 * How many CSS px at the bottom of the LAYOUT viewport the on-screen keyboard covers, now
 * — the one guarded reader (§10.2), so the apps' copies go (keksdose's
 * `use-keyboard-inset.ts`):
 *
 * - 0 while the page is pinch-zoomed (`visualViewport.scale > 1`), where a smaller visual
 *   viewport is the zoom, not a keyboard;
 * - 0 below `minimum` (100 px), which is noise;
 * - 0 without `visualViewport` (SSR, jsdom, an old browser) and under
 *   `interactive-widget=resizes-content`, where `bottom: 0` already lands above the
 *   keyboard.
 *
 * Read it on `visualViewport`'s `resize` and `scroll` events (window `resize` as the
 * fallback); a bottom-anchored control lifts itself by the result.
 */
export function readKeyboardInset({ minimum = MIN_KEYBOARD_PX }: KeyboardInsetOptions = {}): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv || isZoomed(vv)) return 0;
  const inset = Math.round(window.innerHeight - vv.height - vv.offsetTop);
  return inset >= minimum ? inset : 0;
}

function readViewport(): ViewportBox {
  if (typeof window === "undefined") return { top: 0, height: 0 };
  const vv = window.visualViewport;
  // offsetTop, not 0: with the keyboard up the user can also pan the visual viewport
  // within the layout viewport, which shifts where "visible" starts.
  return vv ? { top: vv.offsetTop, height: vv.height } : { top: 0, height: window.innerHeight };
}

export interface AnchoredPanelOptions {
  /** Space between trigger and panel. */
  gap?: number;
  /** Space kept clear at the viewport edges. */
  margin?: number;
  /** The height the panel would like, when there is room. In px at Normal text size:
   *  {@link useAnchoredPanel} multiplies it by the size's scale, since what a panel
   *  holds is rows of text (0.32, docs/text-size-harmonization.md §3.2). */
  preferredHeight?: number;
  /** Below this, the space under the trigger counts as unusable and a flip is considered.
   *  In px at Normal, scaled likewise. */
  minHeight?: number;
}

export interface AnchoredPanel {
  /** The trigger's rect, or null while closed/unmeasured. */
  rect: AnchorRect | null;
  /** Viewport-space `top` for the panel. */
  top: number;
  /** Cap that keeps the panel inside the VISIBLE viewport — apply as `maxHeight`. */
  maxHeight: number;
  /** Whether the panel was flipped above the trigger. */
  above: boolean;
}

/** Absolute floor: below this a list is useless, so overflow the margin instead. */
const FLOOR = 96;

/** How much more room above must offer, when neither side fits the preferred height,
 *  before the panel changes sides — so it never jumps for a few pixels' gain. */
const FLIP_GAIN = 48;

/**
 * The pure half of {@link useAnchoredPanel}: where a panel goes, given the trigger's
 * rect and the region actually on screen.
 *
 * Prefers below the trigger — the conventional direction, and the one that keeps the
 * trigger's own value visible — whenever the panel's preferred height fits there. When it
 * does not, the panel opens above if the full height fits there, or if above is clearly
 * roomier (by {@link FLIP_GAIN}); below an unusable `minHeight` it flips to any roomier
 * side, as before. It used to flip only below `minHeight`, so a select with 160–319 px
 * under it opened downward as a cramped list with 600 px free above (keksdose live #384,
 * the currency select of the new-budget form near the bottom of the screen). The
 * returned `maxHeight` is what makes the flip sufficient rather than merely different:
 * without it a tall panel placed above just runs off the top instead of the bottom.
 *
 * Split out so the geometry is testable without a DOM and a fake keyboard — @hb/ui has
 * no test runner of its own, so this is exercised from the consuming app.
 */
export function anchoredPanelPlacement(
  rect: Pick<AnchorRect, "top" | "bottom">,
  viewport: ViewportBox,
  { gap = 4, margin = 8, preferredHeight = 320, minHeight = 160 }: AnchoredPanelOptions = {},
): Omit<AnchoredPanel, "rect"> {
  const viewTop = viewport.top + margin;
  const viewBottom = viewport.top + viewport.height - margin;
  const spaceBelow = viewBottom - (rect.bottom + gap);
  const spaceAbove = rect.top - gap - viewTop;
  const above =
    spaceAbove > spaceBelow &&
    (spaceBelow < minHeight ||
      (spaceBelow < preferredHeight && (spaceAbove >= preferredHeight || spaceAbove - spaceBelow >= FLIP_GAIN)));
  const space = Math.max(FLOOR, above ? spaceAbove : spaceBelow);
  const maxHeight = Math.min(preferredHeight, space);
  return {
    top: above ? Math.max(viewTop, rect.top - gap - maxHeight) : rect.bottom + gap,
    maxHeight,
    above,
  };
}

/**
 * Where to put a panel anchored under `ref`, tracking the visible viewport.
 *
 * Callers own horizontal placement — the pickers align to the trigger's left edge, the
 * popovers to its right — and must apply `maxHeight` with an internal `overflow-y`.
 */
/**
 * The region actually on screen, tracked while `active` (Keksdose live #328).
 *
 * The same measurement {@link useAnchoredPanel} caps a dropdown with, for the callers
 * that need the box itself rather than a placement: a FULL-SCREEN sheet cannot use
 * `inset-0`, because on Android the on-screen keyboard shrinks only the VISUAL
 * viewport — `inset-0` still spans the whole screen, so the bottom of the sheet, and
 * the end of whatever list is scrolling inside it, live behind the keyboard where no
 * gesture reaches them.
 *
 * Returns `null` where there is nothing to correct: no `visualViewport` (jsdom, SSR,
 * older browsers) or no keyboard taking a bite out of it. A caller then keeps its
 * static layout, which is right at every width where this does not apply — and is why
 * the desktop and the test suite see exactly the markup they saw before.
 *
 * Also `null` while the page is pinch-zoomed (0.32, §10.2), with the guard
 * {@link readKeyboardInset} uses. A zoom shrinks the visual viewport like a keyboard,
 * and following it gave PickerSheet the zoomed region's top and height but the page's
 * full width — its close button sat off screen (kastlan, Kurvenschmiede). Zoomed, the
 * sheet keeps its static full-screen box, which the reader can pan to like the page.
 */
export function useVisualViewport(active: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);

  useLayoutEffect(() => {
    if (!active) return;
    const update = () => {
      const vv = typeof window === "undefined" ? undefined : window.visualViewport;
      // The 1px slack is not superstition: `visualViewport.height` is fractional on a
      // device-pixel-ratio that is not an integer (his phone reports 1.25), so a
      // strict comparison would report a "keyboard" of 0.4px on every phone and pin
      // a height where none was needed.
      setBox(
        vv && !isZoomed(vv) && vv.height < window.innerHeight - 1 ? { top: vv.offsetTop, height: vv.height } : null,
      );
    };
    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);

  return box;
}

export function useAnchoredPanel<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  options: AnchoredPanelOptions = {},
): AnchoredPanel {
  const rect = useAnchoredRect(ref, open);
  const [viewport, setViewport] = useState<ViewportBox>(readViewport);
  // A panel of rows wants room for the same number of rows at every text size; the gap
  // and the edge margin are not text and stay px.
  const { scale } = useTextSize();
  const preferredHeight = (options.preferredHeight ?? 320) * scale;
  const minHeight = (options.minHeight ?? 160) * scale;

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setViewport(readViewport());
    update();
    const vv = window.visualViewport;
    // The visualViewport events are the ones that fire when the keyboard opens;
    // window.resize is the fallback for browsers without the API (and for a genuine
    // window resize on desktop).
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  if (!rect) {
    return { rect: null, top: 0, maxHeight: preferredHeight, above: false };
  }
  return { rect, ...anchoredPanelPlacement(rect, viewport, { ...options, preferredHeight, minHeight }) };
}
