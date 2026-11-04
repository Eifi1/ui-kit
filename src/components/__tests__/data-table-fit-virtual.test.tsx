import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";

/**
 * The order the register fit relies on (keksdose register fit, 0.51.2 leftovers): rows that
 * arrive are drawn by `virtualize` in the render they arrive in, the fit measures that
 * table in the same commit — before a frame, so before a paint — and the window's lock,
 * in the next frame, locks the table the fit left. Until 0.55 a table mounted while its
 * rows loaded drew the tab stop's row alone; the rows came a frame later, the table
 * painted too wide until its ResizeObserver re-fitted it, and which rows came depended on
 * the scroller's height at that frame (in keksdose, whether the page's tiles above the
 * register had arrived): 48 rows drawn on one load, 52 on the next, and other columns.
 * Measured in Chromium by scripts/register-fit-frames.mjs.
 *
 * jsdom lays nothing out, so this is a model, the fit test's and TST-2's together: rows of
 * a real height one under the other; a header cell as wide as the widest of its content,
 * its `<col>`'s locked width and its drawn rows' cells (an auto table layout); the `grow`
 * column takes what the others leave, down to its 10rem floor; the scroller's width is
 * the test's. Frames queue until the test runs them, and the ResizeObserver reports only
 * when the test says: whatever happens before either did happen before a paint.
 */

interface Row {
  id: number;
  title: string;
}
const ROWS: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i, title: `Row ${i}` }));
const ESTIMATE = 40;
const OVERSCAN = 5;
const ROW_H = 60;
const HEAD_H = 40;
/** jsdom's `innerHeight`: the screenful is ceil(768 / 40) + 5 rows. */
const SCREENFUL = Math.ceil(window.innerHeight / ESTIMATE) + OVERSCAN;

/** The header cells' own widths. */
const NATURAL: Record<string, number> = { id: 60, note: 100, state: 90 };
/** A cell's width by column and row: the notes from row 10 on are long (the register's
 *  rare wide row, past the first rows but inside a screenful). */
const CELL: Record<string, (index: number) => number> = { note: (i) => (i >= 10 ? 300 : 80) };
let avail = 500;
let viewH = 400;
let frames: FrameRequestCallback[] = [];

const rect = (top: number, height: number, width = 0) =>
  ({ top, bottom: top + height, height, left: 0, right: width, width, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

const keyOf = (th: Element) => th.textContent?.trim() ?? "";

/** The width `virtualize` locked a header's column at, 0 while unlocked. */
function lockedWidth(th: HTMLTableCellElement): number {
  const col = th.closest("table")?.querySelectorAll<HTMLElement>(":scope > colgroup > col")[th.cellIndex];
  return col ? parseFloat(col.style.width) || 0 : 0;
}

/** The table's widths: each non-grow column at the widest of its header, lock and drawn
 *  cells; the grow column takes the rest, at least 160. */
function layout(table: HTMLTableElement) {
  const drawn = [...table.querySelectorAll<HTMLElement>(":scope > tbody > tr[data-row-index]")].map((tr) =>
    Number(tr.dataset.rowIndex),
  );
  const ths = [...(table.tHead?.rows[0]?.cells ?? [])];
  const growTh = ths.find((th) => th.className.includes("w-full"));
  const widths = new Map<Element, number>();
  for (const th of ths) {
    if (th === growTh) continue;
    const key = keyOf(th);
    const cells = CELL[key] ? drawn.map(CELL[key]) : [];
    widths.set(th, Math.max(NATURAL[key] ?? 50, lockedWidth(th), ...cells));
  }
  const others = [...widths.values()].reduce((a, b) => a + b, 0);
  const grow = growTh ? Math.max(avail - others, 160) : 0;
  if (growTh) widths.set(growTh, grow);
  return { table: others + grow, widths };
}

/** Each row's top and height, the table's rows one under the other. */
function rowTops(table: HTMLTableElement): Map<Element, { top: number; height: number }> {
  const out = new Map<Element, { top: number; height: number }>();
  let y = 0;
  for (const tr of Array.from(table.rows)) {
    const height =
      tr.parentElement?.tagName === "THEAD"
        ? HEAD_H
        : tr.hasAttribute("data-vt-spacer")
          ? parseFloat(tr.cells[0].style.height) || 0
          : tr.dataset.rowIndex !== undefined
            ? ROW_H
            : 0;
    out.set(tr, { top: y, height });
    y += height;
  }
  return out;
}

const restore: (() => void)[] = [];
function stubGetter(name: "offsetWidth" | "clientWidth", get: (this: HTMLElement) => number) {
  const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);
  Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get });
  restore.push(() => {
    if (before) Object.defineProperty(HTMLElement.prototype, name, before);
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  });
}

