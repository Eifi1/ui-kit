import { Profiler } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { GROW_PEER_CELL_CLASS, fitHideOrder } from "../data-table-fit";
import { feedbackColumns } from "../../feedback/feedback-table";
import { stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";

/**
 * 0.48 (keksdose live #451, "Compute the width selectively"): a `grow` column takes the
 * rest of the row and ellipsises; `fitPriority` columns are left out while the TABLE's
 * scroller is too narrow, lowest first, and come back in reverse; the Columns panel counts
 * what is drawn and marks those "hidden for width". jsdom lays nothing out, so the widths
 * below are a model of the auto layout (a `grow` column takes what the others leave);
 * headless Chromium checked the pixels (docs/archive/adopt/adopt-0.48.md).
 */

interface Row {
  id: number;
  title: string;
}
const ROWS: Row[] = [{ id: 1, title: "A very long subject ".repeat(20) }];

// Natural widths of the non-grow columns, px.
const WIDTH: Record<string, number> = { id: 60, title: 300, url: 200, email: 180, status: 220, resolved: 120 };
// What a column costs the table beyond its header's own width once drawn (keksdose B2:
// under `virtualize`'s locked widths a 40px header cost the table ≈ 45). None by default.
const EXTRA: Record<string, number> = {};
let avail = 2000;

function col(key: string, extra: Partial<DataTableColumn<Row>> = {}): DataTableColumn<Row> {
  return { key, header: key, cell: (r) => (key === "title" ? r.title : `${key}${r.id}`), ...extra };
}

const FIT: DataTableColumn<Row>[] = [
  col("id"),
  col("title", { grow: true }),
  col("url", { fitPriority: 1 }),
  col("email", { fitPriority: 2 }),
  col("status"),
  col("resolved", { fitPriority: 3 }),
];

const restore: (() => void)[] = [];
function stubGetter(proto: object, name: string, get: (this: HTMLElement) => number) {
  const before = Object.getOwnPropertyDescriptor(proto, name);
  Object.defineProperty(proto, name, { configurable: true, get });
  restore.push(() => {
    if (before) Object.defineProperty(proto, name, before);
    else delete (proto as Record<string, unknown>)[name];
  });
}

/** A header's column: its text (the headers below are their keys; the `<th>` has no `data-col`). */
const key = (th: HTMLElement) => th.textContent?.trim() ?? "";

/** The widths of the table's own `<th>`s, the `grow` one taking the rest (≥ 24px). */
function layout(table: HTMLElement) {
  const ths = [...table.querySelectorAll<HTMLElement>("thead th")];
  const growTh = ths.find((th) => th.className.includes("w-full"));
  const others = ths
    .filter((th) => th !== growTh)
    .reduce((sum, th) => sum + (WIDTH[key(th)] ?? 50) + (EXTRA[key(th)] ?? 0), 0);
  // `w-full`: the table is at least the scroller's width; `min-content` (the fit's own
  // probe of what a table without a `grow` column needs) is its content's width.
  if (!growTh) return { table: table.style.width === "min-content" ? others : Math.max(avail, others), grow: 0 };
  // `min-w-[10rem]` on the grow header: the column's floor (Kurvenschmiede S1); a
  // column's own `growMin` (0.51.4) as an inline min-width over it.
  const floor = growTh.style.minWidth
    ? parseFloat(growTh.style.minWidth) * 16
    : growTh.className.includes("min-w-[10rem]")
      ? 160
      : 24;
  const grow = Math.max(avail - others, floor);
  return { table: others + grow, grow, growTh };
}

let ro: ResizeObserverStub;
/** How often the fit laid the whole table out: each read of the table's own width is one. */
let tableLayouts = 0;
beforeEach(() => {
  avail = 2000;
  tableLayouts = 0;
  ro = stubResizeObserver();
  stubGetter(HTMLElement.prototype, "clientWidth", function () {
    return this.hasAttribute("data-clips") ? avail : 0;
  });
  stubGetter(HTMLElement.prototype, "offsetWidth", function () {
    if (this.tagName === "TABLE") {
      tableLayouts++;
      return layout(this).table;
    }
    if (this.tagName === "TH" && this.closest("thead")) {
      const l = layout(this.closest("table") as HTMLElement);
      return l.growTh === this ? l.grow : (WIDTH[key(this)] ?? 50);
    }
    return 0;
  });
});
afterEach(() => {
  ro.restore();
  while (restore.length) restore.pop()!();
  for (const k of Object.keys(EXTRA)) delete EXTRA[k];
});

function renderTable(columns: DataTableColumn<Row>[] = FIT, storageKey?: string) {
  render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={columns} rowKey={(r) => r.id} storageKey={storageKey} />
    </MemoryRouter>,
  );
  const table = screen.getByRole("table");
  const scroller = table.closest("[data-clips]") as HTMLElement;
  return { table, scroller };
}

