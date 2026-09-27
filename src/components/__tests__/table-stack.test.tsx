import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../table";

/** lenkbank L5: a prose table stacks into labelled blocks on a phone (opt-in). */
function Terms({ stack }: { stack?: "phone" }) {
  return (
    <Table stack={stack} aria-label="PID terms">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Anteil</TableHeaderCell>
          <TableHeaderCell>Was Erhöhen bewirkt</TableHeaderCell>
          <TableHeaderCell>Was es kostet</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>P</TableCell>
          <TableCell>Schnellere Reaktion</TableCell>
          <TableCell>Mehr Überschwingen</TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={3}>Gruppe</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("Table stack=\"phone\"", () => {
  it("labels each further cell with its column header and keeps the table roles", () => {
    render(<Terms stack="phone" />);
    expect(screen.getByText("P")).not.toHaveAttribute("data-label");
    expect(screen.getByText("Schnellere Reaktion")).toHaveAttribute("data-label", "Was Erhöhen bewirkt");
    expect(screen.getByText("Mehr Überschwingen")).toHaveAttribute("data-label", "Was es kostet");
    expect(screen.getByText("Gruppe")).not.toHaveAttribute("data-label");
    expect(screen.getByRole("table", { name: "PID terms" }).className).toContain("max-sm:block");
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "Schnellere Reaktion" })).toBeInTheDocument();
  });

  it("changes nothing without the prop", () => {
    render(<Terms />);
    expect(screen.getByText("Schnellere Reaktion")).not.toHaveAttribute("data-label");
    expect(screen.getByRole("table").className).not.toContain("max-sm:block");
  });
});
