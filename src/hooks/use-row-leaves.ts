import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { focusFirst, focusIsLost, tabStops, whenFocusLeftForNothing } from "../lib/focus-left";

export interface UseRowLeavesOptions<T> {
  /** The rows in the order they are shown. A row whose key leaves this array has left. */
  items: readonly T[];
  /** A row's stable key, as `useReorder`'s and DataTable's `rowKey`. */
  rowKey: (item: T) => string | number;
  /**
   * Where the focus goes when the row that had it leaves and no row is left beside it: an
   * element (a ref to it), or a function of the row that left — read once that row has gone,
   * in the same commit. keksdose's shopping list: the folded "Done" group's header for an
   * item ticked off the list, and for the last item taken back out of Done, that item's own
   * box on the list. Nothing taking the focus leaves it where the browser put it.
   */
  fallback?: RefObject<Element | null> | ((item: T) => Element | null | undefined);
}

/** What {@link UseRowLeavesReturn.row} spreads onto a `ListItem` (any row with a target):
 *  which list, and which row in it, so the focus can find the row's neighbours. */
export interface RowLeavesProps {
  "data-row-leaves-list": string;
  "data-row-leaves-key": string;
}

export interface UseRowLeavesReturn<T> {
  /** The marks for the row of `item`: `<ListItem {...leaves.row(item)} … />`. */
  row: (item: T) => RowLeavesProps;
}

/** Where the focus was: the row, by key, and the control's place among its row's stops. */
interface FocusNote {
  key: string;
  /** Its place among {@link ownStops}, or -1 (inside the row's body, say). */
  slot: number;
}

/**
 * The focus when a row LEAVES its list (0.59, keksdose 846423e6, run 95). Ticking an item on a
 * shopping list moves its row from the open items into a folded "Done" group; an approved row
 * leaves a queue; a filter drops a row. The control that had the focus is unmounted with its
 * row, and the browser puts the focus on `<body>` and says nothing (lib/focus-left), so a
 * keyboard or screen reader working down the list starts again from the top of the page at
 * every tick.
 *
 *     const leaves = useRowLeaves({ items: open, rowKey: (i) => i.id, fallback: doneHeader });
 *     <List>{open.map((item) => <ListItem key={item.id} {...leaves.row(item)} … />)}</List>
 *
 * It notes which row, and which of the row's controls, holds the focus (a document `focusin`).
 * Once `items` no longer holds that row — at once, or a render later for a list that saves
 * first — a focus that was lost goes to the same control in the NEXT row still there (the
 * same box, the same "Remove"; else that row's target, else its first stop), else in the
 * PREVIOUS one, else to {@link UseRowLeavesOptions.fallback}. Next before previous: a list is
 * worked downwards, and the next row is the one that moved up into the place.
 *
 * {@link returnFocus}'s rules hold: only a LOST focus is moved (one the app put on a field as
 * it ticked stays there), never to `<body>`, and only in the commit that removes the row. A
 * focus that left the row for nothing — a click on the page's background — forgets the row,
 * so a removal much later pulls no focus back to its neighbours.
 *
 * `useReorder` keeps the focus with a row that MOVES within its list; this is for one that
 * leaves it, and the two marks sit side by side on a row. The rows are a {@link List}'s
 * items (an `<li>` each, holding the row's leading controls, target and actions). Call it
 * in the component that renders the list and outlives its rows, as `useReorder`.
 */
export function useRowLeaves<T>({ items, rowKey, fallback }: UseRowLeavesOptions<T>): UseRowLeavesReturn<T> {
  const listId = useId();
  const note = useRef<FocusNote | null>(null);
  // The rows as last committed: where the row that left stood, and who stood beside it.
  const shown = useRef(items);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      note.current = noteOf(e.target, listId);
    };
    const onFocusOut = (e: FocusEvent) =>
      whenFocusLeftForNothing(e, () => {
        note.current = null;
      });
    // A focus already in a row as the list mounts.
    note.current = noteOf(document.activeElement, listId);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [listId]);

  // After every render, as useReorder's: a list that saves first renders the row again (a
  // refetch, a new array) before it is gone, and the note waits for that.
  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = items;
    const was = note.current;
    if (!was || before === items) return;
    const keyOf = (item: T) => String(rowKey(item));
    const still = new Set(items.map(keyOf));
    if (still.has(was.key)) return;
    note.current = null;
    if (!focusIsLost()) return;
    const at = before.findIndex((item) => keyOf(item) === was.key);
    if (at < 0) return;
    const around = [...before.slice(at + 1), ...before.slice(0, at).reverse()]
      .map(keyOf)
      .filter((key) => still.has(key));
    const left = before[at]!;
    const last = typeof fallback === "function" ? fallback(left) : fallback?.current;
    focusFirst(candidates(listId, around, was.slot, last));
  });

  return {
    row: (item) => ({ "data-row-leaves-list": listId, "data-row-leaves-key": String(rowKey(item)) }),
  };
}

/** Where the focus may go, nearest first, read only as far as {@link focusFirst} needs. */
function* candidates(
  listId: string,
  keys: readonly string[],
  slot: number,
  last: Element | null | undefined,
): Generator<Element | null | undefined> {
  const targets = new Map<string, HTMLElement>();
  for (const el of document.querySelectorAll<HTMLElement>("[data-row-leaves-key]")) {
    // Compared as values, so no key needs escaping into a selector (useReorder's findRow).
    if (el.dataset.rowLeavesList === listId) targets.set(el.dataset.rowLeavesKey!, el);
  }
  for (const key of keys) {
    const target = targets.get(key);
    if (!target) continue;
    const stops = ownStops(rowOf(target));
    yield stops[slot];
    yield target;
    yield stops[0];
  }
  yield last;
}

/** The row the focus is in, if it is one of this list's: the nearest `<li>` round it that
 *  is a marked row's own. */
function noteOf(el: EventTarget | null, listId: string): FocusNote | null {
  if (!(el instanceof Element)) return null;
  for (let box = el.closest("li"); box; box = box.parentElement?.closest("li") ?? null) {
    for (const target of box.querySelectorAll<HTMLElement>("[data-row-leaves-key]")) {
      if (target.dataset.rowLeavesList !== listId || rowOf(target) !== box) continue;
      const slot = el instanceof HTMLElement ? ownStops(box).indexOf(el) : -1;
      return { key: target.dataset.rowLeavesKey!, slot };
    }
  }
  return null;
}

/** A row's box round its target: its `<li>`, which holds the leading controls and the
 *  actions beside the target too (useReorder's `rowOf`). */
function rowOf(target: HTMLElement): HTMLElement {
  return target.closest("li") ?? target.parentElement ?? target;
}

/** A row's own tab stops, in order: not those of a list nested in it (a group's rows). */
function ownStops(box: HTMLElement): HTMLElement[] {
  const stops = tabStops(box, { includeSelf: false });
  return box.tagName === "LI" ? stops.filter((stop) => stop.closest("li") === box) : stops;
}
