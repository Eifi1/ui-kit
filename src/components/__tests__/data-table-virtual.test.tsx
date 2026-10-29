import { useMemo, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableGroupBy } from "../data-table";
import { planBodies } from "../data-table-virtual";

/**
 * 0.48.2 (keksdose dev #632, Marcel: "The table is extremely slow. Is it virtualised…?"):
 * `virtualize` renders only the rows near the scroller's visible part, with spacer rows
 * for the rest. jsdom lays nothing out, so the geometry is a model: the scroller shows
 * 400px, the header is 40px, and every row counts as `estimateRowHeight` (40) — a row
 * measured at 0 is "not laid out" and keeps the estimate. Headless Chromium checked the
 * pixels (docs/adopt-0.48.md, "ui-kit 0.48.2").
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const ROW_H = 40;
const HEAD_H = 40;
const VIEW_H = 400;

const rect = (top: number, height: number) =>
  ({ top, bottom: top + height, height, left: 0, right: 800, width: 800, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

let scrollerOf: (el: Element) => HTMLElement | null = () => null;
beforeEach(() => {
  scrollerOf = (el) => (el.closest("table[data-virtualized]")?.parentElement as HTMLElement | null) ?? null;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this instanceof HTMLElement && this.querySelector(":scope > table[data-virtualized]")) return rect(0, VIEW_H);
    // The first windowed body starts under the header, moved up by the scroll.
    if (this.matches("tbody[data-vt-body]")) {
      const sc = scrollerOf(this);
      return rect(HEAD_H - (sc?.scrollTop ?? 0), 0);
    }
    return rect(0, 0);
  });
});
afterEach(() => vi.restoreAllMocks());

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "id", header: "Id", cell: (r) => String(r.id) },
];

function Harness({
  groupBy,
  virtualize = true,
  onToggleMany,
}: {
  groupBy?: [DataTableGroupBy<Row>, DataTableGroupBy<Row>];
  virtualize?: boolean;
  onToggleMany?: (rows: Row[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const cols = useMemo(() => columns, []);
  return (
    <MemoryRouter>
      <DataTable<Row>
        rows={ROWS}
        columns={cols}
        rowKey={(r) => r.id}
        paginated={false}
        virtualize={virtualize ? { estimateRowHeight: ROW_H, overscan: 5 } : false}
        groupBy={groupBy}
        onRowClick={(r) => setOpen((id) => (id === r.id ? null : r.id))}
        isExpanded={(r) => r.id === open}
        expandedRow={(r) => <input aria-label={`Note for ${r.name}`} defaultValue="" />}
        selection={{
          isSelected: (r) => selected.has(r.id),
          onToggle: (r, on) =>
            setSelected((s) => {
              const next = new Set(s);
              if (on) next.add(r.id);
              else next.delete(r.id);
              return next;
            }),
          onToggleMany: (rs, on) => {
            onToggleMany?.(rs);
            setSelected((s) => {
              const next = new Set(s);
              for (const r of rs) if (on) next.add(r.id);
              return next;
            });
          },
          allSelected: false,
          someSelected: selected.size > 0,
          onToggleAll: () => {},
        }}
      />
    </MemoryRouter>
  );
}

const table = () => screen.getByRole("table");
const scroller = () => table().parentElement as HTMLElement;
const renderedIndices = () =>
  [...table().querySelectorAll<HTMLElement>("tr[data-row-index]")].map((tr) => Number(tr.dataset.rowIndex));
const spacerTotal = () =>
  [...table().querySelectorAll<HTMLElement>("tr[data-vt-spacer] > td")].reduce(
    (sum, td) => sum + parseFloat(td.style.height || "0"),
    0,
  );
function scrollTo(y: number) {
  act(() => {
    scroller().scrollTop = y;
    fireEvent.scroll(scroller());
  });
}

describe("DataTable virtualize (0.48.2, keksdose dev #632)", () => {
  it("renders only about a viewport of rows out of 1000, and the spacers stand in for the rest", () => {
    render(<Harness />);
    const shown = renderedIndices();
    expect(shown.length).toBeGreaterThanOrEqual(VIEW_H / ROW_H);
    expect(shown.length).toBeLessThan(40);
    expect(shown[0]).toBe(0);
    // Every row is accounted for: the rendered ones and the spacers' heights.
    expect(spacerTotal() + shown.length * ROW_H).toBe(ROWS.length * ROW_H);
    expect(table().querySelectorAll("tr[data-vt-spacer]")[0]).toHaveAttribute("aria-hidden", "true");
  });

  it("without it, every row renders as before", () => {
    render(<Harness virtualize={false} />);
    expect(table().querySelectorAll("tbody tr").length).toBe(1000);
    expect(table()).not.toHaveAttribute("aria-rowcount");
  });

  it("scrolling renders the rows in view, and the spacers still add up", () => {
    render(<Harness />);
    scrollTo(500 * ROW_H);
    const shown = renderedIndices();
    for (let i = 500; i < 500 + VIEW_H / ROW_H - 1; i++) expect(shown).toContain(i);
    expect(shown).not.toContain(300);
    expect(shown).not.toContain(700);
    expect(spacerTotal() + shown.length * ROW_H).toBe(ROWS.length * ROW_H);
  });

  it("aria-rowcount counts every row; each rendered row has its aria-rowindex", () => {
    render(<Harness />);
    expect(table()).toHaveAttribute("aria-rowcount", "1001");
    expect(table().querySelector("thead tr")).toHaveAttribute("aria-rowindex", "1");
    scrollTo(500 * ROW_H);
    const row = table().querySelector('tr[data-row-index="503"]');
    expect(row).toHaveAttribute("aria-rowindex", "505");
  });

  it("End moves the focus to the LAST row, rendered first; ArrowUp then reaches the one above", () => {
    render(<Harness />);
    const first = table().querySelector<HTMLElement>('tr[data-row-index="0"]')!;
    act(() => first.focus());
    act(() => {
      fireEvent.keyDown(first, { key: "End" });
    });
    const last = document.activeElement as HTMLElement;
    expect(last.dataset.rowIndex).toBe("999");
    expect(last).toHaveAttribute("aria-rowindex", "1001");
    act(() => {
      fireEvent.keyDown(last, { key: "ArrowUp" });
    });
    expect((document.activeElement as HTMLElement).dataset.rowIndex).toBe("998");
    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: "Home" });
    });
    expect((document.activeElement as HTMLElement).dataset.rowIndex).toBe("0");
  });

  it("Shift+click selects every row between, the unrendered ones too", () => {
    const many = vi.fn();
    render(<Harness onToggleMany={many} />);
    const box = (i: number) =>
      table().querySelector<HTMLInputElement>(`tr[data-row-index="${i}"] input[type=checkbox]`)!;
    fireEvent.click(box(2));
    scrollTo(600 * ROW_H);
    expect(renderedIndices()).not.toContain(300);
    fireEvent.click(box(605), { shiftKey: true });
    expect(many).toHaveBeenCalledTimes(1);
    const ids = many.mock.calls[0][0].map((r: Row) => r.id);
    expect(ids.length).toBe(604);
    expect(ids[0]).toBe(2);
    expect(ids[ids.length - 1]).toBe(605);
  });

  it("an open row stays rendered — its editor keeps what was typed — while the rows scroll", () => {
    render(<Harness />);
    fireEvent.click(table().querySelector('tr[data-row-index="3"] td:nth-child(2)')!);
    const note = screen.getByLabelText("Note for Row 3") as HTMLInputElement;
    fireEvent.change(note, { target: { value: "half-typed" } });
    scrollTo(800 * ROW_H);
    expect(renderedIndices()).toContain(3);
    expect(renderedIndices()).toContain(805);
    expect((screen.getByLabelText("Note for Row 3") as HTMLInputElement).value).toBe("half-typed");
    expect(table().querySelector('tr[data-row-detail="3"]')).toHaveAttribute("aria-rowindex", "6");
    // The open row's detail row is counted.
    expect(table()).toHaveAttribute("aria-rowcount", "1002");
  });

  describe("grouped, two levels (period → day)", () => {
    // 10 periods of 100 rows, 10 days of 10 rows each.
    const period: DataTableGroupBy<Row> = { key: (r) => `P${Math.floor(r.id / 100)}` };
    const day: DataTableGroupBy<Row> = { key: (r) => `D${Math.floor(r.id / 10)}` };
    const BAND1 = ROW_H;
    const BAND2 = ROW_H * 0.8;

    it("keeps the bands of the period and day the window starts in; the spacers add up", () => {
      render(<Harness groupBy={[period, day]} />);
      // Row r's top: r rows, (period+1) period bands and (day+1) day bands above it.
      const top = (r: number) => r * ROW_H + (Math.floor(r / 100) + 1) * BAND1 + (Math.floor(r / 10) + 1) * BAND2;
      scrollTo(top(555));
      const shown = renderedIndices();
      expect(shown).toContain(555);
      expect(shown).not.toContain(450);
      const bands = [...table().querySelectorAll("th[data-group-band]")].map((th) => th.textContent);
      // P5's band opens the period's first day (rows 500–509), D55 the window's day.
      expect(bands).toContain("P5");
      expect(bands).toContain("D55");
      expect(bands).not.toContain("P3");
      const b1 = table().querySelectorAll("th[data-group-band='1']").length;
      const b2 = table().querySelectorAll("th[data-group-band='2']").length;
      expect(spacerTotal() + shown.length * ROW_H + b1 * BAND1 + b2 * BAND2).toBeCloseTo(
        1000 * ROW_H + 10 * BAND1 + 100 * BAND2,
        3,
      );
      // header 1, then per period its band, per day its band, then the rows.
      expect(table()).toHaveAttribute("aria-rowcount", String(1 + 10 + 100 + 1000));
      expect(table().querySelector('tr[data-row-index="555"]')).toHaveAttribute(
        "aria-rowindex",
        String(1 + 6 + 56 + 556),
      );
    });
  });
});

describe("planBodies", () => {
  it("collapses the groups with nothing rendered into one spacer each run", () => {
    const tops = new Float64Array([10, 20, 40, 50, 60]);
    const h = new Float64Array([10, 10, 10, 10, 0]);
    const gTop = new Float64Array([0, 30, 60]);
    const groups = [
      { start: 0, end: 2, bands: [1] as const, first: 0 },
      { start: 2, end: 4, bands: [1] as const, first: 1 },
    ];
    const bodies = planBodies({ n: 4, tops, h, gTop }, groups, 2, 3, []);
    expect(bodies).toEqual([
      { kind: "spacer", key: "vs:0", height: 30 },
      {
        kind: "group",
        group: 1,
        items: [
          { kind: "row", index: 2 },
          { kind: "gap", key: "gap:end:1", height: 10 },
        ],
      },
    ]);
  });
});

describe("useColumnFit measures only when what is drawn changed (0.48.2)", () => {
  it("a ticked box forces no layout of the table", () => {
    let tableReads = 0;
    const restore: (() => void)[] = [];
    const stub = (name: string, get: (this: HTMLElement) => number) => {
      const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);
      Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get });
      restore.push(() => {
        if (before) Object.defineProperty(HTMLElement.prototype, name, before);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
      });
    };
    stub("clientWidth", function () {
      return this.hasAttribute("data-clips") ? 1000 : 0;
    });
    stub("offsetWidth", function () {
      if (this.tagName === "TABLE") tableReads++;
      return this.tagName === "TABLE" ? 600 : 100;
    });
    try {
      function Fit() {
        const [selected, setSelected] = useState<Set<number>>(new Set());
        const cols = useMemo<DataTableColumn<Row>[]>(
          () => [...columns, { key: "extra", header: "Extra", cell: () => "x", fitPriority: 1 }],
          [],
        );
        const rows = useMemo(() => ROWS.slice(0, 5), []);
        return (
          <MemoryRouter>
            <DataTable<Row>
              rows={rows}
              columns={cols}
              rowKey={(r) => r.id}
              paginated={false}
              selection={{
                isSelected: (r) => selected.has(r.id),
                onToggle: (r) => setSelected((s) => new Set(s).add(r.id)),
                allSelected: false,
                someSelected: selected.size > 0,
                onToggleAll: () => {},
              }}
            />
          </MemoryRouter>
        );
      }
      render(<Fit />);
      expect(tableReads).toBeGreaterThan(0);
      tableReads = 0;
      fireEvent.click(screen.getAllByRole("checkbox", { name: /select row/i })[1]);
      expect((screen.getAllByRole("checkbox", { name: /select row/i })[1] as HTMLInputElement).checked).toBe(true);
      expect(tableReads).toBe(0);
    } finally {
      while (restore.length) restore.pop()!();
    }
  });
});
