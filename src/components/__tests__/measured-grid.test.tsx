import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MeasuredGrid, useMeasuredRows } from "../measured-grid";
import type { MeasuredGridProps } from "../measured-grid";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * `MeasuredGrid` and `useMeasuredRows`, moved from Lenkbank (`shared/ui/measured-grid`).
 *
 * The first half is the original suite's intent, kept: a cell held as text while it is
 * typed, a pasted block landing from the focused cell, a header line dropped, the unit
 * under the column. The lexing under it is tested in `lib/__tests__` (table-text); what
 * is here is what the grid does with the answer.
 *
 * The second half is what the move was FOR — the original was a `<table>` of inputs
 * with fifteen tab stops a row, arrows that went only up and down, and invalid cells
 * marked in red text alone. So: one tab stop, the APG key map, `aria-invalid`, and a
 * windowed grid that still tells a screen reader how big it really is.
 */

const COLUMNS = [{ label: "x" }, { label: "y" }, { label: "z", unit: "N" }];

/** The grid over the hook, the way every caller wires it, reporting what the hook says. */
function Harness({
  initial = [],
  onState,
  ...props
}: Partial<MeasuredGridProps> & {
  initial?: number[][];
  onState?: (state: { rows: number[][]; ready: boolean; problems: number; cells: string[][] }) => void;
}) {
  const table = useMeasuredRows(initial);
  onState?.({ rows: table.rows, ready: table.ready, problems: table.problems, cells: table.cells });
  return <MeasuredGrid label="Table" columns={COLUMNS} {...table.props} {...props} />;
}

const cell = (column: string, row: number) =>
  screen.getByRole("textbox", { name: `${column}, row ${row}` });
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, ...init });
/** Arrive in a cell the way the keyboard does — which selects its text. */
const enter = (element: HTMLElement) => act(() => element.focus());
const paste = (element: HTMLElement, text: string) =>
  fireEvent.paste(element, { clipboardData: { getData: () => text } });

describe("useMeasuredRows", () => {
  it("holds a cell as text while it is being typed, and as a number when it is one", async () => {
    // "-" and "1." are states a number passes through on the way to being one.
    // Parsing on every keystroke turns each into a NaN and then a 0, which is how a
    // minus sign becomes a zero under somebody's hands.
    const user = userEvent.setup();
    let state = { rows: [] as number[][], ready: false };
    render(<Harness onState={(next) => (state = next)} />);

    await user.type(cell("x", 1), "-");
    expect(cell("x", 1)).toHaveValue("-");
    expect(state.ready).toBe(false);
    expect(state.rows).toEqual([]);
  });

  it("treats an empty cell as a hole, not a zero, and wants two whole rows", () => {
    const { result } = renderHook(() => useMeasuredRows([[1, 2, 3]]));
    expect(result.current.ready).toBe(false); // one row is not a curve

    act(() => result.current.setCells([["1", "2", "3"], ["4", "", "6"]]));
    expect(result.current.ready).toBe(false);
    expect(result.current.rows).toEqual([]);

    // A wholly empty row is what walking off the bottom leaves; it is not a row.
    act(() => result.current.setCells([["1", "2", "3"], ["4", "5", "6"], ["", "", ""]]));
    expect(result.current.ready).toBe(true);
    expect(result.current.rows).toEqual([[1, 2, 3], [4, 5, 6]]);
  });

  it("counts the cells that are typed but are not numbers", () => {
    const { result } = renderHook(() => useMeasuredRows([]));
    act(() => result.current.setCells([["1", "abc", ""], ["1e", "2", "3"]]));
    expect(result.current.problems).toBe(2);
    expect(result.current.ready).toBe(false);
  });

  it("writes computed numbers rounded, and with the locale's decimal mark", () => {
    const { result } = renderHook(() =>
      useMeasuredRows(() => [[1.23456, 2.5]], { digits: 2, locale: "de-DE" }),
    );
    expect(result.current.cells).toEqual([["1,23", "2,5"]]);

    act(() => result.current.setRows([[0.1 + 0.2, 10], [1, 2]]));
    expect(result.current.cells).toEqual([["0,3", "10"], ["1", "2"]]);
    // Read back through the cell rule, where a comma is always the decimal mark.
    expect(result.current.rows).toEqual([[0.3, 10], [1, 2]]);
  });

  it("follows the provider's locale when given none", () => {
    const { result } = renderHook(() => useMeasuredRows([[1.5]]), {
      wrapper: ({ children }) => <UiKitProvider locale="de-DE">{children}</UiKitProvider>,
    });
    expect(result.current.cells).toEqual([["1,5"]]);
  });
});

