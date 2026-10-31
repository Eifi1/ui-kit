import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";

/**
 * 0.47 (keksdose S4): an expanded row is as wide as the TABLE, so on a table wider than
 * its scroller an inline editor's Save/Cancel sat off-screen (kk 1440x900: table 1389px,
 * scroller 1073px, buttons at x 1577-1633). The expansion's content is pinned to the
 * scroller's visible width — `sticky start-0` (logical: the right edge in RTL) and a
 * width from a ResizeObserver on the scroller's `clientWidth`. jsdom lays nothing out, so
 * this pins the wiring; headless Chromium checked the pixels (docs/archive/adopt/adopt-0.47.md).
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
beforeEach(() => {
  ro = stubResizeObserver();
});
afterEach(() => ro.restore());

function renderTable() {
  render(
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        isExpanded={(r) => r.id === 1}
        expandedRow={(r) => <button type="button">Save {r.name}</button>}
      />
    </MemoryRouter>,
  );
  const editor = screen.getByRole("button", { name: "Save Alpha" });
  const scroller = editor.closest("[data-clips]") as HTMLElement;
  return { editor, scroller };
}

describe("DataTable's expansion row — pinned to the visible scroller (0.47, keksdose S4)", () => {
  it("sticks to the scroller's start edge, inside a cell that still never sizes the columns", () => {
    const { editor } = renderTable();
    const pinned = editor.parentElement as HTMLElement;
    expect(pinned).toHaveClass("sticky", "start-0");
    // The `w-0 min-w-full` wrapper stays (feedback #104): the panel's preferred width is 0.
    expect(pinned.parentElement).toHaveClass("w-0", "min-w-full");
    expect(pinned.parentElement?.tagName).toBe("DIV");
    expect(pinned.parentElement?.parentElement?.tagName).toBe("TD");
  });

  it("is as wide as the scroller shows, and follows it as it resizes", () => {
    const { editor, scroller } = renderTable();
    expect(ro.observed()).toContain(scroller);
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 1073 });
    act(() => ro.resize(scroller, { width: 1073, height: 400 }));
    expect(scroller.style.getPropertyValue("--dt-visible-w")).toBe("1073px");
    const pinned = editor.parentElement as HTMLElement;
    expect(pinned.className).toContain("w-[var(--dt-visible-w,100%)]");
    expect(pinned).toHaveClass("max-w-full");
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 800 });
    act(() => ro.resize(scroller, { width: 800, height: 400 }));
    expect(scroller.style.getPropertyValue("--dt-visible-w")).toBe("800px");
  });
});
