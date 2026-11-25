import { useEffect, useMemo, useRef } from "react";
import type { FocusEvent, RefObject } from "react";
import { focusContainer, focusFirst, focusIsLost, tabStops, whenFocusLeftForNothing } from "../lib/focus-left";

// DataTable's "the focused row left" (refactor audit 2026-10-30, DSP-4; 2026-11-22, DSP-1),
// out of the DataTable function (refactor audit 2026-11-22, MOD-3): about 170 lines of refs
// and effects with no JSX, which read only the rows, the layout and the two list elements.
//
// Not on one core with `useRowLeaves` (hooks/use-row-leaves.ts), though both keep the focus
// when a row goes: they share the rule's parts — lib/focus-left's `focusIsLost`,
// `focusFirst`, `tabStops`, `whenFocusLeftForNothing` — and differ in each policy around
// them. The table hears the focus through React (a menu or a dialog a row opened in a
// portal is the row's), waits for an overlay that holds it, gives it to the row now at
// the gone row's INDEX (a removal pulls the rows below up), says the count left, and
// moves it through the row window under `virtualize`. useRowLeaves hears it on the
// document through marks an app spreads on its `<li>`s, waits for nothing, and goes to
// the NEXT row by key, else the previous, else an app's fallback (an item ticked into a
// folded group). A core holding both would be those two policies behind switches.

/** Where focus that leaves a row is still the row's (DSP-4): an overlay — a confirm, a
 *  menu, a sheet — hands it back or closes with the row it was about. The kit marks its
 *  own (`data-kit-layer`); an app's dialog says what it is. */
const OVERLAY_SELECTOR = '[data-kit-layer],[role="dialog"],[role="alertdialog"],[aria-modal="true"],[role="menu"]';

/** The row holding the focus (DSP-4): its key, where it stood, and the element in it with
 *  its place among the row's own stops, -1 for the row itself or none (DSP-1). */
interface HeldRow {
  key: string | number;
  index: number;
  slot: number;
  el: Element | null;
}

/** The row `el` is in, when that row is one of `list`'s own: a `<tr>` of the table's
 *  bodies, a card of the phone's list — not a row of a table nested in a cell or a
 *  detail, and not the detail row itself (it has no `data-row-index`). */
function ownRowOf(el: Element, list: HTMLElement): HTMLElement | null {
  const row = el.closest<HTMLElement>(list.tagName === "TABLE" ? "tr[data-row-index]" : "li[data-row-index]");
  if (!row) return null;
  const owner = list.tagName === "TABLE" ? row.parentElement?.parentElement : row.parentElement;
  return owner === list ? row : null;
}

/** `rows`' places by `rowKey`, the first row of a key winning as a `findIndex`'s did; the
 *  map built at the first lookup (0.52 code review, data-table.tsx). */
function keyIndex<T>(rows: readonly T[], rowKey: (row: T) => string | number): (key: string | number) => number {
  let at: Map<string | number, number> | null = null;
  return (key) => {
    if (!at) {
      at = new Map();
      for (let i = rows.length - 1; i >= 0; i--) at.set(rowKey(rows[i]), i);
    }
    return at.get(key) ?? -1;
  };
}

export interface TableFocusReturnOptions<T> {
  /** The desktop rows on screen (the table's `slice`). */
  rows: readonly T[];
  /** The phone's cards revealed so far (`mobileSlice`). */
  phoneRows: readonly T[];
  rowKey: (row: T) => string | number;
  /** The desktop table is shown, not the card list. */
  isMdUp: boolean;
  /** `virtualize` is windowing the desktop rows. */
  virtualOn: boolean;
  /** The `<tr>`s are focusable (`onRowClick`): a row takes the focus itself. */
  rowsFocusable: boolean;
  tableRef: RefObject<HTMLTableElement | null>;
  phoneListRef: RefObject<HTMLUListElement | null>;
  /** The row window's focus mover under `virtualize`: renders the row, then focuses it. */
  focusRowRef: RefObject<((index: number) => void) | undefined>;
  /** Said once the focus went to another row: the count left, as a filter's is. */
  announceMoved: () => void;
}

