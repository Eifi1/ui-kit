import { createRef } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppShell, type AppShellNavItem } from "../app-shell";
import { FILL_HEIGHT_CLASS, FillHeight } from "../fill-height";
import { DataTable, type DataTableColumn } from "../../components/data-table";
import { stubPhone } from "../../test/viewport";

/**
 * The list page fills the window (0.40, docs/page-layout-harmonization.md §1.3).
 *
 * jsdom lays nothing out, so these pin the CLASSES and the MARKER that carry the fill,
 * not measured boxes: the table marks itself under `fillHeight` only; `<main>` is a flex
 * column from `md` only while a marked table is inside; `FillHeight` is that column on
 * the way down; and the body's floor (`basis-48`) is not undone by a `min-h-0` between
 * it and `<main>` (from `md`), so a short window scrolls `<main>` instead of leaving a
 * slit of rows. The phone half — no fill, the page scrolls — is
 * data-table-phone-040.test and phone-bounded-layout.test.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];
const NAV: AppShellNavItem[] = [{ to: "/", label: "Home", icon: Home }];

const table = (fillHeight?: boolean) => (
  <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} fillHeight={fillHeight} />
);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FillHeight", () => {
  it("is a div with the fill's classes, the caller's merged after them", () => {
    render(<FillHeight data-testid="page" className="py-4 md:p-6" />);
    const page = screen.getByTestId("page");
    expect(page.tagName).toBe("DIV");
    for (const cls of FILL_HEIGHT_CLASS.split(" ")) expect(page).toHaveClass(cls);
    expect(page).toHaveClass("py-4", "md:p-6");
  });

  it("forwards its ref and the div's own props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<FillHeight ref={ref} id="account-list" aria-label="Accounts" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute("id", "account-list");
    expect(ref.current).toHaveAttribute("aria-label", "Accounts");
  });

  it("only fills from md, only around a filling table, and never sets min-h-0", () => {
    const classes = FILL_HEIGHT_CLASS.split(" ");
    expect(classes).toEqual([
      "md:has-[[data-fill-height]]:flex",
      "md:has-[[data-fill-height]]:flex-1",
      "md:has-[[data-fill-height]]:flex-col",
    ]);
    // A `min-h-0` here would let the page shrink below the table's floor, and the
    // overflow would push the page's bottom padding out of `<main>`'s view.
    expect(FILL_HEIGHT_CLASS).not.toMatch(/min-h-0/);
  });
});

describe("DataTable marks itself under fillHeight", () => {
  it("carries data-fill-height on its root only with the prop", () => {
    const { container, rerender } = render(<MemoryRouter>{table(true)}</MemoryRouter>);
    const root = container.querySelector("[data-density]");
    expect(root).toHaveAttribute("data-fill-height", "");
    rerender(<MemoryRouter>{table(false)}</MemoryRouter>);
    expect(container.querySelector("[data-density]")).not.toHaveAttribute("data-fill-height");
    expect(container.querySelector("[data-fill-height]")).toBeNull();
  });

  it("from md, the body grows from a 12rem floor that no wrapper above it undoes", () => {
    const { container } = render(<MemoryRouter>{table(true)}</MemoryRouter>);
    const root = container.querySelector<HTMLElement>("[data-fill-height]")!;
    // The phone keeps `min-h-0` (its card list scrolls inside a bounded pane); from md
    // the root's minimum is its content's again.
    expect(root).toHaveClass("flex", "flex-1", "flex-col", "min-h-0", "md:min-h-auto");
    const body = container.querySelector<HTMLElement>("table")!.parentElement!;
    expect(body).toHaveClass("overflow-auto", "grow", "basis-48", "min-h-0");
    expect(body).not.toHaveClass("flex-1");
    // Between the body and the root: no `min-h-0`, or the floor would not carry up.
    for (let el = body.parentElement; el && el !== root; el = el.parentElement) {
      expect(el).not.toHaveClass("min-h-0");
    }
  });

  it("keeps the cap without fillHeight", () => {
    const { container } = render(<MemoryRouter>{table()}</MemoryRouter>);
    const body = container.querySelector<HTMLElement>("table")!.parentElement!;
    expect(body).not.toHaveClass("basis-48");
    expect(body.style.maxHeight).toBe("calc(100dvh - 12rem)");
  });

  it("on a phone the marker stays, and the card list is in the page's flow", () => {
    stubPhone();
    const { container } = render(<MemoryRouter>{table(true)}</MemoryRouter>);
    expect(container.querySelector("[data-fill-height]")).not.toBeNull();
    // No desktop body below md — nothing to fill; the shell's `md:` classes do not apply.
    expect(container.querySelector("table")).toBeNull();
  });
});

describe("AppShell's <main> becomes the fill's flex column", () => {
  it("from md, while a filling table is inside — banners above stay their own rows", () => {
    render(
      <MemoryRouter>
        <AppShell nav={NAV} topBar={<span>K</span>}>
          <div role="status">Demo banner</div>
          <FillHeight className="p-6">{table(true)}</FillHeight>
        </AppShell>
      </MemoryRouter>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveClass(
      "md:has-[[data-fill-height]]:flex",
      "md:has-[[data-fill-height]]:flex-col",
      // A banner keeps its height even when it is fixed or clips its overflow. No `:has`
      // on this one (a `:has(…) > *` rule restyled the page on every insertion, 0.48.2);
      // the doubled class outranks FillHeight's `flex-1`.
      "md:[&&>*]:shrink-0",
      // Still the scroller from md: a window below the floor scrolls `<main>`.
      "md:overflow-y-auto",
      "md:min-h-0",
    );
    // Unconditional `flex` would change every other page's layout.
    expect(main).not.toHaveClass("flex", "md:flex");
    expect(main.className).not.toMatch(/has-\[[^\s]*\]:\*:/);
    expect(main.querySelector("[data-fill-height]")).not.toBeNull();
  });
});
