// "The focused node left" (refactor audit 2026-10-30, Wave 1: DSP-4, DSP-15). When the
// element holding the keyboard's focus is removed — a table row deleted, filtered out or
// approved; a bulk bar gone with its Clear; a banner its × took away — the browser puts
// focus on <body> and says nothing: no blur in Chromium, none in jsdom. A keyboard or
// screen-reader user then starts again from the top of the page. The overlays give focus
// back to their opener (use-focus-trap); these helpers are for the controls that leave
// the page while the focus is IN them, and decide where it goes instead.

/**
 * Candidate tab stops, in DOM order — narrowed by {@link isTabStop} to the ones a Tab
 * really reaches. The kit's one copy of the rule (0.52 code review, lib/focus-left.ts):
 * this file and use-focus-trap each had it, with an exported `firstTabStop` apiece that
 * disagreed about the element itself, and a combobox panel's toolbar had a third
 * selector. The trap, the focus a removed node drops (below), the tour's field ring and
 * the toolbar all read it here, so "the next stop" is the same stop everywhere.
 *
 * The selector is the one `Modal` used. On its own it was not enough (round 0.34
 * BUG-4): only the bare `[tabindex]` clause excluded `-1`, so a `button`, an `input` or
 * a link taken out of the tab order still counted. A panel that ends in a roving grid —
 * the calendar's days, the month grid, the picker sheet's rows, every one of them `-1`
 * but the active cell — then had a "last" stop no Tab ever reaches: Tab from the real
 * last stop was not wrapped and walked out of the open panel, and Shift+Tab from the
 * first landed on a cell that is not a stop at all.
 */
const TAB_STOP =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A stop the browser's own Tab would land on: in the tab order (`tabIndex` ≥ 0) and not
 * inside something `hidden` or `inert`. Removes only elements a native Tab never
 * reaches, so no correct order changes. `visibility: hidden` and closed `<details>` are
 * still not walked — they need layout, which this rule has never read.
 */
function isTabStop(el: HTMLElement): boolean {
  return el.tabIndex >= 0 && !el.closest("[hidden],[inert]");
}

export interface TabStopOptions {
  /** Whether `el` itself counts, first, when it is a stop. Default true: the tour's
   *  target may BE the field (refactor audit 2026-10-30, DUP-9). False for "a control
   *  inside it" — a row, a drawer, a trap's container, a toolbar. */
  includeSelf?: boolean;
}

/** The tab stops in `el`, in DOM order — `el` itself first when it is one, unless
 *  `includeSelf: false`. */
export function tabStops(el: Element, { includeSelf = true }: TabStopOptions = {}): HTMLElement[] {
  const inside = Array.from(el.querySelectorAll<HTMLElement>(TAB_STOP)).filter(isTabStop);
  const own = includeSelf && el instanceof HTMLElement && el.matches(TAB_STOP) && isTabStop(el);
  return own ? [el, ...inside] : inside;
}

/** The first of {@link tabStops} — the control a person types into or presses — or null. */
export function firstTabStop(el: Element, options?: TabStopOptions): HTMLElement | null {
  return tabStops(el, options)[0] ?? null;
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
