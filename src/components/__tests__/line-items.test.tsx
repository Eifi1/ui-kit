import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LineItems, type LineItemsColumn, type LineItemsProps } from "../line-items";
import { Input } from "../ui";

interface Line {
  id: string;
  account: string;
  amount: string;
}

let next = 0;
const blank = (): Line => ({ id: `l${++next}`, account: "", amount: "" });

const COLUMNS: LineItemsColumn<Line>[] = [
  { key: "account", header: "Account", render: ({ item, label }) => <Input aria-label={label} defaultValue={item.account} /> },
  {
    key: "amount",
    header: "Amount",
    width: "7rem",
    align: "end",
    render: ({ item, label }) => <Input aria-label={label} defaultValue={item.amount} />,
  },
];

/** Plain state, the way a hand-managed wizard step keeps its lines. */
function Lines(props: Partial<LineItemsProps<Line>> & { initial?: Line[] }) {
  const { initial = [blank(), blank()], ...rest } = props;
  const [lines, setLines] = useState(initial);
  return (
    <LineItems
      items={lines}
      columns={COLUMNS}
      onAdd={() => setLines((l) => [...l, blank()])}
      onRemove={(i) => setLines((l) => l.filter((_, j) => j !== i))}
      {...rest}
    />
  );
}

const rows = () => screen.getAllByRole("group").filter((g) => g.hasAttribute("data-line-items-row"));