const heads = (table: HTMLElement) => [...table.querySelectorAll<HTMLElement>("thead th")].map(key);

function setWidth(scroller: HTMLElement, width: number) {
  avail = width;
  act(() => ro.resize(scroller, { width, height: 400 }));
}

describe("DataTable fit (0.48, keksdose live #451)", () => {
  it("a `grow` column's header and cells take the rest and ellipsise; others are untouched", () => {
    const { table } = renderTable();
    const th = [...table.querySelectorAll<HTMLElement>("thead th")].find((h) => key(h) === "title")!;
    const td = table.querySelector('tbody td[data-col="title"]')!;
    expect(th).toHaveClass("w-full", "max-w-0");
    expect(td).toHaveClass("w-full", "max-w-0", "truncate-until-large");
    expect(table.querySelector('tbody td[data-col="id"]')).not.toHaveClass("w-full");
  });

  it("with a `grow` column the OTHER cells keep one line at Normal (kastlan S2)", () => {
    // A `w-full max-w-0` column squeezes the others to their min-content width, so any
    // text with a space ("CHF 2'568.38", "Peter Mueller") broke in two even at 1920px.
    const { table } = renderTable(FIT.map((c) => (c.key === "status" ? { ...c, footer: () => "total" } : c)));
    expect(table).toHaveAttribute("data-fit-grow");
    for (const k of ["id", "url", "email", "status", "resolved"]) {
      expect(table.querySelector(`tbody td[data-col="${k}"]`)).toHaveClass(GROW_PEER_CELL_CLASS);
      expect(table.querySelector(`tfoot [data-col="${k}"]`)).toHaveClass(GROW_PEER_CELL_CLASS);
    }
    // Large text keeps its wrapping: the rule is Normal-only.
    expect(GROW_PEER_CELL_CLASS).toBe("not-large:whitespace-nowrap");
    expect(table.querySelector('tbody td[data-col="title"]')).not.toHaveClass(GROW_PEER_CELL_CLASS);
    // A column that wants its prose to wrap says so, and its word wins.
    cleanup();
    const { table: own } = renderTable(
      FIT.map((c) => (c.key === "email" ? { ...c, className: "not-large:whitespace-normal" } : c)),
    );
    const email = own.querySelector('tbody td[data-col="email"]')!;
    expect(email).toHaveClass("not-large:whitespace-normal");
    expect(email).not.toHaveClass(GROW_PEER_CELL_CLASS);
  });

  it("keeps the `grow` column at 10rem once nothing is left to leave out: it scrolls instead (Kurvenschmiede S1)", () => {
    const { table, scroller } = renderTable();
    const th = [...table.querySelectorAll<HTMLElement>("thead th")].find((h) => key(h) === "title")!;
    expect(th).toHaveClass("min-w-[10rem]");
    // 300: every candidate out, id + status (280) + 160 for Subject = 440 > 300.
    setWidth(scroller, 300);
    expect(heads(table)).toEqual(["id", "title", "status"]);
    expect(th.offsetWidth).toBe(160);
    expect(table.offsetWidth).toBeGreaterThan(300);
  });

  it("0.51.4: a column's own `growMin` lowers its floor, for the fit and for the scroll", () => {
    const columns = FIT.map((c) => (c.key === "title" ? { ...c, growMin: 8 } : c));
    // 920: the default floor needs 780 + 160 = 940 and would leave URL out; 8rem needs 908.
    avail = 920;
    const { table, scroller } = renderTable(columns);
    expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
    const th = [...table.querySelectorAll<HTMLElement>("thead th")].find((h) => key(h) === "title")!;
    expect(th.style.minWidth).toBe("8rem");
    // Nothing left to leave out: Subject holds 8rem, and the table scrolls past that.
    setWidth(scroller, 300);
    expect(heads(table)).toEqual(["id", "title", "status"]);
    expect(th.offsetWidth).toBe(128);
  });

  it("is opt-in: without `grow`/`fitPriority` nothing is classed or left out", () => {
    avail = 500;
    const { table } = renderTable(FIT.map((c) => ({ ...c, grow: undefined, fitPriority: undefined })));
    expect(table.querySelector(".max-w-0")).toBeNull();
    expect(table).not.toHaveAttribute("data-fit-grow");
    expect(table.querySelector(".not-large\\:whitespace-nowrap")).toBeNull();
    expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
    expect(screen.getByRole("button", { name: "Columns (6/6)" })).toBeInTheDocument();
  });

  it("leaves out the lowest priority first while the table is too narrow, and counts honestly", () => {
    // Others 780 + 10rem (160) for Subject = 940: room for all six.
    const { table, scroller } = renderTable();
    expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
    // 900: short by 40 → URL (200) goes.
    setWidth(scroller, 900);
    expect(heads(table)).toEqual(["id", "title", "email", "status", "resolved"]);
    expect(screen.getByRole("button", { name: "Columns (5/6)" })).toBeInTheDocument();
    // 500: needs 740 → Email (180) goes, still 560 → Resolved (120) goes too, in that order.
    setWidth(scroller, 500);
    expect(heads(table)).toEqual(["id", "title", "status"]);
    expect(screen.getByRole("button", { name: "Columns (3/6)" })).toBeInTheDocument();
  });

  it("brings them back in reverse order once the scroller is as wide as they needed", () => {
    avail = 500;
    const { table, scroller } = renderTable();
    expect(heads(table)).toEqual(["id", "title", "status"]);
    setWidth(scroller, 600); // Resolved needs 440 + 120 = 560 → back; Email 560 + 180 = 740
    expect(heads(table)).toContain("resolved");
    expect(heads(table)).not.toContain("email");
    setWidth(scroller, 1000); // URL: 740 + 200 = 940
    expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
  });

  it("brings a column back as soon as it fits again, when the CONTENT narrowed (keksdose S3)", () => {
    // 900: URL left out when the table needed 940. Then a filter drops the long status
    // (220 → 80): the rest needs 600, URL's 200 fits in 900 — it must not wait for the
    // scroller to reach the 940 it needed back then.
    avail = 900;
    const { table, scroller } = renderTable();
    expect(heads(table)).not.toContain("url");
    const before = WIDTH.status;
    WIDTH.status = 80;
    try {
      setWidth(scroller, 900);
      expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
    } finally {
      WIDTH.status = before;
    }
  });

  describe("a table that widens after it was measured (0.51.2, keksdose's register)", () => {
    // Under `virtualize` the rows actually drawn are the window's, set a frame after the
    // render that measured, and the column-width lock lands later still; neither changes
    // the rows the fit watches, and the scroller keeps its size. A load measured before its
    // rows were in kept every `fitPriority` column and overflowed for good. Modelled here:
    // the status cells widen after the first measure, with nothing else changing.
    const widen = (table: HTMLElement) => {
      EXTRA.status = 1500;
      act(() => ro.resize(table, { width: layout(table).table, height: 400 }));
    };

    it("is measured again and leaves columns out until it fits", () => {
      const { table, scroller } = renderTable();
      expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
      widen(table);
      expect(heads(table)).toEqual(["id", "title", "status"]);
      expect(table.offsetWidth).toBeLessThanOrEqual(scroller.clientWidth);
    });

    it("a report of the width it already had changes nothing (its height moves with every row)", () => {
      const { table } = renderTable();
      act(() => ro.resize(table, { width: table.offsetWidth, height: 9000 }));
      expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
    });
  });

  describe("a column that costs more drawn than its header measured (keksdose B2, 0.48.3)", () => {
    // Drawn, Resolved costs its header (120) + 5, as a 40px header cost ≈ 45 under
    // `virtualize`'s locked widths. At 562, with URL and Email out, the table needs 440
    // without it: 440 + 120 ≤ 562 brings it back, drawn it needs 565 and goes again, with
    // the same 120 recorded. 0.48.2 repeated that until React's update limit (#185).
    function renderCounted() {
      let commits = 0;
      render(
        <MemoryRouter>
          <Profiler id="fit" onRender={() => commits++}>
            <DataTable rows={ROWS} columns={FIT} rowKey={(r) => r.id} />
          </Profiler>
        </MemoryRouter>,
      );
      const table = screen.getByRole("table");
      const scroller = table.closest("[data-clips]") as HTMLElement;
      return { table, scroller, commits: () => commits };
    }

    it("stays out after one invisible flip: renders bounded, no update-depth error", () => {
      EXTRA.resolved = 5;
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const { table, scroller, commits } = renderCounted();
        expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
        const before = commits();
        expect(() => setWidth(scroller, 562)).not.toThrow();
        expect(heads(table)).toEqual(["id", "title", "status"]);
        // Three out, Resolved back, out again: three commits, then stable.
        expect(commits() - before).toBeLessThanOrEqual(4);
        // The same width measured again: no second flip.
        const settled = commits();
        setWidth(scroller, 562);
        expect(commits()).toBe(settled);
        expect(heads(table)).toEqual(["id", "title", "status"]);
        expect(errors.mock.calls.flat().map(String).join("\n")).not.toMatch(/Maximum update depth/);
      } finally {
        errors.mockRestore();
      }
    });

    it("comes back once the scroller is wider than at the flip", () => {
      EXTRA.resolved = 5;
      const { table, scroller } = renderCounted();
      setWidth(scroller, 562);
      expect(heads(table)).not.toContain("resolved");
      // 563: more room, so it is tried once more, and out again (one flip, no loop).
      expect(() => setWidth(scroller, 563)).not.toThrow();
      expect(heads(table)).not.toContain("resolved");
      // 566: 440 + 125 drawn fits.
      setWidth(scroller, 566);
      expect(heads(table)).toEqual(["id", "title", "status", "resolved"]);
      // Narrower again: out, and at 562 stuck as before rather than looping.
      setWidth(scroller, 562);
      expect(heads(table)).toEqual(["id", "title", "status"]);
    });

    it("comes back when the CONTENT leaves it more room than at the flip (keksdose S3)", () => {
      EXTRA.resolved = 5;
      const { table, scroller } = renderCounted();
      setWidth(scroller, 562);
      expect(heads(table)).not.toContain("resolved");
      // A filter narrows Status (220 → 200): 420 + 125 fits 562, at the same width.
      const before = WIDTH.status;
      WIDTH.status = 200;
      try {
        setWidth(scroller, 562);
        expect(heads(table)).toEqual(["id", "title", "status", "resolved"]);
      } finally {
        WIDTH.status = before;
      }
    });
  });

  it("without a `grow` column: leaves out while the content is wider, and brings back on narrower content", () => {
    const plain = FIT.map((c) => ({ ...c, grow: undefined }));
    // Content 1080: 900 is short by 180 → URL (200) goes.
    avail = 900;
    const { table, scroller } = renderTable(plain);
    expect(heads(table)).toEqual(["id", "title", "email", "status", "resolved"]);
    // Wider scroller, still short: stays out.
    setWidth(scroller, 1000);
    expect(heads(table)).not.toContain("url");
    // Content narrows (status 220 → 80): 740 + 200 fits 1000.
    const before = WIDTH.status;
    WIDTH.status = 80;
    try {
      setWidth(scroller, 1000);
      expect(heads(table)).toContain("url");
    } finally {
      WIDTH.status = before;
    }
  });

  it("a `grow` column ignores a stored width and has no resize handle (KS N2)", () => {
    // A Subject width stored before 0.48 ("Auto-size columns" or a drag on 0.47).
    localStorage.setItem("hbui-table:fit-n2", JSON.stringify({ widths: { title: 300, status: 240 } }));
    try {
      const { table } = renderTable(FIT, "fit-n2");
      const th = (k: string) => [...table.querySelectorAll<HTMLElement>("thead th")].find((h) => key(h) === k)!;
      expect(th("title").style.width).toBe("");
      expect(table.querySelector<HTMLElement>('tbody td[data-col="title"]')!.style.width).toBe("");
      expect(th("title").querySelector('[role="separator"]')).toBeNull();
      // The other columns keep theirs, and their handles.
      expect(th("status").style.width).toBe("240px");
      expect(th("status").querySelector('[role="separator"]')).not.toBeNull();
    } finally {
      localStorage.removeItem("hbui-table:fit-n2");
    }
  });

  it("marks the left-out columns 'hidden for width' in the panel; a tick keeps one in", () => {
    avail = 900;
    const { table } = renderTable();
    const url = screen.getByRole("checkbox", { name: /url/ });
    expect(url).not.toBeChecked();
    expect(url.closest("label")).toHaveTextContent("hidden for width");
    expect(screen.getByRole("checkbox", { name: /email/ }).closest("label")).not.toHaveTextContent("hidden for width");
    // The user ticks it: drawn whatever the width — the table makes room by leaving out
    // the next one (Email), and would scroll once nothing is left to leave out.
    fireEvent.click(url);
    expect(heads(table)).toContain("url");
    expect(heads(table)).not.toContain("email");
    expect(url).toBeChecked();
    expect(url.closest("label")).not.toHaveTextContent("hidden for width");
    expect(screen.getByRole("checkbox", { name: /email/ }).closest("label")).toHaveTextContent("hidden for width");
    // Unticked, it is the user's hidden column, not one hidden for width.
    fireEvent.click(url);
    expect(heads(table)).not.toContain("url");
    expect(url.closest("label")).not.toHaveTextContent("hidden for width");
  });

  it("hide order: lowest number first, the later column first on a tie", () => {
    const order = fitHideOrder([
      col("a", { fitPriority: 2 }),
      col("b"),
      col("c", { fitPriority: 1 }),
      col("d", { fitPriority: 2 }),
    ]).map((c) => c.key);
    expect(order).toEqual(["c", "d", "a"]);
  });
});