export interface TableFocusReturn {
  /** A desktop row's place by key, -1 when it is not on screen. */
  sliceIndex: (key: string | number) => number;
  /** A phone card's place by key. */
  mobileIndex: (key: string | number) => number;
  /** The focus came into the row of `key` — `target` took it: the rows' context's `noteFocus`. */
  noteFocus: (key: string | number, target: EventTarget | null) => void;
  /**
   * The commit's check: call it in a layout effect on every commit. Not an effect of the
   * hook's own: the table calls it after the row window's effects, which set the window's
   * focus mover (`focusRowRef`) the check may use — where it ran when it was inline.
   */
  settle: () => void;
  /** The table root's focus handlers, which drop the note when the focus leaves for real. */
  rootProps: {
    onFocusCapture: () => void;
    onBlur: (e: FocusEvent<HTMLElement>) => void;
  };
}

/**
 * Where the focus goes when the focused row leaves the table, or stays while the element
 * that held the focus leaves it (DataTable's; see the file's head).
 *
 * The row holding the focus — its key, and where it stood — is noted as the focus comes
 * into it (the rows report it, through React, so a menu or a dialog a row opened in a
 * portal is the row's too). A delete, a status change that filters the row out, an
 * approval: the row's DOM goes, the focus with it to <body>, and the commit that took it
 * puts the focus on the row now in its place.
 *
 * And the element itself, with its place among the row's own stops (DSP-1): a row can STAY
 * while that element leaves — an expanded row's editor closing itself with its Save, a
 * grouped row moving to another group's `<tbody>` — and the focus goes back into the row,
 * to the same stop (as useRowLeaves does for a list). A focus in the row's detail or in a
 * portal it opened has no place among the row's stops: it keeps the last one the row had,
 * the control that opened it.
 */