describe("MeasuredGrid — paste", () => {
  it("fills a pasted block from the cell it was pasted into, growing the table", async () => {
    let rows: number[][] = [];
    render(<Harness onState={(next) => (rows = next.rows)} />);

    paste(cell("x", 1), "0\t1\t2\n3\t4\t5\n6\t7\t8");

    expect(await screen.findByRole("textbox", { name: "z, row 3" })).toHaveValue("8");
    expect(rows).toEqual([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]);
  });

  it("drops the columns past the last one, from wherever the paste landed", () => {
    let cells: string[][] = [];
    render(<Harness initial={[[1, 1, 1]]} onState={(next) => (cells = next.cells)} />);

    // Two columns in from the second: the third field is a trailing timestamp.
    paste(cell("y", 1), "5\t6\t1718000001\n7\t8\t1718000002");
    expect(cells).toEqual([
      ["1", "5", "6"],
      ["", "7", "8"],
    ]);
  });

  it("skips a pasted header row, because pasted data almost always has one", () => {
    let rows: number[][] = [];
    render(<Harness onState={(next) => (rows = next.rows)} />);
    paste(cell("x", 1), "travel\tout\tback\n0\t100\t50\n1\t101\t51");
    expect(rows).toEqual([
      [0, 100, 50],
      [1, 101, 51],
    ]);
  });

  it("reads each pasted line's comma on its own evidence", () => {
    let rows: number[][] = [];
    render(<Harness onState={(next) => (rows = next.rows)} />);
    // A German tab-separated line and an English CSV line in one paste: neither
    // changes what the other's comma means.
    paste(cell("x", 1), "0,5\t1,5\t2,5\n1,2,3");
    expect(rows).toEqual([
      [0.5, 1.5, 2.5],
      [1, 2, 3],
    ]);
  });

  it("leaves one cell's worth of text to the browser", () => {
    render(<Harness />);
    // `fireEvent` answers false when the handler called preventDefault.
    expect(paste(cell("x", 1), "12,5")).toBe(true);
    expect(paste(cell("x", 1), "1\t2")).toBe(false);
  });

  it("writes pasted numbers back with the locale's mark", () => {
    let cells: string[][] = [];
    render(<Harness locale="de-DE" onState={(next) => (cells = next.cells)} />);
    paste(cell("x", 1), "0.5\t1\t2\n3;4;5");
    expect(cells[0]).toEqual(["0,5", "1", "2"]);
  });
});

