import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { Chip } from "../chip";
import { booleanColumn } from "../data-table-cells";
import { isEmptyCell } from "../data-table-mobile";
import { applyTextSize } from "../../theme/text-size";
import { viewportMatchMedia } from "../../test/viewport";

/**
 * 0.49 KIT-7, the default phone card (no `mobileCard`): the `mobilePrimary` column as
 * the title, at most three more fields (column `mobile`, default the first three after
 * the title), no field for an empty value, and `role: "status"` columns as a chip beside
 * the title.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

interface Invoice {
  id: number;
  number: string;
  tenant: string;
  due: string | null;
  amount: string;
  note: string;
  status: string;
  reference: string;
}

const ROWS: Invoice[] = [
  { id: 1, number: "INV-1", tenant: "Ada Example", due: "31 Oct", amount: "CHF 1,850.00", note: "", status: "Unpaid", reference: "R-77" },
  { id: 2, number: "INV-2", tenant: "Ben Sample", due: null, amount: "CHF 920.00", note: "Keys", status: "Overdue", reference: "—" },
];

const COLUMNS: DataTableColumn<Invoice>[] = [
  { key: "number", header: "Number", cell: (r) => r.number, mobilePrimary: true },
  { key: "tenant", header: "Tenant", cell: (r) => r.tenant },
  { key: "due", header: "Due", cell: (r) => r.due },
  { key: "amount", header: "Amount", cell: (r) => r.amount },
  { key: "note", header: "Note", cell: (r) => r.note },
  { key: "reference", header: "Reference", cell: (r) => r.reference },
  { key: "status", header: "Status", cell: (r) => r.status, role: "status" },
];

function renderTable(extra: Partial<DataTableProps<Invoice>> = {}, columns = COLUMNS) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={columns} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

function viewport(width: number) {
  vi.stubGlobal("matchMedia", viewportMatchMedia(width));
}

/** The card of the row whose title is `title`. */
const cardOf = (title: string) => screen.getByText(title).closest("li") as HTMLElement;
const labels = (card: HTMLElement) => Array.from(card.querySelectorAll("dt")).map((dt) => dt.textContent);