/**
 * The fit is meant to measure only when what it fits changed (0.48.2), but its gate
 * compared the page's rows by identity, and a paginated table cut a fresh
 * `sorted.slice(…)` on every render; inline `columns={…}` defeated the columns item the
 * same way. So every render of a table with a `fitPriority` column — a ticked box, a
 * keystroke in a filter, any parent render — laid the whole table out (refactor audit
 * 2026-10-30, DSP-19). The slice is memoised now and the columns are compared by key.
 */
describe("the fit measures only when what it fits changed (audit 2026-10-30 DSP-19)", () => {
  const ui = (columns: DataTableColumn<Row>[], selected: boolean) => (
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        selection={{
          isSelected: () => selected,
          onToggle: () => {},
          allSelected: selected,
          someSelected: selected,
          onToggleAll: () => {},
        }}
      />
    </MemoryRouter>
  );

  it("a parent's render with the same columns written inline lays nothing out", () => {
    const { rerender } = render(
      ui(
        FIT.map((c) => ({ ...c })),
        false,
      ),
    );
    expect(tableLayouts).toBeGreaterThan(0);
    tableLayouts = 0;
    rerender(
      ui(
        FIT.map((c) => ({ ...c })),
        false,
      ),
    );
    expect(tableLayouts).toBe(0);
  });

  it("a ticked box lays nothing out", () => {
    const { rerender } = render(ui(FIT, false));
    tableLayouts = 0;
    rerender(ui(FIT, true));
    expect(tableLayouts).toBe(0);
  });

  it("a column added (a new key) is measured", () => {
    const { rerender } = render(ui(FIT, false));
    tableLayouts = 0;
    rerender(ui([...FIT, col("extra")], false));
    expect(tableLayouts).toBeGreaterThan(0);
  });
});

