import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ColumnMapper, ColumnRoleTable } from "../column-mapper";
import type { ColumnMapperResult, ColumnMapping, ColumnRole } from "../../lib/column-mapping";
import { tableNumber } from "../../lib/table-text";

type CurveRole = "time" | "setpoint" | "actual";
const CURVE: ColumnRole<CurveRole>[] = [
  { value: "time", label: "Time", required: true, numeric: true },
  { value: "setpoint", label: "Setpoint", required: true, numeric: true },
  { value: "actual", label: "Actual", required: true, numeric: true },
];

type BankRole = "date" | "amount" | "debit" | "credit" | "payee";
const BANK: ColumnRole<BankRole>[] = [
  { value: "date", label: "Booking date", required: true },
  { value: "amount", label: "Amount", required: "money" },
  { value: "debit", label: "Debit", required: "money" },
  { value: "credit", label: "Credit", required: "money" },
  { value: "payee", label: "Payee" },
];

/** A recorder's export: German convention, a header, a footer. */
const RECORDING = ["t;soll;ist", "0;1,5;1,4", "0,1;2,5;2,4", "0,2;3,5;3,3", "end of record"].join("\n");

function paste(text: string) {
  fireEvent.change(screen.getByLabelText("Paste a table"), { target: { value: text } });
}

function lastResult<R extends string>(onChange: ReturnType<typeof vi.fn>): ColumnMapperResult<R> | null {
  return onChange.mock.calls[onChange.mock.calls.length - 1][0] as ColumnMapperResult<R> | null;
}

describe("ColumnMapper", () => {
  it("parses a paste, says what it assumed, and hands over the rows with the mapping", () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    paste(RECORDING);

    expect(screen.getByText("3 columns, 3 rows · separated by semicolons · decimal comma (1,5)")).toBeInTheDocument();
    const result = lastResult<CurveRole>(onChange)!;
    expect(result.complete).toBe(true);
    expect(result.mapping).toEqual({ time: 0, setpoint: 1, actual: 2 });
    expect(result.decimalComma).toBe(true);
    // Strings, which the caller converts in the table's own convention.
    expect(result.rows.map((row) => tableNumber(row[result.mapping.actual!], result.decimalComma))).toEqual([
      1.4, 2.4, 3.3,
    ]);
    expect(result.unread).toEqual([{ line: 5, text: "end of record" }]);
  });

  it("lists every line it could not read, by number and with its text", () => {
    render(<ColumnMapper roles={CURVE} onChange={vi.fn()} />);
    paste(RECORDING);
    fireEvent.click(screen.getByRole("button", { name: "1 line could not be read" }));
    expect(screen.getByText("Line 5 could not be read")).toBeInTheDocument();
    expect(screen.getByText("end of record")).toBeInTheDocument();
  });

  it("is null for an empty box", () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    paste(RECORDING);
    paste("");
    expect(lastResult(onChange)).toBeNull();
  });

  it("moves a role picked on another column, and names what is still needed", () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    paste(RECORDING);
    // The first column takes "Actual": it leaves the third, which falls back to Ignore.
    fireEvent.change(screen.getByRole("combobox", { name: "What does column “t” hold?" }), {
      target: { value: "actual" },
    });
    expect(lastResult<CurveRole>(onChange)!.mapping).toEqual({ time: null, setpoint: 1, actual: 0 });
    expect(screen.getByRole("combobox", { name: "What does column “ist” hold?" })).toHaveValue("");
    expect(screen.getByText("Still needed: Time.")).toBeInTheDocument();
    expect(lastResult(onChange)!.complete).toBe(false);
  });

  it("flags required roles in the role list", () => {
    render(<ColumnMapper roles={CURVE} onChange={vi.fn()} />);
    paste(RECORDING);
    const select = screen.getByRole("combobox", { name: "What does column “t” hold?" });
    expect(within(select).getByRole("option", { name: "Time (required)" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Ignore" })).toBeInTheDocument();
  });

  it("keeps the roles when the header checkbox is toggled, and re-guesses when the column count changes", () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    paste("0;1;2;3\n1;2;3;4");
    fireEvent.change(screen.getByRole("combobox", { name: "What does column “Column 4” hold?" }), {
      target: { value: "time" },
    });
    expect(lastResult<CurveRole>(onChange)!.mapping.time).toBe(3);

    const header = screen.getByRole("checkbox", { name: "The first line names the columns" });
    expect(header).not.toBeChecked();
    fireEvent.click(header);
    // The first line is now the names, and the roles stay on their columns.
    expect(lastResult<CurveRole>(onChange)!.mapping.time).toBe(3);
    expect(lastResult<CurveRole>(onChange)!.header).toEqual(["0", "1", "2", "3"]);
    expect(lastResult(onChange)!.rows).toHaveLength(1);

    paste("0;1;2\n1;2;3");
    expect(lastResult<CurveRole>(onChange)!.mapping).toEqual({ time: 0, setpoint: 1, actual: 2 });
  });

  it("reads a chosen file, as Windows-1252 when it is not UTF-8", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColumnMapper
        roles={[{ value: "payee", label: "Empfänger", required: true }]}
        onChange={onChange}
      />,
    );
    // "Empfänger;Betrag\nExample Ltd;-12,50" with the ä as the byte 0xE4.
    const bytes = new Uint8Array([
      ...new TextEncoder().encode("Empf"),
      0xe4,
      ...new TextEncoder().encode("nger;Betrag\nExample Ltd;-12,50"),
    ]);
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    // The button's own picker is the last one rendered.
    const input = inputs[inputs.length - 1];
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([bytes], "export.csv", { type: "text/csv" })] } });
    });
    await waitFor(() => expect(lastResult(onChange)?.header).toEqual(["Empfänger", "Betrag"]));
    // Named like the role, so it is placed on its column.
    expect(lastResult(onChange)!.mapping).toEqual({ payee: 0 });
  });

  it("takes a file dropped on the paste box instead of letting the browser open it", async () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    const box = screen.getByLabelText("Paste a table");
    const file = new File([RECORDING], "run.csv", { type: "text/csv" });
    const dataTransfer = { files: [file], types: ["Files"], dropEffect: "none" };
    expect(fireEvent.dragOver(box, { dataTransfer })).toBe(false);
    await act(async () => {
      fireEvent.drop(box, { dataTransfer });
    });
    await waitFor(() => expect(lastResult(onChange)?.complete).toBe(true));
    expect(box).toHaveValue(RECORDING);
  });

  it("refuses a dropped file of the wrong type, and says so", async () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    const box = screen.getByLabelText("Paste a table");
    const file = new File(["x"], "photo.png", { type: "image/png" });
    await act(async () => {
      fireEvent.drop(box, { dataTransfer: { files: [file], types: ["Files"] } });
    });
    expect(screen.getByText("Only .csv, .tsv, .txt, .dat, .asc files")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says so when a file's bytes cannot be read at all", async () => {
    const onChange = vi.fn();
    const { container } = render(<ColumnMapper roles={CURVE} onChange={onChange} />);
    const file = new File(["x"], "broken.csv", { type: "text/csv" });
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.reject(new Error("gone")) });
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    await act(async () => {
      fireEvent.change(inputs[inputs.length - 1], { target: { files: [file] } });
    });
    await waitFor(() => expect(screen.getByText("“broken.csv” could not be read")).toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange once on mount with the result of a default text", () => {
    const onChange = vi.fn();
    render(<ColumnMapper roles={CURVE} onChange={onChange} defaultText={RECORDING} />);
    expect(onChange).toHaveBeenCalled();
    expect(lastResult(onChange)!.complete).toBe(true);
  });

  it("does not loop under a parent that re-renders with fresh roles on every change", () => {
    let renders = 0;
    function Parent() {
      const [rows, setRows] = useState(0);
      renders += 1;
      return (
        <>
          <ColumnMapper
            roles={CURVE.map((role) => ({ ...role }))}
            onChange={(result) => setRows(result?.rows.length ?? 0)}
          />
          <output>{rows}</output>
        </>
      );
    }
    render(<Parent />);
    paste(RECORDING);
    expect(screen.getByRole("status")).toHaveTextContent("3");
    expect(renders).toBeLessThan(6);
  });

  it("says when a text has content and no row", () => {
    render(<ColumnMapper roles={CURVE} onChange={vi.fn()} />);
    paste("t;soll;ist");
    expect(screen.getByText("No line of this text reads as a row of the table.")).toBeInTheDocument();
  });
});

