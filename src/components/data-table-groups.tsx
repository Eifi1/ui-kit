import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import { IconButtonSizeContext } from "./button-look";
import { CompactControls } from "./field-parts";
import { Spinner } from "./spinner";

/**
 * One level of {@link DataTableProps.groupBy} (0.48, keksdose dev #605): the rows are cut
 * into consecutive runs of equal `key` — the rows must already be ordered so equal keys
 * are contiguous, as for `mobileGroupBy` — and each run is headed by a full-width band.
 *
 * The same object drives the phone: `mobileGroupBy` takes a level too, so
 * `groupBy={[period, day]} mobileGroupBy={period}` is one definition for both layouts.
 */
export interface DataTableGroupBy<T> {
  /** The group a row belongs to. */
  key: (row: T) => string;
  /** The band's label. Default: the key itself. */
  label?: (key: string, rows: T[]) => ReactNode;
  /**
   * The band's end slot — a count, a total ("176 · +8'782.30 · −3'200.10"). `rows` are
   * the group's rows the table holds; an app whose total covers rows not yet loaded
   * looks it up by `key` instead.
   */
  end?: (key: string, rows: T[]) => ReactNode;
  /**
   * A small control at the band's end — the "+" that adds a row to THIS group (keksdose
   * live #492: a transaction on the band's day, an account of the section's type). Return
   * an {@link IconButton} whose `label` names the group ("Add a transaction on Mon, 2
   * Nov"), so a reader who reaches it out of the band still hears which one; `null` for a
   * group that takes none (a month, "Upcoming": no one date to fill in).
   *
   * The kit places and sizes it, so the three bands keksdose drew a "+" in by hand
   * (band-add-button.tsx) need no wrapper. An IconButton with no `size` of its own takes
   * the band's — 24px at compact density, 28px otherwise — and overhangs the band's line
   * of text into the band's padding, so a band with a "+" is exactly as tall as one
   * without: the bands are sticky, and a taller one covers more of the rows it pins
   * above. The slot is a {@link CompactControls} region: the glyph alone at Large text
   * (the band already says the day; the sentence beside it would wrap the band), the
   * `label` still its name and its tooltip.
   *
   * At the very END, after `end`, and why there rather than before it: the order a
   * screen reader reads the band and a keyboard reaches the control is then the order
   * the eye reads it — which group, how much is in it, then what you can do there, as a
   * field's label comes before the field; and the control stands at the same place on
   * every band, whatever the width of each band's count or total, so a column of "+"
   * lines up down the table, at the edge where the rows' own actions are. `end` and the
   * action wrap together, at the end, when the band runs out of room.
   *
   * Sticky with its band. Each band's action is a tab stop of its own, in document order
   * — before its group's rows, as the band is; the rows' Arrow keys skip it. On a phone the
   * same slot ends `mobileGroupBy`'s section header when it is given a level.
   */
  action?: (key: string, rows: T[]) => ReactNode;
  /**
   * The groups to draw EVEN WITH NO ROWS (0.59, keksdose live #504: *"Can the headers be
   * shown without entries? To get the + from the header row that fills in the account
   * type."*), in their order — a section per account type, the first Depot's "+" included.
   * A group with rows is drawn as always; a declared one with none gets its band (its
   * `label`, `end` and `action` called with no rows — the "+" that adds the first one) and
   * one line under it, {@link empty}. keksdose faked it with a placeholder row per type,
   * which the table then counted, paged, selected and swiped as an account.
   *
   * **An empty group is not a row.** The pager, the counts, the select-all, the phone's
   * reveal and the rows' arrow keys know only the rows; the line has no row link, no swipe,
   * no box.
   *
   * **Where it goes:** at its place in `keys` among the groups the rows make, when the rows
   * come in that order (the sort `keys` is written in); a key the rows put out of that order
   * (a column sort) sends the empty ones it skipped to after the last row. A group whose
   * key is NOT in `keys` is drawn where its rows are, as always — never dropped: a row the
   * pager counts is a row on screen (a type the app's list does not know yet, keksdose's
   * catch-all OTHER). So `keys` of only the groups to START puts them all after the rows,
   * as keksdose's accounts list has them.
   *
   * **When:** only where the table knows the group IS empty — it holds every row, and
   * nothing narrows them. Not while a column filter (or a {@link DataTableProps.keyFilter})
   * is on — "No account yet" under a filter would be untrue —, not under `serverPagination`
   * or a `loadMore` with more to come, and not under `virtualize` (a windowed table is the
   * long list, whose groups are its rows' runs). A narrowing of the app's own (a search box
   * above the table) is the app's to know: pass no `keys` while it is on. On the first level
   * of `groupBy` and on `mobileGroupBy`; a second level's are not read (a period's days are
   * its rows). Paged, an empty group is drawn on the page whose first row follows it, the
   * ones after the last row on the last page.
   */
  keys?: readonly string[];
  /**
   * The line an empty declared group shows ({@link keys}) — "No account yet". Default: the
   * table's `labels.empty` ("No entries"); `null` draws the band alone.
   */
  empty?: (key: string) => ReactNode;
}

