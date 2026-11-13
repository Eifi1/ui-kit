import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Whether the reader is working with a widget that zooms on Ctrl (⌘) + wheel and on
 * Safari's gesture events: a zoomable `SeriesChart` (through the zoom core) and
 * `ZoomableImage`. They take that signal only while this says so, and otherwise leave it
 * to the browser, whose page zoom it is (Marcel, 2026-11-13).
 *
 * Ctrl + mouse wheel is how many readers with low vision enlarge a page, and a browser
 * sends a trackpad pinch as that same wheel (Safari as WebKit's GestureEvents). Taken
 * whenever the pointer was over a chart or a receipt, a page zoom that crossed one zoomed
 * the chart instead. So, as Leaflet's maps sleep until clicked, the widget is ENGAGED:
 *
 * - when the reader's last press landed in it (a `pointerdown` of any kind: a mouse, a
 *   pen, a finger), or the focus last moved into it (Tab, a click on one of its buttons);
 * - and while it is zoomed, whatever is pressed or focused elsewhere, until it shows the
 *   whole of itself again.
 *
 * A press outside, or the focus moving to something outside, ends it while not zoomed.
 * Focus that goes nowhere (a click on a part of it that takes no focus, which blurs a
 * stop inside it; a window that loses the focus) ends nothing: the press decides.
 *
 * Touch is untouched: two fingers on it press into it, so they are an engagement in
 * themselves. A gesture the widget began taking runs to its end in the widget itself
 * (a pinch out to the whole range is not handed to the page halfway through).
 *
 * Returns a function read as an event arrives, from refs: nothing renders as the reader
 * presses and tabs around the page. Listeners on the document, in the capture phase, so a
 * press that something inside stops on its way still counts.
 *
 * @internal Not part of the barrel.
 */
export function useZoomEngagement(root: RefObject<HTMLElement | null>, zoomed: boolean): () => boolean {
  const engaged = useRef(false);
  const zoomedRef = useRef(zoomed);
  // In an effect rather than during render, as use-dismiss keeps its handler.
  useEffect(() => {
    zoomedRef.current = zoomed;
  });
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const doc = node.ownerDocument;
    const mark = (event: Event) => {
      engaged.current = node.contains(event.target as Node | null);
    };
    doc.addEventListener("pointerdown", mark, true);
    doc.addEventListener("focusin", mark, true);
    return () => {
      doc.removeEventListener("pointerdown", mark, true);
      doc.removeEventListener("focusin", mark, true);
    };
  }, [root]);
  return useCallback(() => engaged.current || zoomedRef.current, []);
}
