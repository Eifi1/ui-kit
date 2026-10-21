import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  const others = ths.filter((th) => th !== growTh).reduce((sum, th) => sum + (WIDTH[key(th)] ?? 50), 0);
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
      return l.growTh === this ? l.grow : (WIDTH[key(this)] ?? 50);
    }
    return 0;
  });
});
afterEach(() => {
  ro.restore();
  while (restore.length) restore.pop()!();
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
