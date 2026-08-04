import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { useAnchoredRect, type AnchorRect } from "./use-anchored-rect";

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
  /** The height the panel would like, when there is room. */
  preferredHeight?: number;
  /** Below this, the space under the trigger counts as unusable and a flip is considered. */
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

/**
 * The pure half of {@link useAnchoredPanel}: where a panel goes, given the trigger's
 * rect and the region actually on screen.
 *
 * Prefers below the trigger — the conventional direction, and the one that keeps the
 * trigger's own value visible. Flips above only when below cannot show a usable list
 * AND above is roomier, so a panel never jumps sides for a few pixels' gain. The
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
  const above = spaceBelow < minHeight && spaceAbove > spaceBelow;
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
export function useAnchoredPanel<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  options: AnchoredPanelOptions = {},
): AnchoredPanel {
  const rect = useAnchoredRect(ref, open);
  const [viewport, setViewport] = useState<ViewportBox>(readViewport);

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
    return { rect: null, top: 0, maxHeight: options.preferredHeight ?? 320, above: false };
  }
  return { rect, ...anchoredPanelPlacement(rect, viewport, options) };
}
