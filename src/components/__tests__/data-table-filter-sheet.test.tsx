import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { drainTasks, pressBack } from "../../test/tasks";
import { stubPhone } from "../../test/viewport";

/**
 * Round 0.34 Wave 0, BUG-7b = DUP-6 (sev 3): DataTable's phone filter sheet was the
 * last hand-rolled modal in the kit. It said `role="dialog" aria-modal="true"` — on the
 * full-screen backdrop — and then had no name, moved no focus, trapped nothing and
 * ignored Escape: a reader was told the page was hidden while focus stayed on it. It is
 * a `DialogFrame` now, so it gets what every other dialog of the kit has.
 */

interface Row {
  id: number;
  name: string;
  city: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Delta", city: "Bern" },
  { id: 2, name: "Alpha", city: "Zug" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "city", header: "City", cell: (r) => r.city, filterBy: (r) => r.city },
];

beforeEach(() => stubPhone());
afterEach(async () => {
  // Unmount HERE, then drain. The setup file's `cleanup` runs AFTER this hook (vitest
  // runs after-hooks in reverse), so a sheet a test left open used to be unmounted after
  // the drain, and the history unwind its unmount schedules (a task, then
  // `history.go(-1)`, then popstate) landed in the next test — where it could be taken
  // for that test's Back, which was then ignored: "closes on Back" failed about one run
  // in three (round 0.34, D3).
  cleanup();
  await drainTasks();
  vi.unstubAllGlobals();
});

async function openSheet() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
    </MemoryRouter>,
  );
  const opener = screen.getByRole("button", { name: /^Filters/ });
  await user.click(opener);
  return { user, opener, sheet: screen.getByRole("dialog", { name: "Filters" }) };
}

/**
 * The sheet closes, and focus is back on the button that opened it. The close lands on
 * the exit animation's timer, outside `act`, so React can take the panel out of the DOM
 * a task before it runs the effects that hand focus back — a check made in between saw
 * focus on <body>, about one run in ten under load (round 0.34, D3). Both are waited for
 * as the conditions they are.
 */
async function expectClosedBackOn(opener: HTMLElement) {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(opener).toHaveFocus());
}

describe("DataTable's phone filter sheet is a real dialog (BUG-7b)", () => {
  it("is named by its title, and the dialog is the panel rather than the backdrop", async () => {
    const { sheet } = await openSheet();
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(within(sheet).getByRole("heading", { name: "Filters" })).toBeInTheDocument();
    // The column sections and the footer are inside the dialog.
    expect(within(sheet).getByRole("button", { name: "City" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("takes focus when it opens, and keeps Tab inside", async () => {
    const { user, sheet } = await openSheet();
    expect(sheet.contains(document.activeElement)).toBe(true);
    const done = within(sheet).getByRole("button", { name: "Done" });
    act(() => done.focus());
    await user.tab();
    expect(sheet.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and gives focus back to the Filters button", async () => {
    const { user, opener } = await openSheet();
    await user.keyboard("{Escape}");
    await expectClosedBackOn(opener);
  });

  it("closes on Back, as it always has (Keksdose #172)", async () => {
    const { opener } = await openSheet();
    await drainTasks();
    await pressBack();
    await expectClosedBackOn(opener);
  });

  it("closes on Done, back to the Filters button", async () => {
    const { user, opener, sheet } = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: "Done" }));
    await expectClosedBackOn(opener);
  });
});
