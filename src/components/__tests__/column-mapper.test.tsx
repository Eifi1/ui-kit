import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("leaves the required mark off when every role is required — it would tell no option apart", () => {
    // Kurvenschmiede (0.24): "Zeit (s) (erforderl…" on a phone, the mark cutting the
    // role's own name short, on every option alike.
    render(<ColumnMapper roles={CURVE} onChange={vi.fn()} />);
    paste(RECORDING);
    const select = screen.getByRole("combobox", { name: "What does column “t” hold?" });
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Ignore",
      "Time",
      "Setpoint",
      "Actual",
    ]);
    expect(screen.queryByText(/\(required\)/)).not.toBeInTheDocument();
  });

  it("forwards bodyProps and rowProps to the preview table", () => {
    render(
      <ColumnMapper
        roles={CURVE}
        onChange={vi.fn()}
        defaultText={RECORDING}
        bodyProps={{ "data-private": "" }}
        rowProps={(row, index) => ({ "data-testid": `sample-${index}`, "data-first": row[0] })}
      />,
    );
    const body = screen.getAllByRole("rowgroup")[1];
    expect(body.tagName).toBe("TBODY");
    expect(body).toHaveAttribute("data-private", "");
    expect(screen.getByTestId("sample-2")).toHaveAttribute("data-first", "0,2");
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

  it("marks the required roles where some are not, and not a group's members", () => {
    render(<Bank />);
    const select = screen.getByRole("combobox", { name: "What does column “Soll” hold?" });
    // Shown with the short mark (0.25), named with the word — see column-mapper-required-025.
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Ignore",
      "Booking date *",
      "Amount",
      "Debit",
      "Credit",
      "Payee",
    ]);
    expect(within(select).getByRole("option", { name: "Booking date (required)" })).toBeInTheDocument();
  });

  it("puts bodyProps on the <tbody> and rowProps on each previewed row", () => {
    // keksdose #336: demo mode blurs `[data-private]`, which it had to set on the body
    // from a layout effect after every commit.
    const rowProps = vi.fn((row: readonly string[], index: number) =>
      index === 0 ? { "data-first": "", className: "own-row", id: `row-${row[0]}` } : undefined,
    );
    render(
      <ColumnRoleTable
        header={["a", "b"]}
        rows={[
          ["1", "x"],
          ["2", "y"],
          ["3", "z"],
        ]}
        previewRows={2}
        roles={CURVE}
        mapping={{ time: 0 }}
        onMappingChange={vi.fn()}
        bodyProps={{ "data-private": "", className: "own-body" }}
        rowProps={rowProps}
      />,
    );
    const [head, body] = screen.getAllByRole("rowgroup");
    expect(head).not.toHaveAttribute("data-private");
    expect(body).toHaveAttribute("data-private", "");
    // Added to the body's own classes, not in place of them.
    expect(body.className).toContain("own-body");
    expect(body.className).toContain("[&>tr:last-child]:border-b-0");
    // Called for the drawn rows only, with the row's cells and its index.
    expect(rowProps.mock.calls).toEqual([
      [["1", "x"], 0],
      [["2", "y"], 1],
    ]);
    const [first, second] = within(body).getAllByRole("row");
    expect(first).toHaveAttribute("data-first", "");
    expect(first).toHaveAttribute("id", "row-1");
    expect(first.className).toContain("own-row");
    expect(first.className).toContain("border-b");
    expect(second).not.toHaveAttribute("data-first");
  });

  describe("edge fade", () => {
    afterEach(() => vi.restoreAllMocks());

    const size = (el: HTMLElement, scrollWidth: number, clientWidth: number) => {
      Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
      Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
    };
    // The kit Table's scroll wrapper is the `<table>`'s parent; the fade sits on the
    // box round it.
    const scrollerOf = () => screen.getByRole("table").parentElement!;
    const fadeBox = (container: HTMLElement) =>
      container.querySelector<HTMLElement>('[data-slot="column-role-table-scroll"]')!;

    it("paints nothing while the columns fit", () => {
      const { container } = render(<Bank />);
      size(scrollerOf(), 300, 300);
      fireEvent.scroll(scrollerOf());
      expect(fadeBox(container).style.maskImage).toBe("");
      expect(fadeBox(container)).not.toHaveAttribute("data-overflow");
    });

    it("fades the edge with columns behind it, then both once scrolled into the middle", () => {
      const { container } = render(<Bank />);
      const scroller = scrollerOf();
      size(scroller, 600, 300);
      fireEvent.scroll(scroller);
      // (jsdom's style parser drops a gradient with a `calc()` stop, so the end-side
      // mask itself is only readable in a browser; the start side's has none.)
      expect(fadeBox(container)).toHaveAttribute("data-overflow", "end");
      scroller.scrollLeft = 100;
      fireEvent.scroll(scroller);
      expect(fadeBox(container)).toHaveAttribute("data-overflow", "both");
      scroller.scrollLeft = 300;
      fireEvent.scroll(scroller);
      expect(fadeBox(container)).toHaveAttribute("data-overflow", "start");
      expect(fadeBox(container).style.maskImage).toMatch(/^linear-gradient\(to right, transparent, (#000|rgb\(0, 0, 0\)) 24px, /);
    });

    it("in RTL the hidden columns are at the end, which is the left", () => {
      const { container } = render(
        <div dir="rtl" style={{ direction: "rtl" }}>
          <Bank />
        </div>,
      );
      size(scrollerOf(), 600, 300);
      fireEvent.scroll(scrollerOf());
      expect(fadeBox(container)).toHaveAttribute("data-overflow", "end");
      expect(fadeBox(container).style.maskImage).toMatch(/^linear-gradient\(to right, transparent, /);
    });

    it("scrolls a role select focused behind the edge clear of the fade", () => {
      render(<Bank />);
      const scroller = scrollerOf();
      size(scroller, 600, 300);
      const scrollBy = vi.fn();
      scroller.scrollBy = scrollBy as unknown as typeof scroller.scrollBy;
      vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ left: 0, right: 300 } as DOMRect);
      const select = screen.getByRole("combobox", { name: "What does column “Haben” hold?" });
      vi.spyOn(select.closest("th")!, "getBoundingClientRect").mockReturnValue({ left: 200, right: 340 } as DOMRect);
      fireEvent.focus(select);
      expect(scrollBy).toHaveBeenCalledWith({ left: 64 });
    });

    it("leaves a select clear of both edges where it is", () => {
      render(<Bank />);
      const scroller = scrollerOf();
      size(scroller, 600, 300);
      const scrollBy = vi.fn();
      scroller.scrollBy = scrollBy as unknown as typeof scroller.scrollBy;
      vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ left: 0, right: 300 } as DOMRect);
      const select = screen.getByRole("combobox", { name: "What does column “Empfänger” hold?" });
      vi.spyOn(select.closest("th")!, "getBoundingClientRect").mockReturnValue({ left: 60, right: 200 } as DOMRect);
      fireEvent.focus(select);
      expect(scrollBy).not.toHaveBeenCalled();
    });
  });

  it("disables every role select while the caller's table is being replaced", () => {
    render(
      <ColumnRoleTable header={["a"]} rows={[["1"]]} roles={CURVE} mapping={{}} onMappingChange={vi.fn()} disabled />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