describe("the default phone card (KIT-7)", () => {
  it("shows the title and the first three fields after it, at most", () => {
    viewport(390);
    renderTable();
    expect(labels(cardOf("INV-1"))).toEqual(["Tenant", "Due", "Amount"]);
  });

  it("hides a field whose value is empty — null, \"\" or the formatted empty \"—\"", () => {
    viewport(390);
    renderTable({}, COLUMNS.map((c) => (c.key === "note" || c.key === "reference" ? { ...c, mobile: "secondary" as const } : c)));
    // Row 1: note "" hidden; row 2: reference "—" hidden.
    expect(labels(cardOf("INV-1"))).toEqual(["Reference"]);
    expect(labels(cardOf("INV-2"))).toEqual(["Note"]);
    renderTable();
    // Row 2's due date is null: Tenant and Amount only.
    expect(labels(screen.getAllByText("INV-2")[1]!.closest("li")!)).toEqual(["Tenant", "Amount"]);
  });

  it("counts booleanColumn's unset mark as empty", () => {
    const col = booleanColumn<{ v: boolean | null }>({ key: "v", header: "V", value: (r) => r.v });
    expect(isEmptyCell(col.cell({ v: null }))).toBe(true);
    expect(isEmptyCell(col.cell({ v: false }))).toBe(false);
    expect(isEmptyCell("  ")).toBe(true);
    expect(isEmptyCell(0)).toBe(false);
  });

  it("takes the columns marked mobile: \"secondary\", and leaves out mobile: \"hidden\"", () => {
    viewport(390);
    const columns = COLUMNS.map((c) =>
      c.key === "amount" || c.key === "note"
        ? { ...c, mobile: "secondary" as const }
        : c.key === "tenant"
          ? { ...c, mobile: "hidden" as const }
          : c,
    );
    renderTable({}, columns);
    expect(labels(cardOf("INV-2"))).toEqual(["Amount", "Note"]);
    expect(within(cardOf("INV-2")).queryByText("Ben Sample")).toBeNull();
  });

  it("mobile: \"primary\" is the title, as mobilePrimary", () => {
    viewport(390);
    const columns = COLUMNS.map((c) =>
      c.key === "tenant" ? { ...c, mobile: "primary" as const } : c.key === "number" ? { ...c, mobilePrimary: undefined } : c,
    );
    renderTable({}, columns);
    const card = cardOf("Ada Example");
    expect(card.querySelector("[data-card-title]")).toHaveTextContent("Ada Example");
    expect(labels(card)).toEqual(["Number", "Due", "Amount"]);
  });

  it("draws a status column as a chip beside the title, not as a field", () => {
    viewport(390);
    renderTable();
    const card = cardOf("INV-1");
    const head = card.querySelector("[data-card-head]")!;
    expect(within(head as HTMLElement).getByText("INV-1")).toBeInTheDocument();
    const status = within(head as HTMLElement).getByText("Unpaid");
    expect(status.closest("[data-slot=chip], .rounded-full, [class*=rounded]")).not.toBeNull();
    expect(labels(card)).not.toContain("Status");
  });

  it("keeps a status cell that is already a chip as it is", () => {
    viewport(390);
    const columns = COLUMNS.map((c) =>
      c.key === "status" ? { ...c, cell: (r: Invoice) => <Chip tone="warning" data-testid={`chip-${r.id}`}>{r.status}</Chip> } : c,
    );
    renderTable({}, columns);
    const chip = screen.getByTestId("chip-1");
    expect(chip.closest("[data-card-head]")).not.toBeNull();
    expect(chip.parentElement!.closest("[data-testid]")).toBeNull();
  });

  it("puts the card's left-out columns into the opened row with mobileDetailsInRow", () => {
    viewport(390);
    renderTable({ mobileDetailsInRow: true, isExpanded: () => true, onRowClick: () => {} });
    const card = cardOf("INV-1");
    const details = card.querySelector("[data-row-details]")!;
    expect(Array.from(details.querySelectorAll("dt")).map((d) => d.textContent)).toEqual(["Reference"]);
  });

  it("applies the same choice at Large, labels above values", () => {
    viewport(390);
    applyTextSize("large");
    renderTable();
    const card = cardOf("INV-2");
    expect(card.querySelector('[data-card-fields="stacked"]')).not.toBeNull();
    expect(labels(card)).toEqual(["Tenant", "Amount"]);
  });

  it("leaves a mobileCard alone", () => {
    viewport(390);
    renderTable({ mobileCard: (r) => <p>custom {r.number}</p> });
    expect(screen.getByText("custom INV-1")).toBeInTheDocument();
    expect(cardOf("custom INV-1").querySelector("dt")).toBeNull();
    expect(cardOf("custom INV-1").querySelector("[data-card-head]")).toBeNull();
  });
});

describe("the dev warning for a noRowLink column the card drops (KIT-7)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function devBuild() {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    return vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  /** The invoice columns with a per-row button column after the first `at` of them. */
  function withButtons(key: string, at = COLUMNS.length): DataTableColumn<Invoice>[] {
    const bin: DataTableColumn<Invoice> = {
      key,
      header: "",
      noRowLink: true,
      cell: (r) => <button type="button">Delete {r.number}</button>,
    };
    return [...COLUMNS.slice(0, at), bin, ...COLUMNS.slice(at)];
  }

  it("a development build names it once per column key", () => {
    const warn = devBuild();
    renderTable({}, withButtons("bin"));
    renderTable({}, withButtons("bin"));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toBe(
      '[ui-kit] DataTable: column "bin" (noRowLink) is past the phone card\'s three fields and leaves the card — ' +
        'mark it mobile: "secondary", or move its action to rowActions.',
    );
  });

  it("stays silent when the column is a field, or the app chose the card", () => {
    const warn = devBuild();
    // The title and two fields before it: the bin is the third field.
    renderTable({}, withButtons("bin-third", 3));
    // Columns marked mobile: "secondary" are the app's choice.
    renderTable({}, withButtons("bin-marked").map((c) => (c.key === "tenant" ? { ...c, mobile: "secondary" as const } : c)));
    renderTable({ mobileCard: (r) => <p>{r.number}</p> }, withButtons("bin-card"));
    // In the opened row the button is still a tap away.
    renderTable({ mobileDetailsInRow: true }, withButtons("bin-details"));
    renderTable({}, withButtons("bin-hidden").map((c) => (c.key === "bin-hidden" ? { ...c, mobileHidden: true } : c)));
    renderTable({ rowActions: [{ kind: "delete", onAction: () => {} }] });
    expect(warn).not.toHaveBeenCalled();
  });

  it("a production build and vitest stay silent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderTable({}, withButtons("bin-vitest"));
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", false);
    renderTable({}, withButtons("bin-production"));
    expect(warn).not.toHaveBeenCalled();
  });
});
