import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPopover } from "../data-table-filter-popover";
import type { DataTableColumn } from "../data-table";
import type { ColumnFilter, FilterValue } from "../data-table-filters";
import { dateRangePresets, todayIso } from "../../lib/dates";

/**
 * The filter popover's controls, one interaction per filter type (refactor audit
 * 2026-10, TST-12).
 *
 * It is the UI behind every `filter:` column — kastlan alone has ~30 files of them — and
 * its handlers were mostly untested (6 of 20 functions in 0.33.1's coverage): what a
 * tick, a preset, a bound or the abs toggle hands to `onChange` was never asserted. The
 * table's own tests filter through it on one path each; these pin the value every
 * control emits, against a host that keeps the state the way DataTable does.
 */

interface Row {
  name: string;
  status: string;
  date: string;
  amount: number;
}

const columnWith = (filter?: ColumnFilter<Row>): DataTableColumn<Row> => ({
  key: "col",
  header: "Column",
  cell: (row) => row.name,
  filter,
});

/** Renders the popover under a host that keeps its state, and records every change. */
function renderFilter(
  filter: ColumnFilter<Row> | undefined,
  initial: FilterValue,
  selectOptions: { value: string; label: string }[] = [],
) {
  const changes: FilterValue[] = [];
  const onClear = vi.fn();
  function Host() {
    const [state, setState] = useState<FilterValue>(initial);
    return (
      <FilterPopover
        column={columnWith(filter)}
        state={state}
        onChange={(next) => {
          changes.push(next);
          setState(next);
        }}
        onClear={onClear}
        selectOptions={selectOptions}
      />
    );
  }
  const view = render(<Host />);
  return { ...view, changes, onClear, last: () => changes[changes.length - 1] };
}

describe("FilterPopover", () => {
  it("renders nothing for a column that cannot be filtered", () => {
    const { container } = renderFilter(undefined, { type: "text", q: "" });
    expect(container).toBeEmptyDOMElement();
  });

  it("text: each keystroke hands the whole query on; Clear filter calls onClear", async () => {
    const user = userEvent.setup();
    const { last, onClear } = renderFilter({ type: "text", getValue: (r) => r.name }, { type: "text", q: "" });
    const input = screen.getByPlaceholderText("Filter…");
    await user.type(input, "ab");
    expect(last()).toEqual({ type: "text", q: "ab" });
    expect(input).toHaveValue("ab");
    await user.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("text: a state of another type reads as an empty query", () => {
    renderFilter({ type: "text", getValue: (r) => r.name }, { type: "select", values: ["x"] });
    expect(screen.getByPlaceholderText("Filter…")).toHaveValue("");
  });

  it("select: ticks add and remove values; All and None set the whole list", async () => {
    const user = userEvent.setup();
    const options = [
      { value: "open", label: "Open" },
      { value: "done", label: "Done" },
      { value: "void", label: "Void" },
    ];
    const { last } = renderFilter({ type: "select", getValue: (r) => r.status }, { type: "text", q: "" }, options);
    await user.click(screen.getByRole("checkbox", { name: "Done" }));
    await user.click(screen.getByRole("checkbox", { name: "Open" }));
    expect(last()).toEqual({ type: "select", values: ["done", "open"] });
    await user.click(screen.getByRole("checkbox", { name: "Done" }));
    expect(last()).toEqual({ type: "select", values: ["open"] });
    expect(screen.getByRole("checkbox", { name: "Open" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Done" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "All" }));
    expect(last()).toEqual({ type: "select", values: ["open", "done", "void"] });
    expect(screen.getAllByRole("checkbox").every((box) => (box as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByRole("button", { name: "None" }));
    expect(last()).toEqual({ type: "select", values: [] });
  });

  it("select: with no options, says so instead of an empty list", () => {
    renderFilter({ type: "select", getValue: (r) => r.status }, { type: "select", values: [] });
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getByRole("listitem")).toHaveTextContent("—");
  });

  it("date: a preset sets both ends and shows as chosen; each input moves its own end", async () => {
    const user = userEvent.setup();
    const { last } = renderFilter({ type: "date", getValue: (r) => r.date }, { type: "date", from: "", to: "" });
    const today = todayIso();
    const lastMonth = dateRangePresets().find((p) => p.key === "last_month")!;
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(last()).toEqual({ type: "date", from: today, to: today });
    expect(screen.getByLabelText("From")).toHaveValue(today);
    expect(screen.getByLabelText("To")).toHaveValue(today);
    // The chosen preset is the highlighted one, and only it.
    expect(screen.getByRole("button", { name: "Today" }).className).toContain("bg-brand-soft");
    expect(screen.getByRole("button", { name: "Yesterday" }).className).not.toContain("bg-brand-soft");
    fireEvent.change(screen.getByLabelText("From"), { target: { value: lastMonth.from } });
    expect(last()).toEqual({ type: "date", from: lastMonth.from, to: today });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: lastMonth.to } });
    expect(last()).toEqual({ type: "date", from: lastMonth.from, to: lastMonth.to });
    expect(screen.getByRole("button", { name: "Last month" }).className).toContain("bg-brand-soft");
  });

  it("number: min, max and the abs toggle each keep the other two; a wheel over a bound blurs it", async () => {
    const user = userEvent.setup();
    const { last } = renderFilter(
      { type: "number", getValue: (r) => r.amount },
      { type: "number", min: "", max: "", abs: false },
    );
    const min = screen.getByRole("spinbutton", { name: "Min (≥)" });
    const max = screen.getByRole("spinbutton", { name: "Max (≤)" });
    await user.type(min, "-5");
    expect(last()).toEqual({ type: "number", min: "-5", max: "", abs: false });
    await user.type(max, "20");
    expect(last()).toEqual({ type: "number", min: "-5", max: "20", abs: false });
    await user.click(screen.getByRole("checkbox", { name: "Absolute value" }));
    expect(last()).toEqual({ type: "number", min: "-5", max: "20", abs: true });
    await user.clear(min);
    expect(last()).toEqual({ type: "number", min: "", max: "20", abs: true });
    // A wheel turned over a focused number input steps its value in most browsers; the
    // filter drops focus instead, so scrolling the panel cannot rewrite a bound.
    max.focus();
    fireEvent.wheel(max);
    expect(max).not.toHaveFocus();
  });
});
