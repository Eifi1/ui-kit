import { useMemo, useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubPhone } from "../../test/viewport";

/**
 * 0.48.2 (keksdose K-052-2, dev #632 — "The table is extremely slow"): a selection, focus
 * or expansion change re-renders only the rows whose own inputs changed. Ticking one box
 * on a 271-row register re-ran every cell of every row (INP 430–1200 ms).
 *
 * The probe is a cell component that counts its renders per row: the owner's state
 * lives above the table, as on every real page, so the table re-renders on each tick
 * and only the rows themselves may bail out.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
const renders = new Map<number, number>();
function Counted({ row }: { row: Row }) {
  renders.set(row.id, (renders.get(row.id) ?? 0) + 1);
  return <span>{row.name}</span>;
}
const rerendered = () => [...renders.entries()].filter(([, n]) => n > 0).map(([id]) => id);
const resetCounts = () => {
  for (const id of renders.keys()) renders.set(id, 0);
};

function Harness({ groupBy, loadMore }: { groupBy?: boolean; loadMore?: boolean }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  // Memoised as a real page does (keksdose's `useTransactionColumns`).
  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [{ key: "name", header: "Name", cell: (r) => <Counted row={r} /> }],
    [],
  );
  const swipes = useMemo(
    () => () => ({ end: [{ label: "Delete", tone: "danger" as const, onCommit: () => {} }] }),
    [],
  );
  const group = useMemo(() => ({ key: (r: Row) => (r.id <= 6 ? "a" : "b") }), []);
  return (
    <MemoryRouter>
      <DataTable<Row>
        rows={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        paginated={false}
        // Every function prop inline, as call sites write them.
        rowClassName={(r) => (selected.has(r.id) ? "picked" : undefined)}
        rowAttributes={(r) => ({ "data-id": String(r.id) })}
        onRowClick={(r) => setExpanded((id) => (id === r.id ? null : r.id))}
        isExpanded={(r) => r.id === expanded}
        expandedRow={(r) => <div>Details of {r.name}</div>}
        groupBy={groupBy ? group : undefined}
        loadMore={loadMore ? { hasMore: true, onLoadMore: () => {} } : undefined}
        selection={{
          isSelected: (r) => selected.has(r.id),
          onToggle: (r, on) =>
            setSelected((s) => {
              const next = new Set(s);
              if (on) next.add(r.id);
              else next.delete(r.id);
              return next;
            }),
          allSelected: false,
          someSelected: selected.size > 0,
          onToggleAll: () => {},
        }}
        // Compared by identity, as the columns are: a page memoises it with them.
        mobileSwipeActions={swipes}
        desktopSwipeActions={false}
      />
    </MemoryRouter>
  );
}

afterEach(() => {
  renders.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const boxOf = (name: string) =>
  within(screen.getByText(name).closest("tr")!).getByRole("checkbox", { name: /select/i });

describe("DataTable row memo (0.48.2, K-052-2)", () => {
  it.each([
    ["flat", {}],
    ["grouped", { groupBy: true }],
    ["grouped with loadMore", { groupBy: true, loadMore: true }],
  ])("a selection change re-renders only the toggled row (%s)", (_, props) => {
    render(<Harness {...props} />);
    resetCounts();
    fireEvent.click(boxOf("Row 3"));
    expect(boxOf("Row 3")).toBeChecked();
    expect(rerendered()).toEqual([3]);
    resetCounts();
    fireEvent.click(boxOf("Row 8"));
    expect(rerendered()).toEqual([8]);
    // Un-ticking too, and the first tick's row keeps its state.
    resetCounts();
    fireEvent.click(boxOf("Row 3"));
    expect(boxOf("Row 3")).not.toBeChecked();
    expect(boxOf("Row 8")).toBeChecked();
    expect(rerendered()).toEqual([3]);
  });

  it("an expansion change re-renders only the rows it opens and closes", () => {
    render(<Harness groupBy />);
    resetCounts();
    fireEvent.click(screen.getByText("Row 2"));
    expect(screen.getByText("Details of Row 2")).toBeInTheDocument();
    expect(rerendered()).toEqual([2]);
    resetCounts();
    fireEvent.click(screen.getByText("Row 9"));
    expect(screen.queryByText("Details of Row 2")).toBeNull();
    expect(screen.getByText("Details of Row 9")).toBeInTheDocument();
    expect(rerendered().sort((a, b) => a - b)).toEqual([2, 9]);
  });

  it("moving the roving focus re-renders only the two rows whose tab stop moved", () => {
    render(<Harness />);
    resetCounts();
    const tr = screen.getByText("Row 5").closest("tr")!;
    act(() => tr.focus());
    expect(tr).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Row 1").closest("tr")).toHaveAttribute("tabindex", "-1");
    expect(rerendered().sort((a, b) => a - b)).toEqual([1, 5]);
  });

  it("the handlers act on the latest state after a bail-out", () => {
    render(<Harness />);
    fireEvent.click(boxOf("Row 4"));
    // Row 1 did not re-render on that tick; its click must still see the current set.
    fireEvent.click(boxOf("Row 1"));
    expect(boxOf("Row 4")).toBeChecked();
    expect(boxOf("Row 1")).toBeChecked();
    expect(screen.getByText("Row 4").closest("tr")).toHaveClass("picked");
  });

  it("inline columns still re-render every row, so a cell never shows a stale value", () => {
    function Inline() {
      const [suffix, setSuffix] = useState("a");
      return (
        <MemoryRouter>
          <button onClick={() => setSuffix("b")}>change</button>
          <DataTable<Row>
            rows={ROWS.slice(0, 3)}
            rowKey={(r) => r.id}
            paginated={false}
            columns={[{ key: "name", header: "Name", cell: (r) => `${r.name}-${suffix}` }]}
          />
        </MemoryRouter>
      );
    }
    render(<Inline />);
    expect(screen.getByText("Row 2-a")).toBeInTheDocument();
    fireEvent.click(screen.getByText("change"));
    expect(screen.getByText("Row 1-b")).toBeInTheDocument();
    expect(screen.getByText("Row 3-b")).toBeInTheDocument();
  });

  it("a phone card re-renders only when its own selection changes", () => {
    stubPhone();
    render(<Harness />);
    // Into selection mode: every card's box appears, so every card re-renders once.
    fireEvent.click(screen.getByRole("button", { name: /select rows/i }));
    resetCounts();
    const cardOf = (name: string) => screen.getByText(name).closest("[data-card-selecting]") as HTMLElement;
    fireEvent.click(cardOf("Row 6"));
    expect(cardOf("Row 6")).toHaveAttribute("aria-pressed", "true");
    expect(rerendered()).toEqual([6]);
    resetCounts();
    fireEvent.click(cardOf("Row 2"));
    expect(cardOf("Row 6")).toHaveAttribute("aria-pressed", "true");
    expect(cardOf("Row 2")).toHaveAttribute("aria-pressed", "true");
    expect(rerendered()).toEqual([2]);
  });
});