let ro: ResizeObserverStub;
beforeEach(() => {
  avail = 500;
  viewH = 400;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  ro = stubResizeObserver();
  const isScroller = (el: HTMLElement) => el.hasAttribute("data-clips");
  stubGetter("clientWidth", function () {
    return isScroller(this) ? avail : 0;
  });
  // The fit reads `offsetWidth`, the window's lock `getBoundingClientRect`: one model.
  const widthOf = (el: HTMLElement): number => {
    const table = el.closest("table");
    if (!table) return 0;
    if (el === table) return layout(table).table;
    if (el instanceof HTMLTableCellElement && el.closest("thead")) return layout(table).widths.get(el) ?? 0;
    return 0;
  };
  stubGetter("offsetWidth", function () {
    return widthOf(this);
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (!(this instanceof HTMLElement)) return rect(0, 0);
    if (isScroller(this)) return rect(0, viewH, avail);
    const table = this.closest("table");
    if (!table) return rect(0, 0);
    const scrollTop = (table.parentElement as HTMLElement).scrollTop;
    if (this === table || (this instanceof HTMLTableCellElement && this.closest("thead")))
      return rect(-scrollTop, this === table ? 0 : HEAD_H, widthOf(this));
    // The first windowed body starts under the header, moved up by the scroll.
    if (this.matches("tbody[data-vt-body]")) return rect(HEAD_H - scrollTop, 0);
    const at = this instanceof HTMLTableRowElement ? rowTops(table).get(this) : undefined;
    return at ? rect(at.top - scrollTop, at.height) : rect(0, 0);
  });
});
afterEach(() => {
  ro.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  while (restore.length) restore.pop()!();
});

/** Run the frames queued so far, and the ones they queue, `rounds` deep. */
function flushFrames(rounds = 1) {
  for (let i = 0; i < rounds; i++)
    act(() => {
      const run = frames;
      frames = [];
      for (const cb of run) cb(0);
    });
}

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "id", header: "id", cell: (r) => String(r.id) },
  { key: "title", header: "title", grow: true, cell: (r) => r.title },
  { key: "note", header: "note", fitPriority: 1, cell: () => "" },
  { key: "state", header: "state", fitPriority: 2, cell: () => "" },
];

const ui = (rows: Row[]) => (
  <MemoryRouter>
    <DataTable
      rows={rows}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      paginated={false}
      columnSettings={false}
      virtualize={{ estimateRowHeight: ESTIMATE, overscan: OVERSCAN }}
    />
  </MemoryRouter>
);

const table = () => screen.getByRole("table") as HTMLTableElement;
const drawnRows = () => table().querySelectorAll(":scope > tbody > tr[data-row-index]").length;
const heads = () => [...(table().tHead?.rows[0]?.cells ?? [])].map(keyOf);
const lockOf = () => [...table().querySelectorAll<HTMLElement>(":scope > colgroup > col")].map((c) => c.style.width);

describe("the register fit's order: rows drawn, fitted, then locked (keksdose register fit, 0.51.2 leftovers)", () => {
  it("rows that arrive after an empty mount are drawn in the render they arrive in, a screenful of them", () => {
    const { rerender } = render(ui([]));
    rerender(ui(ROWS));
    // No frame has run: 0.51.2 drew the tab stop's row alone here, and the rest a frame later.
    expect(drawnRows()).toBe(SCREENFUL);
  });

  it("the fit measures them in that commit: no frame, no ResizeObserver report, and the table fits", () => {
    const { rerender } = render(ui([]));
    rerender(ui(ROWS));
    // Rows 10 on widen Note to 300: 60 + 300 + 90 + 160 = 610 > 500, so Note leaves. Before
    // 0.55 the fit saw row 0 alone (60 + 100 + 90 + 160 ≤ 500), kept Note, and the drawn
    // rows widened the table in the next frame, to be re-fitted only after a paint.
    expect(heads()).toEqual(["id", "title", "state"]);
    expect(table().offsetWidth).toBeLessThanOrEqual(avail);
  });

  it("the window's lock, in the next frame, locks the table the fit left, and the columns stay", () => {
    const { rerender } = render(ui([]));
    rerender(ui(ROWS));
    expect(lockOf()).toEqual(["", "", ""]);
    flushFrames(2);
    expect(lockOf()).toEqual(["60px", "", "90px"]);
    expect(heads()).toEqual(["id", "title", "state"]);
    expect(drawnRows()).toBe(SCREENFUL);
  });

  it("which rows are drawn, and so the columns, does not depend on the scroller's height when the window first looks", () => {
    const after = (height: number) => {
      viewH = height;
      const { rerender, unmount } = render(ui([]));
      rerender(ui(ROWS));
      flushFrames(3);
      const out = { rows: drawnRows(), heads: heads() };
      unmount();
      return out;
    };
    // keksdose's tiles above the register: a shorter scroller at the first look (300 px)
    // or a taller one (700 px). Both keep the screenful drawn with the rows, which covers
    // either view.
    const short = after(300);
    const tall = after(700);
    expect(short).toEqual(tall);
    expect(short).toEqual({ rows: SCREENFUL, heads: ["id", "title", "state"] });
  });

  it("a list cut short by a filter and filled again is drawn a screenful again in the render that fills it", () => {
    const { rerender } = render(ui(ROWS));
    flushFrames(2);
    rerender(ui(ROWS.slice(0, 3)));
    flushFrames(2);
    expect(drawnRows()).toBe(3);
    rerender(ui(ROWS));
    expect(drawnRows()).toBe(SCREENFUL);
    expect(heads()).toEqual(["id", "title", "state"]);
  });

  it("a list cut short from far down is drawn to its end, where its scroller now is", () => {
    const { rerender } = render(ui(ROWS));
    flushFrames(2);
    // Scrolled to row ~150: the window moves there.
    act(() => {
      (table().parentElement as HTMLElement).scrollTop = 150 * ROW_H;
      table().parentElement!.dispatchEvent(new Event("scroll"));
    });
    flushFrames(2);
    // The window's rows, past row 0: the tab stop's, drawn wherever the window is.
    const windowRows = () =>
      [...table().querySelectorAll<HTMLElement>(":scope > tbody > tr[data-row-index]")]
        .map((tr) => Number(tr.dataset.rowIndex))
        .filter((i) => i > 0);
    expect(Math.min(...windowRows())).toBeGreaterThan(100);
    // A filter leaves 60 rows: the window holds a screenful, the last of them. 0.51.2 drew
    // none of them (its range, 144–162, clipped to 60–60) until the next frame.
    rerender(ui(ROWS.slice(0, 60)));
    expect(windowRows()).toEqual(Array.from({ length: SCREENFUL }, (_, i) => 60 - SCREENFUL + i));
  });
});