describe("MeasuredGrid — header and view", () => {
  it("names the unit under the column rather than in it", () => {
    render(<Harness />);
    const header = screen.getByRole("columnheader", { name: /z/ });
    expect(within(header).getByText("N")).toBeInTheDocument();
  });

  it("reads the text view on blur, and names the line it could not read", async () => {
    const user = userEvent.setup();
    let rows: number[][] = [];
    render(<Harness initial={[[1, 2, 3]]} onState={(next) => (rows = next.rows)} />);

    await user.click(screen.getByRole("radio", { name: "Text" }));
    const text = screen.getByRole("textbox", { name: "Table" });
    expect(text).toHaveValue("1\t2\t3");

    await user.clear(text);
    await user.type(text, "1 2 3{Enter}4 five 6");
    await user.tab();
    // Re-queried: the message is a new node beside the field, and the field with it.
    const invalid = screen.getByRole("textbox", { name: "Table" });
    expect(invalid).toHaveAccessibleDescription(/Line 2 could not be read/);
    expect(invalid).toHaveAttribute("aria-invalid", "true");
    expect(rows).toEqual([]);

    await user.clear(invalid);
    await user.type(invalid, "1 2 3{Enter}4 5 6");
    await user.tab();
    expect(rows).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(screen.getByRole("textbox", { name: "Table" })).not.toHaveAttribute("aria-invalid");
  });

  it("hides the toggle when only one view is offered", () => {
    render(<Harness views={["cells"]} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});

describe("MeasuredGrid is an ARIA grid", () => {
  it("is named by its label and is ONE tab stop", () => {
    render(<Harness initial={[[1, 2, 3], [4, 5, 6]]} />);
    const grid = screen.getByRole("grid", { name: "Table" });
    const stops = [...grid.querySelectorAll("input, button")].filter(
      (element) => (element as HTMLElement).tabIndex === 0,
    );
    expect(stops).toEqual([cell("x", 1)]);
  });

  it("marks a cell that is not a number with aria-invalid and the field's invalid ring", () => {
    render(<Harness />);
    fireEvent.change(cell("x", 1), { target: { value: "abc" } });
    expect(cell("x", 1)).toHaveAttribute("aria-invalid", "true");
    expect(cell("x", 1).className).toContain("ring-[var(--danger-border)]");
    expect(screen.getByText("1 cell is not a number")).toBeInTheDocument();

    fireEvent.change(cell("x", 1), { target: { value: "1,5" } });
    expect(cell("x", 1)).not.toHaveAttribute("aria-invalid");
  });

  it("walks all four directions, and Home/End, and moves the tab stop with it", () => {
    render(<Harness initial={[[1, 2, 3], [4, 5, 6]]} />);
    enter(cell("x", 1));
    press("ArrowRight");
    expect(cell("y", 1)).toHaveFocus();
    expect(cell("y", 1)).toHaveAttribute("tabindex", "0");
    expect(cell("x", 1)).toHaveAttribute("tabindex", "-1");
    press("ArrowDown");
    expect(cell("y", 2)).toHaveFocus();
    press("ArrowLeft");
    expect(cell("x", 2)).toHaveFocus();
    press("ArrowUp");
    expect(cell("x", 1)).toHaveFocus();
    press("End");
    expect(cell("z", 1)).toHaveFocus();
    press("Home");
    expect(cell("x", 1)).toHaveFocus();
    press("End", { ctrlKey: true });
    expect(cell("z", 2)).toHaveFocus();
    press("Home", { ctrlKey: true });
    expect(cell("x", 1)).toHaveFocus();
  });

  it("reaches the row's remove button with the arrows", () => {
    render(<Harness initial={[[1, 2, 3], [4, 5, 6]]} />);
    enter(cell("z", 1));
    press("ArrowRight");
    expect(screen.getByRole("button", { name: "Remove row 1" })).toHaveFocus();
    press("ArrowDown");
    const second = screen.getByRole("button", { name: "Remove row 2" });
    expect(second).toHaveFocus();

    fireEvent.click(second);
    // The row is gone and focus stays in the column, on the row now in its place.
    expect(screen.queryByRole("textbox", { name: "x, row 2" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove row 1" })).toHaveFocus();
  });

  it("flips Left and Right under dir=rtl", () => {
    render(
      <div dir="rtl">
        <Harness initial={[[1, 2, 3]]} />
      </div>,
    );
    enter(cell("y", 1));
    press("ArrowLeft");
    expect(cell("z", 1)).toHaveFocus();
    press("ArrowRight");
    press("ArrowRight");
    expect(cell("x", 1)).toHaveFocus();
  });

  it("adds a row when Enter or ArrowDown walks off the bottom — but not after an empty one", () => {
    let cells: string[][] = [];
    render(<Harness initial={[[1, 2, 3]]} onState={(next) => (cells = next.cells)} />);
    enter(cell("y", 1));
    press("Enter");
    expect(cells).toHaveLength(2);
    expect(cell("y", 2)).toHaveFocus();

    // Holding ArrowDown must not leave a trail of blank rows.
    press("ArrowDown");
    press("ArrowDown");
    expect(cells).toHaveLength(2);
    expect(cell("y", 2)).toHaveFocus();

    press("Enter", { shiftKey: true });
    expect(cell("y", 1)).toHaveFocus();
  });
});

describe("MeasuredGrid — editing", () => {
  it("replaces a cell when typing into it, and moves on at the edge of its text", async () => {
    const user = userEvent.setup();
    let cells: string[][] = [];
    render(<Harness initial={[[1, 2, 3]]} onState={(next) => (cells = next.cells)} />);
    enter(cell("x", 1));

    await user.keyboard("42");
    expect(cells[0]).toEqual(["42", "2", "3"]);
    // Editing now: Left moves the caret inside "42" …
    press("ArrowLeft");
    expect(cell("x", 1)).toHaveFocus();
    // … and Right, with the caret at the end, crosses into the next cell.
    (cell("x", 1) as HTMLInputElement).setSelectionRange(2, 2);
    press("ArrowRight");
    expect(cell("y", 1)).toHaveFocus();
  });

  it("edits in place on F2, and Escape puts back what the cell held", async () => {
    const user = userEvent.setup();
    let cells: string[][] = [];
    // A dialog's Escape handler, listening on the document the way `useEscapeKey` does.
    const onEscape = vi.fn();
    const listen = (event: KeyboardEvent) => event.key === "Escape" && onEscape();
    document.addEventListener("keydown", listen);
    onTestFinished(() => document.removeEventListener("keydown", listen));
    render(<Harness initial={[[1, 2, 3]]} onState={(next) => (cells = next.cells)} />);
    enter(cell("x", 1));
    press("F2");
    await user.keyboard("5");
    expect(cells[0][0]).toBe("15");

    // Home stays in the text while editing.
    press("Home");
    expect(cell("x", 1)).toHaveFocus();

    press("Escape");
    expect(cells[0][0]).toBe("1");
    expect(onEscape).not.toHaveBeenCalled();

    // Not editing, Escape is not the grid's: the dialog gets it.
    press("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("walks but does not change a disabled grid", async () => {
    const user = userEvent.setup();
    let cells: string[][] = [];
    render(<Harness disabled initial={[[1, 2, 3], [4, 5, 6]]} onState={(next) => (cells = next.cells)} />);
    expect(screen.getByRole("grid")).toHaveAttribute("aria-readonly", "true");
    enter(cell("x", 1));
    await user.keyboard("9");
    press("ArrowDown");
    press("ArrowDown");
    expect(cell("x", 2)).toHaveFocus();
    expect(cells).toEqual([["1", "2", "3"], ["4", "5", "6"]]);
    expect(screen.getByRole("button", { name: /Add row/ })).toBeDisabled();
  });
});

describe("MeasuredGrid — windowing", () => {
  const many = Array.from({ length: 500 }, (_, index) => [index, index * 2, index * 3]);

  it("mounts only the rows in the window, and says how many there really are", () => {
    render(<Harness initial={many} />);
    const grid = screen.getByRole("grid");
    // Header row + 500.
    expect(grid).toHaveAttribute("aria-rowcount", "501");
    const mounted = within(grid).getAllByRole("row");
    expect(mounted.length).toBeLessThan(60);
    expect(mounted[1]).toHaveAttribute("aria-rowindex", "2");
    expect(screen.getByText("500 points")).toBeInTheDocument();
  });

  it("focuses a row that was not mounted when the key was pressed", () => {
    render(<Harness initial={many} />);
    expect(screen.queryByRole("textbox", { name: "x, row 500" })).toBeNull();
    enter(cell("x", 1));
    press("End", { ctrlKey: true });
    const target = cell("z", 500);
    expect(target).toHaveFocus();
    expect(target.closest("[role=row]")).toHaveAttribute("aria-rowindex", "501");
    press("PageUp");
    expect(cell("z", 490)).toHaveFocus();
  });

  it("keeps the tab stop's row mounted however far the window has moved", () => {
    render(<Harness initial={many} />);
    enter(cell("x", 1));
    press("End", { ctrlKey: true });
    press("Home", { ctrlKey: true });
    // Row 500 is out of the window again; row 1 holds the only tab stop and is there.
    expect(screen.queryByRole("textbox", { name: "x, row 500" })).toBeNull();
    expect(cell("x", 1)).toHaveAttribute("tabindex", "0");
  });
});

describe("MeasuredGrid — chrome", () => {
  it("adds a row and puts the caret in it", () => {
    render(<Harness initial={[[1, 2, 3]]} />);
    fireEvent.click(screen.getByRole("button", { name: /Add row/ }));
    expect(cell("x", 2)).toHaveFocus();
  });

  it("clears the table and keeps focus inside the grid", () => {
    let cells: string[][] = [[""]];
    render(<Harness initial={[[1, 2, 3]]} onState={(next) => (cells = next.cells)} />);
    fireEvent.click(screen.getByRole("button", { name: /Clear table/ }));
    expect(cells).toEqual([]);
    expect(cell("x", 1)).toHaveFocus();
    expect(cell("x", 1)).toHaveValue("");
  });

  it("speaks the provider's labels", () => {
    function Controlled() {
      const [cells, setCells] = useState<string[][]>([["1", "2", "3"]]);
      return <MeasuredGrid label="Tabelle" columns={COLUMNS} cells={cells} onCells={setCells} />;
    }
    render(
      <UiKitProvider
        labels={{
          measuredGrid: {
            addRow: "Zeile hinzufügen",
            removeRow: (row) => `Zeile ${row} entfernen`,
            cell: (column, row) => `${column} ${row}`,
          },
        }}
      >
        <Controlled />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: /Zeile hinzufügen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zeile 1 entfernen" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "x 1" })).toHaveValue("1");
  });
});