/** A declared group with no rows ({@link DataTableGroupBy.keys}): drawn before the row at
 *  index `at` of the rows it was placed among, or after the last when `at` is their length. */
export interface EmptyGroupAt {
  key: string;
  at: number;
}

/**
 * Where `keys`' groups with no rows go among `rows`' runs (0.59, live #504). Pure.
 *
 * One pass over the runs with a pointer into `keys`: a run whose key is declared at or past
 * the pointer first places every declared key it passes that has no row anywhere, then moves
 * the pointer past itself; a run out of `keys`' order, or of an undeclared key, moves
 * nothing. What is left is placed after the last row. So the rows never move — the slice,
 * its indices and its order are the table's — and the empties land where `keys` puts them
 * whenever the rows follow it.
 */
export function placeEmptyGroups<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
  keys: readonly string[],
): EmptyGroupAt[] {
  const order = new Map<string, number>();
  keys.forEach((k, i) => {
    if (!order.has(k)) order.set(k, i);
  });
  const runs: { key: string; at: number }[] = [];
  const present = new Set<string>();
  rows.forEach((row, i) => {
    const key = keyOf(row);
    present.add(key);
    if (runs.length === 0 || runs[runs.length - 1].key !== key) runs.push({ key, at: i });
  });
  const out: EmptyGroupAt[] = [];
  const placed = new Set<string>();
  let next = 0;
  const placeUpTo = (end: number, at: number) => {
    for (; next < end; next++) {
      const key = keys[next];
      if (present.has(key) || placed.has(key)) continue;
      placed.add(key);
      out.push({ key, at });
    }
  };
  for (const run of runs) {
    const j = order.get(run.key);
    if (j === undefined || j < next) continue;
    placeUpTo(j, run.at);
    next = j + 1;
  }
  placeUpTo(keys.length, rows.length);
  return out;
}

/**
 * The empty groups a window of the rows draws — a page `[from, to)` of `total` rows, or
 * the phone's revealed `[0, to)`: each on the page whose first row follows it, the ones
 * after the last row on the last page (so none is drawn twice, and a table with no rows
 * draws them all).
 */
export function emptyGroupsIn(
  empties: readonly EmptyGroupAt[],
  from: number,
  to: number,
  total: number,
): EmptyGroupAt[] {
  return empties.filter((e) => (e.at >= from && e.at < to) || (e.at === total && to >= total));
}

/**
 * {@link DataTableProps.loadMore} (0.48, keksdose dev #605): a footer in place of the
 * pager that loads the next slice of rows — on its own as it scrolls into view (an
 * IntersectionObserver), and through a button that is always there for the keyboard and
 * the screen reader. The owner appends the rows; the table renders every row it is given.
 */
