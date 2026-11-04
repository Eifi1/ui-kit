// "The focused node left" (refactor audit 2026-10-30, Wave 1: DSP-4, DSP-15). When the
// element holding the keyboard's focus is removed — a table row deleted, filtered out or
// approved; a bulk bar gone with its Clear; a banner its × took away — the browser puts
// focus on <body> and says nothing: no blur in Chromium, none in jsdom. A keyboard or
// screen-reader user then starts again from the top of the page. These helpers are for
// the controls that leave the page while the focus is IN them, and decide where it goes
// instead; `returnFocus` is the one rule for that and for an overlay giving the focus
// back as it closes (0.52 code review 2026-10-31, held to 0.55; use-focus-trap reads it).

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
// `input[type=hidden]` is no stop: a Tab never lands on it and focus() on it does nothing,
// but its tabIndex reads 0, so a trap could take a form's hidden field for its first or last
// stop and Shift+Tab left the dialog (0.52 code review).
const TAB_STOP =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

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
 * Calls `then` when a `blur`/`focusout` was the user's own move to nothing — a click on
 * the page's background, or a click Safari answers by focusing nothing (it focuses no
 * button or link on a click, and blurs what had the focus) — after which a note of where
 * the focus was is stale (0.52 code review: DataTable's row, BulkActionBar's and
 * AlertBanner's notes outlived it, and a removal much later pulled the focus, and the
 * scroll, back to them).
 *
 * No element took the focus, the document holds none, and the node that lost it could
 * still hold it. Not when it was removed, hidden, made inert or disabled: that is the page
 * taking the focus away — the very case those notes are kept for. Not a window losing the
 * focus either, which leaves the node the document's active element. Decided a microtask
 * later, once the event's own work is done: a browser that blurs a node it is removing
 * (or hiding) may do it while the node is still in place, and only after it is gone is
 * that told apart from a click.
 */
export function whenFocusLeftForNothing(
  e: { target: EventTarget | null; relatedTarget: EventTarget | null },
  then: () => void,
): void {
  const el = e.target;
  if (e.relatedTarget !== null || !(el instanceof Element)) return;
  queueMicrotask(() => {
    if (!el.isConnected || el.matches(":disabled") || el.closest("[hidden],[inert]")) return;
    // `display: none`, where the browser can say (jsdom cannot).
    if (typeof el.checkVisibility === "function" && !el.checkVisibility()) return;
    if (focusIsLost()) then();
  });
}

/**
 * The tab stops around `frame`, outside it, nearest first on each side — where focus
 * goes once `frame` is gone. Read BEFORE it goes: a removed node has no place in the
 * document to measure from. `limit` per side keeps a long page's stops out of memory.
 *
 * Walked outwards from the frame, `limit` stops each way (0.52 code review,
 * lib/focus-left.ts): read from every stop in the page, a banner under a 2000-row table
 * read all 2000 to keep the nearest five before it.
 */
export function tabStopsAround(frame: Element, limit = 5): { after: HTMLElement[]; before: HTMLElement[] } {
  const doc = frame.ownerDocument;
  const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_ELEMENT);
  const isStop = (node: Node): node is HTMLElement =>
    node instanceof HTMLElement && node.matches(TAB_STOP) && isTabStop(node);
  // After: from the first element past the frame's own subtree, in document order.
  const after: HTMLElement[] = [];
  walker.currentNode = frame;
  let node: Node | null = walker.nextSibling();
  while (!node && walker.parentNode()) node = walker.nextSibling();
  for (; node && after.length < limit; node = walker.nextNode()) if (isStop(node)) after.push(node);
  // Before: back from the frame, nearest first (its ancestors among them, as before).
  const before: HTMLElement[] = [];
  walker.currentNode = frame;
  for (node = walker.previousNode(); node && before.length < limit; node = walker.previousNode())
    if (isStop(node)) before.push(node);
  return { after, before };
}

/**
 * Focus the first of `candidates` that is still in the page and takes the focus; true
 * when one did. Each is tried and checked, since `focus()` on a node that cannot hold it
 * (detached, `display: none`, disabled since) fails without a word. An SVG element counts
 * (a chart's tile, a slice); `<body>` and `<html>` never do — "focused" there is the
 * focus lost, not given (0.52 code review 2026-10-31, held to 0.55).
 */
export function focusFirst(candidates: Iterable<Element | null | undefined>): boolean {
  for (const el of candidates) {
    if (!(el instanceof HTMLElement || el instanceof SVGElement) || !el.isConnected) continue;
    if (el === el.ownerDocument.body || el === el.ownerDocument.documentElement) continue;
    el.focus();
    if (el.ownerDocument.activeElement === el) return true;
  }
  return false;
}

/** {@link returnFocus}'s three answers to "where was this opened from". */
export interface FocusReturn {
  /** The control it was opened from: the overlay's trigger when it names one, else what
   *  held the focus as it opened. */
  opener?: Element | null;
  /** Where the focus goes when the opener cannot take it, nearest first — the overlay's
   *  stated fallback. */
  fallback?: Iterable<Element | null | undefined>;
  /** What is closing, while it is still in the page (a panel on its way out, a list
   *  about to unmount): a focus inside it is one to give back. */
  closing?: Element | null;
}

/**
 * Where the focus goes when an overlay closes, or a control holding it leaves the page —
 * the kit's ONE rule for it (0.52 code review 2026-10-31, held to 0.55). The dialogs, the
 * popovers and menus, the drawers, the phone sheets, the tour, AlertBanner's × and the
 * Treemap's tiles each decided it themselves, and they drifted: the trap gave the focus
 * back whenever its opener was still connected — over a focus the app had just placed —
 * and left it on `<body>` when it was not; the date and month pickers and the floating
 * panel moved it only when it was lost; the dropdown, the combobox and the column drawer
 * moved it to their trigger every time, unchecked; and a Treemap tile's note of where to
 * go once outlived the commit it was for and took the focus back, from wherever the
 * reader was, when the map was shown again.
 *
 * 1. **Only a lost focus is moved** — on `<body>`, on nothing or on a removed node
 *    ({@link focusIsLost}) — or one still inside what is `closing`. A focus that went
 *    somewhere real is the user's (an outside press landed on a field) or the app's (its
 *    own `focus()` in `onClose`), and stays.
 * 2. **To the opener**, if it is still in the page and takes the focus: `focus()` is
 *    checked, as a disabled, hidden or inert opener refuses it without a word.
 * 3. **Else to the stated fallback**, the first of it that does — each caller names its
 *    own: the trap the stops that stood around its opener, a banner the stops around its
 *    ×, the map the tile that holds its tab stop.
 * 4. **Never to `<body>`**: no `focus()` on a node that has left, none on `<body>`, no
 *    `blur()`. When nothing can take the focus — the page under the overlay was replaced
 *    — it is left for the page's own handling of a new page, not guessed at.
 * 5. **Only in the closing commit**: called from the commit that closes or removes (a
 *    handler that closes, a ref callback, a layout effect, an effect's cleanup), and
 *    nothing handed to it is kept. A note gathered earlier, where a removed node can no
 *    longer be measured from, is spent or dropped in that commit.
 *
 * True when it moved the focus.
 */
export function returnFocus({ opener, fallback = [], closing }: FocusReturn): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  const inside = Boolean(closing?.isConnected && active && closing.contains(active));
  if (!inside && !focusIsLost()) return false;
  return focusFirst([opener, ...fallback]);
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
