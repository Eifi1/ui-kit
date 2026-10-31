import { useMemo } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";

/**
 * `virtualize`'s measure and its column lock (data-table-virtual.ts `measure` and the
 * frame that runs it, and the scroller's ResizeObserver), pinned as they are in 0.51.7
 * (refactor audit 2026-10-30, TST-2). No test ran them: the virtual suite models every row
 * at height 0 and never lets an animation frame run, and keksdose renders without
 * `virtualize` under test. This is the code behind keksdose's register-fit regressions,
 * and the characterization N2's next attempt measures against.
 *
 * The harness is c53c692's, which the revert of the 0.51.0 lock change took away: frames
 * queue until the test flushes them inside `act`, and jsdom's missing layout is a model —
 * rows of a real height laid out one under the other, header cells at their content's
 * width or their `<col>`'s locked width, whichever is wider (an auto table layout), and a
 * scroller whose width the test sets and reports through `stubResizeObserver`.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const ESTIMATE = 40;
const ROW_H = 60;
const HEAD_H = 40;
const VIEW_H = 400;

/** The header cells' content widths, by column (the headers are their keys). */
const NATURAL: Record<string, number> = {};
let scrollerWidth = 400;
let frames: FrameRequestCallback[] = [];

const rect = (top: number, height: number, width = 0) =>
  ({ top, bottom: top + height, height, left: 0, right: width, width, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

/** The width `virtualize` locked a header's column at, 0 while unlocked. */
function lockedWidth(th: HTMLTableCellElement): number {
  const col = th.closest("table")?.querySelectorAll<HTMLElement>(":scope > colgroup > col")[th.cellIndex];
  return col ? parseFloat(col.style.width) || 0 : 0;
}
const headWidth = (th: HTMLTableCellElement) => Math.max(NATURAL[th.textContent?.trim() ?? ""] ?? 50, lockedWidth(th));

/** Each row's top and height, the table's rows laid out one under the other. */
function layout(table: HTMLTableElement): Map<Element, { top: number; height: number }> {
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
let ro: ResizeObserverStub;
beforeEach(() => {
  for (const k of Object.keys(NATURAL)) delete NATURAL[k];
  Object.assign(NATURAL, { name: 120, id: 80 });
  scrollerWidth = 400;
  frames = [];
  // The measure runs in the next animation frame: the test decides when one does.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  ro = stubResizeObserver();
  const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.querySelector(":scope > table[data-virtualized]") ? scrollerWidth : 0;
    },
  });
  restore.push(() => {
    if (before) Object.defineProperty(HTMLElement.prototype, "clientWidth", before);
    else Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
  });
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this instanceof HTMLElement && this.querySelector(":scope > table[data-virtualized]"))
      return rect(0, VIEW_H, scrollerWidth);
    const table = this.closest<HTMLTableElement>("table[data-virtualized]");
    if (!table) return rect(0, 0);
    const scrollTop = (table.parentElement as HTMLElement).scrollTop;
    const heads = Array.from(table.tHead?.rows[0]?.cells ?? []);
    if (this === table)
      return rect(
        -scrollTop,
        0,
        heads.reduce((sum, th) => sum + headWidth(th), 0),
      );
    if (this instanceof HTMLTableCellElement && this.closest("thead")) return rect(-scrollTop, HEAD_H, headWidth(this));
    // The first windowed body starts under the header, moved up by the scroll.
    if (this.matches("tbody[data-vt-body]")) return rect(HEAD_H - scrollTop, 0);
    const at = this instanceof HTMLTableRowElement ? layout(table).get(this) : undefined;
    return at ? rect(at.top - scrollTop, at.height) : rect(0, 0);
  });
});
afterEach(() => {
  ro.restore();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  while (restore.length) restore.pop()!();
});

/** Run the frames queued so far, and the ones they queue, a few rounds deep. */
function flushFrames(rounds = 1) {
  for (let i = 0; i < rounds; i++)
    act(() => {
      const run = frames;
      frames = [];
      for (const cb of run) cb(0);
    });
}

function VTable() {
  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      { key: "name", header: "name", cell: (r) => r.name },
      { key: "id", header: "id", cell: (r) => String(r.id) },
    ],
    [],
  );
  return (
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        paginated={false}
        columnSettings={false}
        virtualize={{ estimateRowHeight: ESTIMATE, overscan: 5 }}
      />
    </MemoryRouter>
  );
}

