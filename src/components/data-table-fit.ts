import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "./data-table";

// DataTable's fit to its own width (0.48, keksdose live #451: "On expanded sidebar for
// desktop the table scrolls horizontally. On collapsed sidebar it fits […] Compute the
// width selectively"). Two column options, both opt-in:
//
// - `grow`: the column takes what the others leave and ellipsises (`w-full max-w-0` on
//   its cells: in an auto table layout that is "the rest of the row", never its content's
//   width), so one long title can no longer widen the table.
// - `fitPriority`: while the table is wider than its scroller — or, with a `grow` column,
//   while that column would get less than {@link GROW_MIN_REM} — the table leaves out
//   its `fitPriority` columns, the LOWEST number first (ties: the later column first),
//   and brings them back in the reverse order as soon as the table, as it is NOW, has
//   room for them (its need re-measured, plus the column's own header width from when
//   it was left out), so narrower content (a filter, another page) counts as much as a
//   wider scroller. The scroller's own width, through a ResizeObserver: a sidebar, a
//   narrower window, the Columns drawer and Large text all count the same. A column
//   whose return the very next measure undoes stays out until the table has more room
//   for it than it had then (0.48.3, keksdose B2: see the bring-back in `measure`). And
//   the TABLE's own width, through the same observer (0.51.2): anything that widens it
//   after a measure — rows drawn a frame later, `virtualize` locking its column widths —
//   is measured again, so the table never stays wider than its scroller.

/** The least a `grow` column keeps before the table starts leaving columns out: about
 *  a sentence of a title. In rem, so Large text asks for more. */
export const GROW_MIN_REM = 10;

/** The `<th>`/`<td>` classes of a `grow` column. `truncate-until-large`: one line and an
 *  ellipsis at Normal, a wrap from Large up (text size §10.17), as every kit title. The
 *  header's `min-w-[10rem]` ({@link GROW_MIN_REM}) is the floor once no `fitPriority`
 *  column is left to leave out: the table then scrolls sideways rather than crushing the
 *  column it exists for (Kurvenschmiede S1, 0.48: Subject was 24px at 1100px). */
export const GROW_HEAD_CLASS = "w-full max-w-0 min-w-[10rem]";
export const GROW_CELL_CLASS = "w-full max-w-0 truncate-until-large";

/** Every OTHER cell of a table with a `grow` column (kastlan S2, 0.48). A `w-full` column
 *  squeezes the rest to their min-content width, so any text with a space broke in two
 *  even at 1920px ("CHF 2'568.38", "Peter Mueller", a date with its time). One line at
 *  Normal, so a column is never narrower than its text and `fitPriority` measures what
 *  the columns really need; from Large up the cell wraps as before (§10.17). The headers
 *  are `whitespace-nowrap` already. A column whose prose should wrap anyway passes
 *  `not-large:whitespace-normal` in its `className`. */
export const GROW_PEER_CELL_CLASS = "not-large:whitespace-nowrap";

// A cell's own flex-wrap row (chips) is left to wrap beside a `grow` column: a row of
// badges reads as well stacked, and held to one line it widened the user roster's Status
// until kastlan's admin pane scrolled 21px at 1280px (0.48 build review 2, kastlan S1).

/** The auto-hide order: lowest `fitPriority` first, the later column first on a tie. */
export function fitHideOrder<T>(columns: readonly DataTableColumn<T>[]): DataTableColumn<T>[] {
  return columns
    .map((col, index) => ({ col, index }))
    .filter(({ col }) => col.fitPriority != null)
    .sort((a, b) => a.col.fitPriority! - b.col.fitPriority! || b.index - a.index)
    .map(({ col }) => col);
}

/**
 * Which columns the table leaves out for width, and the Columns panel's "keep it".
 *
 * A column the user TICKS in the Columns panel is theirs: it is never left out for width
 * again while the table is mounted (`keep`): the table makes room by leaving out the next
 * candidate, and scrolls sideways once none is left — what they asked for. Unticking it hides it as before (the persisted `hiddenCols`) and
 * drops the keep. Keeps are not persisted: on the next visit the table fits again.
 */