export function useTableFocusReturn<T>({
  rows,
  phoneRows,
  rowKey,
  isMdUp,
  virtualOn,
  rowsFocusable,
  tableRef,
  phoneListRef,
  focusRowRef,
  announceMoved,
}: TableFocusReturnOptions<T>): TableFocusReturn {
  // The rows' places by key (0.52 code review, data-table.tsx): the tab stop's check, the
  // focus note and its recovery each walked the rows calling `rowKey` — on every render,
  // at each focus, in every commit while a row was noted: under `virtualize`, 3000 rows,
  // ~15000 calls per arrow step at the table's end. Built at the first lookup, once per
  // array, so a table nobody focuses builds none. Keyed on the rows alone: `rowKey` is a
  // pure function of its row, and a call site writes it inline.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sliceIndex = useMemo(() => keyIndex(rows, rowKey), [rows]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mobileIndex = useMemo(() => keyIndex(phoneRows, rowKey), [phoneRows]);

  const heldRow = useRef<HeldRow | null>(null);
  const lastSlot = useRef<{ key: string | number; slot: number } | null>(null);
  const noteFocus = (key: string | number, target: EventTarget | null) => {
    const list = isMdUp ? tableRef.current : phoneListRef.current;
    const el = target instanceof HTMLElement || target instanceof SVGElement ? target : null;
    const box = el && list ? ownRowOf(el, list) : null;
    let slot = lastSlot.current?.key === key ? lastSlot.current.slot : -1;
    if (box) {
      slot = el === box ? -1 : tabStops(box, { includeSelf: false }).indexOf(el as HTMLElement);
      lastSlot.current = { key, slot };
    }
    heldRow.current = { key, index: (isMdUp ? sliceIndex : mobileIndex)(key), slot, el };
  };
  // A gone row's note waiting for the overlay that holds the focus (below): watched as
  // a node until it leaves the page, since its close need not render the table.
  const overlayWatch = useRef<{ layer: Element; stop: () => void } | null>(null);
  const settleRef = useRef<() => void>(() => {});
  const watchOverlay = (layer: Element) => {
    if (overlayWatch.current?.layer === layer) return;
    overlayWatch.current?.stop();
    const observer = new MutationObserver(() => {
      if (layer.isConnected) return;
      stop();
      settleRef.current();
    });
    const stop = () => {
      observer.disconnect();
      if (overlayWatch.current?.layer === layer) overlayWatch.current = null;
    };
    observer.observe(layer.ownerDocument.body, { childList: true, subtree: true });
    overlayWatch.current = { layer, stop };
  };
  useEffect(() => () => overlayWatch.current?.stop(), []);

  // The commit that took the focused row (DSP-4): if the focus fell with it — to <body>,
  // not into a dialog or a field the app chose — it goes to the row now at that index,
  // else the last row, else the table itself (`tabIndex=-1` while empty, named as the
  // table is); the card on a phone. A focusable row (`onRowClick`) takes it itself, any
  // other its first control. The remaining count is said, as a filter's is: the focus
  // moved without the user moving it. translation-review's `keepFocusAt` is the kit's
  // earlier copy of the rule, for its groups.
  //
  // Every commit while a row is noted, a lookup by its key. A focus the user took
  // elsewhere drops the note (`onBlur` on the root, below), and since the 0.52 code review
  // so does one that went to nothing — a click on the page's background: kept, it was the
  // one case where a later removal (a refetch, a sync) pulled the focus back in.
  const settleFocus = () => {
    const held = heldRow.current;
    if (!held) return;
    const now = (isMdUp ? sliceIndex : mobileIndex)(held.key);
    const list = isMdUp ? tableRef.current : phoneListRef.current;
    if (now !== -1) {
      held.index = now;
      // The row stayed and the element that had the focus left it (DSP-1): an inline
      // editor's Save that closed it, a `<tbody>` re-keyed round the row. Only that — a
      // control still in the page that lost the focus (disabled while it saves) is its
      // own business, and the focus is not pulled to a neighbour of it.
      if (!list || !focusIsLost() || held.el?.isConnected) return;
      if (isMdUp && virtualOn && rowsFocusable && held.slot < 0) {
        focusRowRef.current?.(now);
        return;
      }
      const row = list.querySelector<HTMLElement>(
        isMdUp ? `:scope > tbody > tr[data-row-index="${now}"]` : `:scope > li[data-row-index="${now}"]`,
      );
      if (!row) return;
      const stops = tabStops(row, { includeSelf: false });
      focusFirst([stops[held.slot], isMdUp && rowsFocusable ? row : null, stops[0]]);
      return;
    }
    // In an overlay — a confirm, an edit drawer — the focus is not lost yet: the overlay
    // hands it back to its opener as it closes, and the opener was in the row (0.52 code
    // review, data-table.tsx: an optimistic delete with its confirm still open dropped the
    // note, and the confirm's close dropped the focus to <body>). The note waits for the
    // overlay to leave the page, watched as a node: the table need not render when it does
    // (`useConfirm`'s provider, a Modal's exit). Not an overlay the table itself is in.
    const layer = focusIsLost() ? null : document.activeElement?.closest(OVERLAY_SELECTOR);
    if (layer && !(list && layer.contains(list))) {
      watchOverlay(layer);
      return;
    }
    heldRow.current = null;
    overlayWatch.current?.stop();
    if (!list || !focusIsLost()) return;
    const shown = isMdUp ? rows : phoneRows;
    const at = shown.length === 0 ? -1 : Math.min(Math.max(held.index, 0), shown.length - 1);
    if (at === -1) list.focus();
    else if (isMdUp && virtualOn && rowsFocusable) focusRowRef.current?.(at);
    else {
      const row = list.querySelector<HTMLElement>(
        isMdUp ? `:scope > tbody > tr[data-row-index="${at}"]` : `:scope > li[data-row-index="${at}"]`,
      );
      // Each of the row's stops in turn, then the table (0.52 code review): `focus()` on
      // one that cannot hold it — `display: none`, in a closed <details>, a hidden input —
      // does nothing, and the focus stayed on <body>.
      const stops = !row ? [] : isMdUp && rowsFocusable ? [row] : tabStops(row, { includeSelf: false });
      if (!focusFirst(stops)) focusContainer(list);
    }
    announceMoved();
  };

  return {
    sliceIndex,
    mobileIndex,
    noteFocus,
    settle: () => {
      settleRef.current = settleFocus;
      settleFocus();
    },
    // The focused row's note (DSP-4): cleared on the way down to whatever takes the
    // focus, and set again on the way up by the row that holds it. Focus leaving for
    // something real outside the table drops it — unless that is an overlay (a confirm,
    // a menu), which hands the focus back, or closes with the row it asked about.
    rootProps: {
      onFocusCapture: () => {
        heldRow.current = null;
        overlayWatch.current?.stop();
      },
      onBlur: (e) => {
        const to = e.relatedTarget;
        if (to instanceof Element && !to.closest(OVERLAY_SELECTOR)) heldRow.current = null;
        // Focus that left for nothing — a click on the page (0.52 code review): no
        // element to say where, and a later removal of the row is no longer the user's.
        const held = heldRow.current;
        whenFocusLeftForNothing(e, () => {
          if (heldRow.current === held) heldRow.current = null;
        });
      },
    },
  };
}