/**
 * 0.52 code review, data-table.tsx: DSP-19 keyed the fit on the columns' KEYS, so what it
 * measures could change under the same keys and nothing re-measured. A locale switch,
 * German to English, shortened the headers, and the `fitPriority` columns German had no
 * room for stayed out on a table with room to spare (a narrower table changes no width
 * the fit watches: a `w-full` table is the scroller's width either way). The drawn
 * headers' text, a column's `growMin` and the locale are what it fits now, besides.
 */
describe("the fit measures again when what it fits changed under the same keys (0.52 code review)", () => {
  const STATUS: Record<string, string> = { de: "Bearbeitungsstatus", en: "status" };
  const columnsIn = (lang: string, growMin?: number) =>
    FIT.map((c) =>
      c.key === "status" ? { ...c, header: STATUS[lang] } : c.key === "title" && growMin ? { ...c, growMin } : c,
    );
  const ui = (columns: DataTableColumn<Row>[], locale: string) => (
    <MemoryRouter>
      <DataTable rows={ROWS} columns={columns} rowKey={(r) => r.id} locale={locale} />
    </MemoryRouter>
  );
  beforeEach(() => {
    WIDTH[STATUS.de] = 420;
  });
  afterEach(() => {
    delete WIDTH[STATUS.de];
  });

  it("German → English: the shorter headers bring back the column German left out", () => {
    // 1000: German needs 980 + 160 = 1140 → URL (200) goes; English needs 780 + 160 = 940.
    avail = 1000;
    const { rerender } = render(ui(columnsIn("de"), "de-DE"));
    const table = screen.getByRole("table");
    expect(heads(table)).toEqual(["id", "title", "email", STATUS.de, "resolved"]);
    rerender(ui(columnsIn("en"), "en-US"));
    expect(heads(table)).toEqual(["id", "title", "url", "email", "status", "resolved"]);
  });

  it("a header's text alone (an app's own translation, the kit's locale kept)", () => {
    avail = 1000;
    const { rerender } = render(ui(columnsIn("de"), "de-DE"));
    rerender(ui(columnsIn("en"), "de-DE"));
    expect(heads(screen.getByRole("table"))).toContain("url");
  });

  it("a column's `growMin` alone", () => {
    // 920: 10rem needs 780 + 160 = 940 → URL goes; 8rem needs 908.
    avail = 920;
    const { rerender } = render(ui(columnsIn("en"), "en-US"));
    const table = screen.getByRole("table");
    expect(heads(table)).not.toContain("url");
    rerender(ui(columnsIn("en", 8), "en-US"));
    expect(heads(table)).toContain("url");
  });

  it("the locale alone: the cells' dates and numbers follow it", () => {
    const { rerender } = render(ui(columnsIn("en"), "en-US"));
    tableLayouts = 0;
    rerender(ui(columnsIn("en"), "en-GB"));
    expect(tableLayouts).toBeGreaterThan(0);
  });

  it("an inline columns array with the same headers still lays nothing out (DSP-19)", () => {
    const { rerender } = render(ui(columnsIn("en"), "en-US"));
    tableLayouts = 0;
    rerender(ui(columnsIn("en"), "en-US"));
    expect(tableLayouts).toBe(0);
  });
});

