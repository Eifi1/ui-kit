import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BulkActionBar } from "../bulk-action-bar";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { stubPhone } from "../../test/viewport";

/**
 * DataTable's phone cards in 0.40 — keksdose run 78:
 *  - live #420: `fillHeight` turned the card list into a scroller even where the page
 *    itself scrolls (AppShell on a phone), and its `overscroll-contain` swallowed the
 *    page's scroll from a card. It is a scroller only under a bounded parent now.
 *  - live #416: an OPEN card's header still swipes (Marcel: "faster than scrolling
 *    down to the buttons"); the opened body stays outside the gesture.
 *  - live #421: a long press enters selection mode (keksdose's register gesture); a
 *    keyboard enters through "Select rows".
 */

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
  { id: 3, name: "Charlie" },
];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** The card a row's text sits in — the element that carries the card's handlers. */
const card = (name: string) => screen.getByText(name).closest("[role=button], a, li > div, [data-card-selecting]") as HTMLElement;

describe("fillHeight on a phone (live #420)", () => {
  const renderFill = () =>
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} fillHeight />
      </MemoryRouter>,
    );

  it("does not make the card list a scroller under an unbounded parent", () => {
    stubPhone();
    // No overflow: the list's room is its own content, as under AppShell's phone layout.
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(400);
    const { container } = renderFill();
    const list = container.querySelector("ul")!;
    expect(list).not.toHaveClass("overflow-y-auto");
    expect(list).not.toHaveClass("overscroll-contain");
    // It still takes the flex room, so a bounded parent can bound it.
    expect(list).toHaveClass("min-h-0", "flex-1");
  });

  it("makes it the scroller once its rows overflow a bounded parent", () => {
    stubPhone();
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
    const { container } = renderFill();
    expect(container.querySelector("ul")).toHaveClass("overflow-y-auto", "overscroll-contain");
  });

  it("stops scrolling when the bound goes away", () => {
    stubPhone();
    const scroll = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(300);
    const { container, rerender } = renderFill();
    expect(container.querySelector("ul")).toHaveClass("overflow-y-auto");
    scroll.mockReturnValue(300);
    rerender(
      <MemoryRouter>
        <DataTable rows={ROWS.slice(0, 1)} columns={COLUMNS} rowKey={(r) => r.id} fillHeight />
      </MemoryRouter>,
    );
    expect(container.querySelector("ul")).not.toHaveClass("overflow-y-auto");
  });
});

describe("swipe on an open card (live #416)", () => {
  it("keeps the swipe on the open card's header, and the opened body outside it", () => {
    stubPhone();
    const onCommit = vi.fn();
    const onInside = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          rows={ROWS.slice(0, 1)}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          onRowClick={() => {}}
          isExpanded={() => true}
          expandedRow={() => (
            <button type="button" onClick={onInside}>
              Inside
            </button>
          )}
          mobileSwipeActions={() => ({ end: [{ label: "Archive", tone: "danger", onCommit }] })}
        />
      </MemoryRouter>,
    );
    // The keyboard twin of the swipe is there — SwipeableRow is mounted and enabled.
    const group = screen.getByRole("group", { name: "Row actions" });
    // The opened body is a sibling of the swipe layer, not inside it.
    const swipeRoot = group.parentElement!;
    const inside = screen.getByRole("button", { name: "Inside" });
    expect(swipeRoot).not.toContainElement(inside);
    expect(swipeRoot).toContainElement(screen.getByText("Alpha"));

    // A drag on the header commits the action (`end` is a physical drag RIGHT in LTR).
    // On the sliding layer that carries the gesture, as SwipeableRow's own tests drag.
    const header = screen.getByText("Alpha").closest<HTMLElement>("[style*='pan-y']")!;
    const touch = { pointerId: 1, pointerType: "touch", clientY: 10 };
    fireEvent.pointerDown(header, { ...touch, button: 0, clientX: 50 });
    fireEvent.pointerMove(header, { ...touch, clientX: 125 });
    fireEvent.pointerMove(header, { ...touch, clientX: 200 });
    fireEvent.pointerUp(header, { ...touch, clientX: 200 });
    expect(onCommit).toHaveBeenCalledTimes(1);

    // The opened body's own control still works.
    fireEvent.click(inside);
    expect(onInside).toHaveBeenCalledTimes(1);
  });
});

