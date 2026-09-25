import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
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
