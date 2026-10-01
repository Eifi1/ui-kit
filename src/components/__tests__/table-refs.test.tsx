import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
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

/**
 * 0.16.0 (keksdose): every Table part hands its `ref` to its DOM element. keksdose's
 * budget page scrolled a row into view through `useId` + `getElementById` because
 * `<TableRow ref>` did not type-check.
 */
describe("Table parts take a ref", () => {
  it("points each ref at its own element", () => {
    const refs = {
      table: createRef<HTMLTableElement>(),
      head: createRef<HTMLTableSectionElement>(),
      body: createRef<HTMLTableSectionElement>(),
      foot: createRef<HTMLTableSectionElement>(),
      headRow: createRef<HTMLTableRowElement>(),
      row: createRef<HTMLTableRowElement>(),
      th: createRef<HTMLTableCellElement>(),
      rowTh: createRef<HTMLTableCellElement>(),
      td: createRef<HTMLTableCellElement>(),
      caption: createRef<HTMLTableCaptionElement>(),
    };
    render(
      <Table ref={refs.table}>
        <TableCaption ref={refs.caption}>Budget</TableCaption>
        <TableHead ref={refs.head}>
          <TableRow ref={refs.headRow}>
            <TableHeaderCell ref={refs.th}>Line</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody ref={refs.body}>
          <TableRow ref={refs.row}>
            <TableHeaderCell ref={refs.rowTh}>Rent</TableHeaderCell>
            <TableCell ref={refs.td}>1200</TableCell>
          </TableRow>
        </TableBody>
        <TableFoot ref={refs.foot}>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1200</TableCell>
          </TableRow>
        </TableFoot>
      </Table>,
    );
    expect(refs.table.current?.tagName).toBe("TABLE");
    expect(refs.caption.current?.tagName).toBe("CAPTION");
    expect(refs.head.current?.tagName).toBe("THEAD");
    expect(refs.body.current?.tagName).toBe("TBODY");
    expect(refs.foot.current?.tagName).toBe("TFOOT");
    expect(refs.headRow.current?.closest("thead")).toBe(refs.head.current);
    expect(refs.row.current?.closest("tbody")).toBe(refs.body.current);
    expect(refs.th.current).toHaveAttribute("scope", "col");
    expect(refs.rowTh.current).toHaveAttribute("scope", "row");
    expect(refs.td.current).toHaveTextContent("1200");
  });

  it("keeps the part's own DOM reading working beside a caller's ref (raw <thead>)", () => {
    // Under a raw <thead> the row and head cell read their section off the DOM through
    // their own ref; a caller's ref must not replace it.
    const row = vi.fn();
    const th = createRef<HTMLTableCellElement>();
    render(
      <Table>
        <thead>
          <TableRow ref={row}>
            <TableHeaderCell ref={th}>Line</TableHeaderCell>
          </TableRow>
        </thead>
      </Table>,
    );
    expect(row).toHaveBeenCalledWith(expect.any(HTMLTableRowElement));
    expect(th.current).toHaveAttribute("scope", "col");
  });

  it("TableEmpty's ref is its row", () => {
    const ref = createRef<HTMLTableRowElement>();
    render(
      <Table>
        <TableBody>
          <TableEmpty ref={ref}>Nothing</TableEmpty>
        </TableBody>
      </Table>,
    );
    expect(ref.current).toHaveAttribute("data-table-empty");
  });
});
