import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/**
 * Remember where each page was scrolled to, and put the reader back there on Back.
 *
 * Browsers do this for free — but only for the DOCUMENT scroller. `AppShell` scrolls an
 * inner `<main>` above its `md` breakpoint (the shell itself is `h-dvh overflow-hidden`),
 * so the browser has nothing to restore: it faithfully returns `window.scrollY` to 0,
 * which it already was, and the reader lands at the top of the page they came from.
 *
 * TWO DECISIONS THAT LOOK WRONG AND ARE NOT:
 *
 * 1. **Keyed by pathname, not by `location.key`.** Keying by history entry is the more
 *    precise answer in theory — it distinguishes two visits to the same page — and it
 *    does not survive `HashRouter`, which canonicalises the URL with a `REPLACE` right
 *    after a `POP`. That replace mints a fresh key, so the position saved against the
 *    old one becomes unreachable a frame after it was restored. Traced: `POP` computed
 *    the right offset, then `REPLACE` arrived with a new key and reset to 0. A docs site
 *    wants one position per page anyway.
 *
 * 2. **`REPLACE` is ignored entirely.** It is not a reader navigating; it is the router
 *    tidying the URL. Treating it like a PUSH scrolls to the top for no reason the
 *    reader can perceive, which is exactly the bug above.
 *
 * IN-PAGE ANCHORS. Under `HashRouter` the URL's `#` is the route, so a plain `#section`
 * link is read as the path `/section` — which is how the contents chips used to land on
 * "No such page". They now link to `#/page#section`, the router's own hash, and this
 * hook is what turns that into a scroll: a location with a hash scrolls its element
 * into view instead of to the top. Positions are keyed by path AND hash, so Back from
 * a section returns to where the reader was before they jumped, not to the section.
 */
export function useScrollRestoration(scrollerRef: React.RefObject<HTMLElement | null>): void {
  const { pathname: path, hash } = useLocation();
  const pathname = path + hash;
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());
  /** The path the scroll listener is currently attributing positions to. */
  const currentPath = useRef(pathname);
  const frameRef = useRef(0);

  // Record continuously rather than on the way out. Saving during a navigation effect
  // looks right and is too late: `AppShell` keeps ONE <main> across routes, so by then
  // the incoming page's content is already in it and `scrollTop` has clamped against
  // the new height — usually to 0. The number we wanted is gone before we can ask.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => positions.current.set(currentPath.current, scroller.scrollTop);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [scrollerRef]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // The router tidying its own URL is not a navigation. Leave the scroll alone, and
    // do not re-point the listener — the path has not actually changed.
    if (navigationType === "REPLACE") return;

    currentPath.current = pathname;

    // POP is Back/Forward, the only case where a remembered offset is what the reader
    // expects. A fresh PUSH starts at the top: arriving at a new page already scrolled
    // halfway down reads as a rendering bug.
    const remembered = navigationType === "POP" ? positions.current.get(pathname) : undefined;

    // After paint. The incoming page may be shorter than the outgoing one, and
    // `scrollTop` clamps against the CURRENT content height — setting it in the same
    // frame silently clamps to whatever the old page's height allowed.
    //
    // The handle goes in a ref and is NOT cancelled by this effect's cleanup. Cleanup
    // runs whenever the deps change, and `HashRouter` fires its canonicalising REPLACE
    // in the very next commit after a POP — so cancelling here killed the restore one
    // frame after scheduling it, every single time. Cancellation belongs to unmount,
    // which is the only moment the callback is genuinely unwanted.
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const anchor = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      if (remembered === undefined && anchor) anchor.scrollIntoView({ block: "start" });
      else scroller.scrollTop = remembered ?? 0;
    });
  }, [pathname, hash, navigationType, scrollerRef]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
}