export interface DataTableLoadMore {
  /** Whether there is anything left to load. False draws the end state. */
  hasMore: boolean;
  /** Load the next slice. Called at most once per row count while `loading` is false. */
  onLoadMore: () => void;
  /** A load is in flight: the button says "Loading…" and ignores presses. */
  loading?: boolean;
  /** The button's words — what it loads ("Load August 2026"). Default: the kit's "Load more". */
  label?: ReactNode;
  /** What the footer says once `hasMore` is false. Default: the kit's "All rows loaded";
   *  `null` draws nothing. */
  endLabel?: ReactNode;
  /** Load as the footer scrolls into view. Default true; false leaves only the button. */
  auto?: boolean;
}

/** A run of rows under one band; `start` is its first row's index in the slice. */
export interface RowGroup<T> {
  key: string;
  rows: T[];
  start: number;
  /** The second level's runs inside this one, or null with one level. */
  children: RowGroup<T>[] | null;
  /** 0.59: a declared group with no rows ({@link DataTableGroupBy.keys}); `start` is where
   *  it stands, the index of the row after it. */
  empty?: true;
}

/** `groups` (one level's runs over a window of the rows) with the window's empty declared
 *  groups put in place — `offset` is the window's first row's index among all the rows. */
export function withEmptyGroups<T>(
  groups: RowGroup<T>[],
  empties: readonly EmptyGroupAt[],
  offset: number,
): RowGroup<T>[] {
  if (empties.length === 0) return groups;
  const out: RowGroup<T>[] = [];
  let e = 0;
  for (const g of groups) {
    while (e < empties.length && empties[e].at - offset <= g.start) {
      out.push({ key: empties[e].key, rows: [], start: empties[e].at - offset, children: null, empty: true });
      e++;
    }
    out.push(g);
  }
  for (; e < empties.length; e++)
    out.push({ key: empties[e].key, rows: [], start: empties[e].at - offset, children: null, empty: true });
  return out;
}

/**
 * The line under an empty declared group's band — or the phone's section header — with
 * {@link DataTableGroupBy.empty}'s words (0.59). Not a row: no `data-row-index`, so the
 * rows' arrow keys, the focus rules and the counts pass it by.
 */