describe("ColumnRoleTable", () => {
  function Bank({ onMapping }: { onMapping?: (next: ColumnMapping<BankRole>) => void }) {
    // keksdose's shape: the server's column names and sample rows, a mapping with
    // other fields beside the roles.
    const [mapping, setMapping] = useState({
      date: 0 as number | null,
      amount: null as number | null,
      debit: null as number | null,
      credit: null as number | null,
      payee: null as number | null,
      delimiter: ";",
    });
    return (
      <ColumnRoleTable
        header={["Buchungstag", "Empfänger", "Soll", "Haben"]}
        rows={Array.from({ length: 8 }, (_, index) => [`0${index + 1}.02.2026`, "Example Ltd", "12,50", ""])}
        totalRows={120}
        roles={BANK}
        mapping={mapping}
        onMappingChange={(next) => {
          expect(next.delimiter).toBe(";");
          setMapping(next);
          onMapping?.(next);
        }}
      />
    );
  }

  it("previews the first rows of a table it is handed, and says how many there are", () => {
    render(<Bank />);
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.getByText("The first 5 of 120 rows")).toBeInTheDocument();
  });

  it("names a required group as one of its roles until one is placed", () => {
    const onMapping = vi.fn();
    render(<Bank onMapping={onMapping} />);
    expect(screen.getByText("Still needed: either Amount, Debit, or Credit.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "What does column “Soll” hold?" }), {
      target: { value: "debit" },
    });
    expect(onMapping).toHaveBeenLastCalledWith(expect.objectContaining({ debit: 2, date: 0 }));
    expect(screen.queryByText(/Still needed/)).not.toBeInTheDocument();
  });

  it("dims the values of an ignored column", () => {
    render(<Bank />);
    const cells = screen.getAllByRole("cell");
    expect(cells[0]).not.toHaveAttribute("data-ignored");
    expect(cells[1]).toHaveAttribute("data-ignored", "true");
  });

  it("names columns without a header by their position", () => {
    render(
      <ColumnRoleTable header={null} rows={[["1", "2"]]} roles={CURVE} mapping={{}} onMappingChange={vi.fn()} />,
    );
    expect(screen.getByRole("combobox", { name: "What does column “Column 2” hold?" })).toBeInTheDocument();
    expect(screen.getByText("Still needed: Time, Setpoint, and Actual.")).toBeInTheDocument();
  });

  it("disables every role select while the caller's table is being replaced", () => {
    render(
      <ColumnRoleTable header={["a"]} rows={[["1"]]} roles={CURVE} mapping={{}} onMappingChange={vi.fn()} disabled />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
