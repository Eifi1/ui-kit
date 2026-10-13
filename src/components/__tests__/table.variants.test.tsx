import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../table";

/**
 * 0.12.0 on the static Table: `framed`, statement row variants, row dividers (table-wide
 * and per row), an unruled head, and section detection under raw `<thead>`/`<tbody>`.
 */

describe("Table framed", () => {
  it("puts a rounded border on the scroll wrapper", () => {
    render(
      <Table framed aria-label="Lines">
        <TableBody>
          <TableRow>
            <TableCell>A</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const wrapper = screen.getByRole("table").parentElement!;
    expect(wrapper).toHaveAttribute("data-framed", "true");
    expect(wrapper).toHaveClass("rounded-md", "border");
  });

  it("is off by default", () => {
    render(
      <Table>
        <TableBody />
      </Table>,
    );
    expect(screen.getByRole("table").parentElement).not.toHaveClass("rounded-md");
  });
});

describe("TableRow variant", () => {
  it("styles group, subtotal and total lines, and leaves them out of zebra and hover", () => {
    render(
      <Table zebra hover>
        <TableBody>
          <TableRow variant="group">
            <TableCell colSpan={2}>Current assets</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Cash</TableCell>
          </TableRow>
          <TableRow variant="subtotal">
            <TableCell>Subtotal</TableCell>
          </TableRow>
          <TableRow variant="total">
            <TableCell>Total</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const [group, record, subtotal, total] = screen.getAllByRole("row");
    expect(group).toHaveAttribute("data-variant", "group");
    expect(group).toHaveClass("font-semibold");
    expect(group.className).not.toMatch(/even:|hover:/);
    expect(record).not.toHaveAttribute("data-variant");
    expect(record.className).toMatch(/even:bg-/);
    expect(subtotal).toHaveClass("font-medium");
    expect(total).toHaveClass("border-t-2", "font-semibold");
  });
});

describe("row dividers", () => {
  it("are on by default, off with rowDividers={false}, and per row with `bordered`", () => {
    const { unmount } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>A</TableCell>
          </TableRow>
          <TableRow bordered={false}>
            <TableCell>B</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    let [a, b] = screen.getAllByRole("row");
    expect(a).toHaveClass("border-b");
    expect(b).not.toHaveClass("border-b");
    unmount();

    render(
      <Table rowDividers={false}>
        <TableBody>
          <TableRow>
            <TableCell>A</TableCell>
          </TableRow>
          <TableRow bordered>
            <TableCell>B</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    [a, b] = screen.getAllByRole("row");
    expect(a).not.toHaveClass("border-b");
    expect(b).toHaveClass("border-b");
  });
});

describe("TableHead bordered", () => {
  it("draws the rule by default and drops it with bordered={false}", () => {
    const { container, unmount } = render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>H</TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    expect(container.querySelector("thead")).toHaveClass("border-b");
    unmount();
    const quiet = render(
      <Table>
        <TableHead bordered={false}>
          <TableRow>
            <TableHeaderCell>H</TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    expect(quiet.container.querySelector("thead")).not.toHaveClass("border-b");
  });
});

describe("section detection under raw section tags", () => {
  it("a TableHeaderCell in a raw <thead> heads its column", () => {
    render(
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Rate</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TableHeaderCell>Net</TableHeaderCell>
          </tr>
        </tbody>
      </Table>,
    );
    const head = screen.getByText("Rate");
    expect(head).toHaveAttribute("scope", "col");
    expect(head).toHaveClass("text-xs", "align-bottom");
    // A header cell in a body row still labels its row.
    expect(screen.getByText("Net")).toHaveAttribute("scope", "row");
  });

  it("a TableRow in a raw <thead> draws no body divider or zebra", () => {
    render(
      <Table zebra>
        <thead>
          <TableRow>
            <TableHeaderCell>Rate</TableHeaderCell>
          </TableRow>
        </thead>
      </Table>,
    );
    const row = screen.getByRole("row");
    expect(row).not.toHaveClass("border-b");
    expect(row.className).not.toMatch(/even:/);
  });
});
