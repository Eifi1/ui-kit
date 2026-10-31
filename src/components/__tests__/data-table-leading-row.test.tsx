import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";

/**
 * 0.48 (keksdose dev #603: "it should rather be sticky, so the user can show hide them
 * everywhere on click"): `leadingRowSticky` pins the `leadingRow` under the sticky header
 * while the rows scroll — `top` is the header's measured height, followed as it resizes
 * (a header that wraps at Large text). jsdom lays nothing out, so this pins the wiring;
 * headless Chromium checked the pixels (docs/archive/adopt/adopt-0.48.md).
 */

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

let ro: ResizeObserverStub;
let headHeight = 40;
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
  ro = stubResizeObserver();
  headHeight = 40;
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.tagName === "THEAD")
      return {
        height: headHeight,
        width: 500,
        top: 0,
        left: 0,
        bottom: headHeight,
        right: 500,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    return realRect.call(this);
  };
});
afterEach(() => {
  ro.restore();
  HTMLElement.prototype.getBoundingClientRect = realRect;
});

function renderTable(sticky?: boolean) {
  render(
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        leadingRow={<button type="button">Show upcoming</button>}
        leadingRowSticky={sticky}
      />
    </MemoryRouter>,
  );
  return screen.getByRole("button", { name: "Show upcoming" }).closest("td") as HTMLTableCellElement;
}

describe("DataTable leadingRowSticky (0.48, keksdose dev #603)", () => {
  it("pins the leading row under the header, top = the header's height", () => {
    const cell = renderTable(true);
    expect(cell).toHaveClass("sticky", "bg-surface");
    expect(cell.style.top).toBe("40px");
    // Under the header (z-10), over the rows that scroll beneath it.
    expect(cell.className).toMatch(/z-\[5\]/);
  });

  it("follows the header as it resizes", () => {
    const cell = renderTable(true);
    const head = cell.closest("table")!.tHead!;
    expect(ro.observed()).toContain(head);
    headHeight = 64;
    act(() => ro.resize(head, { width: 500, height: 64 }));
    expect(cell.style.top).toBe("64px");
  });

  it("scrolls with the rows by default, as before", () => {
    const cell = renderTable();
    expect(cell).not.toHaveClass("sticky");
    expect(cell.style.top).toBe("");
  });
});