export function useColumnFit<T>({
  columns,
  hiddenCols,
  headRefs,
  scroller,
  enabled,
  content,
}: {
  columns: readonly DataTableColumn<T>[];
  /** The user's hidden columns: never candidates (they are out already). */
  hiddenCols: Set<string>;
  headRefs: Map<string, HTMLTableCellElement>;
  /** The desktop scroller, read after render (it is declared below the call). */
  scroller: () => HTMLElement | null;
  /** The wide layout. On a phone (the card list) nothing is left out for width. */
  enabled: boolean;
  /**
   * What can change the columns' widths besides the scroller (0.48.2): the rows on
   * screen, the columns, the stored widths, the text size. Compared item by item after
   * each render (`Object.is`), and the table is measured only when one changed — a
   * selection tick no longer forces a layout of the whole table. Without it, every render
   * measures. So each item must keep its identity while it means the same: the page's
   * rows memoised, the columns as their keys (DSP-19).
   */
  content?: readonly unknown[];
}): {
  /** The columns left out for width now — empty while off. */
  autoHidden: Set<string>;
  /** The user's choice in the Columns panel: `true` keeps the column in whatever the width. */
  keep: (key: string, on: boolean) => void;
} {
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const [hidden, setHidden] = useState<string[]>([]);
  // A column's own header width, written when it is left out: it comes back once the
  // table's need as it is now, plus this, fits the scroller (keksdose S3, 0.48: not the
  // whole table's need at hide time, which went stale when the content narrowed).
  const ownWidth = useRef(new Map<string, number>());
  // A column whose return the very next measure undid, at the same scroller width: the
  // room the table had for it when it came back (keksdose B2, 0.48.3). It stays out
  // until the table has more. Dropped once the column is no longer left out for width.
  const stuck = useRef(new Map<string, number>());
  // What the last measure brought back, each column with the room it had then, and at
  // which scroller width: read (and cleared) by the measure right after it.
  const lastShown = useRef<{ avail: number; rooms: Map<string, number> } | null>(null);

  const hasFit = columns.some((c) => c.fitPriority != null);
  const active = enabled && hasFit;
  const order = useMemo(
    () => fitHideOrder(columns).filter((c) => !hiddenCols.has(c.key) && !kept.has(c.key)),
    [columns, hiddenCols, kept],
  );
  // Only the candidates still in play, in hide order — a column the user hid or kept
  // since, or one the app dropped, is no longer "hidden for width".
  const current = useMemo(
    () => (active ? order.filter((c) => hidden.includes(c.key)).map((c) => c.key) : []),
    [active, order, hidden],
  );
  const growCol = columns.find((c) => c.grow && !hiddenCols.has(c.key));
  const growKey = growCol?.key;
  const growMin = growCol?.growMin ?? GROW_MIN_REM;

  // What `measure` reads, refreshed after each render (before the measure below runs):
  // the ResizeObserver's callback is set up once and must see the current columns.
  const latest = useRef({ order, current, growKey, growMin, active, scroller });
  useLayoutEffect(() => {
    latest.current = { order, current, growKey, growMin, active, scroller };
  });

  const measure = useCallback(() => {
    const { order, current, growKey, growMin, active, scroller } = latest.current;
    // Only the measure right after a bring-back can undo it.
    const flip = lastShown.current;
    lastShown.current = null;
    for (const k of stuck.current.keys()) if (!current.includes(k)) stuck.current.delete(k);
    const el = scroller();
    if (!active || !el) return;
    const table = el.querySelector("table");
    const avail = el.clientWidth;
    // Not laid out (display:none, jsdom): nothing to fit to.
    if (!table || avail <= 0) return;
    const growTh = growKey ? headRefs.get(growKey) : undefined;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    let need = growTh ? table.offsetWidth - growTh.offsetWidth + growMin * rem : table.offsetWidth;
    if (!growTh && need <= avail + 0.5 && current.length > 0) {
      // A `w-full` table is at least the scroller's width, which says nothing about how
      // much room its content leaves: probe its content's width (what it takes once it
      // overflows) for the bring-back below. Read and put back in one layout pass.
      const before = table.style.width;
      table.style.width = "min-content";
      need = table.offsetWidth;
      table.style.width = before;
    }
    if (need > avail + 0.5) {
      // Leave out, in order, until the rest fits: each column saves its header's width
      // (the others are at their content's width while a `grow` column takes the rest).
      const next = [...current];
      for (const col of order) {
        if (need <= avail + 0.5) break;
        if (next.includes(col.key)) continue;
        const w = headRefs.get(col.key)?.offsetWidth ?? 0;
        ownWidth.current.set(col.key, w);
        need -= w;
        next.push(col.key);
      }
      if (next.length === current.length) return;
      // The last measure brought these back at this same width, and the table cannot
      // hold them: their header width fell short of what they cost drawn (see below).
      if (flip && Math.abs(flip.avail - avail) <= 0.5)
        for (const k of next.slice(current.length)) {
          const room = flip.rooms.get(k);
          if (room != null) stuck.current.set(k, room);
        }
      setHidden(next);
      return;
    }
    // Bring back, the last left out first, while the table as it is now has room for
    // them by their recorded header width. A column that costs more drawn than that is
    // left out again by the next measure, before paint. That alone does not settle it:
    // the re-hide records its header's width again, and the header can measure the same
    // while the column costs more (`virtualize`'s locked widths, keksdose B2, 0.48.3: the
    // drawn column cost the table ~80–110px more than its header), so it came back, went, came back … until React's
    // update limit (#185). So a column whose return the next measure undid, at the same
    // scroller width, waits for more room than it had then: a wider scroller or narrower
    // content. Whatever the error in its width, that is one invisible flip per room it is
    // tried at.
    let n = current.length;
    const rooms = new Map<string, number>();
    while (n > 0) {
      const k = current[n - 1];
      const w = ownWidth.current.get(k);
      if (w == null || need + w > avail + 0.5) break;
      const room = stuck.current.get(k);
      if (room != null && avail - need <= room + 0.5) break;
      rooms.set(k, avail - need);
      need += w;
      n--;
    }
    if (n === current.length) return;
    lastShown.current = { avail, rooms };
    setHidden(current.slice(0, n));
  }, [headRefs]);

  // The table the observer below watches, kept to this render's.
  const observer = useRef<ResizeObserver | null>(null);
  const watched = useRef<{ table: Element; width: number } | null>(null);
  const watchTable = useCallback(() => {
    const ro = observer.current;
    const table = latest.current.scroller()?.querySelector("table") ?? null;
    if (!ro || table === (watched.current?.table ?? null)) return;
    if (watched.current) ro.unobserve(watched.current.table);
    // Its width now, as the measure that just ran saw it: a report of the same width is
    // not news, one that differs is (it may come a frame later, rows drawn by then).
    watched.current = table ? { table, width: (table as HTMLElement).offsetWidth } : null;
    if (table) ro.observe(table);
  }, []);

  // After a render that changed what is drawn: rows, a filter or a page can widen a
  // column as much as a resize. Before paint, so a column the table cannot hold is never
  // drawn first. A render that changed none of it (a ticked box, a focused row) skips the
  // measure, which forces a layout of the whole table (0.48.2, keksdose dev #632).
  const lastContent = useRef<readonly unknown[] | null>(null);
  // The candidates by their keys, not by identity (refactor audit 2026-10-30, DSP-19):
  // both are memoised on `columns`, which a call site writes inline — a new array, and
  // so a "change", on every render of the page around the table.
  const orderSig = order.map((c) => c.key).join("\u0000");
  const currentSig = current.join("\u0000");
  useLayoutEffect(() => {
    // The table the observer watches is this render's (a table drawn after a loading
    // state, or remounted, is a new element).
    watchTable();
    const now = content ? [...content, orderSig, currentSig, growKey, active] : null;
    const prev = lastContent.current;
    lastContent.current = now;
    if (now && prev && prev.length === now.length && prev.every((v, i) => Object.is(v, now[i]))) return;
    measure();
  });

  // The scroller, and the table in it (0.51.2, keksdose's register). The fit measured
  // after a render that changed `content` and when the SCROLLER changed size, but the table
  // also widens on its own after that: under `virtualize` the rows actually drawn are the
  // window's, set a frame later, and its column-width lock lands a frame later still —
  // neither is `content`, and the scroller keeps its size. A load whose first measure saw
  // the table before its rows were in kept every `fitPriority` column and then overflowed
  // for good (893px in 757 at 1124, 1058 in 913 at 1280, on 0.50.1 as on 0.51). Watched,
  // a table that grows past what was measured is measured again. Only a WIDTH change of
  // the table counts: its height moves with every row the window draws, and each measure
  // lays the whole table out.
  useEffect(() => {
    const el = latest.current.scroller();
    if (!active || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        if (entry.target === el) changed = true;
        else if (watched.current && entry.target === watched.current.table) {
          // The border box, as `offsetWidth` reads it (the content rect leaves the border out).
          const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
          if (Math.abs(width - watched.current.width) > 0.5) {
            watched.current.width = width;
            changed = true;
          }
        }
      }
      if (changed) measure();
    });
    ro.observe(el);
    observer.current = ro;
    watchTable();
    return () => {
      ro.disconnect();
      observer.current = null;
      watched.current = null;
    };
  }, [active, measure, watchTable]);

  const keep = useCallback((key: string, on: boolean) => {
    setKept((s) => {
      if (s.has(key) === on) return s;
      const next = new Set(s);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const autoHidden = useMemo(() => new Set(current), [current]);
  return { autoHidden, keep };
}