describe("LineItems", () => {
  it("renders hidden headers, named rows and a named field per cell", () => {
    const { container } = render(<Lines />);
    expect(rows()).toHaveLength(2);
    expect(rows()[1]).toHaveAccessibleName("Row 2");
    expect(screen.getByRole("textbox", { name: "Amount, row 2" })).toBeInTheDocument();
    const header = container.querySelector("[aria-hidden].hidden");
    expect(header).toHaveTextContent("AccountAmount");
    // The grid tracks, remove column included.
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--line-items-cols")).toBe(
      "minmax(0,1fr) 7rem 2.25rem",
    );
  });

  it("adds a row with the dashed button and focuses its first field", async () => {
    render(<Lines />);
    await userEvent.click(screen.getByRole("button", { name: "Add row" }));
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: "Account, row 3" })).toHaveFocus();
  });

  it("adds a row on Ctrl+Enter inside a row", async () => {
    render(<Lines />);
    const field = screen.getByRole("textbox", { name: "Account, row 1" });
    field.focus();
    fireEvent.keyDown(field, { key: "Enter", ctrlKey: true });
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole("textbox", { name: "Account, row 3" })).toHaveFocus();
  });

  it("removes a row and moves focus to the row that took its place", async () => {
    render(<Lines initial={[blank(), blank(), blank()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove row 2" }));
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Remove row 2" })).toHaveFocus();
  });

  it("keeps minItems and maxItems", () => {
    render(<Lines minItems={2} maxItems={2} />);
    expect(screen.getByRole("button", { name: "Remove row 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add row" })).toBeDisabled();
  });

  it("confirmRemove: asks for a second press, and Escape calls it off", async () => {
    render(<Lines confirmRemove />);
    const remove = screen.getByRole("button", { name: "Remove row 1" });
    await userEvent.click(remove);
    expect(rows()).toHaveLength(2);
    expect(remove).toHaveAccessibleName("Remove row 1? Press again to confirm");
    expect(remove).toHaveFocus();
    fireEvent.keyDown(remove, { key: "Escape" });
    expect(remove).toHaveAccessibleName("Remove row 1");
    await userEvent.click(remove);
    await userEvent.click(remove);
    expect(rows()).toHaveLength(1);
  });

  it("confirmRemove as a function: removes only on a yes", async () => {
    const ask = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Lines confirmRemove={ask} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    });
    expect(rows()).toHaveLength(2);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    });
    expect(rows()).toHaveLength(1);
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }), 0);
  });

  it("renders a totals row aligned to the columns, with its label in the first free column", () => {
    render(<Lines totals={{ amount: "1'280.00" }} />);
    const totals = screen.getByRole("group", { name: "Total" });
    const cells = Array.from(totals.children);
    expect(cells[0]).toHaveTextContent("Total");
    expect(cells[1]).toHaveTextContent("1'280.00");
  });

  it("shows the empty state, the list error, and no buttons it was not given", () => {
    render(
      <LineItems items={[] as Line[]} columns={COLUMNS} empty="No lines yet" error="Add at least two lines" />,
    );
    expect(screen.getByText("No lines yet")).toBeInTheDocument();
    expect(screen.getByText("Add at least two lines")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("takes custom row names and labels", () => {
    render(<Lines rowLabel={(i) => `Line ${i + 1}`} labels={{ add: "Add line" }} />);
    expect(within(rows()[0]).getByRole("textbox", { name: "Account, row 1" })).toBeInTheDocument();
    expect(rows()[0]).toHaveAccessibleName("Line 1");
    expect(screen.getByRole("button", { name: "Add line" })).toBeInTheDocument();
  });

  describe("0.16: summary, floating field labels, two-up stacking", () => {
    const FLOATING: LineItemsColumn<Line>[] = COLUMNS.map((c) => ({
      ...c,
      render: ({ item, label, fieldLabel }) => (
        <Input label={fieldLabel} aria-label={label} defaultValue={item.account} />
      ),
    }));

    it("summary: label, a toned value and an action, disabled with the list", async () => {
      const onClick = vi.fn();
      const summary = {
        label: "Left to assign",
        value: "CHF 12.00",
        tone: "danger" as const,
        action: { label: "Set amount to total", onClick },
      };
      const { container, rerender } = render(<Lines summary={summary} />);
      const box = container.querySelector("[data-line-items-summary]") as HTMLElement;
      expect(box).toHaveTextContent("Left to assign");
      const value = within(box).getByText("CHF 12.00");
      expect(value).toHaveAttribute("data-tone", "danger");
      expect(value.className).toContain("text-[var(--danger)]");
      await userEvent.click(within(box).getByRole("button", { name: "Set amount to total" }));
      expect(onClick).toHaveBeenCalledTimes(1);
      // Under the lines: after the last row, before the add button.
      const add = screen.getByRole("button", { name: "Add row" });
      expect(rows()[1].compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(box.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      rerender(<Lines summary={{ ...summary, tone: "success" }} disabled />);
      const after = container.querySelector("[data-line-items-summary]") as HTMLElement;
      expect(within(after).getByText("CHF 12.00").className).toContain("text-[var(--success)]");
      expect(within(after).getByRole("button", { name: "Set amount to total" })).toBeDisabled();
    });

    it("summary: tone defaults to neutral; muted while unknown; no summary, no box", () => {
      const { container, rerender } = render(<Lines summary={{ label: "Left", value: "0.00" }} />);
      expect(screen.getByText("0.00")).toHaveAttribute("data-tone", "neutral");
      rerender(<Lines summary={{ label: "Left", value: "—", tone: "muted" }} />);
      expect(screen.getByText("—").className).toContain("text-[var(--text-muted)]");
      rerender(<Lines />);
      expect(container.querySelector("[data-line-items-summary]")).toBeNull();
    });

    it("fieldLabels: aria by default — no fieldLabel, header row and stacked headers drawn", () => {
      const seen: Array<string | undefined> = [];
      const cols = COLUMNS.map((c) => ({
        ...c,
        render: (ctx: Parameters<typeof c.render>[0]) => {
          seen.push(ctx.fieldLabel);
          return c.render(ctx);
        },
      }));
      const { container } = render(<LineItems items={[blank()]} columns={cols} />);
      expect(seen.every((v) => v === undefined)).toBe(true);
      expect(container.querySelector("[aria-hidden].hidden")).toHaveTextContent("AccountAmount");
      expect(within(rows()[0]).getAllByText("Account", { selector: "span[aria-hidden]" })).toHaveLength(1);
    });

    it("fieldLabels=floating: each field floats its column's name, the row stays in its accessible name, no headers", () => {
      const { container } = render(<Lines fieldLabels="floating" columns={FLOATING} />);
      const field = screen.getByRole("textbox", { name: "Amount, row 2" });
      // The visible label is the column's name, on a <label> for the field.
      expect(container.querySelector(`label[for="${field.id}"]`)).toHaveTextContent(/^Amount$/);
      expect(container.querySelector("[aria-hidden].hidden")).toBeNull();
      expect(within(rows()[0]).queryByText("Account", { selector: "span[aria-hidden]" })).toBeNull();
    });

    it("a column's fieldLabels wins over the list's: a read-only column keeps its header", () => {
      const cols: LineItemsColumn<Line>[] = [
        FLOATING[0],
        { key: "sum", header: "Sum", fieldLabels: "aria", render: () => <span>1.00</span> },
      ];
      const { container } = render(<LineItems items={[blank()]} columns={cols} fieldLabels="floating" />);
      const header = container.querySelector("[aria-hidden].hidden") as HTMLElement;
      expect(header).toHaveTextContent(/^Sum$/);
      expect(within(rows()[0]).getByText("Sum", { selector: "span[aria-hidden]" })).toBeInTheDocument();
      expect(container.querySelector("label")).toHaveTextContent("Account");
    });

    it("narrowColumns=2 pairs the stacked fields; narrowSpan=2 and the remove button take a whole row", () => {
      const cols: LineItemsColumn<Line>[] = [{ ...COLUMNS[0], narrowSpan: 2 }, COLUMNS[1], { ...COLUMNS[1], key: "tax" }];
      render(<LineItems items={[blank()]} columns={cols} narrowColumns={2} onRemove={() => {}} />);
      const row = rows()[0];
      expect(row.className).toContain("@2xs:grid-cols-2");
      const cells = Array.from(row.children) as HTMLElement[];
      expect(cells[0].className).toContain("@2xs:col-span-2");
      expect(cells[0].className).toContain("@lg:col-span-1");
      expect(cells[1].className).not.toContain("col-span");
      expect(cells[3].className).toContain("@2xs:col-span-2");
    });

    it("narrowColumns defaults to 1: no pairing classes", () => {
      render(<LineItems items={[blank()]} columns={[{ ...COLUMNS[0], narrowSpan: 2 }]} onRemove={() => {}} />);
      const row = rows()[0];
      expect(row.className).not.toContain("@2xs");
      for (const cell of Array.from(row.children)) expect(cell.className).not.toContain("col-span");
    });
  });
});