describe("the kit's feedback columns adopt it (0.48)", () => {
  it("Subject grows; URL, Email, Resolved go first, in that order", () => {
    const cols = feedbackColumns({
      canEdit: true,
      onStatus: () => {},
      renderDate: (v) => v ?? "",
      labels: new Proxy({}, { get: () => "x" }) as never,
      statusLabels: new Proxy({}, { get: () => "x" }) as never,
      categoryLabels: new Proxy({}, { get: () => "x" }) as never,
    });
    expect(cols.find((c) => c.key === "title")?.grow).toBe(true);
    // 0.51.4 (Kurvenschmiede): then User, Date and #, the number last.
    expect(fitHideOrder(cols).map((c) => c.key)).toEqual([
      "url",
      "email",
      "resolved",
      "category",
      "user",
      "date",
      "id",
    ]);
  });

  it("then Votes and Category, before Subject would drop below 10rem (Kurvenschmiede S1)", () => {
    const cols = feedbackColumns({
      canEdit: true,
      onStatus: () => {},
      renderDate: (v) => v ?? "",
      labels: new Proxy({}, { get: () => "x" }) as never,
      statusLabels: new Proxy({}, { get: () => "x" }) as never,
      categoryLabels: new Proxy({}, { get: () => "x" }) as never,
      votes: true,
    });
    expect(fitHideOrder(cols).map((c) => c.key)).toEqual([
      "url",
      "email",
      "resolved",
      "votes",
      "category",
      "user",
      "date",
      "id",
    ]);
  });
});
