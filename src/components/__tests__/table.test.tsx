import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "../table";

afterEach(() => vi.restoreAllMocks());

function Ledger(props: Partial<Parameters<typeof Table>[0]> & { caption?: boolean }) {
  const { caption = true, ...rest } = props;
  return (
    <Table {...rest}>
      {caption && <TableCaption>Payments</TableCaption>}
      <TableHead>
        <TableRow>
          <TableHeaderCell>Payee</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableHeaderCell>Rent</TableHeaderCell>
          <TableCell numeric>1,200.00</TableCell>
        </TableRow>
        <TableRow>
          <TableHeaderCell>Power</TableHeaderCell>
          <TableCell numeric>80.00</TableCell>
        </TableRow>
      </TableBody>
      <TableFoot>
        <TableRow>
          <TableHeaderCell>Total</TableHeaderCell>
          <TableCell numeric>1,280.00</TableCell>
        </TableRow>
      </TableFoot>
    </Table>
  );
}

describe("Table", () => {
  it("renders a real, captioned table with scoped header cells", () => {
    render(<Ledger />);
    const table = screen.getByRole("table", { name: "Payments" });
    const cols = within(table).getAllByRole("columnheader");
    expect(cols.map((c) => c.textContent)).toEqual(["Payee", "Amount"]);
    expect(cols[0]).toHaveAttribute("scope", "col");
    expect(within(table).getAllByRole("rowheader")[0]).toHaveAttribute("scope", "row");
  });

  it("numeric cells are end-aligned with tabular digits; others start-aligned", () => {
    render(<Ledger />);
    const amount = screen.getByRole("cell", { name: "1,200.00" });
    expect(amount.className).toMatch(/text-end/);
    expect(amount.className).toMatch(/tabular-nums/);
    expect(screen.getByRole("columnheader", { name: "Payee" }).className).toMatch(/text-start/);
    expect(screen.getByRole("columnheader", { name: "Amount" }).className).toMatch(/text-end/);
  });

  it("uses only logical alignment, so RTL flips with no class change", () => {
    const { container } = render(
      <div dir="rtl">
        <Ledger />
      </div>,
    );
    expect(container.innerHTML).not.toMatch(/\btext-(left|right)\b/);
    expect(screen.getByRole("cell", { name: "80.00" }).className).toMatch(/text-end/);
  });

  it("density compact tightens the cells", () => {
    render(<Ledger density="compact" />);
    expect(screen.getByRole("cell", { name: "80.00" }).className).toMatch(/px-2 py-1/);
    expect(screen.getByRole("table").className).toMatch(/text-xs/);
  });

  it("zebra and hover tint body rows only", () => {
    render(<Ledger zebra hover />);
    const [headRow, bodyRow, , footRow] = screen.getAllByRole("row");
    expect(bodyRow.className).toMatch(/even:bg-\[var\(--bg-surface-2\)\]/);
    expect(bodyRow.className).toMatch(/hover:bg-\[var\(--bg-hover\)\]/);
    expect(headRow.className).not.toMatch(/hover:/);
    expect(footRow.className).not.toMatch(/even:/);
  });

  it("sits in an overflow-x wrapper that is no tab stop while it fits", () => {
    const { container } = render(<Ledger />);
    const wrapper = container.firstElementChild!;
    expect(wrapper.className).toMatch(/overflow-x-auto/);
    expect(wrapper).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("when it overflows, the wrapper is a focusable region named by the caption", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(320);
    render(<Ledger />);
    const region = screen.getByRole("region", { name: "Payments" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("without a caption, an overflowing table's region takes its aria-label", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(320);
    render(<Ledger caption={false} aria-label="Ledger" />);
    expect(screen.getByRole("region", { name: "Ledger" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Ledger" })).toBeInTheDocument();
  });
});

describe("Table 0.10.0", () => {
  function Units({ units, empty }: { units: string[]; empty?: string }) {
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Unit</TableHeaderCell>
            <TableHeaderCell>Floor</TableHeaderCell>
            <TableHeaderCell numeric>Share</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody empty={empty}>
          {units.map((u) => (
            <TableRow key={u}>
              <TableCell>{u}</TableCell>
              <TableCell>1</TableCell>
              <TableCell numeric>10</TableCell>
            </TableRow>
          ))}
          {false}
        </TableBody>
      </Table>
    );
  }

  it("renders `empty` as one full-width row when the body has no rows", () => {
    const { container } = render(<Units units={[]} empty="No units yet" />);
    const row = container.querySelector("tbody tr[data-table-empty]")!;
    expect(row).not.toBeNull();
    const cell = within(row as HTMLElement).getByText("No units yet");
    // Measured from the head row: three columns, counted, not hand-written.
    expect(cell).toHaveAttribute("colspan", "3");
    expect(cell.className).toContain("text-center");
    expect(cell.className).toContain("text-[var(--text-muted)]");
  });

  it("shows the rows, not `empty`, once there are rows", () => {
    const { container } = render(<Units units={["A1"]} empty="No units yet" />);
    expect(screen.queryByText("No units yet")).not.toBeInTheDocument();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("TableEmpty takes an explicit colSpan", () => {
    render(
      <Table>
        <TableBody>
          <TableEmpty colSpan={5}>No line items</TableEmpty>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText("No line items")).toHaveAttribute("colspan", "5");
  });

  it("density=none drops every cell's padding", () => {
    render(
      <Table density="none">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Rate</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>8.1%</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    for (const text of ["Rate", "8.1%"]) {
      const cls = screen.getByText(text).className;
      expect(cls).toContain("p-0");
      expect(cls).not.toMatch(/\bp[xy]-/);
    }
    expect(screen.getByRole("table").className).not.toContain("text-xs");
  });

  it("layout sets table-layout, and nothing when unset", () => {
    const { rerender } = render(<Ledger layout="fixed" />);
    expect(screen.getByRole("table").className).toContain("table-fixed");
    rerender(<Ledger layout="auto" />);
    expect(screen.getByRole("table").className).toContain("table-auto");
    rerender(<Ledger />);
    expect(screen.getByRole("table").className).not.toMatch(/table-(fixed|auto)/);
  });
});

describe("Table 0.11.0 (keksdose's VAT summary)", () => {
  it("TableHeaderCell takes a size and a weight; defaults unchanged", () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Default</TableHeaderCell>
            <TableHeaderCell size="sm" weight="normal">
              Quiet
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableHeaderCell>Row</TableHeaderCell>
            <TableHeaderCell size="xs" weight="semibold">
              Row xs
            </TableHeaderCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const def = screen.getByText("Default").className;
    expect(def).toContain("text-xs");
    expect(def).toContain("font-medium");
    expect(def).toContain("align-bottom");
    const quiet = screen.getByText("Quiet").className;
    expect(quiet).toContain("text-sm");
    expect(quiet).not.toContain("text-xs");
    expect(quiet).toContain("font-normal");
    expect(quiet).not.toContain("font-medium");
    const row = screen.getByText("Row").className;
    expect(row).not.toMatch(/text-(xs|sm)\b/);
    expect(row).toContain("align-top");
    expect(row).not.toContain("align-bottom");
    expect(screen.getByText("Row xs").className).toContain("text-xs");
    expect(screen.getByText("Row xs").className).toContain("font-semibold");
  });

  it("valign on the row reaches its cells; a cell's own wins", () => {
    render(
      <Table>
        <TableHead>
          <TableRow valign="middle">
            <TableHeaderCell>Rate</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow valign="middle" data-testid="row">
            <TableHeaderCell>Label</TableHeaderCell>
            <TableCell>Field</TableCell>
            <TableCell valign="bottom">Own</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Plain</TableCell>
            <TableCell valign="middle">Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByTestId("row").className).toContain("align-middle");
    for (const t of ["Rate", "Label", "Field", "Cell"]) {
      expect(screen.getByText(t).className).toContain("align-middle");
      expect(screen.getByText(t).className).not.toMatch(/align-(top|bottom)/);
    }
    expect(screen.getByText("Own").className).toContain("align-bottom");
    expect(screen.getByText("Own").className).not.toContain("align-middle");
    expect(screen.getByText("Plain").className).toContain("align-top");
  });
});