/**
 * keksdose N2 (0.49 review 3): c53c692's test, back with it, on this model. With
 * `virtualize`, a `fitPriority` column brought back was estimated at 606 + 93 = 699 ≤ 757
 * but drawn needed 778–812. Left out, the table is measured afresh (the lock's signature
 * names the columns, so it has none); brought back within the same commit — before the
 * window's frame measured anything — the signature was the old lock's again, and the table
 * came back at the widths that had ratcheted up while rows scrolled, not the ones the fit
 * had just measured. B2's guard then kept the column out although it fitted. Modelled as
 * c53c692 did: Account ratchets 300 → 350 while a wide cell is in view and goes back to 300
 * when it leaves; then a refetch (the same rows, a wider Amount) has the fit measure the
 * ratcheted table, 759 > 757. In Chromium: scripts/register-fit-frames.mjs `--scenario edit
 * --query monthly=24`.
 */
describe("under `virtualize`, a column brought back is drawn as the fit measured it (keksdose N2)", () => {
  const VCOLS: DataTableColumn<Row>[] = [
    { key: "acct", header: "acct", cell: () => "" },
    { key: "title", header: "title", grow: true, cell: (r) => r.title },
    { key: "amount", header: "amount", cell: () => "" },
    { key: "state", header: "state", fitPriority: 1, cell: () => "" },
  ];
  const vui = (rows: Row[]) => (
    <MemoryRouter>
      <DataTable rows={rows} columns={VCOLS} rowKey={(r) => r.id} paginated={false} virtualize />
    </MemoryRouter>
  );
  beforeEach(() => {
    avail = 757;
    Object.assign(NATURAL, { acct: 300, amount: 146, state: 93 });
  });
  afterEach(() => {
    for (const k of ["acct", "amount"]) delete NATURAL[k];
    NATURAL.state = 90;
  });

  it("comes back at the widths measured with it, not the ones its last showing ratcheted up to", () => {
    const rows = [...ROWS];
    const { rerender } = render(vui(rows));
    // 300 + 146 + 93 + Title's 10rem = 699 ≤ 757: all in; the first frame locks the widths.
    flushFrames(2);
    expect(heads()).toEqual(["acct", "title", "amount", "state"]);
    expect(lockOf()).toEqual(["300px", "", "146px", "93px"]);

    // A wider Account cell in view (a scroll; here the focus moving to a row asks the same
    // measure): its column grows once, and keeps that width after the cell has gone.
    NATURAL.acct = 350;
    act(() =>
      table()
        .querySelector("tr[data-row-index='0']")!
        .dispatchEvent(new FocusEvent("focusin", { bubbles: true })),
    );
    flushFrames();
    expect(lockOf()[0]).toBe("350px");
    NATURAL.acct = 300;

    // A refetch: the same rows, Amount 10px wider. Drawn as locked the table needs
    // 350 + 156 + 93 + 160 = 759 > 757, so State leaves; measured afresh without it the
    // table needs 616, and 616 + 93 ≤ 757 brings it back. Drawn as measured, it needs
    // 300 + 156 + 93 + 160 = 709: it stays.
    NATURAL.amount = 156;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    rerender(vui([...rows]));
    expect(errors.mock.calls.flat().map(String).join("\n")).not.toMatch(/Maximum update depth/);
    expect(heads()).toEqual(["acct", "title", "amount", "state"]);
    // The next frame locks what is drawn now: Account at 300, not the 350 it once was.
    flushFrames(2);
    expect(heads()).toEqual(["acct", "title", "amount", "state"]);
    expect(lockOf()).toEqual(["300px", "", "156px", "93px"]);
  });
});
