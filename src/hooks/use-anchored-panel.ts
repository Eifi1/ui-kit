import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { useAnchoredRect, type AnchorRect } from "./use-anchored-rect";
import { useTextSize } from "../theme/text-size";
import type { Direction } from "../lib/direction";

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
  /**
   * The height of the LAYOUT viewport itself, which `position: fixed`'s `bottom` is
   * measured from. Only {@link anchoredPanelPlacement} reads it, for a flipped panel's
   * `bottom`. Defaults to `top + height`: the two are the same box whenever no keyboard
   * and no zoom shrink the visible region.
   */
  layoutHeight?: number;
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

const UNMEASURED_VIEWPORT: ViewportBox = { top: 0, height: 0 };

function readViewport(): ViewportBox {
  if (typeof window === "undefined") return { top: 0, height: 0 };
  const vv = window.visualViewport;
  // The layout viewport's height is `innerHeight`, the reference `readKeyboardInset`
  // measures the keyboard against. The keyboard leaves it alone (it shrinks only the
  // VISUAL viewport; under `interactive-widget=resizes-content` it shrinks both, the
  // fixed box with them), and it follows the mobile URL bar as it slides away, as a
  // fixed box's `bottom` does. Not `documentElement.clientHeight`: on mobile Chrome and
  // Safari that stays at the small, URL-bar-shown height, so with the bar scrolled away
  // a flipped panel would sit that much too low, over its own field. `innerHeight`'s one
  // error is a desktop page with a horizontal scrollbar, which it counts and the fixed
  // box does not: the gap widens by the bar's thickness, and never closes.
  const layoutHeight = window.innerHeight;
  // offsetTop, not 0: with the keyboard up the user can also pan the visual viewport
  // within the layout viewport, which shifts where "visible" starts.
  return vv
    ? { top: vv.offsetTop, height: vv.height, layoutHeight }
    : { top: 0, height: window.innerHeight, layoutHeight };
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

/**
 * `top` and `bottom` are the two edges of a panel exactly `maxHeight` tall. A panel is
 * sized by its content and `maxHeight` only caps it, so apply the edge on the trigger's
 * side, the one that holds whatever the height: `top` while the panel is below,
 * `bottom` (and no `top`) once it is flipped `above`.
 */
export interface AnchoredPanel {
  /** The trigger's rect, or null while closed/unmeasured. */
  rect: AnchorRect | null;
  /** Viewport-space `top` for the panel — the one to apply while it is below. Flipped,
   *  it is where a FULL-height panel's top would be, and a three-row list placed by it
   *  floated far above its field (keksdose K1, live #401); place that one by `bottom`. */
  top: number;
  /** CSS `bottom` for a `position: fixed` panel: the distance from the layout
   *  viewport's bottom edge up to the panel's. The one to apply once it is flipped
   *  `above`: it keeps the panel's foot `gap` above the trigger however short its
   *  content, and while a filtered list shrinks or grows under the user's typing. */
  bottom: number;
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
 * A flipped panel hangs from its BOTTOM edge, `gap` above the trigger, and is placed by
 * `bottom` (keksdose K1, live #401). It used to be placed by a `top` worked out as
 * though the panel were `maxHeight` tall, and a panel is only as tall as its content:
 * a three-row address list under a 256 px cap sat ~176 px above its field, on a phone
 * with the keyboard up. Only when even the {@link FLOOR} does not fit above does that
 * edge give way, as `top` always did, so the panel's head (a search box, often) stays
 * on screen rather than above it.
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
  // Unchanged, for the apps that call the hook and apply it: the edge to use below, and
  // a full-height panel's top above. In layout-viewport space, like the rect.
  const top = above ? Math.max(viewTop, rect.top - gap - maxHeight) : rect.bottom + gap;
  // `bottom` counts up from the LAYOUT viewport's bottom edge, not the visible region's:
  // `position: fixed` is laid out in the layout viewport, which runs on behind the
  // keyboard, exactly as the rect is measured in it. The keyboard, the pan and the zoom
  // are already in `maxHeight`, which keeps the panel's top inside what is on screen.
  const layoutHeight = viewport.layoutHeight ?? viewport.top + viewport.height;
  return { top, bottom: layoutHeight - (top + maxHeight), maxHeight, above };
}

/**
 * The glass a panel has to stay on, in CSS pixels — `window.innerWidth` is the wrong
 * width on a phone (keksdose run 72, live #381). There it is the LAYOUT viewport, and
 * that grows to the page's width as soon as anything sticks out past the screen: 430 on
 * a 406px screen in Chromium's mobile emulation, with `position: fixed` layers laid out
 * against the 430. A panel that had widened the page then measured itself as inside it.
 * The root element's client width is the initial containing block instead — the screen,
 * the width `100vw` and the media queries see — whatever overflows, and on a desktop it
 * also leaves a classic scrollbar out, which is where a fixed box's `right` is measured
 * from. It is 0 where nothing is laid out (jsdom), and the window is the answer there.
 * The height stays the window's: nothing measured grows it, and a phone's collapsing
 * toolbar makes the window the truer of the two.
 *
 * Tooltip's lesson, moved here so every anchored panel reads the same width (round 0.34
 * Wave 2, DUP-7).
 */
export function viewportSize(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
  };
}

export interface AnchoredInlineOptions {
  /** The trigger's reading direction, which `start`, `end` and `after` follow. Default
   *  `ltr`. A portalled panel has left the subtree it would inherit `dir` from, so read
   *  it off the trigger (`dirOf`). */
  dir?: Direction;
  /**
   * Which of the panel's edges lines up with which of the trigger's:
   * - `start` / `end` — the panel's start (end) edge on the trigger's start (end) edge,
   *   by reading direction: a picker hangs from its field's start, a popover from its
   *   button's end;
   * - `left` / `right` — the same, physically;
   * - `after` — the panel's start edge on the trigger's END edge: beside it, as the
   *   sidebar's flyout opens.
   *
   * Default `start`.
   */
  align?: "start" | "end" | "left" | "right" | "after";
  /** The room kept from either edge of the glass, in px. Default 8. */
  edge?: number;
  /** The glass's width. Default {@link viewportSize}'s. */
  viewportWidth?: number;
}

/** The horizontal place of a `position: fixed` panel: its `left`, and the `right` of the
 *  same box for a panel hung from its right edge (both in px, from the glass's edges). */
export interface InlinePlacement {
  left: number;
  right: number;
}

/**
 * The horizontal half of an anchored panel, beside {@link anchoredPanelPlacement}'s
 * vertical one (round 0.34 Wave 2, DUP-7): where a panel `panelWidth` wide goes against
 * the trigger's `rect`, kept `edge` px inside the glass ({@link viewportSize}).
 *
 * Popover, DropdownPanel, ComboboxPanel, HoverMenu and the AppShell flyout each wrote
 * this themselves, against three different widths: `innerWidth`, which on a phone is
 * the grown layout viewport and on a desktop counts the scrollbar; the root's client
 * width; and, for the entity picker's panel in a left-to-right form, no clamp at all.
 *
 * A panel wider than the room keeps its START on the glass — its left edge in a
 * left-to-right form, its right in a right-to-left one — as Tooltip's slide does: the
 * start of a row of text is the half worth keeping.
 */
export function anchoredInline(
  rect: Pick<AnchorRect, "left" | "right">,
  panelWidth: number,
  { dir = "ltr", align = "start", edge = 8, viewportWidth = viewportSize().width }: AnchoredInlineOptions = {},
): InlinePlacement {
  const rtl = dir === "rtl";
  // Where the panel's LEFT edge goes, before the clamp.
  let wanted: number;
  switch (align) {
    case "left":
      wanted = rect.left;
      break;
    case "right":
      wanted = rect.right - panelWidth;
      break;
    case "start":
      wanted = rtl ? rect.right - panelWidth : rect.left;
      break;
    case "end":
      wanted = rtl ? rect.left : rect.right - panelWidth;
      break;
    case "after":
      wanted = rtl ? rect.left - panelWidth : rect.right;
      break;
  }
  const min = edge;
  const max = viewportWidth - edge - panelWidth;
  const left = max < min ? (rtl ? max : min) : Math.min(Math.max(wanted, min), max);
  return { left, right: viewportWidth - left - panelWidth };
}

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

/**
 * Where to put a panel anchored under `ref`, tracking the visible viewport.
 *
 * Callers own horizontal placement, through {@link anchoredInline} — the pickers align
 * to the trigger's start edge, the popovers to its end — and must apply `maxHeight` with
 * an internal `overflow-y`.
 * Vertically, apply `top` while the panel is below and `bottom` (with no `top`) once it
 * is `above`; see {@link AnchoredPanel}.
 */
export function useAnchoredPanel<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  options: AnchoredPanelOptions = {},
): AnchoredPanel {
  const rect = useAnchoredRect(ref, open);
  // Not read while rendering (0.48.2, keksdose K-052-2): in Chromium `visualViewport`'s
  // geometry forces a style and layout pass on a dirty DOM, and every anchored panel —
  // closed ones too — paid it on mount (a bulk bar's pickers appearing on the first
  // ticked row of a long table paid a layout of the whole table). Nothing reads this
  // before the layout effect below has filled it: `rect` is null until the panel is open
  // and measured, and that same effect pass measures the viewport.
  const [viewport, setViewport] = useState<ViewportBox>(UNMEASURED_VIEWPORT);
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
    return { rect: null, top: 0, bottom: 0, maxHeight: preferredHeight, above: false };
  }
  return { rect, ...anchoredPanelPlacement(rect, viewport, { ...options, preferredHeight, minHeight }) };
}
