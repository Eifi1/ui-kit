import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * The pager disabled the arrow that was just pressed: Next on the second-to-last page
 * landed on a page where Next was `disabled`, and a disabled button cannot hold the focus
 * it had — it fell to `<body>` (refactor audit 2026-10-30, DSP-12). At the ends the arrows
 * are `aria-disabled` now, keep the focus, and a press does nothing: JumpCalendar's rule.
 */

interface Row {
  id: number;
}
const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: i + 1 }));
const COLUMNS: DataTableColumn<Row>[] = [{ key: "id", header: "Id", cell: (r) => String(r.id) }];

function renderTable() {
  render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} defaultPageSize={10} />
    </MemoryRouter>,
  );
}

const arrow = (name: "Next page" | "Previous page") => screen.getByRole("button", { name });

describe("DataTable pager at its ends (audit 2026-10-30 DSP-12)", () => {
  it("Next pressed onto the last page stays focusable, says it is off, and does nothing", () => {
    renderTable();
    act(() => arrow("Next page").focus());
    fireEvent.click(arrow("Next page"));
    fireEvent.click(arrow("Next page"));
    expect(screen.getByText("21–30 / 30")).toBeInTheDocument();
    expect(arrow("Next page")).not.toBeDisabled();
    expect(arrow("Next page")).toHaveAttribute("aria-disabled", "true");
    expect(document.activeElement).toBe(arrow("Next page"));
    fireEvent.click(arrow("Next page"));
    expect(screen.getByText("21–30 / 30")).toBeInTheDocument();
  });

  it("Previous on the first page likewise; both arrows live in between", () => {
    renderTable();
    expect(arrow("Previous page")).not.toBeDisabled();
    expect(arrow("Previous page")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(arrow("Previous page"));
    expect(screen.getByText("1–10 / 30")).toBeInTheDocument();
    fireEvent.click(arrow("Next page"));
    expect(arrow("Previous page")).not.toHaveAttribute("aria-disabled");
    expect(arrow("Next page")).not.toHaveAttribute("aria-disabled");
  });
});
