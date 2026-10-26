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
 * headless Chromium checked the pixels (docs/adopt-0.48.md).
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

/** The width `virtualize` locked for a header's column in its `<colgroup>`, 0 without one.
 *  In an auto table layout a `<col>`'s width is the column's least: it is drawn at the
 *  wider of that and its content. */
function lockedWidth(th: HTMLElement): number {
  const cols = th.closest("table")?.querySelectorAll<HTMLElement>(":scope > colgroup > col");
  const col = cols?.[(th as HTMLTableCellElement).cellIndex];
  return col ? parseFloat(col.style.width) || 0 : 0;
}

/** A non-grow header's width as drawn: its content's, or its locked width. */
const headWidth = (th: HTMLElement) => Math.max(WIDTH[key(th)] ?? 50, lockedWidth(th));

/** The widths of the table's own `<th>`s, the `grow` one taking the rest (≥ 24px). */
function layout(table: HTMLElement) {
  const ths = [...table.querySelectorAll<HTMLElement>("thead th")];
  const growTh = ths.find((th) => th.className.includes("w-full"));
  const others = ths
    .filter((th) => th !== growTh)
    .reduce((sum, th) => sum + headWidth(th) + (EXTRA[key(th)] ?? 0), 0);
  // `w-full`: the table is at least the scroller's width; `min-content` (the fit's own
  // probe of what a table without a `grow` column needs) is its content's width.
  if (!growTh) return { table: table.style.width === "min-content" ? others : Math.max(avail, others), grow: 0 };
  // `min-w-[10rem]` on the grow header: the column's floor (Kurvenschmiede S1).
  const grow = Math.max(avail - others, growTh.className.includes("min-w-[10rem]") ? 160 : 24);
  return { table: others + grow, grow, growTh };
}

let ro: ResizeObserverStub;
beforeEach(() => {
  avail = 2000;
  ro = stubResizeObserver();
  stubGetter(HTMLElement.prototype, "clientWidth", function () {
    return this.hasAttribute("data-clips") ? avail : 0;
  });
  stubGetter(HTMLElement.prototype, "offsetWidth", function () {
    if (this.tagName === "TABLE") return layout(this).table;
    if (this.tagName === "TH" && this.closest("thead")) {
      const l = layout(this.closest("table") as HTMLElement);
      return l.growTh === this ? l.grow : headWidth(this);
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

const heads = (table: HTMLElement) =>
  [...table.querySelectorAll<HTMLElement>("thead th")].map(key);

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
    const { table } = renderTable(
      FIT.map((c) => (c.key === "status" ? { ...c, footer: () => "total" } : c)),
    );
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
 * keksdose N2 (0.49 review 3): with `virtualize`, a `fitPriority` column brought back was
 * estimated at 606 + 93 = 699 ≤ 757 but drawn needed 778–812. Hidden, the table is measured
 * afresh (the lock's signature names the columns, so it has none); shown again within the
 * same frame — before `virtualize` measured anything — the signature was the one the lock
 * was taken under, so the table came back at the widths that had ratcheted up while rows
 * scrolled, not the ones the fit had just measured. B2's guard then kept the column out
 * although it fitted. Modelled here: Account ratchets 300 → 350 while a wide cell is in view
 * and goes back to 300 when it leaves; then a refetch (same rows, a wider Amount) has the
 * fit measure the ratcheted table, 759 > 757.
 */
describe("under `virtualize`, a column brought back is drawn as the fit measured it (keksdose N2, 0.51)", () => {
  const VCOLS: DataTableColumn<Row>[] = [
    col("acct"),
    col("title", { grow: true }),
    col("amount"),
    col("state", { fitPriority: 1 }),
  ];
  const NATURAL = { acct: 300, amount: 146, state: 93 };
  let frames: FrameRequestCallback[] = [];
  const flushFrames = () =>
    act(() => {
      const run = frames;
      frames = [];
      for (const cb of run) cb(0);
    });

  beforeEach(() => {
    Object.assign(WIDTH, NATURAL);
    frames = [];
    // `virtualize` measures in the next animation frame: the test decides when one runs.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    // Its lock reads the header cells' and the table's rects: the same model.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
      const sized = this instanceof HTMLElement && (this.tagName === "TABLE" || (this.tagName === "TH" && this.closest("thead")));
      const width = sized ? (this as HTMLElement).offsetWidth : 0;
      return { top: 0, left: 0, bottom: 0, right: width, width, height: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
  });
  afterEach(() => {
    for (const k of Object.keys(NATURAL)) delete WIDTH[k];
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const lockOf = (table: HTMLElement) =>
    [...table.querySelectorAll<HTMLElement>(":scope > colgroup > col")].map((c) => c.style.width);

  it("comes back at the widths measured with it, not the ones its last showing ratcheted up to", () => {
    avail = 757;
    const rows = [...ROWS];
    const ui = (r: Row[]) => (
      <MemoryRouter>
        <DataTable rows={r} columns={VCOLS} rowKey={(x) => x.id} virtualize paginated={false} />
      </MemoryRouter>
    );
    const { rerender } = render(ui(rows));
    const table = screen.getByRole("table");
    // 300 + 146 + 93 + Title's 10rem = 699 ≤ 757: all in; the first frame locks the widths.
    flushFrames();
    flushFrames();
    expect(heads(table)).toEqual(["acct", "title", "amount", "state"]);
    expect(lockOf(table)).toEqual(["300px", "", "146px", "93px"]);

    // A wider Account cell in view (a scroll; here the focus moving to a row asks the same
    // measure): its column grows once, and keeps that width after the cell has gone.
    WIDTH.acct = 350;
    fireEvent.focusIn(table.querySelector("tr[data-row-index='0']")!);
    flushFrames();
    expect(lockOf(table)[0]).toBe("350px");
    WIDTH.acct = 300;

    // A refetch: the same rows, Amount 10px wider. Drawn as locked the table needs
    // 350 + 156 + 93 + 160 = 759 > 757, so State leaves; measured afresh without it the
    // table needs 616, and 616 + 93 ≤ 757 brings it back. Drawn as measured, it needs
    // 300 + 156 + 93 + 160 = 709: it stays.
    WIDTH.amount = 156;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    rerender(ui([...rows]));
    expect(errors.mock.calls.flat().map(String).join("\n")).not.toMatch(/Maximum update depth/);
    expect(heads(table)).toEqual(["acct", "title", "amount", "state"]);
    // The next frame locks what is drawn now: Account at 300, not the 350 it once was.
    flushFrames();
    flushFrames();
    expect(heads(table)).toEqual(["acct", "title", "amount", "state"]);
    expect(lockOf(table)).toEqual(["300px", "", "156px", "93px"]);
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
    expect(fitHideOrder(cols).map((c) => c.key)).toEqual(["url", "email", "resolved", "category"]);
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
    expect(fitHideOrder(cols).map((c) => c.key)).toEqual(["url", "email", "resolved", "votes", "category"]);
  });
});