const table = () => screen.getByRole("table");
const scroller = () => table().parentElement as HTMLElement;
const rendered = () => table().querySelectorAll("tr[data-row-index]").length;
const spacerTotal = () =>
  [...table().querySelectorAll<HTMLElement>("tr[data-vt-spacer] > td")].reduce(
    (sum, td) => sum + parseFloat(td.style.height || "0"),
    0,
  );
const lockOf = () => [...table().querySelectorAll<HTMLElement>(":scope > colgroup > col")].map((c) => c.style.width);
function scrollTo(y: number) {
  act(() => {
    scroller().scrollTop = y;
    fireEvent.scroll(scroller());
  });
}

describe("DataTable virtualize, measured (audit 2026-10-30 TST-2; pins 0.51.7)", () => {
  it("measured heights replace the estimate, and the spacers follow", () => {
    render(<VTable />);
    // Before any frame: every row at the estimate.
    expect(spacerTotal() + rendered() * ESTIMATE).toBe(ROWS.length * ESTIMATE);
    flushFrames(2);
    // The rendered rows measured at 60, and a row never seen counts as their average.
    expect(spacerTotal() + rendered() * ROW_H).toBe(ROWS.length * ROW_H);
  });

  it("the header cells' widths are locked into the colgroup in the first frame", () => {
    render(<VTable />);
    expect(lockOf()).toEqual(["", ""]);
    flushFrames();
    expect(lockOf()).toEqual(["120px", "80px"]);
  });

  it("a wider cell widens its column once, and the lock keeps it after the cell has gone", () => {
    render(<VTable />);
    flushFrames();
    NATURAL.name = 150;
    scrollTo(100 * ROW_H);
    flushFrames();
    expect(lockOf()).toEqual(["150px", "80px"]);
    NATURAL.name = 120;
    scrollTo(0);
    flushFrames();
    expect(lockOf()).toEqual(["150px", "80px"]);
  });

  it("a column that grows the table past a scroller it fit in drops the lock, and the next frame measures afresh", () => {
    render(<VTable />);
    flushFrames();
    expect(lockOf()).toEqual(["120px", "80px"]);
    // 450 + 80 = 530 > 400: the table no longer fits the scroller it fit.
    NATURAL.name = 450;
    scrollTo(100 * ROW_H);
    flushFrames();
    expect(lockOf()).toEqual(["", ""]);
    flushFrames();
    expect(lockOf()).toEqual(["450px", "80px"]);
  });

  it("a narrower scroller unlocks at once, and re-measures from scratch — not at the widths it grew to", () => {
    render(<VTable />);
    flushFrames();
    NATURAL.name = 150;
    scrollTo(100 * ROW_H);
    flushFrames();
    expect(lockOf()).toEqual(["150px", "80px"]);
    NATURAL.name = 120;
    scrollerWidth = 300;
    act(() => ro.resize(scroller(), { width: 300, height: VIEW_H }));
    expect(lockOf()).toEqual(["", ""]);
    flushFrames();
    expect(lockOf()).toEqual(["120px", "80px"]);
  });
});

/**
 * The Columns panel's "Auto-size columns" (data-table-resize.ts `autoSizeAll`): the
 * widths are cleared, and the next frame pins each visible column at its header's width
 * there, rounded up — all but the last one, which takes what is left, and a `grow`
 * column, which takes the rest by design (b183b3a). Pinned as it is in 0.51.7 (TST-2).
 */
describe("DataTable Auto-size columns (audit 2026-10-30 TST-2; pins 0.51.7)", () => {
  it("pins every visible column at its header's width but the last and a grow column", () => {
    const WIDTHS: Record<string, number> = { name: 101.2, title: 300, id: 60.4, notes: 90 };
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const width = this.tagName === "TH" ? (WIDTHS[this.textContent?.trim() ?? ""] ?? 0) : 0;
      return rect(0, 0, width);
    });
    const columns: DataTableColumn<Row>[] = [
      { key: "name", header: "name", cell: (r) => r.name },
      { key: "title", header: "title", cell: (r) => r.name, grow: true },
      { key: "id", header: "id", cell: (r) => String(r.id) },
      { key: "notes", header: "notes", cell: () => "" },
    ];
    render(
      <MemoryRouter>
        <DataTable rows={ROWS.slice(0, 3)} columns={columns} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Columns (4/4)" }));
    fireEvent.click(screen.getByRole("button", { name: "Auto-size columns" }));
    flushFrames();
    const width = (key: string) =>
      [...table().querySelectorAll<HTMLElement>("thead th")].find((th) => th.textContent?.trim() === key)!.style.width;
    expect(width("name")).toBe("102px");
    expect(width("id")).toBe("61px");
    expect(width("title")).toBe("");
    expect(width("notes")).toBe("");
  });
});
