import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { axeViolations } from "../../test/axe";
import { stubPhone, stubResizeObserver } from "../../test/viewport";

/**
 * `leadingRow` on a phone (refactor audit 2026-10-30, DSP-2). The slot rendered only in
 * the desktop table; the card list dropped it. kastlan's meters page puts its inline
 * "Add meter" editor there, so on a phone the button disabled itself and nothing
 * appeared; keksdose kept an `md:hidden` copy of its "show hidden accounts" toggle
 * above the table. It is now the card list's first item: a plain `<li>` (the list is a
 * `<ul>`, which takes nothing else), no card — no row link, no toggle in selection mode —
 * and pinned at the top under `leadingRowSticky`, the section headers below it.
 */

interface Row {
  id: number;
  name: string;
  kind: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha", kind: "Cash" },
  { id: 2, name: "Bravo", kind: "Cash" },
  { id: 3, name: "Charlie", kind: "Bank" },
];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderPhone(extra: Partial<DataTableProps<Row>> = {}) {
  stubPhone();
  return render(
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        leadingRow={<button type="button">Show hidden accounts</button>}
        {...extra}
      />
    </MemoryRouter>,
  );
}

const leadingItem = () => screen.getByRole("button", { name: "Show hidden accounts" }).closest("li") as HTMLLIElement;

describe("DataTable leadingRow on a phone (audit 2026-10-30 DSP-2)", () => {
  it("renders the leading row as the card list's first item, ahead of the cards", () => {
    const { container } = renderPhone();
    expect(container.querySelector("table")).toBeNull();
    const list = container.querySelector("ul")!;
    expect(list.firstElementChild).toBe(leadingItem());
    // Every card still renders after it.
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Show hidden accounts", "Alpha", "Bravo", "Charlie"]);
  });

  it("shows the editor a page opens into it: kastlan's inline Add meter", () => {
    // The page's button sets `adding`, disables itself, and the editor arrives as the
    // leading row — the only create path the meters page has.
    function MetersPage() {
      const [adding, setAdding] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAdding(true)} disabled={adding}>
            Add meter
          </button>
          <DataTable
            rows={ROWS}
            columns={COLUMNS}
            rowKey={(r) => r.id}
            leadingRow={adding ? <input aria-label="Meter number" /> : undefined}
          />
        </>
      );
    }
    stubPhone();
    render(
      <MemoryRouter>
        <MetersPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add meter" }));
    expect(screen.getByRole("button", { name: "Add meter" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Meter number" })).toBeInTheDocument();
  });

  it("is no card: in selection mode it is not a toggle, and it carries no row attributes", () => {
    renderPhone({
      selection: {
        isSelected: () => false,
        onToggle: () => {},
        onToggleAll: () => {},
        allSelected: false,
        someSelected: false,
      },
      rowAttributes: () => ({ "data-row": "" }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Select rows" }));
    // Three rows, three toggles: the leading row's own button is not one of them.
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(3);
    const lead = leadingItem();
    expect(lead).not.toHaveAttribute("data-row");
    expect(lead.querySelector("[aria-pressed], [data-card-selecting]")).toBeNull();
  });

  it("scrolls with the cards by default", () => {
    renderPhone();
    expect(leadingItem()).not.toHaveClass("sticky");
  });

  it("is pinned at the top under leadingRowSticky, over the cards that pass beneath it", () => {
    renderPhone({ leadingRowSticky: true });
    expect(leadingItem()).toHaveClass("sticky", "top-0", "bg-surface");
  });

  it("puts a grouped list's section headers under a sticky leading row, at its measured height", () => {
    const ro = stubResizeObserver();
    let leadHeight = 44;
    const realRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.tagName === "LI" && this.querySelector("button")?.textContent === "Show hidden accounts")
        return { height: leadHeight, width: 375, top: 0, left: 0, bottom: leadHeight, right: 375 } as DOMRect;
      return realRect.call(this);
    });
    try {
      renderPhone({ leadingRowSticky: true, mobileGroupBy: (r) => r.kind });
      const sectionHeader = (label: string) => screen.getByText(label).closest("li") as HTMLLIElement;
      expect(sectionHeader("Cash").style.top).toBe("44px");
      expect(sectionHeader("Bank").style.top).toBe("44px");
      // It follows the leading row as it grows (an inline editor wrapping at Large text).
      leadHeight = 60;
      act(() => ro.resize(leadingItem(), { width: 375, height: 60 }));
      expect(sectionHeader("Cash").style.top).toBe("60px");
    } finally {
      ro.restore();
    }
  });

  it("is axe-clean: the list holds list items only", async () => {
    const { container } = renderPhone({ leadingRowSticky: true, mobileGroupBy: (r) => r.kind });
    expect(await axeViolations(container)).toEqual([]);
  });
});
