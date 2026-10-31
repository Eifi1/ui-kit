import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

// DataTable's row windowing (0.48.2, keksdose dev #632 — Marcel: "The table is extremely
// slow. Is it virtualised or is everytime the whole table rendered?"). Opt-in through
// `virtualize`: the desktop table renders the rows near the visible part of its scroller
// (plus `overscan`) and stands spacer rows in for the rest, inside each group's own
// `<tbody>`, so the sticky group bands keep working as they do on a full table — a band
// cell's sticky containing block is the TABLE, and the latest band of each level that has
// scrolled past is the one drawn (Chromium, checked with a probe at the group's middle,
// its end and the next group's start).
//
// What it keeps rendered whatever the scroll: the header, the leading row, the band rows
// of every group that has a rendered row (and the first day of the period the window
// starts in, whose band is the period's), every OPEN row (`isExpanded`, so an inline
// editor keeps its state), the roving tab stop, a row holding the focus, and the row the
// keyboard is moving to.
//
// Heights: each rendered row is measured after render (the distance to the next row's
// top, which is exact under collapsed borders where a row's own box is half a border
// short) and remembered by its key; a row never rendered counts as the average of the
// measured ones, or `estimateRowHeight` before any. The spacers are the sums, so the
// scroll height settles as rows are seen. Scroll anchoring (the browser's) keeps the rows
// in view still while a spacer above them is corrected.
//
// Column widths: in an auto table layout a column is as wide as its widest RENDERED
// cell, so rows coming and going would move the columns. The header cells' widths are
// read after the first render and locked into a `<colgroup>`, only ever growing while the
// rows scroll (a wider cell arriving widens its column once; one leaving narrows
// nothing). Re-measured from scratch when the data, the columns, a user width, the text
// size or the scroller's width change — and when a grown column would push the table
// past its scroller, which it fit before. A `grow` column and a user-resized one are not
// locked (the first takes the rest, the second is pinned already).

/** {@link DataTableProps.virtualize}'s options. */
export interface DataTableVirtualize {
  /** Rows rendered beyond each edge of the visible part. Default 12. */
  overscan?: number;
  /** A row's height in px before it has been measured. Default: 37 (`comfortable`) /
   *  29 (`compact`) — the kit's one-line rows. */
  estimateRowHeight?: number;
}

/** One innermost group's run of rows, `[start, end)` in the rows on screen, with the
 *  band levels its `<tbody>` opens with. `first` is the index of the innermost group that
 *  opens its level-1 group (itself with one level). Ungrouped: one run with no bands. */
export interface VirtualGroup {
  start: number;
  end: number;
  bands: readonly (1 | 2)[];
  first: number;
}

/** A row, or a spacer standing in for the rows between two rendered ones. */
export type VirtualItem = { kind: "row"; index: number } | { kind: "gap"; key: string; height: number };

/** A group's `<tbody>` with its rendered rows, or one spacer `<tbody>` for a run of
 *  groups of which nothing is rendered. */
export type VirtualBody =
  { kind: "spacer"; key: string; height: number } | { kind: "group"; group: number; items: VirtualItem[] };

export interface RowWindow {
  bodies: VirtualBody[];
  /** `aria-rowcount`: every row of the table, header, bands, details and footer included. */
  rowCount: number;
  /** `aria-rowindex` of data row `i`; its detail row (open) is the next one. */
  ariaRow: (i: number) => number;
  /** `aria-rowindex` of group `g`'s band of `level`. */
  ariaBand: (g: number, level: 1 | 2) => number;
  /** The locked widths for the `<colgroup>`, by column key; null while measuring. */
  colWidths: Record<string, number> | null;
  /** Move the focus to row `i`, rendering it first when it is not. */
  focusRow: (i: number) => void;
}

/** The heights measured so far, by row key; the bands' by level. */
interface Measured {
  heights: Map<string | number, number>;
  details: Map<string | number, number>;
  sum: number;
  count: number;
  band: [number, number];
}

const SELECT_KEY = "\u0000select";
/** The `<colgroup>` key of the selection column. */
export const VIRTUAL_SELECT_COL = SELECT_KEY;