describe("selection on phone cards (live #421)", () => {
  function Harness(props: Partial<DataTableProps<Row>> & { onRowClick?: (r: Row) => void }) {
    const [picked, setPicked] = useState<Set<number>>(new Set());
    const toggle = (r: Row, on: boolean) =>
      setPicked((prev) => {
        const next = new Set(prev);
        if (on) next.add(r.id);
        else next.delete(r.id);
        return next;
      });
    return (
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          mobileSwipeActions={() => ({ end: [{ label: "Archive", tone: "danger", onCommit: () => {} }] })}
          selection={{
            isSelected: (r) => picked.has(r.id),
            onToggle: toggle,
            allSelected: picked.size === ROWS.length,
            someSelected: picked.size > 0,
            onToggleAll: (on) => setPicked(on ? new Set(ROWS.map((r) => r.id)) : new Set()),
          }}
          {...props}
        />
        <BulkActionBar count={picked.size} onClear={() => setPicked(new Set())}>
          <button type="button">Bulk edit</button>
        </BulkActionBar>
      </MemoryRouter>
    );
  }

  const pressed = () => screen.queryAllByRole("button", { pressed: true }).map((b) => b.textContent);

  const longPress = (name: string) => {
    fireEvent.pointerDown(screen.getByText(name), { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 50 });
    // The click the browser still sends when the finger lifts — on what is under it
    // NOW, the card as the mode redrew it.
    fireEvent.click(screen.getByText(name));
  };

  it("shows no boxes until a long press enters the mode with that card selected", () => {
    vi.useFakeTimers();
    stubPhone();
    const onRowClick = vi.fn();
    render(<Harness onRowClick={onRowClick} />);
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
    expect(screen.queryByRole("toolbar")).toBeNull();

    longPress("Bravo");
    // Every card is a toggle now, Bravo's pressed; the trailing click did not open it
    // nor toggle it back.
    expect(document.querySelectorAll("[data-card-selecting]")).toHaveLength(3);
    expect(pressed()).toEqual(["Bravo"]);
    expect(onRowClick).not.toHaveBeenCalled();
    // The owner's bulk bar appears with the selection, as on desktop.
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    // Swipe rests in the mode.
    expect(screen.queryByRole("group", { name: "Row actions" })).toBeNull();
  });

  it("toggles with a tap in the mode, and leaves it when the bulk bar clears", () => {
    vi.useFakeTimers();
    stubPhone();
    const onRowClick = vi.fn();
    render(<Harness onRowClick={onRowClick} />);
    longPress("Alpha");
    fireEvent.click(card("Charlie"));
    expect(pressed()).toEqual(["Alpha", "Charlie"]);
    fireEvent.click(card("Alpha"));
    expect(pressed()).toEqual(["Charlie"]);
    expect(onRowClick).not.toHaveBeenCalled();

    fireEvent.click(within(screen.getByRole("toolbar")).getByRole("button", { name: /clear/i }));
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
    // Out of the mode a tap opens the row again.
    fireEvent.click(card("Alpha"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("leaves the mode when the last selected card is untapped", () => {
    vi.useFakeTimers();
    stubPhone();
    render(<Harness />);
    longPress("Alpha");
    fireEvent.click(card("Alpha"));
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
  });

  it("does not fire when the finger moves — a scroll or a swipe", () => {
    vi.useFakeTimers();
    stubPhone();
    render(<Harness />);
    const el = screen.getByText("Alpha");
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 50, clientY: 70 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
  });

  it("offers a keyboard way in: Select rows, then Select all rows and Cancel", () => {
    stubPhone();
    render(<Harness />);
    const enter = screen.getByRole("button", { name: "Select rows" });
    expect(enter).toHaveClass("sr-only");
    fireEvent.click(enter);
    // In the mode with nothing selected yet: boxes, the bar, focus on its box.
    expect(document.querySelectorAll("[data-card-selecting]")).toHaveLength(3);
    const all = screen.getByRole("checkbox", { name: "Select all rows" });
    expect(all).toHaveFocus();
    fireEvent.click(all);
    expect(pressed()).toEqual(["Alpha", "Bravo", "Charlie"]);
    // A card toggles from the keyboard too.
    const bravo = card("Bravo");
    bravo.focus();
    fireEvent.keyDown(bravo, { key: " " });
    expect(pressed()).toEqual(["Alpha", "Charlie"]);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
    expect(screen.getByRole("button", { name: "Select rows" })).toHaveFocus();
  });

  it("leaves the cards alone without `selection`", () => {
    vi.useFakeTimers();
    stubPhone();
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Select rows" })).toBeNull();
    fireEvent.pointerDown(screen.getByText("Alpha"), { pointerId: 1, button: 0, clientX: 5, clientY: 5 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
  });
});
