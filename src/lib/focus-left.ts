// "The focused node left" (refactor audit 2026-10-30, Wave 1: DSP-4, DSP-15). When the
// element holding the keyboard's focus is removed — a table row deleted, filtered out or
// approved; a bulk bar gone with its Clear; a banner its × took away — the browser puts
// focus on <body> and says nothing: no blur in Chromium, none in jsdom. A keyboard or
// screen-reader user then starts again from the top of the page. The overlays give focus
// back to their opener (use-focus-trap); these helpers are for the controls that leave
// the page while the focus is IN them, and decide where it goes instead.

/**
 * Candidate tab stops, narrowed by {@link isTabStop} — use-focus-trap's selector and
 * rule (round 0.34 BUG-4), so "the next stop" here is the one Tab would reach there.
 */
const TAB_STOP =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** In the tab order and not inside something `hidden` or `inert`. No layout is read. */
function isTabStop(el: HTMLElement): boolean {
  return el.tabIndex >= 0 && !el.closest("[hidden],[inert]");
}

/**
 * Whether the focus has fallen out of the page: onto `<body>`, onto nothing, or onto a
 * node no longer in the document. False on the server, where nothing has focus to lose.
 * A recovery asks this first: focus that went somewhere real (a dialog, the next field,
 * an app's own `focus()`) is the user's or the app's, and is left where it is.
 */
export function focusIsLost(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement;
  return !el || el === document.body || !el.isConnected;
}

/** The first stop a Tab would reach inside `root` (not `root` itself), or null. */
export function firstTabStop(root: Element): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(TAB_STOP)) if (isTabStop(el)) return el;
  return null;
}

/**
 * The tab stops around `frame`, outside it, nearest first on each side — where focus
 * goes once `frame` is gone. Read BEFORE it goes: a removed node has no place in the
 * document to measure from. `limit` per side keeps a long page's stops out of memory.
 */
export function tabStopsAround(frame: Element, limit = 5): { after: HTMLElement[]; before: HTMLElement[] } {
  const after: HTMLElement[] = [];
  const before: HTMLElement[] = [];
  for (const el of frame.ownerDocument.querySelectorAll<HTMLElement>(TAB_STOP)) {
    if (frame.contains(el) || !isTabStop(el)) continue;
    if (frame.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
      after.push(el);
      if (after.length >= limit) break;
    } else {
      before.push(el);
      if (before.length > limit) before.shift();
    }
  }
  return { after, before: before.reverse() };
}

/**
 * Focus the first of `candidates` that is still in the page and takes the focus; true
 * when one did. Each is tried and checked, since `focus()` on a node that cannot hold it
 * (detached, `display: none`, disabled since) fails without a word.
 */
export function focusFirst(candidates: Iterable<Element | null | undefined>): boolean {
  for (const el of candidates) {
    if (!(el instanceof HTMLElement) || !el.isConnected) continue;
    el.focus();
    if (document.activeElement === el) return true;
  }
  return false;
}

/**
 * Focus a container that is not a tab stop of its own — a table, a list — as the place
 * the user is in, without making it one: `tabindex="-1"` for as long as it holds the
 * focus, unless it already carries a `tabindex` of its own.
 */
export function focusContainer(el: HTMLElement): void {
  if (!el.hasAttribute("tabindex")) {
    el.setAttribute("tabindex", "-1");
    el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
  }
  el.focus();
}