interface Model {
  n: number;
  keys: (string | number)[];
  /** Top of row i, from the top of the first group's `<tbody>`. */
  tops: Float64Array;
  /** Full height of row i (its detail row included while open). */
  h: Float64Array;
  /** Top of group g's `<tbody>`; [groups.length] is the total. */
  gTop: Float64Array;
  total: number;
  ariaRows: Int32Array;
  ariaBands: Int32Array;
  rowCount: number;
}

/** First index whose bottom is below `y` (n when none). */
function firstBelow(m: Model, y: number): number {
  let lo = 0;
  let hi = m.n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (m.tops[mid] + m.h[mid] > y) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** One past the last index whose top is above `y`. */
function lastAbove(m: Model, y: number): number {
  let lo = 0;
  let hi = m.n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (m.tops[mid] < y) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The `<tbody>`s to render: the groups holding a rendered row (or the period's first
 *  day, for its band), and one spacer for each run of groups in between. Pure. */
export function planBodies(
  m: Pick<Model, "n" | "tops" | "h" | "gTop">,
  groups: readonly VirtualGroup[],
  start: number,
  end: number,
  pinned: readonly number[],
): VirtualBody[] {
  const rendered = new Set<number>();
  for (let i = Math.max(0, start); i < Math.min(m.n, end); i++) rendered.add(i);
  for (const p of pinned) if (p >= 0 && p < m.n) rendered.add(p);
  const sorted = [...rendered].sort((a, b) => a - b);
  // The group the window starts in, and the first day of its period.
  let anchor = -1;
  if (sorted.length > 0 && start < m.n) {
    const s = Math.max(0, start);
    const g = groups.findIndex((gr) => s >= gr.start && s < gr.end);
    if (g >= 0) anchor = groups[g].first;
  }
  const bottom = (i: number) => m.tops[i] + m.h[i];
  const out: VirtualBody[] = [];
  let k = 0;
  let skippedFrom = -1;
  const flushSkipped = (upTo: number) => {
    if (skippedFrom < 0) return;
    out.push({ kind: "spacer", key: `vs:${skippedFrom}`, height: m.gTop[upTo] - m.gTop[skippedFrom] });
    skippedFrom = -1;
  };
  groups.forEach((g, gi) => {
    while (k < sorted.length && sorted[k] < g.start) k++;
    const items: VirtualItem[] = [];
    let prevBottom = m.tops[g.start] ?? m.gTop[gi + 1];
    let any = false;
    while (k < sorted.length && sorted[k] < g.end) {
      const i = sorted[k++];
      const gap = m.tops[i] - prevBottom;
      if (gap > 0.01) items.push({ kind: "gap", key: `gap:${i}`, height: gap });
      items.push({ kind: "row", index: i });
      prevBottom = bottom(i);
      any = true;
    }
    if (!any && gi !== anchor) {
      if (skippedFrom < 0) skippedFrom = gi;
      return;
    }
    flushSkipped(gi);
    const rest = m.gTop[gi + 1] - prevBottom;
    if (rest > 0.01) items.push({ kind: "gap", key: `gap:end:${gi}`, height: rest });
    out.push({ kind: "group", group: gi, items });
  });
  flushSkipped(groups.length);
  return out;
}

export function useRowWindow<T>({
  enabled,
  rows,
  rowKey,
  groups,
  expanded,
  pinnedKeys,
  scrollerRef,
  tableRef,
  options,
  compact,
  rowsBefore,
  rowsAfter,
  colKeys,
  lockable,
  resetKey,
}: {
  enabled: boolean;
  /** The rows on screen, in order. */
  rows: readonly T[];
  rowKey: (row: T) => string | number;
  groups: readonly VirtualGroup[];
  /** Indices of the open rows: always rendered, their detail rows counted. */
  expanded: readonly number[];
  /** Keys always rendered (the roving tab stop). */
  pinnedKeys: readonly (string | number | null)[];
  scrollerRef: RefObject<HTMLElement | null>;
  tableRef: RefObject<HTMLTableElement | null>;
  options: DataTableVirtualize;
  compact: boolean;
  /** Rows above the first group: the header, the leading row. */
  rowsBefore: number;
  /** Rows after the last: the totals row. */
  rowsAfter: number;
  /** The header cells' keys, in order (the selection column as {@link VIRTUAL_SELECT_COL}). */
  colKeys: readonly string[];
  /** The keys whose width is locked (not a `grow` column, not a user-resized one). */
  lockable: ReadonlySet<string>;
  /** Anything that re-measures the column widths from scratch when it changes. */
  resetKey: string;
}): RowWindow | null {
  const overscan = Math.max(1, options.overscan ?? 12);
  const estimate = options.estimateRowHeight ?? (compact ? 29 : 37);
  const n = rows.length;

  const [measured, setMeasured] = useState<Measured>(() => ({
    heights: new Map(),
    details: new Map(),
    sum: 0,
    count: 0,
    band: [estimate, estimate * 0.8],
  }));
  const initialEnd = () =>
    Math.min(
      n,
      Math.ceil((typeof window === "undefined" ? 800 : Math.min(window.innerHeight || 800, 1600)) / estimate) +
        overscan,
    );
  const [range, setRange] = useState(() => ({ start: 0, end: initialEnd() }));
  const [focusTarget, setFocusTarget] = useState<number | null>(null);
  const [focusKey, setFocusKey] = useState<string | number | null>(null);
  const [scrollerWidth, setScrollerWidth] = useState(0);
  const [lock, setLock] = useState<{ sig: string; widths: Record<string, number> } | null>(null);
  const naturalOverflow = useRef(false);

  const expandedSig = expanded.join(",");
  const model = useMemo<Model | null>(() => {
    if (!enabled) return null;
    const keys = rows.map(rowKey);
    const avg = measured.count > 0 ? measured.sum / measured.count : estimate;
    const open = new Set(expanded);
    const h = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      h[i] = (measured.heights.get(keys[i]) ?? avg) + (open.has(i) ? (measured.details.get(keys[i]) ?? 0) : 0);
    }
    const tops = new Float64Array(n + 1);
    const gTop = new Float64Array(groups.length + 1);
    const ariaRows = new Int32Array(n);
    const ariaBands = new Int32Array(groups.length * 2);
    let y = 0;
    let aria = rowsBefore + 1;
    groups.forEach((g, gi) => {
      gTop[gi] = y;
      for (const level of g.bands) {
        y += measured.band[level - 1];
        ariaBands[gi * 2 + level - 1] = aria++;
      }
      for (let i = g.start; i < g.end; i++) {
        tops[i] = y;
        y += h[i];
        ariaRows[i] = aria++;
        if (open.has(i)) aria++;
      }
    });
    gTop[groups.length] = y;
    tops[n] = y;
    return { n, keys, tops, h, gTop, total: y, ariaRows, ariaBands, rowCount: aria - 1 + rowsAfter };
    // `expanded` by its signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rows, rowKey, groups, expandedSig, measured, estimate, n, rowsBefore, rowsAfter]);

  // The rows outside the range that stay: open rows, the tab stop, the focused row and
  // the keyboard's target.
  const pinned = useMemo(() => {
    if (!model) return [];
    const out = [...expanded];
    for (const key of [...pinnedKeys, focusKey]) {
      if (key === null) continue;
      const i = model.keys.indexOf(key);
      if (i >= 0) out.push(i);
    }
    if (focusTarget !== null) out.push(focusTarget);
    return out;
  }, [model, expanded, pinnedKeys, focusKey, focusTarget]);
  const pinnedSig = pinned.join(",");

  const start = Math.min(range.start, n);
  const end = Math.min(range.end, n);
  const bodies = useMemo(
    () => (model ? planBodies(model, groups, start, end, pinned) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, groups, start, end, pinnedSig],
  );

  const lockSig = `${resetKey}|${scrollerWidth}|${colKeys.join(",")}`;
  const colWidths = lock && lock.sig === lockSig ? lock.widths : null;

  // What the scroll handler and the frame's measure read: this render's model and lock.
  const latest = useRef({ model, colWidths, lockSig, colKeys, lockable, overscan });
  useLayoutEffect(() => {
    latest.current = { model, colWidths, lockSig, colKeys, lockable, overscan };
  });

  // Which rows the visible part of the scroller (and of the window, for a table in a page
  // that scrolls) shows, and a new range around them when the rendered one no longer
  // covers them. Read from the client rects, which a scroll leaves laid out.
  const update = useCallback(() => {
    const { model: m, overscan: over } = latest.current;
    const sc = scrollerRef.current;
    const table = tableRef.current;
    if (!m || !sc || !table) return;
    const origin = table.querySelector<HTMLElement>("tbody[data-vt-body]");
    if (!origin) return;
    const sr = sc.getBoundingClientRect();
    const top = Math.max(sr.top, 0);
    const bottom = Math.min(sr.bottom, window.innerHeight || sr.bottom);
    if (!(bottom > top)) return;
    const o = origin.getBoundingClientRect().top;
    const a = Math.min(firstBelow(m, top - o), m.n);
    const b = Math.max(a, Math.min(lastAbove(m, bottom - o), m.n));
    setRange((prev) =>
      prev.start <= a && prev.end >= b && prev.end <= m.n && prev.end - prev.start <= b - a + 4 * over
        ? prev
        : { start: Math.max(0, a - over), end: Math.min(m.n, b + over) },
    );
  }, [scrollerRef, tableRef]);

  // After a render that changed what is drawn: measure the rendered rows and bands, and
  // the header cells for the lock. Not after a render that only ticked a box. In the next
  // animation frame rather than in the commit: there the browser lays the table out once
  // for the frame anyway, where a read in the commit forced a layout of its own, and the
  // re-render the heights cause forced another (Chromium, 3000 rows: 35–130 ms of forced
  // layout per scrolled step, against one layout per frame now).
  const measure = useCallback(() => {
    const { model: m, colWidths: locked, lockSig: sig, colKeys: cols, lockable: lockKeys } = latest.current;
    const table = tableRef.current;
    const sc = scrollerRef.current;
    if (!m || !table || !sc) return;
    const trs = table.rows;
    const rects = Array.from(trs, (tr) => tr.getBoundingClientRect());
    const rowSamples: [string | number, number][] = [];
    const detailSamples: [string | number, number][] = [];
    const bandSamples: [0 | 1, number][] = [];
    for (let k = 0; k < trs.length; k++) {
      const own = rects[k];
      const next = rects[k + 1];
      // The distance to the next row's top: exact under collapsed borders.
      const h = next && next.top > own.top ? next.top - own.top : own.height;
      if (!(h > 0)) continue;
      const ds = trs[k].dataset;
      if (ds.rowIndex !== undefined) {
        const key = m.keys[Number(ds.rowIndex)];
        if (key !== undefined) rowSamples.push([key, h]);
      } else if (ds.rowDetail !== undefined) {
        const key = m.keys[Number(ds.rowDetail)];
        if (key !== undefined) detailSamples.push([key, h]);
      } else if (ds.groupRow === "1" || ds.groupRow === "2") {
        bandSamples.push([ds.groupRow === "1" ? 0 : 1, h]);
      }
    }
    if (rowSamples.length + detailSamples.length + bandSamples.length > 0) {
      setMeasured((prev) => {
        let { heights, details, sum, count } = prev;
        let band = prev.band;
        for (const [key, h] of rowSamples) {
          const old = heights.get(key);
          if (old !== undefined && Math.abs(old - h) <= 0.5) continue;
          if (heights === prev.heights) heights = new Map(heights);
          heights.set(key, h);
          sum += h - (old ?? 0);
          if (old === undefined) count++;
        }
        for (const [key, h] of detailSamples) {
          const old = details.get(key);
          if (old !== undefined && Math.abs(old - h) <= 0.5) continue;
          if (details === prev.details) details = new Map(details);
          details.set(key, h);
        }
        for (const [level, h] of bandSamples) {
          if (Math.abs(band[level] - h) <= 0.5) continue;
          band = level === 0 ? [h, band[1]] : [band[0], h];
        }
        return heights === prev.heights && details === prev.details && band === prev.band
          ? prev
          : { heights, details, sum, count, band };
      });
    }
    // The column lock.
    const cells = table.tHead?.rows[0]?.cells;
    if (!cells || cells.length !== cols.length) return;
    const widths: Record<string, number> = {};
    let anyWidth = false;
    for (let c = 0; c < cells.length; c++) {
      if (!lockKeys.has(cols[c])) continue;
      const w = cells[c].getBoundingClientRect().width;
      if (w > 0) {
        widths[cols[c]] = w;
        anyWidth = true;
      }
    }
    if (!anyWidth) return;
    const over = table.getBoundingClientRect().width > sc.clientWidth + 1;
    if (!locked) {
      naturalOverflow.current = over;
      setLock({ sig, widths });
    } else if (over && !naturalOverflow.current) {
      // A grown column pushed the table past a scroller it fit: measure afresh.
      setLock(null);
    } else {
      let grew = false;
      const merged = { ...locked };
      for (const [key, w] of Object.entries(widths)) {
        if (w > (merged[key] ?? 0) + 0.5) {
          merged[key] = w;
          grew = true;
        }
      }
      if (grew) setLock({ sig, widths: merged });
    }
  }, [scrollerRef, tableRef]);

  const frame = useRef(0);
  const schedule = useCallback(() => {
    if (frame.current) return;
    const run = () => {
      frame.current = 0;
      measure();
      update();
    };
    frame.current =
      typeof requestAnimationFrame === "undefined"
        ? -(setTimeout(run, 16) as unknown as number)
        : requestAnimationFrame(run);
  }, [measure, update]);
  useEffect(
    () => () => {
      if (frame.current > 0) cancelAnimationFrame(frame.current);
      else if (frame.current < 0) clearTimeout(-frame.current);
      frame.current = 0;
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => update();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    const sc = scrollerRef.current;
    let ro: ResizeObserver | undefined;
    if (sc && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        setScrollerWidth(Math.round(sc.clientWidth));
        update();
      });
      ro.observe(sc);
    }
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [enabled, update, scrollerRef]);

  // The row holding the focus (a row, or a control in it or in its open detail) stays.
  useEffect(() => {
    const table = tableRef.current;
    if (!enabled || !table) return;
    const onIn = (e: FocusEvent) => {
      const tr = (e.target as Element | null)?.closest?.<HTMLElement>("tr[data-row-index], tr[data-row-detail]");
      const index = tr ? Number(tr.dataset.rowIndex ?? tr.dataset.rowDetail) : NaN;
      const key = Number.isNaN(index) ? undefined : latest.current.model?.keys[index];
      setFocusKey(key ?? null);
      setFocusTarget(null);
    };
    const onOut = (e: FocusEvent) => {
      const to = e.relatedTarget as Node | null;
      if (!to || !table.contains(to)) setFocusKey(null);
    };
    table.addEventListener("focusin", onIn);
    table.addEventListener("focusout", onOut);
    return () => {
      table.removeEventListener("focusin", onIn);
      table.removeEventListener("focusout", onOut);
    };
  }, [enabled, tableRef]);

  const dataSig = n > 0 && model ? `${n}:${String(model.keys[0])}:${String(model.keys[n - 1])}` : "0";
  const renderSig = `${start}:${end}:${dataSig}:${expandedSig}:${pinnedSig}:${lockSig}:${colWidths ? 1 : 0}`;
  const lastRender = useRef("");
  useLayoutEffect(() => {
    if (!enabled || lastRender.current === renderSig) return;
    lastRender.current = renderSig;
    schedule();
  });

  // A new layout (heights measured, rows added): the range may no longer cover the view.
  const total = model?.total ?? 0;
  useLayoutEffect(() => {
    if (enabled) schedule();
  }, [enabled, schedule, total, n]);

  // The keyboard's target: rendered (pinned), then focused — its focus scrolls it into
  // view, and the scroll renders the rows around it.
  useLayoutEffect(() => {
    if (focusTarget === null) return;
    // Released by the focus it receives (the `focusin` above), which pins it as the
    // focused row from then on.
    tableRef.current?.querySelector<HTMLElement>(`tr[data-row-index="${focusTarget}"]`)?.focus();
  }, [focusTarget, bodies, tableRef]);

  const focusRow = useCallback(
    (i: number) => {
      const el = tableRef.current?.querySelector<HTMLElement>(`tr[data-row-index="${i}"]`);
      if (el) el.focus();
      else setFocusTarget(i);
    },
    [tableRef],
  );

  if (!enabled || !model) return null;
  return {
    bodies,
    rowCount: model.rowCount,
    ariaRow: (i) => model.ariaRows[i],
    ariaBand: (g, level) => model.ariaBands[g * 2 + level - 1],
    colWidths,
    focusRow,
  };
}

/** The roving rows' Arrow/Home/End target over ALL the rows, rendered or not. */
export function rowNavTarget(from: number, key: string, n: number): number | null {
  if (n === 0) return null;
  if (key === "ArrowDown") return Math.min(n - 1, from + 1);
  if (key === "ArrowUp") return Math.max(0, from - 1);
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return null;
}