export function DataTableEmptyGroupLine({
  colSpan,
  compact,
  children,
}: {
  colSpan: number;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <tr data-group-empty="">
      <td colSpan={colSpan} className={cn("text-muted", compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm")}>
        {children}
      </td>
    </tr>
  );
}

/** Consecutive runs by `level.key`, nested once for a second level. */
export function groupRows<T>(rows: readonly T[], levels: readonly DataTableGroupBy<T>[], offset = 0): RowGroup<T>[] {
  const [level, ...rest] = levels;
  if (!level) return [];
  const out: RowGroup<T>[] = [];
  rows.forEach((row, i) => {
    const key = level.key(row);
    const last = out[out.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else out.push({ key, rows: [row], start: offset + i, children: null });
  });
  if (rest.length > 0) for (const g of out) g.children = groupRows(g.rows, rest.slice(0, 1), g.start);
  return out;
}

/** `groupBy` as a list of at most two levels. */
export function groupLevels<T>(
  groupBy: DataTableGroupBy<T> | readonly [DataTableGroupBy<T>, DataTableGroupBy<T>?] | undefined,
): DataTableGroupBy<T>[] {
  if (!groupBy) return [];
  const list = "key" in groupBy ? [groupBy] : (groupBy as readonly (DataTableGroupBy<T> | undefined)[]);
  return list.filter((l): l is DataTableGroupBy<T> => !!l).slice(0, 2);
}

/**
 * The bands' sticky offsets: the first level under the header (and under a sticky
 * `leadingRow`), the second under the first. Measured — the header grows at Large text,
 * a band's end slot can wrap — and followed with a ResizeObserver.
 */
export function useGroupBandTops(
  tableRef: RefObject<HTMLTableElement | null>,
  enabled: boolean,
  signature: string,
): [number, number] {
  const [tops, setTops] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!enabled || !table) return;
    // Looked up afresh on each measure: under `virtualize` (0.48.2) the first band can
    // leave the DOM as the rows scroll, and a detached cell measures 0 — the bands would
    // stack on one another. A band missing for now keeps the height it had.
    const parts = () => [
      table.tHead,
      table.querySelector<HTMLElement>("[data-leading-row='sticky']"),
      table.querySelector<HTMLElement>("th[data-group-band='1']"),
    ];
    let bandHeight = 0;
    const measure = () => {
      const [headEl, leadEl, bandEl] = parts();
      const head = headEl ? headEl.getBoundingClientRect().height : 0;
      const lead = leadEl ? leadEl.getBoundingClientRect().height : 0;
      if (bandEl) bandHeight = bandEl.getBoundingClientRect().height;
      const band = bandHeight;
      setTops((prev) =>
        prev[0] === head + lead && prev[1] === head + lead + band ? prev : [head + lead, head + lead + band],
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    for (const el of parts()) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [tableRef, enabled, signature]);
  return tops;
}

/**
 * A band row. A `<th scope="rowgroup">` spanning the row — the header of the `<tbody>` it
 * opens, which a screen reader announces as the reader enters the group — and sticky on
 * the cell, not the `<tr>`, as the header's and the leading row's are. Opaque, under the
 * sticky leading row's `z-[5]`: the first level `z-[4]` over the second's `z-[3]`, so a
 * period arriving from below covers the day still pinned under the one before. The line
 * over it is the cell's own `::before`, which moves with the stuck cell.
 */
export function DataTableGroupBand({
  level,
  colSpan,
  top,
  compact,
  label,
  end,
  action,
  ariaRowIndex,
}: {
  level: 1 | 2;
  colSpan: number;
  top: number;
  compact: boolean;
  label: ReactNode;
  end: ReactNode;
  /** The level's `action` for this group (0.58). */
  action?: ReactNode;
  /** Under `virtualize` (0.48.2). */
  ariaRowIndex?: number;
}) {
  return (
    <tr data-group-row={level} aria-rowindex={ariaRowIndex}>
      <th
        scope="rowgroup"
        colSpan={colSpan}
        data-group-band={level}
        style={{ top }}
        className={cn(
          "sticky p-0 text-start align-middle",
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[1] before:h-px before:bg-[var(--border)] before:content-['']",
          level === 1 ? "z-[4] bg-surface-2 font-semibold text-primary" : "z-[3] bg-surface font-medium text-secondary",
          level === 1 ? (compact ? "text-xs" : "text-sm") : "text-xs",
        )}
      >
        {/* Pinned to what the scroller shows, as the expansion row's panel is: the end
            slot stays at the visible end of a table wider than its scroller. */}
        <div className="w-0 min-w-full">
          <div
            className={cn(
              "sticky start-0 flex w-[var(--dt-visible-w,100%)] max-w-full flex-wrap items-baseline justify-between gap-x-3",
              compact ? "px-2 py-1" : level === 1 ? "px-3 py-2" : "px-3 py-1.5",
            )}
          >
            <span className="min-w-0">{label}</span>
            <GroupBandEnd end={end} action={action} size={compact ? "2xs" : "xs"} />
          </div>
        </div>
      </th>
    </tr>
  );
}

/**
 * The end of a band — the desktop's and the phone section header's: the `end` slot, then
 * the `action` (see {@link DataTableGroupBy.action}).
 *
 * The action's box overhangs the band's line by as much as the band's padding has room
 * for, so its margin box is one line of the band's text and the band keeps its height:
 * `2xs` (24px) in a compact band (`py-1`, a 16px line: `-my-1`); `xs` (28px) in the others
 * — `py-1.5` round a 16px line (`-my-1.5`), and the period band's `py-2` round a 20px one,
 * with room to spare. The same overhang at the end edge (`-me-*`, the glyph's side
 * padding) lines the glyph up with where the rows' content ends. `self-center`, not the
 * band's baseline: a glyph-only button has no text to align by, and its synthesized
 * baseline (the glyph's bottom edge) hangs the box off the line — keksdose's hand-made
 * "+" grew the phone section header from 28 to 32px that way (band-add-button.tsx).
 */
export function GroupBandEnd({ end, action, size }: { end: ReactNode; action: ReactNode; size: "2xs" | "xs" }) {
  const hasEnd = end != null && end !== false;
  if (action == null || action === false) {
    return hasEnd ? <span className="ms-auto tabular-nums">{end}</span> : null;
  }
  return (
    <span className="ms-auto flex items-center gap-x-2 self-center">
      {hasEnd && <span className="tabular-nums">{end}</span>}
      <span
        data-group-action=""
        className={cn("inline-flex shrink-0 items-center", size === "2xs" ? "-my-1 -me-1" : "-my-1.5 -me-1.5")}
      >
        <CompactControls>
          <IconButtonSizeContext.Provider value={size}>{action}</IconButtonSizeContext.Provider>
        </CompactControls>
      </span>
    </span>
  );
}

/**
 * The load-more footer. Observed against the viewport (an implicit root sees through the
 * clipping scroller, so it works in a bounded body, under `fillHeight`, and in a page that
 * scrolls), and guarded: one call per row count, none while `loading`, so an observer
 * that reports twice — or a footer still in view while the owner sets `loading` — loads
 * once. When the rows arrive and the footer is still in view (a short slice), it loads
 * again, until the scroller is full.
 */
export function DataTableLoadMoreFooter({
  loadMore,
  rowCount,
  labels,
  compact,
  as: Tag = "div",
}: {
  loadMore: DataTableLoadMore;
  rowCount: number;
  labels: { loadMore: string; allLoaded: string; loading: string };
  compact: boolean;
  as?: "div" | "li";
}) {
  const { hasMore, onLoadMore, loading = false, auto = true, label, endLabel } = loadMore;
  const rootRef = useRef<HTMLElement | null>(null);
  const endRef = useRef<HTMLParagraphElement | null>(null);
  const firedAt = useRef<number | null>(null);
  const buttonFocused = useRef(false);
  // What the observer's callback acts on: the latest props, not the ones it was made with.
  const latest = useRef({ onLoadMore, loading, rowCount });
  useEffect(() => {
    latest.current = { onLoadMore, loading, rowCount };
  });

  // A fresh observer whenever the rows or the in-flight flag change: its first report is
  // the footer's position AFTER the new rows are laid out. Acting on a remembered "in
  // view" instead fired a second load the moment the rows arrived, while the footer was
  // still where the old last row had been (headless Chromium caught it).
  useEffect(() => {
    const el = rootRef.current;
    if (!auto || !hasMore || loading || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const now = latest.current;
        if (!entries.some((e) => e.isIntersecting) || now.loading || firedAt.current === now.rowCount) return;
        firedAt.current = now.rowCount;
        now.onLoadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [auto, hasMore, loading, rowCount]);

  // A focused button that goes away (nothing left) hands its focus to the end line.
  useEffect(() => {
    if (!hasMore && buttonFocused.current) {
      buttonFocused.current = false;
      endRef.current?.focus();
    }
  }, [hasMore]);

  const end = endLabel === undefined ? labels.allLoaded : endLabel;
  return (
    <Tag
      ref={(el: HTMLElement | null) => {
        rootRef.current = el;
      }}
      data-table-load-more=""
      className={cn(
        "sticky start-0 flex w-[var(--dt-visible-w,100%)] max-w-full flex-col items-center border-t border-subtle text-center",
        compact ? "px-2 py-2" : "px-3 py-3",
      )}
    >
      {hasMore ? (
        <Button
          variant="secondary"
          size="sm"
          aria-busy={loading || undefined}
          onFocus={() => (buttonFocused.current = true)}
          onBlur={() => (buttonFocused.current = false)}
          onClick={() => {
            if (loading) return;
            firedAt.current = rowCount;
            onLoadMore();
          }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Spinner label={null} className="size-4" />
              <bdi>{labels.loading}</bdi>
            </span>
          ) : (
            (label ?? labels.loadMore)
          )}
        </Button>
      ) : end != null && end !== false ? (
        <p ref={endRef} tabIndex={-1} className="text-xs text-muted outline-none">
          {end}
        </p>
      ) : null}
      {/* Mounted throughout, so a screen reader hears the load start. */}
      <span role="status" className="sr-only">
        {loading ? labels.loading : ""}
      </span>
    </Tag>
  );
}
